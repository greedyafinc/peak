// Peak — power distributions: vertical jump, broad jump, medicine-ball throw (§2.2).
// Conditioned on sex + age. Higher is better; jumps are bodyweight-relative (§3.6.1 guard).
//
// Each leaf is a GENERAL-POPULATION tier ladder (beginner→elite at representative ages),
// fit through its population percentiles via ladderCohortDist — so the median is an
// average adult, not the athletic reference the old code pinned at the mean (which read a
// sedentary jumper at the 15th percentile and a trained one near-elite). Jump/throw
// distributions are right-skewed and zero-floored → log1p fit.
//
// Sources: Topend Sports countermovement-jump & standing-long-jump rating tables, ACSM /
// research means with ~3–5cm/decade decline; med-ball throw is protocol-dependent (thinner).

import type { Cohort, CohortDist, LeafId } from "../../types";
import { BLEND_K } from "../../constants";
import { ladderCohortDist, type LadderLeaf } from "./_shared";

const RS = [0.25, 0.55, 0.82, 0.94, 0.99]; // general-population percentiles for these ladders

const LADDERS: Record<string, LadderLeaf> = {
  "power.vertical_jump": {
    male: [
      { age: 25, tiers: [0.18, 0.27, 0.43, 0.55, 0.71] }, { age: 35, tiers: [0.15, 0.24, 0.39, 0.5, 0.64] },
      { age: 45, tiers: [0.12, 0.2, 0.33, 0.43, 0.56] }, { age: 55, tiers: [0.09, 0.16, 0.27, 0.36, 0.47] },
      { age: 65, tiers: [0.06, 0.12, 0.21, 0.29, 0.39] },
    ],
    female: [
      { age: 25, tiers: [0.12, 0.19, 0.3, 0.39, 0.5] }, { age: 35, tiers: [0.1, 0.16, 0.27, 0.35, 0.45] },
      { age: 45, tiers: [0.08, 0.13, 0.23, 0.3, 0.39] }, { age: 55, tiers: [0.06, 0.1, 0.18, 0.25, 0.33] },
      { age: 65, tiers: [0.04, 0.07, 0.14, 0.2, 0.27] },
    ],
    pctls: RS, lowerIsBetter: false, skewed: true,
    seedSources: ["MILITARY_FITNESS", "ACSM"], confidenceBasis: 0.7,
    dataSourceLabel: "Countermovement vertical-jump norms (Topend Sports) by sex and age.",
    assumptions: [
      "General-population tier ladder (beginner→elite) fit at population percentiles; median = an average adult.",
      "Bodyweight-relative power → §3.6.1 floor guard applies below the essential-fat floor.",
    ],
  },
  "power.broad_jump": {
    male: [
      { age: 25, tiers: [1.45, 1.8, 2.2, 2.45, 2.75] }, { age: 35, tiers: [1.35, 1.7, 2.08, 2.32, 2.6] },
      { age: 45, tiers: [1.22, 1.55, 1.92, 2.15, 2.42] }, { age: 55, tiers: [1.05, 1.35, 1.7, 1.92, 2.18] },
      { age: 65, tiers: [0.88, 1.15, 1.48, 1.68, 1.92] },
    ],
    female: [
      { age: 25, tiers: [1.0, 1.3, 1.62, 1.82, 2.05] }, { age: 35, tiers: [0.92, 1.2, 1.52, 1.72, 1.95] },
      { age: 45, tiers: [0.82, 1.08, 1.4, 1.58, 1.8] }, { age: 55, tiers: [0.7, 0.95, 1.25, 1.42, 1.62] },
      { age: 65, tiers: [0.58, 0.8, 1.08, 1.25, 1.45] },
    ],
    pctls: RS, lowerIsBetter: false, skewed: true,
    seedSources: ["MILITARY_FITNESS", "ACSM"], confidenceBasis: 0.68,
    dataSourceLabel: "Standing broad-jump norms (Topend Sports) by sex and age.",
    assumptions: [
      "General-population tier ladder fit at population percentiles; median = an average adult.",
      "Bodyweight-relative power → §3.6.1 floor guard applies below the essential-fat floor.",
    ],
  },
  "power.med_ball_throw": {
    male: [
      { age: 25, tiers: [3.4, 4.3, 5.4, 6.1, 7.0] }, { age: 35, tiers: [3.2, 4.1, 5.1, 5.8, 6.6] },
      { age: 45, tiers: [2.9, 3.7, 4.7, 5.3, 6.1] }, { age: 55, tiers: [2.6, 3.3, 4.2, 4.8, 5.5] },
      { age: 65, tiers: [2.2, 2.8, 3.6, 4.1, 4.8] },
    ],
    female: [
      { age: 25, tiers: [2.4, 3.1, 3.9, 4.4, 5.1] }, { age: 35, tiers: [2.2, 2.9, 3.7, 4.2, 4.8] },
      { age: 45, tiers: [2.0, 2.6, 3.4, 3.8, 4.4] }, { age: 55, tiers: [1.7, 2.3, 3.0, 3.4, 3.9] },
      { age: 65, tiers: [1.4, 1.9, 2.5, 2.9, 3.4] },
    ],
    pctls: RS, lowerIsBetter: false, skewed: true,
    seedSources: ["ACSM"], confidenceBasis: 0.6,
    dataSourceLabel: "Seated medicine-ball-throw distance (Topend Sports); protocol-dependent.",
    assumptions: [
      "General-population tier ladder fit at population percentiles; median = an average adult.",
      "Highly protocol-dependent (ball mass, seated vs standing) — modeled for a ~2–3kg seated chest pass; thinner seed.",
    ],
  },
};

export function powerCohortDist(leafId: LeafId, cohort: Cohort): CohortDist | null {
  const leaf = LADDERS[leafId];
  return leaf ? ladderCohortDist(leafId, cohort, BLEND_K.power, leaf) : null;
}
