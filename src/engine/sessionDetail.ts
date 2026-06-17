// Peak — logged SESSION summary view model (the "expand a logged activity into a
// full page" detail). PURE / DETERMINISTIC given (data, sessionId).
//
// Everything here is derived from the REAL committed Session — its logged sets and
// cardio efforts. Nothing is invented: volume/reps/est-1RM are computed from the
// stored values, and the muscle-emphasis breakdown reuses the SAME attribution
// coefficients the scoring engine uses, so it never claims more work than the
// session actually did.

import type { PeakData, MuscleGroup, WorkoutType } from "../types";
import { est1RM } from "./math";
import { EXERCISE_BY_ID } from "../data/exercises";
import { isPerArm, perArmFactor, muscleLabel, bodyweightBaseKg } from "../data/exerciseCatalog";

export type SessionSetRow = {
  weightKg: number | null;   // ENTERED external load; for a bodyweight set this is added plates (null = none)
  reps: number;
  rpe: number | null;
  est1RM: number | null;     // est-1RM of the effective load (bodyweight base + added, for calisthenics)
  bodyweight: boolean;       // a calisthenics set — its load is bodyweight-derived, not the bar
};

export type SessionExerciseRow = {
  entryId: string;
  exerciseId: string;
  name: string;
  perArm: boolean;
  sets: SessionSetRow[];
  topSetKg: number | null;   // load of the heaviest est-1RM set
  topSetReps: number | null;
  best1RM: number | null;
  volumeKg: number;          // Σ weight · armMult · reps (loaded sets only)
  totalReps: number;
};

export type SessionCardioRow = {
  cardioId: string;
  distanceKm: number | null;
  durSec: number;
  paceSecPerKm: number | null;
  avgHrBpm: number | null;
};

export type SessionMuscleShare = { group: MuscleGroup; label: string; share: number };

export type SessionSummary = {
  id: string;
  type: WorkoutType;
  title: string;
  dateLabel: string;         // e.g. "Mon, Jun 16"
  timeLabel: string;         // e.g. "1:30 PM"
  durationMin: number | null;
  notes: string | null;
  exercises: SessionExerciseRow[];
  cardio: SessionCardioRow[];
  totalVolumeKg: number;
  totalSets: number;
  totalReps: number;
  totalDistanceKm: number;   // summed across cardio efforts
  totalCardioSec: number;
  avgPaceSecPerKm: number | null;
  muscles: SessionMuscleShare[];  // emphasis across the session's strength work (sorted, sums to 1)
};

/**
 * Aggregate per-muscle emphasis across a session's strength exercises, weighting
 * each exercise by the work it represents (tonnage where loaded, else rep count so
 * bodyweight movements still count). Returns group shares that sum to 1.
 */
function aggregateMuscles(rows: SessionExerciseRow[]): SessionMuscleShare[] {
  const acc: Partial<Record<MuscleGroup, number>> = {};
  for (const row of rows) {
    const def = EXERCISE_BY_ID[row.exerciseId];
    if (!def) continue;
    const work = row.volumeKg > 0 ? row.volumeKg : row.totalReps; // bodyweight proxy
    if (work <= 0) continue;
    for (const g of Object.keys(def.muscleWeights) as MuscleGroup[]) {
      const w = def.muscleWeights[g] ?? 0;
      if (w > 0) acc[g] = (acc[g] ?? 0) + work * w;
    }
  }
  const total = (Object.values(acc) as number[]).reduce((a, b) => a + b, 0);
  if (total <= 0) return [];
  return (Object.keys(acc) as MuscleGroup[])
    .map((g) => ({ group: g, label: muscleLabel(g), share: (acc[g] ?? 0) / total }))
    .sort((a, b) => b.share - a.share);
}

export function buildSessionSummary(data: PeakData, sessionId: string): SessionSummary | null {
  const session = data.sessions.find((s) => s.id === sessionId);
  if (!session) return null;
  const at = new Date(session.createdAt);

  const exercises: SessionExerciseRow[] = session.entries.map((entry) => {
    const def = EXERCISE_BY_ID[entry.exerciseId];
    const perArm = def ? isPerArm(def) : false;
    const armMult = def ? perArmFactor(def) : 1;
    const isBw = def?.isBodyweight ?? false;
    // Calisthenics load = bodyweight × leverage (from the session's own build snapshot)
    // plus any belt/vest plates. Bodyweight unknown → base 0 (falls back to reps).
    const bwBase = def ? bodyweightBaseKg(def, session.build.bodyweightKg) : 0;
    let volumeKg = 0;
    let totalReps = 0;
    let best1RM: number | null = null;
    let topSetKg: number | null = null;
    let topSetReps: number | null = null;
    const sets: SessionSetRow[] = entry.sets.map((st) => {
      const addedKg = st.weight?.value ?? null;
      // Effective load (kg): bodyweight base + added plates for calisthenics, else the
      // raw entered weight (per-implement — matches how it was logged). Volume tonnage
      // uses the per-arm total; the est-1RM rides the effective load.
      const eff = isBw ? bwBase + (addedKg ?? 0) : addedKg ?? 0;
      const e1 = eff > 0 ? est1RM(eff, st.reps) : null;
      const movedPerRep = isBw ? eff : eff * armMult;
      totalReps += st.reps;
      volumeKg += movedPerRep * st.reps;
      if (e1 != null && (best1RM == null || e1 > best1RM)) {
        best1RM = e1;
        topSetKg = eff;
        topSetReps = st.reps;
      }
      return { weightKg: addedKg, reps: st.reps, rpe: st.rpe ?? null, est1RM: e1, bodyweight: isBw };
    });
    return {
      entryId: entry.id,
      exerciseId: entry.exerciseId,
      name: def?.name ?? entry.exerciseId,
      perArm,
      sets,
      topSetKg,
      topSetReps,
      best1RM,
      volumeKg,
      totalReps,
    };
  });

  const cardio: SessionCardioRow[] = (session.cardio ?? []).map((cs) => {
    const durSec = cs.duration.value * 60; // cardio duration canonical = minutes
    const distanceKm = cs.distance?.value ?? null;
    return {
      cardioId: cs.id,
      distanceKm,
      durSec,
      paceSecPerKm: distanceKm != null && distanceKm > 0 ? durSec / distanceKm : null,
      avgHrBpm: cs.avgHr?.value ?? null,
    };
  });

  const totalVolumeKg = exercises.reduce((a, e) => a + e.volumeKg, 0);
  const totalSets = exercises.reduce((a, e) => a + e.sets.length, 0);
  const totalReps = exercises.reduce((a, e) => a + e.totalReps, 0);
  const totalDistanceKm = cardio.reduce((a, c) => a + (c.distanceKm ?? 0), 0);
  const totalCardioSec = cardio.reduce((a, c) => a + c.durSec, 0);

  return {
    id: session.id,
    type: session.type,
    title: session.title,
    dateLabel: at.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
    timeLabel: at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    durationMin: session.durationMin ?? null,
    notes: session.notes ?? null,
    exercises,
    cardio,
    totalVolumeKg,
    totalSets,
    totalReps,
    totalDistanceKm,
    totalCardioSec,
    avgPaceSecPerKm: totalDistanceKm > 0 ? totalCardioSec / totalDistanceKm : null,
    muscles: aggregateMuscles(exercises),
  };
}
