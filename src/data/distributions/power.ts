// Peak — power distributions: vertical jump, broad jump, medicine-ball throw (§2.2).
// Conditioned on sex + age (+ height enters the norm for jumps). Higher is better.
// Jump leaves are bodyweight-relative → §3.6.1 floor guard applies downstream.
//
// RAW UNITS: vertical_jump and broad_jump are leaf-unit METERS (capabilityTree:
// unit "m"); med_ball_throw is meters. Norms below are converted to meters.
//
// Sources:
//   vertical jump: Topend Sports countermovement-jump rating table; research means
//                  (~age 26 men ~45cm, women ~30cm); ~3–5cm/decade decline after 30.
//   broad jump:    Topend Sports standing-long-jump norms (adult).
//   med-ball throw: Topend Sports seated/standing throw (protocol-dependent → thinner).

import type { Cohort, CohortDist, LeafId } from "../../types";
import { BLEND_K } from "../../constants";
import { interp, makeDistId, sexKey, firstPartyWeight } from "./_shared";

// Vertical jump mean in METERS by sex × age (Topend "average"/research mean).
const VJUMP_MEAN: Record<"male" | "female", { x: number; y: number }[]> = {
  male: [
    { x: 22, y: 0.52 },
    { x: 30, y: 0.48 },
    { x: 40, y: 0.43 },
    { x: 50, y: 0.38 },
    { x: 60, y: 0.32 },
  ],
  female: [
    { x: 22, y: 0.41 },
    { x: 30, y: 0.37 },
    { x: 40, y: 0.33 },
    { x: 50, y: 0.28 },
    { x: 60, y: 0.23 },
  ],
};

// Standing broad jump mean in METERS by sex × age.
const BJUMP_MEAN: Record<"male" | "female", { x: number; y: number }[]> = {
  male: [
    { x: 22, y: 2.1 },
    { x: 30, y: 2.0 },
    { x: 40, y: 1.85 },
    { x: 50, y: 1.65 },
    { x: 60, y: 1.45 },
  ],
  female: [
    { x: 22, y: 1.6 },
    { x: 30, y: 1.5 },
    { x: 40, y: 1.4 },
    { x: 50, y: 1.25 },
    { x: 60, y: 1.1 },
  ],
};

// Med-ball throw (seated chest pass, ~2-3kg) mean in METERS by sex × age.
const MBALL_MEAN: Record<"male" | "female", { x: number; y: number }[]> = {
  male: [
    { x: 22, y: 5.6 },
    { x: 35, y: 5.2 },
    { x: 50, y: 4.6 },
    { x: 65, y: 4.0 },
  ],
  female: [
    { x: 22, y: 4.2 },
    { x: 35, y: 3.9 },
    { x: 50, y: 3.4 },
    { x: 65, y: 2.9 },
  ],
};

export function powerCohortDist(leafId: LeafId, cohort: Cohort): CohortDist | null {
  const sk = sexKey(cohort.sex);
  const K = BLEND_K.power;
  const nObserved = 0;
  const fpw = firstPartyWeight(nObserved, K);
  const age = cohort.ageYears;
  const sexNote =
    cohort.sex === "unspecified" ? ["Sex unspecified → male-coded norms used as fallback."] : [];

  const base = {
    lowerIsBetter: false,
    curveProvenance: "seed_population" as const,
    K,
    nObserved,
    firstPartyWeight: fpw,
    distributionId: makeDistId(leafId, cohort),
  };

  if (leafId === "power.vertical_jump") {
    const mean = interp(age, VJUMP_MEAN[sk]);
    return {
      ...base,
      mean,
      sd: mean * 0.2,
      seedSources: ["MILITARY_FITNESS", "ACSM"],
      confidenceBasis: 0.7,
      dataSourceLabel: "Countermovement vertical-jump norms (Topend Sports) by sex and age.",
      assumptions: [
        "Bodyweight-relative power → §3.6.1 floor guard applies below the essential-fat floor.",
        "Mean = population average; 'excellent' (>0.70m men) sits ~+1.5SD.",
        ...sexNote,
      ],
    };
  }

  if (leafId === "power.broad_jump") {
    const mean = interp(age, BJUMP_MEAN[sk]);
    return {
      ...base,
      mean,
      sd: mean * 0.16,
      seedSources: ["MILITARY_FITNESS", "ACSM"],
      confidenceBasis: 0.68,
      dataSourceLabel: "Standing broad-jump norms (Topend Sports) by sex and age.",
      assumptions: [
        "Bodyweight-relative power → §3.6.1 floor guard applies below the essential-fat floor.",
        "Adult general-population norms; age-bracketed percentiles are thin → moderate confidence.",
        ...sexNote,
      ],
    };
  }

  if (leafId === "power.med_ball_throw") {
    const mean = interp(age, MBALL_MEAN[sk]);
    return {
      ...base,
      mean,
      sd: mean * 0.22,
      seedSources: ["ACSM"],
      confidenceBasis: 0.62, // protocol-dependent (ball mass, seated vs standing) → thinner
      dataSourceLabel: "Seated medicine-ball-throw distance (Topend Sports); protocol-dependent.",
      assumptions: [
        "Highly protocol-dependent (ball mass, seated vs standing) — modeled for a ~2–3kg seated chest pass.",
        "Thinner seed → lower confidence.",
        ...sexNote,
      ],
    };
  }

  return null;
}
