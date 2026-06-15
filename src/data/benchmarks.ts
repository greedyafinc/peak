// Peak — benchmark library (§4.1, §4.2). Reference data: ONE protocol per `direct`
// leaf in the capability tree. Each protocol carries a concise representative test
// procedure, the raw-capture schema, rest guidance, the measure kind + units, and the
// confidence ceiling (= the leaf's launchConfidenceCeiling, §5.3). A ~5-7 protocol
// `starter` set spans ≥4 dimensions for onboarding (§4.5).
//
// Body-composition leaves are DERIVED from the composition snapshot (biometrics), not a
// timed test — their instructions say so and they are not starters.

import type { BenchmarkProtocol, LeafId } from "../types";
import { LEAF_BY_ID } from "./capabilityTree";

// Pull the confidence ceiling straight off the leaf so the two never drift.
function ceil(leafId: LeafId, fallback = 0.6): number {
  return LEAF_BY_ID[leafId]?.launchConfidenceCeiling ?? fallback;
}

const repMaxSchema = [
  { name: "load", type: "number", unit: "kg" },
  { name: "reps", type: "int", unit: "reps" },
] as const;

export const BENCHMARKS: BenchmarkProtocol[] = [
  // ── Strength — benchmark lifts (max_load 1RM) ───────────────────────────────
  {
    protocolId: "bench.1rm.v1",
    protocolVersion: 1,
    leafId: "strength.bench_1rm",
    dimension: "strength",
    movementPattern: "horizontal_push",
    primaryMuscles: ["chest", "front_delt", "triceps"],
    equipment: "barbell",
    measure: "max_load",
    units: "kg",
    normalizationMethod: "height_conditioned_strength",
    rawCaptureSchema: [...repMaxSchema],
    restGuidanceSec: 240,
    instructions:
      "Warm up thoroughly. Find the heaviest barbell bench press you can complete for 1 clean rep " +
      "with full range of motion (bar to chest, lockout). Log the load and reps; a 1–5 rep top set " +
      "is fine — Peak estimates 1RM via Epley. Use a spotter.",
    confidenceCeiling: ceil("strength.bench_1rm"),
    category: "Strength · Push",
    icon: "🏋️",
    starter: true,
  },
  {
    protocolId: "squat.1rm.v1",
    protocolVersion: 1,
    leafId: "strength.squat_1rm",
    dimension: "strength",
    movementPattern: "squat",
    primaryMuscles: ["quads", "glutes"],
    equipment: "barbell",
    measure: "max_load",
    units: "kg",
    normalizationMethod: "height_conditioned_strength",
    rawCaptureSchema: [...repMaxSchema],
    restGuidanceSec: 300,
    instructions:
      "Warm up. Back-squat to at least parallel (hip crease below knee). Find your heaviest clean " +
      "single, or log a 1–5 rep top set for an estimated 1RM. Use safeties or a spotter.",
    confidenceCeiling: ceil("strength.squat_1rm"),
    category: "Strength · Legs",
    icon: "🦵",
    starter: true,
  },
  {
    protocolId: "deadlift.1rm.v1",
    protocolVersion: 1,
    leafId: "strength.deadlift_1rm",
    dimension: "strength",
    movementPattern: "hinge",
    primaryMuscles: ["glutes", "hamstrings", "lower_back"],
    equipment: "barbell",
    measure: "max_load",
    units: "kg",
    normalizationMethod: "height_conditioned_strength",
    rawCaptureSchema: [...repMaxSchema],
    restGuidanceSec: 300,
    instructions:
      "Warm up. Conventional or sumo deadlift from the floor to full lockout (hips and knees " +
      "extended, shoulders back). Find your heaviest clean single, or log a 1–5 rep top set.",
    confidenceCeiling: ceil("strength.deadlift_1rm"),
    category: "Strength · Hinge",
    icon: "🪨",
  },
  {
    protocolId: "ohp.1rm.v1",
    protocolVersion: 1,
    leafId: "strength.ohp_1rm",
    dimension: "strength",
    movementPattern: "vertical_push",
    primaryMuscles: ["front_delt", "side_delt", "triceps"],
    equipment: "barbell",
    measure: "max_load",
    units: "kg",
    normalizationMethod: "height_conditioned_strength",
    rawCaptureSchema: [...repMaxSchema],
    restGuidanceSec: 240,
    instructions:
      "Strict standing overhead press: no leg drive. Press the bar from shoulder to full overhead " +
      "lockout. Find your heaviest clean single, or log a 1–5 rep top set.",
    confidenceCeiling: ceil("strength.ohp_1rm"),
    category: "Strength · Push",
    icon: "🙆",
  },

  // ── Power (jump_height / throw_distance) ────────────────────────────────────
  {
    protocolId: "vertical_jump.v1",
    protocolVersion: 1,
    leafId: "power.vertical_jump",
    dimension: "power",
    movementPattern: "jump",
    primaryMuscles: ["quads", "glutes", "calves"],
    equipment: "bodyweight",
    measure: "jump_height",
    units: "m",
    normalizationMethod: "power_norm",
    rawCaptureSchema: [{ name: "height", type: "number", unit: "m" }],
    restGuidanceSec: 90,
    instructions:
      "Countermovement vertical jump: stand, dip, and jump as high as possible reaching one hand up. " +
      "Measure the difference between standing reach and jump-touch height. Best of 3 attempts.",
    confidenceCeiling: ceil("power.vertical_jump", 0.75),
    category: "Power · Lower Body",
    icon: "⬆️",
    starter: true,
  },
  {
    protocolId: "broad_jump.v1",
    protocolVersion: 1,
    leafId: "power.broad_jump",
    dimension: "power",
    movementPattern: "jump",
    primaryMuscles: ["quads", "glutes", "hamstrings"],
    equipment: "bodyweight",
    measure: "jump_height", // closest MeasureKind; the captured raw is a horizontal distance
    units: "m",
    normalizationMethod: "power_norm",
    rawCaptureSchema: [{ name: "distance", type: "number", unit: "m" }],
    restGuidanceSec: 90,
    instructions:
      "Standing broad (long) jump: from a two-foot stance, swing the arms and jump forward as far as " +
      "possible, landing on both feet. Measure heel-to-takeoff distance. Best of 3.",
    confidenceCeiling: ceil("power.broad_jump", 0.7),
    category: "Power · Lower Body",
    icon: "↔️",
  },
  {
    protocolId: "med_ball_throw.v1",
    protocolVersion: 1,
    leafId: "power.med_ball_throw",
    dimension: "power",
    movementPattern: "rotation",
    primaryMuscles: ["chest", "front_delt", "triceps"],
    equipment: "none",
    measure: "throw_distance",
    units: "m",
    normalizationMethod: "power_norm",
    rawCaptureSchema: [{ name: "distance", type: "number", unit: "m" }],
    restGuidanceSec: 90,
    instructions:
      "Seated chest-pass throw with a 2–3kg medicine ball: sit upright against a wall and push the " +
      "ball forward explosively. Measure the throw distance. Best of 3 attempts.",
    confidenceCeiling: ceil("power.med_ball_throw", 0.65),
    category: "Power · Upper Body",
    icon: "🏐",
  },

  // ── Muscular endurance (rep_max / hold_duration) ────────────────────────────
  {
    protocolId: "pushups_max.v1",
    protocolVersion: 1,
    leafId: "muscular_endurance.pushups_max",
    dimension: "muscular_endurance",
    movementPattern: "horizontal_push",
    primaryMuscles: ["chest", "front_delt", "triceps"],
    equipment: "bodyweight",
    measure: "rep_max",
    units: "reps",
    normalizationMethod: "musc_endurance_norm",
    rawCaptureSchema: [{ name: "reps", type: "int", unit: "reps" }],
    restGuidanceSec: 0,
    instructions:
      "Maximum push-ups in a single continuous set to failure. Full range: chest to fist-height, " +
      "elbows to full lockout, body in a straight line. Rest only in the up position.",
    confidenceCeiling: ceil("muscular_endurance.pushups_max", 0.8),
    category: "Endurance · Upper Push",
    icon: "💪",
    starter: true,
  },
  {
    protocolId: "pullups_max.v1",
    protocolVersion: 1,
    leafId: "muscular_endurance.pullups_max",
    dimension: "muscular_endurance",
    movementPattern: "vertical_pull",
    primaryMuscles: ["lat", "biceps"],
    equipment: "bodyweight",
    measure: "rep_max",
    units: "reps",
    normalizationMethod: "musc_endurance_norm",
    rawCaptureSchema: [{ name: "reps", type: "int", unit: "reps" }],
    restGuidanceSec: 0,
    instructions:
      "Maximum strict pull-ups (overhand grip) in one set: dead hang to chin over the bar, no kipping. " +
      "Log 0 if you cannot complete one — that is a valid, honest result.",
    confidenceCeiling: ceil("muscular_endurance.pullups_max", 0.78),
    category: "Endurance · Upper Pull",
    icon: "🧗",
    starter: true,
  },
  {
    protocolId: "plank.v1",
    protocolVersion: 1,
    leafId: "muscular_endurance.plank",
    dimension: "muscular_endurance",
    movementPattern: "isometric",
    primaryMuscles: ["abs", "obliques"],
    equipment: "bodyweight",
    measure: "hold_duration",
    units: "sec",
    normalizationMethod: "musc_endurance_norm",
    rawCaptureSchema: [{ name: "duration", type: "duration", unit: "sec" }],
    restGuidanceSec: 0,
    instructions:
      "Front plank on forearms, body in a straight line from head to heels, hips level. Hold as long " +
      "as form is maintained. Stop when the hips sag or rise. Record total seconds.",
    confidenceCeiling: ceil("muscular_endurance.plank", 0.72),
    category: "Endurance · Core",
    icon: "🧘",
    starter: true,
  },
  {
    protocolId: "squats_bw.v1",
    protocolVersion: 1,
    leafId: "muscular_endurance.squats_bw",
    dimension: "muscular_endurance",
    movementPattern: "squat",
    primaryMuscles: ["quads", "glutes"],
    equipment: "bodyweight",
    measure: "rep_max",
    units: "reps",
    normalizationMethod: "musc_endurance_norm",
    rawCaptureSchema: [{ name: "reps", type: "int", unit: "reps" }],
    restGuidanceSec: 0,
    instructions:
      "Maximum bodyweight (air) squats in a single continuous set: thighs to at least parallel, full " +
      "stand at the top. Maintain control; stop when depth or tempo breaks down.",
    confidenceCeiling: ceil("muscular_endurance.squats_bw", 0.7),
    category: "Endurance · Lower",
    icon: "🪑",
  },

  // ── Aerobic (time_for_distance / vo2_proxy) ─────────────────────────────────
  {
    protocolId: "run_5k.v1",
    protocolVersion: 1,
    leafId: "aerobic.5k",
    dimension: "aerobic",
    movementPattern: "run",
    primaryMuscles: [],
    equipment: "none",
    measure: "time_for_distance",
    units: "sec",
    normalizationMethod: "wma_age_grade",
    rawCaptureSchema: [
      { name: "distance", type: "number", unit: "km" },
      { name: "duration", type: "duration", unit: "sec" },
    ],
    restGuidanceSec: 0,
    instructions:
      "Run 5 kilometers as fast as you can sustain, on a track, road, or treadmill (flat). Record " +
      "total finishing time. Warm up first; pace evenly.",
    confidenceCeiling: ceil("aerobic.5k", 0.9),
    category: "Aerobic · Running",
    icon: "🏃",
    starter: true,
  },
  {
    protocolId: "run_mile.v1",
    protocolVersion: 1,
    leafId: "aerobic.mile",
    dimension: "aerobic",
    movementPattern: "run",
    primaryMuscles: [],
    equipment: "none",
    measure: "time_for_distance",
    units: "sec",
    normalizationMethod: "wma_age_grade",
    rawCaptureSchema: [
      { name: "distance", type: "number", unit: "mi" },
      { name: "duration", type: "duration", unit: "sec" },
    ],
    restGuidanceSec: 0,
    instructions:
      "Run 1 mile (1.609 km) as fast as you can sustain, ideally on a 400m track (4 laps + 9m). " +
      "Record total finishing time. Warm up first.",
    confidenceCeiling: ceil("aerobic.mile", 0.88),
    category: "Aerobic · Running",
    icon: "🏃",
    starter: true,
  },
  {
    protocolId: "vo2_proxy.v1",
    protocolVersion: 1,
    leafId: "aerobic.vo2_proxy",
    dimension: "aerobic",
    movementPattern: "run",
    primaryMuscles: [],
    equipment: "none",
    measure: "vo2_proxy",
    units: "ml/kg/min",
    normalizationMethod: "vo2_relative",
    rawCaptureSchema: [{ name: "vo2", type: "number", unit: "ml/kg/min" }],
    restGuidanceSec: 0,
    instructions:
      "Estimated VO₂max (ml/kg/min). Auto-filled from a wearable (Apple Watch / Garmin) if available, " +
      "or estimate via the Cooper 12-minute run, the 1.5-mile run, or a submaximal step test.",
    confidenceCeiling: ceil("aerobic.vo2_proxy", 0.85),
    category: "Aerobic · Base",
    icon: "🫁",
  },
  {
    protocolId: "hr_recovery.v1",
    protocolVersion: 1,
    leafId: "aerobic.hr_recovery",
    dimension: "aerobic",
    movementPattern: "run",
    primaryMuscles: [],
    equipment: "none",
    measure: "hold_duration", // bpm-drop captured as a number; closest non-distance measure
    units: "bpm",
    normalizationMethod: "vo2_relative",
    rawCaptureSchema: [{ name: "bpmDrop", type: "number", unit: "bpm" }],
    restGuidanceSec: 0,
    instructions:
      "1-minute heart-rate recovery: at the end of a hard effort, note peak HR, then stand/walk " +
      "easy for 60 seconds and note HR again. Record the drop in bpm (peak − 1-min). Higher is better.",
    confidenceCeiling: ceil("aerobic.hr_recovery", 0.7),
    category: "Aerobic · Base",
    icon: "❤️",
  },

  // ── Anaerobic (sprint_time / distance_in_time) ──────────────────────────────
  {
    protocolId: "sprint_400m.v1",
    protocolVersion: 1,
    leafId: "anaerobic.400m",
    dimension: "anaerobic",
    movementPattern: "run",
    primaryMuscles: [],
    equipment: "none",
    measure: "sprint_time",
    units: "sec",
    normalizationMethod: "anaerobic_norm",
    rawCaptureSchema: [
      { name: "distance", type: "number", unit: "m" },
      { name: "duration", type: "duration", unit: "sec" },
    ],
    restGuidanceSec: 0,
    instructions:
      "400m all-out sprint (one lap of a standard track). Warm up thoroughly first. Record finishing " +
      "time. Maximal effort throughout.",
    confidenceCeiling: ceil("anaerobic.400m", 0.7),
    category: "Anaerobic · Sprint",
    icon: "💨",
  },
  {
    protocolId: "sprint_repeats.v1",
    protocolVersion: 1,
    leafId: "anaerobic.sprint_repeats",
    dimension: "anaerobic",
    movementPattern: "run",
    primaryMuscles: [],
    equipment: "none",
    measure: "sprint_time",
    units: "sec",
    normalizationMethod: "anaerobic_norm",
    rawCaptureSchema: [
      { name: "distance", type: "number", unit: "m" },
      { name: "duration", type: "duration", unit: "sec" },
    ],
    restGuidanceSec: 30,
    instructions:
      "Repeat-sprint ability: 6 × 40m maximal sprints with 30s recovery between each. Record the " +
      "MEAN per-rep time across the set (lower is better). Warm up first.",
    confidenceCeiling: ceil("anaerobic.sprint_repeats", 0.6),
    category: "Anaerobic · Sprint",
    icon: "🔁",
  },
  {
    protocolId: "max_effort_60s.v1",
    protocolVersion: 1,
    leafId: "anaerobic.max_effort_60s",
    dimension: "anaerobic",
    movementPattern: "row_erg",
    primaryMuscles: [],
    equipment: "erg",
    measure: "distance_in_time",
    units: "m",
    normalizationMethod: "anaerobic_norm",
    rawCaptureSchema: [
      { name: "distance", type: "number", unit: "m" },
      { name: "duration", type: "duration", unit: "sec" },
    ],
    restGuidanceSec: 0,
    instructions:
      "60-second max-effort: on a rowing erg (or running), cover as much distance as possible in 60 " +
      "seconds all-out. Record the distance in meters. Higher is better.",
    confidenceCeiling: ceil("anaerobic.max_effort_60s", 0.6),
    category: "Anaerobic · Power-Endurance",
    icon: "🚣",
  },

  // ── Mobility (rom / reach_distance) ─────────────────────────────────────────
  {
    protocolId: "mobility_hip.v1",
    protocolVersion: 1,
    leafId: "mobility.hip",
    dimension: "mobility",
    movementPattern: "mobility",
    primaryMuscles: [],
    equipment: "none",
    measure: "rom",
    units: "degree",
    normalizationMethod: "rom_norm",
    rawCaptureSchema: [{ name: "angle", type: "number", unit: "degree" }],
    restGuidanceSec: 0,
    instructions:
      "Active hip-flexion ROM: lying on your back, draw one knee toward the chest, keeping the other " +
      "leg flat. Measure the thigh-to-torso angle (degrees) with a goniometer or phone-angle app.",
    confidenceCeiling: ceil("mobility.hip", 0.7),
    category: "Mobility · Joint ROM",
    icon: "🦴",
  },
  {
    protocolId: "mobility_shoulder.v1",
    protocolVersion: 1,
    leafId: "mobility.shoulder",
    dimension: "mobility",
    movementPattern: "mobility",
    primaryMuscles: [],
    equipment: "none",
    measure: "rom",
    units: "degree",
    normalizationMethod: "rom_norm",
    rawCaptureSchema: [{ name: "angle", type: "number", unit: "degree" }],
    restGuidanceSec: 0,
    instructions:
      "Active shoulder-flexion ROM: standing, raise a straight arm forward and overhead as far as " +
      "possible without arching the back. Measure the arm-to-torso angle (degrees).",
    confidenceCeiling: ceil("mobility.shoulder", 0.7),
    category: "Mobility · Joint ROM",
    icon: "🦴",
  },
  {
    protocolId: "mobility_ankle.v1",
    protocolVersion: 1,
    leafId: "mobility.ankle",
    dimension: "mobility",
    movementPattern: "mobility",
    primaryMuscles: [],
    equipment: "none",
    measure: "rom",
    units: "degree",
    normalizationMethod: "rom_norm",
    rawCaptureSchema: [{ name: "angle", type: "number", unit: "degree" }],
    restGuidanceSec: 0,
    instructions:
      "Ankle dorsiflexion ROM (knee-to-wall): kneel with toes a fixed distance from a wall and drive " +
      "the knee toward it, heel down. Measure the shin-to-vertical angle (degrees).",
    confidenceCeiling: ceil("mobility.ankle", 0.68),
    category: "Mobility · Joint ROM",
    icon: "🦶",
  },
  {
    protocolId: "mobility_spine.v1",
    protocolVersion: 1,
    leafId: "mobility.spine",
    dimension: "mobility",
    movementPattern: "mobility",
    primaryMuscles: [],
    equipment: "none",
    measure: "reach_distance",
    units: "m",
    normalizationMethod: "rom_norm",
    rawCaptureSchema: [{ name: "distance", type: "number", unit: "m" }],
    restGuidanceSec: 0,
    instructions:
      "Sit-and-reach: seated with legs straight and feet against a box (foot line ≈ 0.23m), reach " +
      "forward as far as possible and hold. Record the reach distance in meters (past the toes is more).",
    confidenceCeiling: ceil("mobility.spine", 0.72),
    category: "Mobility · Joint ROM",
    icon: "🤸",
  },

  // ── Balance (balance_hold / reach_distance) — low confidence ────────────────
  {
    protocolId: "balance_single_leg.v1",
    protocolVersion: 1,
    leafId: "balance.single_leg_eyes_closed",
    dimension: "balance",
    movementPattern: "isometric",
    primaryMuscles: [],
    equipment: "none",
    measure: "balance_hold",
    units: "sec",
    normalizationMethod: "balance_norm",
    rawCaptureSchema: [{ name: "duration", type: "duration", unit: "sec" }],
    restGuidanceSec: 30,
    instructions:
      "Single-leg stance, EYES CLOSED: stand on one leg, hands on hips, close your eyes. Time until " +
      "the free foot touches down or you hop/open your eyes. Best of 3. Have something to grab nearby.",
    confidenceCeiling: ceil("balance.single_leg_eyes_closed", 0.45),
    category: "Balance · Static",
    icon: "🧍",
  },
  {
    protocolId: "balance_y.v1",
    protocolVersion: 1,
    leafId: "balance.y_balance",
    dimension: "balance",
    movementPattern: "mobility",
    primaryMuscles: [],
    equipment: "none",
    measure: "reach_distance",
    units: "percent",
    normalizationMethod: "balance_norm",
    rawCaptureSchema: [{ name: "composite", type: "number", unit: "percent" }],
    restGuidanceSec: 30,
    instructions:
      "Y-Balance (lower quarter): balancing on one leg, reach the free foot as far as possible in " +
      "anterior, posteromedial, and posterolateral directions. Composite reach = sum ÷ (3 × limb " +
      "length) × 100, as a percent of limb length.",
    confidenceCeiling: ceil("balance.y_balance", 0.42),
    category: "Balance · Dynamic",
    icon: "🌟",
  },

  // ── Agility (agility_time) — DEFERRED (carried, not scored at launch) ────────
  {
    protocolId: "agility_5_10_5.v1",
    protocolVersion: 1,
    leafId: "agility.5_10_5",
    dimension: "agility",
    movementPattern: "run",
    primaryMuscles: [],
    equipment: "none",
    measure: "agility_time",
    units: "sec",
    normalizationMethod: "agility_norm",
    rawCaptureSchema: [{ name: "duration", type: "duration", unit: "sec" }],
    restGuidanceSec: 120,
    instructions:
      "5-10-5 pro-agility shuttle: start straddling a center line, sprint 5 yards one way, touch, " +
      "10 yards the other way, touch, 5 yards back through center. Record total time. (Deferred at launch.)",
    confidenceCeiling: ceil("agility.5_10_5", 0.35),
    category: "Agility · Change of Direction",
    icon: "🔀",
  },
  {
    protocolId: "agility_t_test.v1",
    protocolVersion: 1,
    leafId: "agility.t_test",
    dimension: "agility",
    movementPattern: "run",
    primaryMuscles: [],
    equipment: "none",
    measure: "agility_time",
    units: "sec",
    normalizationMethod: "agility_norm",
    rawCaptureSchema: [{ name: "duration", type: "duration", unit: "sec" }],
    restGuidanceSec: 120,
    instructions:
      "T-test: sprint forward 10 yards, shuffle 5 yards left, 10 yards right, 5 yards back to center, " +
      "then backpedal 10 yards to start. Record total time. (Deferred at launch.)",
    confidenceCeiling: ceil("agility.t_test", 0.33),
    category: "Agility · Coordination",
    icon: "🔀",
  },

  // ── Body composition (composition) — DERIVED from biometrics, not a timed test ──
  {
    protocolId: "ffmi.v1",
    protocolVersion: 1,
    leafId: "body_composition.ffmi",
    dimension: "body_composition",
    movementPattern: "isometric", // n/a; no movement — placeholder pattern
    primaryMuscles: [],
    equipment: "none",
    measure: "composition",
    units: "kg/m2",
    normalizationMethod: "ffmi",
    rawCaptureSchema: [
      { name: "ffmi", type: "number", unit: "kg/m2" },
      { name: "bodyFatPct", type: "number", unit: "percent" },
    ],
    restGuidanceSec: 0,
    instructions:
      "DERIVED FROM BIOMETRICS — not a timed test. FFMI = lean mass / height². Populated from your " +
      "composition snapshot (HealthKit/Google Fit, DEXA, or BIA), never manually logged as a workout.",
    confidenceCeiling: ceil("body_composition.ffmi", 0.85),
    category: "Body Composition · Lean Mass",
    icon: "🧬",
  },
  {
    protocolId: "bf_band.v1",
    protocolVersion: 1,
    leafId: "body_composition.bf_band",
    dimension: "body_composition",
    movementPattern: "isometric", // n/a; no movement — placeholder pattern
    primaryMuscles: [],
    equipment: "none",
    measure: "composition",
    units: "percent",
    normalizationMethod: "bf_band",
    rawCaptureSchema: [
      { name: "bodyFatPct", type: "number", unit: "percent" },
      { name: "ffmi", type: "number", unit: "kg/m2" },
    ],
    restGuidanceSec: 0,
    instructions:
      "DERIVED FROM BIOMETRICS — not a timed test. Body-fat % scored against a healthy target band " +
      "(never 'leaner is always better'). Populated from your composition snapshot (DEXA/BIA/HealthKit).",
    confidenceCeiling: ceil("body_composition.bf_band", 0.85),
    category: "Body Composition · Leanness",
    icon: "📊",
  },
];

export const BENCHMARK_BY_LEAF: Record<LeafId, BenchmarkProtocol> = Object.fromEntries(
  BENCHMARKS.map((b) => [b.leafId, b]),
);
