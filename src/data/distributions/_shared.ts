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
