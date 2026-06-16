// Peak — shared scaling helpers for the detail-screen SVG charts. The projection
// chart and the trend sparkline both map a numeric series onto a pixel axis; the
// min/max scan and the linear value→pixel map are extracted here so the two stay
// in lockstep. Pure math, no theme/DOM deps.

/** Min and max of a numeric series (the data domain before any padding). */
export function normalizeRange(values: number[]): { min: number; max: number } {
  return { min: Math.min(...values), max: Math.max(...values) };
}

/**
 * Linear map from a value domain to a pixel range. `invert` flips the fraction so
 * a larger value maps toward `rangeMin` (used when "up" must mean "better" even
 * though SVG y grows downward). A zero-width domain is treated as width 1 so a
 * flat series collapses cleanly instead of dividing by zero.
 */
export function makeScaler(
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
  invert = false,
): (v: number) => number {
  const span = (domainMax - domainMin) || 1;
  return (v: number) => {
    const f = (v - domainMin) / span;
    const ff = invert ? 1 - f : f;
    return rangeMin + ff * (rangeMax - rangeMin);
  };
}
