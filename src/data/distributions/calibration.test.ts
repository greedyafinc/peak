// Calibration guard for the strength reference + dimension tier-anchored curves (§5.3).
// Strength is scored per MOVEMENT against its own ×bodyweight standard, anchored to GENERAL-
// POPULATION percentiles and fit in log1p space (strength is right-skewed & zero-floored).
// These tests pin the result to intuitive landmarks so a future edit can't silently
// re-introduce either historical bug: (a) ordinary lifts reading ~1st percentile, or
// (b) isolation lifts reading ~99th via the old compound-proxy `frac` mismatch.
//
// Runs under `bun test`; excluded from the production tsc build.

import { test, expect } from "bun:test";
import { lookupCohortDist } from "./index";
import { percentileInGaussian } from "../../engine/score";
import { buildCohort } from "../../engine/cohort";
import { inferMuscleStrength } from "../../engine/infer";
import type { BuildSnapshot, Session } from "../../types";

const male: BuildSnapshot = {
  sex: "male", heightCm: 178, birthDate: "1996-01-01", ageYears: 30,
  bodyweightKg: 80, bodyFatPct: null, ffmi: null, capturedAt: "2026-06-15T00:00:00Z", source: "manual",
};
const female: BuildSnapshot = { ...male, sex: "female", heightCm: 164, bodyweightKg: 62 };

const pct = (raw: number, leaf: string, b: BuildSnapshot): number => {
  const d = lookupCohortDist(leaf, buildCohort(b));
  if (!d) throw new Error(`no dist for ${leaf}`);
  return percentileInGaussian(raw, d);
};
/** Median load (kg) of a strength leaf — recovered from log1p space. */
const medianLoad = (leaf: string, b: BuildSnapshot): number => {
  const d = lookupCohortDist(leaf, buildCohort(b));
  if (!d) throw new Error(`no dist for ${leaf}`);
  return d.transform === "log1p" ? Math.expm1(d.mean) : d.mean;
};

const sess = (exerciseId: string, weightKg: number, reps: number, b: BuildSnapshot): Session => ({
  id: "s1", seq: 1, createdAt: "2026-06-10T18:00:00Z", localDay: "2026-06-10", type: "Gym", title: "t",
  build: b, composition: null,
  entries: [{ id: "e1", exerciseId, sets: [{ id: "set1", seq: 1, weight: { value: weightKg, unit: "kg" }, reps, rpe: null, restSec: null, targetHit: null }] }],
});
const musclePct = (exerciseId: string, weightKg: number, reps: number, mg: string, b: BuildSnapshot): number | null => {
  const est = inferMuscleStrength([sess(exerciseId, weightKg, reps, b)], b, "2026-06-15T00:00:00Z");
  return (est as Record<string, { percentileRaw: number | null } | undefined>)[mg]?.percentileRaw ?? null;
};

// ── strength: general-population median, not a trained-lifter median ───────────
test("male bench median is a realistic general-population load (~0.7–0.85×BW), not 1.0×BW", () => {
  const m = medianLoad("strength.bench_1rm", male); // 80 kg male @178
  expect(m).toBeGreaterThan(45);
  expect(m).toBeLessThan(72);
});

test("male bench percentiles land at intuitive general-population places", () => {
  expect(pct(60, "strength.bench_1rm", male)).toBeGreaterThan(0.38); // 132 lb: around the general-pop middle
  expect(pct(60, "strength.bench_1rm", male)).toBeLessThan(0.68);
  expect(pct(100, "strength.bench_1rm", male)).toBeGreaterThan(0.82); // 220 lb: strong vs all men
  expect(pct(100, "strength.bench_1rm", male)).toBeLessThan(0.97);
  expect(pct(140, "strength.bench_1rm", male)).toBeGreaterThan(0.97); // 308 lb: near-elite
});

test("heavier always reads higher (direction)", () => {
  expect(pct(140, "strength.bench_1rm", male)).toBeGreaterThan(pct(100, "strength.bench_1rm", male));
  expect(pct(100, "strength.bench_1rm", male)).toBeGreaterThan(pct(60, "strength.bench_1rm", male));
});

test("female strength curves are log1p (right-skewed, zero-floored) — no pathological sub-zero tail", () => {
  // The old linear fit through above-median tiers leaked CV>1.3 / large negative-1RM mass.
  // log1p makes the distribution strictly positive: a near-zero load reads near the 0th pct
  // and the curve is proper, by construction.
  for (const lift of ["bench_1rm", "squat_1rm", "deadlift_1rm", "ohp_1rm"]) {
    const d = lookupCohortDist(`strength.${lift}`, buildCohort(female));
    expect(d).not.toBeNull();
    expect(d!.transform).toBe("log1p");
    expect(pct(1, `strength.${lift}`, female)).toBeLessThan(0.05); // 1 kg is bottom, not sub-zero
    expect(medianLoad(`strength.${lift}`, female)).toBeGreaterThan(10); // sane positive median
  }
});

// ── inferred per-muscle: the frac-bug regression (isolation must NOT read ~99th) ─
test("an ordinary calf raise is mid-pack, NOT peak (was 99.9th via the squat×0.25 proxy)", () => {
  const p = musclePct("seated-calf-raise", 40, 12, "calves", male); // 88 lb × 12, ordinary
  expect(p).not.toBeNull();
  expect(p!).toBeLessThan(0.85); // the old proxy bug pinned this at ~0.999
  expect(p!).toBeGreaterThan(0.2);
});

test("an ordinary curl and lateral raise are not peak-capped", () => {
  expect(musclePct("dumbbell-curl", 14, 10, "biceps", male)!).toBeLessThan(0.9); // ~30 lb/arm
  expect(musclePct("lateral-raise", 8, 12, "side_delt", male)!).toBeLessThan(0.92); // ~18 lb/arm
});

test("a muscle is scored against its OWN movement standard, not a mismatched compound", () => {
  // Every per-muscle leaf resolves to a non-null, log1p strength dist.
  for (const mg of ["chest", "biceps", "calves", "lat", "side_delt", "triceps", "quads"]) {
    const d = lookupCohortDist(`strength.${mg}`, buildCohort(male));
    expect(d).not.toBeNull();
    expect(d!.transform).toBe("log1p");
  }
});

// ── aerobic: ordinary times are no longer bottom-percentile (unchanged model) ──
test("a 30-minute 5K is mid-pack for a 30yo male, not ~1st percentile", () => {
  const p = pct(1800, "aerobic.5k", male); // 30:00
  expect(p).toBeGreaterThan(0.12);
  expect(p).toBeLessThan(0.42);
  expect(pct(1200, "aerobic.5k", male)).toBeGreaterThan(0.82); // 20:00 is strong
});

test("running percentile respects direction (faster = higher)", () => {
  expect(pct(1200, "aerobic.5k", male)).toBeGreaterThan(pct(1800, "aerobic.5k", male));
});

test("marathon median matches real-world finish times (~4:20), not the old 3:40", () => {
  expect(pct(14400, "aerobic.marathon", male)).toBeGreaterThan(0.55); // a 4:00 marathon is above average
  expect(pct(18000, "aerobic.marathon", male)).toBeLessThan(0.4); // a 5:00 marathon is below average
});
