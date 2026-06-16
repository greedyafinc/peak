// Peak — flexible benchmarking: equipment/movement variants for the strength
// benchmark lifts (§4.2). The headline capability ("Bench Press 1RM") is ONE leaf
// with ONE cohort curve, calibrated to the standard movement (barbell). A lifter
// who only trains dumbbells should still be able to set that benchmark — so each
// variant carries a documented conversion factor that re-expresses its est-1RM as
// a STANDARD-equivalent before percentiling, plus a confidence haircut (a converted
// lift is honestly less certain than the literal standard test).
//
// `toStandardFactor` semantics:  standardEquiv1RM = enteredEst1RM × toStandardFactor
//   (the entered load is always the actual variant load — for dumbbells, the TOTAL
//    of both hands, which the capture UI assembles from a per-dumbbell entry).
//
// Ratios are population rules-of-thumb cross-checked against StrengthLevel /
// ExRx / common strength-coaching references; they are inferences, surfaced in the
// methodology note, and refined by first-party data over time. The standard variant
// is always first and is the identity (factor 1.0, confidence 1.0).

import type { Equipment, LeafId } from "../types";

export type VariantEntryMode = "total" | "perHand";

export type BenchmarkVariant = {
  id: string;                  // stable, e.g. "bench.dumbbell"
  label: string;               // e.g. "Dumbbell"
  equipment: Equipment;
  entry: VariantEntryMode;     // "perHand" → capture UI takes one dumbbell and ×2
  toStandardFactor: number;    // multiply est-1RM by this → standard-equivalent 1RM
  confidenceFactor: number;    // [0,1] multiplier on measurement quality
  note?: string;               // short rationale, shown under the picker
  isStandard?: boolean;
};

// ── Per-leaf variant tables ──────────────────────────────────────────────────
export const VARIANTS_BY_LEAF: Record<LeafId, BenchmarkVariant[]> = {
  "strength.bench_1rm": [
    { id: "bench.barbell", label: "Barbell", equipment: "barbell", entry: "total", toStandardFactor: 1.0, confidenceFactor: 1.0, isStandard: true },
    { id: "bench.dumbbell", label: "Dumbbell", equipment: "dumbbell", entry: "perHand", toStandardFactor: 1.18, confidenceFactor: 0.85, note: "Dumbbell bench tops out near 85% of a barbell max (the stabilization tax), so your barbell-equivalent is a bit above the two-dumbbell total." },
    { id: "bench.smith", label: "Smith machine", equipment: "machine", entry: "total", toStandardFactor: 0.9, confidenceFactor: 0.82, note: "A fixed bar path removes ~10% of the stabilizer demand vs a free barbell." },
    { id: "bench.machine", label: "Chest press machine", equipment: "machine", entry: "total", toStandardFactor: 0.82, confidenceFactor: 0.75, note: "Machine presses assist the path heavily; the free-barbell equivalent is meaningfully lower." },
  ],
  "strength.squat_1rm": [
    { id: "squat.barbell_back", label: "Barbell back squat", equipment: "barbell", entry: "total", toStandardFactor: 1.0, confidenceFactor: 1.0, isStandard: true },
    { id: "squat.front", label: "Front squat", equipment: "barbell", entry: "total", toStandardFactor: 1.18, confidenceFactor: 0.85, note: "Front squats run ~85% of back squat, so your back-squat equivalent is a bit higher." },
    { id: "squat.smith", label: "Smith machine", equipment: "machine", entry: "total", toStandardFactor: 0.88, confidenceFactor: 0.8, note: "The fixed bar path removes balance demand vs a free back squat." },
    { id: "squat.hack", label: "Hack squat", equipment: "machine", entry: "total", toStandardFactor: 0.72, confidenceFactor: 0.6, note: "Hack-squat loads sit well above a free back squat; the equivalent is a rough estimate." },
  ],
  "strength.deadlift_1rm": [
    { id: "deadlift.conventional", label: "Conventional", equipment: "barbell", entry: "total", toStandardFactor: 1.0, confidenceFactor: 1.0, isStandard: true },
    { id: "deadlift.sumo", label: "Sumo", equipment: "barbell", entry: "total", toStandardFactor: 1.0, confidenceFactor: 0.92, note: "Sumo and conventional maxes are close for most lifters." },
    { id: "deadlift.trap_bar", label: "Trap / hex bar", equipment: "barbell", entry: "total", toStandardFactor: 0.95, confidenceFactor: 0.85, note: "Trap-bar pulls run a touch higher than conventional; equivalent shaded down ~5%." },
  ],
  "strength.ohp_1rm": [
    { id: "ohp.barbell", label: "Barbell (strict)", equipment: "barbell", entry: "total", toStandardFactor: 1.0, confidenceFactor: 1.0, isStandard: true },
    { id: "ohp.dumbbell", label: "Dumbbell", equipment: "dumbbell", entry: "perHand", toStandardFactor: 1.1, confidenceFactor: 0.82, note: "Two-dumbbell press totals run ~90% of a strict barbell press." },
    { id: "ohp.seated", label: "Seated barbell", equipment: "barbell", entry: "total", toStandardFactor: 1.0, confidenceFactor: 0.85, note: "Seated strict pressing is close to standing without leg drive." },
    { id: "ohp.machine", label: "Machine press", equipment: "machine", entry: "total", toStandardFactor: 0.85, confidenceFactor: 0.78, note: "Machine pressing assists the path; the free-barbell equivalent is lower." },
    { id: "ohp.push_press", label: "Push press", equipment: "barbell", entry: "total", toStandardFactor: 0.78, confidenceFactor: 0.7, note: "Push press uses leg drive; the strict-press equivalent is well below the load moved." },
  ],
};

// Flat index for O(1) lookup by variant id.
const VARIANT_BY_ID: Record<string, BenchmarkVariant> = Object.fromEntries(
  Object.values(VARIANTS_BY_LEAF).flat().map((v) => [v.id, v]),
);

/** Variants offered for a leaf (empty if the leaf has none — most leaves). */
export function variantsForLeaf(leafId: LeafId): BenchmarkVariant[] {
  return VARIANTS_BY_LEAF[leafId] ?? [];
}

export function variantById(id: string | undefined): BenchmarkVariant | undefined {
  return id ? VARIANT_BY_ID[id] : undefined;
}

/** The standard (identity) variant for a leaf, if it has variants. */
export function standardVariant(leafId: LeafId): BenchmarkVariant | undefined {
  const list = variantsForLeaf(leafId);
  return list.find((v) => v.isStandard) ?? list[0];
}

/** Conversion multiplier from a variant's est-1RM to the standard-equivalent 1RM. */
export function standardEquivFactor(variantId: string | undefined): number {
  return variantById(variantId)?.toStandardFactor ?? 1.0;
}

/** Confidence multiplier for a variant (1.0 for the standard / unknown). */
export function variantConfidenceFactor(variantId: string | undefined): number {
  return variantById(variantId)?.confidenceFactor ?? 1.0;
}
