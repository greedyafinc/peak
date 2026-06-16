// Peak — aerobic distributions: 5K, 1-mile, VO2max, HR-recovery (§2.2).
//
// Running times are conditioned on sex + age (WMA age-grading concept, §2.2):
// lowerIsBetter=true. Each running curve is TIER-ANCHORED (§5.3): the Running Level
// "Intermediate" time is just one tier on a five-tier ladder, and the cohort curve is
// fit through all five tiers at their population percentiles — so the median is a typical
// recreational runner, not the trained-intermediate runner (which read far too fast and
// buried ordinary times near the 1st percentile). VO2max cohorts model cleanly as
// per-(sex,age) Gaussians from the ACSM/Cooper percentile table.
//
// Sources:
//   5K / mile: Running Level regression on large race datasets; RunRepeat cross-check.
//   VO2max:    ACSM Guidelines 11th ed. Table 4.7 / Cooper Institute ACLS (80k+ adults).
//   HR recovery: Cole et al. / Cleveland Clinic cutoffs; Empirical Health population.
//   WMA age-grading: World Masters Athletics tables.

import type { Cohort, CohortDist, LeafId } from "../../types";
import { BLEND_K } from "../../constants";
import { interp, makeDistId, sexKey, firstPartyWeight, fitGaussianTiers, TIER_PCTL } from "./_shared";

// Running capability tiers as ratios of the Intermediate finishing time (the base
// tables below): slower tiers are bigger ratios. The cohort curve is fit through these
// at TIER_PCTL so its median is the average recreational runner, not the trained
// intermediate (§5.3). Spread (~18% CV) widens the thin old tail.
const RUN_TIER_RATIO = [1.45, 1.18, 1.0, 0.88, 0.78]; // beginner..elite

/** Tier-anchored Gaussian (seconds) for a running event from its Intermediate-tier time. */
function runDist(intermediateSec: number): { mean: number; sd: number } {
  return fitGaussianTiers(RUN_TIER_RATIO.map((r) => intermediateSec * r), TIER_PCTL, true);
}

// ── 5K finishing time (seconds), intermediate-tier mean by sex × age ────────────
// Running Level "Intermediate" column.
const FIVEK_MEAN: Record<"male" | "female", { x: number; y: number }[]> = {
  male: [
    { x: 25, y: 1351 }, // ~22:31
    { x: 35, y: 1351 },
    { x: 45, y: 1423 }, // ~23:43
    { x: 55, y: 1536 }, // ~25:36
    { x: 65, y: 1700 },
  ],
  female: [
    { x: 25, y: 1567 }, // ~26:07
    { x: 35, y: 1567 },
    { x: 45, y: 1609 }, // ~26:49
    { x: 55, y: 1753 }, // ~29:13
    { x: 65, y: 1920 },
  ],
};

// ── 1-mile time (seconds), intermediate by sex × age ────────────────────────────
const MILE_MEAN: Record<"male" | "female", { x: number; y: number }[]> = {
  male: [
    { x: 25, y: 398 }, // 6:38
    { x: 35, y: 398 },
    { x: 45, y: 418 }, // 6:58
    { x: 55, y: 451 }, // 7:31
    { x: 65, y: 500 },
  ],
  female: [
    { x: 25, y: 464 }, // 7:44
    { x: 35, y: 464 },
    { x: 45, y: 477 }, // 7:57
    { x: 55, y: 520 }, // 8:40
    { x: 65, y: 575 },
  ],
};

// ── VO2max (ml/kg/min): mean (P50) and SD by sex × age (ACSM/Cooper) ───────────
const VO2_MEAN: Record<"male" | "female", { x: number; y: number }[]> = {
  male: [
    { x: 25, y: 48.0 },
    { x: 35, y: 42.4 },
    { x: 45, y: 37.8 },
    { x: 55, y: 32.6 },
    { x: 65, y: 28.0 },
  ],
  female: [
    { x: 25, y: 37.6 },
    { x: 35, y: 30.2 },
    { x: 45, y: 26.7 },
    { x: 55, y: 23.4 },
    { x: 65, y: 20.5 },
  ],
};
const VO2_SD: Record<"male" | "female", { x: number; y: number }[]> = {
  male: [
    { x: 25, y: 11.0 },
    { x: 35, y: 10.0 },
    { x: 45, y: 9.5 },
    { x: 55, y: 8.5 },
    { x: 65, y: 7.5 },
  ],
  female: [
    { x: 25, y: 10.0 },
    { x: 35, y: 8.0 },
    { x: 45, y: 7.5 },
    { x: 55, y: 5.7 },
    { x: 65, y: 5.0 },
  ],
};

// ── Longer road races: 10K / half / marathon (seconds) ──────────────────────────
// "Intermediate"-tier recreational finishing time at the 25–35 base, then age-scaled
// by the WMA-style curve (mirrors the 5K shape so the running ladder stays coherent).
const ROAD_EVENT_BASE: Record<"male" | "female", Record<string, number>> = {
  male: { "aerobic.10k": 2800, "aerobic.half_marathon": 6300, "aerobic.marathon": 13200 },
  female: { "aerobic.10k": 3250, "aerobic.half_marathon": 7320, "aerobic.marathon": 15300 },
};
// Age multiplier vs the 25–35 base (1.0), matching the 5K/mile age progression.
const ROAD_AGE_MULT: Record<"male" | "female", { x: number; y: number }[]> = {
  male: [{ x: 25, y: 1.0 }, { x: 35, y: 1.0 }, { x: 45, y: 1.053 }, { x: 55, y: 1.137 }, { x: 65, y: 1.258 }],
  female: [{ x: 25, y: 1.0 }, { x: 35, y: 1.0 }, { x: 45, y: 1.027 }, { x: 55, y: 1.119 }, { x: 65, y: 1.225 }],
};
const ROAD_META: Record<string, { basis: number; ceil: string }> = {
  "aerobic.10k": { basis: 0.85, ceil: "10K" },
  "aerobic.half_marathon": { basis: 0.82, ceil: "half marathon" },
  "aerobic.marathon": { basis: 0.8, ceil: "marathon" },
};

// ── Triathlon median finisher times (seconds) by sex × distance ─────────────────
const TRI_BASE: Record<"male" | "female", Record<string, number>> = {
  male: { "aerobic.tri_sprint": 5100, "aerobic.tri_olympic": 10200, "aerobic.tri_70_3": 21600, "aerobic.tri_ironman": 45000 },
  female: { "aerobic.tri_sprint": 5580, "aerobic.tri_olympic": 11280, "aerobic.tri_70_3": 23700, "aerobic.tri_ironman": 48600 },
};
const TRI_LABEL: Record<string, string> = {
  "aerobic.tri_sprint": "sprint-distance triathlon",
  "aerobic.tri_olympic": "Olympic-distance triathlon",
  "aerobic.tri_70_3": "half-Ironman (70.3)",
  "aerobic.tri_ironman": "Ironman (140.6)",
};

export function aerobicCohortDist(leafId: LeafId, cohort: Cohort): CohortDist | null {
  const sk = sexKey(cohort.sex);
  const K = BLEND_K.aerobic;
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

  if (leafId === "aerobic.5k") {
    const { mean, sd } = runDist(interp(age, FIVEK_MEAN[sk]));
    return {
      ...base,
      mean,
      sd,
      lowerIsBetter: true,
      seedSources: ["WMA_AGE_GRADED", "MILITARY_FITNESS"],
      confidenceBasis: 0.9,
      dataSourceLabel: "Age-graded 5K running norms (WMA-style), real race-result distributions.",
      assumptions: [
        "Running time conditioned on sex + age via WMA age-grading concept (§2.2).",
        "Curve fit through the five running tiers (beginner→elite) at population percentiles; median = typical recreational runner.",
        ...sexNote,
      ],
    };
  }

  if (leafId === "aerobic.mile") {
    const { mean, sd } = runDist(interp(age, MILE_MEAN[sk]));
    return {
      ...base,
      mean,
      sd,
      lowerIsBetter: true,
      seedSources: ["WMA_AGE_GRADED", "MILITARY_FITNESS"],
      confidenceBasis: 0.88,
      dataSourceLabel: "Age-graded 1-mile running norms (WMA-style), real race-result distributions.",
      assumptions: [
        "Running time conditioned on sex + age via WMA age-grading concept (§2.2).",
        "Curve fit through the five running tiers (beginner→elite) at population percentiles; median = typical recreational runner.",
        ...sexNote,
      ],
    };
  }

  if (leafId === "aerobic.vo2_proxy") {
    const mean = interp(age, VO2_MEAN[sk]);
    const sd = interp(age, VO2_SD[sk]);
    return {
      ...base,
      mean,
      sd,
      lowerIsBetter: false,
      seedSources: ["COOPER", "ACSM"],
      confidenceBasis: 0.85,
      dataSourceLabel: "VO₂max percentile norms (ml/kg/min), ACSM/Cooper Institute by sex and age.",
      assumptions: [
        "Per-(sex, age) Gaussian fit to the ACSM/Cooper VO₂max percentile table.",
        "Mass-relative metric (ml/kg/min); the §3.6.1 healthy-floor guard applies below the essential-fat floor.",
        ...sexNote,
      ],
    };
  }

  // Longer road races — same age-graded running family as 5K/mile.
  if (ROAD_EVENT_BASE[sk][leafId] != null) {
    const meta = ROAD_META[leafId];
    const { mean, sd } = runDist(ROAD_EVENT_BASE[sk][leafId] * interp(age, ROAD_AGE_MULT[sk]));
    return {
      ...base,
      mean,
      sd,
      lowerIsBetter: true,
      seedSources: ["RUNNING_LEVEL", "WMA_AGE_GRADED"],
      confidenceBasis: meta.basis,
      dataSourceLabel: `Age-graded ${meta.ceil} finishing-time norms — recreational race-result distributions (WMA-style age curve).`,
      assumptions: [
        `${meta.ceil} time conditioned on sex + age via the WMA age-grading concept (§2.2).`,
        "Curve fit through the five running tiers at population percentiles; median ≈ a typical age-group finisher.",
        ...sexNote,
      ],
    };
  }

  // Triathlon distances — thin, self-selected finisher fields → low-confidence seed.
  if (TRI_BASE[sk][leafId] != null) {
    const mean = TRI_BASE[sk][leafId] * interp(age, ROAD_AGE_MULT[sk]);
    return {
      ...base,
      mean,
      sd: mean * 0.17,
      lowerIsBetter: true,
      seedSources: ["TRIATHLON_NORMS"],
      confidenceBasis: 0.6,
      dataSourceLabel: `Median age-group finisher times for the ${TRI_LABEL[leafId]}, public results aggregates.`,
      assumptions: [
        "Multisport finishing time conditioned on sex + age; median age-group finisher anchor.",
        "Self-selected finisher population (not the general public) and wide spread → low-confidence seed.",
        "Course, conditions, and transitions vary widely; treated as a feat benchmark, not a precise capability.",
        ...sexNote,
      ],
    };
  }

  if (leafId === "aerobic.hr_recovery") {
    // 1-min HR-recovery drop (bpm). Active-adult mean ~25, declines ~1 bpm/decade past 40.
    const mean = age <= 40 ? 25 : Math.max(16, 25 - (age - 40) * 0.1);
    return {
      ...base,
      mean,
      sd: 9.5,
      lowerIsBetter: false,
      seedSources: ["ACSM", "COOPER"],
      confidenceBasis: 0.7,
      dataSourceLabel: "1-minute heart-rate-recovery norms; clinical cutoffs + active-population data.",
      assumptions: [
        "Gaussian ~N(25, 9.5) bpm for active adults; <12 bpm ≈ abnormal, >30 bpm ≈ athletic.",
        "Mean shifts down ~1 bpm/decade past age 40.",
        ...sexNote,
      ],
    };
  }

  return null;
}
