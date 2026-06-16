// Regression guard for the per-arm load model — the "75 lb dumbbell bench reads as
// 1st percentile" bug. Dumbbell/kettlebell loads are entered PER HAND; the inference
// engine must score them on the barbell-equivalent scale its cohort curves are built
// from (both hands, plus a press uplift), not as a raw single-implement load.
//
// Runs under bun's built-in runner: `bun test`. Excluded from the production tsc build
// (tsconfig.json) since it imports `bun:test`.

import { test, expect } from "bun:test";
import { EXERCISE_BY_ID } from "../data/exercises";
import { effectiveLoadKg, perArmFactor } from "../data/exerciseCatalog";
import { inferMuscleStrength } from "./infer";
import type { BuildSnapshot, Session } from "../types";

const ex = (id: string) => {
  const e = EXERCISE_BY_ID[id];
  if (!e) throw new Error(`missing exercise ${id}`);
  return e;
};

// ── unit: the load model ──────────────────────────────────────────────────────
test("per-arm dumbbell bench doubles both hands and adds the barbell-equiv uplift", () => {
  // 34 kg (≈75 lb) per hand → 68 kg total → ×1.18 barbell-equivalent ≈ 80.24 kg
  expect(effectiveLoadKg(ex("dumbbell-bench-press"), 34)).toBeCloseTo(80.24, 2);
});

test("dumbbell overhead pressing uses the 1.10 uplift, not 1.18", () => {
  expect(effectiveLoadKg(ex("arnold-press"), 20)).toBeCloseTo(44.0, 2); // 20 × 2 × 1.10
});

test("non-press dumbbell work doubles but takes no uplift", () => {
  expect(effectiveLoadKg(ex("incline-dumbbell-curl"), 15)).toBeCloseTo(30, 6); // 15 × 2 × 1.0
});

test("barbell lifts are untouched", () => {
  expect(perArmFactor(ex("barbell-bench-press"))).toBe(1);
  expect(effectiveLoadKg(ex("barbell-bench-press"), 100)).toBe(100);
});

test("two-handed single-implement moves load as a total (no doubling)", () => {
  expect(perArmFactor(ex("goblet-squat"))).toBe(1);
  expect(effectiveLoadKg(ex("goblet-squat"), 40)).toBe(40);
});

// ── end-to-end: the reported symptom through the real inference pipeline ───────
const build: BuildSnapshot = {
  sex: "male",
  heightCm: 178,
  birthDate: "1996-01-01",
  ageYears: 30,
  bodyweightKg: null,
  bodyFatPct: null,
  ffmi: null,
  capturedAt: "2026-06-15T00:00:00.000Z",
  source: "manual",
};

function sessionWith(exerciseId: string, weightKg: number, reps: number): Session {
  return {
    id: "s1",
    seq: 1,
    createdAt: "2026-06-15T18:00:00.000Z",
    localDay: "2026-06-15",
    type: "Gym",
    title: "test",
    build,
    composition: null,
    entries: [
      {
        id: "e1",
        exerciseId,
        sets: [
          { id: "set1", seq: 1, weight: { value: weightKg, unit: "kg" }, reps, rpe: null, restSec: null, targetHit: null },
        ],
      },
    ],
  };
}

test("75 lb/hand dumbbell bench is NOT a bottom-percentile chest", () => {
  const asOf = "2026-06-15T19:00:00.000Z";
  const est = inferMuscleStrength([sessionWith("dumbbell-bench-press", 34, 8)], build, asOf);
  const chest = est.chest?.percentileRaw ?? null;
  // The bug scored this ~0.005 (≈0.5th pct). With the per-arm fix + tier-anchored
  // calibration it lands ~0.75 ("proficient") — a 150 lb-of-dumbbells press is a
  // genuinely above-average chest.
  expect(chest).not.toBeNull();
  expect(chest!).toBeGreaterThan(0.5);
  expect(chest!).toBeLessThan(0.9);
});

test("an equivalent barbell bench and dumbbell bench land within a tier of each other", () => {
  const asOf = "2026-06-15T19:00:00.000Z";
  // 80 kg barbell bench vs 34 kg/hand dumbbells (≈80 kg barbell-equivalent) — should agree.
  const bb = inferMuscleStrength([sessionWith("barbell-bench-press", 80, 8)], build, asOf).chest?.percentileRaw ?? null;
  const db = inferMuscleStrength([sessionWith("dumbbell-bench-press", 34, 8)], build, asOf).chest?.percentileRaw ?? null;
  expect(bb).not.toBeNull();
  expect(db).not.toBeNull();
  expect(Math.abs(bb! - db!)).toBeLessThan(0.1);
});
