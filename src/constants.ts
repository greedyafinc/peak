// Peak — versioned reference constants (weights/1, blend/1, momentum/1, infer/1,
// proj/1, xdim/1). Per the spec these are reference DATA surfaced in the
// methodology note (§5.6), not magic numbers buried in logic. Tuning is tracked
// as OQ-13; the values below are the ratified v1 defaults.

import type { DimensionId, TierId } from "./types";

// Canonical conventions #2 / #4 / Decision #6.
export const PEAK_CAP = 0.95;

// §2.6 — Peak Score anchors ("closeness to the ultimate you", NOT a percentile).
//
// The headline Peak Score answers a DIFFERENT question than the percentiles shown on
// leaves/dimensions. Percentiles say "where you stand vs. the general population for your
// build" and are left untouched. The Peak Score says "how close are you to YOUR trained
// ceiling" — so an intermediate lifter who already beats most untrained adults (a high
// percentile) is still only part-way to their potential, and should read mid-pack, not 90s.
//
// Mechanically: the population percentile is mapped into z-space (which un-compresses the
// crowded top of the percentile scale — 90th and 99th are miles apart in capability but
// adjacent in percentile), then measured as fractional progress from an out-of-shape FLOOR
// to a realistic trained CEILING. `floorPctl` → Peak score 0, `ceilPctl` → Peak score 100.
//
// THESE TWO NUMBERS ARE THE HARSHNESS DIAL (OQ-13):
//   • raise `ceilPctl` toward 1.0  → harder to reach 100 (a loftier "ultimate you")
//   • raise `floorPctl`            → average efforts score lower (steeper bottom)
// Current (harsh): 99.9th-percentile-for-your-build = "ultimate you" = 100; 30th = 0.
// At this setting an intermediate (~90th) reads ~50, advanced (~98.5th) ~75, average (50th) ~15.
export const PEAK_SCORE = {
  floorPctl: 0.3, // build-relative percentile that maps to Peak score 0
  ceilPctl: 0.999, // build-relative percentile that maps to Peak score 100 ("ultimate you")
} as const;
export const MODELS = {
  weights: "weights/1",
  correlation: "xdim/1",
  projection: "proj/1",
  inference: "infer/1",
  blend: "blend/1",
  momentum: "momentum/1",
} as const;

// §2.6 — single-leaf floor for a credible first score.
export const MIN_HEADLINE_LEAVES = 3;
export const MIN_HEADLINE_DIMENSIONS = 2;

// §2.6 — confidence-floor rule (weights/1). Prevents cold-start dimensions from
// structurally suppressing a specialist's headline.
export const CONF_FLOOR = 0.5;

// §2.3 / §5.1 — tier bands on the UNCAPPED percentileRaw. Half-open [lo, hi),
// lower-inclusive; a value exactly on a boundary belongs to the UPPER band.
export const TIER_BANDS: { tier: TierId; lo: number; hi: number }[] = [
  { tier: "foundation", lo: 0.0, hi: 0.25 },
  { tier: "developing", lo: 0.25, hi: 0.5 },
  { tier: "proficient", lo: 0.5, hi: 0.75 },
  { tier: "advanced", lo: 0.75, hi: 0.9 },
  { tier: "elite", lo: 0.9, hi: 0.95 },
  { tier: "peak", lo: 0.95, hi: 1.0001 }, // inclusive of 1.0
];

// Working-title tier display names (OQ-5 — bands are fixed, names are cosmetic).
export const TIER_LABEL: Record<TierId, string> = {
  foundation: "Foundation",
  developing: "Developing",
  proficient: "Proficient",
  advanced: "Advanced",
  elite: "Elite",
  peak: "Peak",
};

export const TIER_COLOR: Record<TierId, string> = {
  foundation: "#5a6066",
  developing: "#5aa9ff",
  proficient: "#3dffb0",
  advanced: "#8fd14f",
  elite: "#ffd23f",
  peak: "#c6ff3d",
};

// §2.6 — dimWeight (weights/1). body_composition elevated (1.3) because
// bodyweight is excluded from strength normalization (§3.2). consistency is n/a
// (own track). balance/agility low because norms are thin/sparse.
export const DIM_WEIGHT: Record<DimensionId, number> = {
  strength: 1.0,
  power: 0.9,
  muscular_endurance: 0.9,
  aerobic: 1.0,
  anaerobic: 0.9,
  mobility: 0.7,
  balance: 0.5,
  agility: 0.4,
  body_composition: 1.3,
  consistency: 0,
};

// §5.4 — per-dimension shrinkage constant K (blend/1). firstPartyWeight =
// nObserved / (nObserved + K). Smaller where the seed is weakest (strength,
// balance, agility), larger where the seed is strong (composition).
export const BLEND_K: Record<DimensionId, number> = {
  aerobic: 200,
  anaerobic: 200,
  muscular_endurance: 150,
  power: 150,
  body_composition: 300,
  mobility: 150,
  balance: 80,
  agility: 80,
  strength: 100,
  consistency: 0,
};

// §2.7 — momentum/1 weights.
export const MOMENTUM = {
  wStreak: 0.4,
  wActive: 0.4,
  wAdherence: 0.2,
  streakHalfLifeDays: 7, // f(streak) = 1 - 0.5^(streakDays/7)
} as const;

// §4.3 — infer/1 constants.
export const INFER = {
  recencyHalfLifeDays: 28,
  topK: 5,
  epleyDivisor: 30, // est1RM = weight * (1 + reps/30)
  // A muscle is only inferred from exercises that MEANINGFULLY load it (muscleWeight
  // ≥ this). Incidental contributions (e.g. squat → hamstrings 0.12) leave the muscle
  // `untested` (honest: under-demonstrated ≠ tested-and-weak) rather than cratering it.
  minAttribution: 0.15,
} as const;

// §2.6.1 — proj/1.
export const PROJ = {
  windowDays: 84,
  minPoints: 4,
} as const;

// §5.2 — height banding (cm) and age bands.
export const HEIGHT_BAND_CM = 5;
export const AGE_BANDS: { id: string; lo: number; hi: number }[] = [
  { id: "18-24", lo: 18, hi: 25 },
  { id: "25-34", lo: 25, hi: 35 },
  { id: "35-44", lo: 35, hi: 45 },
  { id: "45-54", lo: 45, hi: 55 },
  { id: "55-64", lo: 55, hi: 65 },
  { id: "65+", lo: 65, hi: 200 },
];

export const COHORT_SCHEMA_VERSION = "cohort/1";

// §2.4 — default per-family staleness horizons (OQ-12). Strength/inferred drift
// with training (shorter); composition is slow (longer).
export const STALE_DAYS: Partial<Record<DimensionId, number>> = {
  strength: 42,
  power: 60,
  muscular_endurance: 42,
  aerobic: 45,
  anaerobic: 45,
  mobility: 60,
  balance: 60,
  agility: 60,
  body_composition: 120,
};
