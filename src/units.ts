// Peak — unit conversion at the UI edges.
//
// The store is ALWAYS canonical metric (kg, km, m, cm); these helpers convert
// only when a value is shown or entered, driven by a single global `unitSystem`
// flag (PeakData.unitSystem). Flipping that flag — from a subtle per-field toggle
// anywhere in the app — switches every input AND display at once, without ever
// rewriting stored data. So a set logged at 225 lb and one logged at 102 kg are
// the same canonical kg row; only the lens changes.

import type { UnitSystem } from "./types";

// Exact conversion factors.
export const LB_PER_KG = 2.2046226218;
export const KG_PER_LB = 0.45359237;
export const MI_PER_KM = 0.6213711922;
export const KM_PER_MI = 1.609344;
export const IN_PER_CM = 0.3937007874;
export const CM_PER_IN = 2.54;

export const isImperial = (sys: UnitSystem): boolean => sys === "imperial";

const round = (n: number, dp: number): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

// ── Weight (canonical: kg) ──────────────────────────────────────────────────
export const weightUnit = (sys: UnitSystem): "kg" | "lb" => (sys === "imperial" ? "lb" : "kg");
export const kgToLb = (kg: number): number => kg * LB_PER_KG;
export const lbToKg = (lb: number): number => lb * KG_PER_LB;
/** canonical kg → the number shown in the active unit */
export const kgToDisplay = (kg: number, sys: UnitSystem, dp = 1): number =>
  round(sys === "imperial" ? kgToLb(kg) : kg, dp);
/** a value entered in the active unit → canonical kg */
export const weightToKg = (val: number, sys: UnitSystem): number =>
  sys === "imperial" ? lbToKg(val) : val;
/** e.g. "225 lb" / "102 kg" */
export const fmtWeight = (kg: number, sys: UnitSystem, dp = 0): string =>
  `${kgToDisplay(kg, sys, dp)} ${weightUnit(sys)}`;

// ── Road / cardio distance (canonical: km) ──────────────────────────────────
export const distanceUnit = (sys: UnitSystem): "km" | "mi" => (sys === "imperial" ? "mi" : "km");
export const kmToMi = (km: number): number => km * MI_PER_KM;
export const miToKm = (mi: number): number => mi * KM_PER_MI;
export const kmToDisplay = (km: number, sys: UnitSystem, dp = 2): number =>
  round(sys === "imperial" ? kmToMi(km) : km, dp);
export const distanceToKm = (val: number, sys: UnitSystem): number =>
  sys === "imperial" ? miToKm(val) : val;
export const fmtDistanceKm = (km: number, sys: UnitSystem, dp = 2): string =>
  `${kmToDisplay(km, sys, dp)} ${distanceUnit(sys)}`;

// ── Small length (canonical: cm) — jumps, reach, vertical height ─────────────
export const lengthUnit = (sys: UnitSystem): "cm" | "in" => (sys === "imperial" ? "in" : "cm");
export const cmToIn = (cm: number): number => cm * IN_PER_CM;
export const inToCm = (inch: number): number => inch * CM_PER_IN;
export const cmToDisplay = (cm: number, sys: UnitSystem, dp = 1): number =>
  round(sys === "imperial" ? cmToIn(cm) : cm, dp);
export const lengthToCm = (val: number, sys: UnitSystem): number =>
  sys === "imperial" ? inToCm(val) : val;
/** a small-length value entered in cm/in → canonical meters (for jump/throw/reach leaves) */
export const lengthToMeters = (val: number, sys: UnitSystem): number => lengthToCm(val, sys) / 100;
/** canonical meters → the number shown in cm/in */
export const metersToLengthDisplay = (m: number, sys: UnitSystem, dp = 1): number =>
  cmToDisplay(m * 100, sys, dp);

// ── Time / duration (canonical: seconds) ────────────────────────────────────
// Inputs and displays are ALWAYS clock-shaped (m:ss or h:mm:ss), never a raw
// seconds box — a 5K is "24:30", a marathon "3:58:12", a plank "2:15". The store
// keeps the canonical scalar (seconds for benchmarks, minutes for cardio); these
// helpers are the only place a human-readable clock is parsed or rendered.
const pad2 = (n: number): string => String(Math.floor(n)).padStart(2, "0");

/** {h,m,s} → total seconds. */
export const clockToSec = (h: number, m: number, s: number): number =>
  Math.max(0, Math.floor(h)) * 3600 + Math.max(0, Math.floor(m)) * 60 + Math.max(0, s);

/** total seconds → {h,m,s} (seconds rounded). */
export function secToClock(totalSec: number): { h: number; m: number; s: number } {
  const t = Math.max(0, Math.round(totalSec));
  return { h: Math.floor(t / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
}

/**
 * total seconds → "m:ss" or "h:mm:ss". `showHours` forces the hours field even
 * under an hour (kept off by default so a 24:30 5K never reads "0:24:30"); the
 * hours segment appears automatically once the duration crosses an hour.
 */
export function fmtClock(totalSec: number, showHours = false): string {
  const { h, m, s } = secToClock(totalSec);
  if (showHours || h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;
  return `${m}:${pad2(s)}`;
}

/** running/multisport pace per active distance unit, e.g. "5:30 /km" / "8:51 /mi". */
export function paceLabel(distanceKm: number, totalSec: number, sys: UnitSystem): string {
  if (distanceKm <= 0 || totalSec <= 0) return "—";
  const perUnit = totalSec / kmToDisplay(distanceKm, sys, 6);
  return `${fmtClock(perUnit)} /${distanceUnit(sys)}`;
}

// ── Body height (canonical: cm; imperial shown as ft + in) ──────────────────
/** cm → {ft, inch}, with inch-rollover (11.6″ rounds to a clean 12″ → +1 ft). */
export function cmToFtIn(cm: number): { ft: number; inch: number } {
  const totalIn = cm / CM_PER_IN;
  let ft = Math.floor(totalIn / 12);
  let inch = Math.round(totalIn - ft * 12);
  if (inch === 12) {
    ft += 1;
    inch = 0;
  }
  return { ft, inch };
}
export const ftInToCm = (ft: number, inch: number): number =>
  Math.round((ft * 12 + inch) * CM_PER_IN);
/** e.g. "5′10″" (imperial) / "178 cm" (metric) */
export const fmtHeight = (cm: number, sys: UnitSystem): string => {
  if (sys === "imperial") {
    const { ft, inch } = cmToFtIn(cm);
    return `${ft}′${inch}″`;
  }
  return `${Math.round(cm)} cm`;
};
