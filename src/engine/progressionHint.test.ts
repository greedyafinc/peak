import { test, expect } from "bun:test";
import {
  buildFeedbackCoachSuggestion,
  buildPlateauCoachSuggestion,
  buildProgressionSuggestion,
  collectTopPerformances,
  easierAlternativeFor,
  isProgressionPlateau,
  PLATEAU_MIN_SESSIONS,
} from "./progressionHint";
import type { BuildSnapshot, Session, SetRecord } from "../types";

const build: BuildSnapshot = {
  sex: "male", heightCm: 178, birthDate: "1996-01-01", ageYears: 30,
  bodyweightKg: 80, bodyFatPct: null, ffmi: null,
  capturedAt: "2026-06-01T00:00:00.000Z", source: "manual",
};

const set = (i: number, weightKg: number | null, reps: number): SetRecord => ({
  id: `set${i}`, seq: i, weight: weightKg != null ? { value: weightKg, unit: "kg" } : null, reps, rpe: null, restSec: null, targetHit: null,
});

function benchSession(id: string, day: string, weightKg: number, reps: number): Session {
  return {
    id, seq: 1, createdAt: `${day}T18:00:00.000Z`, localDay: day,
    type: "Gym", title: "Push", build, composition: null,
    entries: [{ id: "e1", exerciseId: "barbell-bench-press", sets: [set(0, weightKg, reps), set(1, weightKg, reps - 1)] }],
  };
}

test("collectTopPerformances returns newest-first top sets", () => {
  const sessions = [
    benchSession("s1", "2026-06-10", 100, 8),
    benchSession("s2", "2026-06-03", 100, 5),
  ];
  const tops = collectTopPerformances("barbell-bench-press", sessions, 80);
  expect(tops.length).toBe(2);
  expect(tops[0].reps).toBe(8);
  expect(tops[1].reps).toBe(5);
});

test("isProgressionPlateau is false with fewer than min sessions", () => {
  const sessions = [
    benchSession("s1", "2026-06-10", 100, 8),
    benchSession("s2", "2026-06-03", 100, 8),
  ];
  expect(isProgressionPlateau("barbell-bench-press", sessions, 80)).toBe(false);
});

test("isProgressionPlateau is true when top set matches across sessions", () => {
  const sessions = [
    benchSession("s1", "2026-06-10", 100, 8),
    benchSession("s2", "2026-06-03", 100, 8),
    benchSession("s3", "2026-05-27", 100, 8),
  ];
  expect(isProgressionPlateau("barbell-bench-press", sessions, 80)).toBe(true);
});

test("isProgressionPlateau is false when load or reps drift", () => {
  const sessions = [
    benchSession("s1", "2026-06-10", 100, 8),
    benchSession("s2", "2026-06-03", 100, 8),
    benchSession("s3", "2026-05-27", 97.5, 8),
  ];
  expect(isProgressionPlateau("barbell-bench-press", sessions, 80)).toBe(false);
});

test("live done sets can complete the plateau count mid-session", () => {
  const sessions = [
    benchSession("s1", "2026-06-03", 100, 8),
    benchSession("s2", "2026-05-27", 100, 8),
  ];
  const live = [{ weightKg: 100, reps: 8 }];
  expect(isProgressionPlateau("barbell-bench-press", sessions, 80, live, PLATEAU_MIN_SESSIONS)).toBe(true);
});

test("buildPlateauCoachSuggestion prefers +1 rep in moderate rep ranges", () => {
  const sessions = [
    benchSession("s1", "2026-06-10", 100, 8),
    benchSession("s2", "2026-06-03", 100, 8),
    benchSession("s3", "2026-05-27", 100, 8),
  ];
  const s = buildPlateauCoachSuggestion("barbell-bench-press", sessions, "metric", 80)!;
  expect(s).not.toBeNull();
  expect(s.adjust.reps).toBe(9);
  expect(s.title).toContain("rep");
});

test("buildPlateauCoachSuggestion prefers load when reps are high", () => {
  const sessions = [
    benchSession("s1", "2026-06-10", 60, 12),
    benchSession("s2", "2026-06-03", 60, 12),
    benchSession("s3", "2026-05-27", 60, 12),
  ];
  const s = buildPlateauCoachSuggestion("barbell-bench-press", sessions, "metric", 80)!;
  expect(s.adjust.weightKg).toBeCloseTo(62.5, 6);
  expect(s.adjust.reps).toBe(12);
});

test("buildProgressionSuggestion legacy wrapper still works", () => {
  const sessions = [
    benchSession("s1", "2026-06-10", 100, 8),
    benchSession("s2", "2026-06-03", 100, 8),
    benchSession("s3", "2026-05-27", 100, 8),
  ];
  const s = buildProgressionSuggestion("barbell-bench-press", sessions, "metric", 80)!;
  expect(s.kind).toBe("reps");
  expect(s.suggestReps).toBe(9);
});

test("too_easy feedback suggests a rep or load bump from reference set", () => {
  const s = buildFeedbackCoachSuggestion(
    "too_easy",
    "barbell-bench-press",
    [],
    "metric",
    80,
    [{ weightKg: 100, reps: 8 }],
  )!;
  expect(s.source).toBe("too_easy");
  expect(s.adjust.reps).toBe(9);
});

test("too_hard feedback suggests fewer reps first", () => {
  const s = buildFeedbackCoachSuggestion(
    "too_hard",
    "barbell-bench-press",
    [],
    "metric",
    80,
    [{ weightKg: 100, reps: 8 }],
  )!;
  expect(s.source).toBe("too_hard");
  expect(s.adjust.reps).toBe(7);
  expect(s.adjust.weightKg).toBeCloseTo(100, 6);
});

test("too_hard on barbell bench can offer an easier alternative", () => {
  const alt = easierAlternativeFor("barbell-bench-press");
  expect(alt).not.toBeNull();
  expect(alt!.exerciseId).not.toBe("barbell-bench-press");
});
