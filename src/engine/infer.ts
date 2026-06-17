// Peak scoring engine — inferred per-muscle strength (§4.3, infer/1).
//
// Moat property #2: per-muscle strength is INFERRED from the sets the user already logs,
// never max-tested in isolation. Each exercise maps to one or more STRENGTH REFERENCES
// (§5.3) — the published ×bodyweight standard for its movement — and a muscle is scored
// against the standard for a movement that actually trains it. This replaces the old
// `est1RM × muscleWeights[g]` attribution against a single compound proxy, whose `frac`
// only cancelled for bench→chest and read every isolation lift at the 99th percentile.
// A pure-calisthenics movement with a published REP standard (pull-up, chin-up, dip) is a
// special case: its standard is a rep count, not a load, so ranking an invented 1RM on the
// barbell curve over-credits it (5 pull-ups read ~96th). Those are scored on REPS against a
// bodyweight rep ladder, then mapped back onto the muscle's load scale (equal-percentile =
// equal-z) so they combine with barbell work — see bwRepEquivalentLoad in strength.ts.
// The pipeline:
//   1. per-set est-1RM (Epley) on the barbell-equivalent load (effectiveLoadKg) — the
//      entered external weight, or a bodyweight-derived load for calisthenics (pull-up ≈
//      1×BW, dip ≈ 0.95×BW; belt/vest plates add on top). REP-standard movements instead
//      contribute the load equivalent to their rep-standard percentile.
//   2. attribute that est-1RM to the primary muscle of EACH reference the exercise maps to
//      (a chin-up scores both lat and biceps) — on the reference's own load scale, no frac
//   3. quality weight = clamp(0.5 + 0.05×(rpe−5), 0.5, 1.0); 0.7 if no rpe
//   4. recency weight = 0.5^(daysAgo / recencyHalfLifeDays)
//   5. combine = recency&quality-weighted mean of the TOP-K est-1RMs
//   6. percentile each group's estStrength against its reference dist via lookupCohortDist
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
import { effectiveLoadKg } from "../data/exerciseCatalog";
import { representativeBodyweightKg } from "../data/distributions/nhanesAnthro";
import {
  referencesForExercise,
  muscleForReference,
  bwRepReferenceForExercise,
  bwRepMuscle,
  bwRepEquivalentLoad,
  equivalentBodyweightReps,
} from "../data/distributions/strength";
import { est1RM, round1 } from "./math";
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

/** §4.3 step 3 — execution-quality weight from RPE (0.7 when RPE absent). */
function qualityWeight(rpe: number | null): number {
  if (rpe == null) return 0.7;
  return clamp(0.5 + 0.05 * (rpe - 5), 0.5, 1.0);
}

type Contribution = {
  attributed: number; // est1RM × muscleWeight[g]
  weight: number; // quality × recency
  setId: string;
  modeled: boolean; // load came from the bodyweight model (calisthenics), not an entered weight
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
  const cohort = buildCohort(build);

  const touch = (g: MuscleGroup, c: Contribution, sessionAt: string) => {
    (byGroup[g] ??= []).push(c);
    const prev = lastUpdatedByGroup[g];
    if (!prev || sessionAt > prev) lastUpdatedByGroup[g] = sessionAt;
  };

  for (const session of sessions) {
    for (const entry of session.entries) {
      const exDef = EXERCISE_BY_ID[entry.exerciseId];
      if (!exDef) continue; // unknown exercise — cannot attribute
      // A calisthenics movement with a published REP standard (pull-up, chin-up, dip) is
      // scored on REPS, not an invented 1RM — see bwRepEquivalentLoad. Everything else uses
      // its load reference(s) (§5.3): an exercise with neither contributes nothing.
      const bwRepRef = bwRepReferenceForExercise(entry.exerciseId);
      const refs = bwRepRef ? [] : referencesForExercise(entry.exerciseId);
      if (!bwRepRef && refs.length === 0) continue;
      // Calisthenics carry no external bar but DO load the body, so loaded movements are
      // scored on a bodyweight-derived load (pull-up ≈ 1×BW, dip ≈ 0.95×BW). Bodyweight
      // unknown → fall back to the cohort-representative weight so a calisthenics-only
      // lifter is still scored (seed-anchored; per-set confidence reflects the chain).
      const bwForLoad = exDef.isBodyweight
        ? (build.bodyweightKg ?? representativeBodyweightKg(build.sex, build.heightCm))
        : null;
      for (const set of entry.sets) {
        const added = set.weight?.value ?? 0;
        const daysAgo = daysBetween(set.derived?.[0]?.computedAt ?? session.createdAt, asOf);
        const recency = recencyFactor(daysAgo, INFER.recencyHalfLifeDays);
        const w_set = qualityWeight(set.rpe) * recency;

        if (bwRepRef) {
          // Rank the REP count against the bodyweight rep standard, then map onto the
          // muscle's load scale (equal-percentile = equal-z) so it combines with barbell
          // work. Belt/vest plates fold in as equivalent extra reps.
          if (set.reps <= 0) continue;
          const effReps = equivalentBodyweightReps(set.reps, Math.max(0, added), bwForLoad);
          const attributed = bwRepEquivalentLoad(bwRepRef, effReps, cohort);
          touch(bwRepMuscle(bwRepRef), { attributed, weight: w_set, setId: set.id, modeled: true }, session.createdAt);
          continue;
        }

        // External / non-rep load path: per-set est-1RM on the barbell-equivalent load.
        const load = effectiveLoadKg(exDef, added, bwForLoad);
        if (load <= 0) continue; // external lift with no weight, or unscorable bodyweight
        const est = est1RM(load, set.reps);
        for (const refId of refs) {
          // Attribute the FULL est-1RM to the reference's primary muscle, on that
          // reference's own load scale (no muscleWeight frac — the dist is the reference's).
          touch(muscleForReference(refId), { attributed: est, weight: w_set, setId: set.id, modeled: !!exDef.isBodyweight }, session.createdAt);
        }
      }
    }
  }

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
    // A calisthenics-derived load is MODELED (bodyweight × leverage), not a number the
    // user entered, so it's a softer measurement — the more of a group's top-K leans on
    // bodyweight movements, the lower its measurement quality (widens the confidence band,
    // never shifts the percentile). Fully external lifts keep the full 0.85.
    const modeledShare = topK.filter((c) => c.modeled).length / topK.length;
    const confidence = leafConfidence(leaf, dist, {
      distributionDepth: distributionDepthOf(dist),
      measurementQuality: 0.85 - 0.15 * modeledShare, // 0.85 external → 0.70 fully bodyweight-modeled
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

// Re-exported helper used by the integration surface to know which sets fed a group.
export type { SetRecord };
