// Peak — per-muscle RECOVERY / readiness model (the "Recovery" page data).
//
// Honest companion to the strength heat map: where that says "how strong a muscle is",
// this says "how recovered it is right now". Fatigue is derived ENTIRELY from the sets
// you've logged — each recent session deposits acute fatigue onto the muscles it
// trained (weighted by the same attribution coefficients the scoring engine uses), and
// that fatigue decays back toward fresh over time. Nothing is fabricated: a muscle you
// haven't trained recently reads fresh because it genuinely is.
//
// PURE / DETERMINISTIC given (data, asOf).

import type { PeakData, MuscleGroup } from "../types";
import { ALL_MUSCLES } from "../data/capabilityTree";
import { EXERCISE_BY_ID } from "../data/exercises";
import { muscleLabel } from "../data/exerciseCatalog";
import { MUSCLE_TO_SVG } from "../data/muscleMap";
import { buildSessionSummary } from "./sessionDetail";

// ── Tunable dial ──────────────────────────────────────────────────────────────
// One place to retune how aggressively fatigue accrues and clears. `tauHours` is the
// exponential recovery time-constant: fatigue is ~63% gone after τ hours, ~86% after
// 2τ, ~95% after 3τ. `fatiguePerSet` maps one effective (attribution-weighted) working
// set to fatigue points, so a primary muscle hit for ~4–5 hard sets reads heavily
// fatigued right after, while a light assist reads mild.
export const RECOVERY = {
  tauHours: 28,        // exponential recovery time-constant (hours)
  fatiguePerSet: 18,   // fatigue points per effective working set
  readyThreshold: 30,  // fatigue < this ⇒ "Ready" / counted fresh
  lookbackDays: 14,    // sessions older than this contribute ~0 fatigue — skip them
  maxProjectionH: 24 * 7, // cap the ready-in forward scan at one week
} as const;

// ── Fresh → fatigued color ramp (mint → red), inverted from the strength heat ramp.
//    Input is FATIGUE (0 = fresh, 100 = fully fatigued).
export function recoveryColor(fatigue: number): string {
  const f = Math.max(0, Math.min(100, fatigue));
  if (f >= 78) return "#ff4d3d"; // red
  if (f >= 60) return "#ff8a3d"; // orange
  if (f >= 42) return "#ffd23f"; // yellow
  if (f >= 26) return "#8fd14f"; // lime-green
  return "#3dffb0";              // mint
}

export type Soreness = "None" | "Mild" | "Moderate" | "High";
export function soreness(fatigue: number): { label: Soreness; color: string } {
  if (fatigue >= 70) return { label: "High", color: "#ff4d3d" };
  if (fatigue >= 46) return { label: "Moderate", color: "#ff8a3d" };
  if (fatigue >= 28) return { label: "Mild", color: "#ffd23f" };
  return { label: "None", color: "#3dffb0" };
}

// A single muscle group's recovery state.
export type MuscleRecovery = {
  group: MuscleGroup;
  label: string;
  view: "front" | "back";       // which silhouette this group lives on (forearms → front)
  fatigue: number;              // 0 (fresh) … 100 (fully fatigued)
  recovered: number;            // 100 − fatigue
  color: string;                // recoveryColor(fatigue)
  soreness: Soreness;
  soreColor: string;
  ready: boolean;               // fatigue < readyThreshold
  readyIn: string;              // "Ready" | "in 8h" | "in 1.5d"
  readyHours: number | null;    // projected hours until ready (null when already ready)
  trained: boolean;             // has this group ever been trained (any logged session)?
  last: {
    dayLabel: string;           // "Yesterday" | "3d ago" | "5h ago"
    title: string;
    sets: number;               // attribution-weighted sets this session put on the muscle
    volumeKg: number;           // attribution-weighted tonnage this session put on the muscle
  } | null;
};

export type RecoverySnapshot = {
  muscles: MuscleRecovery[];        // every group, sorted most-fatigued first
  byGroup: Record<string, MuscleRecovery>;
  overall: number;                  // 0–100 overall recovered (avg across groups)
  freshCount: number;               // groups reading fresh (fatigue < threshold)
  recoveringCount: number;          // groups still clearing fatigue
  nextReady: MuscleRecovery | null; // the recovering group closest to ready
  anyRecentTraining: boolean;       // any session contributed fatigue in the lookback
};

// Attribution-weighted sets + tonnage each muscle group received in one session.
type SessionAttribution = Partial<Record<MuscleGroup, { sets: number; volumeKg: number }>>;

function attributionForSession(data: PeakData, sessionId: string): SessionAttribution {
  const summary = buildSessionSummary(data, sessionId);
  const out: SessionAttribution = {};
  if (!summary) return out;
  for (const ex of summary.exercises) {
    const def = EXERCISE_BY_ID[ex.exerciseId];
    if (!def) continue;
    const nSets = ex.sets.filter((st) => st.reps > 0).length;
    if (nSets === 0 && ex.volumeKg <= 0) continue;
    for (const g of Object.keys(def.muscleWeights) as MuscleGroup[]) {
      const w = def.muscleWeights[g] ?? 0;
      if (w <= 0) continue;
      const prev = out[g] ?? { sets: 0, volumeKg: 0 };
      out[g] = { sets: prev.sets + nSets * w, volumeKg: prev.volumeKg + ex.volumeKg * w };
    }
  }
  return out;
}

function relativeDayLabel(fromISO: string, asOfMs: number): string {
  const hours = Math.max(0, (asOfMs - new Date(fromISO).getTime()) / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

export function computeRecovery(data: PeakData, asOf: string): RecoverySnapshot {
  const asOfMs = new Date(asOf).getTime();
  const sessions = [...(data.sessions ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  // Per session, the fatigue it deposited and how long ago — so ready-in can be
  // projected forward by re-decaying the same deposits.
  type Deposit = { hoursAgo: number; amount: number };
  const deposits: Partial<Record<MuscleGroup, Deposit[]>> = {};
  const lastFor: Partial<Record<MuscleGroup, MuscleRecovery["last"]>> = {};
  let anyRecentTraining = false;

  for (const session of sessions) {
    const tMs = new Date(session.createdAt).getTime();
    const hoursAgo = Math.max(0, (asOfMs - tMs) / 3_600_000);
    const withinLookback = hoursAgo <= RECOVERY.lookbackDays * 24;
    // Stop building attributions once we're past lookback AND every group already has
    // a "last trained" record — there's nothing left to learn from older sessions.
    const needLast = (ALL_MUSCLES as MuscleGroup[]).some((g) => !lastFor[g]);
    if (!withinLookback && !needLast) break;

    const attr = attributionForSession(data, session.id);
    for (const g of Object.keys(attr) as MuscleGroup[]) {
      const a = attr[g]!;
      if (a.sets <= 0) continue;
      if (!lastFor[g]) {
        lastFor[g] = {
          dayLabel: relativeDayLabel(session.createdAt, asOfMs),
          title: session.title,
          sets: a.sets,
          volumeKg: a.volumeKg,
        };
      }
      if (withinLookback) {
        anyRecentTraining = true;
        (deposits[g] ??= []).push({ hoursAgo, amount: a.sets * RECOVERY.fatiguePerSet });
      }
    }
  }

  // Current fatigue = Σ deposits decayed to now (exponential), clamped 0–100.
  const fatigueAt = (deps: Deposit[], extraHours: number): number => {
    let f = 0;
    for (const d of deps) f += d.amount * Math.exp(-(d.hoursAgo + extraHours) / RECOVERY.tauHours);
    return Math.min(100, f);
  };

  const muscles: MuscleRecovery[] = (ALL_MUSCLES as MuscleGroup[]).map((g) => {
    const deps = deposits[g] ?? [];
    const fatigue = Math.round(fatigueAt(deps, 0));
    const ready = fatigue < RECOVERY.readyThreshold;
    // Project forward to the first hour the muscle drops below the ready threshold.
    let readyHours: number | null = null;
    if (!ready) {
      for (let h = 1; h <= RECOVERY.maxProjectionH; h++) {
        if (fatigueAt(deps, h) < RECOVERY.readyThreshold) { readyHours = h; break; }
      }
    }
    const readyIn =
      ready ? "Ready"
      : readyHours == null ? "48h+"
      : readyHours >= 24 ? `in ${Math.round((readyHours / 24) * 10) / 10}d`
      : `in ${readyHours}h`;
    const sr = soreness(fatigue);
    return {
      group: g,
      label: muscleLabel(g),
      view: MUSCLE_TO_SVG[g].view === "back" ? "back" : "front",
      fatigue,
      recovered: 100 - fatigue,
      color: recoveryColor(fatigue),
      soreness: sr.label,
      soreColor: sr.color,
      ready,
      readyIn,
      readyHours,
      trained: !!lastFor[g],
      last: lastFor[g] ?? null,
    };
  });

  const byGroup: Record<string, MuscleRecovery> = {};
  for (const m of muscles) byGroup[m.group] = m;

  const overall = Math.round(muscles.reduce((a, m) => a + m.recovered, 0) / muscles.length);
  const freshCount = muscles.filter((m) => m.ready).length;
  const recoveringCount = muscles.length - freshCount;
  const nextReady =
    muscles.filter((m) => !m.ready).sort((a, b) => a.fatigue - b.fatigue)[0] ?? null;

  const sorted = [...muscles].sort((a, b) => b.fatigue - a.fatigue);
  return { muscles: sorted, byGroup, overall, freshCount, recoveringCount, nextReady, anyRecentTraining };
}
