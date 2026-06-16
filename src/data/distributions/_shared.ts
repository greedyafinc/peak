// Peak — shared helpers for the cohort-conditioned distribution layer.
// Pure functions only; no side effects, no network.

import type { Cohort, CohortDist, CurveProvenance, DistributionId, SeedSourceId, Sex } from "../../types";
import { AGE_BANDS, HEIGHT_BAND_CM } from "../../constants";

export type Direction = { lowerIsBetter: boolean };

/** Normalize sex to the two-way split the seed tables are keyed on. `unspecified`
 *  falls back to male-coded norms (the more conservative/strength-heavy reference);
 *  this is documented as an assumption on every cohort that hits it. */
export function sexKey(sex: Sex): "male" | "female" {
  return sex === "female" ? "female" : "male";
}

/** Deterministic age-band id (§5.2 AGE_BANDS). */
export function ageBandId(ageYears: number): string {
  for (const b of AGE_BANDS) if (ageYears >= b.lo && ageYears < b.hi) return b.id;
  return AGE_BANDS[AGE_BANDS.length - 1].id; // 65+
}

/** Deterministic 5cm height band id (§5.2). e.g. 178 → "175-180". */
export function heightBandId(heightCm: number): string {
  const lo = Math.floor(heightCm / HEIGHT_BAND_CM) * HEIGHT_BAND_CM;
  return `${lo}-${lo + HEIGHT_BAND_CM}`;
}

/** Deterministic distribution id: `${leafId}|${sex}_${heightBand}_${ageBand}|v1`. */
export function makeDistId(leafId: string, cohort: Cohort, version = 1): DistributionId {
  return `${leafId}|${sexKey(cohort.sex)}_${heightBandId(cohort.heightCm)}_${ageBandId(
    cohort.ageYears,
  )}|v${version}`;
}

/** firstPartyWeight = nObserved / (nObserved + K) (§5.4 blend rule). */
export function firstPartyWeight(nObserved: number, K: number): number {
  if (K <= 0) return 0;
  return nObserved / (nObserved + K);
}

/**
 * Strength/age decline multiplier vs the 25–34 peak band (§5.3).
 * Roughly flat through the mid-30s, then declines ~1%/yr (≈10%/decade), steepening to
 * ~2%/yr past 60. Modeled as a piecewise multiplier on the cohort mean. (The earlier
 * ~0.7%/yr was borrowed from a muscle-MASS figure; maximal STRENGTH declines 2–5× faster
 * than mass — ~10–15%/decade to 70, accelerating after.)
 * Sources: Frontiers in Physiology sarcopenia/dynapenia quantitative review; J. Cachexia
 * Sarcopenia Muscle overview.
 */
export function strengthAgeFactor(ageYears: number): number {
  if (ageYears <= 34) return ageYears < 20 ? 0.95 : 1.0; // teens slightly below peak
  if (ageYears <= 60) return 1.0 - 0.01 * (ageYears - 34); // ~10%/decade
  // steepen after 60 (~20%/decade)
  const at60 = 1.0 - 0.01 * (60 - 34);
  return Math.max(0.4, at60 - 0.02 * (ageYears - 60));
}

/**
 * Generic linear-interpolation helper across an ordered set of (key → value)
 * anchor points. Clamps outside the anchor range. Used to interpolate norms
 * smoothly across age and height rather than snapping to a band edge.
 */
export function interp(x: number, anchors: { x: number; y: number }[]): number {
  const a = [...anchors].sort((p, q) => p.x - q.x);
  if (x <= a[0].x) return a[0].y;
  if (x >= a[a.length - 1].x) return a[a.length - 1].y;
  for (let i = 0; i < a.length - 1; i++) {
    const lo = a[i];
    const hi = a[i + 1];
    if (x >= lo.x && x <= hi.x) {
      const t = (x - lo.x) / (hi.x - lo.x);
      return lo.y + t * (hi.y - lo.y);
    }
  }
  return a[a.length - 1].y;
}

// ── Tier-anchored bell curve (§5.3) ──────────────────────────────────────────
// A cohort curve is fit THROUGH the capability ladder rather than pinned to one
// tier. Each named tier (beginner / novice / intermediate / advanced / elite) is
// placed at the population percentile it actually occupies, and a Gaussian is
// least-squares fit to those (value, percentile) anchors. This is why "average"
// lands at the median, an intermediate lifter/runner reads comfortably above
// average, and elite is the top ~1.5% — instead of the old scheme that put the
// trained-intermediate tier at the median and made ordinary efforts read far too low.
export const TIER_PCTL = [0.2, 0.45, 0.7, 0.9, 0.985]; // beginner..elite

/** Inverse standard-normal CDF (probit) via Acklam's rational approximation (~1e-9). */
export function invNormCdf(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number;
  let r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

/**
 * Least-squares fit of a Gaussian {mean, sd} so each `values[i]` sits at percentile
 * `pctls[i]` on the resulting curve. `lowerIsBetter` flips the percentile→z mapping
 * (a faster time is a HIGHER percentile). Used to anchor cohort curves to the tier
 * ladder (TIER_PCTL) instead of a single tier. Requires values.length === pctls.length ≥ 2.
 */
export function fitGaussianTiers(values: number[], pctls: number[], lowerIsBetter: boolean): { mean: number; sd: number } {
  const n = values.length;
  const z = pctls.map((p) => invNormCdf(lowerIsBetter ? 1 - p : p));
  const mz = z.reduce((s, v) => s + v, 0) / n;
  const mv = values.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (z[i] - mz) * (values[i] - mv);
    sxx += (z[i] - mz) ** 2;
  }
  const slope = sxx > 0 ? sxy / sxx : 0;
  return { mean: mv - slope * mz, sd: Math.abs(slope) };
}

/**
 * Tier-anchored fit in log1p space for right-skewed, zero-floored metrics (rep counts,
 * hold times). Fitting in ln(1+x) space and percentiling there means the curve can never
 * place population mass below zero (the symmetric-Gaussian-over-a-count bug) and a few
 * elite high-rep performers don't drag the median. The returned `transform` must be set
 * on the CohortDist so percentileInGaussian maps the raw value the same way.
 */
export function fitGaussianTiersLog1p(
  values: number[],
  pctls: number[],
  lowerIsBetter: boolean,
): { mean: number; sd: number; transform: "log1p" } {
  const t = values.map((v) => Math.log1p(Math.max(0, v)));
  const { mean, sd } = fitGaussianTiers(t, pctls, lowerIsBetter);
  return { mean, sd, transform: "log1p" };
}

// ── Age-banded tier ladders (the non-strength dimensions) ────────────────────
// A leaf's population curve is published as a 5-tier ladder (beginner→elite) at a few
// representative ages. To score a user we interpolate each tier across age, then fit a
// Gaussian through the ladder at its general-population percentiles (TIER_PCTL-style),
// so the MEDIAN is an average adult — not the trained/athletic reference the old code
// pinned at the mean (the "intermediate-at-median" bug that buried ordinary efforts).

export type AgeTierRow = { age: number; tiers: number[] };

/** Interpolate each tier value across the age anchors at `age` (clamped at the ends). */
export function interpTiers(rows: AgeTierRow[], age: number): number[] {
  const n = rows[0]?.tiers.length ?? 0;
  return Array.from({ length: n }, (_, i) =>
    interp(age, rows.map((r) => ({ x: r.age, y: r.tiers[i] }))),
  );
}

/**
 * Build a cohort {mean, sd, transform?} from an age-banded tier ladder. `skewed` selects
 * the log1p fit for right-skewed, zero-floored metrics (rep counts, hold times, jump
 * heights) so the curve never leaks probability below zero; everything else fits a plain
 * Gaussian. The fit is anchored at `pctls` (the tiers' general-population percentiles).
 */
export function tierLadderDist(
  rows: AgeTierRow[],
  age: number,
  pctls: number[],
  lowerIsBetter: boolean,
  skewed: boolean,
): { mean: number; sd: number; transform?: "log1p" } {
  const tiers = interpTiers(rows, age);
  return skewed
    ? fitGaussianTiersLog1p(tiers, pctls, lowerIsBetter)
    : fitGaussianTiers(tiers, pctls, lowerIsBetter);
}

/**
 * A leaf scored from an age-banded, population-anchored tier ladder. This is the shared
 * shape for every non-strength performed dimension (power, anaerobic, muscular endurance,
 * balance, mobility) — the data layer just declares the ladder and `ladderCohortDist`
 * turns it into a cohort distribution. Median = an average adult (the ladder is anchored at
 * general-population percentiles), NOT the trained reference the old code pinned at the mean.
 */
export type LadderLeaf = {
  male: AgeTierRow[];
  female: AgeTierRow[];
  pctls: number[];        // general-population percentile of each tier (beginner→elite)
  lowerIsBetter: boolean;
  skewed: boolean;        // right-skewed, zero-floored (rep counts, hold times, jumps) → log1p fit
  seedSources: SeedSourceId[];
  confidenceBasis: number;
  dataSourceLabel: string;
  assumptions: string[];
};

/** Build a CohortDist for a leaf from its age-banded tier ladder (the shared non-strength path). */
export function ladderCohortDist(leafId: string, cohort: Cohort, K: number, leaf: LadderLeaf): CohortDist {
  const sk = sexKey(cohort.sex);
  const rows = sk === "female" ? leaf.female : leaf.male;
  const { mean, sd, transform } = tierLadderDist(rows, cohort.ageYears, leaf.pctls, leaf.lowerIsBetter, leaf.skewed);
  const nObserved = 0;
  const sexNote =
    cohort.sex === "unspecified" ? ["Sex unspecified → male-coded norms used as fallback."] : [];
  return {
    mean, sd, transform,
    lowerIsBetter: leaf.lowerIsBetter,
    seedSources: leaf.seedSources,
    curveProvenance: "seed_population",
    confidenceBasis: leaf.confidenceBasis,
    distributionId: makeDistId(leafId, cohort),
    K, nObserved, firstPartyWeight: firstPartyWeight(nObserved, K),
    dataSourceLabel: leaf.dataSourceLabel,
    assumptions: [...leaf.assumptions, ...sexNote],
  };
}

/** Shared scaffolding most builders fill in. */
export type CohortDistCore = {
  mean: number;
  sd: number;
  lowerIsBetter: boolean;
  seedSources: SeedSourceId[];
  curveProvenance: CurveProvenance;
  confidenceBasis: number;
  K: number;
  nObserved: number;
  dataSourceLabel: string;
  assumptions?: string[];
};
