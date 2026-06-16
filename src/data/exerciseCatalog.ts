// Peak — exercise catalog QUERY helpers for the live Gym session (§6.4 UX).
//
// Pure, derived-from-data utilities over EXERCISES: a body-part CATEGORY view for
// the picker (alphabetical), free-text search, and a smart ALTERNATIVES ranking
// (e.g. Barbell Bench Press → Dumbbell Bench, Incline, Machine Chest Press…) that
// reads movement pattern + muscle overlap straight off the catalog — no new data.

import type { ExerciseDef, MuscleGroup } from "../types";
import { EXERCISES, EXERCISE_BY_ID } from "./exercises";
import { MUSCLE_TO_SVG } from "./muscleMap";

// ── Body-part categories (the picker groups + sorts by these, alphabetically) ──
export type ExerciseCategory = "Arms" | "Back" | "Chest" | "Core" | "Legs" | "Shoulders" | "Cardio";

const MUSCLE_CATEGORY: Record<MuscleGroup, ExerciseCategory> = {
  chest: "Chest",
  front_delt: "Shoulders",
  side_delt: "Shoulders",
  rear_delt: "Shoulders",
  biceps: "Arms",
  triceps: "Arms",
  forearms: "Arms",
  lat: "Back",
  trap: "Back",
  lower_back: "Back",
  abs: "Core",
  obliques: "Core",
  glutes: "Legs",
  quads: "Legs",
  hamstrings: "Legs",
  calves: "Legs",
  tibialis: "Legs",
};

/** The body-part category an exercise files under (first primary mover wins). */
export function categoryOf(ex: ExerciseDef): ExerciseCategory {
  const m = ex.primaryMuscles[0];
  return m ? MUSCLE_CATEGORY[m] : "Cardio";
}

/** Alphabetical category order for the picker (Cardio is excluded from Gym). */
export const GYM_CATEGORIES: ExerciseCategory[] = ["Arms", "Back", "Chest", "Core", "Legs", "Shoulders"];

// Every exercise eligible for the Gym picker (excludes pure-cardio energy work,
// matching the existing log flow), pre-sorted alphabetically by name.
export const GYM_EXERCISES: ExerciseDef[] = EXERCISES
  .filter((e) => e.dimension !== "aerobic")
  .sort((a, b) => a.name.localeCompare(b.name));

// ── Display labels ────────────────────────────────────────────────────────────
const EQUIP_LABEL: Record<string, string> = {
  barbell: "Barbell", dumbbell: "Dumbbell", machine: "Machine", cable: "Cable",
  bodyweight: "Bodyweight", kettlebell: "Kettlebell", band: "Band",
  treadmill: "Treadmill", track: "Track", erg: "Erg", none: "Free",
};
export const equipmentLabel = (e: string): string => EQUIP_LABEL[e] ?? e;

/** Human label for a muscle group, reusing the body-map vocabulary. */
export const muscleLabel = (m: MuscleGroup): string => MUSCLE_TO_SVG[m]?.label ?? m;

// ── Muscle sub-grouping (the picker's "Category · Muscle" sub-headers) ─────────
// Within a body-part category the picker splits exercises by the SPECIFIC muscle
// they primarily train, in a fixed anatomical order. The category is the broad chip
// (Arms, Back…); the muscle is the finer header inside it (Arms · Biceps, Arms ·
// Triceps). Because categoryOf() is derived from the first primary mover, every
// exercise's muscle always lives inside its own category — this is a pure refinement.
const CATEGORY_MUSCLE_ORDER: Record<ExerciseCategory, MuscleGroup[]> = {
  Chest: ["chest"],
  Back: ["lat", "trap", "lower_back"],
  Shoulders: ["front_delt", "side_delt", "rear_delt"],
  Arms: ["biceps", "triceps", "forearms"],
  Legs: ["quads", "hamstrings", "glutes", "calves", "tibialis"],
  Core: ["abs", "obliques"],
  Cardio: [],
};

/** The muscle sub-group an exercise files under within its category (first primary mover). */
export function muscleOf(ex: ExerciseDef): MuscleGroup | null {
  return ex.primaryMuscles[0] ?? null;
}

export type PickerSection = { category: ExerciseCategory; muscle: MuscleGroup | null; label: string; items: ExerciseDef[] };

/**
 * Two-tier sections for the picker: each category split into its ordered muscle
 * sub-sections, labelled "Category · Muscle" (or just "Category" when the category has
 * a single muscle, e.g. Chest). `pool` is pre-filtered (search hits, or all GYM_EXERCISES);
 * items keep `pool`'s order (GYM_EXERCISES is alphabetical by name). Empty sections drop out.
 */
export function muscleSections(categories: ExerciseCategory[], pool: ExerciseDef[] = GYM_EXERCISES): PickerSection[] {
  const out: PickerSection[] = [];
  for (const cat of categories) {
    const order = CATEGORY_MUSCLE_ORDER[cat] ?? [];
    const inCat = pool.filter((e) => categoryOf(e) === cat);
    if (inCat.length === 0) continue;
    const single = order.length <= 1;
    const placed = new Set<MuscleGroup>();
    for (const m of order) {
      const items = inCat.filter((e) => muscleOf(e) === m);
      if (items.length === 0) continue;
      placed.add(m);
      out.push({ category: cat, muscle: m, label: single ? cat : `${cat} · ${muscleLabel(m)}`, items });
    }
    // Safety net: any exercise whose primary mover isn't in the category order still shows.
    const rest = inCat.filter((e) => { const m = muscleOf(e); return !m || !placed.has(m); });
    if (rest.length) out.push({ category: cat, muscle: null, label: cat, items: rest });
  }
  return out;
}

// ── Per-arm loading ───────────────────────────────────────────────────────────
// Dumbbell / kettlebell movements are loaded PER HAND (one implement per arm, or
// trained one side at a time), so the weight entered — and the volume figure — is
// per arm, not a barbell-style total. The few dumbbell/kettlebell moves held with
// BOTH hands on a single implement are the exceptions and load as a total.
const TWO_HANDED_SINGLE_IMPLEMENT = new Set<string>([
  "goblet-squat", "kettlebell-swing", "overhead-triceps-extension",
  "dumbbell-pullover", "svend-press", "frog-pump",
]);
export function isPerArm(ex: ExerciseDef): boolean {
  if (ex.equipment !== "dumbbell" && ex.equipment !== "kettlebell") return false;
  return !TWO_HANDED_SINGLE_IMPLEMENT.has(ex.id);
}

// ── Load model: total moved vs barbell-equivalent ─────────────────────────────
// One logged set carries an ENTERED load (per-arm for dumbbell/kettlebell work).
// Two derived notions sit on top of it, and they are NOT the same number:
//   • perArmFactor — turns a per-implement entry into the total across both hands
//     (two 75-lb dumbbells = 150 lb of iron). This is what a literal volume/tonnage
//     tally wants — count both implements, nothing else.
//   • effectiveLoadKg — the BARBELL-EQUIVALENT load used to percentile a lift against
//     the strength cohort curves, which are calibrated to the barbell standard (§5.3).
//     On top of the per-arm total it adds a free-implement→barbell uplift for PRESSING
//     patterns (two dumbbells press ~85% of a barbell, so the barbell-equivalent sits a
//     bit above their total), mirroring the benchmark variant factors in
//     benchmarkVariants.ts (bench 1.18, overhead press 1.10). Non-press movements have
//     no established uplift → factor 1.0 (just the per-arm doubling).
// The inference engine (§4.3) MUST use effectiveLoadKg so a dumbbell-only lifter is
// scored on the same scale as the barbell standard the curve is built from — otherwise
// a per-hand load is read as if it were a whole barbell, burying strong lifts in the
// bottom percentile (the dumbbell-bench bug).

/** Multiplier that turns a per-implement entry into the total across both hands. */
export function perArmFactor(ex: ExerciseDef): number {
  return isPerArm(ex) ? 2 : 1;
}

/** Free-implement → barbell-equivalent uplift, applied to PRESSING patterns only. */
function loadEquivFactor(ex: ExerciseDef): number {
  if (ex.equipment !== "dumbbell" && ex.equipment !== "kettlebell") return 1;
  if (ex.movementPattern === "horizontal_push") return 1.18; // dumbbell bench ≈ 85% of a barbell
  if (ex.movementPattern === "vertical_push") return 1.1;    // dumbbell press ≈ 90% of a barbell
  return 1; // rows, curls, raises, carries — no established barbell-equivalent uplift
}

/** Barbell-equivalent load (kg) for percentiling against the strength cohort curves. */
export function effectiveLoadKg(ex: ExerciseDef, enteredKg: number): number {
  return enteredKg * perArmFactor(ex) * loadEquivFactor(ex);
}

/** "Barbell · Chest" / "Dumbbell · Chest · per arm" subtitle for a picker row. */
export function exerciseSubtitle(ex: ExerciseDef): string {
  const primary = ex.primaryMuscles[0];
  const parts = [equipmentLabel(ex.equipment)];
  if (primary) parts.push(muscleLabel(primary));
  if (isPerArm(ex)) parts.push("per arm");
  return parts.join(" · ");
}

// ── Search ────────────────────────────────────────────────────────────────────
/** Case-insensitive match across name, gym-nickname aliases, equipment, and muscle labels. */
export function matchesQuery(ex: ExerciseDef, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [
    ex.name,
    ...(ex.aliases ?? []),
    equipmentLabel(ex.equipment),
    ...ex.primaryMuscles.map(muscleLabel),
  ].join(" ").toLowerCase();
  return hay.includes(needle);
}

// ── Smart alternatives ────────────────────────────────────────────────────────
// Rank other exercises by how well they substitute for `exerciseId`: same movement
// pattern is the strongest signal, then primary-muscle overlap, then any overlap.
// This is what turns "Barbell Bench Press" into a tidy list led by Dumbbell Bench,
// Incline, Machine Chest Press, Decline, Close-Grip — all honest, all from data.
const overlap = (a: MuscleGroup[], b: MuscleGroup[]): number =>
  a.filter((m) => b.includes(m)).length;

export function scoreAlternative(base: ExerciseDef, cand: ExerciseDef): number {
  if (cand.id === base.id) return -1;
  let score = 0;
  if (cand.movementPattern === base.movementPattern) score += 4;
  if (categoryOf(cand) === categoryOf(base)) score += 2;
  score += overlap(cand.primaryMuscles, base.primaryMuscles) * 2.5;
  const baseAll = [...base.primaryMuscles, ...base.secondaryMuscles];
  const candAll = [...cand.primaryMuscles, ...cand.secondaryMuscles];
  score += overlap(candAll, baseAll) * 0.6;
  if (cand.dimension === base.dimension) score += 0.5;
  return score;
}

/** Ranked substitute exercises for `exerciseId` (best first), score-positive only. */
export function alternativesFor(exerciseId: string, limit = 16): ExerciseDef[] {
  const base = EXERCISE_BY_ID[exerciseId];
  if (!base) return [];
  return GYM_EXERCISES
    .map((cand) => ({ cand, score: scoreAlternative(base, cand) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.cand.name.localeCompare(b.cand.name))
    .slice(0, limit)
    .map((x) => x.cand);
}
