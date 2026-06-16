// Peak — muscular-endurance distributions: max push-ups, pull-ups, plank hold,
// bodyweight squats. Conditioned on sex + age; higher is better. Mass-relative leaves
// carry the §3.6.1 floor guard downstream.
//
// All four are rep counts / hold times — right-skewed and ZERO-FLOORED. The old code fit a
// symmetric Gaussian centred on an ACSM "average", which (a) placed a trained-fitness mean
// at the median (ordinary adults read below it) and (b) leaked huge probability below zero
// (female pull-ups: ~31% sub-zero mass, so 1 strict pull-up read ~46th). Each leaf is now a
// GENERAL-POPULATION tier ladder fit in log1p space — strictly non-negative, right-skewed,
// median = an average adult.
//
// Sources: ACSM one-max-set push-up norms + US Army AFT right-tail; USMC PFT + general-
// population pull-up averages; US Army ACFT/AFT plank (sex-neutral, age-banded); bodyweight
// squats have no authoritative table → estimated (flagged).

import type { Cohort, CohortDist, LeafId } from "../../types";
import { BLEND_K } from "../../constants";
import { ladderCohortDist, type LadderLeaf } from "./_shared";

const EP = [0.2, 0.5, 0.8, 0.93, 0.985];     // most endurance ladders
const PULL = [0.5, 0.85, 0.95, 0.985, 0.998]; // pull-ups: the median adult does ~0

const plankRows = [
  { age: 25, tiers: [20, 50, 100, 150, 240] }, { age: 35, tiers: [18, 45, 90, 135, 210] },
  { age: 45, tiers: [15, 38, 75, 115, 180] }, { age: 55, tiers: [12, 30, 60, 95, 150] },
  { age: 65, tiers: [10, 25, 50, 80, 120] },
];

const LADDERS: Record<string, LadderLeaf> = {
  "muscular_endurance.pushups_max": {
    male: [
      { age: 25, tiers: [5, 15, 30, 45, 65] }, { age: 35, tiers: [4, 12, 25, 38, 55] },
      { age: 45, tiers: [3, 9, 20, 30, 45] }, { age: 55, tiers: [2, 7, 16, 25, 38] }, { age: 65, tiers: [1, 5, 12, 20, 30] },
    ],
    female: [
      { age: 25, tiers: [2, 8, 18, 28, 42] }, { age: 35, tiers: [1, 6, 15, 24, 36] },
      { age: 45, tiers: [1, 5, 12, 19, 30] }, { age: 55, tiers: [0, 3, 9, 15, 24] }, { age: 65, tiers: [0, 2, 6, 11, 18] },
    ],
    pctls: EP, lowerIsBetter: false, skewed: true,
    seedSources: ["ACSM", "MILITARY_FITNESS"], confidenceBasis: 0.8,
    dataSourceLabel: "Max push-up norms (single set), ACSM by sex/age + military right-tail anchor.",
    assumptions: [
      "General-population tier ladder fit in log1p space (right-skewed, zero-floored); median = an average adult.",
      "Mass-relative bodyweight movement; §3.6.1 floor guard applies below the essential-fat floor.",
    ],
  },
  "muscular_endurance.pullups_max": {
    male: [
      { age: 25, tiers: [0, 3, 8, 15, 25] }, { age: 35, tiers: [0, 3, 8, 14, 23] },
      { age: 45, tiers: [0, 2, 6, 11, 18] }, { age: 55, tiers: [0, 1, 4, 8, 13] }, { age: 65, tiers: [0, 1, 3, 5, 9] },
    ],
    female: [
      { age: 25, tiers: [0, 1, 3, 7, 14] }, { age: 35, tiers: [0, 1, 3, 6, 12] },
      { age: 45, tiers: [0, 0, 2, 5, 9] }, { age: 55, tiers: [0, 0, 1, 3, 6] }, { age: 65, tiers: [0, 0, 1, 2, 4] },
    ],
    pctls: PULL, lowerIsBetter: false, skewed: true,
    seedSources: ["MILITARY_FITNESS", "ACSM"], confidenceBasis: 0.78,
    dataSourceLabel: "Max strict pull-up norms, USMC PFT scoring + general-population averages by sex/age.",
    assumptions: [
      "Zero-floored, heavily right-skewed: the MEDIAN adult does ~0 strict pull-ups, so any positive count reads above average.",
      "Fit in log1p space so the curve never leaks probability below zero (the old symmetric Gaussian put ~31% of women below 0).",
      "Mass-relative; §3.6.1 floor guard applies below the essential-fat floor.",
    ],
  },
  "muscular_endurance.plank": {
    male: plankRows, female: plankRows, // Army plank standard is sex-neutral, age-banded
    pctls: EP, lowerIsBetter: false, skewed: true,
    seedSources: ["MILITARY_FITNESS", "ACSM"], confidenceBasis: 0.72,
    dataSourceLabel: "Plank-hold norms (seconds), US Army ACFT/AFT age-banded standards (sex-neutral).",
    assumptions: [
      "General-population tier ladder fit in log1p space (right-skewed); median = an average adult.",
      "Sex-neutral, age-banded (the Army plank standard is not sex-split).",
    ],
  },
  "muscular_endurance.squats_bw": {
    male: [
      { age: 25, tiers: [15, 30, 45, 60, 90] }, { age: 35, tiers: [13, 27, 40, 54, 80] },
      { age: 45, tiers: [11, 23, 35, 47, 70] }, { age: 55, tiers: [9, 19, 30, 40, 60] }, { age: 65, tiers: [7, 15, 24, 33, 50] },
    ],
    female: [
      { age: 25, tiers: [13, 26, 40, 53, 80] }, { age: 35, tiers: [11, 23, 35, 47, 70] },
      { age: 45, tiers: [9, 19, 30, 40, 60] }, { age: 55, tiers: [7, 16, 25, 34, 50] }, { age: 65, tiers: [6, 13, 20, 28, 42] },
    ],
    pctls: EP, lowerIsBetter: false, skewed: true,
    seedSources: ["ACSM"], confidenceBasis: 0.55,
    dataSourceLabel: "Bodyweight-squat endurance — estimated reference (no authoritative norm table).",
    assumptions: [
      "ESTIMATED: no published bodyweight air-squat norm table exists; values are a reasoned general-population estimate.",
      "Fit in log1p space (right-skewed, zero-floored); mass-relative → §3.6.1 floor guard applies.",
    ],
  },
};

export function muscularEnduranceCohortDist(leafId: LeafId, cohort: Cohort): CohortDist | null {
  const leaf = LADDERS[leafId];
  return leaf ? ladderCohortDist(leafId, cohort, BLEND_K.muscular_endurance, leaf) : null;
}
