// Calibration guard for the tier-anchored cohort curves (§5.3). The curves are fit
// THROUGH the capability ladder (beginner→elite at TIER_PCTL) so the median is an
// average person, not the trained-intermediate tier. These tests pin the resulting
// percentiles to intuitive landmarks so a future seed edit can't silently re-introduce
// the "everything reads ~1st percentile" bias.
//
// Runs under `bun test`; excluded from the production tsc build.

import { test, expect } from "bun:test";
import { lookupCohortDist } from "./index";
import { percentileInGaussian } from "../../engine/score";
import { buildCohort } from "../../engine/cohort";
import type { BuildSnapshot } from "../../types";

const male: BuildSnapshot = {
  sex: "male", heightCm: 178, birthDate: "1996-01-01", ageYears: 30,
  bodyweightKg: null, bodyFatPct: null, ffmi: null, capturedAt: "2026-06-15T00:00:00Z", source: "manual",
};
const female: BuildSnapshot = { ...male, sex: "female", heightCm: 164 };

const pct = (raw: number, leaf: string, b: BuildSnapshot): number => {
  const d = lookupCohortDist(leaf, buildCohort(b));
  if (!d) throw new Error(`no dist for ${leaf}`);
  return percentileInGaussian(raw, d);
};
const meanOf = (leaf: string, b: BuildSnapshot): number => {
  const d = lookupCohortDist(leaf, buildCohort(b));
  if (!d) throw new Error(`no dist for ${leaf}`);
  return d.mean;
};

// ── strength: median = average person, not intermediate lifter ─────────────────
test("male bench median is ~1.0x bodyweight (≈79kg), not the ~1.23x intermediate tier", () => {
  expect(meanOf("strength.bench_1rm", male)).toBeGreaterThan(68);
  expect(meanOf("strength.bench_1rm", male)).toBeLessThan(90);
});

test("male bench percentiles land at intuitive places", () => {
  expect(pct(60, "strength.bench_1rm", male)).toBeGreaterThan(0.15); // 132 lb: below avg, not bottom
  expect(pct(60, "strength.bench_1rm", male)).toBeLessThan(0.4);
  expect(pct(100, "strength.bench_1rm", male)).toBeGreaterThan(0.65); // 220 lb: clearly above avg
  expect(pct(100, "strength.bench_1rm", male)).toBeLessThan(0.83);
  expect(pct(140, "strength.bench_1rm", male)).toBeGreaterThan(0.93); // 308 lb: near-elite
});

test("the intermediate tier sits well above average and elite is the top few percent", () => {
  // male bench: intermediate 1.23xBW ≈ 95kg, elite 1.91xBW ≈ 148kg (repBW ≈ 77.6)
  expect(pct(95, "strength.bench_1rm", male)).toBeGreaterThan(0.6);
  expect(pct(95, "strength.bench_1rm", male)).toBeLessThan(0.8);
  expect(pct(148, "strength.bench_1rm", male)).toBeGreaterThan(0.95);
});

test("female bench is calibrated on the female ladder", () => {
  expect(pct(40, "strength.bench_1rm", female)).toBeGreaterThan(0.35); // ~88 lb: near median
  expect(pct(40, "strength.bench_1rm", female)).toBeLessThan(0.6);
  expect(pct(60, "strength.bench_1rm", female)).toBeGreaterThan(0.72); // 132 lb female bench is strong
});

test("female strength curves are not pathologically wide (no large sub-zero tail)", () => {
  // CV < 0.5 ⇒ P(load < 0) < ~2.3%. The old female ladder (e.g. bench 0.28→1.53×BW)
  // produced CV ~0.6–0.74 and 4–9% implied negative 1RM mass; the corrected ladder fixes it.
  for (const lift of ["bench_1rm", "squat_1rm", "deadlift_1rm", "ohp_1rm"]) {
    const d = lookupCohortDist(`strength.${lift}`, buildCohort(female));
    expect(d).not.toBeNull();
    expect(d!.sd / d!.mean).toBeLessThan(0.5);
  }
});

// ── aerobic: ordinary times are no longer bottom-percentile ────────────────────
test("a 30-minute 5K is mid-pack for a 30yo male, not ~1st percentile", () => {
  const p = pct(1800, "aerobic.5k", male); // 30:00
  expect(p).toBeGreaterThan(0.12); // the bug put this at ~0.009
  expect(p).toBeLessThan(0.42);
  expect(pct(1200, "aerobic.5k", male)).toBeGreaterThan(0.82); // 20:00 is strong
});

test("running percentile respects direction (faster = higher)", () => {
  expect(pct(1200, "aerobic.5k", male)).toBeGreaterThan(pct(1800, "aerobic.5k", male));
});

test("marathon median matches real-world finish times (~4:20), not the old 3:40", () => {
  expect(meanOf("aerobic.marathon", male)).toBeGreaterThan(14400); // > 4:00:00
  expect(meanOf("aerobic.marathon", male)).toBeLessThan(16800); // < 4:40:00
  expect(pct(14400, "aerobic.marathon", male)).toBeGreaterThan(0.55); // a 4:00 marathon is above average
  expect(pct(18000, "aerobic.marathon", male)).toBeLessThan(0.4); // a 5:00 marathon is below average
});
