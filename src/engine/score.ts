// Peak scoring engine — the per-leaf two-step pipeline (§2.2–§2.5).
//
// Step 1 (normalize): strip build effect via the leaf's pre-declared normalizer
// conditioning only on sex/height/age. In the beta the data layer hands us a
// cohort-conditioned Gaussian on the RAW measure, so "normalize" reduces to the
// within-cohort standardized z mapped to [0,1].
// Step 2 (percentile): the percentile of the raw value inside that Gaussian IS
// the build-relative empirical percentile (uncapped `percentileRaw`).
//
// Invariants honored strictly:
//   • percentiles clamped to [0.001, 0.999] then to [0,1]
//   • tier derives from UNCAPPED percentileRaw (§2.3)
//   • cappedPercentile = min(percentileRaw, PEAK_CAP)
//   • untested ⇒ null everywhere; confidence null only when untested
//
// PURE / DETERMINISTIC given (raw, dist, build, asOf).

import type {
  BuildSnapshot,
  CapabilityLeaf,
  CohortDist,
  LeafScore,
  LeafState,
  MeasurementId,
  ProvenanceSource,
  ScorePoint,
  TierId,
} from "../types";
import { PEAK_CAP, CONF_FLOOR, TIER_BANDS, STALE_DAYS } from "../constants";
import { LEAF_BY_ID } from "../data/capabilityTree";
import { buildCohort } from "./cohort";
import { lookupCohortDist } from "../data/distributions";

// ── Math primitives ──────────────────────────────────────────────────────────

/** Standard normal CDF Φ(z) via the Abramowitz & Stegun 7.1.26 erf approximation. */
export function normalCdf(z: number): number {
  // erf(x) with max error ~1.5e-7.
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

// ── Tiering & capping (§2.3) ───────────────────────────────────────────────────

/**
 * §2.3 — tier from the UNCAPPED percentileRaw. Bands are half-open lower-inclusive
 * [lo, hi); a value exactly on a boundary belongs to the upper band, so 0.95 → "peak".
 */
export function tierForPercentile(p: number): TierId {
  for (const b of TIER_BANDS) {
    if (p >= b.lo && p < b.hi) return b.tier;
  }
  // p >= top band hi (i.e. 1.0+) — pin to the highest band.
  return TIER_BANDS[TIER_BANDS.length - 1].tier;
}

/** §2.3 — capped contribution value; null passes through (untested stays null). */
export function cappedOf(p: number | null): number | null {
  return p === null ? null : Math.min(p, PEAK_CAP);
}

// ── Step 2: empirical percentile in the cohort Gaussian (§2.2) ─────────────────

/**
 * §2.2 — percentile of a raw value within the cohort-conditioned Gaussian.
 * Φ((raw-mean)/sd), flipped when lowerIsBetter (run/sprint times: a smaller raw
 * is a higher percentile). Clamped to [0.001, 0.999] so no leaf reads as a
 * literal 0 or 1 (honest about the tail uncertainty).
 */
export function percentileInGaussian(raw: number, dist: CohortDist): number {
  const sd = dist.sd > 0 ? dist.sd : 1e-9;
  const z = (raw - dist.mean) / sd;
  let p = normalCdf(z);
  if (dist.lowerIsBetter) p = 1 - p;
  return clamp(p, 0.001, 0.999);
}

/**
 * Step-1 "normalized" surrogate for the beta: the within-cohort standardized
 * value mapped monotonically to [0,1] via the same Gaussian CDF (direction-
 * corrected). Stored on the LeafScore as `normalized` so the AI layer can see a
 * dimensionless build-neutral value; in this beta it coincides with percentileRaw
 * before clamping, which is the honest representation when the only normalizer we
 * have IS the cohort distribution.
 */
function normalizedOf(raw: number, dist: CohortDist): number {
  // Same transform as percentile but without tail clamping — a pure [0,1] map.
  const sd = dist.sd > 0 ? dist.sd : 1e-9;
  const z = (raw - dist.mean) / sd;
  let n = normalCdf(z);
  if (dist.lowerIsBetter) n = 1 - n;
  return clamp(n, 0, 1);
}

// ── Confidence (§2.4) ──────────────────────────────────────────────────────────

export type ConfidenceFactors = {
  /** [0,1] — base seed/observation depth for this cohort (= dist.confidenceBasis blended up by firstPartyWeight). */
  distributionDepth: number;
  /** [0,1] — protocol/source ceiling × execution quality (measured > inferred > health). */
  measurementQuality: number;
  /** [0,1] — recency decay = 0.5^(daysSince/staleAfterDays). */
  recency: number;
  /** [0,1] — 1.0 direct, ~0.8 inferred-from-strength chain. */
  inferenceChainLength: number;
};

/** Days between two ISO instants (fractional, clamped at >= 0). */
export function daysBetween(fromISO: string, toISO: string): number {
  const ms = new Date(toISO).getTime() - new Date(fromISO).getTime();
  return ms > 0 ? ms / 86_400_000 : 0;
}

/** §2.4 — recency factor: confidence-from-recency halves every staleAfterDays. */
export function recencyFactor(daysSince: number, staleAfterDays: number): number {
  const horizon = staleAfterDays > 0 ? staleAfterDays : 60;
  return clamp(Math.pow(0.5, daysSince / horizon), 0, 1);
}

/** §2.4 — distributionDepth: blend the seed's confidenceBasis toward 1 as first-party data accrues. */
export function distributionDepthOf(dist: CohortDist): number {
  const fpw = clamp(dist.firstPartyWeight, 0, 1);
  const basis = clamp(dist.confidenceBasis, 0, 1);
  // As firstPartyWeight → 1, depth → 1 (real users dominate the curve); at fpw=0
  // depth == the seed's base confidence.
  return clamp(basis + (1 - basis) * fpw, 0, 1);
}

/**
 * §2.4 — the per-leaf confidence COMPOSITE: the PRODUCT of four factors each in
 * [0,1]. measurementQuality is additionally capped by the leaf's
 * launchConfidenceCeiling (cold-start honesty, §5.3). Returns a number for tested
 * leaves (this fn is never called for untested leaves — those carry null).
 */
export function leafConfidence(
  leaf: CapabilityLeaf,
  _dist: CohortDist,
  factors: ConfidenceFactors,
): number {
  let mq = clamp(factors.measurementQuality, 0, 1);
  if (leaf.launchConfidenceCeiling != null) mq = Math.min(mq, leaf.launchConfidenceCeiling);
  const dd = clamp(factors.distributionDepth, 0, 1);
  const rec = clamp(factors.recency, 0, 1);
  const icl = clamp(factors.inferenceChainLength, 0, 1);
  return clamp(dd * mq * rec * icl, 0, 1);
}

// ── State helpers (§2.5) ────────────────────────────────────────────────────────

/** §2.4/§2.5 — a once-measured leaf crosses into "stale" past its staleAfterDays horizon. */
export function staleState(leaf: CapabilityLeaf, daysSince: number): boolean {
  const horizon = leaf.staleAfterDays > 0 ? leaf.staleAfterDays : STALE_DAYS[leaf.dimension] ?? 60;
  return daysSince > horizon;
}

/**
 * §2.5 — resolve the machine-readable LeafState for a tested leaf. `baseState`
 * is what the caller knows (measured for benchmarks, inferred for muscle
 * estimates); we downgrade a measured/inferred leaf to "stale" when it is past
 * its horizon. (untested is handled outside — those leaves never reach here.)
 */
export function resolveLeafState(leaf: CapabilityLeaf, baseState: LeafState, daysSince: number): LeafState {
  if (baseState === "untested") return "untested";
  return staleState(leaf, daysSince) ? "stale" : baseState;
}

// ── The full per-leaf scorer (§2.2) ─────────────────────────────────────────────

export type ScoreLeafOpts = {
  source: "benchmark" | "logged_set" | "health_integration";
  /** The base provenance source enum (e.g. "measured", "inferred-strength"). */
  provenanceSource: ProvenanceSource;
  /** Base LeafState before staleness resolution ("measured" | "inferred"). */
  state: LeafState;
  asOf: string;
  contributingSetIds?: MeasurementId[];
  /** Inference-chain factor: 1.0 direct, ~0.8 inferred-from-strength. */
  inferenceChainLength?: number;
  /** Execution-quality factor in [0,1] (defaults by source if omitted). */
  measurementQuality?: number;
  /** When recomputing, append to this score's history instead of starting fresh. */
  existing?: LeafScore;
};

/** Default measurement quality by source ladder (measured > inferred > health). */
function defaultMeasurementQuality(source: ScoreLeafOpts["source"]): number {
  switch (source) {
    case "benchmark":
      return 1.0;
    case "logged_set":
      return 0.85;
    case "health_integration":
      return 0.7;
  }
}

/**
 * §2.2 — score one leaf end-to-end from a RAW scalar value (in the leaf's unit).
 * lookupCohortDist → normalized → percentileRaw (uncapped) → cappedPercentile →
 * tier (from raw) → confidence → state/provenance/distributionId/history.
 *
 * If the data layer has no distribution for this cohort/leaf, we still preserve
 * the raw value but leave the derived percentile fields null (honest "we cannot
 * place you" — same shape as the §4.5 unconditioned-preview path), with state
 * carried through as given. Never fabricates a percentile.
 */
export function scoreLeafRaw(
  leafId: string,
  rawValue: number,
  build: BuildSnapshot,
  opts: ScoreLeafOpts,
): LeafScore {
  const leaf = LEAF_BY_ID[leafId];
  const cohort = buildCohort(build);
  const dist = lookupCohortDist(leafId, cohort);

  const unit = leaf?.unit ?? "count";
  const daysSince = 0; // freshly computed at asOf
  const icl = opts.inferenceChainLength ?? (opts.state === "inferred" ? 0.8 : 1.0);
  const mq = opts.measurementQuality ?? defaultMeasurementQuality(opts.source);

  // History carry-over (§2.6 trajectory preservation): never lose the past.
  const priorHistory: ScorePoint[] = opts.existing?.history ? [...opts.existing.history] : [];

  if (!dist || !leaf) {
    // No cohort distribution (or unknown leaf) — honest null derived fields.
    const point: ScorePoint = { at: opts.asOf, percentileRaw: null, cappedPercentile: null };
    return {
      leafId,
      raw: { value: rawValue, unit },
      rawSource: opts.source,
      contributingSetIds: opts.contributingSetIds,
      normalized: undefined,
      normalizerMethod: leaf?.normalizer.method,
      normalizerVersion: leaf?.normalizer.version,
      percentileRaw: null,
      cappedPercentile: null,
      tier: null,
      isPeak: false,
      buildSnapshot: build,
      confidence: null,
      distributionSource: undefined,
      distributionId: undefined,
      computedAt: opts.asOf,
      state: opts.state,
      coverage: 0,
      eligible: true,
      history: [...priorHistory, point],
    };
  }

  const normalized = normalizedOf(rawValue, dist);
  const percentileRaw = percentileInGaussian(rawValue, dist);
  const cappedPercentile = Math.min(percentileRaw, PEAK_CAP);
  const tier = tierForPercentile(percentileRaw);
  const isPeak = percentileRaw >= PEAK_CAP;

  const confidence = leafConfidence(leaf, dist, {
    distributionDepth: distributionDepthOf(dist),
    measurementQuality: mq,
    recency: recencyFactor(daysSince, leaf.staleAfterDays),
    inferenceChainLength: icl,
  });

  const state = resolveLeafState(leaf, opts.state, daysSince);

  const point: ScorePoint = { at: opts.asOf, percentileRaw, cappedPercentile, normalizedValue: normalized };

  return {
    leafId,
    raw: { value: rawValue, unit },
    rawSource: opts.source,
    contributingSetIds: opts.contributingSetIds,
    normalized,
    normalizerMethod: leaf.normalizer.method,
    normalizerVersion: leaf.normalizer.version,
    percentileRaw,
    cappedPercentile,
    tier,
    isPeak,
    buildSnapshot: build,
    confidence,
    distributionSource: dist.curveProvenance,
    distributionId: dist.distributionId,
    computedAt: opts.asOf,
    state,
    coverage: 1, // a tested leaf fully covers itself
    eligible: true,
    history: [...priorHistory, point],
  };
}

/** §2.6 — effective confidence used in aggregation: floored at CONF_FLOOR. */
export function effConf(confidence: number | null): number {
  return Math.max(confidence ?? CONF_FLOOR, CONF_FLOOR);
}
