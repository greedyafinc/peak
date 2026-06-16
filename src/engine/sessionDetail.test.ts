// Guard for the logged-session summary builder (the "expand a logged activity into
// a full page" view model). buildSessionSummary is pure over (data, sessionId); it
// only reads data.sessions, so a minimal data stub is enough.
//
// Runs under bun: `bun test`. Excluded from the production tsc build (tsconfig.json).

import { test, expect } from "bun:test";
import { buildSessionSummary } from "./sessionDetail";
import type { BuildSnapshot, PeakData, Session, SetRecord, CardioSetRecord } from "../types";

const build: BuildSnapshot = {
  sex: "male", heightCm: 178, birthDate: "1996-01-01", ageYears: 30,
  bodyweightKg: null, bodyFatPct: null, ffmi: null,
  capturedAt: "2026-06-15T00:00:00.000Z", source: "manual",
};

const set = (i: number, weightKg: number | null, reps: number, rpe: number | null = null): SetRecord => ({
  id: `set${i}`, seq: i, weight: weightKg != null ? { value: weightKg, unit: "kg" } : null, reps, rpe, restSec: null, targetHit: null,
});

function gymSession(): Session {
  return {
    id: "s1", seq: 1, createdAt: "2026-06-15T18:00:00.000Z", localDay: "2026-06-15",
    type: "Gym", title: "Push Day", build, composition: null,
    entries: [
      { id: "e1", exerciseId: "dumbbell-bench-press", sets: [set(0, 34, 8, 8), set(1, 34, 6)] },
      { id: "e2", exerciseId: "barbell-bench-press", sets: [set(0, 100, 5)] },
    ],
    durationMin: 47, notes: "felt strong",
  };
}

function cardioSession(): Session {
  const cardio: CardioSetRecord[] = [
    { id: "c1", seq: 0, distance: { value: 5, unit: "km" }, duration: { value: 25, unit: "min" }, avgHr: { value: 150, unit: "bpm" }, targetHit: null },
  ];
  return {
    id: "s2", seq: 2, createdAt: "2026-06-15T07:00:00.000Z", localDay: "2026-06-15",
    type: "Cardio", title: "Morning run", build, composition: null, entries: [], cardio,
  };
}

const dataWith = (...sessions: Session[]) => ({ sessions } as unknown as PeakData);

test("returns null for an unknown session id", () => {
  expect(buildSessionSummary(dataWith(gymSession()), "nope")).toBeNull();
});

test("strength totals: per-arm volume doubles, sets and reps sum across entries", () => {
  const v = buildSessionSummary(dataWith(gymSession()), "s1")!;
  expect(v).not.toBeNull();
  expect(v.totalSets).toBe(3);
  expect(v.totalReps).toBe(8 + 6 + 5);
  // dumbbell volume doubles per hand: 34·2·8 + 34·2·6 = 952; barbell: 100·5 = 500.
  expect(v.totalVolumeKg).toBeCloseTo(952 + 500, 6);
});

test("per-exercise top set + est-1RM are computed from the heaviest set", () => {
  const v = buildSessionSummary(dataWith(gymSession()), "s1")!;
  const db = v.exercises.find((e) => e.exerciseId === "dumbbell-bench-press")!;
  expect(db.perArm).toBe(true);
  expect(db.topSetKg).toBe(34);
  expect(db.topSetReps).toBe(8); // 34×8 outranks 34×6 on est-1RM
  expect(db.best1RM).toBeCloseTo(34 * (1 + 8 / 30), 6);
  expect(db.sets[0].rpe).toBe(8);
});

test("muscle emphasis aggregates to 1 and is led by chest for a press session", () => {
  const v = buildSessionSummary(dataWith(gymSession()), "s1")!;
  expect(v.muscles.length).toBeGreaterThan(0);
  const sum = v.muscles.reduce((a, m) => a + m.share, 0);
  expect(sum).toBeCloseTo(1, 6);
  expect(v.muscles[0].group).toBe("chest");
});

test("cardio totals: distance, time and average pace", () => {
  const v = buildSessionSummary(dataWith(cardioSession()), "s2")!;
  expect(v.exercises.length).toBe(0);
  expect(v.cardio.length).toBe(1);
  expect(v.totalDistanceKm).toBeCloseTo(5, 6);
  expect(v.totalCardioSec).toBeCloseTo(1500, 6); // 25 min
  expect(v.avgPaceSecPerKm).toBeCloseTo(300, 6); // 5:00 /km
  expect(v.cardio[0].avgHrBpm).toBe(150);
});
