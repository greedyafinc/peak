// Peak — mobility distributions: hip / shoulder / ankle ROM (degrees) and sit-and-reach
// (the "spine" leaf, unit METERS). Conditioned on sex + age. Higher is better.
//
// Each leaf is a GENERAL-POPULATION tier ladder fit at its population percentiles, so the
// median is an average adult (the old code pinned an athletic/"good" reference at the mean,
// and its tight fixed SDs read a merely-good ankle dorsiflexion near the 98th). ROM and
// sit-and-reach are ~symmetric, so a plain Gaussian fit (no log transform) is used.
//
// Sources: AAOS reference ROM means + Soucie et al. 2011 age/sex decline; FitnessNorms/ACSM
// sit-and-reach (standard 23cm foot-line box; women ~5–7cm more flexible). Sit-and-reach
// tiers are stored in METERS (the leaf unit).

import type { Cohort, CohortDist, LeafId } from "../../types";
import { BLEND_K } from "../../constants";
import { ladderCohortDist, type LadderLeaf } from "./_shared";

const MP = [0.2, 0.5, 0.8, 0.93, 0.985];

const LADDERS: Record<string, LadderLeaf> = {
  "mobility.hip": {
    male: [
      { age: 25, tiers: [116, 122, 130, 134, 140] }, { age: 35, tiers: [114, 121, 129, 133, 139] },
      { age: 45, tiers: [112, 119, 127, 131, 137] }, { age: 55, tiers: [109, 116, 124, 129, 135] }, { age: 65, tiers: [106, 113, 121, 126, 132] },
    ],
    female: [
      { age: 25, tiers: [119, 126, 134, 138, 144] }, { age: 35, tiers: [117, 124, 132, 136, 142] },
      { age: 45, tiers: [114, 121, 130, 134, 140] }, { age: 55, tiers: [111, 119, 127, 132, 138] }, { age: 65, tiers: [108, 116, 125, 130, 136] },
    ],
    pctls: MP, lowerIsBetter: false, skewed: false,
    seedSources: ["ACSM"], confidenceBasis: 0.7,
    dataSourceLabel: "Hip-flexion ROM norms (degrees), AAOS reference + Soucie et al. age decline.",
    assumptions: ["General-population tier ladder fit at population percentiles; sex difference small (women trend slightly higher)."],
  },
  "mobility.shoulder": {
    male: [
      { age: 25, tiers: [158, 169, 178, 182, 188] }, { age: 35, tiers: [156, 167, 176, 181, 187] },
      { age: 45, tiers: [152, 164, 173, 179, 185] }, { age: 55, tiers: [149, 161, 170, 176, 182] }, { age: 65, tiers: [146, 158, 167, 173, 180] },
    ],
    female: [
      { age: 25, tiers: [161, 172, 180, 184, 190] }, { age: 35, tiers: [159, 170, 178, 183, 189] },
      { age: 45, tiers: [156, 168, 176, 181, 187] }, { age: 55, tiers: [152, 165, 173, 178, 184] }, { age: 65, tiers: [149, 162, 170, 176, 182] },
    ],
    pctls: MP, lowerIsBetter: false, skewed: false,
    seedSources: ["ACSM"], confidenceBasis: 0.7,
    dataSourceLabel: "Shoulder-flexion ROM norms (degrees), AAOS reference + age decline.",
    assumptions: ["General-population tier ladder fit at population percentiles; ROM is anatomically capped near ~190°."],
  },
  "mobility.ankle": {
    male: [
      { age: 25, tiers: [7, 13, 18, 22, 28] }, { age: 35, tiers: [7, 13, 18, 22, 28] },
      { age: 45, tiers: [6, 12, 17, 21, 27] }, { age: 55, tiers: [5, 11, 16, 20, 26] }, { age: 65, tiers: [5, 11, 16, 20, 25] },
    ],
    female: [
      { age: 25, tiers: [8, 14, 19, 23, 29] }, { age: 35, tiers: [8, 14, 19, 23, 29] },
      { age: 45, tiers: [7, 13, 18, 22, 28] }, { age: 55, tiers: [6, 12, 17, 21, 27] }, { age: 65, tiers: [6, 12, 16, 20, 26] },
    ],
    pctls: MP, lowerIsBetter: false, skewed: false,
    seedSources: ["ACSM"], confidenceBasis: 0.68,
    dataSourceLabel: "Ankle-dorsiflexion ROM norms (degrees), AAOS reference + age decline.",
    assumptions: ["General-population tier ladder fit at population percentiles; large relative age decline."],
  },
  "mobility.spine": {
    // Sit-and-reach; leaf unit is METERS (cm ÷ 100).
    male: [
      { age: 25, tiers: [0.13, 0.24, 0.32, 0.38, 0.44] }, { age: 35, tiers: [0.12, 0.23, 0.31, 0.37, 0.43] },
      { age: 45, tiers: [0.11, 0.22, 0.30, 0.36, 0.42] }, { age: 55, tiers: [0.09, 0.20, 0.28, 0.34, 0.40] }, { age: 65, tiers: [0.07, 0.18, 0.26, 0.32, 0.38] },
    ],
    female: [
      { age: 25, tiers: [0.20, 0.31, 0.38, 0.44, 0.50] }, { age: 35, tiers: [0.19, 0.30, 0.37, 0.43, 0.49] },
      { age: 45, tiers: [0.18, 0.29, 0.36, 0.42, 0.48] }, { age: 55, tiers: [0.16, 0.27, 0.34, 0.40, 0.46] }, { age: 65, tiers: [0.14, 0.25, 0.32, 0.38, 0.44] },
    ],
    pctls: MP, lowerIsBetter: false, skewed: false,
    seedSources: ["ACSM"], confidenceBasis: 0.72,
    dataSourceLabel: "Sit-and-reach flexibility norms, FitnessNorms/ACSM (standard 23cm box).",
    assumptions: [
      "General-population tier ladder fit at population percentiles; raw value in meters (standard foot-line box ≈ 0.23m at the toes).",
      "Women ~5–7cm more flexible at every age.",
    ],
  },
};

export function mobilityCohortDist(leafId: LeafId, cohort: Cohort): CohortDist | null {
  const leaf = LADDERS[leafId];
  return leaf ? ladderCohortDist(leafId, cohort, BLEND_K.mobility, leaf) : null;
}
