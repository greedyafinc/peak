// Peak scoring engine — cohort assignment (§5.2).
//
// A Cohort is the immutable reference frame a normalized value is percentiled
// against. Per the immutable-build principle (§3.1) it is defined ONLY by
// immutable covariates: sex, height (banded), and age (banded). Bodyweight,
// composition, and training age are explicitly excluded (§5.2). The cohort key
// is a deterministic hash of {sex, heightBand, ageBand, schemaVersion} so the
// same build always maps to the same cohort and rankings are reproducible.
//
// PURE / DETERMINISTIC: every age computation takes `asOf` (never Date.now()).

import type { BuildSnapshot, Cohort } from "../types";
import { AGE_BANDS, HEIGHT_BAND_CM, COHORT_SCHEMA_VERSION } from "../constants";

/**
 * §2.8 / §5.2 — derive whole-year age from birthDate at a reference instant.
 * birthDate is the source of truth for age (never a frozen int), so age-band
 * crossings are unambiguous even a day either side of a birthday.
 */
export function ageYearsFrom(birthDate: string, asOf?: string): number {
  const born = new Date(birthDate);
  const at = asOf ? new Date(asOf) : new Date();
  let age = at.getUTCFullYear() - born.getUTCFullYear();
  const mDelta = at.getUTCMonth() - born.getUTCMonth();
  if (mDelta < 0 || (mDelta === 0 && at.getUTCDate() < born.getUTCDate())) age -= 1;
  return age < 0 ? 0 : age;
}

/**
 * §5.2 — map an age in years to its band id (e.g. "25-34"). Bands are half-open
 * lower-inclusive [lo, hi); the final band ("65+") catches the open upper end.
 */
export function ageBandOf(ageYears: number): string {
  for (const b of AGE_BANDS) {
    if (ageYears >= b.lo && ageYears < b.hi) return b.id;
  }
  // Below the first band's lower edge → clamp to the youngest band (honest cohort
  // assignment; the engine never produces a missing band for a present age).
  return AGE_BANDS[0].id;
}

/**
 * §5.2 — map height in cm to a fixed-width band label, e.g. "175-180". Banding
 * is HEIGHT_BAND_CM-wide; adjacent-band kernel smoothing is the data layer's job
 * (it lives in lookupCohortDist), not the cohort key's.
 */
export function heightBandOf(heightCm: number): string {
  const lo = Math.floor(heightCm / HEIGHT_BAND_CM) * HEIGHT_BAND_CM;
  return `${lo}-${lo + HEIGHT_BAND_CM}`;
}

/**
 * §5.2 — the immutable reference frame passed to the data layer. Note the
 * Cohort carries the *raw* heightCm and ageYears (the data layer interpolates /
 * kernel-smooths across bands itself); the *banded* values are only for the
 * stable cohort KEY below.
 */
export function buildCohort(build: BuildSnapshot): Cohort {
  return {
    sex: build.sex,
    heightCm: build.heightCm,
    ageYears: ageYearsFrom(build.birthDate, build.capturedAt),
  };
}

/**
 * §5.2 — the cohort tuple: everything that goes into the hash. schemaVersion is
 * part of the tuple AND the hash so versioned recompute (§5.7) is reproducible.
 */
export function cohortTuple(build: BuildSnapshot): {
  sex: string;
  heightBand: string;
  ageBand: string;
  schemaVersion: string;
} {
  const ageYears = ageYearsFrom(build.birthDate, build.capturedAt);
  return {
    sex: build.sex,
    heightBand: heightBandOf(build.heightCm),
    ageBand: ageBandOf(ageYears),
    schemaVersion: COHORT_SCHEMA_VERSION,
  };
}

/**
 * §5.2 — a deterministic, stable string hash of the cohort tuple. Not a
 * cryptographic hash; just a reproducible, collision-resistant-enough key for an
 * on-device app (FNV-1a over the canonical tuple string). The same build always
 * yields the same key.
 */
export function cohortKeyString(build: BuildSnapshot): string {
  const t = cohortTuple(build);
  const canonical = `${t.sex}|${t.heightBand}|${t.ageBand}|${t.schemaVersion}`;
  // FNV-1a 32-bit.
  let h = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const hex = (h >>> 0).toString(16).padStart(8, "0");
  return `cohort_${hex}`;
}

/**
 * §5.2 / §6.7 — both the tuple and its hash, matching the BiometricProfile
 * shape (`cohort` tuple + `cohortKey` hash). The combined return satisfies the
 * "return both" requirement of the engine contract.
 */
export function cohortKeyOf(build: BuildSnapshot): {
  sex: string;
  heightBand: string;
  ageBand: string;
  schemaVersion: string;
  key: string;
} {
  return { ...cohortTuple(build), key: cohortKeyString(build) };
}
