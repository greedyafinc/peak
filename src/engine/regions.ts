// Peak — per-region TRAINING emphasis from logged sets (§4.3 granular extension).
//
// Honest companion to the inferred per-muscle strength: where the muscle-strength
// estimate says "how strong this group is", this says "which HEADS of it you actually
// train". It attributes each performed set's region weights (regionWeightsForExercise)
// across the group's sub-regions and reports the share of set-volume each region has
// received — surfacing imbalances (lots of lower-chest pressing, little incline work)
// without inventing any number. Returns empty when the user hasn't trained the group.
// PURE / DETERMINISTIC given (sessions, group).

import type { Session, MuscleGroup, MuscleRegion } from "../types";
import { EXERCISE_BY_ID } from "../data/exercises";
import { regionWeightsForExercise, regionsForGroup, REGION_TO_GROUP, regionLabel } from "../data/muscleRegions";

export type RegionTraining = {
  region: MuscleRegion;
  label: string;
  sets: number;   // attributed set-volume (a set splits across the regions it trains)
  share: number;  // 0..1 within the group (0 when nothing logged)
};

export type RegionTrainingResult = {
  regions: RegionTraining[]; // the group's regions, sorted by trained share (desc)
  totalSets: number;         // total attributed set-volume to this group
};

/** Attributed set-volume per sub-region of `group`, from every performed set in `sessions`. */
export function regionTrainingForGroup(sessions: Session[], group: MuscleGroup): RegionTrainingResult {
  const ids = regionsForGroup(group);
  const tally: Partial<Record<MuscleRegion, number>> = {};
  for (const id of ids) tally[id] = 0;
  let total = 0;

  for (const session of sessions) {
    for (const entry of session.entries) {
      const ex = EXERCISE_BY_ID[entry.exerciseId];
      if (!ex) continue;
      const nSets = entry.sets.filter((set) => set.reps > 0).length;
      if (nSets === 0) continue;
      const rw = regionWeightsForExercise(ex);
      for (const key of Object.keys(rw) as MuscleRegion[]) {
        if (REGION_TO_GROUP[key] !== group) continue;
        const v = (rw[key] ?? 0) * nSets;
        tally[key] = (tally[key] ?? 0) + v;
        total += v;
      }
    }
  }

  const regions: RegionTraining[] = ids
    .map((id) => ({
      region: id,
      label: regionLabel(id),
      sets: tally[id] ?? 0,
      share: total > 0 ? (tally[id] ?? 0) / total : 0,
    }))
    .sort((a, b) => b.share - a.share);

  return { regions, totalSets: total };
}
