// Peak scoring engine — inferred per-muscle strength (§4.3, infer/1).
//
// Moat property #2: per-muscle strength is INFERRED from the compound + isolation
// sets the user already logs, never max-tested in isolation. The pipeline:
//   1. per-set est-1RM (Epley) for sets that carry a weight
//   2. attribute est1RM × muscleWeights[g] to each muscle group g
//   3. quality weight = clamp(0.5 + 0.05×(rpe−5), 0.5, 1.0); 0.7 if no rpe
//   4. recency weight = 0.5^(daysAgo / recencyHalfLifeDays)
//   5. combine = recency&quality-weighted mean of the TOP-K attributed contributions
//   6. percentile each group's estStrength via lookupCohortDist(`strength.<g>`)
// Untested groups (no contributing sets) → all-null estimate, source "untested".
//
// PURE / DETERMINISTIC given (sessions, build, asOf).

import type {
  BuildSnapshot,
  MuscleGroup,
  MuscleGroupEstimate,
  Session,
  SetRecord,
} from "../types";
import { INFER, MODELS } from "../constants";
import { ALL_MUSCLES, LEAF_BY_ID } from "../data/capabilityTree";
import { EXERCISE_BY_ID } from "../data/exercises";
import { buildCohort } from "./cohort";
import { lookupCohortDist } from "../data/distributions";
import {
  percentileInGaussian,
  tierForPercentile,
  daysBetween,
  recencyFactor,
  leafConfidence,
  distributionDepthOf,
  cappedOf,
} from "./score";

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** §4.3 step 1 — Epley est-1RM. A 1-rep set returns its own weight. */
export function epley1RM(weightKg: number, reps: number): number {
  const r = reps > 0 ? reps : 1;
  return weightKg * (1 + r / INFER.epleyDivisor);
}

/** §4.3 step 3 — execution-quality weight from RPE (0.7 when RPE absent). */
function qualityWeight(rpe: number | null): number {
  if (rpe == null) return 0.7;
  return clamp(0.5 + 0.05 * (rpe - 5), 0.5, 1.0);
}

type Contribution = {
  attributed: number; // est1RM × muscleWeight[g]
  weight: number; // quality × recency
  setId: string;
};

/**
 * §4.3 — full infer/1 pipeline. Walks every logged set across sessions, computes
 * per-set est-1RM, attributes it to muscle groups by the exercise's muscleWeights,
 * and combines the recency&quality-weighted mean of the top-K attributed
 * contributions per group into an estStrength, then percentiles it.
 */
export function inferMuscleStrength(
  sessions: Session[],
  build: BuildSnapshot,
  asOf: string,
): Partial<Record<MuscleGroup, MuscleGroupEstimate>> {
  // Gather per-group contributions.
  const byGroup: Partial<Record<MuscleGroup, Contribution[]>> = {};
  const lastUpdatedByGroup: Partial<Record<MuscleGroup, string>> = {};

  for (const session of sessions) {
    for (const entry of session.entries) {
      const exDef = EXERCISE_BY_ID[entry.exerciseId];
      if (!exDef) continue; // unknown exercise — cannot attribute
      const weights = exDef.muscleWeights;
      for (const set of entry.sets) {
        // Only sets with an actual external weight produce an est-1RM (§4.3 step 1).
        const w = set.weight?.value;
        if (w == null || w <= 0) continue;
        const est = epley1RM(w, set.reps);
        const daysAgo = daysBetween(set.derived?.[0]?.computedAt ?? session.createdAt, asOf);
        const recency = recencyFactor(daysAgo, INFER.recencyHalfLifeDays);
        const quality = qualityWeight(set.rpe);
        const w_set = quality * recency;

        for (const g of Object.keys(weights) as MuscleGroup[]) {
          const mw = weights[g];
          // Only meaningful movers infer a muscle (§4.3 / infer/1 minAttribution) —
          // incidental low-weight contributions leave the muscle untested, not weak.
          if (mw == null || mw < INFER.minAttribution) continue;
          (byGroup[g] ??= []).push({ attributed: est * mw, weight: w_set, setId: set.id });
          // Track the most recent contributing session timestamp per group.
          const prev = lastUpdatedByGroup[g];
          if (!prev || session.createdAt > prev) lastUpdatedByGroup[g] = session.createdAt;
        }
      }
    }
  }

  const cohort = buildCohort(build);
  const result: Partial<Record<MuscleGroup, MuscleGroupEstimate>> = {};

  for (const g of ALL_MUSCLES) {
    const contribs = byGroup[g];
    if (!contribs || contribs.length === 0) {
      // Untested group — null everything (§2.5 / §4.3).
      result[g] = {
        muscleGroup: g,
        estStrength: null,
        normalizedValue: null,
        percentileRaw: null,
        cappedPercentile: null,
        tier: null,
        inferenceModel: MODELS.inference,
        source: "untested",
        confidence: null,
        lastCalibratedAt: null,
        lastUpdatedAt: null,
        contributingSetIds: [],
      };
      continue;
    }

    // §4.3 step 5 — top-K by attributed value (max-biased), then recency&quality-
    // weighted mean so a single fluke set cannot dominate and light incidental
    // volume cannot drag a strong group down.
    const topK = [...contribs].sort((a, b) => b.attributed - a.attributed).slice(0, INFER.topK);
    let num = 0;
    let den = 0;
    for (const c of topK) {
      num += c.attributed * c.weight;
      den += c.weight;
    }
    const estStrength = den > 0 ? num / den : topK[0].attributed;
    const contributingSetIds = topK.map((c) => c.setId);

    const leaf = LEAF_BY_ID[`strength.${g}`];
    const dist = lookupCohortDist(`strength.${g}`, cohort);

    if (!dist || !leaf) {
      result[g] = {
        muscleGroup: g,
        estStrength: { value: round1(estStrength), unit: "kg" },
        normalizedValue: null,
        percentileRaw: null,
        cappedPercentile: null,
        tier: null,
        inferenceModel: MODELS.inference,
        source: "inferred-strength",
        confidence: null,
        lastCalibratedAt: null,
        lastUpdatedAt: lastUpdatedByGroup[g] ?? asOf,
        contributingSetIds,
      };
      continue;
    }

    const percentileRaw = percentileInGaussian(estStrength, dist);
    const normalized = percentileRaw; // beta: cohort Gaussian is the only normalizer
    const daysSinceLast = daysBetween(lastUpdatedByGroup[g] ?? asOf, asOf);
    const confidence = leafConfidence(leaf, dist, {
      distributionDepth: distributionDepthOf(dist),
      measurementQuality: 0.85, // logged_set quality (no direct benchmark anchor yet)
      recency: recencyFactor(daysSinceLast, leaf.staleAfterDays),
      inferenceChainLength: 0.8, // §2.4 — inferred-from-strength chain
    });

    result[g] = {
      muscleGroup: g,
      estStrength: { value: round1(estStrength), unit: "kg" },
      normalizedValue: normalized,
      percentileRaw,
      cappedPercentile: cappedOf(percentileRaw),
      tier: tierForPercentile(percentileRaw),
      inferenceModel: MODELS.inference,
      source: "inferred-strength",
      confidence,
      lastCalibratedAt: null,
      lastUpdatedAt: lastUpdatedByGroup[g] ?? asOf,
      contributingSetIds,
    };
  }

  return result;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

// Re-exported helper used by the integration surface to know which sets fed a group.
export type { SetRecord };
