// Peak — coach suggestions for the live Gym session.
//
// PURE / DETERMINISTIC: plateau detection, difficulty feedback (too easy / too hard),
// and easier-alternative ranking. All numbers come from real logged or in-session data.

import type { Equipment, ExerciseDef, Session, UnitSystem } from "../types";
import { EXERCISE_BY_ID } from "../data/exercises";
import { alternativesFor, bodyweightBaseKg, isPerArm, scoreAlternative } from "../data/exerciseCatalog";
import { est1RM } from "./math";
import { fmtWeight, kgToDisplay } from "../units";

/** Minimum consecutive sessions at the same top set before a plateau nudge. */
export const PLATEAU_MIN_SESSIONS = 3;

export type CoachSuggestionSource = "plateau" | "too_easy" | "too_hard";

export type CoachAdjustAction = {
  type: "adjust";
  weightKg: number | null;
  reps: number;
};

export type CoachSwapAction = {
  type: "swap";
  exerciseId: string;
  exerciseName: string;
};

export type CoachSuggestion = {
  source: CoachSuggestionSource;
  title: string;
  body: string;
  adjust: CoachAdjustAction;
  swap?: CoachSwapAction;
};

/** @deprecated — use CoachSuggestion */
export type ProgressionSuggestion = {
  plateauSessions: number;
  current: TopPerformance;
  kind: "reps" | "weight";
  suggestReps: number;
  suggestWeightKg: number | null;
  title: string;
  body: string;
};

export type TopPerformance = {
  weightKg: number | null;
  reps: number;
  effKg: number;
};

export type ReferenceSetInput = { weightKg: number | null; reps: number };

type LiveDoneSet = { weightKg: number | null; reps: number };

const EQUIP_EASE: Partial<Record<Equipment, number>> = {
  machine: 5,
  cable: 4,
  band: 4,
  bodyweight: 3,
  dumbbell: 2,
  kettlebell: 2,
  barbell: 1,
};

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
      best = { weightKg: st.weightKg, reps: st.reps, effKg: eff };
    }
  }
  return best;
}

function perfKey(p: TopPerformance): string {
  const w = p.weightKg != null && p.weightKg > 0 ? p.weightKg.toFixed(3) : "0";
  return `${w}:${p.reps}`;
}

function weightIncrementKg(ex: ExerciseDef): number {
  return isPerArm(ex) ? 2 : 2.5;
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

function formatTargetLoad(
  weightKg: number | null,
  reps: number,
  ex: ExerciseDef,
  sys: UnitSystem,
  armSuffix: string,
): string {
  if (ex.isBodyweight) {
    if (weightKg != null && weightKg > 0) return `BW+${fmtWeight(weightKg, sys, 0)} × ${reps}`;
    return `${reps} reps`;
  }
  if (weightKg != null && weightKg > 0) {
    return `${fmtWeight(weightKg, sys, isPerArm(ex) ? 1 : 0)}${armSuffix} × ${reps}`;
  }
  return `${reps} reps`;
}

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

/** Pick the set difficulty feedback should anchor on: last done live set, else history. */
export function resolveReferencePerformance(
  exerciseId: string,
  sessions: Session[],
  bodyweightKg: number | null,
  liveSets?: ReferenceSetInput[],
): TopPerformance | null {
  const ex = EXERCISE_BY_ID[exerciseId];
  if (!ex) return null;

  if (liveSets && liveSets.length > 0) {
    const usable = liveSets.filter((s) => s.reps > 0);
    if (usable.length > 0) {
      const ref = usable[usable.length - 1];
      const bwBase = bodyweightBaseKg(ex, bodyweightKg);
      const added = ref.weightKg ?? 0;
      const eff = ex.isBodyweight ? bwBase + Math.max(0, added) : Math.max(0, added);
      return { weightKg: ref.weightKg, reps: ref.reps, effKg: eff };
    }
  }

  return collectTopPerformances(exerciseId, sessions, bodyweightKg)[0] ?? null;
}

function buildIncreaseAdjust(
  current: TopPerformance,
  ex: ExerciseDef,
  sys: UnitSystem,
  targetRepHigh?: number | null,
): { adjust: CoachAdjustAction; title: string; body: string } {
  const perArm = isPerArm(ex);
  const armSuffix = perArm ? " / arm" : "";
  const repCap = targetRepHigh ?? 12;
  const incKg = weightIncrementKg(ex);
  const preferWeight = current.reps >= repCap;

  const currentLabel = formatCurrentLoad(current, ex, sys, armSuffix);

  if (preferWeight && (ex.isBodyweight || current.weightKg != null)) {
    const nextWeightKg =
      current.weightKg != null && current.weightKg > 0 ? current.weightKg + incKg : incKg;
    const targetLabel = formatTargetLoad(nextWeightKg, current.reps, ex, sys, armSuffix);
    return {
      adjust: { type: "adjust", weightKg: nextWeightKg, reps: current.reps },
      title: "Ready for a little more load",
      body: `You're at ${currentLabel}. Try ${targetLabel} when it feels clean.`,
    };
  }

  const nextReps = current.reps + 1;
  return {
    adjust: { type: "adjust", weightKg: current.weightKg, reps: nextReps },
    title: "Try one more rep",
    body: `You're at ${currentLabel}. ${nextReps} reps is a natural next step before adding load.`,
  };
}

function buildDecreaseAdjust(
  current: TopPerformance,
  ex: ExerciseDef,
  sys: UnitSystem,
): { adjust: CoachAdjustAction; title: string; body: string } {
  const perArm = isPerArm(ex);
  const armSuffix = perArm ? " / arm" : "";
  const incKg = weightIncrementKg(ex);
  const currentLabel = formatCurrentLoad(current, ex, sys, armSuffix);

  if (current.reps > 1) {
    const nextReps = current.reps - 1;
    const targetLabel = formatTargetLoad(current.weightKg, nextReps, ex, sys, armSuffix);
    return {
      adjust: { type: "adjust", weightKg: current.weightKg, reps: nextReps },
      title: "Dial it back a rep",
      body: `If ${currentLabel} felt heavy, try ${targetLabel} on your remaining sets.`,
    };
  }

  const curW = current.weightKg ?? 0;
  if (curW > incKg) {
    const nextWeightKg = Math.max(0, curW - incKg);
    const targetLabel = formatTargetLoad(nextWeightKg > 0 ? nextWeightKg : null, 1, ex, sys, armSuffix);
    return {
      adjust: { type: "adjust", weightKg: nextWeightKg > 0 ? nextWeightKg : null, reps: 1 },
      title: "Drop the load slightly",
      body: `If ${currentLabel} was too much, ${targetLabel} is a safer target for what's left.`,
    };
  }

  return {
    adjust: { type: "adjust", weightKg: current.weightKg, reps: Math.max(1, current.reps) },
    title: "Stay at this level",
    body: `You're already at a light working weight for ${currentLabel}. An easier alternative may help more than dropping further.`,
  };
}

/** Rank a substitute that is likely easier to execute than the current lift. */
export function easierAlternativeFor(
  exerciseId: string,
  excludeExerciseIds: string[] = [],
): CoachSwapAction | null {
  const base = EXERCISE_BY_ID[exerciseId];
  if (!base) return null;

  const baseEase = EQUIP_EASE[base.equipment] ?? 0;
  const exclude = new Set([exerciseId, ...excludeExerciseIds]);

  const ranked = alternativesFor(exerciseId, 16)
    .filter((a) => !exclude.has(a.id))
    .map((a) => ({
      a,
      score: scoreAlternative(base, a) + ((EQUIP_EASE[a.equipment] ?? 0) - baseEase) * 1.5,
    }))
    .filter((x) => x.score > 0 && (EQUIP_EASE[x.a.equipment] ?? 0) >= baseEase)
    .sort((x, y) => y.score - x.score || x.a.name.localeCompare(y.a.name));

  const best = ranked[0];
  if (!best) return null;
  return { type: "swap", exerciseId: best.a.id, exerciseName: best.a.name };
}

export function buildPlateauCoachSuggestion(
  exerciseId: string,
  sessions: Session[],
  sys: UnitSystem,
  bodyweightKg: number | null,
  liveDoneSets?: LiveDoneSet[],
  targetRepHigh?: number | null,
): CoachSuggestion | null {
  if (!isProgressionPlateau(exerciseId, sessions, bodyweightKg, liveDoneSets)) return null;

  const current =
    resolveReferencePerformance(exerciseId, sessions, bodyweightKg, liveDoneSets) ??
    collectTopPerformances(exerciseId, sessions, bodyweightKg)[0];
  if (!current) return null;

  const ex = EXERCISE_BY_ID[exerciseId]!;
  const built = buildIncreaseAdjust(current, ex, sys, targetRepHigh);
  const plateauSessions = PLATEAU_MIN_SESSIONS;
  const currentLabel = formatCurrentLoad(current, ex, sys, isPerArm(ex) ? " / arm" : "");
  const delta = built.body.replace(/^You're at [^.]+\.\s*/, "");

  return {
    source: "plateau",
    title: built.title,
    body: `You've held ${currentLabel} for ${plateauSessions} sessions. ${delta}`,
    adjust: built.adjust,
  };
}

export function buildFeedbackCoachSuggestion(
  source: "too_easy" | "too_hard",
  exerciseId: string,
  sessions: Session[],
  sys: UnitSystem,
  bodyweightKg: number | null,
  referenceSets?: ReferenceSetInput[],
  targetRepHigh?: number | null,
  excludeExerciseIds: string[] = [],
): CoachSuggestion | null {
  const ex = EXERCISE_BY_ID[exerciseId];
  if (!ex) return null;

  const current = resolveReferencePerformance(exerciseId, sessions, bodyweightKg, referenceSets);
  if (!current) return null;

  if (source === "too_easy") {
    const built = buildIncreaseAdjust(current, ex, sys, targetRepHigh);
    return { source, title: built.title, body: built.body, adjust: built.adjust };
  }

  const built = buildDecreaseAdjust(current, ex, sys);
  const swap = easierAlternativeFor(exerciseId, excludeExerciseIds) ?? undefined;
  return {
    source,
    title: built.title,
    body: built.body,
    adjust: built.adjust,
    swap,
  };
}

/** @deprecated — use buildPlateauCoachSuggestion */
export function buildProgressionSuggestion(
  exerciseId: string,
  sessions: Session[],
  sys: UnitSystem,
  bodyweightKg: number | null,
  liveDoneSets?: LiveDoneSet[],
  targetRepHigh?: number | null,
): ProgressionSuggestion | null {
  const coach = buildPlateauCoachSuggestion(
    exerciseId, sessions, sys, bodyweightKg, liveDoneSets, targetRepHigh,
  );
  if (!coach) return null;
  const current = resolveReferencePerformance(exerciseId, sessions, bodyweightKg, liveDoneSets)!;
  const kind = coach.adjust.reps > current.reps ? "reps" as const : "weight" as const;
  return {
    plateauSessions: PLATEAU_MIN_SESSIONS,
    current,
    kind,
    suggestReps: coach.adjust.reps,
    suggestWeightKg: coach.adjust.weightKg,
    title: coach.title,
    body: coach.body,
  };
}

export function adjustToDraftStrings(
  adjust: CoachAdjustAction,
  ex: ExerciseDef,
  sys: UnitSystem,
): { weight: string; reps: string } {
  const reps = String(Math.max(1, adjust.reps));
  const w = adjust.weightKg;
  const weight =
    w != null && w > 0 ? String(kgToDisplay(w, sys, isPerArm(ex) ? 1 : 0)) : "";
  return { weight, reps };
}

/** Display-unit placeholders for the live set row inputs. */
export function suggestionPlaceholders(
  adjust: CoachAdjustAction,
  ex: ExerciseDef,
  sys: UnitSystem,
): { weight: string; reps: string } {
  const { weight, reps } = adjustToDraftStrings(adjust, ex, sys);
  if (ex.isBodyweight) {
    return {
      weight: weight ? `+${weight}` : "+0",
      reps,
    };
  }
  return { weight: weight || "—", reps };
}
