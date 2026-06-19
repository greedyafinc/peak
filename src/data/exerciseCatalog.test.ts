import { test, expect } from "bun:test";
import { EXERCISE_BY_ID } from "./exercises";
import { matchesQuery } from "./exerciseCatalog";

const ex = (id: string) => {
  const e = EXERCISE_BY_ID[id];
  if (!e) throw new Error(`missing exercise ${id}`);
  return e;
};

test("exercise search ignores hyphen, spacing, and plural differences", () => {
  expect(matchesQuery(ex("pullup"), "pull ups")).toBe(true);
  expect(matchesQuery(ex("pullup"), "pull-up")).toBe(true);
  expect(matchesQuery(ex("pullup"), "pullup")).toBe(true);
  expect(matchesQuery(ex("pushup"), "push ups")).toBe(true);
});

test("exercise search matches aliases and ids with the same normalization", () => {
  expect(matchesQuery(ex("barbell-bench-press"), "flat-bench")).toBe(true);
  expect(matchesQuery(ex("lat-pulldown"), "lat pull down")).toBe(true);
  expect(matchesQuery(ex("captains-chair-knee-raise"), "captain chair")).toBe(true);
});

test("multi-word exercise searches can match terms across metadata", () => {
  expect(matchesQuery(ex("pullup"), "bodyweight lat")).toBe(true);
  expect(matchesQuery(ex("dumbbell-bench-press"), "dumbbell chest")).toBe(true);
});
