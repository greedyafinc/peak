// Peak — progressive-overload nudge for the live Gym session.
//
// PURE / DETERMINISTIC: given exercise history (+ optional in-session done sets),
// detect when the lifter has held the same top set for several sessions and suggest
// a small rep or load bump. No fabricated numbers — only real logged performances.

import type { ExerciseDef, Session, UnitSystem } from "../types";
import { EXERCISE_BY_ID } from "../data/exercises";
import { bodyweightBaseKg, isPerArm } from "../data/exerciseCatalog";
import { est1RM } from "./math";
import { fmtWeight, kgToDisplay } from "../units";

/** Minimum consecutive sessions at the same top set before we nudge. */
export const PLATEAU_MIN_SESSIONS = 3;

/** A single session's best set for an exercise (by est-1RM, else reps). */
export type TopPerformance = {
  weightKg: number | null; // entered load (added plates for calisthenics)
  reps: number;
  effKg: number;           // effective load used for ranking / comparison
};

export type ProgressionSuggestion = {
  plateauSessions: number;
  current: TopPerformance;
  kind: "reps" | "weight";
  suggestReps: number;
  suggestWeightKg: number | null;
  title: string;
  body: string;
};

type LiveDoneSet = { weightKg: number | null; reps: number };

function topFromSets(
  sets: { weightKg: number | null; reps: number }[],
  ex: ExerciseDef,
  bodyweightKg: number | null,
): TopPerformance | null {
  const bwBase = bodyweightBaseKg(ex, bodyweightKg);
  let best: TopPerformance | null = null;
  let best1 = -Infinity;

  for (const st of sets) {
    if (st.reps <= 0) continue;
    const added = st.weightKg ?? 0;
    const eff = ex.isBodyweight ? bwBase + Math.max(0, added) : Math.max(0, added);
    const score = eff > 0 ? est1RM(eff, st.reps) : st.reps;
    if (score > best1) {
      best1 = score;
      best = {
        weightKg: st.weightKg,
        reps: st.reps,
        effKg: eff,
      };
    }
  }
  return best;
}

/** Signature for "same performance" — entered load + reps (ignores drifting bodyweight base). */
function perfKey(p: TopPerformance): string {
  const w = p.weightKg != null && p.weightKg > 0 ? p.weightKg.toFixed(3) : "0";
  return `${w}:${p.reps}`;
}

function weightIncrementKg(ex: ExerciseDef): number {
  return isPerArm(ex) ? 2 : 2.5;
}

/** Collect each session's top set for `exerciseId`, newest first. Skips empty entries. */
export function collectTopPerformances(
  exerciseId: string,
  sessions: Session[],
  bodyweightKg: number | null,
): TopPerformance[] {
  const ex = EXERCISE_BY_ID[exerciseId];
  if (!ex) return [];

  const out: TopPerformance[] = [];
  const ordered = [...sessions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  for (const sess of ordered) {
    const entry = sess.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry || entry.sets.length === 0) continue;
    const bw = sess.build.bodyweightKg ?? bodyweightKg;
    const top = topFromSets(
      entry.sets.map((st) => ({ weightKg: st.weight?.value ?? null, reps: st.reps })),
      ex,
      bw,
    );
    if (top) out.push(top);
  }
  return out;
}

/**
 * True when the newest `minSessions` performances all match on entered load + reps.
 * Optionally prepend the in-session done sets as the most recent "visit".
 */
export function isProgressionPlateau(
  exerciseId: string,
  sessions: Session[],
  bodyweightKg: number | null,
  liveDoneSets?: LiveDoneSet[],
  minSessions = PLATEAU_MIN_SESSIONS,
): boolean {
  const ex = EXERCISE_BY_ID[exerciseId];
  if (!ex) return false;

  const history = collectTopPerformances(exerciseId, sessions, bodyweightKg);
  const performances: TopPerformance[] = [...history];

  if (liveDoneSets && liveDoneSets.length > 0) {
    const liveTop = topFromSets(liveDoneSets, ex, bodyweightKg);
    if (liveTop) performances.unshift(liveTop);
  }

  if (performances.length < minSessions) return false;
  const key = perfKey(performances[0]);
  return performances.slice(0, minSessions).every((p) => perfKey(p) === key);
}

/** Build a rep- or load-first nudge when a plateau is detected. Returns null if not plateaued. */
export function buildProgressionSuggestion(
  exerciseId: string,
  sessions: Session[],
  sys: UnitSystem,
  bodyweightKg: number | null,
  liveDoneSets?: LiveDoneSet[],
  targetRepHigh?: number | null,
): ProgressionSuggestion | null {
  const ex = EXERCISE_BY_ID[exerciseId];
  if (!ex) return null;
  if (!isProgressionPlateau(exerciseId, sessions, bodyweightKg, liveDoneSets)) return null;

  const history = collectTopPerformances(exerciseId, sessions, bodyweightKg);
  const liveTop =
    liveDoneSets && liveDoneSets.length > 0 ? topFromSets(liveDoneSets, ex, bodyweightKg) : null;
  const current = liveTop ?? history[0];
  if (!current) return null;

  const plateauSessions = PLATEAU_MIN_SESSIONS;
  const perArm = isPerArm(ex);
  const armSuffix = perArm ? " / arm" : "";
  const repCap = targetRepHigh ?? 12;
  const preferWeight = current.reps >= repCap;

  const incKg = weightIncrementKg(ex);
  const nextWeightKg =
    current.weightKg != null && current.weightKg > 0
      ? current.weightKg + incKg
      : incKg;
  const nextReps = current.reps + 1;

  const currentLoadLabel = formatCurrentLoad(current, ex, sys, armSuffix);

  if (preferWeight && (ex.isBodyweight || current.weightKg != null)) {
    const targetLabel = ex.isBodyweight
      ? `+${fmtWeight(nextWeightKg, sys, 0)} added load`
      : `${fmtWeight(nextWeightKg, sys, perArm ? 1 : 0)}${armSuffix}`;
    return {
      plateauSessions,
      current,
      kind: "weight",
      suggestReps: current.reps,
      suggestWeightKg: nextWeightKg,
      title: "Ready for a little more load",
      body: `You've held ${currentLoadLabel} for ${plateauSessions} sessions. Try ${targetLabel} at ${current.reps} reps when it feels clean.`,
    };
  }

  return {
    plateauSessions,
    current,
    kind: "reps",
    suggestReps: nextReps,
    suggestWeightKg: current.weightKg,
    title: "Try one more rep",
    body: `You've held ${currentLoadLabel} for ${plateauSessions} sessions. ${nextReps} reps is a natural next step before adding load.`,
  };
}

function formatCurrentLoad(
  p: TopPerformance,
  ex: ExerciseDef,
  sys: UnitSystem,
  armSuffix: string,
): string {
  if (ex.isBodyweight) {
    const added = p.weightKg != null && p.weightKg > 0 ? fmtWeight(p.weightKg, sys, 0) : null;
    return added ? `BW+${added} × ${p.reps}` : `${p.reps} reps`;
  }
  if (p.weightKg != null && p.weightKg > 0) {
    return `${fmtWeight(p.weightKg, sys, isPerArm(ex) ? 1 : 0)}${armSuffix} × ${p.reps}`;
  }
  return `${p.reps} reps`;
}

/** Display-unit placeholders for the live set row inputs. */
export function suggestionPlaceholders(
  suggestion: ProgressionSuggestion,
  ex: ExerciseDef,
  sys: UnitSystem,
): { weight: string; reps: string } {
  const s = suggestion;
  if (s.kind === "reps") {
    const w = s.current.weightKg;
    const weight =
      ex.isBodyweight
        ? w != null && w > 0
          ? `+${kgToDisplay(w, sys, 0)}`
          : "+0"
        : w != null && w > 0
          ? String(kgToDisplay(w, sys, 0))
          : "—";
    return { weight, reps: String(s.suggestReps) };
  }

  const w = s.suggestWeightKg;
  const weight =
    ex.isBodyweight
      ? w != null && w > 0
        ? `+${kgToDisplay(w, sys, 0)}`
        : "+0"
      : w != null && w > 0
        ? String(kgToDisplay(w, sys, 0))
        : "—";
  return { weight, reps: String(s.suggestReps) };
}
