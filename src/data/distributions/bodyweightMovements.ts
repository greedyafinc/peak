// Peak — muscular-endurance distributions: max push-ups, pull-ups, plank hold,
// bodyweight squats (§2.2). Conditioned on sex + age. Higher is better (holds in
// seconds, reps for the rest). Mass-relative leaves carry the §3.6.1 floor guard
// downstream (handled by the engine, not here).
//
// Sources:
//   push-ups: ACSM one-max-set norms (men full / women per classic protocol); US Army
//             AFT hand-release push-up right-tail anchor.
//   pull-ups: USMC PFT scoring + general-population averages (FitnessVolt/InspireUS).
//   plank:    US Army ACFT/AFT plank standards (sex-neutral, age-banded) + general refs.
//   bw squats: NO authoritative norm table exists → estimated (flagged in assumptions).

import type { Cohort, CohortDist, LeafId } from "../../types";
import { BLEND_K } from "../../constants";
import { interp, makeDistId, sexKey, firstPartyWeight } from "./_shared";

// Max push-ups (single max set) — mean by sex × age (ACSM "average" midpoint).
const PUSHUP_MEAN: Record<"male" | "female", { x: number; y: number }[]> = {
  male: [
    { x: 22, y: 24 },
    { x: 30, y: 19 },
    { x: 40, y: 14 },
    { x: 50, y: 11 },
    { x: 60, y: 9 },
  ],
  female: [
    { x: 22, y: 16 },
    { x: 30, y: 14 },
    { x: 40, y: 12 },
    { x: 50, y: 9 },
    { x: 60, y: 6 },
  ],
};

// Max pull-ups (single max set) — mean by sex × age.
const PULLUP_MEAN: Record<"male" | "female", { x: number; y: number }[]> = {
  male: [
    { x: 22, y: 6 },
    { x: 30, y: 5 },
    { x: 40, y: 4 },
    { x: 50, y: 3 },
    { x: 60, y: 2 },
  ],
  female: [
    { x: 22, y: 1.5 },
    { x: 30, y: 1.2 },
    { x: 40, y: 1.0 },
    { x: 50, y: 0.6 },
    { x: 60, y: 0.4 },
  ],
};

// Plank hold (seconds) — sex-neutral, age-banded (ACFT/AFT-anchored general reference).
const PLANK_MEAN: { x: number; y: number }[] = [
  { x: 22, y: 95 },
  { x: 30, y: 85 },
  { x: 40, y: 75 },
  { x: 50, y: 65 },
  { x: 60, y: 55 },
];

// Bodyweight squats (continuous set) — ESTIMATED; no authoritative norms.
const BW_SQUAT_MEAN: Record<"male" | "female", { x: number; y: number }[]> = {
  male: [
    { x: 22, y: 45 },
    { x: 35, y: 40 },
    { x: 50, y: 32 },
    { x: 65, y: 25 },
  ],
  female: [
    { x: 22, y: 38 },
    { x: 35, y: 34 },
    { x: 50, y: 27 },
    { x: 65, y: 21 },
  ],
};

export function muscularEnduranceCohortDist(leafId: LeafId, cohort: Cohort): CohortDist | null {
  const sk = sexKey(cohort.sex);
  const K = BLEND_K.muscular_endurance;
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

  if (leafId === "muscular_endurance.pushups_max") {
    const mean = interp(age, PUSHUP_MEAN[sk]);
    return {
      ...base,
      mean,
      sd: Math.max(6, mean * 0.55), // wide: average→excellent is a large rep span
      seedSources: ["ACSM", "MILITARY_FITNESS"],
      confidenceBasis: 0.8,
      dataSourceLabel: "Max push-up norms (single set), ACSM by sex/age + military right-tail anchor.",
      assumptions: [
        "Mass-relative bodyweight movement; §3.6.1 floor guard applies below the essential-fat floor.",
        "ACSM 'average' as the mean; 'excellent' ≈ +1.5SD.",
        ...sexNote,
      ],
    };
  }

  if (leafId === "muscular_endurance.pullups_max") {
    const mean = interp(age, PULLUP_MEAN[sk]);
    return {
      ...base,
      mean,
      sd: Math.max(2.5, mean * 0.9), // very wide for women (floor at 0)
      seedSources: ["MILITARY_FITNESS", "ACSM"],
      confidenceBasis: 0.78,
      dataSourceLabel: "Max pull-up norms, USMC PFT scoring + general-population averages by sex/age.",
      assumptions: [
        "Mass-relative; §3.6.1 floor guard applies below the essential-fat floor.",
        "Distribution is floored at 0 reps and right-skewed (many sedentary adults = 0).",
        ...sexNote,
      ],
    };
  }

  if (leafId === "muscular_endurance.plank") {
    const mean = interp(age, PLANK_MEAN);
    return {
      ...base,
      mean,
      sd: 45, // average ~60–95s, excellent 200s+ → wide
      seedSources: ["MILITARY_FITNESS", "ACSM"],
      confidenceBasis: 0.72,
      dataSourceLabel: "Plank-hold norms (seconds), US Army ACFT/AFT age-banded standards.",
      assumptions: [
        "Sex-neutral, age-banded (the Army plank standard is not sex-split).",
        "Mean ≈ general-adult hold; excellent (200s+) sits in the right tail.",
        ...sexNote,
      ],
    };
  }

  if (leafId === "muscular_endurance.squats_bw") {
    const mean = interp(age, BW_SQUAT_MEAN[sk]);
    return {
      ...base,
      mean,
      sd: Math.max(10, mean * 0.5),
      seedSources: ["ACSM"],
      confidenceBasis: 0.6, // ESTIMATED — no authoritative norm; lower confidence
      dataSourceLabel: "Bodyweight-squat endurance — estimated reference (no authoritative norm table).",
      assumptions: [
        "ESTIMATED: no published bodyweight air-squat norm table exists; values are a reasoned estimate.",
        "Mass-relative; §3.6.1 floor guard applies below the essential-fat floor.",
        ...sexNote,
      ],
    };
  }

  return null;
}
