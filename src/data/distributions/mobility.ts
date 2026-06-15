// Peak — mobility distributions: hip / shoulder / ankle ROM (degrees) and sit-and-reach
// (the "spine" leaf, unit meters) (§2.2). Conditioned on sex + age. Higher is better.
//
// Sources:
//   ROM (degrees): AAOS reference means (hip flexion ~120°, shoulder flexion ~170–180°,
//                  ankle dorsiflexion ~20°); Soucie et al. 2011 age/sex ROM decline.
//   sit-and-reach: FitnessNorms / ACSM (standard 23cm foot-line box; women ~5–7cm more
//                  flexible). Leaf unit is METERS, so cm values are /100.

import type { Cohort, CohortDist, LeafId } from "../../types";
import { BLEND_K } from "../../constants";
import { interp, makeDistId, sexKey, firstPartyWeight } from "./_shared";

// Joint ROM means in DEGREES by age (sex difference small for ROM; women slightly higher).
const HIP_FLEX_MEAN: { x: number; y: number }[] = [
  { x: 22, y: 122 },
  { x: 40, y: 118 },
  { x: 60, y: 110 },
  { x: 75, y: 102 },
];
const SHOULDER_FLEX_MEAN: { x: number; y: number }[] = [
  { x: 22, y: 178 },
  { x: 40, y: 172 },
  { x: 60, y: 165 },
  { x: 75, y: 158 },
];
const ANKLE_DORSI_MEAN: { x: number; y: number }[] = [
  { x: 22, y: 20 },
  { x: 40, y: 18 },
  { x: 60, y: 14 },
  { x: 75, y: 11 },
];

// Sit-and-reach mean in CENTIMETERS (standard box) by sex × age.
const SIT_REACH_MEAN_CM: Record<"male" | "female", { x: number; y: number }[]> = {
  male: [
    { x: 25, y: 24.6 },
    { x: 35, y: 24.2 },
    { x: 45, y: 23.3 },
    { x: 55, y: 22.1 },
    { x: 65, y: 20.5 },
  ],
  female: [
    { x: 25, y: 31.1 },
    { x: 35, y: 31.0 },
    { x: 45, y: 30.2 },
    { x: 55, y: 29.1 },
    { x: 65, y: 27.5 },
  ],
};

export function mobilityCohortDist(leafId: LeafId, cohort: Cohort): CohortDist | null {
  const sk = sexKey(cohort.sex);
  const K = BLEND_K.mobility;
  const nObserved = 0;
  const fpw = firstPartyWeight(nObserved, K);
  const age = cohort.ageYears;
  const sexNote =
    cohort.sex === "unspecified" ? ["Sex unspecified → male-coded norms used as fallback."] : [];

  const base = {
    lowerIsBetter: false,
    curveProvenance: "seed_population" as const,
    seedSources: ["ACSM"] as CohortDist["seedSources"],
    confidenceBasis: 0.7,
    K,
    nObserved,
    firstPartyWeight: fpw,
    distributionId: makeDistId(leafId, cohort),
  };

  if (leafId === "mobility.hip") {
    const mean = interp(age, HIP_FLEX_MEAN);
    return {
      ...base,
      mean,
      sd: 12,
      dataSourceLabel: "Hip-flexion ROM norms (degrees), AAOS reference + Soucie et al. age decline.",
      assumptions: ["Sex difference in ROM is small; women trend slightly higher.", ...sexNote],
    };
  }

  if (leafId === "mobility.shoulder") {
    const mean = interp(age, SHOULDER_FLEX_MEAN);
    return {
      ...base,
      mean,
      sd: 10,
      dataSourceLabel: "Shoulder-flexion ROM norms (degrees), AAOS reference + age decline.",
      assumptions: ["Sex difference small.", ...sexNote],
    };
  }

  if (leafId === "mobility.ankle") {
    const mean = interp(age, ANKLE_DORSI_MEAN);
    return {
      ...base,
      mean,
      sd: 5,
      confidenceBasis: 0.68,
      dataSourceLabel: "Ankle-dorsiflexion ROM norms (degrees), AAOS reference + age decline.",
      assumptions: [
        "Large relative age decline (20°→~11° by 70s).",
        "Sex difference small.",
        ...sexNote,
      ],
    };
  }

  if (leafId === "mobility.spine") {
    // Sit-and-reach; leaf unit is METERS.
    const meanCm = interp(age, SIT_REACH_MEAN_CM[sk]);
    const mean = meanCm / 100;
    return {
      ...base,
      mean,
      sd: 0.08, // ~8cm spread
      confidenceBasis: 0.72,
      dataSourceLabel: "Sit-and-reach flexibility norms, FitnessNorms/ACSM (standard 23cm box).",
      assumptions: [
        "Raw value in meters (standard foot-line box ≈ 0.23m at the toes).",
        "Women ~5–7cm more flexible at every age.",
        ...sexNote,
      ],
    };
  }

  return null;
}
