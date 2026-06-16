// Peak scoring engine — the integration surface the store/UI calls.
//
// recomputeAll(data, asOf) is the single pure entry point: it rebuilds leafScores
// (from benchmark results [direct], composition [body_composition leaves], and
// inferred muscle estimates [strength.<muscle>]), muscleEstimates, and the
// consistency track from the raw event store, preserving trajectory history and
// never fabricating an untested value. Selectors (getHeadlineAndDimensions,
// getMethodologyNotes) and a scoreBenchmark helper round out the surface.
//
// PURE / DETERMINISTIC given (data, asOf).

import type {
  BenchmarkResult,
  BuildSnapshot,
  CompositionSnapshot,
  Headline,
  LeafId,
  LeafScore,
  MeasurementId,
  MethodologyNote,
  MuscleGroup,
  MuscleGroupEstimate,
  PeakData,
  Quantity,
  RawMeasurement,
  ScorePoint,
} from "../types";
import { MODELS, PEAK_CAP } from "../constants";
import { LEAF_BY_ID } from "../data/capabilityTree";
import { standardEquivFactor, variantConfidenceFactor } from "../data/benchmarkVariants";
import { lookupCohortDist, methodologyNoteFor } from "../data/distributions";
import { buildCohort } from "./cohort";
import { est1RM } from "./math";
import {
  scoreLeafRaw,
  tierForPercentile,
  percentileInGaussian,
  daysBetween,
  recencyFactor,
  leafConfidence,
  distributionDepthOf,
} from "./score";
import { computeHeadline } from "./rollup";
import type { DimensionRollup } from "./rollup";
import { inferMuscleStrength } from "./infer";
import { computeConsistency } from "./consistency";
import { compositionSnapshotFrom, compositionLeafPercentiles, applyFloorGuard } from "./composition";

// ── Re-exports: the UI imports engine helpers from one place ────────────────
export {
  tierForPercentile,
  cappedOf,
  percentileInGaussian,
  effConf,
  scoreLeafRaw,
} from "./score";
export { computeHeadline, rollupDimension } from "./rollup";
export type { DimensionRollup, SubcategoryRollup, Eligibility } from "./rollup";
export { inferMuscleStrength } from "./infer";
export { regionTrainingForGroup } from "./regions";
export type { RegionTraining, RegionTrainingResult } from "./regions";
export { computeConsistency } from "./consistency";
export { computeWeekStatus, mondayIndex, planIsEmpty, EMPTY_WEEK_DAYS } from "./weeklyPlan";
export type { WeekStatus, WeekDayStatus, DayKind } from "./weeklyPlan";
export { project, projectToTarget } from "./projection";
export {
  compositionSnapshotFrom,
  idealWeightRange,
  ffmiOf,
  leanMassKg,
  bfBandOf,
  belowEssentialFloor,
  effectiveBfForScoring,
  applyFloorGuard,
  muscularityPrior,
} from "./composition";
export {
  ageYearsFrom,
  ageBandOf,
  heightBandOf,
  buildCohort,
  cohortKeyString,
  cohortTuple,
  cohortKeyOf,
} from "./cohort";

// ── RawMeasurement → scalar (in the leaf's unit) ────────────────────────────

/**
 * §4.2 — extract the raw scalar a leaf is percentiled on from a RawMeasurement.
 * The scalar is in the LEAF's declared unit (e.g. seconds for runs, kg for lifts,
 * reps for endurance). Returns null when the union has no usable value for the leaf.
 */
export function rawScalarFor(leafId: LeafId, raw: RawMeasurement): number | null {
  const leaf = LEAF_BY_ID[leafId];
  switch (raw.kind) {
    case "max_load": {
      // For a 1RM leaf, a multi-rep max_load is converted to est-1RM (Epley), then
      // re-expressed onto the STANDARD movement's curve via the variant factor
      // (1.0 for the standard / barbell). §4.2 flexible benchmarking.
      const est1rm = raw.reps > 1 ? est1RM(raw.load.value, raw.reps) : raw.load.value;
      return est1rm * standardEquivFactor(raw.variantId);
    }
    case "rep_max":
      return raw.reps; // bodyweight-movement rep counts
    case "time_for_distance":
    case "distance_in_time":
      // Time-based leaves (sec/min) → duration; distance-based → distance.
      return leaf?.unit === "m" || leaf?.unit === "km" || leaf?.unit === "mi"
        ? raw.distance.value
        : raw.duration.value;
    case "vo2_proxy":
      return raw.vo2.value;
    case "hold_duration":
    case "balance_hold":
      return raw.duration.value;
    case "rom":
      return raw.angle.value;
    case "composition":
      // Composition is handled via compositionSnapshotFrom, not this path.
      return leaf?.unit === "kg/m2" ? raw.ffmi.value : raw.bodyFatPct.value;
    case "jump_height":
      return raw.height.value;
    case "throw_distance":
    case "reach_distance":
      return raw.distance.value;
    case "sprint_time":
      return leaf?.unit === "m" ? raw.distance.value : raw.duration.value;
    case "agility_time":
      return raw.duration.value;
  }
}

// ── scoreBenchmark (onboarding + benchmark screen) ──────────────────────────

/**
 * §4.2 — score a completed benchmark into a full BenchmarkResult. Extracts the
 * raw scalar by leaf unit, applies the §3.6.1 healthy-floor guard for mass-
 * relative leaves, percentiles it, and stamps provenance. `protocolLeafId` is the
 * leaf the protocol targets.
 */
export function scoreBenchmark(
  protocolLeafId: LeafId,
  raw: RawMeasurement,
  build: BuildSnapshot,
  asOf: string,
): BenchmarkResult {
  const leaf = LEAF_BY_ID[protocolLeafId];
  const scalar = rawScalarFor(protocolLeafId, raw);
  const cohort = buildCohort(build);
  const dist = lookupCohortDist(protocolLeafId, cohort);

  const measurementId: MeasurementId = `bench_${protocolLeafId}_${asOf}`;
  const baseResult: Omit<
    BenchmarkResult,
    "normalizedValue" | "percentileRaw" | "cappedPercentile" | "tier" | "curveSource" | "distributionId" | "confidence"
  > = {
    id: measurementId,
    protocolId: `${protocolLeafId}.v1`,
    protocolVersion: 1,
    leafId: protocolLeafId,
    performedAt: asOf,
    raw,
    buildSnapshot: build,
    source: "measured",
  };

  if (scalar == null || !dist || !leaf) {
    return {
      ...baseResult,
      normalizedValue: 0,
      percentileRaw: null,
      cappedPercentile: null,
      tier: null,
      curveSource: dist?.curveProvenance ?? "seed_population",
      distributionId: dist?.distributionId ?? `${protocolLeafId}|unknown`,
      confidence: 0,
    };
  }

  // §3.6.1 — mass-relative leaves apply the healthy-floor guard to the value fed
  // to the percentiler (raw is preserved unchanged on the result).
  const guarded = applyFloorGuard(scalar, build, leaf);
  const guardApplied = guarded !== scalar;

  const percentileRaw = percentileInGaussian(guarded, dist);
  // A non-standard variant (e.g. dumbbell bench) is a converted measurement → an
  // honest confidence haircut vs the literal standard test (§4.2).
  const variantConf = raw.kind === "max_load" ? variantConfidenceFactor(raw.variantId) : 1.0;
  const confidence = leafConfidence(leaf, dist, {
    distributionDepth: distributionDepthOf(dist),
    measurementQuality: 1.0, // benchmark = top of the ladder
    recency: 1,
    // a converted variant is shaded via the (un-capped) inference-chain factor, so the
    // haircut survives even when the leaf's launch ceiling is below the variant factor.
    inferenceChainLength: variantConf,
  });

  return {
    ...baseResult,
    normalizedValue: percentileRaw,
    percentileRaw,
    cappedPercentile: Math.min(percentileRaw, PEAK_CAP),
    tier: tierForPercentile(percentileRaw),
    curveSource: dist.curveProvenance,
    distributionId: guardApplied ? `${dist.distributionId}+floor_guard` : dist.distributionId,
    confidence,
  };
}

// ── recomputeAll ────────────────────────────────────────────────────────────

function latestBuild(data: PeakData): BuildSnapshot | null {
  return data.biometric?.build ?? null;
}

function latestComposition(data: PeakData): CompositionSnapshot | null {
  return data.biometric?.latestComposition ?? null;
}

/** Most recent benchmark result per leaf (by performedAt). */
function latestBenchmarkByLeaf(results: BenchmarkResult[]): Record<LeafId, BenchmarkResult> {
  const out: Record<LeafId, BenchmarkResult> = {};
  for (const r of results) {
    const cur = out[r.leafId];
    if (!cur || r.performedAt > cur.performedAt) out[r.leafId] = r;
  }
  return out;
}

/** Convert a MuscleGroupEstimate into a strength.<muscle> LeafScore (or null if untested). */
function muscleEstimateToLeafScore(
  est: MuscleGroupEstimate,
  build: BuildSnapshot,
  asOf: string,
  existing: LeafScore | undefined,
): LeafScore | null {
  const leafId = `strength.${est.muscleGroup}`;
  if (est.percentileRaw == null) return null; // untested → leaf stays absent
  const priorHistory: ScorePoint[] = existing?.history ? [...existing.history] : [];
  const point: ScorePoint = {
    at: asOf,
    percentileRaw: est.percentileRaw,
    cappedPercentile: est.cappedPercentile,
    normalizedValue: est.normalizedValue ?? undefined,
  };
  const raw: Quantity | undefined = est.estStrength ?? undefined;
  return {
    leafId,
    raw,
    rawSource: "logged_set",
    contributingSetIds: est.contributingSetIds,
    normalized: est.normalizedValue ?? undefined,
    normalizerMethod: LEAF_BY_ID[leafId]?.normalizer.method,
    normalizerVersion: LEAF_BY_ID[leafId]?.normalizer.version,
    percentileRaw: est.percentileRaw,
    cappedPercentile: est.cappedPercentile,
    tier: est.tier,
    isPeak: est.percentileRaw >= PEAK_CAP,
    buildSnapshot: build,
    confidence: est.confidence,
    distributionId: undefined,
    computedAt: asOf,
    state: est.source === "inferred-strength" ? "inferred" : "measured",
    coverage: 1,
    eligible: true,
    history: [...priorHistory, point],
  };
}

/** Build a body_composition.* LeafScore from the composition snapshot, or null if untested. */
function compositionLeafScore(
  leafId: "body_composition.ffmi" | "body_composition.bf_band",
  snap: CompositionSnapshot,
  build: BuildSnapshot,
  asOf: string,
  existing: LeafScore | undefined,
): LeafScore | null {
  const pcts = compositionLeafPercentiles(snap);
  const which = leafId === "body_composition.ffmi" ? pcts.ffmi : pcts.bf;
  if (which.percentileRaw == null) return null;
  const priorHistory: ScorePoint[] = existing?.history ? [...existing.history] : [];
  const raw: Quantity | undefined =
    leafId === "body_composition.ffmi" ? snap.ffmi ?? undefined : snap.bodyFatPct ?? undefined;
  const point: ScorePoint = {
    at: asOf,
    percentileRaw: which.percentileRaw,
    cappedPercentile: which.capped,
  };
  // Recompute confidence the same way compositionSnapshotFrom did for FFMI; reuse
  // its provenance confidence for both leaves as a reasonable beta approximation.
  const confidence = snap.provenance.confidence ?? null;
  return {
    leafId,
    raw,
    rawSource: "health_integration",
    normalizerMethod: LEAF_BY_ID[leafId]?.normalizer.method,
    normalizerVersion: LEAF_BY_ID[leafId]?.normalizer.version,
    percentileRaw: which.percentileRaw,
    cappedPercentile: which.capped,
    tier: which.tier,
    isPeak: which.percentileRaw >= PEAK_CAP,
    buildSnapshot: build,
    confidence,
    computedAt: asOf,
    state: "measured",
    coverage: 1,
    eligible: true,
    history: [...priorHistory, point],
  };
}

/**
 * §2 — the pure recompute. Returns a NEW PeakData with refreshed leafScores,
 * muscleEstimates, and consistency. Untested leaves remain absent (never zeroed).
 * Trajectory is preserved: when a leaf already had a LeafScore, the new score
 * appends a ScorePoint to its history rather than discarding it.
 */
export function recomputeAll(data: PeakData, asOf: string): PeakData {
  const build = latestBuild(data);
  const prevScores = data.leafScores ?? {};
  const leafScores: Record<LeafId, LeafScore> = {};

  // Without a build there is no cohort → no percentiles (§4.5 unconditioned
  // preview). We return data unchanged except for a recomputed consistency track,
  // which needs no build.
  if (!build) {
    return {
      ...data,
      consistency: computeConsistency(data.sessions ?? [], asOf),
    };
  }

  // 1) Direct benchmark leaves — score the latest result per leaf.
  const latestBench = latestBenchmarkByLeaf(data.benchmarkResults ?? []);
  for (const [leafId, result] of Object.entries(latestBench)) {
    const daysSince = daysBetween(result.performedAt, asOf);
    const leaf = LEAF_BY_ID[leafId];
    const scalar = leaf ? rawScalarFor(leafId, result.raw) : null;
    if (scalar == null) continue;
    // A converted variant (e.g. dumbbell bench) is shaded down vs the literal test.
    const variantConf = result.raw.kind === "max_load" ? variantConfidenceFactor(result.raw.variantId) : 1.0;
    const score = scoreLeafRaw(leafId, scalar, result.buildSnapshot ?? build, {
      source: "benchmark",
      provenanceSource: "measured",
      state: "measured",
      asOf,
      // recency relative to when the benchmark was actually performed.
      measurementQuality: recencyFactor(0, leaf?.staleAfterDays ?? 60),
      // a converted variant (e.g. dumbbell bench) is shaded down vs the literal test.
      inferenceChainLength: variantConf,
      existing: prevScores[leafId],
    });
    // Override recency-aware confidence using the true age of the benchmark.
    if (score.confidence != null && leaf) {
      const dist = lookupCohortDist(leafId, buildCohort(result.buildSnapshot ?? build));
      if (dist) {
        score.confidence = leafConfidence(leaf, dist, {
          distributionDepth: distributionDepthOf(dist),
          measurementQuality: 1.0,
          recency: recencyFactor(daysSince, leaf.staleAfterDays),
          inferenceChainLength: variantConf,
        });
        score.state = daysSince > leaf.staleAfterDays ? "stale" : "measured";
      }
    }
    leafScores[leafId] = score;
  }

  // 2) Inferred per-muscle strength → strength.<muscle> leaves.
  const muscleEstimates = inferMuscleStrength(data.sessions ?? [], build, asOf);
  for (const g of Object.keys(muscleEstimates) as MuscleGroup[]) {
    const est = muscleEstimates[g];
    if (!est) continue;
    const leafId = `strength.${g}`;
    // A direct benchmark for this leaf (if any) wins over inference.
    if (leafScores[leafId]) continue;
    const ls = muscleEstimateToLeafScore(est, build, asOf, prevScores[leafId]);
    if (ls) leafScores[leafId] = ls;
  }

  // 3) Body-composition leaves from the latest composition snapshot.
  let comp = latestComposition(data);
  if (!comp && build.bodyweightKg != null) {
    comp = compositionSnapshotFrom(build.bodyweightKg, build.bodyFatPct, build, { asOf });
  }
  if (comp) {
    for (const leafId of ["body_composition.ffmi", "body_composition.bf_band"] as const) {
      const ls = compositionLeafScore(leafId, comp, build, asOf, prevScores[leafId]);
      if (ls) leafScores[leafId] = ls;
    }
  }

  return {
    ...data,
    leafScores,
    muscleEstimates,
    consistency: computeConsistency(data.sessions ?? [], asOf),
  };
}

// ── Selectors for the UI ────────────────────────────────────────────────────

/** §2.6 — the headline + dimension rollup tree for the UI. */
export function getHeadlineAndDimensions(data: PeakData): {
  headline: Headline;
  dimensions: DimensionRollup[];
} {
  return computeHeadline(data.leafScores ?? {}, data.eligibility ?? {});
}

/** §5.6 — distinct methodology notes across the tested leaves (for transparency). */
export function getMethodologyNotes(data: PeakData): MethodologyNote[] {
  const build = data.biometric?.build;
  if (!build) return [];
  const cohort = buildCohort(build);
  const seen = new Set<string>();
  const notes: MethodologyNote[] = [];
  for (const [leafId, score] of Object.entries(data.leafScores ?? {})) {
    if (score.percentileRaw == null) continue; // only tested leaves
    const note = methodologyNoteFor(leafId, cohort);
    if (note && !seen.has(note.distributionId)) {
      seen.add(note.distributionId);
      notes.push(note);
    }
  }
  return notes;
}

// Model-version stamps re-exported for callers that build an AIContext export.
export const ENGINE_MODELS = MODELS;
