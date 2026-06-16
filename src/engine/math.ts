// Peak — shared pure math helpers. No React, no side effects, trivially testable.
// The single home for small numeric utilities that were previously copy-pasted across
// the engine, components, and screens.

import { INFER } from "../constants";

/**
 * Epley estimated 1RM from a weight × reps set — the ONE canonical formula, used for both
 * scoring (per-set inference) and UI display. A 1-rep (or 0-rep) set returns its own weight.
 * The rep divisor lives in INFER.epleyDivisor so tuning is a single edit.
 */
export function est1RM(weightKg: number, reps: number): number {
  const r = reps > 0 ? reps : 1;
  return weightKg * (1 + r / INFER.epleyDivisor);
}

/** Round to one decimal place. */
export const round1 = (v: number): number => Math.round(v * 10) / 10;
