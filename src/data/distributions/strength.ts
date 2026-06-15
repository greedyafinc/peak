// Peak — height-conditioned strength distributions via the BRIDGE MODEL (§5.3).
//
// ── The bridge, in one paragraph ────────────────────────────────────────────
// Published strength standards (Symmetric Strength / ExRx / StrengthLevel) condition
// on SEX + BODYWEIGHT. Peak conditions on SEX + HEIGHT + AGE (bodyweight is excluded,
// §3.2). The bridge re-expresses a bodyweight-conditioned standard as a
// height-conditioned one:
//   (a) for a target (sex, height) cohort, draw the representative bodyweight at that
//       height from NHANES anthropometrics — `representativeBodyweightKg` (§5.4);
//   (b) read the bodyweight-conditioned standard at that bodyweight to get the
//       expected ("intermediate" / population-median) 1RM there;
//   (c) the SPREAD at that height comes from allometric scaling: strength ∝ mass^(2/3),
//       so a ±1SD swing in bodyweight-at-height maps to a (bw±sd / bw)^(2/3) swing in
//       expected strength, combined with the intrinsic spread of the standard's tiers;
//   (d) apply an age-decline multiplier (~0.7%/yr after 34, steeper past 60).
// The bridge is an INFERENCE and the lowest-confidence seed tier: every percentile it
// produces is tagged seed-population / blended, low confidence, with the allometric
// b=2/3 assumption documented (§5.6). The METHOD is specified; the fitted constants
// (the standard multiples, b, the integration) are what first-party data refines (OQ-9).
//
// ── Source standards (bodyweight multiples) ─────────────────────────────────
// StrengthLevel (22M+ logged lifts) computed at a representative bodyweight, expressed
// as ×BW, cross-checked against ExRx rule-of-thumb ratios. Tier order:
//   beginner / novice / intermediate / advanced / elite.
// MALE @ ~90kg, ages ~20–39:
//   bench   0.69 / 0.93 / 1.23 / 1.57 / 1.91
//   squat   0.92 / 1.24 / 1.62 / 2.04 / 2.50
//   deadlift 1.10 / 1.46 / 1.87 / 2.34 / 2.84
//   ohp     0.43 / 0.60 / 0.80 / 1.03 / 1.29
// FEMALE @ ~60kg:
//   bench   0.28 / 0.48 / 0.78 / 1.13 / 1.53
//   squat   0.48 / 0.78 / 1.17 / 1.62 / 2.13
//   deadlift 0.62 / 0.95 / 1.38 / 1.88 / 2.43
//   ohp     0.20 / 0.35 / 0.53 / 0.75 / 1.00
// Sources: StrengthLevel strength-standards; ExRx Weightlifting Standards (cross-check);
// NIH/Harvard Health (age decline). See seedSources.ts SYMMETRIC_STRENGTH / EXRX.

import type { Cohort, CohortDist, LeafId, MuscleGroup } from "../../types";
import { BLEND_K } from "../../constants";
import { representativeBodyweightKg, bodyweightSdKg } from "./nhanesAnthro";
import { makeDistId, sexKey, strengthAgeFactor, firstPartyWeight } from "./_shared";

const ALLOMETRIC_B = 2 / 3; // §5.3 — strength ∝ mass^(2/3)

type LiftId = "bench" | "squat" | "deadlift" | "ohp";

// Bodyweight-multiple tiers [beginner, novice, intermediate, advanced, elite].
const STANDARDS: Record<"male" | "female", Record<LiftId, number[]>> = {
  male: {
    bench: [0.69, 0.93, 1.23, 1.57, 1.91],
    squat: [0.92, 1.24, 1.62, 2.04, 2.5],
    deadlift: [1.1, 1.46, 1.87, 2.34, 2.84],
    ohp: [0.43, 0.6, 0.8, 1.03, 1.29],
  },
  female: {
    bench: [0.28, 0.48, 0.78, 1.13, 1.53],
    squat: [0.48, 0.78, 1.17, 1.62, 2.13],
    deadlift: [0.62, 0.95, 1.38, 1.88, 2.43],
    ohp: [0.2, 0.35, 0.53, 0.75, 1.0],
  },
};

// Bodyweight at which each STANDARDS table was tabulated (the "reference" lifter).
const STANDARD_BW: Record<"male" | "female", number> = { male: 90, female: 60 };

const LEAF_TO_LIFT: Record<string, LiftId> = {
  "strength.bench_1rm": "bench",
  "strength.squat_1rm": "squat",
  "strength.deadlift_1rm": "deadlift",
  "strength.ohp_1rm": "ohp",
};

/**
 * Per-muscle inferred-strength leaves (§4.3). The inference engine attributes
 * `est1RM × exerciseMuscleWeight[g]` to a muscle (the muscle's share of the load it
 * helped move). To percentile that ATTRIBUTED quantity correctly, the cohort
 * distribution must be on the SAME attributed scale: mean/sd = (proxy compound's
 * cohort mean/sd) × `frac`, where `frac` is the muscle's representative muscleWeight
 * in that compound. Because both the user's value and the distribution mean carry the
 * same `frac`, it cancels in the z-score — so a muscle trained by its primary compound
 * percentiles to roughly that compound's percentile (the correct, coherent result).
 * `frac` here is kept aligned with the compound lifts' muscleWeights in src/data/exercises.ts
 * (bench: chest .5 / front_delt .25 / triceps .25; squat: quads .45 / glutes .30 …).
 */
const MUSCLE_PROXY: Record<MuscleGroup, { lift: LiftId; frac: number }> = {
  // Push chain — bench / OHP
  chest: { lift: "bench", frac: 0.5 },
  front_delt: { lift: "ohp", frac: 0.45 },
  side_delt: { lift: "ohp", frac: 0.22 },
  triceps: { lift: "bench", frac: 0.28 },
  // Pull chain — bench-class horizontal pull / deadlift grip & posterior
  lat: { lift: "bench", frac: 0.5 },
  rear_delt: { lift: "ohp", frac: 0.15 },
  biceps: { lift: "bench", frac: 0.3 },
  forearms: { lift: "deadlift", frac: 0.12 },
  trap: { lift: "deadlift", frac: 0.12 },
  // Legs — squat / deadlift
  quads: { lift: "squat", frac: 0.45 },
  glutes: { lift: "squat", frac: 0.32 },
  hamstrings: { lift: "deadlift", frac: 0.27 },
  calves: { lift: "squat", frac: 0.25 },
  tibialis: { lift: "squat", frac: 0.06 },
  // Core — squat/deadlift bracing
  abs: { lift: "squat", frac: 0.06 },
  obliques: { lift: "squat", frac: 0.06 },
  lower_back: { lift: "deadlift", frac: 0.22 },
};

/**
 * Expected (intermediate-tier) 1RM in kg for a benchmark lift at a target cohort,
 * via the bridge. Also returns the cohort SD in kg.
 */
function bridgeLift(lift: LiftId, cohort: Cohort): { mean: number; sd: number } {
  const sk = sexKey(cohort.sex);
  const tiers = STANDARDS[sk][lift];
  const refBw = STANDARD_BW[sk];

  // (a) representative bodyweight at this height (NHANES anthro).
  const bw = representativeBodyweightKg(cohort.sex, cohort.heightCm);

  // (b) intermediate-tier 1RM at the REFERENCE bodyweight, then re-expressed to this
  //     cohort's bodyweight via allometric scaling. The ×BW multiple is itself defined
  //     at refBw; absolute load scales ~mass^(2/3), so:
  //        load(bw) = multiple_at_refBw × refBw × (bw / refBw)^b
  const intermediateMultiple = tiers[2];
  const meanRef = intermediateMultiple * refBw;
  let mean = meanRef * Math.pow(bw / refBw, ALLOMETRIC_B);

  // (d) age decline.
  mean *= strengthAgeFactor(cohort.ageYears);

  // (c) spread: combine (i) the intrinsic tier spread of the standard — distance from
  //     intermediate to elite is roughly +2SD of the trained-lifter population — with
  //     (ii) the allometric spread from bodyweight variation at this height.
  const eliteMultiple = tiers[4];
  const noviceMultiple = tiers[1];
  // half the novice→elite multiple range ≈ ~2SD; so 1SD ≈ (elite-novice)/4 of refBw, scaled.
  const tierSdRef = ((eliteMultiple - noviceMultiple) / 4) * refBw;
  let tierSd = tierSdRef * Math.pow(bw / refBw, ALLOMETRIC_B) * strengthAgeFactor(cohort.ageYears);

  // allometric bodyweight spread: how much expected strength moves for ±1SD of bw.
  const bwSd = bodyweightSdKg(cohort.sex, cohort.heightCm);
  const meanPlus = meanRef * Math.pow((bw + bwSd) / refBw, ALLOMETRIC_B) * strengthAgeFactor(cohort.ageYears);
  const allometricSd = Math.abs(meanPlus - mean);

  // combine independent spread sources in quadrature.
  const sd = Math.sqrt(tierSd * tierSd + allometricSd * allometricSd);
  return { mean, sd: Math.max(sd, mean * 0.12) };
}

const ASSUMPTIONS = (cohort: Cohort): string[] => {
  const a = [
    "Height-conditioned via the bridge model (§5.3): bodyweight-conditioned strength " +
      "standards re-expressed to a height cohort using NHANES anthropometric weight-at-height.",
    `Allometric scaling exponent b=${ALLOMETRIC_B.toFixed(3)} (strength ∝ mass^(2/3)).`,
    "Source standards are bodyweight-based (StrengthLevel / ExRx) and are used ONLY through " +
      "the bridge — never directly as the normalizer (Decision #5).",
    "Lowest-confidence seed tier; sharpens as first-party height-conditioned data accrues (small K).",
  ];
  if (cohort.sex === "unspecified")
    a.push("Sex unspecified → male-coded strength norms used as a conservative fallback.");
  return a;
};

/** Cohort distribution for a benchmark lift OR an inferred per-muscle leaf. Returns
 *  null for non-strength leaves. */
export function strengthCohortDist(leafId: LeafId, cohort: Cohort): CohortDist | null {
  const K = BLEND_K.strength;
  const nObserved = 0; // launch: pure seed
  const fpw = firstPartyWeight(nObserved, K);

  // Benchmark lift?
  const lift = LEAF_TO_LIFT[leafId];
  if (lift) {
    const { mean, sd } = bridgeLift(lift, cohort);
    return {
      mean,
      sd,
      lowerIsBetter: false,
      seedSources: ["SYMMETRIC_STRENGTH", "EXRX", "NHANES_ANTHRO", "MILITARY_FITNESS"],
      curveProvenance: "seed_population",
      confidenceBasis: 0.55, // bridge: 0.45–0.6 band
      distributionId: makeDistId(leafId, cohort),
      K,
      nObserved,
      firstPartyWeight: fpw,
      dataSourceLabel:
        "Population strength standards (StrengthLevel/ExRx) adjusted for your height via the " +
        "bridge model — not yet from Peak's own users.",
      assumptions: ASSUMPTIONS(cohort),
    };
  }

  // Inferred per-muscle leaf? id is `strength.<muscle>`.
  if (leafId.startsWith("strength.")) {
    const mg = leafId.slice("strength.".length) as MuscleGroup;
    const proxy = MUSCLE_PROXY[mg];
    if (proxy) {
      const base = bridgeLift(proxy.lift, cohort);
      const mean = base.mean * proxy.frac;
      const sd = base.sd * proxy.frac;
      return {
        mean,
        sd: Math.max(sd, mean * 0.14),
        lowerIsBetter: false,
        seedSources: ["SYMMETRIC_STRENGTH", "EXRX", "NHANES_ANTHRO"],
        curveProvenance: "seed_population",
        confidenceBasis: 0.45, // inferred muscle est-1RM: bottom of the bridge band
        distributionId: makeDistId(leafId, cohort),
        K,
        nObserved,
        firstPartyWeight: fpw,
        dataSourceLabel:
          `Inferred ${mg.replace("_", " ")} strength, estimated from population ${proxy.lift} ` +
          "standards adjusted for your height (bridge model) — not yet from Peak's own users.",
        assumptions: [
          ...ASSUMPTIONS(cohort),
          `Per-muscle est-1RM modeled as ${proxy.frac.toFixed(2)}× the cohort-mean ${proxy.lift} ` +
            "1RM (documented attribution ratio, §4.3).",
        ],
      };
    }
  }

  return null;
}
