// Peak — shared helpers for the cohort-conditioned distribution layer.
// Pure functions only; no side effects, no network.

import type { Cohort, CurveProvenance, DistributionId, SeedSourceId, Sex } from "../../types";
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
 * Strength is roughly flat through the mid-30s, then declines ~0.7%/yr, steepening
 * past 60 (sarcopenia). Modeled as a piecewise multiplier on the cohort mean.
 * Source: NIH/Harvard Health sarcopenia (3–8%/decade after 30).
 */
export function strengthAgeFactor(ageYears: number): number {
  if (ageYears <= 34) return ageYears < 20 ? 0.95 : 1.0; // teens slightly below peak
  if (ageYears <= 60) return 1.0 - 0.007 * (ageYears - 34); // ~0.7%/yr
  // steepen after 60
  const at60 = 1.0 - 0.007 * (60 - 34);
  return Math.max(0.45, at60 - 0.013 * (ageYears - 60));
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
