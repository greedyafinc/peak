// Peak — exercise catalog (§6.5). Reference data.
//
// CRITICAL: `muscleWeights` are the ATTRIBUTION COEFFICIENTS used by the inference
// engine (§4.3) to apportion a logged set's stimulus across muscle groups. They are
// NOT EMG percentages — they are how Peak credits a set toward each `strength.<muscle>`
// inferred leaf. Primary movers carry the largest weights; secondaries a small share.
// Each exercise's weights sum to ~1.0 across the muscles it trains, so a set fully
// distributes its training credit. Coefficients are biomechanically grounded
// (primary/secondary mover analysis), not measured — they encode "who did the work".
//
// The engine relies on these specific ids existing (capabilityTree.ts
// contributingExerciseIds): barbell-bench-press, barbell-back-squat, barbell-deadlift,
// barbell-overhead-press, pushup, pullup, plank.

import type { ExerciseDef, MuscleGroup } from "../types";

// Tiny dev-time guard helper: assert a weight map sums to ~1.0 (kept pure; only
// runs if explicitly called — no side effects at import).
export function muscleWeightSum(w: Partial<Record<MuscleGroup, number>>): number {
  return Object.values(w).reduce<number>((a, b) => a + (b ?? 0), 0);
}

export const EXERCISES: ExerciseDef[] = [
  // ── Horizontal push ────────────────────────────────────────────────────────
  {
    id: "barbell-bench-press",
    name: "Barbell Bench Press",
    movementPattern: "horizontal_push",
    equipment: "barbell",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["front_delt", "triceps"],
    muscleWeights: { chest: 0.5, front_delt: 0.25, triceps: 0.25 },
    dimension: "strength",
  },
  {
    id: "dumbbell-bench-press",
    name: "Dumbbell Bench Press",
    movementPattern: "horizontal_push",
    equipment: "dumbbell",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["front_delt", "triceps"],
    muscleWeights: { chest: 0.5, front_delt: 0.27, triceps: 0.23 },
    dimension: "strength",
  },
  {
    id: "incline-bench-press",
    name: "Incline Bench Press",
    movementPattern: "horizontal_push",
    equipment: "barbell",
    primaryMuscles: ["chest", "front_delt"],
    secondaryMuscles: ["triceps"],
    muscleWeights: { chest: 0.42, front_delt: 0.36, triceps: 0.22 },
    dimension: "strength",
  },
  {
    id: "machine-chest-press",
    name: "Machine Chest Press",
    movementPattern: "horizontal_push",
    equipment: "machine",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["front_delt", "triceps"],
    muscleWeights: { chest: 0.55, front_delt: 0.22, triceps: 0.23 },
    dimension: "strength",
  },
  {
    id: "cable-fly",
    name: "Cable Chest Fly",
    movementPattern: "isolation",
    equipment: "cable",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["front_delt"],
    muscleWeights: { chest: 0.85, front_delt: 0.15 },
    dimension: "strength",
  },
  {
    id: "pushup",
    name: "Push-up",
    movementPattern: "horizontal_push",
    equipment: "bodyweight",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["front_delt", "triceps", "abs"],
    muscleWeights: { chest: 0.45, front_delt: 0.22, triceps: 0.23, abs: 0.1 },
    dimension: "muscular_endurance",
    isBodyweight: true,
  },
  {
    id: "dip",
    name: "Chest Dip",
    movementPattern: "horizontal_push",
    equipment: "bodyweight",
    primaryMuscles: ["chest", "triceps"],
    secondaryMuscles: ["front_delt"],
    muscleWeights: { chest: 0.42, triceps: 0.38, front_delt: 0.2 },
    dimension: "strength",
    isBodyweight: true,
  },

  // ── Vertical push ────────────────────────────────────────────────────────
  {
    id: "barbell-overhead-press",
    name: "Barbell Overhead Press",
    movementPattern: "vertical_push",
    equipment: "barbell",
    primaryMuscles: ["front_delt"],
    secondaryMuscles: ["side_delt", "triceps", "trap"],
    muscleWeights: { front_delt: 0.45, side_delt: 0.2, triceps: 0.25, trap: 0.1 },
    dimension: "strength",
  },
  {
    id: "dumbbell-shoulder-press",
    name: "Dumbbell Shoulder Press",
    movementPattern: "vertical_push",
    equipment: "dumbbell",
    primaryMuscles: ["front_delt"],
    secondaryMuscles: ["side_delt", "triceps"],
    muscleWeights: { front_delt: 0.45, side_delt: 0.25, triceps: 0.2, trap: 0.1 },
    dimension: "strength",
  },
  {
    id: "lateral-raise",
    name: "Lateral Raise",
    movementPattern: "isolation",
    equipment: "dumbbell",
    primaryMuscles: ["side_delt"],
    secondaryMuscles: ["front_delt", "trap"],
    muscleWeights: { side_delt: 0.75, front_delt: 0.13, trap: 0.12 },
    dimension: "strength",
  },

  // ── Horizontal pull ────────────────────────────────────────────────────────
  {
    id: "barbell-row",
    name: "Barbell Bent-Over Row",
    movementPattern: "horizontal_pull",
    equipment: "barbell",
    primaryMuscles: ["lat"],
    secondaryMuscles: ["rear_delt", "trap", "biceps", "lower_back"],
    muscleWeights: { lat: 0.42, rear_delt: 0.16, trap: 0.16, biceps: 0.16, lower_back: 0.1 },
    dimension: "strength",
  },
  {
    id: "dumbbell-row",
    name: "Single-Arm Dumbbell Row",
    movementPattern: "horizontal_pull",
    equipment: "dumbbell",
    primaryMuscles: ["lat"],
    secondaryMuscles: ["rear_delt", "trap", "biceps"],
    muscleWeights: { lat: 0.45, rear_delt: 0.15, trap: 0.18, biceps: 0.22 },
    dimension: "strength",
  },
  {
    id: "seated-cable-row",
    name: "Seated Cable Row",
    movementPattern: "horizontal_pull",
    equipment: "cable",
    primaryMuscles: ["lat"],
    secondaryMuscles: ["rear_delt", "trap", "biceps"],
    muscleWeights: { lat: 0.44, rear_delt: 0.16, trap: 0.18, biceps: 0.22 },
    dimension: "strength",
  },
  {
    id: "face-pull",
    name: "Face Pull",
    movementPattern: "horizontal_pull",
    equipment: "cable",
    primaryMuscles: ["rear_delt"],
    secondaryMuscles: ["trap"],
    muscleWeights: { rear_delt: 0.62, trap: 0.38 },
    dimension: "strength",
  },

  // ── Vertical pull ────────────────────────────────────────────────────────
  {
    id: "pullup",
    name: "Pull-up",
    movementPattern: "vertical_pull",
    equipment: "bodyweight",
    primaryMuscles: ["lat"],
    secondaryMuscles: ["biceps", "rear_delt", "trap"],
    muscleWeights: { lat: 0.55, biceps: 0.25, rear_delt: 0.1, trap: 0.1 },
    dimension: "muscular_endurance",
    isBodyweight: true,
  },
  {
    id: "chinup",
    name: "Chin-up",
    movementPattern: "vertical_pull",
    equipment: "bodyweight",
    primaryMuscles: ["lat", "biceps"],
    secondaryMuscles: ["rear_delt"],
    muscleWeights: { lat: 0.5, biceps: 0.35, rear_delt: 0.15 },
    dimension: "strength",
    isBodyweight: true,
  },
  {
    id: "lat-pulldown",
    name: "Lat Pulldown",
    movementPattern: "vertical_pull",
    equipment: "cable",
    primaryMuscles: ["lat"],
    secondaryMuscles: ["biceps", "rear_delt"],
    muscleWeights: { lat: 0.6, biceps: 0.25, rear_delt: 0.15 },
    dimension: "strength",
  },

  // ── Squat ────────────────────────────────────────────────────────
  {
    id: "barbell-back-squat",
    name: "Barbell Back Squat",
    movementPattern: "squat",
    equipment: "barbell",
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["hamstrings", "lower_back", "abs"],
    muscleWeights: { quads: 0.45, glutes: 0.3, hamstrings: 0.12, lower_back: 0.08, abs: 0.05 },
    dimension: "strength",
  },
  {
    id: "barbell-front-squat",
    name: "Barbell Front Squat",
    movementPattern: "squat",
    equipment: "barbell",
    primaryMuscles: ["quads"],
    secondaryMuscles: ["glutes", "abs", "lower_back"],
    muscleWeights: { quads: 0.52, glutes: 0.25, abs: 0.13, lower_back: 0.1 },
    dimension: "strength",
  },
  {
    id: "leg-press",
    name: "Leg Press",
    movementPattern: "squat",
    equipment: "machine",
    primaryMuscles: ["quads"],
    secondaryMuscles: ["glutes", "hamstrings"],
    muscleWeights: { quads: 0.55, glutes: 0.3, hamstrings: 0.15 },
    dimension: "strength",
  },
  {
    id: "goblet-squat",
    name: "Goblet Squat",
    movementPattern: "squat",
    equipment: "dumbbell",
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["abs"],
    muscleWeights: { quads: 0.5, glutes: 0.32, abs: 0.18 },
    dimension: "strength",
  },
  {
    id: "leg-extension",
    name: "Leg Extension",
    movementPattern: "isolation",
    equipment: "machine",
    primaryMuscles: ["quads"],
    secondaryMuscles: [],
    muscleWeights: { quads: 1.0 },
    dimension: "strength",
  },

  // ── Hinge ────────────────────────────────────────────────────────
  {
    id: "barbell-deadlift",
    name: "Barbell Deadlift",
    movementPattern: "hinge",
    equipment: "barbell",
    primaryMuscles: ["glutes", "hamstrings", "lower_back"],
    secondaryMuscles: ["trap", "quads", "forearms"],
    muscleWeights: { glutes: 0.28, hamstrings: 0.27, lower_back: 0.22, trap: 0.1, quads: 0.08, forearms: 0.05 },
    dimension: "strength",
  },
  {
    id: "romanian-deadlift",
    name: "Romanian Deadlift",
    movementPattern: "hinge",
    equipment: "barbell",
    primaryMuscles: ["hamstrings", "glutes"],
    secondaryMuscles: ["lower_back", "forearms"],
    muscleWeights: { hamstrings: 0.42, glutes: 0.33, lower_back: 0.18, forearms: 0.07 },
    dimension: "strength",
  },
  {
    id: "hip-thrust",
    name: "Barbell Hip Thrust",
    movementPattern: "hinge",
    equipment: "barbell",
    primaryMuscles: ["glutes"],
    secondaryMuscles: ["hamstrings"],
    muscleWeights: { glutes: 0.72, hamstrings: 0.28 },
    dimension: "strength",
  },
  {
    id: "leg-curl",
    name: "Lying Leg Curl",
    movementPattern: "isolation",
    equipment: "machine",
    primaryMuscles: ["hamstrings"],
    secondaryMuscles: [],
    muscleWeights: { hamstrings: 1.0 },
    dimension: "strength",
  },
  {
    id: "back-extension",
    name: "Back Extension",
    movementPattern: "hinge",
    equipment: "bodyweight",
    primaryMuscles: ["lower_back"],
    secondaryMuscles: ["glutes", "hamstrings"],
    muscleWeights: { lower_back: 0.55, glutes: 0.27, hamstrings: 0.18 },
    dimension: "strength",
    isBodyweight: true,
  },

  // ── Lunge ────────────────────────────────────────────────────────
  {
    id: "walking-lunge",
    name: "Walking Lunge",
    movementPattern: "lunge",
    equipment: "dumbbell",
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["hamstrings"],
    muscleWeights: { quads: 0.42, glutes: 0.38, hamstrings: 0.2 },
    dimension: "strength",
  },
  {
    id: "bulgarian-split-squat",
    name: "Bulgarian Split Squat",
    movementPattern: "lunge",
    equipment: "dumbbell",
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["hamstrings"],
    muscleWeights: { quads: 0.45, glutes: 0.37, hamstrings: 0.18 },
    dimension: "strength",
  },

  // ── Arm isolation ────────────────────────────────────────────────────────
  {
    id: "barbell-curl",
    name: "Barbell Biceps Curl",
    movementPattern: "isolation",
    equipment: "barbell",
    primaryMuscles: ["biceps"],
    secondaryMuscles: ["forearms"],
    muscleWeights: { biceps: 0.82, forearms: 0.18 },
    dimension: "strength",
  },
  {
    id: "dumbbell-curl",
    name: "Dumbbell Biceps Curl",
    movementPattern: "isolation",
    equipment: "dumbbell",
    primaryMuscles: ["biceps"],
    secondaryMuscles: ["forearms"],
    muscleWeights: { biceps: 0.82, forearms: 0.18 },
    dimension: "strength",
  },
  {
    id: "hammer-curl",
    name: "Hammer Curl",
    movementPattern: "isolation",
    equipment: "dumbbell",
    primaryMuscles: ["biceps", "forearms"],
    secondaryMuscles: [],
    muscleWeights: { biceps: 0.6, forearms: 0.4 },
    dimension: "strength",
  },
  {
    id: "triceps-pushdown",
    name: "Triceps Pushdown",
    movementPattern: "isolation",
    equipment: "cable",
    primaryMuscles: ["triceps"],
    secondaryMuscles: [],
    muscleWeights: { triceps: 1.0 },
    dimension: "strength",
  },
  {
    id: "skullcrusher",
    name: "Lying Triceps Extension",
    movementPattern: "isolation",
    equipment: "barbell",
    primaryMuscles: ["triceps"],
    secondaryMuscles: [],
    muscleWeights: { triceps: 1.0 },
    dimension: "strength",
  },
  {
    id: "wrist-curl",
    name: "Wrist Curl",
    movementPattern: "isolation",
    equipment: "dumbbell",
    primaryMuscles: ["forearms"],
    secondaryMuscles: [],
    muscleWeights: { forearms: 1.0 },
    dimension: "strength",
  },

  // ── Shoulders / traps ────────────────────────────────────────────────────────
  {
    id: "barbell-shrug",
    name: "Barbell Shrug",
    movementPattern: "isolation",
    equipment: "barbell",
    primaryMuscles: ["trap"],
    secondaryMuscles: ["forearms"],
    muscleWeights: { trap: 0.85, forearms: 0.15 },
    dimension: "strength",
  },

  // ── Calves ────────────────────────────────────────────────────────
  {
    id: "calf-raise",
    name: "Standing Calf Raise",
    movementPattern: "isolation",
    equipment: "machine",
    primaryMuscles: ["calves"],
    secondaryMuscles: [],
    muscleWeights: { calves: 1.0 },
    dimension: "strength",
  },

  // ── Core ────────────────────────────────────────────────────────
  {
    id: "plank",
    name: "Plank",
    movementPattern: "isometric",
    equipment: "bodyweight",
    primaryMuscles: ["abs"],
    secondaryMuscles: ["obliques", "lower_back"],
    muscleWeights: { abs: 0.6, obliques: 0.25, lower_back: 0.15 },
    dimension: "muscular_endurance",
    isBodyweight: true,
  },
  {
    id: "hanging-leg-raise",
    name: "Hanging Leg Raise",
    movementPattern: "isolation",
    equipment: "bodyweight",
    primaryMuscles: ["abs"],
    secondaryMuscles: ["obliques", "forearms"],
    muscleWeights: { abs: 0.7, obliques: 0.18, forearms: 0.12 },
    dimension: "strength",
    isBodyweight: true,
  },
  {
    id: "cable-woodchop",
    name: "Cable Woodchop",
    movementPattern: "rotation",
    equipment: "cable",
    primaryMuscles: ["obliques"],
    secondaryMuscles: ["abs"],
    muscleWeights: { obliques: 0.72, abs: 0.28 },
    dimension: "strength",
  },

  // ── Horizontal push (extended) ───────────────────────────────────────────────
  { id: "incline-dumbbell-press", name: "Incline Dumbbell Press", movementPattern: "horizontal_push", equipment: "dumbbell", primaryMuscles: ["chest", "front_delt"], secondaryMuscles: ["triceps"], muscleWeights: { chest: 0.4, front_delt: 0.35, triceps: 0.25 }, dimension: "strength" },
  { id: "decline-bench-press", name: "Decline Bench Press", movementPattern: "horizontal_push", equipment: "barbell", primaryMuscles: ["chest"], secondaryMuscles: ["front_delt", "triceps"], muscleWeights: { chest: 0.55, front_delt: 0.2, triceps: 0.25 }, dimension: "strength" },
  { id: "pec-deck", name: "Pec Deck Fly", movementPattern: "isolation", equipment: "machine", primaryMuscles: ["chest"], secondaryMuscles: ["front_delt"], muscleWeights: { chest: 0.85, front_delt: 0.15 }, dimension: "strength" },
  { id: "close-grip-bench", name: "Close-Grip Bench Press", movementPattern: "horizontal_push", equipment: "barbell", primaryMuscles: ["triceps", "chest"], secondaryMuscles: ["front_delt"], muscleWeights: { triceps: 0.45, chest: 0.35, front_delt: 0.2 }, dimension: "strength" },

  // ── Vertical push (extended) ─────────────────────────────────────────────────
  { id: "arnold-press", name: "Arnold Press", movementPattern: "vertical_push", equipment: "dumbbell", primaryMuscles: ["front_delt"], secondaryMuscles: ["side_delt", "triceps", "trap"], muscleWeights: { front_delt: 0.45, side_delt: 0.3, triceps: 0.15, trap: 0.1 }, dimension: "strength" },
  { id: "push-press", name: "Push Press", movementPattern: "vertical_push", equipment: "barbell", primaryMuscles: ["front_delt"], secondaryMuscles: ["side_delt", "triceps", "trap"], muscleWeights: { front_delt: 0.4, side_delt: 0.22, triceps: 0.23, trap: 0.15 }, dimension: "strength" },
  { id: "machine-shoulder-press", name: "Machine Shoulder Press", movementPattern: "vertical_push", equipment: "machine", primaryMuscles: ["front_delt"], secondaryMuscles: ["side_delt", "triceps"], muscleWeights: { front_delt: 0.5, side_delt: 0.25, triceps: 0.25 }, dimension: "strength" },
  { id: "pike-pushup", name: "Pike Push-up", movementPattern: "vertical_push", equipment: "bodyweight", primaryMuscles: ["front_delt"], secondaryMuscles: ["side_delt", "triceps"], muscleWeights: { front_delt: 0.5, side_delt: 0.2, triceps: 0.3 }, dimension: "muscular_endurance", isBodyweight: true },
  { id: "upright-row", name: "Upright Row", movementPattern: "vertical_pull", equipment: "barbell", primaryMuscles: ["side_delt", "trap"], secondaryMuscles: ["front_delt", "biceps"], muscleWeights: { side_delt: 0.4, trap: 0.35, front_delt: 0.15, biceps: 0.1 }, dimension: "strength" },

  // ── Horizontal pull (extended) ───────────────────────────────────────────────
  { id: "pendlay-row", name: "Pendlay Row", movementPattern: "horizontal_pull", equipment: "barbell", primaryMuscles: ["lat"], secondaryMuscles: ["rear_delt", "trap", "biceps", "lower_back"], muscleWeights: { lat: 0.42, rear_delt: 0.16, trap: 0.16, biceps: 0.16, lower_back: 0.1 }, dimension: "strength" },
  { id: "t-bar-row", name: "T-Bar Row", movementPattern: "horizontal_pull", equipment: "machine", primaryMuscles: ["lat"], secondaryMuscles: ["rear_delt", "trap", "biceps"], muscleWeights: { lat: 0.45, rear_delt: 0.15, trap: 0.18, biceps: 0.22 }, dimension: "strength" },
  { id: "chest-supported-row", name: "Chest-Supported Row", movementPattern: "horizontal_pull", equipment: "dumbbell", primaryMuscles: ["lat"], secondaryMuscles: ["rear_delt", "trap", "biceps"], muscleWeights: { lat: 0.46, rear_delt: 0.18, trap: 0.16, biceps: 0.2 }, dimension: "strength" },
  { id: "inverted-row", name: "Inverted Row", movementPattern: "horizontal_pull", equipment: "bodyweight", primaryMuscles: ["lat"], secondaryMuscles: ["rear_delt", "trap", "biceps"], muscleWeights: { lat: 0.45, rear_delt: 0.15, trap: 0.15, biceps: 0.25 }, dimension: "muscular_endurance", isBodyweight: true },
  { id: "reverse-pec-deck", name: "Reverse Pec Deck", movementPattern: "isolation", equipment: "machine", primaryMuscles: ["rear_delt"], secondaryMuscles: ["trap"], muscleWeights: { rear_delt: 0.7, trap: 0.3 }, dimension: "strength" },

  // ── Vertical pull (extended) ─────────────────────────────────────────────────
  { id: "weighted-pullup", name: "Weighted Pull-up", movementPattern: "vertical_pull", equipment: "bodyweight", primaryMuscles: ["lat"], secondaryMuscles: ["biceps", "rear_delt", "trap"], muscleWeights: { lat: 0.55, biceps: 0.25, rear_delt: 0.1, trap: 0.1 }, dimension: "strength" },
  { id: "assisted-pullup", name: "Assisted Pull-up", movementPattern: "vertical_pull", equipment: "machine", primaryMuscles: ["lat"], secondaryMuscles: ["biceps", "rear_delt"], muscleWeights: { lat: 0.55, biceps: 0.25, rear_delt: 0.1, trap: 0.1 }, dimension: "strength" },

  // ── Squat (extended) ─────────────────────────────────────────────────────────
  { id: "hack-squat", name: "Hack Squat", movementPattern: "squat", equipment: "machine", primaryMuscles: ["quads"], secondaryMuscles: ["glutes", "hamstrings"], muscleWeights: { quads: 0.6, glutes: 0.25, hamstrings: 0.15 }, dimension: "strength" },
  { id: "smith-squat", name: "Smith Machine Squat", movementPattern: "squat", equipment: "machine", primaryMuscles: ["quads", "glutes"], secondaryMuscles: ["hamstrings", "lower_back"], muscleWeights: { quads: 0.48, glutes: 0.3, hamstrings: 0.12, lower_back: 0.1 }, dimension: "strength" },
  { id: "sissy-squat", name: "Sissy Squat", movementPattern: "squat", equipment: "bodyweight", primaryMuscles: ["quads"], secondaryMuscles: ["abs"], muscleWeights: { quads: 0.85, abs: 0.15 }, dimension: "muscular_endurance", isBodyweight: true },
  { id: "box-step-up", name: "Box Step-up", movementPattern: "lunge", equipment: "dumbbell", primaryMuscles: ["quads", "glutes"], secondaryMuscles: ["hamstrings"], muscleWeights: { quads: 0.42, glutes: 0.4, hamstrings: 0.18 }, dimension: "strength" },

  // ── Hinge (extended) ─────────────────────────────────────────────────────────
  { id: "sumo-deadlift", name: "Sumo Deadlift", movementPattern: "hinge", equipment: "barbell", primaryMuscles: ["glutes", "hamstrings"], secondaryMuscles: ["quads", "lower_back", "trap"], muscleWeights: { glutes: 0.32, quads: 0.18, hamstrings: 0.22, lower_back: 0.18, trap: 0.1 }, dimension: "strength" },
  { id: "trap-bar-deadlift", name: "Trap-Bar Deadlift", movementPattern: "hinge", equipment: "barbell", primaryMuscles: ["glutes", "quads"], secondaryMuscles: ["hamstrings", "lower_back", "trap"], muscleWeights: { quads: 0.25, glutes: 0.28, hamstrings: 0.2, lower_back: 0.17, trap: 0.1 }, dimension: "strength" },
  { id: "good-morning", name: "Good Morning", movementPattern: "hinge", equipment: "barbell", primaryMuscles: ["hamstrings"], secondaryMuscles: ["glutes", "lower_back"], muscleWeights: { hamstrings: 0.42, glutes: 0.3, lower_back: 0.28 }, dimension: "strength" },
  { id: "kettlebell-swing", name: "Kettlebell Swing", movementPattern: "hinge", equipment: "kettlebell", primaryMuscles: ["glutes", "hamstrings"], secondaryMuscles: ["lower_back", "abs"], muscleWeights: { glutes: 0.4, hamstrings: 0.3, lower_back: 0.18, abs: 0.12 }, dimension: "power" },
  { id: "nordic-curl", name: "Nordic Hamstring Curl", movementPattern: "hinge", equipment: "bodyweight", primaryMuscles: ["hamstrings"], secondaryMuscles: ["glutes"], muscleWeights: { hamstrings: 0.8, glutes: 0.2 }, dimension: "strength", isBodyweight: true },
  { id: "glute-ham-raise", name: "Glute-Ham Raise", movementPattern: "hinge", equipment: "bodyweight", primaryMuscles: ["hamstrings"], secondaryMuscles: ["glutes", "calves"], muscleWeights: { hamstrings: 0.65, glutes: 0.25, calves: 0.1 }, dimension: "strength", isBodyweight: true },

  // ── Lunge (extended) ─────────────────────────────────────────────────────────
  { id: "reverse-lunge", name: "Reverse Lunge", movementPattern: "lunge", equipment: "dumbbell", primaryMuscles: ["quads", "glutes"], secondaryMuscles: ["hamstrings"], muscleWeights: { quads: 0.4, glutes: 0.4, hamstrings: 0.2 }, dimension: "strength" },
  { id: "curtsy-lunge", name: "Curtsy Lunge", movementPattern: "lunge", equipment: "dumbbell", primaryMuscles: ["glutes", "quads"], secondaryMuscles: ["hamstrings"], muscleWeights: { glutes: 0.45, quads: 0.35, hamstrings: 0.2 }, dimension: "strength" },

  // ── Arm isolation (extended) ─────────────────────────────────────────────────
  { id: "preacher-curl", name: "Preacher Curl", movementPattern: "isolation", equipment: "barbell", primaryMuscles: ["biceps"], secondaryMuscles: ["forearms"], muscleWeights: { biceps: 0.85, forearms: 0.15 }, dimension: "strength" },
  { id: "incline-dumbbell-curl", name: "Incline Dumbbell Curl", movementPattern: "isolation", equipment: "dumbbell", primaryMuscles: ["biceps"], secondaryMuscles: ["forearms"], muscleWeights: { biceps: 0.85, forearms: 0.15 }, dimension: "strength" },
  { id: "concentration-curl", name: "Concentration Curl", movementPattern: "isolation", equipment: "dumbbell", primaryMuscles: ["biceps"], secondaryMuscles: ["forearms"], muscleWeights: { biceps: 0.9, forearms: 0.1 }, dimension: "strength" },
  { id: "reverse-curl", name: "Reverse Curl", movementPattern: "isolation", equipment: "barbell", primaryMuscles: ["forearms", "biceps"], secondaryMuscles: [], muscleWeights: { forearms: 0.5, biceps: 0.5 }, dimension: "strength" },
  { id: "overhead-triceps-extension", name: "Overhead Triceps Extension", movementPattern: "isolation", equipment: "dumbbell", primaryMuscles: ["triceps"], secondaryMuscles: [], muscleWeights: { triceps: 1.0 }, dimension: "strength" },

  // ── Shoulders / traps (extended) ─────────────────────────────────────────────
  { id: "cable-lateral-raise", name: "Cable Lateral Raise", movementPattern: "isolation", equipment: "cable", primaryMuscles: ["side_delt"], secondaryMuscles: ["front_delt", "trap"], muscleWeights: { side_delt: 0.78, front_delt: 0.12, trap: 0.1 }, dimension: "strength" },

  // ── Calves / lower leg (extended) ────────────────────────────────────────────
  { id: "seated-calf-raise", name: "Seated Calf Raise", movementPattern: "isolation", equipment: "machine", primaryMuscles: ["calves"], secondaryMuscles: [], muscleWeights: { calves: 1.0 }, dimension: "strength" },
  { id: "tibialis-raise", name: "Tibialis Raise", movementPattern: "isolation", equipment: "bodyweight", primaryMuscles: ["tibialis"], secondaryMuscles: [], muscleWeights: { tibialis: 1.0 }, dimension: "strength", isBodyweight: true },

  // ── Core (extended) ──────────────────────────────────────────────────────────
  { id: "ab-wheel-rollout", name: "Ab-Wheel Rollout", movementPattern: "isolation", equipment: "bodyweight", primaryMuscles: ["abs"], secondaryMuscles: ["obliques", "lat"], muscleWeights: { abs: 0.65, obliques: 0.2, lat: 0.15 }, dimension: "strength", isBodyweight: true },
  { id: "cable-crunch", name: "Cable Crunch", movementPattern: "isolation", equipment: "cable", primaryMuscles: ["abs"], secondaryMuscles: ["obliques"], muscleWeights: { abs: 0.8, obliques: 0.2 }, dimension: "strength" },
  { id: "pallof-press", name: "Pallof Press", movementPattern: "rotation", equipment: "cable", primaryMuscles: ["obliques"], secondaryMuscles: ["abs"], muscleWeights: { obliques: 0.6, abs: 0.4 }, dimension: "strength" },
  { id: "russian-twist", name: "Russian Twist", movementPattern: "rotation", equipment: "bodyweight", primaryMuscles: ["obliques"], secondaryMuscles: ["abs"], muscleWeights: { obliques: 0.65, abs: 0.35 }, dimension: "muscular_endurance", isBodyweight: true },
  { id: "side-plank", name: "Side Plank", movementPattern: "isometric", equipment: "bodyweight", primaryMuscles: ["obliques"], secondaryMuscles: ["abs", "lower_back"], muscleWeights: { obliques: 0.6, abs: 0.25, lower_back: 0.15 }, dimension: "muscular_endurance", isBodyweight: true },

  // ── Carry ────────────────────────────────────────────────────────────────────
  { id: "farmer-carry", name: "Farmer's Carry", movementPattern: "carry", equipment: "dumbbell", primaryMuscles: ["forearms", "trap"], secondaryMuscles: ["abs", "obliques"], muscleWeights: { forearms: 0.35, trap: 0.3, abs: 0.2, obliques: 0.15 }, dimension: "strength" },
  { id: "suitcase-carry", name: "Suitcase Carry", movementPattern: "carry", equipment: "kettlebell", primaryMuscles: ["obliques"], secondaryMuscles: ["forearms", "trap"], muscleWeights: { obliques: 0.5, forearms: 0.3, trap: 0.2 }, dimension: "strength" },

  // ── Cardio (no muscle attribution credit — pure energy-system work) ──────────
  {
    id: "run",
    name: "Run",
    movementPattern: "run",
    equipment: "none",
    primaryMuscles: [],
    secondaryMuscles: [],
    muscleWeights: {},
    dimension: "aerobic",
    isBodyweight: true,
  },
  {
    id: "row-erg",
    name: "Rowing Ergometer",
    movementPattern: "row_erg",
    equipment: "erg",
    primaryMuscles: [],
    secondaryMuscles: [],
    muscleWeights: {},
    dimension: "aerobic",
  },
  {
    id: "cycle",
    name: "Stationary Cycle",
    movementPattern: "cycle",
    equipment: "machine",
    primaryMuscles: [],
    secondaryMuscles: [],
    muscleWeights: {},
    dimension: "aerobic",
  },
  { id: "swim", name: "Swim", movementPattern: "swim", equipment: "none", primaryMuscles: [], secondaryMuscles: [], muscleWeights: {}, dimension: "aerobic", isBodyweight: true },
  { id: "ski-erg", name: "Ski Ergometer", movementPattern: "row_erg", equipment: "erg", primaryMuscles: [], secondaryMuscles: [], muscleWeights: {}, dimension: "aerobic" },
  { id: "elliptical", name: "Elliptical", movementPattern: "run", equipment: "machine", primaryMuscles: [], secondaryMuscles: [], muscleWeights: {}, dimension: "aerobic" },
  { id: "stairmaster", name: "Stair Climber", movementPattern: "run", equipment: "machine", primaryMuscles: [], secondaryMuscles: [], muscleWeights: {}, dimension: "aerobic" },
  { id: "jump-rope", name: "Jump Rope", movementPattern: "run", equipment: "none", primaryMuscles: [], secondaryMuscles: [], muscleWeights: {}, dimension: "aerobic", isBodyweight: true },
];

export const EXERCISE_BY_ID: Record<string, ExerciseDef> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e]),
);
