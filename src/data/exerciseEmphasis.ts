// Peak — per-exercise intra-muscle emphasis DATA (split out of muscleRegions.ts).
//
// This module holds the *data* for the granular attribution layer: the even-split fallback
// (`DEFAULT_REGION_SPLIT`) and the per-exercise region-share overrides (`REGION_EMPHASIS`).
// The TYPES, the `MUSCLE_REGIONS` taxonomy, the group↔region indices, and the helpers that
// consume this data (regionWeightsForExercise, regionSharesForExercise, groupHasSubRegions,
// regionLabel, …) live in ./muscleRegions, which re-exports these two maps so existing
// importers of "../data/muscleRegions" keep working unchanged.
//
// Many exercises share the exact same intra-group split (e.g. the flat-bench chest split, the
// standard row biceps split). Those recurring splits are named pattern constants below and
// referenced by name so the data stays DRY; the resulting objects are value- and key-order-
// identical to the original inline literals, so computed output is unchanged. A few entries use
// a non-canonical region key order and are intentionally left inline to preserve byte-identical
// serialization.

import type { MuscleGroup, MuscleRegion } from "../types";

type GroupSplit = Partial<Record<MuscleRegion, number>>;

// ── Recurring intra-group split patterns (each appears across many exercises) ──
// Region key order matches the canonical REGIONS_BY_GROUP order so JSON serialization is stable.

// Chest
const CHEST_FLAT: GroupSplit = { chest_upper: 0.25, chest_mid: 0.45, chest_lower: 0.3 };
const CHEST_INCLINE: GroupSplit = { chest_upper: 0.5, chest_mid: 0.35, chest_lower: 0.15 };
const CHEST_DECLINE: GroupSplit = { chest_upper: 0.15, chest_mid: 0.4, chest_lower: 0.45 };
const CHEST_FLY: GroupSplit = { chest_upper: 0.28, chest_mid: 0.47, chest_lower: 0.25 };

// Triceps
const TRICEPS_PRESS: GroupSplit = { triceps_long: 0.3, triceps_lateral: 0.4, triceps_medial: 0.3 };
const TRICEPS_PUSHDOWN: GroupSplit = { triceps_long: 0.27, triceps_lateral: 0.4, triceps_medial: 0.33 };
const TRICEPS_OVERHEAD: GroupSplit = { triceps_long: 0.5, triceps_lateral: 0.27, triceps_medial: 0.23 };

// Biceps
const BICEPS_BALANCED: GroupSplit = { biceps_long_head: 0.42, biceps_short_head: 0.42, biceps_brachialis: 0.16 };
const BICEPS_SHORT_BIAS: GroupSplit = { biceps_long_head: 0.35, biceps_short_head: 0.51, biceps_brachialis: 0.14 };

// Lat
const LAT_LOWER_BIAS: GroupSplit = { lat_upper: 0.4, lat_lower: 0.6 };
const LAT_WIDTH_BIAS: GroupSplit = { lat_upper: 0.6, lat_lower: 0.4 };
const LAT_UPPER_BIAS: GroupSplit = { lat_upper: 0.55, lat_lower: 0.45 };
const LAT_EVEN: GroupSplit = { lat_upper: 0.5, lat_lower: 0.5 };

// Trap
const TRAP_ROW: GroupSplit = { trap_upper: 0.2, trap_mid: 0.55, trap_lower: 0.25 };
const TRAP_PRESS: GroupSplit = { trap_upper: 0.5, trap_mid: 0.2, trap_lower: 0.3 };
const TRAP_LATERAL: GroupSplit = { trap_upper: 0.55, trap_mid: 0.2, trap_lower: 0.25 };
const TRAP_REAR: GroupSplit = { trap_upper: 0.15, trap_mid: 0.5, trap_lower: 0.35 };
const TRAP_SHRUG: GroupSplit = { trap_upper: 0.7, trap_mid: 0.2, trap_lower: 0.1 };
const TRAP_DEADLIFT: GroupSplit = { trap_upper: 0.6, trap_mid: 0.25, trap_lower: 0.15 };
const TRAP_PULLUP: GroupSplit = { trap_upper: 0.2, trap_mid: 0.3, trap_lower: 0.5 };

// Quads
const QUADS_COMPOUND: GroupSplit = { quads_rectus_femoris: 0.22, quads_vastus_lateralis: 0.4, quads_vastus_medialis: 0.38 };

// Glutes
const GLUTES_HINGE: GroupSplit = { glutes_max_lower: 0.49, glutes_max_upper: 0.36, glutes_med_min: 0.15 };
const GLUTES_SQUAT: GroupSplit = { glutes_max_lower: 0.41, glutes_max_upper: 0.34, glutes_med_min: 0.25 };
const GLUTES_LUNGE: GroupSplit = { glutes_max_lower: 0.38, glutes_max_upper: 0.32, glutes_med_min: 0.3 };
const GLUTES_BRIDGE: GroupSplit = { glutes_max_lower: 0.5, glutes_max_upper: 0.4, glutes_med_min: 0.1 };

// Hamstrings
const HAMS_EVEN: GroupSplit = { hamstrings_lateral: 0.5, hamstrings_medial: 0.5 };
const HAMS_HINGE: GroupSplit = { hamstrings_lateral: 0.43, hamstrings_medial: 0.57 };
const HAMS_SQUAT: GroupSplit = { hamstrings_lateral: 0.45, hamstrings_medial: 0.55 };
const HAMS_CURL: GroupSplit = { hamstrings_lateral: 0.55, hamstrings_medial: 0.45 };

// Abs
const ABS_EVEN: GroupSplit = { abs_upper: 0.35, abs_lower: 0.35, abs_deep: 0.3 };
const ABS_LOWER: GroupSplit = { abs_upper: 0.23, abs_lower: 0.6, abs_deep: 0.17 };
const ABS_UPPER: GroupSplit = { abs_upper: 0.67, abs_lower: 0.22, abs_deep: 0.11 };
const ABS_DEEP: GroupSplit = { abs_upper: 0.29, abs_lower: 0.31, abs_deep: 0.4 };

// Obliques
const OBLIQUES_INTERNAL: GroupSplit = { obliques_external: 0.45, obliques_internal: 0.55 };
const OBLIQUES_EVEN: GroupSplit = { obliques_external: 0.5, obliques_internal: 0.5 };
const OBLIQUES_EXTERNAL: GroupSplit = { obliques_external: 0.6, obliques_internal: 0.4 };

// Forearms
const FOREARMS_GRIP: GroupSplit = { forearms_flexors: 0.7, forearms_extensors: 0.2, forearms_brachioradialis: 0.1 };
const FOREARMS_CURL: GroupSplit = { forearms_flexors: 0.5, forearms_extensors: 0.2, forearms_brachioradialis: 0.3 };
const FOREARMS_BRACH: GroupSplit = { forearms_flexors: 0.13, forearms_extensors: 0.2, forearms_brachioradialis: 0.67 };

// Calves
const CALVES_STANDING: GroupSplit = { calves_gastroc_medial: 0.4, calves_gastroc_lateral: 0.3, calves_soleus: 0.3 };

/** Even-split fallback for a subdivided group when an exercise declares no explicit emphasis. */
export const DEFAULT_REGION_SPLIT: Partial<Record<MuscleGroup, GroupSplit>> = {
  chest: {
    chest_upper: 0.33,
    chest_mid: 0.33,
    chest_lower: 0.34
  },
  triceps: {
    triceps_long: 0.33,
    triceps_lateral: 0.33,
    triceps_medial: 0.34
  },
  biceps: {
    biceps_long_head: 0.33,
    biceps_short_head: 0.33,
    biceps_brachialis: 0.34
  },
  lat: {
    lat_upper: 0.5,
    lat_lower: 0.5
  },
  trap: {
    trap_upper: 0.33,
    trap_mid: 0.33,
    trap_lower: 0.34
  },
  quads: {
    quads_rectus_femoris: 0.33,
    quads_vastus_lateralis: 0.33,
    quads_vastus_medialis: 0.34
  },
  hamstrings: {
    hamstrings_lateral: 0.5,
    hamstrings_medial: 0.5
  },
  glutes: {
    glutes_max_lower: 0.33,
    glutes_max_upper: 0.33,
    glutes_med_min: 0.34
  },
  abs: {
    abs_upper: 0.33,
    abs_lower: 0.33,
    abs_deep: 0.34
  },
  obliques: {
    obliques_external: 0.5,
    obliques_internal: 0.5
  },
  forearms: {
    forearms_flexors: 0.33,
    forearms_extensors: 0.33,
    forearms_brachioradialis: 0.34
  },
  calves: {
    calves_gastroc_medial: 0.33,
    calves_gastroc_lateral: 0.33,
    calves_soleus: 0.34
  }
};

// Per-exercise intra-muscle emphasis: exerciseId → group → (region → fraction, summing to 1).
// Only subdivided groups appear; absent (exercise, group) pairs fall back to DEFAULT_REGION_SPLIT.
export const REGION_EMPHASIS: Record<string, Partial<Record<MuscleGroup, GroupSplit>>> = {
  "barbell-bench-press": { chest: CHEST_FLAT, triceps: TRICEPS_PRESS },
  "dumbbell-bench-press": { chest: CHEST_FLAT, triceps: TRICEPS_PRESS },
  "incline-bench-press": { chest: CHEST_INCLINE, triceps: TRICEPS_PRESS },
  "machine-chest-press": { chest: CHEST_FLAT, triceps: TRICEPS_PRESS },
  "cable-fly": { chest: CHEST_FLY },
  pushup: { chest: CHEST_FLAT, triceps: TRICEPS_PRESS, abs: ABS_EVEN },
  dip: { chest: CHEST_DECLINE, triceps: TRICEPS_PRESS },
  "barbell-overhead-press": { triceps: TRICEPS_PRESS, trap: TRAP_PRESS },
  "dumbbell-shoulder-press": { triceps: TRICEPS_PRESS, trap: TRAP_PRESS },
  "lateral-raise": {
    trap: {
      trap_upper: 0.55,
      trap_mid: 0.2,
      trap_lower: 0.25
    }
  },
  "barbell-row": { lat: LAT_UPPER_BIAS, trap: TRAP_ROW, biceps: BICEPS_BALANCED },
  "dumbbell-row": { lat: LAT_LOWER_BIAS, trap: TRAP_ROW, biceps: BICEPS_BALANCED },
  "seated-cable-row": {
    lat: {
      lat_upper: 0.45,
      lat_lower: 0.55
    },
    trap: TRAP_ROW,
    biceps: BICEPS_BALANCED
  },
  "face-pull": { trap: TRAP_REAR },
  pullup: { lat: LAT_WIDTH_BIAS, biceps: BICEPS_BALANCED, trap: TRAP_PULLUP },
  chinup: {
    lat: {
      lat_upper: 0.45,
      lat_lower: 0.55
    },
    biceps: {
      biceps_long_head: 0.4,
      biceps_short_head: 0.46,
      biceps_brachialis: 0.14
    }
  },
  "lat-pulldown": { lat: LAT_WIDTH_BIAS, biceps: BICEPS_BALANCED },
  "barbell-back-squat": { quads: QUADS_COMPOUND, glutes: GLUTES_SQUAT, hamstrings: HAMS_SQUAT, abs: ABS_EVEN },
  "barbell-front-squat": {
    quads: {
      quads_rectus_femoris: 0.26,
      quads_vastus_lateralis: 0.38,
      quads_vastus_medialis: 0.36
    },
    glutes: GLUTES_SQUAT,
    abs: {
      abs_upper: 0.34,
      abs_lower: 0.34,
      abs_deep: 0.32
    }
  },
  "leg-press": {
    quads: QUADS_COMPOUND,
    glutes: {
      glutes_max_lower: 0.45,
      glutes_max_upper: 0.37,
      glutes_med_min: 0.18
    },
    hamstrings: HAMS_SQUAT
  },
  "goblet-squat": { quads: QUADS_COMPOUND, glutes: GLUTES_SQUAT, abs: ABS_EVEN },
  "leg-extension": {
    quads: {
      quads_rectus_femoris: 0.4,
      quads_vastus_lateralis: 0.31,
      quads_vastus_medialis: 0.29
    }
  },
  "barbell-deadlift": {
    glutes: GLUTES_HINGE,
    hamstrings: HAMS_HINGE,
    trap: TRAP_DEADLIFT,
    quads: QUADS_COMPOUND,
    forearms: FOREARMS_GRIP
  },
  "romanian-deadlift": { hamstrings: HAMS_HINGE, glutes: GLUTES_HINGE, forearms: FOREARMS_GRIP },
  "hip-thrust": { glutes: GLUTES_BRIDGE, hamstrings: HAMS_EVEN },
  "leg-curl": { hamstrings: HAMS_CURL },
  "back-extension": { glutes: GLUTES_HINGE, hamstrings: HAMS_HINGE },
  "walking-lunge": { quads: QUADS_COMPOUND, glutes: GLUTES_LUNGE, hamstrings: HAMS_EVEN },
  "bulgarian-split-squat": { quads: QUADS_COMPOUND, glutes: GLUTES_LUNGE, hamstrings: HAMS_EVEN },
  "barbell-curl": { biceps: BICEPS_BALANCED, forearms: FOREARMS_CURL },
  "dumbbell-curl": {
    biceps: {
      biceps_long_head: 0.38,
      biceps_short_head: 0.46,
      biceps_brachialis: 0.16
    },
    forearms: {
      forearms_flexors: 0.45,
      forearms_extensors: 0.2,
      forearms_brachioradialis: 0.35
    }
  },
  "hammer-curl": {
    biceps: {
      biceps_long_head: 0.34,
      biceps_short_head: 0.26,
      biceps_brachialis: 0.4
    },
    forearms: FOREARMS_BRACH
  },
  "triceps-pushdown": { triceps: TRICEPS_PUSHDOWN },
  skullcrusher: {
    triceps: {
      triceps_long: 0.42,
      triceps_lateral: 0.31,
      triceps_medial: 0.27
    }
  },
  "wrist-curl": {
    forearms: {
      forearms_flexors: 0.85,
      forearms_extensors: 0.1,
      forearms_brachioradialis: 0.05
    }
  },
  "barbell-shrug": { trap: TRAP_SHRUG, forearms: FOREARMS_GRIP },
  "calf-raise": { calves: CALVES_STANDING },
  plank: { abs: ABS_EVEN, obliques: OBLIQUES_INTERNAL },
  "hanging-leg-raise": { abs: ABS_LOWER, obliques: OBLIQUES_EVEN, forearms: FOREARMS_GRIP },
  "cable-woodchop": { obliques: OBLIQUES_EXTERNAL, abs: ABS_DEEP },
  "incline-dumbbell-press": { chest: CHEST_INCLINE, triceps: TRICEPS_PRESS },
  "decline-bench-press": { chest: CHEST_DECLINE, triceps: TRICEPS_PRESS },
  "pec-deck": { chest: CHEST_FLY },
  "close-grip-bench": { triceps: TRICEPS_PRESS, chest: CHEST_FLAT },
  "arnold-press": { triceps: TRICEPS_PRESS, trap: TRAP_PRESS },
  "push-press": { triceps: TRICEPS_PRESS, trap: TRAP_PRESS },
  "machine-shoulder-press": { triceps: TRICEPS_PRESS },
  "pike-pushup": { triceps: TRICEPS_PRESS },
  "upright-row": {
    trap: {
      trap_upper: 0.5,
      trap_mid: 0.3,
      trap_lower: 0.2
    },
    biceps: BICEPS_BALANCED
  },
  "pendlay-row": { lat: LAT_UPPER_BIAS, trap: TRAP_ROW, biceps: BICEPS_BALANCED },
  "t-bar-row": { lat: LAT_UPPER_BIAS, trap: TRAP_ROW, biceps: BICEPS_BALANCED },
  "chest-supported-row": { lat: LAT_UPPER_BIAS, trap: TRAP_ROW, biceps: BICEPS_BALANCED },
  "inverted-row": { lat: LAT_UPPER_BIAS, trap: TRAP_ROW, biceps: BICEPS_BALANCED },
  "reverse-pec-deck": { trap: TRAP_REAR },
  "weighted-pullup": { lat: LAT_WIDTH_BIAS, trap: TRAP_PULLUP, biceps: BICEPS_BALANCED },
  "assisted-pullup": { lat: LAT_WIDTH_BIAS, trap: TRAP_PULLUP, biceps: BICEPS_BALANCED },
  "hack-squat": { quads: QUADS_COMPOUND, glutes: GLUTES_SQUAT, hamstrings: HAMS_EVEN },
  "smith-squat": { quads: QUADS_COMPOUND, glutes: GLUTES_SQUAT, hamstrings: HAMS_EVEN },
  "sissy-squat": {
    quads: {
      quads_rectus_femoris: 0.5,
      quads_vastus_lateralis: 0.26,
      quads_vastus_medialis: 0.24
    },
    abs: ABS_EVEN
  },
  "box-step-up": { quads: QUADS_COMPOUND, glutes: GLUTES_LUNGE, hamstrings: HAMS_EVEN },
  "sumo-deadlift": {
    glutes: {
      glutes_max_lower: 0.45,
      glutes_max_upper: 0.35,
      glutes_med_min: 0.2
    },
    quads: QUADS_COMPOUND,
    hamstrings: HAMS_HINGE,
    trap: TRAP_DEADLIFT
  },
  "trap-bar-deadlift": { quads: QUADS_COMPOUND, glutes: GLUTES_HINGE, hamstrings: HAMS_HINGE, trap: TRAP_DEADLIFT },
  "good-morning": { hamstrings: HAMS_HINGE, glutes: GLUTES_HINGE },
  "kettlebell-swing": { glutes: GLUTES_HINGE, hamstrings: HAMS_HINGE, abs: ABS_EVEN },
  "nordic-curl": {
    hamstrings: HAMS_EVEN,
    glutes: {
      glutes_max_lower: 0.46,
      glutes_max_upper: 0.39,
      glutes_med_min: 0.15
    }
  },
  "glute-ham-raise": { hamstrings: HAMS_EVEN, glutes: GLUTES_HINGE, calves: CALVES_STANDING },
  "reverse-lunge": { quads: QUADS_COMPOUND, glutes: GLUTES_LUNGE, hamstrings: HAMS_SQUAT },
  "curtsy-lunge": {
    glutes: {
      glutes_max_lower: 0.34,
      glutes_max_upper: 0.31,
      glutes_med_min: 0.35
    },
    quads: QUADS_COMPOUND,
    hamstrings: HAMS_SQUAT
  },
  "preacher-curl": {
    biceps: BICEPS_SHORT_BIAS,
    forearms: {
      forearms_flexors: 0.25,
      forearms_extensors: 0.15,
      forearms_brachioradialis: 0.6
    }
  },
  "incline-dumbbell-curl": {
    biceps: {
      biceps_long_head: 0.51,
      biceps_short_head: 0.35,
      biceps_brachialis: 0.14
    },
    forearms: {
      forearms_flexors: 0.25,
      forearms_extensors: 0.15,
      forearms_brachioradialis: 0.6
    }
  },
  "concentration-curl": { biceps: BICEPS_SHORT_BIAS, forearms: FOREARMS_CURL },
  "reverse-curl": {
    forearms: FOREARMS_BRACH,
    biceps: {
      biceps_long_head: 0.28,
      biceps_short_head: 0.22,
      biceps_brachialis: 0.5
    }
  },
  "overhead-triceps-extension": { triceps: TRICEPS_OVERHEAD },
  "cable-lateral-raise": { trap: TRAP_LATERAL },
  "seated-calf-raise": {
    calves: {
      calves_gastroc_medial: 0.18,
      calves_gastroc_lateral: 0.14,
      calves_soleus: 0.68
    }
  },
  "ab-wheel-rollout": {
    abs: ABS_EVEN,
    obliques: OBLIQUES_INTERNAL,
    lat: {
      lat_upper: 0.45,
      lat_lower: 0.55
    }
  },
  "cable-crunch": { abs: ABS_UPPER, obliques: OBLIQUES_EXTERNAL },
  "pallof-press": { obliques: OBLIQUES_INTERNAL, abs: ABS_DEEP },
  "russian-twist": { obliques: OBLIQUES_EXTERNAL, abs: ABS_DEEP },
  "side-plank": {
    obliques: {
      obliques_external: 0.55,
      obliques_internal: 0.45
    },
    abs: ABS_DEEP
  },
  "farmer-carry": {
    forearms: FOREARMS_GRIP,
    trap: TRAP_SHRUG,
    abs: {
      abs_upper: 0.31,
      abs_lower: 0.31,
      abs_deep: 0.38
    },
    obliques: OBLIQUES_INTERNAL
  },
  "suitcase-carry": { obliques: OBLIQUES_EVEN, forearms: FOREARMS_GRIP, trap: TRAP_SHRUG },
  "triceps-kickback": {
    triceps: {
      triceps_long: 0.22,
      triceps_lateral: 0.43,
      triceps_medial: 0.35
    }
  },
  "rope-pushdown": {
    triceps: {
      triceps_long: 0.25,
      triceps_lateral: 0.41,
      triceps_medial: 0.34
    }
  },
  "diamond-pushup": { triceps: TRICEPS_PRESS, chest: CHEST_FLAT },
  "bench-dip": { triceps: TRICEPS_PRESS, chest: CHEST_DECLINE },
  "single-arm-overhead-cable-extension": { triceps: TRICEPS_OVERHEAD },
  "jm-press": {
    triceps: {
      triceps_long: 0.38,
      triceps_lateral: 0.35,
      triceps_medial: 0.27
    },
    chest: CHEST_FLAT
  },
  "tate-press": { triceps: TRICEPS_PUSHDOWN },
  "machine-triceps-extension": { triceps: TRICEPS_PUSHDOWN },
  "cable-curl": { biceps: BICEPS_BALANCED, forearms: FOREARMS_CURL },
  "spider-curl": { biceps: BICEPS_SHORT_BIAS, forearms: FOREARMS_CURL },
  "ez-bar-curl": {
    biceps: {
      biceps_long_head: 0.4,
      biceps_short_head: 0.4,
      biceps_brachialis: 0.2
    },
    forearms: {
      forearms_flexors: 0.45,
      forearms_extensors: 0.2,
      forearms_brachioradialis: 0.35
    }
  },
  "drag-curl": {
    biceps: {
      biceps_long_head: 0.51,
      biceps_short_head: 0.35,
      biceps_brachialis: 0.14
    },
    forearms: FOREARMS_CURL
  },
  "zottman-curl": {
    biceps: {
      biceps_long_head: 0.4,
      biceps_short_head: 0.42,
      biceps_brachialis: 0.18
    },
    forearms: {
      forearms_flexors: 0.13,
      forearms_extensors: 0.3,
      forearms_brachioradialis: 0.57
    }
  },
  "cable-hammer-curl": {
    biceps: {
      biceps_long_head: 0.34,
      biceps_short_head: 0.26,
      biceps_brachialis: 0.4
    },
    forearms: FOREARMS_BRACH
  },
  "reverse-wrist-curl": {
    forearms: {
      forearms_flexors: 0.13,
      forearms_extensors: 0.67,
      forearms_brachioradialis: 0.2
    }
  },
  "behind-the-back-wrist-curl": {
    forearms: {
      forearms_flexors: 0.85,
      forearms_extensors: 0.1,
      forearms_brachioradialis: 0.05
    }
  },
  "wrist-roller": {
    forearms: {
      forearms_flexors: 0.45,
      forearms_extensors: 0.45,
      forearms_brachioradialis: 0.1
    }
  },
  "plate-pinch-hold": { forearms: FOREARMS_GRIP },
  "dumbbell-fly": { chest: CHEST_FLY },
  "low-to-high-cable-fly": { chest: CHEST_INCLINE },
  "high-to-low-cable-fly": { chest: CHEST_DECLINE },
  "incline-cable-fly": { chest: CHEST_INCLINE },
  "dumbbell-pullover": { chest: CHEST_DECLINE, lat: LAT_LOWER_BIAS, triceps: TRICEPS_OVERHEAD },
  "svend-press": { chest: CHEST_FLY, triceps: TRICEPS_PRESS },
  "incline-machine-press": { chest: CHEST_INCLINE, triceps: TRICEPS_PRESS },
  "landmine-press": {
    chest: {
      chest_upper: 0.55,
      chest_mid: 0.32,
      chest_lower: 0.13
    },
    triceps: TRICEPS_PRESS,
    trap: {
      trap_upper: 0.55,
      trap_mid: 0.25,
      trap_lower: 0.2
    }
  },
  "dumbbell-front-raise": {
    trap: {
      trap_upper: 0.4,
      trap_mid: 0.25,
      trap_lower: 0.35
    }
  },
  "cable-front-raise": { trap: TRAP_LATERAL },
  "bent-over-rear-delt-fly": { trap: TRAP_REAR },
  "cable-rear-delt-fly": { trap: TRAP_REAR },
  "machine-lateral-raise": { trap: TRAP_LATERAL },
  "straight-arm-pulldown": { lat: LAT_LOWER_BIAS, triceps: TRICEPS_OVERHEAD },
  "close-grip-pulldown": { lat: LAT_LOWER_BIAS, biceps: BICEPS_BALANCED },
  "neutral-grip-pulldown": { lat: LAT_EVEN, biceps: BICEPS_BALANCED },
  "single-arm-lat-pulldown": { lat: LAT_LOWER_BIAS, biceps: BICEPS_BALANCED },
  "meadows-row": { lat: LAT_WIDTH_BIAS, trap: TRAP_ROW, biceps: BICEPS_BALANCED },
  "seal-row": {
    lat: LAT_UPPER_BIAS,
    trap: {
      trap_upper: 0.15,
      trap_mid: 0.6,
      trap_lower: 0.25
    },
    biceps: BICEPS_BALANCED
  },
  "dumbbell-shrug": { trap: TRAP_SHRUG, forearms: FOREARMS_GRIP },
  "prone-y-raise": {
    trap: {
      trap_upper: 0.1,
      trap_mid: 0.25,
      trap_lower: 0.65
    }
  },
  "rack-pull": {
    trap: TRAP_DEADLIFT,
    glutes: GLUTES_HINGE,
    hamstrings: HAMS_HINGE,
    lat: LAT_EVEN,
    forearms: FOREARMS_GRIP
  },
  "seated-leg-curl": { hamstrings: HAMS_CURL },
  "stiff-leg-deadlift": { hamstrings: HAMS_EVEN, glutes: GLUTES_HINGE, forearms: FOREARMS_GRIP },
  "single-leg-romanian-deadlift": {
    hamstrings: HAMS_HINGE,
    glutes: {
      glutes_max_lower: 0.43,
      glutes_max_upper: 0.32,
      glutes_med_min: 0.25
    },
    forearms: FOREARMS_GRIP
  },
  "cable-pull-through": { glutes: GLUTES_HINGE, hamstrings: HAMS_HINGE },
  "cable-glute-kickback": {
    glutes: {
      glutes_max_lower: 0.52,
      glutes_max_upper: 0.38,
      glutes_med_min: 0.1
    },
    hamstrings: HAMS_HINGE
  },
  "glute-kickback-machine": { glutes: GLUTES_BRIDGE, hamstrings: HAMS_HINGE },
  "hip-abduction-machine": {
    glutes: {
      glutes_max_lower: 0.1,
      glutes_max_upper: 0.3,
      glutes_med_min: 0.6
    }
  },
  "banded-lateral-walk": {
    glutes: {
      glutes_max_lower: 0.15,
      glutes_max_upper: 0.25,
      glutes_med_min: 0.6
    }
  },
  "frog-pump": { glutes: GLUTES_BRIDGE, hamstrings: HAMS_EVEN },
  "pistol-squat": { quads: QUADS_COMPOUND, glutes: GLUTES_LUNGE, hamstrings: HAMS_EVEN, abs: ABS_EVEN },
  "lateral-lunge": {
    quads: QUADS_COMPOUND,
    glutes: {
      glutes_max_lower: 0.32,
      glutes_max_upper: 0.28,
      glutes_med_min: 0.4
    },
    hamstrings: HAMS_EVEN
  },
  "cossack-squat": {
    quads: QUADS_COMPOUND,
    glutes: {
      glutes_max_lower: 0.34,
      glutes_max_upper: 0.31,
      glutes_med_min: 0.35
    },
    hamstrings: HAMS_EVEN
  },
  "pendulum-squat": { quads: QUADS_COMPOUND, glutes: GLUTES_SQUAT, hamstrings: HAMS_EVEN },
  "single-leg-press": {
    quads: QUADS_COMPOUND,
    glutes: {
      glutes_max_lower: 0.43,
      glutes_max_upper: 0.34,
      glutes_med_min: 0.23
    },
    hamstrings: HAMS_SQUAT
  },
  "glute-bridge": { glutes: GLUTES_BRIDGE, hamstrings: HAMS_EVEN },
  "crunch": { abs: ABS_UPPER, obliques: OBLIQUES_EXTERNAL },
  "reverse-crunch": { abs: ABS_LOWER, obliques: OBLIQUES_EVEN },
  "bicycle-crunch": { abs: ABS_EVEN, obliques: OBLIQUES_EXTERNAL },
  "dead-bug": { abs: ABS_DEEP, obliques: OBLIQUES_INTERNAL },
  "hollow-hold": {
    abs: {
      abs_upper: 0.3,
      abs_lower: 0.42,
      abs_deep: 0.28
    },
    obliques: OBLIQUES_INTERNAL
  },
  "v-up": {
    abs: {
      abs_upper: 0.4,
      abs_lower: 0.45,
      abs_deep: 0.15
    },
    obliques: OBLIQUES_EVEN,
    quads: {
      quads_rectus_femoris: 0.72,
      quads_vastus_lateralis: 0.15,
      quads_vastus_medialis: 0.13
    }
  },
  "decline-situp": {
    abs: ABS_UPPER,
    obliques: OBLIQUES_EXTERNAL,
    quads: {
      quads_rectus_femoris: 0.6,
      quads_vastus_lateralis: 0.21,
      quads_vastus_medialis: 0.19
    }
  },
  "toes-to-bar": {
    abs: ABS_LOWER,
    obliques: OBLIQUES_EVEN,
    forearms: FOREARMS_GRIP,
    lat: LAT_LOWER_BIAS
  },
  "dragon-flag": {
    abs: {
      abs_upper: 0.33,
      abs_lower: 0.37,
      abs_deep: 0.3
    },
    obliques: OBLIQUES_INTERNAL,
    lat: {
      lat_upper: 0.45,
      lat_lower: 0.55
    }
  },
  "oblique-crunch": { obliques: OBLIQUES_INTERNAL, abs: ABS_UPPER },
  "donkey-calf-raise": { calves: CALVES_STANDING },
  "leg-press-calf-raise": { calves: CALVES_STANDING },
  "single-leg-calf-raise": { calves: CALVES_STANDING },

  // ── Catalog-expansion region emphasis (see exercises.ts; authored + verified) ──
  "ez-bar-skullcrusher": { triceps: { triceps_long: 0.4, triceps_lateral: 0.3, triceps_medial: 0.3 } },
  "dumbbell-skullcrusher": { triceps: { triceps_long: 0.42, triceps_lateral: 0.31, triceps_medial: 0.27 } },
  "floor-press": { triceps: TRICEPS_PRESS },
  "smith-bench-press": { chest: CHEST_FLAT },
  "close-grip-pushup": { triceps: TRICEPS_PRESS, chest: CHEST_FLAT },
  "machine-row": { lat: LAT_EVEN, trap: TRAP_ROW, biceps: BICEPS_BALANCED },
  "wide-grip-pulldown": { lat: { lat_upper: 0.65, lat_lower: 0.35 }, biceps: BICEPS_BALANCED },
  "kroc-row": { lat: LAT_LOWER_BIAS, trap: { trap_upper: 0.35, trap_mid: 0.45, trap_lower: 0.2 }, biceps: BICEPS_BALANCED, forearms: { forearms_flexors: 0.6, forearms_extensors: 0.15, forearms_brachioradialis: 0.25 } },
  "renegade-row": { lat: LAT_LOWER_BIAS, trap: TRAP_ROW, abs: { abs_upper: 0.25, abs_lower: 0.3, abs_deep: 0.45 }, obliques: { obliques_external: 0.65, obliques_internal: 0.35 }, biceps: BICEPS_BALANCED },
  "leaning-cable-lateral-raise": { trap: TRAP_LATERAL },
  "z-press": { trap: { trap_upper: 0.6, trap_mid: 0.25, trap_lower: 0.15 } },
  "machine-preacher-curl": { biceps: { biceps_short_head: 0.51, biceps_long_head: 0.35, biceps_brachialis: 0.14 }, forearms: { forearms_brachioradialis: 0.6, forearms_flexors: 0.25, forearms_extensors: 0.15 } },
  "bayesian-cable-curl": { biceps: { biceps_long_head: 0.54, biceps_short_head: 0.32, biceps_brachialis: 0.14 }, forearms: { forearms_brachioradialis: 0.6, forearms_flexors: 0.25, forearms_extensors: 0.15 } },
  "cross-body-hammer-curl": { biceps: { biceps_brachialis: 0.46, biceps_long_head: 0.34, biceps_short_head: 0.2 }, forearms: { forearms_brachioradialis: 0.72, forearms_extensors: 0.18, forearms_flexors: 0.1 } },
  "dead-hang": { forearms: { forearms_flexors: 0.78, forearms_brachioradialis: 0.13, forearms_extensors: 0.09 } },
  "single-leg-hip-thrust": { glutes: { glutes_max_lower: 0.45, glutes_max_upper: 0.3, glutes_med_min: 0.25 } },
  "standing-leg-curl": { hamstrings: HAMS_CURL },
  "zercher-squat": { quads: { quads_rectus_femoris: 0.26, quads_vastus_lateralis: 0.38, quads_vastus_medialis: 0.36 }, trap: { trap_upper: 0.4, trap_mid: 0.4, trap_lower: 0.2 } },
  "hanging-knee-raise": { abs: { abs_upper: 0.2, abs_lower: 0.62, abs_deep: 0.18 }, obliques: OBLIQUES_EVEN, forearms: FOREARMS_GRIP },
  "mountain-climber": { abs: { abs_upper: 0.25, abs_lower: 0.55, abs_deep: 0.2 }, obliques: OBLIQUES_EXTERNAL },
  "l-sit": { abs: { abs_upper: 0.2, abs_lower: 0.55, abs_deep: 0.25 }, quads: { quads_rectus_femoris: 0.6, quads_vastus_lateralis: 0.2, quads_vastus_medialis: 0.2 }, triceps: { triceps_long: 0.45, triceps_lateral: 0.3, triceps_medial: 0.25 }, lat: { lat_lower: 0.6, lat_upper: 0.4 } },
  "captains-chair-knee-raise": { abs: ABS_LOWER, obliques: OBLIQUES_EVEN },
  "flutter-kicks": { abs: ABS_LOWER, quads: { quads_rectus_femoris: 0.8, quads_vastus_lateralis: 0.1, quads_vastus_medialis: 0.1 }, obliques: OBLIQUES_EVEN },
};
