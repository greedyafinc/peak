// Peak — Exercise / effort DETAIL view model (Direction B from the design handoff).
//
// The "tap an exercise → see where it's headed" screen: a projection hero, current
// top set, build-relative percentile, an improving-trend strip, past efforts, and
// gentle coach tips. PURE / DETERMINISTIC given (data, spec).
//
// HONESTY CONTRACT (the app's core principle — §"no fabricated data"): everything
// here is derived from REAL on-device history — the user's logged sets and scored
// benchmarks/muscle estimates. Nothing is invented. Thin data shows LESS, never a
// made-up number: no projection until a real trend exists, no percentile until the
// muscle (or a matching benchmark) is actually scored, no trend strip from a single
// session. The design's synthetic numbers are intentionally replaced by these.

import type { PeakData, MuscleGroup } from "../types";
import { EXERCISE_BY_ID } from "../data/exercises";
import {
  categoryOf,
  alternativesFor,
  isPerArm,
  equipmentLabel,
  muscleLabel,
  type ExerciseCategory,
} from "../data/exerciseCatalog";
import { LEAF_BY_ID } from "../data/capabilityTree";
import {
  fmtWeight,
  kgToDisplay,
  weightUnit,
  fmtClock,
  fmtDistanceKm,
  paceLabel,
  distanceUnit,
  KM_PER_MI,
} from "../units";

// ── What the UI asks to open ─────────────────────────────────────────────────
export type ExerciseDetailSpec =
  | { kind: "strength"; exerciseId: string }
  | { kind: "cardio"; sessionId: string; cardioId: string };

// ── The rendered view model ──────────────────────────────────────────────────
export type ProjPoint = { value: number; label: string; projected: boolean };

export type DetailHero = {
  kicker: string;
  big: string;
  delta: string | null;
  sub: string;
  chart: ProjPoint[] | null;   // null when there aren't ≥2 real points to plot
  projecting: boolean;
  nowIndex: number;            // index of the most-recent logged point in `chart`
  nowLabel: string;            // value label drawn at the "now" marker
  targetLabel: string | null;  // value label at the projected target (projecting only)
};

export type DetailTip = { kind: "load" | "assist" | "rest"; title: string; body: string };

export type ExerciseDetailView = {
  kind: "strength" | "cardio";
  name: string;
  categoryKey: ExerciseCategory;   // → accent color, chosen by the UI layer
  subtitle: string;                // e.g. "Barbell · Chest"
  lowerIsBetter: boolean;          // pace: lower time is better (flips chart/spark)

  hero: DetailHero;

  prLabel: string;
  prValue: string;
  prMeta: string;

  percentile: number | null;       // [0,1]; null = not scored yet (honest)
  percentileSub: string;

  trend: { abs: string; pct: string | null; window: string; dir: "up" | "flat" | "down" } | null;
  spark: number[] | null;          // chronological metric values for the sparkline

  history: { date: string; main: string; sub: string; pr: boolean }[];
  tips: DetailTip[];
};

// ── small pure helpers ───────────────────────────────────────────────────────
const MS_PER_DAY = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (d: Date): string => `${MONTHS[d.getMonth()]} ${d.getDate()}`;
const est1RM = (weightKg: number, reps: number): number => weightKg * (1 + reps / 30);
const near = (a: number, b: number): boolean => Math.abs(a - b) / b < 0.12;

/** Ordinary least-squares slope/intercept over {t (days), y}; null if undetermined. */
function linFit(pts: { t: number; y: number }[]): { slope: number; intercept: number } | null {
  const n = pts.length;
  if (n < 2) return null;
  const mt = pts.reduce((a, p) => a + p.t, 0) / n;
  const my = pts.reduce((a, p) => a + p.y, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (const p of pts) {
    sxx += (p.t - mt) ** 2;
    sxy += (p.t - mt) * (p.y - my);
  }
  if (sxx <= 0) return null; // all points at one instant → no temporal trend
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mt };
}

// ── entry point ──────────────────────────────────────────────────────────────
export function buildExerciseDetail(data: PeakData, spec: ExerciseDetailSpec): ExerciseDetailView | null {
  return spec.kind === "cardio" ? cardioDetail(data, spec) : strengthDetail(data, spec.exerciseId);
}

// ── Strength / lift detail ───────────────────────────────────────────────────
type Effort = { at: Date; weightKg: number; reps: number; weighted: boolean };

function strengthDetail(data: PeakData, exerciseId: string): ExerciseDetailView | null {
  const ex = EXERCISE_BY_ID[exerciseId];
  if (!ex) return null;
  const sys = data.unitSystem;
  const perArm = isPerArm(ex);
  const armSuffix = perArm ? "/arm" : "";

  // Per session, take the single best set of this exercise (heaviest est-1RM among
  // loaded sets; else most reps for a bodyweight set). Oldest → newest.
  const efforts: Effort[] = [];
  for (const sess of data.sessions) {
    for (const entry of sess.entries) {
      if (entry.exerciseId !== exerciseId) continue;
      const loadedSets = entry.sets.filter((st) => (st.weight?.value ?? 0) > 0);
      if (loadedSets.length) {
        const top = loadedSets.reduce((a, b) =>
          est1RM(b.weight!.value, b.reps) > est1RM(a.weight!.value, a.reps) ? b : a);
        efforts.push({ at: new Date(sess.createdAt), weightKg: top.weight!.value, reps: top.reps, weighted: true });
      } else {
        const repSets = entry.sets.filter((st) => st.reps > 0);
        if (!repSets.length) continue;
        const top = repSets.reduce((a, b) => (b.reps > a.reps ? b : a));
        efforts.push({ at: new Date(sess.createdAt), weightKg: 0, reps: top.reps, weighted: false });
      }
    }
  }
  if (efforts.length === 0) return null;
  efforts.sort((a, b) => a.at.getTime() - b.at.getTime());

  const loaded = efforts.some((e) => e.weighted);
  const metricOf = (e: Effort): number => (loaded ? est1RM(e.weightKg, e.reps) : e.reps);
  const fmtMetric = (v: number): string => (loaded ? fmtWeight(v, sys, 0) : `${Math.round(v)} reps`);

  // The metric series the chart/trend/projection ride on (loaded → loaded sets only).
  const series = efforts.filter((e) => (loaded ? e.weighted : true));
  const cur = efforts[efforts.length - 1];
  const curMetric = series.length ? metricOf(series[series.length - 1]) : metricOf(cur);

  // current top set (real load — keep the half-kg, never round it away)
  const prValue = cur.weighted ? fmtWeight(cur.weightKg, sys, 1) : `${cur.reps} reps`;
  const prMeta = cur.weighted
    ? `× ${cur.reps}${armSuffix} · est. 1RM ${fmtWeight(est1RM(cur.weightKg, cur.reps), sys, 0)}`
    : "bodyweight";

  // projection (honest: only when ≥2 loaded points show a real upward slope)
  const proj = projectSeries(series.map((e) => ({ at: e.at, value: metricOf(e) })), false, fmtMetric, {
    capFactor: 1.12, // never project more than +12% in a month
    minStep: 0.5,
    kickerTrend: loaded ? "Estimated 1RM" : "Best set",
    kickerThin: loaded ? "Estimated 1RM" : "Best set",
    deltaLabel: (deltaKg) => (loaded ? `+${fmtWeight(deltaKg, sys, 0)} projected` : `+${Math.round(deltaKg)} reps projected`),
    nounProjecting: loaded ? "Your estimated 1RM, on track if you keep this pace." : "On track if you keep adding reps.",
    nounTrend: "No clear upward trend yet — keep logging and Peak will project a month ahead.",
    nounThin: loaded ? "Log a few more sessions and Peak will project your 1RM a month out." : "Log a few more sessions and Peak will chart your trajectory.",
  });

  // trend strip
  const trend = trendOf(series.map((e) => metricOf(e)), false, (d) => (loaded ? `${d >= 0 ? "+" : ""}${fmtWeight(d, sys, 0)}` : `${d >= 0 ? "+" : ""}${Math.round(d)} reps`), true);

  // past efforts with PR flags (a new lifetime-best metric, computed oldest → newest)
  let runningMax = -Infinity;
  const flagged = efforts.map((e) => {
    const m = e.weighted || !loaded ? metricOf(e) : -Infinity;
    const pr = Number.isFinite(m) && m > runningMax;
    if (Number.isFinite(m)) runningMax = Math.max(runningMax, m);
    return { e, pr };
  });
  const history = flagged
    .slice()
    .reverse()
    .slice(0, 6)
    .map(({ e, pr }) => ({
      date: shortDate(e.at),
      main: e.weighted ? `${kgToDisplay(e.weightKg, sys, 1)} ${weightUnit(sys)}${armSuffix} × ${e.reps}` : `${e.reps} reps`,
      sub: e.weighted ? `est. 1RM ${fmtWeight(est1RM(e.weightKg, e.reps), sys, 0)}` : "bodyweight",
      pr,
    }));

  // percentile — prefer a benchmark leaf the user actually tested for this lift,
  // else the inferred primary-muscle strength (both real, build-relative).
  const percentile = strengthPercentile(data, exerciseId, ex.primaryMuscles[0]);

  // gentle tips
  const alts = alternativesFor(exerciseId, 4).slice(0, 2).map((a) => a.name);
  const tips: DetailTip[] = [];
  if (cur.weighted) {
    const inc = perArm ? 2 : 2.5;
    tips.push({
      kind: "load",
      title: "Ready to add a little load",
      body: `You handled ${fmtWeight(cur.weightKg, sys, 1)}${armSuffix} for ${cur.reps} reps. When it feels right, ${fmtWeight(cur.weightKg + inc, sys, 1)} is a natural next step.`,
    });
  } else {
    tips.push({
      kind: "load",
      title: "Push for one more rep",
      body: `You're at ${cur.reps} clean reps. Adding a rep — or a little load — is the simplest way to move this forward.`,
    });
  }
  if (alts.length) {
    tips.push({
      kind: "assist",
      title: "Exercises that may help",
      body: `${alts.join(" and ")} hit the same muscles from a different angle and can smooth out your sticking point.`,
    });
  }
  tips.push({
    kind: "rest",
    title: "Mind the recovery",
    body: "Give this lift a day or two between heavy sessions — the next jump often lands after a rest, not before it.",
  });

  return {
    kind: "strength",
    name: ex.name,
    categoryKey: categoryOf(ex),
    subtitle: `${equipmentLabel(ex.equipment)} · ${muscleLabel(ex.primaryMuscles[0]) ?? categoryOf(ex)}`,
    lowerIsBetter: false,
    hero: proj.hero(curMetric),
    prLabel: "Current top set",
    prValue,
    prMeta,
    percentile,
    percentileSub: "vs your build",
    trend,
    spark: series.length >= 2 ? series.map((e) => metricOf(e)) : null,
    history,
    tips,
  };
}

function strengthPercentile(data: PeakData, exerciseId: string, primaryMuscle: MuscleGroup | undefined): number | null {
  for (const leaf of Object.values(LEAF_BY_ID)) {
    if (leaf.contributingExerciseIds?.includes(exerciseId)) {
      const ls = data.leafScores[leaf.id];
      if (ls?.percentileRaw != null) return ls.percentileRaw;
    }
  }
  if (primaryMuscle) {
    const est = data.muscleEstimates[primaryMuscle];
    if (est?.percentileRaw != null) return est.percentileRaw;
  }
  return null;
}

// ── Cardio / pace detail ─────────────────────────────────────────────────────
type Run = { at: Date; distanceKm: number; durSec: number; pace: number }; // pace = sec/km

function cardioDetail(data: PeakData, spec: { sessionId: string; cardioId: string }): ExerciseDetailView | null {
  const sess = data.sessions.find((s) => s.id === spec.sessionId);
  const cs = sess?.cardio?.find((c) => c.id === spec.cardioId);
  if (!sess || !cs) return null;
  const sys = data.unitSystem;
  const distanceKm = cs.distance?.value ?? null;
  const durSec = cs.duration.value * 60; // cardio duration canonical = minutes

  const paceStr = (secPerKm: number): string =>
    `${fmtClock(sys === "imperial" ? secPerKm * KM_PER_MI : secPerKm)} /${distanceUnit(sys)}`;

  // Comparable efforts: runs of similar distance, oldest → newest, for trend/projection.
  const runs: Run[] = [];
  for (const ss of data.sessions) {
    for (const c of ss.cardio ?? []) {
      const d = c.distance?.value;
      if (!d || d <= 0) continue;
      if (distanceKm != null && !near(d, distanceKm)) continue;
      const dur = c.duration.value * 60;
      runs.push({ at: new Date(ss.createdAt), distanceKm: d, durSec: dur, pace: dur / d });
    }
  }
  runs.sort((a, b) => a.at.getTime() - b.at.getTime());

  const curPace = distanceKm != null && distanceKm > 0 ? durSec / distanceKm : null;
  const fmtMetric = (v: number): string => paceStr(v); // metric = pace sec/km

  const proj = projectSeries(runs.map((r) => ({ at: r.at, value: r.pace })), true, fmtMetric, {
    capFactor: 0.92, // never project faster than −8% in a month
    minStep: 1,
    kickerTrend: "Pace trend",
    kickerThin: "Latest effort",
    deltaLabel: (deltaSecPerKm) => `${paceStr(deltaSecPerKm)} faster projected`,
    nounProjecting: "On track if you keep up your current training.",
    nounTrend: "No clear pace trend yet — keep logging runs at this distance.",
    nounThin: "Log a few more runs around this distance and Peak will project your pace.",
  });

  const trend = trendOf(runs.map((r) => r.pace), true, (d) => `${paceStr(Math.abs(d))} ${d < 0 ? "faster" : "slower"}`, false);

  // PR = fastest pace so far (lower is better)
  let best = Infinity;
  const flagged = runs.map((r) => {
    const pr = r.pace < best;
    best = Math.min(best, r.pace);
    return { r, pr };
  });
  const history = flagged
    .slice()
    .reverse()
    .slice(0, 6)
    .map(({ r, pr }) => ({
      date: shortDate(r.at),
      main: fmtClock(r.durSec),
      sub: `${fmtDistanceKm(r.distanceKm, sys)} · ${paceStr(r.pace)}`,
      pr,
    }));

  const percentile = cardioPercentile(data, distanceKm);

  const prValue = fmtClock(durSec);
  const prMeta = distanceKm != null
    ? `${fmtDistanceKm(distanceKm, sys)} · ${paceLabel(distanceKm, durSec, sys)}`
    : "duration";

  return {
    kind: "cardio",
    name: sess.title || "Cardio effort",
    categoryKey: "Cardio",
    subtitle: distanceKm != null ? `${fmtDistanceKm(distanceKm, sys)} · Cardio` : "Cardio",
    lowerIsBetter: true,
    hero: proj.hero(curPace),
    prLabel: "This effort",
    prValue,
    prMeta,
    percentile,
    percentileSub: "vs runners your age",
    trend,
    spark: runs.length >= 2 ? runs.map((r) => r.pace) : null,
    history,
    tips: [
      { kind: "load", title: "A weekly tempo run could break through", body: "One comfortably-hard run a week is the classic way to nudge a pace like this down over a month." },
      { kind: "assist", title: "Shore up your lower legs", body: "Calf and tibialis strength protects your stride as mileage climbs — a short strength block pays off here." },
      { kind: "rest", title: "Ease into the first kilometre", body: "Splits often start a touch fast. Settling in gently early tends to buy a faster finish." },
    ],
  };
}

function cardioPercentile(data: PeakData, distanceKm: number | null): number | null {
  if (distanceKm == null) return null;
  const leafId =
    near(distanceKm, 1.60934) ? "aerobic.mile" :
    near(distanceKm, 5) ? "aerobic.5k" :
    near(distanceKm, 10) ? "aerobic.10k" :
    near(distanceKm, 21.0975) ? "aerobic.half_marathon" :
    near(distanceKm, 42.195) ? "aerobic.marathon" : null;
  if (!leafId) return null;
  return data.leafScores[leafId]?.percentileRaw ?? null;
}

// ── shared: projection + trend over a value series ───────────────────────────
type ProjOpts = {
  capFactor: number;       // hard cap on the projected target (×current)
  minStep: number;         // minimum meaningful move to call it "projecting"
  kickerTrend: string;     // hero kicker when there's history but no clear projection
  kickerThin: string;      // hero kicker when there's < 2 points
  deltaLabel: (deltaMagnitude: number) => string;
  nounProjecting: string;
  nounTrend: string;
  nounThin: string;
};

/**
 * Build the hero (projection or graceful fallback) from a chronological value
 * series. `lowerBetter` flips the "improving" direction (pace). Returns a closure
 * taking the current display metric so the strength/cardio callers can keep their
 * own formatting.
 */
function projectSeries(
  series: { at: Date; value: number }[],
  lowerBetter: boolean,
  fmtMetric: (v: number) => string,
  opts: ProjOpts,
): { hero: (curMetric: number | null) => DetailHero } {
  return {
    hero: (curMetricIn) => {
      const n = series.length;
      const curMetric = curMetricIn ?? (n ? series[n - 1].value : 0);
      const nowLabel = fmtMetric(curMetric);
      const baseChart: ProjPoint[] = series.map((p) => ({ value: p.value, label: shortDate(p.at), projected: false }));

      if (n < 2) {
        return {
          kicker: opts.kickerThin, big: nowLabel, delta: null, sub: opts.nounThin,
          chart: null, projecting: false, nowIndex: Math.max(0, n - 1), nowLabel, targetLabel: null,
        };
      }

      const t0 = series[0].at.getTime();
      const pts = series.map((p) => ({ t: (p.at.getTime() - t0) / MS_PER_DAY, y: p.value }));
      const fit = linFit(pts);
      const improving = fit ? (lowerBetter ? fit.slope < 0 : fit.slope > 0) : false;

      if (fit && improving) {
        const tNow = pts[pts.length - 1].t;
        let target = fit.intercept + fit.slope * (tNow + 30);
        target = lowerBetter ? Math.max(target, curMetric * opts.capFactor) : Math.min(target, curMetric * opts.capFactor);
        const moved = lowerBetter ? curMetric - target : target - curMetric;
        if (moved > opts.minStep) {
          const chart = [...baseChart, { value: target, label: "+1 mo", projected: true }];
          return {
            kicker: "Projection · next month",
            big: fmtMetric(target),
            delta: opts.deltaLabel(moved),
            sub: opts.nounProjecting,
            chart,
            projecting: true,
            nowIndex: n - 1,
            nowLabel,
            targetLabel: fmtMetric(target),
          };
        }
      }

      // ≥2 points but no clear improving trend → show the logged line, no projection.
      return {
        kicker: opts.kickerTrend, big: nowLabel, delta: null, sub: opts.nounTrend,
        chart: baseChart, projecting: false, nowIndex: n - 1, nowLabel, targetLabel: null,
      };
    },
  };
}

function trendOf(
  values: number[],
  lowerBetter: boolean,
  fmtAbs: (delta: number) => string,
  withPct: boolean,
): ExerciseDetailView["trend"] {
  if (values.length < 2) return null;
  const first = values[0];
  const cur = values[values.length - 1];
  const delta = cur - first; // raw; sign interpreted by lowerBetter
  const improved = lowerBetter ? delta < 0 : delta > 0;
  const dir: "up" | "flat" | "down" = Math.abs(delta) < 1e-9 ? "flat" : improved ? "up" : "down";
  const pct = withPct && first !== 0 ? `${delta >= 0 ? "+" : ""}${Math.round((cur / first - 1) * 100)}%` : null;
  return { abs: fmtAbs(delta), pct, window: `last ${values.length} sessions`, dir };
}
