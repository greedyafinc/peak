// Peak — anaerobic distributions: 400m sprint, repeat-sprint ability, 60s max effort.
// Conditioned on sex + age. Each leaf is a GENERAL-POPULATION tier ladder fit at its
// population percentiles (ladderCohortDist) — the median is an average adult, not the
// trained sprinter the old code pinned at the mean (which read a 120s recreational 400m
// at the ~0.1th percentile). Times are lowerIsBetter; the 60s distance is right-skewed
// and zero-floored (log1p).
//
// Sources: World Masters Athletics / track age-grade tables (400m), team-sport repeat-
// sprint protocols, rowing-erg & run-equivalent 60s norms — recreational fields, thin seed.

import type { Cohort, CohortDist, LeafId } from "../../types";
import { BLEND_K } from "../../constants";
import { ladderCohortDist, type LadderLeaf } from "./_shared";

const TP = [0.3, 0.55, 0.82, 0.94, 0.99];   // time-based ladders
const RS = [0.25, 0.55, 0.82, 0.94, 0.99];  // right-skewed distance ladder

const LADDERS: Record<string, LadderLeaf> = {
  "anaerobic.400m": {
    male: [
      { age: 25, tiers: [135, 118, 98, 84, 72] }, { age: 35, tiers: [138, 121, 100, 86, 74] },
      { age: 45, tiers: [146, 128, 106, 91, 78] }, { age: 55, tiers: [158, 138, 115, 99, 85] },
      { age: 65, tiers: [175, 153, 127, 110, 95] },
    ],
    female: [
      { age: 25, tiers: [155, 137, 114, 99, 85] }, { age: 35, tiers: [158, 140, 117, 101, 87] },
      { age: 45, tiers: [168, 148, 124, 107, 92] }, { age: 55, tiers: [182, 161, 134, 116, 100] },
      { age: 65, tiers: [200, 177, 148, 128, 110] },
    ],
    pctls: TP, lowerIsBetter: true, skewed: false,
    seedSources: ["WMA_AGE_GRADED", "MILITARY_FITNESS"], confidenceBasis: 0.6,
    dataSourceLabel: "400m all-out run-time norms (age-graded), recreational distributions by sex and age.",
    assumptions: ["General-population tier ladder fit at population percentiles; median = an average adult, not a trained sprinter."],
  },
  "anaerobic.sprint_repeats": {
    male: [
      { age: 25, tiers: [9.2, 8.3, 7.2, 6.6, 6.0] }, { age: 35, tiers: [9.6, 8.7, 7.5, 6.9, 6.3] },
      { age: 45, tiers: [10.3, 9.3, 8.1, 7.4, 6.8] }, { age: 55, tiers: [11.2, 10.1, 8.8, 8.1, 7.4] },
      { age: 65, tiers: [12.4, 11.2, 9.8, 9.0, 8.2] },
    ],
    female: [
      { age: 25, tiers: [10.4, 9.4, 8.2, 7.5, 6.9] }, { age: 35, tiers: [10.8, 9.8, 8.6, 7.9, 7.2] },
      { age: 45, tiers: [11.6, 10.5, 9.2, 8.5, 7.8] }, { age: 55, tiers: [12.6, 11.4, 10.0, 9.2, 8.5] },
      { age: 65, tiers: [13.9, 12.6, 11.1, 10.2, 9.4] },
    ],
    pctls: TP, lowerIsBetter: true, skewed: false,
    seedSources: ["MILITARY_FITNESS"], confidenceBasis: 0.5,
    dataSourceLabel: "Repeat-sprint ability — mean time per rep across a maximal repeat-sprint set (~40m reps).",
    assumptions: [
      "General-population tier ladder fit at population percentiles; median = an average adult.",
      "Sparse, protocol-dependent seed → lower confidence.",
    ],
  },
  "anaerobic.max_effort_60s": {
    male: [
      { age: 25, tiers: [220, 285, 350, 390, 440] }, { age: 35, tiers: [210, 275, 338, 378, 425] },
      { age: 45, tiers: [195, 255, 315, 352, 398] }, { age: 55, tiers: [175, 230, 287, 322, 365] },
      { age: 65, tiers: [152, 202, 255, 288, 328] },
    ],
    female: [
      { age: 25, tiers: [175, 228, 282, 315, 358] }, { age: 35, tiers: [168, 220, 272, 305, 346] },
      { age: 45, tiers: [155, 205, 255, 286, 325] }, { age: 55, tiers: [140, 185, 232, 262, 298] },
      { age: 65, tiers: [122, 162, 206, 234, 268] },
    ],
    pctls: RS, lowerIsBetter: false, skewed: true,
    seedSources: ["COOPER", "MILITARY_FITNESS"], confidenceBasis: 0.5,
    dataSourceLabel: "Distance covered in a 60-second all-out effort (rowing-erg / run-equivalent), by sex and age.",
    assumptions: [
      "General-population tier ladder fit at population percentiles; median = an average adult.",
      "Right-skewed, zero-floored output; equipment/protocol vary → thin seed.",
    ],
  },
};

export function anaerobicCohortDist(leafId: LeafId, cohort: Cohort): CohortDist | null {
  const leaf = LADDERS[leafId];
  return leaf ? ladderCohortDist(leafId, cohort, BLEND_K.anaerobic, leaf) : null;
}
