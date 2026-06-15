// Peak — anaerobic distributions: 400m sprint, repeat-sprint, 60s max effort (§2.2).
// Conditioned on sex + age. 400m & repeat-sprint are TIME-based (lowerIsBetter=true);
// 60s max effort is a DISTANCE in meters (higher is better).
//
// Sources:
//   400m:  Fitness Volt / Marathon Handbook age tables; peak ~age 20–30, ~3–6%/decade after.
//   RSA:   NSCA / PMC reviews — repeat-sprint ability; modeled as a mean-sprint-time proxy.
//   60s:   Rowing Level 60-second erg distance (men ~327m, women ~261m avg, excellent ~426m);
//          consistent with running 60s ~330m for a trained adult.

import type { Cohort, CohortDist, LeafId } from "../../types";
import { BLEND_K } from "../../constants";
import { interp, makeDistId, sexKey, firstPartyWeight } from "./_shared";

// 400m sprint time (seconds), intermediate/trained mean by sex × age.
const SPRINT400_MEAN: Record<"male" | "female", { x: number; y: number }[]> = {
  male: [
    { x: 22, y: 78 },
    { x: 30, y: 80 },
    { x: 40, y: 86 },
    { x: 50, y: 94 },
    { x: 60, y: 104 },
  ],
  female: [
    { x: 22, y: 88 },
    { x: 30, y: 90 },
    { x: 40, y: 97 },
    { x: 50, y: 106 },
    { x: 60, y: 117 },
  ],
};

// Repeat-sprint ability: mean time per rep (seconds) over a set of short maximal sprints
// with short recovery. Modeled as a per-rep mean ~ a short-sprint time degraded by fatigue.
const RSA_MEAN: Record<"male" | "female", { x: number; y: number }[]> = {
  male: [
    { x: 22, y: 6.8 }, // ~40m sprint mean time across reps
    { x: 35, y: 7.2 },
    { x: 50, y: 8.0 },
    { x: 65, y: 9.0 },
  ],
  female: [
    { x: 22, y: 7.6 },
    { x: 35, y: 8.0 },
    { x: 50, y: 8.9 },
    { x: 65, y: 10.0 },
  ],
};

// 60-second max-effort distance (meters) by sex × age (erg/run-equivalent).
const MAX60_MEAN: Record<"male" | "female", { x: number; y: number }[]> = {
  male: [
    { x: 22, y: 330 },
    { x: 35, y: 320 },
    { x: 50, y: 295 },
    { x: 65, y: 265 },
  ],
  female: [
    { x: 22, y: 265 },
    { x: 35, y: 258 },
    { x: 50, y: 238 },
    { x: 65, y: 215 },
  ],
};

export function anaerobicCohortDist(leafId: LeafId, cohort: Cohort): CohortDist | null {
  const sk = sexKey(cohort.sex);
  const K = BLEND_K.anaerobic;
  const nObserved = 0;
  const fpw = firstPartyWeight(nObserved, K);
  const age = cohort.ageYears;
  const sexNote =
    cohort.sex === "unspecified" ? ["Sex unspecified → male-coded norms used as fallback."] : [];

  const base = {
    curveProvenance: "seed_population" as const,
    K,
    nObserved,
    firstPartyWeight: fpw,
    distributionId: makeDistId(leafId, cohort),
  };

  if (leafId === "anaerobic.400m") {
    const mean = interp(age, SPRINT400_MEAN[sk]);
    return {
      ...base,
      mean,
      sd: mean * 0.16,
      lowerIsBetter: true,
      seedSources: ["MILITARY_FITNESS", "ACSM"],
      confidenceBasis: 0.68,
      dataSourceLabel: "400m sprint-time norms by sex and age (Fitness Volt / Marathon Handbook).",
      assumptions: [
        "Time-based (lower is better); mass-relative → §3.6.1 floor guard applies.",
        "Peak ~age 20–30; ~3–6% slower per decade after.",
        ...sexNote,
      ],
    };
  }

  if (leafId === "anaerobic.sprint_repeats") {
    const mean = interp(age, RSA_MEAN[sk]);
    return {
      ...base,
      mean,
      sd: mean * 0.14,
      lowerIsBetter: true,
      seedSources: ["MILITARY_FITNESS"],
      confidenceBasis: 0.6,
      dataSourceLabel: "Repeat-sprint-ability mean per-rep time (NSCA/PMC reviews); sparse seed.",
      assumptions: [
        "Modeled as mean per-rep sprint time across a repeat-sprint set (lower is better).",
        "Sparse seed → lower confidence; mass-relative → §3.6.1 floor guard applies.",
        ...sexNote,
      ],
    };
  }

  if (leafId === "anaerobic.max_effort_60s") {
    const mean = interp(age, MAX60_MEAN[sk]);
    return {
      ...base,
      mean,
      sd: mean * 0.18,
      lowerIsBetter: false, // distance — more is better
      seedSources: ["MILITARY_FITNESS"],
      confidenceBasis: 0.6,
      dataSourceLabel: "60-second max-effort distance (rowing-erg / run-equivalent), Rowing Level.",
      assumptions: [
        "Distance covered in a 60s all-out effort (higher is better).",
        "Erg-anchored (men ~327m, women ~261m avg, excellent ~426m); run-equivalent comparable.",
        ...sexNote,
      ],
    };
  }

  return null;
}
