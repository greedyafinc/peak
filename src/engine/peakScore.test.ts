// Calibration guard for the Peak Score transform (§2.6).
//
// The Peak Score answers "how close are you to YOUR trained ceiling", which is a different
// question than the population percentile (left untouched). The whole point is that an
// above-average-but-not-elite effort should read mid-pack, not near 100 — so these tests
// pin the curve to intuitive landmarks so a future edit can't silently re-flatten it back
// into "the percentile is the score".
//
// Runs under `bun test`; excluded from the production tsc build.

import { test, expect } from "bun:test";
import { peakScoreFromPercentile } from "./score";
import { PEAK_SCORE } from "../constants";

/** Peak Score on the 0–100 display scale for a given percentile. */
const ps100 = (p: number): number => Math.round((peakScoreFromPercentile(p) as number) * 100);

test("untested percentile → null Peak Score (never fabricated)", () => {
  expect(peakScoreFromPercentile(null)).toBeNull();
});

test("the floor/ceil anchors map to 0 and 100", () => {
  expect(ps100(PEAK_SCORE.floorPctl)).toBe(0); // 20th percentile → 0
  expect(ps100(PEAK_SCORE.ceilPctl)).toBe(100); // 99th percentile ("ultimate you") → 100
});

test("an intermediate-but-not-elite effort reads mid-pack, NOT near the ceiling", () => {
  // ~90th percentile general-population (a solid intermediate lifter) is the case the user
  // flagged as feeling too generous. It must leave real room to grow — well under the 90s.
  const intermediate = ps100(0.9);
  expect(intermediate).toBeGreaterThan(40);
  expect(intermediate).toBeLessThan(75);
});

test("monotonic and reserved-top: harder percentiles score strictly higher, 100 is rare", () => {
  expect(ps100(0.5)).toBeLessThan(ps100(0.85));
  expect(ps100(0.85)).toBeLessThan(ps100(0.97));
  // Top-5% (the old hard cap) is solidly above mid but NOT maxed — 100 is reserved for
  // genuinely near your ceiling (~99.9th for your build at the current harsh setting).
  expect(ps100(0.95)).toBeLessThan(100);
  expect(ps100(0.95)).toBeGreaterThan(50);
});

test("average reads modest, beginner reads low (lots of headroom by design)", () => {
  expect(ps100(0.5)).toBeLessThan(40); // median adult is far from their trained ceiling
  expect(ps100(0.3)).toBeLessThan(20);
});

test("clamped tails stay in range (no NaN/Infinity at the extremes)", () => {
  expect(ps100(0.001)).toBe(0);
  expect(ps100(0.999)).toBe(100);
  expect(peakScoreFromPercentile(0) as number).toBeGreaterThanOrEqual(0);
  expect(peakScoreFromPercentile(1) as number).toBeLessThanOrEqual(1);
});
