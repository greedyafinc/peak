// Pure benchmark-input transforms used by Onboarding's baseline step. They turn
// captured form state (a BenchEntry) into the canonical RawMeasurement union
// member (§4.2), and describe the single-value input field for non-lift/non-clock
// measures. No React — pure functions over their arguments.

import { standardDistanceKm } from "../data/benchmarks";
import { variantsForLeaf } from "../data/benchmarkVariants";
import type { BenchmarkProtocol, RawMeasurement, UnitSystem } from "../types";
import { lengthToMeters, lengthUnit, weightToKg } from "../units";

// Per-protocol captured form state. A protocol is "entered" once its field(s)
// hold a usable value (`a`/`b` for value measures, `durSec` for clocks, `variantId`
// for variant lifts).
export type BenchEntry = {
  a?: string;               // primary value (load / reps / vo2 / length / angle / m)
  b?: string;               // secondary value (reps for max_load)
  durSec?: number | null;   // clock-shaped capture (holds, runs, sprints)
  variantId?: string;       // chosen variant for a benchmark lift
};

// ── RawMeasurement construction (§4.2) — build the union member by measure kind ─
// `sys` only affects unit-bearing fields (load = kg/lb, jump = cm/in); everything
// is converted to the canonical metric unit before it enters the store.
export function buildRaw(p: BenchmarkProtocol, e: BenchEntry, sys: UnitSystem): RawMeasurement | null {
  const A = e.a != null && e.a !== "" ? Number(e.a) : NaN;
  const B = e.b != null && e.b !== "" ? Number(e.b) : NaN;
  const dur = e.durSec ?? 0;
  switch (p.measure) {
    case "max_load": {
      if (!isFinite(A) || A <= 0) return null;
      const variants = variantsForLeaf(p.leafId);
      const variant = variants.find((v) => v.id === e.variantId) ?? variants[0];
      const total = variant?.entry === "perHand" ? A * 2 : A; // dumbbell = one bell × 2
      const reps = isFinite(B) && B >= 1 ? Math.round(B) : 1;
      return {
        kind: "max_load",
        load: { value: weightToKg(total, sys), unit: "kg" },
        reps,
        variantId: variant?.id,
        equipment: variant?.equipment,
      };
    }
    case "rep_max": {
      if (!isFinite(A) || A < 0) return null;
      return { kind: "rep_max", reps: Math.round(A) };
    }
    case "hold_duration":
      return dur > 0 ? { kind: "hold_duration", duration: { value: dur, unit: "sec" } } : null;
    case "balance_hold":
      return dur > 0 ? { kind: "balance_hold", duration: { value: dur, unit: "sec" } } : null;
    case "time_for_distance":
      return dur > 0
        ? { kind: "time_for_distance", distance: { value: standardDistanceKm(p.leafId), unit: "km" }, duration: { value: dur, unit: "sec" } }
        : null;
    case "sprint_time":
      return dur > 0
        ? { kind: "sprint_time", distance: { value: p.leafId === "anaerobic.sprint_repeats" ? 40 : 400, unit: "m" }, duration: { value: dur, unit: "sec" } }
        : null;
    case "vo2_proxy": {
      if (!isFinite(A) || A <= 0) return null;
      return { kind: "vo2_proxy", vo2: { value: A, unit: "ml/kg/min" } };
    }
    case "jump_height": {
      if (!isFinite(A) || A <= 0) return null;
      // Broad jump captures a horizontal distance; vertical jump a height. Either
      // way the leaf's raw is meters — the user enters cm (metric) / in (imperial).
      return { kind: "jump_height", height: { value: lengthToMeters(A, sys), unit: "m" } };
    }
    case "throw_distance": {
      if (!isFinite(A) || A <= 0) return null;
      return { kind: "throw_distance", distance: { value: A, unit: "m" } };
    }
    case "reach_distance": {
      if (!isFinite(A)) return null;
      return { kind: "reach_distance", distance: { value: A, unit: "m" } };
    }
    case "rom": {
      if (!isFinite(A) || A <= 0) return null;
      return { kind: "rom", angle: { value: A, unit: "degree" } };
    }
    case "distance_in_time": {
      if (!isFinite(A) || A <= 0) return null;
      return { kind: "distance_in_time", distance: { value: A, unit: "m" }, duration: { value: 60, unit: "sec" } };
    }
    default:
      return null;
  }
}

// Single-value measures (everything that isn't a lift or a clock) — label + ph.
export type ValueFieldDesc = { label: string; ph: string; unitKind?: "weight" | "length" };
export function valueField(p: BenchmarkProtocol, sys: UnitSystem): ValueFieldDesc {
  const imp = sys === "imperial";
  switch (p.measure) {
    case "rep_max":
      return { label: "Reps", ph: "20" };
    case "vo2_proxy":
      return { label: "ml/kg/min", ph: "45" };
    case "jump_height":
      return { label: `${p.leafId === "power.broad_jump" ? "Distance" : "Height"} (${lengthUnit(sys)})`, ph: imp ? "22" : "55", unitKind: "length" };
    case "throw_distance":
    case "reach_distance":
      return { label: "Meters", ph: "5.0" };
    case "distance_in_time":
      return { label: "Meters in 60s", ph: "250" };
    case "rom":
      return { label: "Degrees", ph: "120" };
    default:
      return { label: "Value", ph: "0" };
  }
}
