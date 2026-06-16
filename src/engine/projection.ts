// Peak scoring engine — goal/ETA projection (§2.6.1, proj/1).
//
// OLS linear regression of a leaf's percentileRaw (or normalizedValue) trajectory
// against time, over a trailing window (PROJ.windowDays). Guards:
//   • < PROJ.minPoints points in window → "insufficient_data" (never a guess)
//   • |slope| < slope std-error          → "no_trend" (plateau, never ∞/fabricated)
//   • otherwise → etaWeeks RANGE from the slope std-error, with a `saturating`
//     flag when the projection runs into the 0.95 cap.
//
// PURE / DETERMINISTIC given (history, opts).

import type { Projection, ScorePoint } from "../types";
import { PROJ, PEAK_CAP, MODELS } from "../constants";
import { round1 } from "./math";

const MS_PER_DAY = 86_400_000;
const DAYS_PER_WEEK = 7;

type Pt = { t: number; y: number }; // t in days from window start, y the metric

/**
 * Extract regression points from a ScorePoint[] within the trailing window. Uses
 * percentileRaw by default (the canonical metric); falls back to normalizedValue
 * when percentileRaw is null for a point.
 */
function pointsFromHistory(history: ScorePoint[], asOf: string, windowDays: number): { pts: Pt[]; latestY: number | null } {
  const asOfMs = new Date(asOf).getTime();
  const windowStartMs = asOfMs - windowDays * MS_PER_DAY;
  const pts: Pt[] = [];
  let latestY: number | null = null;
  let latestMs = -Infinity;

  for (const p of history) {
    const ms = new Date(p.at).getTime();
    if (ms < windowStartMs || ms > asOfMs) continue;
    const y = p.percentileRaw ?? p.normalizedValue ?? null;
    if (y == null) continue;
    pts.push({ t: (ms - windowStartMs) / MS_PER_DAY, y });
    if (ms >= latestMs) {
      latestMs = ms;
      latestY = y;
    }
  }
  return { pts, latestY };
}

type Fit = { slopePerDay: number; intercept: number; slopeStdErr: number };

/** Ordinary least squares with the slope standard error. */
function olsFit(pts: Pt[]): Fit | null {
  const n = pts.length;
  if (n < 2) return null;
  const meanT = pts.reduce((a, p) => a + p.t, 0) / n;
  const meanY = pts.reduce((a, p) => a + p.y, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (const p of pts) {
    sxx += (p.t - meanT) ** 2;
    sxy += (p.t - meanT) * (p.y - meanY);
  }
  if (sxx <= 0) return null; // all points at the same time → no temporal trend
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanT;

  // Residual variance → slope standard error.
  let sse = 0;
  for (const p of pts) {
    const pred = intercept + slope * p.t;
    sse += (p.y - pred) ** 2;
  }
  const dof = n - 2;
  const resVar = dof > 0 ? sse / dof : 0;
  const slopeStdErr = Math.sqrt(resVar / sxx);
  return { slopePerDay: slope, intercept, slopeStdErr };
}

/**
 * §2.6.1 — project a leaf's trajectory to its 0.95 cap (the achievable ceiling).
 * Returns an ETA range to reach PEAK_CAP, flagging saturation. Convenience wrapper
 * over projectToTarget with the cap as the target.
 */
export function project(history: ScorePoint[], opts?: { asOf?: string; windowDays?: number }): Projection {
  return projectToTarget(history, PEAK_CAP, opts);
}

/**
 * §2.6.1 — project the ETA (range) to reach a target percentileRaw. The ETA range
 * derives from the slope ± its standard error; the optimistic edge uses
 * slope+stderr, the pessimistic edge slope−stderr (only when still positive).
 */
export function projectToTarget(
  history: ScorePoint[],
  targetPercentileRaw: number,
  opts?: { asOf?: string; windowDays?: number },
): Projection {
  const model = MODELS.projection; // "proj/1"
  const asOf = opts?.asOf ?? (history.length ? history[history.length - 1].at : new Date(0).toISOString());
  const windowDays = opts?.windowDays ?? PROJ.windowDays;

  const { pts, latestY } = pointsFromHistory(history, asOf, windowDays);
  if (pts.length < PROJ.minPoints || latestY == null) {
    return { state: "insufficient_data", model };
  }

  const fit = olsFit(pts);
  if (!fit) return { state: "insufficient_data", model };

  // Plateau guard: slope within noise → no current trend.
  if (Math.abs(fit.slopePerDay) < fit.slopeStdErr || fit.slopePerDay === 0) {
    return { state: "no_trend", model };
  }

  const target = Math.min(targetPercentileRaw, 1);
  const remaining = target - latestY;

  // If already at/above the target, ETA is effectively now.
  if (remaining <= 0) {
    return { state: "ok", etaWeeks: { low: 0, high: 0 }, saturating: target >= PEAK_CAP, model };
  }

  // Need a positive slope toward the target; a negative slope means moving away.
  if (fit.slopePerDay <= 0) {
    return { state: "no_trend", model };
  }

  const optimisticSlope = fit.slopePerDay + fit.slopeStdErr; // fastest plausible
  const pessimisticSlope = Math.max(fit.slopePerDay - fit.slopeStdErr, 1e-9); // slowest plausible (positive)

  const lowWeeks = remaining / optimisticSlope / DAYS_PER_WEEK; // sooner
  const highWeeks = remaining / pessimisticSlope / DAYS_PER_WEEK; // later

  const saturating = target >= PEAK_CAP || target >= PEAK_CAP - 1e-9;

  return {
    state: "ok",
    etaWeeks: {
      low: round1(Math.max(0, lowWeeks)),
      high: round1(Math.max(lowWeeks, highWeeks)),
    },
    saturating,
    model,
  };
}

