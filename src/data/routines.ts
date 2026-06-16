// Peak — built-in Gym routines (templates). Reference data.
//
// These seed the "start from a routine" flow. Each exercise id is verified to exist
// in EXERCISES (src/data/exercises.ts). Sets / rep-ranges are scaffolding the live
// session pre-fills as targets — the honest record is still the sets you log.

import type { RoutineDef, RoutineExercise } from "../types";

const E = (exerciseId: string, sets: number, repLow: number, repHigh: number): RoutineExercise =>
  ({ exerciseId, sets, repLow, repHigh });

export const BUILTIN_ROUTINES: RoutineDef[] = [
  {
    id: "routine.push",
    name: "Push Day",
    focus: "Push",
    blurb: "Chest, shoulders & triceps.",
    builtIn: true,
    exercises: [
      E("barbell-bench-press", 4, 5, 8),
      E("incline-dumbbell-press", 3, 8, 12),
      E("dumbbell-shoulder-press", 3, 8, 12),
      E("lateral-raise", 3, 12, 15),
      E("triceps-pushdown", 3, 10, 15),
      E("overhead-triceps-extension", 3, 10, 15),
    ],
  },
  {
    id: "routine.pull",
    name: "Pull Day",
    focus: "Pull",
    blurb: "Back & biceps.",
    builtIn: true,
    exercises: [
      E("pullup", 4, 5, 10),
      E("barbell-row", 4, 6, 10),
      E("lat-pulldown", 3, 8, 12),
      E("seated-cable-row", 3, 8, 12),
      E("face-pull", 3, 12, 20),
      E("barbell-curl", 3, 8, 12),
      E("hammer-curl", 3, 10, 15),
    ],
  },
  {
    id: "routine.legs",
    name: "Leg Day",
    focus: "Legs",
    blurb: "Quads, hamstrings, glutes & calves.",
    builtIn: true,
    exercises: [
      E("barbell-back-squat", 4, 5, 8),
      E("romanian-deadlift", 3, 8, 12),
      E("leg-press", 3, 10, 15),
      E("leg-curl", 3, 10, 15),
      E("walking-lunge", 3, 10, 12),
      E("seated-calf-raise", 4, 12, 20),
    ],
  },
  {
    id: "routine.upper",
    name: "Upper Body",
    focus: "Upper",
    blurb: "A balanced upper-body session.",
    builtIn: true,
    exercises: [
      E("barbell-bench-press", 4, 5, 8),
      E("barbell-row", 4, 6, 10),
      E("dumbbell-shoulder-press", 3, 8, 12),
      E("lat-pulldown", 3, 8, 12),
      E("barbell-curl", 3, 8, 12),
      E("triceps-pushdown", 3, 10, 15),
    ],
  },
  {
    id: "routine.lower",
    name: "Lower Body",
    focus: "Lower",
    blurb: "A balanced lower-body session.",
    builtIn: true,
    exercises: [
      E("barbell-back-squat", 4, 5, 8),
      E("romanian-deadlift", 3, 8, 12),
      E("bulgarian-split-squat", 3, 8, 12),
      E("leg-extension", 3, 12, 15),
      E("leg-curl", 3, 12, 15),
      E("calf-raise", 4, 12, 20),
    ],
  },
  {
    id: "routine.fullbody",
    name: "Full Body",
    focus: "Full Body",
    blurb: "One big compound from every pattern.",
    builtIn: true,
    exercises: [
      E("barbell-back-squat", 3, 5, 8),
      E("barbell-bench-press", 3, 5, 8),
      E("barbell-row", 3, 6, 10),
      E("dumbbell-shoulder-press", 3, 8, 12),
      E("romanian-deadlift", 3, 8, 12),
      E("hanging-leg-raise", 3, 10, 15),
    ],
  },
  {
    // Rep-based moves only — the live logger captures weight×reps, so isometric
    // holds (plank, side-plank) are intentionally left out to avoid fabricated reps.
    id: "routine.core",
    name: "Core Finisher",
    focus: "Core",
    blurb: "A short, sharp abs circuit.",
    builtIn: true,
    exercises: [
      E("hanging-leg-raise", 3, 8, 15),
      E("cable-crunch", 3, 12, 20),
      E("russian-twist", 3, 20, 30),
      E("ab-wheel-rollout", 3, 8, 15),
    ],
  },
];

export const ROUTINE_BY_ID: Record<string, RoutineDef> = Object.fromEntries(
  BUILTIN_ROUTINES.map((r) => [r.id, r]),
);
