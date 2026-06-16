// Peak — strength distributions via PER-MOVEMENT REFERENCE LADDERS (§5.3, rebuilt).
//
// ── Why this replaced the old proxy model ────────────────────────────────────
// The previous scheme percentiled every muscle against ONE of the four compound lifts
// scaled by a fixed `frac` (chest = bench×0.5, calves = squat×0.25 …). The cancellation
// that made `frac` disappear in the z-score only holds when the LOGGED exercise loads the
// muscle with exactly that `frac` — true for bench→chest, FALSE for every isolation lift.
// A seated-calf-raise (muscleWeight 1.0) scored against a squat×0.25 mean read the 99.9th
// percentile; curls/lateral-raises read ~98th. The fix is structural: compare like with
// like. Each muscle has a REFERENCE MOVEMENT with its own published ×bodyweight standard,
// and a logged lift is percentiled against the standard for its OWN movement.
//
// ── The model ────────────────────────────────────────────────────────────────
// A StrengthReference is a movement (bench, row, curl, calf-raise…) with:
//   • five ×bodyweight tier loads (beginner→elite), per sex — StrengthLevel/ExRx;
//   • the GENERAL-POPULATION percentile each tier occupies (NOT the percentile among
//     logging lifters — StrengthLevel "Intermediate" is the median of a trained, self-
//     selected subset, ≈ the 90th+ of all adults; only ~35% of US men even strength-train).
//     This is the §5.3 fix for the old curve that put a trained-intermediate lift at the
//     70th and read ordinary lifts far too high.
// referenceDist() places those tier loads at a representative bodyweight for the user's
// HEIGHT (NHANES anthro, §5.4), least-squares-fits a Gaussian through them at their
// general-population percentiles, rescales allometrically (strength ∝ mass^(2/3)) to the
// cohort bodyweight, and applies the age-decline multiplier. Each per-muscle leaf and each
// benchmark lift is just the dist of its reference movement; the inference engine
// (§4.3) percentiles a logged lift's est-1RM against the reference its exercise maps to.
// Every percentile is tagged seed-population / low-confidence and sharpens with first-party
// data (BLEND_K / OQ-9).
//
// Sources: StrengthLevel strength-standards (per-movement ×BW ladders, tens of millions of
// logged lifts), ExRx Weightlifting Standards (cross-check), CDC/NHIS muscle-strengthening
// prevalence (general-population re-anchoring), NHANES anthropometrics, NIH/Harvard (age).

import type { Cohort, CohortDist, LeafId, MuscleGroup, Sex } from "../../types";
import { BLEND_K } from "../../constants";
import { representativeBodyweightKg, bodyweightSdKg } from "./nhanesAnthro";
import { makeDistId, sexKey, strengthAgeFactor, firstPartyWeight, fitGaussianTiersLog1p } from "./_shared";

const ALLOMETRIC_B = 2 / 3; // §5.3 — strength ∝ mass^(2/3)

// Reference bodyweight the ×BW tier loads are read at (NHANES representative weight of an
// average-height adult of each sex), so the allometric rescale to a typical user is ~identity.
const STANDARD_BW: Record<"male" | "female", number> = { male: 77, female: 61 };

export type StrengthReferenceId =
  | "barbell-bench-press" | "barbell-overhead-press" | "lateral-raise" | "reverse-fly"
  | "triceps-pushdown" | "barbell-row" | "barbell-shrug" | "barbell-curl" | "wrist-curl"
  | "barbell-back-squat" | "romanian-deadlift" | "hip-thrust" | "barbell-deadlift"
  | "calf-raise" | "cable-crunch" | "cable-woodchop" | "tibialis-raise";

type StrengthReference = {
  primaryMuscle: MuscleGroup;
  male: number[];   // [beginner,novice,intermediate,advanced,elite] as ×bodyweight, BOTH-HANDS / barbell-equivalent scale
  female: number[];
  genPctl: number[]; // general-population percentile each tier occupies (NOT among lifters)
  confidence: number; // confidenceBasis for the seed
  exercises: string[]; // catalog exercise ids scored against this reference (effectiveLoadKg scale)
};

// ── The reference ladders (researched; population-anchored) ──────────────────
// NOTE on scale: loads are on the effectiveLoadKg scale (both-hands total / barbell-
// equivalent), matching what the inference engine feeds in. lateral-raise & reverse-fly
// standards are published PER DUMBBELL, so their multiples are DOUBLED here to the
// both-hands total that effectiveLoadKg produces for per-arm dumbbell entries.
const REFERENCES: Record<StrengthReferenceId, StrengthReference> = {
  "barbell-bench-press": {
    primaryMuscle: "chest", male: [0.5, 0.75, 1.25, 1.75, 2.0], female: [0.25, 0.5, 0.75, 1.0, 1.5],
    genPctl: [0.22, 0.4, 0.92, 0.985, 0.997], confidence: 0.6,
    exercises: ["barbell-bench-press", "dumbbell-bench-press", "incline-bench-press", "machine-chest-press", "decline-bench-press", "incline-dumbbell-press", "incline-machine-press", "smith-bench-press", "floor-press", "dip", "cable-fly", "dumbbell-fly", "pec-deck", "low-to-high-cable-fly", "high-to-low-cable-fly", "incline-cable-fly", "svend-press", "dumbbell-pullover"],
  },
  "barbell-overhead-press": {
    primaryMuscle: "front_delt", male: [0.35, 0.55, 0.8, 1.1, 1.4], female: [0.2, 0.35, 0.5, 0.75, 1.0],
    genPctl: [0.25, 0.45, 0.9, 0.985, 0.997], confidence: 0.6,
    exercises: ["barbell-overhead-press", "dumbbell-shoulder-press", "arnold-press", "push-press", "machine-shoulder-press", "landmine-press", "bradford-press", "z-press", "dumbbell-front-raise", "cable-front-raise"],
  },
  "lateral-raise": {
    primaryMuscle: "side_delt", male: [0.1, 0.2, 0.4, 0.6, 0.9], female: [0.1, 0.2, 0.3, 0.4, 0.6],
    genPctl: [0.55, 0.72, 0.93, 0.985, 0.997], confidence: 0.45,
    exercises: ["lateral-raise", "cable-lateral-raise", "machine-lateral-raise", "leaning-cable-lateral-raise"],
  },
  "reverse-fly": {
    primaryMuscle: "rear_delt", male: [0.1, 0.2, 0.5, 0.8, 1.2], female: [0.1, 0.2, 0.3, 0.5, 0.8],
    genPctl: [0.55, 0.72, 0.93, 0.985, 0.997], confidence: 0.45,
    exercises: ["reverse-pec-deck", "bent-over-rear-delt-fly", "cable-rear-delt-fly", "face-pull"],
  },
  "triceps-pushdown": {
    primaryMuscle: "triceps", male: [0.2, 0.4, 0.65, 0.95, 1.4], female: [0.1, 0.2, 0.4, 0.65, 0.95],
    genPctl: [0.4, 0.6, 0.9, 0.985, 0.997], confidence: 0.5,
    exercises: ["triceps-pushdown", "rope-pushdown", "skullcrusher", "ez-bar-skullcrusher", "dumbbell-skullcrusher", "close-grip-bench", "jm-press", "tate-press", "overhead-triceps-extension", "single-arm-overhead-cable-extension", "machine-triceps-extension", "triceps-kickback", "bench-dip"],
  },
  "barbell-row": {
    primaryMuscle: "lat", male: [0.5, 0.75, 1.0, 1.5, 1.75], female: [0.25, 0.4, 0.65, 0.9, 1.2],
    genPctl: [0.55, 0.74, 0.91, 0.985, 0.997], confidence: 0.6,
    exercises: ["barbell-row", "dumbbell-row", "seated-cable-row", "lat-pulldown", "pendlay-row", "t-bar-row", "chest-supported-row", "meadows-row", "seal-row", "machine-row", "kroc-row", "renegade-row", "wide-grip-pulldown", "close-grip-pulldown", "neutral-grip-pulldown", "single-arm-lat-pulldown", "straight-arm-pulldown", "chinup", "pullup"],
  },
  "barbell-shrug": {
    primaryMuscle: "trap", male: [0.5, 1.0, 1.5, 2.25, 3.25], female: [0.25, 0.5, 1.0, 1.5, 2.25],
    genPctl: [0.55, 0.74, 0.91, 0.985, 0.997], confidence: 0.45,
    exercises: ["barbell-shrug", "dumbbell-shrug", "rack-pull", "prone-y-raise", "upright-row"],
  },
  "barbell-curl": {
    primaryMuscle: "biceps", male: [0.2, 0.4, 0.6, 0.85, 1.15], female: [0.1, 0.2, 0.4, 0.6, 0.85],
    genPctl: [0.56, 0.75, 0.92, 0.985, 0.997], confidence: 0.55,
    exercises: ["barbell-curl", "dumbbell-curl", "hammer-curl", "preacher-curl", "incline-dumbbell-curl", "concentration-curl", "reverse-curl", "cable-curl", "spider-curl", "ez-bar-curl", "drag-curl", "zottman-curl", "cable-hammer-curl", "machine-preacher-curl", "bayesian-cable-curl", "cross-body-hammer-curl"],
  },
  "wrist-curl": {
    primaryMuscle: "forearms", male: [0.15, 0.35, 0.75, 1.25, 2.0], female: [0.1, 0.25, 0.5, 1.0, 1.75],
    genPctl: [0.55, 0.74, 0.91, 0.985, 0.997], confidence: 0.4,
    exercises: ["wrist-curl", "reverse-wrist-curl", "behind-the-back-wrist-curl", "wrist-roller", "plate-pinch-hold", "farmer-carry", "suitcase-carry", "dead-hang"],
  },
  "barbell-back-squat": {
    primaryMuscle: "quads", male: [0.75, 1.25, 1.5, 2.25, 2.75], female: [0.5, 0.75, 1.25, 1.5, 2.0],
    genPctl: [0.55, 0.78, 0.92, 0.985, 0.998], confidence: 0.6,
    exercises: ["barbell-back-squat", "barbell-front-squat", "leg-press", "goblet-squat", "leg-extension", "hack-squat", "smith-squat", "box-step-up", "belt-squat", "zercher-squat", "pendulum-squat", "single-leg-press", "walking-lunge", "bulgarian-split-squat", "reverse-lunge", "lateral-lunge", "curtsy-lunge", "sissy-squat", "pistol-squat", "cossack-squat"],
  },
  "romanian-deadlift": {
    primaryMuscle: "hamstrings", male: [0.75, 1.0, 1.5, 2.0, 2.75], female: [0.5, 0.75, 1.0, 1.5, 1.75],
    genPctl: [0.55, 0.78, 0.92, 0.985, 0.998], confidence: 0.55,
    exercises: ["romanian-deadlift", "leg-curl", "seated-leg-curl", "standing-leg-curl", "stiff-leg-deadlift", "single-leg-romanian-deadlift", "good-morning", "nordic-curl", "glute-ham-raise"],
  },
  "hip-thrust": {
    primaryMuscle: "glutes", male: [0.5, 1.0, 1.75, 2.5, 3.5], female: [0.5, 1.0, 1.5, 2.25, 3.0],
    genPctl: [0.5, 0.75, 0.9, 0.98, 0.997], confidence: 0.5,
    exercises: ["hip-thrust", "glute-bridge", "single-leg-hip-thrust", "cable-pull-through", "cable-glute-kickback", "glute-kickback-machine", "hip-abduction-machine", "frog-pump", "banded-lateral-walk"],
  },
  "barbell-deadlift": {
    primaryMuscle: "lower_back", male: [1.0, 1.5, 2.0, 2.5, 3.0], female: [0.5, 1.0, 1.25, 1.75, 2.5],
    genPctl: [0.55, 0.8, 0.93, 0.99, 0.999], confidence: 0.6,
    exercises: ["barbell-deadlift", "sumo-deadlift", "trap-bar-deadlift", "back-extension"],
  },
  "calf-raise": {
    primaryMuscle: "calves", male: [0.5, 1.0, 1.75, 2.75, 4.0], female: [0.25, 0.75, 1.25, 2.25, 3.25],
    genPctl: [0.5, 0.74, 0.9, 0.98, 0.997], confidence: 0.45,
    exercises: ["calf-raise", "seated-calf-raise", "donkey-calf-raise", "leg-press-calf-raise", "single-leg-calf-raise"],
  },
  "cable-crunch": {
    primaryMuscle: "abs", male: [0.25, 0.5, 1.0, 1.5, 2.25], female: [0.25, 0.5, 1.0, 1.5, 2.25],
    genPctl: [0.55, 0.76, 0.9, 0.97, 0.995], confidence: 0.45,
    exercises: ["cable-crunch", "hanging-leg-raise", "ab-wheel-rollout", "hanging-knee-raise", "captains-chair-knee-raise", "toes-to-bar", "decline-situp", "v-up", "dragon-flag", "l-sit"],
  },
  "cable-woodchop": {
    primaryMuscle: "obliques", male: [0.1, 0.25, 0.5, 0.85, 1.25], female: [0.05, 0.1, 0.2, 0.35, 0.55],
    genPctl: [0.55, 0.75, 0.89, 0.97, 0.995], confidence: 0.4,
    exercises: ["cable-woodchop", "pallof-press", "oblique-crunch"],
  },
  "tibialis-raise": {
    primaryMuscle: "tibialis", male: [0.1, 0.2, 0.35, 0.55, 0.8], female: [0.08, 0.15, 0.28, 0.45, 0.65],
    genPctl: [0.5, 0.72, 0.88, 0.97, 0.995], confidence: 0.4,
    exercises: ["tibialis-raise"],
  },
};

// The reference whose distribution backs each per-muscle leaf (strength.<muscle>).
const MUSCLE_TO_REF: Record<MuscleGroup, StrengthReferenceId> = {
  chest: "barbell-bench-press", front_delt: "barbell-overhead-press", side_delt: "lateral-raise",
  rear_delt: "reverse-fly", triceps: "triceps-pushdown", biceps: "barbell-curl", forearms: "wrist-curl",
  lat: "barbell-row", trap: "barbell-shrug", lower_back: "barbell-deadlift",
  quads: "barbell-back-squat", hamstrings: "romanian-deadlift", glutes: "hip-thrust",
  calves: "calf-raise", tibialis: "tibialis-raise", abs: "cable-crunch", obliques: "cable-woodchop",
};

// The reference backing each direct benchmark-lift leaf.
const LEAF_TO_REF: Record<string, StrengthReferenceId> = {
  "strength.bench_1rm": "barbell-bench-press",
  "strength.squat_1rm": "barbell-back-squat",
  "strength.deadlift_1rm": "barbell-deadlift",
  "strength.ohp_1rm": "barbell-overhead-press",
};

// exerciseId → the reference(s) it is scored against (inverted from REFERENCES.exercises).
// An exercise can feed more than one muscle's reference (a chin-up scores both lat and biceps).
const EXERCISE_TO_REFS: Record<string, StrengthReferenceId[]> = (() => {
  const m: Record<string, StrengthReferenceId[]> = {};
  for (const [refId, ref] of Object.entries(REFERENCES) as [StrengthReferenceId, StrengthReference][]) {
    for (const ex of ref.exercises) (m[ex] ??= []).push(refId);
  }
  return m;
})();

/** The strength reference(s) a logged exercise is scored against (empty if none). */
export function referencesForExercise(exerciseId: string): StrengthReferenceId[] {
  return EXERCISE_TO_REFS[exerciseId] ?? [];
}

/** The muscle a reference primarily scores. */
export function muscleForReference(refId: StrengthReferenceId): MuscleGroup {
  return REFERENCES[refId].primaryMuscle;
}

/**
 * Cohort distribution (in LOG1P space) for a strength reference movement at the target
 * cohort. Strength in the general population is right-skewed and zero-floored — most adults
 * can't perform a loaded barbell movement at all, so the published tier ladder sits ABOVE
 * the population median. A linear Gaussian fit through tiers that are all above the median
 * extrapolates a nonsensical lower half and leaks large sub-zero probability mass (female
 * squat read CV > 1.3). Fitting in ln(1+load) space keeps the curve strictly non-negative,
 * models the skew, AND turns the allometric bodyweight rescale into a clean additive shift:
 * a load that scales by `s` shifts the log-mean by ln(s). Returns mean/sd in log1p space with
 * transform set, so percentileInGaussian maps the raw load the same way.
 */
export function referenceDist(refId: StrengthReferenceId, cohort: Cohort): { mean: number; sd: number; transform: "log1p" } {
  const ref = REFERENCES[refId];
  const sk = sexKey(cohort.sex);
  const tiers = sk === "female" ? ref.female : ref.male;
  const refBw = STANDARD_BW[sk];

  const bw = representativeBodyweightKg(cohort.sex, cohort.heightCm);
  const fit = fitGaussianTiersLog1p(tiers.map((m) => m * refBw), ref.genPctl, false);

  // Multiplicative load scale (allometric + age) → additive shift of the log-mean.
  const ageF = strengthAgeFactor(cohort.ageYears);
  const logScale = ALLOMETRIC_B * Math.log(bw / refBw) + Math.log(ageF);
  const meanT = fit.mean + logScale;

  // Allometric spread from within-height bodyweight variation (additive in log space).
  const bwSd = bodyweightSdKg(cohort.sex, cohort.heightCm);
  const alloT = ALLOMETRIC_B * Math.log((bw + bwSd) / bw);
  const sdT = Math.sqrt(fit.sd * fit.sd + alloT * alloT);

  return { mean: meanT, sd: Math.max(sdT, 0.18), transform: "log1p" };
}

const ASSUMPTIONS = (cohort: Cohort, refId: StrengthReferenceId): string[] => {
  const a = [
    "Scored against the published ×bodyweight standard for THIS movement (StrengthLevel/ExRx), " +
      `re-expressed to your height via NHANES anthropometrics (the bridge model, §5.3).`,
    "Tier ladder placed at GENERAL-POPULATION percentiles — a trained-intermediate lift reads " +
      "well above average (it is the median of logging lifters, ~the 90th of all adults), not the median.",
    `Allometric scaling b=${ALLOMETRIC_B.toFixed(3)} (strength ∝ mass^(2/3)); reference movement ${refId}.`,
    "Lowest-confidence seed tier; sharpens as first-party height-conditioned data accrues (small K).",
  ];
  if (cohort.sex === "unspecified")
    a.push("Sex unspecified → male-coded strength norms used as a conservative fallback.");
  return a;
};

function distFromReference(leafId: LeafId, refId: StrengthReferenceId, cohort: Cohort, confidence: number, label: string): CohortDist {
  const K = BLEND_K.strength;
  const nObserved = 0;
  const { mean, sd, transform } = referenceDist(refId, cohort);
  return {
    mean, sd, transform, lowerIsBetter: false,
    seedSources: ["SYMMETRIC_STRENGTH", "EXRX", "NHANES_ANTHRO", "MILITARY_FITNESS"],
    curveProvenance: "seed_population",
    confidenceBasis: confidence,
    distributionId: makeDistId(leafId, cohort),
    K, nObserved, firstPartyWeight: firstPartyWeight(nObserved, K),
    dataSourceLabel: label,
    assumptions: ASSUMPTIONS(cohort, refId),
  };
}

/** Cohort distribution for a benchmark lift OR an inferred per-muscle leaf. Returns
 *  null for non-strength leaves. */
export function strengthCohortDist(leafId: LeafId, cohort: Cohort): CohortDist | null {
  // Direct benchmark lift?
  const benchRef = LEAF_TO_REF[leafId];
  if (benchRef) {
    return distFromReference(
      leafId, benchRef, cohort, 0.6,
      "Population strength standards (StrengthLevel/ExRx) for this lift, adjusted for your height via the " +
        "bridge model — not yet from Peak's own users.",
    );
  }

  // Inferred per-muscle leaf? id is `strength.<muscle>`.
  if (leafId.startsWith("strength.")) {
    const mg = leafId.slice("strength.".length) as MuscleGroup;
    const refId = MUSCLE_TO_REF[mg];
    if (refId) {
      return distFromReference(
        leafId, refId, cohort, REFERENCES[refId].confidence,
        `Inferred ${mg.replace("_", " ")} strength, scored against population ${refId.replace(/-/g, " ")} ` +
          "standards adjusted for your height (bridge model) — not yet from Peak's own users.",
      );
    }
  }

  return null;
}

// Re-export so the bridge's anthropometric helpers stay importable from this module.
export type { Sex };
