// Peak — the capability tree (§2.1, §6.5): dimensions → sub-categories → leaves.
// Reference data, versioned, not user data. Every leaf declares its normalizer
// (chosen before it ships, §2.2), its raw unit, its muscle/movement links, and
// its launch confidence ceiling (cold-start honesty, §5.3). Leaves are the only
// level carrying a percentile; everything above is a rollup (§2.6).

import type { CapabilityLeaf, DimensionId, DimensionMeta, MuscleGroup } from "../types";
import { DIM_WEIGHT, STALE_DAYS } from "../constants";

export const DIMENSIONS: DimensionMeta[] = [
  { id: "strength", label: "Maximal Strength", blurb: "The largest capability surface — per-muscle strength inferred from your lifts plus benchmark 1RMs, conditioned on your frame.", weight: DIM_WEIGHT.strength, color: "#c6ff3d", performed: true },
  { id: "power", label: "Power & Explosiveness", blurb: "Rate of force — how fast you can express strength. Jumps and throws vs your build.", weight: DIM_WEIGHT.power, color: "#ff5a3c", performed: true },
  { id: "muscular_endurance", label: "Muscular Endurance", blurb: "Reps and holds to local muscular fatigue — distinct from whole-body aerobic capacity.", weight: DIM_WEIGHT.muscular_endurance, color: "#ffd23f", performed: true },
  { id: "aerobic", label: "Aerobic Endurance", blurb: "Sustained aerobic output — age-graded running and VO₂ base.", weight: DIM_WEIGHT.aerobic, color: "#3dffb0", performed: true },
  { id: "anaerobic", label: "Anaerobic Capacity", blurb: "Short maximal-effort output — sprints and power-endurance.", weight: DIM_WEIGHT.anaerobic, color: "#ff8a3d", performed: true },
  { id: "mobility", label: "Mobility & Flexibility", blurb: "Range of motion per joint, conditioned on your build.", weight: DIM_WEIGHT.mobility, color: "#5aa9ff", performed: true },
  { id: "balance", label: "Balance & Stability", blurb: "Postural and dynamic stability. Launches low-confidence — population norms are thin.", weight: DIM_WEIGHT.balance, color: "#9b8cff", performed: true, lowConfidence: true },
  { id: "agility", label: "Agility & Coordination", blurb: "Change of direction and coordination. Lowest-confidence — coming in a later release.", weight: DIM_WEIGHT.agility, color: "#ff6fb5", performed: true, lowConfidence: true },
  { id: "body_composition", label: "Body Composition", blurb: "Fat-vs-lean (FFMI + body-fat band), never BMI. Elevated weight because bodyweight is excluded from strength.", weight: DIM_WEIGHT.body_composition, color: "#7ad8ff", performed: true },
  { id: "consistency", label: "Consistency", blurb: "Momentum — did you show up. Scored on its own track, never blended into the Peak Score.", weight: 0, color: "#c6ff3d", performed: false },
];

export const DIM_META: Record<DimensionId, DimensionMeta> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.id, d]),
) as Record<DimensionId, DimensionMeta>;

// Helper to keep leaf authoring terse.
function leaf(l: Omit<CapabilityLeaf, "staleAfterDays"> & { staleAfterDays?: number }): CapabilityLeaf {
  return { staleAfterDays: l.staleAfterDays ?? STALE_DAYS[l.dimension] ?? 60, ...l };
}

const HC = "height_conditioned_strength" as const;

// ── Inferred per-muscle strength leaves (§4.3) — body-map detail ─────────────
// All `inferred`, normalized by height_conditioned_strength, fed passively by
// logged sets via each exercise's muscleWeights. Launch low-confidence (bridge).
const MUSCLE_SUBCAT: Record<MuscleGroup, string> = {
  chest: "strength.push", front_delt: "strength.push", triceps: "strength.push",
  side_delt: "strength.shoulders", rear_delt: "strength.shoulders", trap: "strength.shoulders",
  lat: "strength.pull", biceps: "strength.pull", forearms: "strength.pull",
  quads: "strength.legs", glutes: "strength.legs", hamstrings: "strength.legs", calves: "strength.legs", tibialis: "strength.legs",
  abs: "strength.core", obliques: "strength.core", lower_back: "strength.core",
};

const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  chest: "Chest", front_delt: "Front Delts", side_delt: "Side Delts", rear_delt: "Rear Delts",
  triceps: "Triceps", biceps: "Biceps", forearms: "Forearms", lat: "Lats", trap: "Traps",
  lower_back: "Lower Back", abs: "Abs", obliques: "Obliques", glutes: "Glutes",
  quads: "Quads", hamstrings: "Hamstrings", calves: "Calves", tibialis: "Tibialis",
};

export const ALL_MUSCLES: MuscleGroup[] = [
  "chest", "front_delt", "side_delt", "rear_delt", "triceps", "biceps", "forearms",
  "lat", "trap", "lower_back", "abs", "obliques", "glutes", "quads", "hamstrings", "calves", "tibialis",
];

const muscleLeaves: CapabilityLeaf[] = ALL_MUSCLES.map((mg) =>
  leaf({
    id: `strength.${mg}`,
    label: MUSCLE_LABEL[mg],
    dimension: "strength",
    subCategory: MUSCLE_SUBCAT[mg],
    kind: "inferred",
    muscleGroups: [mg],
    movementPatterns: [],
    contributingExerciseIds: [],
    normalizer: { method: HC, version: "1", conditionsOn: ["sex", "height", "age"] },
    unit: "kg",
    launchConfidenceCeiling: 0.5,
  }),
);

// ── Direct benchmark lifts (§2.1) ────────────────────────────────────────────
const benchmarkLifts: CapabilityLeaf[] = [
  leaf({ id: "strength.bench_1rm", label: "Bench Press 1RM", dimension: "strength", subCategory: "strength.benchmark_lifts", kind: "direct", muscleGroups: ["chest", "front_delt", "triceps"], movementPatterns: ["horizontal_push"], contributingExerciseIds: ["barbell-bench-press"], normalizer: { method: HC, version: "1", conditionsOn: ["sex", "height", "age"] }, unit: "kg", launchConfidenceCeiling: 0.6 }),
  leaf({ id: "strength.squat_1rm", label: "Back Squat 1RM", dimension: "strength", subCategory: "strength.benchmark_lifts", kind: "direct", muscleGroups: ["quads", "glutes"], movementPatterns: ["squat"], contributingExerciseIds: ["barbell-back-squat"], normalizer: { method: HC, version: "1", conditionsOn: ["sex", "height", "age"] }, unit: "kg", launchConfidenceCeiling: 0.6 }),
  leaf({ id: "strength.deadlift_1rm", label: "Deadlift 1RM", dimension: "strength", subCategory: "strength.benchmark_lifts", kind: "direct", muscleGroups: ["glutes", "hamstrings", "lower_back"], movementPatterns: ["hinge"], contributingExerciseIds: ["barbell-deadlift"], normalizer: { method: HC, version: "1", conditionsOn: ["sex", "height", "age"] }, unit: "kg", launchConfidenceCeiling: 0.6 }),
  leaf({ id: "strength.ohp_1rm", label: "Overhead Press 1RM", dimension: "strength", subCategory: "strength.benchmark_lifts", kind: "direct", muscleGroups: ["front_delt", "side_delt", "triceps"], movementPatterns: ["vertical_push"], contributingExerciseIds: ["barbell-overhead-press"], normalizer: { method: HC, version: "1", conditionsOn: ["sex", "height", "age"] }, unit: "kg", launchConfidenceCeiling: 0.6 }),
];

// ── Other performed dimensions ───────────────────────────────────────────────
const otherLeaves: CapabilityLeaf[] = [
  // power — mass-relative
  leaf({ id: "power.vertical_jump", label: "Vertical Jump", dimension: "power", subCategory: "power.lower_body", kind: "direct", muscleGroups: ["quads", "glutes", "calves"], movementPatterns: ["jump"], contributingExerciseIds: [], normalizer: { method: "power_norm", version: "1", conditionsOn: ["sex", "height", "age"] }, unit: "m", massRelative: true, launchConfidenceCeiling: 0.75 }),
  leaf({ id: "power.broad_jump", label: "Broad Jump", dimension: "power", subCategory: "power.lower_body", kind: "direct", muscleGroups: ["quads", "glutes", "hamstrings"], movementPatterns: ["jump"], contributingExerciseIds: [], normalizer: { method: "power_norm", version: "1", conditionsOn: ["sex", "height", "age"] }, unit: "m", massRelative: true, launchConfidenceCeiling: 0.7 }),
  leaf({ id: "power.med_ball_throw", label: "Med-Ball Throw", dimension: "power", subCategory: "power.upper_body", kind: "direct", muscleGroups: ["chest", "front_delt", "triceps"], movementPatterns: ["rotation"], contributingExerciseIds: [], normalizer: { method: "power_norm", version: "1", conditionsOn: ["sex", "age", "height"] }, unit: "m", launchConfidenceCeiling: 0.65 }),

  // muscular_endurance — mass-relative
  leaf({ id: "muscular_endurance.pushups_max", label: "Max Push-ups", dimension: "muscular_endurance", subCategory: "me.upper_push", kind: "direct", muscleGroups: ["chest", "front_delt", "triceps"], movementPatterns: ["horizontal_push"], contributingExerciseIds: ["pushup"], normalizer: { method: "musc_endurance_norm", version: "1", conditionsOn: ["sex", "age"] }, unit: "reps", massRelative: true, launchConfidenceCeiling: 0.8 }),
  leaf({ id: "muscular_endurance.pullups_max", label: "Max Pull-ups", dimension: "muscular_endurance", subCategory: "me.upper_pull", kind: "direct", muscleGroups: ["lat", "biceps"], movementPatterns: ["vertical_pull"], contributingExerciseIds: ["pullup"], normalizer: { method: "musc_endurance_norm", version: "1", conditionsOn: ["sex", "age"] }, unit: "reps", massRelative: true, launchConfidenceCeiling: 0.78 }),
  leaf({ id: "muscular_endurance.plank", label: "Plank Hold", dimension: "muscular_endurance", subCategory: "me.core", kind: "direct", muscleGroups: ["abs", "obliques"], movementPatterns: ["isometric"], contributingExerciseIds: ["plank"], normalizer: { method: "musc_endurance_norm", version: "1", conditionsOn: ["sex", "age"] }, unit: "sec", launchConfidenceCeiling: 0.72 }),
  leaf({ id: "muscular_endurance.squats_bw", label: "Bodyweight Squats", dimension: "muscular_endurance", subCategory: "me.lower", kind: "direct", muscleGroups: ["quads", "glutes"], movementPatterns: ["squat"], contributingExerciseIds: [], normalizer: { method: "musc_endurance_norm", version: "1", conditionsOn: ["sex", "age"] }, unit: "reps", massRelative: true, launchConfidenceCeiling: 0.7 }),

  // aerobic — mass-relative
  leaf({ id: "aerobic.5k", label: "5K Run", dimension: "aerobic", subCategory: "aerobic.running", kind: "direct", muscleGroups: [], movementPatterns: ["run"], contributingExerciseIds: [], normalizer: { method: "wma_age_grade", version: "1", conditionsOn: ["sex", "age"] }, unit: "sec", massRelative: true, launchConfidenceCeiling: 0.9 }),
  leaf({ id: "aerobic.mile", label: "1-Mile Run", dimension: "aerobic", subCategory: "aerobic.running", kind: "direct", muscleGroups: [], movementPatterns: ["run"], contributingExerciseIds: [], normalizer: { method: "wma_age_grade", version: "1", conditionsOn: ["sex", "age"] }, unit: "sec", massRelative: true, launchConfidenceCeiling: 0.88 }),
  leaf({ id: "aerobic.vo2_proxy", label: "VO₂max (estimated)", dimension: "aerobic", subCategory: "aerobic.vo2", kind: "direct", muscleGroups: [], movementPatterns: ["run"], contributingExerciseIds: [], normalizer: { method: "vo2_relative", version: "1", conditionsOn: ["sex", "age"] }, unit: "ml/kg/min", massRelative: true, launchConfidenceCeiling: 0.85 }),
  leaf({ id: "aerobic.hr_recovery", label: "HR Recovery (1 min)", dimension: "aerobic", subCategory: "aerobic.vo2", kind: "direct", muscleGroups: [], movementPatterns: ["run"], contributingExerciseIds: [], normalizer: { method: "vo2_relative", version: "1", conditionsOn: ["sex", "age"] }, unit: "bpm", launchConfidenceCeiling: 0.7 }),

  // aerobic — endurance EVENTS (longer road races + multisport feats). Age-graded
  // finishing times; mass-relative; the triathlon leaves are thinner-seed (lower ceiling).
  leaf({ id: "aerobic.10k", label: "10K Run", dimension: "aerobic", subCategory: "aerobic.events", kind: "direct", muscleGroups: [], movementPatterns: ["run"], contributingExerciseIds: [], normalizer: { method: "wma_age_grade", version: "1", conditionsOn: ["sex", "age"] }, unit: "sec", massRelative: true, launchConfidenceCeiling: 0.88 }),
  leaf({ id: "aerobic.half_marathon", label: "Half Marathon", dimension: "aerobic", subCategory: "aerobic.events", kind: "direct", muscleGroups: [], movementPatterns: ["run"], contributingExerciseIds: [], normalizer: { method: "wma_age_grade", version: "1", conditionsOn: ["sex", "age"] }, unit: "sec", massRelative: true, launchConfidenceCeiling: 0.85 }),
  leaf({ id: "aerobic.marathon", label: "Marathon", dimension: "aerobic", subCategory: "aerobic.events", kind: "direct", muscleGroups: [], movementPatterns: ["run"], contributingExerciseIds: [], normalizer: { method: "wma_age_grade", version: "1", conditionsOn: ["sex", "age"] }, unit: "sec", massRelative: true, launchConfidenceCeiling: 0.82 }),
  leaf({ id: "aerobic.tri_sprint", label: "Sprint Triathlon", dimension: "aerobic", subCategory: "aerobic.events", kind: "direct", muscleGroups: [], movementPatterns: ["run"], contributingExerciseIds: [], normalizer: { method: "wma_age_grade", version: "1", conditionsOn: ["sex", "age"] }, unit: "sec", massRelative: true, launchConfidenceCeiling: 0.62 }),
  leaf({ id: "aerobic.tri_olympic", label: "Olympic Triathlon", dimension: "aerobic", subCategory: "aerobic.events", kind: "direct", muscleGroups: [], movementPatterns: ["run"], contributingExerciseIds: [], normalizer: { method: "wma_age_grade", version: "1", conditionsOn: ["sex", "age"] }, unit: "sec", massRelative: true, launchConfidenceCeiling: 0.6 }),
  leaf({ id: "aerobic.tri_70_3", label: "Half-Ironman (70.3)", dimension: "aerobic", subCategory: "aerobic.events", kind: "direct", muscleGroups: [], movementPatterns: ["run"], contributingExerciseIds: [], normalizer: { method: "wma_age_grade", version: "1", conditionsOn: ["sex", "age"] }, unit: "sec", massRelative: true, launchConfidenceCeiling: 0.58 }),
  leaf({ id: "aerobic.tri_ironman", label: "Ironman (140.6)", dimension: "aerobic", subCategory: "aerobic.events", kind: "direct", muscleGroups: [], movementPatterns: ["run"], contributingExerciseIds: [], normalizer: { method: "wma_age_grade", version: "1", conditionsOn: ["sex", "age"] }, unit: "sec", massRelative: true, launchConfidenceCeiling: 0.55 }),

  // anaerobic — mass-relative
  leaf({ id: "anaerobic.400m", label: "400m Sprint", dimension: "anaerobic", subCategory: "anaerobic.sprint", kind: "direct", muscleGroups: [], movementPatterns: ["run"], contributingExerciseIds: [], normalizer: { method: "anaerobic_norm", version: "1", conditionsOn: ["sex", "age"] }, unit: "sec", massRelative: true, launchConfidenceCeiling: 0.7 }),
  leaf({ id: "anaerobic.sprint_repeats", label: "Repeat Sprint Ability", dimension: "anaerobic", subCategory: "anaerobic.sprint", kind: "direct", muscleGroups: [], movementPatterns: ["run"], contributingExerciseIds: [], normalizer: { method: "anaerobic_norm", version: "1", conditionsOn: ["sex", "age"] }, unit: "sec", massRelative: true, launchConfidenceCeiling: 0.6 }),
  leaf({ id: "anaerobic.max_effort_60s", label: "60s Max Effort", dimension: "anaerobic", subCategory: "anaerobic.power_endurance", kind: "direct", muscleGroups: [], movementPatterns: ["row_erg"], contributingExerciseIds: [], normalizer: { method: "anaerobic_norm", version: "1", conditionsOn: ["sex", "age"] }, unit: "m", launchConfidenceCeiling: 0.6 }),

  // mobility
  leaf({ id: "mobility.hip", label: "Hip Mobility", dimension: "mobility", subCategory: "mobility.joint", kind: "direct", muscleGroups: [], movementPatterns: ["mobility"], contributingExerciseIds: [], normalizer: { method: "rom_norm", version: "1", conditionsOn: ["sex", "age"] }, unit: "degree", launchConfidenceCeiling: 0.7 }),
  leaf({ id: "mobility.shoulder", label: "Shoulder Mobility", dimension: "mobility", subCategory: "mobility.joint", kind: "direct", muscleGroups: [], movementPatterns: ["mobility"], contributingExerciseIds: [], normalizer: { method: "rom_norm", version: "1", conditionsOn: ["sex", "age"] }, unit: "degree", launchConfidenceCeiling: 0.7 }),
  leaf({ id: "mobility.ankle", label: "Ankle Mobility", dimension: "mobility", subCategory: "mobility.joint", kind: "direct", muscleGroups: [], movementPatterns: ["mobility"], contributingExerciseIds: [], normalizer: { method: "rom_norm", version: "1", conditionsOn: ["sex", "age"] }, unit: "degree", launchConfidenceCeiling: 0.68 }),
  leaf({ id: "mobility.spine", label: "Sit & Reach", dimension: "mobility", subCategory: "mobility.joint", kind: "direct", muscleGroups: [], movementPatterns: ["mobility"], contributingExerciseIds: [], normalizer: { method: "rom_norm", version: "1", conditionsOn: ["sex", "age"] }, unit: "m", launchConfidenceCeiling: 0.72 }),

  // balance — low confidence
  leaf({ id: "balance.single_leg_eyes_closed", label: "Single-Leg (eyes closed)", dimension: "balance", subCategory: "balance.static", kind: "direct", muscleGroups: [], movementPatterns: ["isometric"], contributingExerciseIds: [], normalizer: { method: "balance_norm", version: "1", conditionsOn: ["sex", "age"] }, unit: "sec", launchConfidenceCeiling: 0.45 }),
  leaf({ id: "balance.y_balance", label: "Y-Balance Reach", dimension: "balance", subCategory: "balance.dynamic", kind: "direct", muscleGroups: [], movementPatterns: ["mobility"], contributingExerciseIds: [], normalizer: { method: "balance_norm", version: "1", conditionsOn: ["sex", "age"] }, unit: "percent", launchConfidenceCeiling: 0.42 }),

  // agility — deferred (carried in taxonomy, not scored at launch)
  leaf({ id: "agility.5_10_5", label: "5-10-5 Pro Agility", dimension: "agility", subCategory: "agility.change_of_direction", kind: "direct", muscleGroups: [], movementPatterns: ["run"], contributingExerciseIds: [], normalizer: { method: "agility_norm", version: "1", conditionsOn: ["sex", "age"] }, unit: "sec", launchConfidenceCeiling: 0.35, deferred: true }),
  leaf({ id: "agility.t_test", label: "T-Test", dimension: "agility", subCategory: "agility.coordination", kind: "direct", muscleGroups: [], movementPatterns: ["run"], contributingExerciseIds: [], normalizer: { method: "agility_norm", version: "1", conditionsOn: ["sex", "age"] }, unit: "sec", launchConfidenceCeiling: 0.33, deferred: true }),

  // body_composition
  leaf({ id: "body_composition.ffmi", label: "FFMI (lean mass)", dimension: "body_composition", subCategory: "body_composition.lean", kind: "direct", muscleGroups: [], movementPatterns: [], contributingExerciseIds: [], normalizer: { method: "ffmi", version: "1", conditionsOn: ["sex", "age"] }, unit: "kg/m2", launchConfidenceCeiling: 0.85 }),
  leaf({ id: "body_composition.bf_band", label: "Body-Fat Band", dimension: "body_composition", subCategory: "body_composition.fat", kind: "direct", muscleGroups: [], movementPatterns: [], contributingExerciseIds: [], normalizer: { method: "bf_band", version: "1", conditionsOn: ["sex", "age"] }, unit: "percent", launchConfidenceCeiling: 0.85 }),
];

export const LEAVES: CapabilityLeaf[] = [...benchmarkLifts, ...muscleLeaves, ...otherLeaves];

export const LEAF_BY_ID: Record<string, CapabilityLeaf> = Object.fromEntries(LEAVES.map((l) => [l.id, l]));

// Sub-category display labels.
export const SUBCAT_LABEL: Record<string, string> = {
  "strength.benchmark_lifts": "Benchmark Lifts",
  "strength.push": "Push", "strength.shoulders": "Shoulders", "strength.pull": "Pull",
  "strength.legs": "Legs", "strength.core": "Core",
  "power.lower_body": "Lower Body", "power.upper_body": "Upper Body",
  "me.upper_push": "Upper Push", "me.upper_pull": "Upper Pull", "me.core": "Core", "me.lower": "Lower",
  "aerobic.running": "Running", "aerobic.vo2": "Aerobic Base", "aerobic.events": "Endurance Events",
  "anaerobic.sprint": "Sprint", "anaerobic.power_endurance": "Power-Endurance",
  "mobility.joint": "Joint ROM",
  "balance.static": "Static", "balance.dynamic": "Dynamic",
  "agility.change_of_direction": "Change of Direction", "agility.coordination": "Coordination",
  "body_composition.lean": "Lean Mass", "body_composition.fat": "Leanness",
};

// Performed dimensions only (the 9 that roll into the headline; consistency excluded).
export const PERFORMED_DIMENSIONS: DimensionId[] = DIMENSIONS.filter((d) => d.performed).map((d) => d.id);

export function leavesForDimension(dim: DimensionId): CapabilityLeaf[] {
  return LEAVES.filter((l) => l.dimension === dim);
}

export function leavesForSubcategory(sub: string): CapabilityLeaf[] {
  return LEAVES.filter((l) => l.subCategory === sub);
}

export function subcategoriesForDimension(dim: DimensionId): string[] {
  const seen: string[] = [];
  for (const l of leavesForDimension(dim)) if (!seen.includes(l.subCategory)) seen.push(l.subCategory);
  return seen;
}
