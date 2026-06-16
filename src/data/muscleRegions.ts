// Peak — granular sub-region muscle taxonomy (§2.1 / §4.3 attribution extension).
//
// The 17-value `MuscleGroup` enum is the SCORING SPINE: each group is a capability leaf
// with a cohort distribution, and group-level `muscleWeights` (src/data/exercises.ts) drive
// the inference engine UNCHANGED. This module adds a finer ATTRIBUTION layer *below* the
// groups: anatomical sub-regions (heads / portions) that different exercises bias
// differently — lower vs upper chest, long vs lateral triceps head, vastus lateralis vs
// medialis, upper vs lower trap. A region weight = the exercise's existing group weight ×
// an intra-group emphasis split, so the regions of any group ALWAYS sum back to that group's
// existing weight. Scoring math is therefore untouched — this is purely additive granularity.
//
// Splits are biomechanically-grounded ATTRIBUTION coefficients (how Peak credits a set across
// the heads of a muscle), NOT measured EMG percentages. Consolidated from EMG / regional-
// activation research (Rodríguez-Ridao 2020 bench angles; Schoenfeld regional hypertrophy;
// biceps/triceps head EMG; trapezius scapular-action force-couples; quad vastus EMG) and
// adversarially anatomy-checked. The whole-muscle regions (delts, lower back, tibialis) do not
// subdivide: their region id equals the group id.

import type { MuscleGroup, MuscleRegion, ExerciseDef } from "../types";

export type MuscleRegionDef = {
  id: MuscleRegion;
  label: string;            // concise UI label, e.g. "Lower Chest"
  commonName: string;       // plain-language name
  anatomicalName: string;   // formal anatomy
  parentGroup: MuscleGroup; // the scoring group this region rolls up into
  view: "front" | "back" | "both";
  whole?: boolean;          // true = spans the entire group (group does not subdivide)
};

export const MUSCLE_REGIONS: MuscleRegionDef[] = [
  { id: "chest_upper", label: "Upper Chest", commonName: "Upper chest (clavicular)", anatomicalName: "Pectoralis major, pars clavicularis (clavicular head)", parentGroup: "chest", view: "front" },
  { id: "chest_mid", label: "Mid Chest", commonName: "Mid chest (sternal)", anatomicalName: "Pectoralis major, pars sternocostalis (sternal head, mid fibers)", parentGroup: "chest", view: "front" },
  { id: "chest_lower", label: "Lower Chest", commonName: "Lower chest (costal/abdominal)", anatomicalName: "Pectoralis major, pars abdominalis / lower sternocostal fibers", parentGroup: "chest", view: "front" },
  { id: "triceps_long", label: "Long Head", commonName: "Inner/long head", anatomicalName: "Caput longum (long head of triceps brachii)", parentGroup: "triceps", view: "back" },
  { id: "triceps_lateral", label: "Lateral Head", commonName: "Outer/horseshoe head", anatomicalName: "Caput laterale (lateral head of triceps brachii)", parentGroup: "triceps", view: "back" },
  { id: "triceps_medial", label: "Medial Head", commonName: "Deep head", anatomicalName: "Caput mediale (medial head of triceps brachii)", parentGroup: "triceps", view: "back" },
  { id: "biceps_long_head", label: "Long Head", commonName: "Outer biceps", anatomicalName: "Biceps brachii, caput longum", parentGroup: "biceps", view: "front" },
  { id: "biceps_short_head", label: "Short Head", commonName: "Inner biceps", anatomicalName: "Biceps brachii, caput breve", parentGroup: "biceps", view: "front" },
  { id: "biceps_brachialis", label: "Brachialis", commonName: "Underneath biceps", anatomicalName: "Brachialis", parentGroup: "biceps", view: "front" },
  { id: "lat_upper", label: "Upper Lat", commonName: "Upper / thoracic lats (back width)", anatomicalName: "Latissimus dorsi, thoracic portion (vertebral & scapular fibers, T7-T12)", parentGroup: "lat", view: "back" },
  { id: "lat_lower", label: "Lower Lat", commonName: "Lower / costal-iliac lats (back thickness, lower sweep)", anatomicalName: "Latissimus dorsi, lumbo-pelvic-costal portion (costal, iliac & lower vertebral fibers)", parentGroup: "lat", view: "back" },
  { id: "trap_upper", label: "Upper Trap", commonName: "Upper trapezius", anatomicalName: "Trapezius, descending (superior) fibers", parentGroup: "trap", view: "both" },
  { id: "trap_mid", label: "Mid Trap", commonName: "Middle trapezius", anatomicalName: "Trapezius, transverse (horizontal) fibers", parentGroup: "trap", view: "back" },
  { id: "trap_lower", label: "Lower Trap", commonName: "Lower trapezius", anatomicalName: "Trapezius, ascending (inferior) fibers", parentGroup: "trap", view: "back" },
  { id: "quads_rectus_femoris", label: "Rectus Femoris", commonName: "Front/center quad (two-joint)", anatomicalName: "Rectus femoris", parentGroup: "quads", view: "front" },
  { id: "quads_vastus_lateralis", label: "Outer (Lateralis)", commonName: "Outer sweep / teardrop side", anatomicalName: "Vastus lateralis (outer sweep); the deep vastus intermedius lies beneath and is not separately localizable", parentGroup: "quads", view: "front" },
  { id: "quads_vastus_medialis", label: "Inner (Medialis / VMO)", commonName: "Inner teardrop", anatomicalName: "Vastus medialis / vastus medialis obliquus", parentGroup: "quads", view: "front" },
  { id: "hamstrings_lateral", label: "Lateral", commonName: "Outer hamstring (biceps femoris)", anatomicalName: "Biceps femoris — long head (loaded by hip hinges); short head contributes at the knee", parentGroup: "hamstrings", view: "back" },
  { id: "hamstrings_medial", label: "Medial", commonName: "Inner hamstrings (semitendinosus & semimembranosus)", anatomicalName: "Semitendinosus & semimembranosus", parentGroup: "hamstrings", view: "back" },
  { id: "glutes_max_lower", label: "Lower Glute", commonName: "Lower / inner glute (sagittal hip extensors)", anatomicalName: "Gluteus maximus, inferior (distal) fibers", parentGroup: "glutes", view: "back" },
  { id: "glutes_max_upper", label: "Upper Glute", commonName: "Upper / outer glute (abduction + external rotation fibers)", anatomicalName: "Gluteus maximus, superior (proximal) fibers", parentGroup: "glutes", view: "back" },
  { id: "glutes_med_min", label: "Side Glute", commonName: "Side glute / hip stabilizers", anatomicalName: "Gluteus medius and gluteus minimus", parentGroup: "glutes", view: "back" },
  { id: "abs_upper", label: "Upper Abs", commonName: "Upper abs", anatomicalName: "Rectus abdominis (superior segments, above umbilicus)", parentGroup: "abs", view: "front" },
  { id: "abs_lower", label: "Lower Abs", commonName: "Lower abs", anatomicalName: "Rectus abdominis (inferior segments, below umbilicus)", parentGroup: "abs", view: "front" },
  { id: "abs_deep", label: "Deep Core", commonName: "Deep core / TVA", anatomicalName: "Transversus abdominis (with deep stabilizers)", parentGroup: "abs", view: "front" },
  { id: "obliques_external", label: "External", commonName: "External obliques (outer)", anatomicalName: "Obliquus externus abdominis", parentGroup: "obliques", view: "front" },
  { id: "obliques_internal", label: "Internal", commonName: "Internal obliques (deep)", anatomicalName: "Obliquus internus abdominis", parentGroup: "obliques", view: "front" },
  { id: "forearms_flexors", label: "Flexors", commonName: "Wrist/finger flexors (gripping side)", anatomicalName: "Anterior compartment (flexor carpi radialis, flexor carpi ulnaris, palmaris longus, flexor digitorum superficialis/profundus)", parentGroup: "forearms", view: "both" },
  { id: "forearms_extensors", label: "Extensors", commonName: "Wrist/finger extensors (top of forearm)", anatomicalName: "Posterior compartment (extensor carpi radialis longus/brevis, extensor carpi ulnaris, extensor digitorum)", parentGroup: "forearms", view: "both" },
  { id: "forearms_brachioradialis", label: "Brachioradialis", commonName: "Brachioradialis (radial/thumb-side bulk)", anatomicalName: "Brachioradialis", parentGroup: "forearms", view: "both" },
  { id: "calves_gastroc_medial", label: "Gastroc (Medial)", commonName: "Inner calf / medial gastrocnemius", anatomicalName: "Gastrocnemius, caput mediale", parentGroup: "calves", view: "back" },
  { id: "calves_gastroc_lateral", label: "Gastroc (Lateral)", commonName: "Outer calf / lateral gastrocnemius", anatomicalName: "Gastrocnemius, caput laterale", parentGroup: "calves", view: "back" },
  { id: "calves_soleus", label: "Soleus", commonName: "Deep calf / soleus", anatomicalName: "Soleus", parentGroup: "calves", view: "back" },
  { id: "front_delt", label: "Front Delts", commonName: "Anterior deltoid", anatomicalName: "Deltoideus, pars clavicularis (anterior head)", parentGroup: "front_delt", view: "front", whole: true },
  { id: "side_delt", label: "Side Delts", commonName: "Lateral deltoid", anatomicalName: "Deltoideus, pars acromialis (lateral head)", parentGroup: "side_delt", view: "front", whole: true },
  { id: "rear_delt", label: "Rear Delts", commonName: "Posterior deltoid", anatomicalName: "Deltoideus, pars spinalis (posterior head)", parentGroup: "rear_delt", view: "back", whole: true },
  { id: "lower_back", label: "Lower Back", commonName: "Spinal erectors", anatomicalName: "Erector spinae (iliocostalis, longissimus, spinalis)", parentGroup: "lower_back", view: "back", whole: true },
  { id: "tibialis", label: "Tibialis", commonName: "Shin", anatomicalName: "Tibialis anterior", parentGroup: "tibialis", view: "front", whole: true },
];

export const REGION_BY_ID: Record<MuscleRegion, MuscleRegionDef> =
  Object.fromEntries(MUSCLE_REGIONS.map((r) => [r.id, r])) as Record<MuscleRegion, MuscleRegionDef>;

export const REGION_TO_GROUP: Record<MuscleRegion, MuscleGroup> =
  Object.fromEntries(MUSCLE_REGIONS.map((r) => [r.id, r.parentGroup])) as Record<MuscleRegion, MuscleGroup>;

/** Regions belonging to a group (≥1; a single whole-region for non-subdividing groups). */
export const REGIONS_BY_GROUP: Partial<Record<MuscleGroup, MuscleRegion[]>> = {chest:["chest_upper","chest_mid","chest_lower"],triceps:["triceps_long","triceps_lateral","triceps_medial"],biceps:["biceps_long_head","biceps_short_head","biceps_brachialis"],lat:["lat_upper","lat_lower"],trap:["trap_upper","trap_mid","trap_lower"],quads:["quads_rectus_femoris","quads_vastus_lateralis","quads_vastus_medialis"],hamstrings:["hamstrings_lateral","hamstrings_medial"],glutes:["glutes_max_lower","glutes_max_upper","glutes_med_min"],abs:["abs_upper","abs_lower","abs_deep"],obliques:["obliques_external","obliques_internal"],forearms:["forearms_flexors","forearms_extensors","forearms_brachioradialis"],calves:["calves_gastroc_medial","calves_gastroc_lateral","calves_soleus"],front_delt:["front_delt"],side_delt:["side_delt"],rear_delt:["rear_delt"],lower_back:["lower_back"],tibialis:["tibialis"]} as Partial<Record<MuscleGroup, MuscleRegion[]>>;

/** True when a group splits into more than one trainably-distinct region. */
export const groupHasSubRegions = (g: MuscleGroup): boolean => (REGIONS_BY_GROUP[g]?.length ?? 0) > 1;

export const regionLabel = (r: MuscleRegion): string => REGION_BY_ID[r]?.label ?? r;
export const regionsForGroup = (g: MuscleGroup): MuscleRegion[] => REGIONS_BY_GROUP[g] ?? [];

/** Even-split fallback for a subdivided group when an exercise declares no explicit emphasis. */
export const DEFAULT_REGION_SPLIT: Partial<Record<MuscleGroup, Partial<Record<MuscleRegion, number>>>> = {
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
export const REGION_EMPHASIS: Record<string, Partial<Record<MuscleGroup, Partial<Record<MuscleRegion, number>>>>> = {
  "barbell-bench-press": {
    chest: {
      chest_upper: 0.25,
      chest_mid: 0.45,
      chest_lower: 0.3
    },
    triceps: {
      triceps_long: 0.3,
      triceps_lateral: 0.4,
      triceps_medial: 0.3
    }
  },
  "dumbbell-bench-press": {
    chest: {
      chest_upper: 0.25,
      chest_mid: 0.45,
      chest_lower: 0.3
    },
    triceps: {
      triceps_long: 0.3,
      triceps_lateral: 0.4,
      triceps_medial: 0.3
    }
  },
  "incline-bench-press": {
    chest: {
      chest_upper: 0.5,
      chest_mid: 0.35,
      chest_lower: 0.15
    },
    triceps: {
      triceps_long: 0.3,
      triceps_lateral: 0.4,
      triceps_medial: 0.3
    }
  },
  "machine-chest-press": {
    chest: {
      chest_upper: 0.25,
      chest_mid: 0.45,
      chest_lower: 0.3
    },
    triceps: {
      triceps_long: 0.3,
      triceps_lateral: 0.4,
      triceps_medial: 0.3
    }
  },
  "cable-fly": {
    chest: {
      chest_upper: 0.28,
      chest_mid: 0.47,
      chest_lower: 0.25
    }
  },
  pushup: {
    chest: {
      chest_upper: 0.25,
      chest_mid: 0.45,
      chest_lower: 0.3
    },
    triceps: {
      triceps_long: 0.3,
      triceps_lateral: 0.4,
      triceps_medial: 0.3
    },
    abs: {
      abs_upper: 0.35,
      abs_lower: 0.35,
      abs_deep: 0.3
    }
  },
  dip: {
    chest: {
      chest_upper: 0.15,
      chest_mid: 0.4,
      chest_lower: 0.45
    },
    triceps: {
      triceps_long: 0.3,
      triceps_lateral: 0.4,
      triceps_medial: 0.3
    }
  },
  "barbell-overhead-press": {
    triceps: {
      triceps_long: 0.3,
      triceps_lateral: 0.4,
      triceps_medial: 0.3
    },
    trap: {
      trap_upper: 0.5,
      trap_mid: 0.2,
      trap_lower: 0.3
    }
  },
  "dumbbell-shoulder-press": {
    triceps: {
      triceps_long: 0.3,
      triceps_lateral: 0.4,
      triceps_medial: 0.3
    },
    trap: {
      trap_upper: 0.5,
      trap_mid: 0.2,
      trap_lower: 0.3
    }
  },
  "lateral-raise": {
    trap: {
      trap_upper: 0.55,
      trap_mid: 0.2,
      trap_lower: 0.25
    }
  },
  "barbell-row": {
    lat: {
      lat_upper: 0.55,
      lat_lower: 0.45
    },
    trap: {
      trap_upper: 0.2,
      trap_mid: 0.55,
      trap_lower: 0.25
    },
    biceps: {
      biceps_long_head: 0.42,
      biceps_short_head: 0.42,
      biceps_brachialis: 0.16
    }
  },
  "dumbbell-row": {
    lat: {
      lat_upper: 0.4,
      lat_lower: 0.6
    },
    trap: {
      trap_upper: 0.2,
      trap_mid: 0.55,
      trap_lower: 0.25
    },
    biceps: {
      biceps_long_head: 0.42,
      biceps_short_head: 0.42,
      biceps_brachialis: 0.16
    }
  },
  "seated-cable-row": {
    lat: {
      lat_upper: 0.45,
      lat_lower: 0.55
    },
    trap: {
      trap_upper: 0.2,
      trap_mid: 0.55,
      trap_lower: 0.25
    },
    biceps: {
      biceps_long_head: 0.42,
      biceps_short_head: 0.42,
      biceps_brachialis: 0.16
    }
  },
  "face-pull": {
    trap: {
      trap_upper: 0.15,
      trap_mid: 0.5,
      trap_lower: 0.35
    }
  },
  pullup: {
    lat: {
      lat_upper: 0.6,
      lat_lower: 0.4
    },
    biceps: {
      biceps_long_head: 0.42,
      biceps_short_head: 0.42,
      biceps_brachialis: 0.16
    },
    trap: {
      trap_upper: 0.2,
      trap_mid: 0.3,
      trap_lower: 0.5
    }
  },
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
  "lat-pulldown": {
    lat: {
      lat_upper: 0.6,
      lat_lower: 0.4
    },
    biceps: {
      biceps_long_head: 0.42,
      biceps_short_head: 0.42,
      biceps_brachialis: 0.16
    }
  },
  "barbell-back-squat": {
    quads: {
      quads_rectus_femoris: 0.22,
      quads_vastus_lateralis: 0.4,
      quads_vastus_medialis: 0.38
    },
    glutes: {
      glutes_max_lower: 0.41,
      glutes_max_upper: 0.34,
      glutes_med_min: 0.25
    },
    hamstrings: {
      hamstrings_lateral: 0.45,
      hamstrings_medial: 0.55
    },
    abs: {
      abs_upper: 0.35,
      abs_lower: 0.35,
      abs_deep: 0.3
    }
  },
  "barbell-front-squat": {
    quads: {
      quads_rectus_femoris: 0.26,
      quads_vastus_lateralis: 0.38,
      quads_vastus_medialis: 0.36
    },
    glutes: {
      glutes_max_lower: 0.41,
      glutes_max_upper: 0.34,
      glutes_med_min: 0.25
    },
    abs: {
      abs_upper: 0.34,
      abs_lower: 0.34,
      abs_deep: 0.32
    }
  },
  "leg-press": {
    quads: {
      quads_rectus_femoris: 0.22,
      quads_vastus_lateralis: 0.4,
      quads_vastus_medialis: 0.38
    },
    glutes: {
      glutes_max_lower: 0.45,
      glutes_max_upper: 0.37,
      glutes_med_min: 0.18
    },
    hamstrings: {
      hamstrings_lateral: 0.45,
      hamstrings_medial: 0.55
    }
  },
  "goblet-squat": {
    quads: {
      quads_rectus_femoris: 0.22,
      quads_vastus_lateralis: 0.4,
      quads_vastus_medialis: 0.38
    },
    glutes: {
      glutes_max_lower: 0.41,
      glutes_max_upper: 0.34,
      glutes_med_min: 0.25
    },
    abs: {
      abs_upper: 0.35,
      abs_lower: 0.35,
      abs_deep: 0.3
    }
  },
  "leg-extension": {
    quads: {
      quads_rectus_femoris: 0.4,
      quads_vastus_lateralis: 0.31,
      quads_vastus_medialis: 0.29
    }
  },
  "barbell-deadlift": {
    glutes: {
      glutes_max_lower: 0.49,
      glutes_max_upper: 0.36,
      glutes_med_min: 0.15
    },
    hamstrings: {
      hamstrings_lateral: 0.43,
      hamstrings_medial: 0.57
    },
    trap: {
      trap_upper: 0.6,
      trap_mid: 0.25,
      trap_lower: 0.15
    },
    quads: {
      quads_rectus_femoris: 0.22,
      quads_vastus_lateralis: 0.4,
      quads_vastus_medialis: 0.38
    },
    forearms: {
      forearms_flexors: 0.7,
      forearms_extensors: 0.2,
      forearms_brachioradialis: 0.1
    }
  },
  "romanian-deadlift": {
    hamstrings: {
      hamstrings_lateral: 0.43,
      hamstrings_medial: 0.57
    },
    glutes: {
      glutes_max_lower: 0.49,
      glutes_max_upper: 0.36,
      glutes_med_min: 0.15
    },
    forearms: {
      forearms_flexors: 0.7,
      forearms_extensors: 0.2,
      forearms_brachioradialis: 0.1
    }
  },
  "hip-thrust": {
    glutes: {
      glutes_max_lower: 0.5,
      glutes_max_upper: 0.4,
      glutes_med_min: 0.1
    },
    hamstrings: {
      hamstrings_lateral: 0.5,
      hamstrings_medial: 0.5
    }
  },
  "leg-curl": {
    hamstrings: {
      hamstrings_lateral: 0.55,
      hamstrings_medial: 0.45
    }
  },
  "back-extension": {
    glutes: {
      glutes_max_lower: 0.49,
      glutes_max_upper: 0.36,
      glutes_med_min: 0.15
    },
    hamstrings: {
      hamstrings_lateral: 0.43,
      hamstrings_medial: 0.57
    }
  },
  "walking-lunge": {
    quads: {
      quads_rectus_femoris: 0.22,
      quads_vastus_lateralis: 0.4,
      quads_vastus_medialis: 0.38
    },
    glutes: {
      glutes_max_lower: 0.38,
      glutes_max_upper: 0.32,
      glutes_med_min: 0.3
    },
    hamstrings: {
      hamstrings_lateral: 0.5,
      hamstrings_medial: 0.5
    }
  },
  "bulgarian-split-squat": {
    quads: {
      quads_rectus_femoris: 0.22,
      quads_vastus_lateralis: 0.4,
      quads_vastus_medialis: 0.38
    },
    glutes: {
      glutes_max_lower: 0.38,
      glutes_max_upper: 0.32,
      glutes_med_min: 0.3
    },
    hamstrings: {
      hamstrings_lateral: 0.5,
      hamstrings_medial: 0.5
    }
  },
  "barbell-curl": {
    biceps: {
      biceps_long_head: 0.42,
      biceps_short_head: 0.42,
      biceps_brachialis: 0.16
    },
    forearms: {
      forearms_flexors: 0.5,
      forearms_extensors: 0.2,
      forearms_brachioradialis: 0.3
    }
  },
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
    forearms: {
      forearms_flexors: 0.13,
      forearms_extensors: 0.2,
      forearms_brachioradialis: 0.67
    }
  },
  "triceps-pushdown": {
    triceps: {
      triceps_long: 0.27,
      triceps_lateral: 0.4,
      triceps_medial: 0.33
    }
  },
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
  "barbell-shrug": {
    trap: {
      trap_upper: 0.7,
      trap_mid: 0.2,
      trap_lower: 0.1
    },
    forearms: {
      forearms_flexors: 0.7,
      forearms_extensors: 0.2,
      forearms_brachioradialis: 0.1
    }
  },
  "calf-raise": {
    calves: {
      calves_gastroc_medial: 0.4,
      calves_gastroc_lateral: 0.3,
      calves_soleus: 0.3
    }
  },
  plank: {
    abs: {
      abs_upper: 0.35,
      abs_lower: 0.35,
      abs_deep: 0.3
    },
    obliques: {
      obliques_external: 0.45,
      obliques_internal: 0.55
    }
  },
  "hanging-leg-raise": {
    abs: {
      abs_upper: 0.23,
      abs_lower: 0.6,
      abs_deep: 0.17
    },
    obliques: {
      obliques_external: 0.5,
      obliques_internal: 0.5
    },
    forearms: {
      forearms_flexors: 0.7,
      forearms_extensors: 0.2,
      forearms_brachioradialis: 0.1
    }
  },
  "cable-woodchop": {
    obliques: {
      obliques_external: 0.6,
      obliques_internal: 0.4
    },
    abs: {
      abs_upper: 0.29,
      abs_lower: 0.31,
      abs_deep: 0.4
    }
  },
  "incline-dumbbell-press": {
    chest: {
      chest_upper: 0.5,
      chest_mid: 0.35,
      chest_lower: 0.15
    },
    triceps: {
      triceps_long: 0.3,
      triceps_lateral: 0.4,
      triceps_medial: 0.3
    }
  },
  "decline-bench-press": {
    chest: {
      chest_upper: 0.15,
      chest_mid: 0.4,
      chest_lower: 0.45
    },
    triceps: {
      triceps_long: 0.3,
      triceps_lateral: 0.4,
      triceps_medial: 0.3
    }
  },
  "pec-deck": {
    chest: {
      chest_upper: 0.28,
      chest_mid: 0.47,
      chest_lower: 0.25
    }
  },
  "close-grip-bench": {
    triceps: {
      triceps_long: 0.3,
      triceps_lateral: 0.4,
      triceps_medial: 0.3
    },
    chest: {
      chest_upper: 0.25,
      chest_mid: 0.45,
      chest_lower: 0.3
    }
  },
  "arnold-press": {
    triceps: {
      triceps_long: 0.3,
      triceps_lateral: 0.4,
      triceps_medial: 0.3
    },
    trap: {
      trap_upper: 0.5,
      trap_mid: 0.2,
      trap_lower: 0.3
    }
  },
  "push-press": {
    triceps: {
      triceps_long: 0.3,
      triceps_lateral: 0.4,
      triceps_medial: 0.3
    },
    trap: {
      trap_upper: 0.5,
      trap_mid: 0.2,
      trap_lower: 0.3
    }
  },
  "machine-shoulder-press": {
    triceps: {
      triceps_long: 0.3,
      triceps_lateral: 0.4,
      triceps_medial: 0.3
    }
  },
  "pike-pushup": {
    triceps: {
      triceps_long: 0.3,
      triceps_lateral: 0.4,
      triceps_medial: 0.3
    }
  },
  "upright-row": {
    trap: {
      trap_upper: 0.5,
      trap_mid: 0.3,
      trap_lower: 0.2
    },
    biceps: {
      biceps_long_head: 0.42,
      biceps_short_head: 0.42,
      biceps_brachialis: 0.16
    }
  },
  "pendlay-row": {
    lat: {
      lat_upper: 0.55,
      lat_lower: 0.45
    },
    trap: {
      trap_upper: 0.2,
      trap_mid: 0.55,
      trap_lower: 0.25
    },
    biceps: {
      biceps_long_head: 0.42,
      biceps_short_head: 0.42,
      biceps_brachialis: 0.16
    }
  },
  "t-bar-row": {
    lat: {
      lat_upper: 0.55,
      lat_lower: 0.45
    },
    trap: {
      trap_upper: 0.2,
      trap_mid: 0.55,
      trap_lower: 0.25
    },
    biceps: {
      biceps_long_head: 0.42,
      biceps_short_head: 0.42,
      biceps_brachialis: 0.16
    }
  },
  "chest-supported-row": {
    lat: {
      lat_upper: 0.55,
      lat_lower: 0.45
    },
    trap: {
      trap_upper: 0.2,
      trap_mid: 0.55,
      trap_lower: 0.25
    },
    biceps: {
      biceps_long_head: 0.42,
      biceps_short_head: 0.42,
      biceps_brachialis: 0.16
    }
  },
  "inverted-row": {
    lat: {
      lat_upper: 0.55,
      lat_lower: 0.45
    },
    trap: {
      trap_upper: 0.2,
      trap_mid: 0.55,
      trap_lower: 0.25
    },
    biceps: {
      biceps_long_head: 0.42,
      biceps_short_head: 0.42,
      biceps_brachialis: 0.16
    }
  },
  "reverse-pec-deck": {
    trap: {
      trap_upper: 0.15,
      trap_mid: 0.5,
      trap_lower: 0.35
    }
  },
  "weighted-pullup": {
    lat: {
      lat_upper: 0.6,
      lat_lower: 0.4
    },
    trap: {
      trap_upper: 0.2,
      trap_mid: 0.3,
      trap_lower: 0.5
    },
    biceps: {
      biceps_long_head: 0.42,
      biceps_short_head: 0.42,
      biceps_brachialis: 0.16
    }
  },
  "assisted-pullup": {
    lat: {
      lat_upper: 0.6,
      lat_lower: 0.4
    },
    trap: {
      trap_upper: 0.2,
      trap_mid: 0.3,
      trap_lower: 0.5
    },
    biceps: {
      biceps_long_head: 0.42,
      biceps_short_head: 0.42,
      biceps_brachialis: 0.16
    }
  },
  "hack-squat": {
    quads: {
      quads_rectus_femoris: 0.22,
      quads_vastus_lateralis: 0.4,
      quads_vastus_medialis: 0.38
    },
    glutes: {
      glutes_max_lower: 0.41,
      glutes_max_upper: 0.34,
      glutes_med_min: 0.25
    },
    hamstrings: {
      hamstrings_lateral: 0.5,
      hamstrings_medial: 0.5
    }
  },
  "smith-squat": {
    quads: {
      quads_rectus_femoris: 0.22,
      quads_vastus_lateralis: 0.4,
      quads_vastus_medialis: 0.38
    },
    glutes: {
      glutes_max_lower: 0.41,
      glutes_max_upper: 0.34,
      glutes_med_min: 0.25
    },
    hamstrings: {
      hamstrings_lateral: 0.5,
      hamstrings_medial: 0.5
    }
  },
  "sissy-squat": {
    quads: {
      quads_rectus_femoris: 0.5,
      quads_vastus_lateralis: 0.26,
      quads_vastus_medialis: 0.24
    },
    abs: {
      abs_upper: 0.35,
      abs_lower: 0.35,
      abs_deep: 0.3
    }
  },
  "box-step-up": {
    quads: {
      quads_rectus_femoris: 0.22,
      quads_vastus_lateralis: 0.4,
      quads_vastus_medialis: 0.38
    },
    glutes: {
      glutes_max_lower: 0.38,
      glutes_max_upper: 0.32,
      glutes_med_min: 0.3
    },
    hamstrings: {
      hamstrings_lateral: 0.5,
      hamstrings_medial: 0.5
    }
  },
  "sumo-deadlift": {
    glutes: {
      glutes_max_lower: 0.45,
      glutes_max_upper: 0.35,
      glutes_med_min: 0.2
    },
    quads: {
      quads_rectus_femoris: 0.22,
      quads_vastus_lateralis: 0.4,
      quads_vastus_medialis: 0.38
    },
    hamstrings: {
      hamstrings_lateral: 0.43,
      hamstrings_medial: 0.57
    },
    trap: {
      trap_upper: 0.6,
      trap_mid: 0.25,
      trap_lower: 0.15
    }
  },
  "trap-bar-deadlift": {
    quads: {
      quads_rectus_femoris: 0.22,
      quads_vastus_lateralis: 0.4,
      quads_vastus_medialis: 0.38
    },
    glutes: {
      glutes_max_lower: 0.49,
      glutes_max_upper: 0.36,
      glutes_med_min: 0.15
    },
    hamstrings: {
      hamstrings_lateral: 0.43,
      hamstrings_medial: 0.57
    },
    trap: {
      trap_upper: 0.6,
      trap_mid: 0.25,
      trap_lower: 0.15
    }
  },
  "good-morning": {
    hamstrings: {
      hamstrings_lateral: 0.43,
      hamstrings_medial: 0.57
    },
    glutes: {
      glutes_max_lower: 0.49,
      glutes_max_upper: 0.36,
      glutes_med_min: 0.15
    }
  },
  "kettlebell-swing": {
    glutes: {
      glutes_max_lower: 0.49,
      glutes_max_upper: 0.36,
      glutes_med_min: 0.15
    },
    hamstrings: {
      hamstrings_lateral: 0.43,
      hamstrings_medial: 0.57
    },
    abs: {
      abs_upper: 0.35,
      abs_lower: 0.35,
      abs_deep: 0.3
    }
  },
  "nordic-curl": {
    hamstrings: {
      hamstrings_lateral: 0.5,
      hamstrings_medial: 0.5
    },
    glutes: {
      glutes_max_lower: 0.46,
      glutes_max_upper: 0.39,
      glutes_med_min: 0.15
    }
  },
  "glute-ham-raise": {
    hamstrings: {
      hamstrings_lateral: 0.5,
      hamstrings_medial: 0.5
    },
    glutes: {
      glutes_max_lower: 0.49,
      glutes_max_upper: 0.36,
      glutes_med_min: 0.15
    },
    calves: {
      calves_gastroc_medial: 0.4,
      calves_gastroc_lateral: 0.3,
      calves_soleus: 0.3
    }
  },
  "reverse-lunge": {
    quads: {
      quads_rectus_femoris: 0.22,
      quads_vastus_lateralis: 0.4,
      quads_vastus_medialis: 0.38
    },
    glutes: {
      glutes_max_lower: 0.38,
      glutes_max_upper: 0.32,
      glutes_med_min: 0.3
    },
    hamstrings: {
      hamstrings_lateral: 0.45,
      hamstrings_medial: 0.55
    }
  },
  "curtsy-lunge": {
    glutes: {
      glutes_max_lower: 0.34,
      glutes_max_upper: 0.31,
      glutes_med_min: 0.35
    },
    quads: {
      quads_rectus_femoris: 0.22,
      quads_vastus_lateralis: 0.4,
      quads_vastus_medialis: 0.38
    },
    hamstrings: {
      hamstrings_lateral: 0.45,
      hamstrings_medial: 0.55
    }
  },
  "preacher-curl": {
    biceps: {
      biceps_long_head: 0.35,
      biceps_short_head: 0.51,
      biceps_brachialis: 0.14
    },
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
  "concentration-curl": {
    biceps: {
      biceps_long_head: 0.35,
      biceps_short_head: 0.51,
      biceps_brachialis: 0.14
    },
    forearms: {
      forearms_flexors: 0.5,
      forearms_extensors: 0.2,
      forearms_brachioradialis: 0.3
    }
  },
  "reverse-curl": {
    forearms: {
      forearms_flexors: 0.13,
      forearms_extensors: 0.2,
      forearms_brachioradialis: 0.67
    },
    biceps: {
      biceps_long_head: 0.28,
      biceps_short_head: 0.22,
      biceps_brachialis: 0.5
    }
  },
  "overhead-triceps-extension": {
    triceps: {
      triceps_long: 0.5,
      triceps_lateral: 0.27,
      triceps_medial: 0.23
    }
  },
  "cable-lateral-raise": {
    trap: {
      trap_upper: 0.55,
      trap_mid: 0.2,
      trap_lower: 0.25
    }
  },
  "seated-calf-raise": {
    calves: {
      calves_gastroc_medial: 0.18,
      calves_gastroc_lateral: 0.14,
      calves_soleus: 0.68
    }
  },
  "ab-wheel-rollout": {
    abs: {
      abs_upper: 0.35,
      abs_lower: 0.35,
      abs_deep: 0.3
    },
    obliques: {
      obliques_external: 0.45,
      obliques_internal: 0.55
    },
    lat: {
      lat_upper: 0.45,
      lat_lower: 0.55
    }
  },
  "cable-crunch": {
    abs: {
      abs_upper: 0.67,
      abs_lower: 0.22,
      abs_deep: 0.11
    },
    obliques: {
      obliques_external: 0.6,
      obliques_internal: 0.4
    }
  },
  "pallof-press": {
    obliques: {
      obliques_external: 0.45,
      obliques_internal: 0.55
    },
    abs: {
      abs_upper: 0.29,
      abs_lower: 0.31,
      abs_deep: 0.4
    }
  },
  "russian-twist": {
    obliques: {
      obliques_external: 0.6,
      obliques_internal: 0.4
    },
    abs: {
      abs_upper: 0.29,
      abs_lower: 0.31,
      abs_deep: 0.4
    }
  },
  "side-plank": {
    obliques: {
      obliques_external: 0.55,
      obliques_internal: 0.45
    },
    abs: {
      abs_upper: 0.29,
      abs_lower: 0.31,
      abs_deep: 0.4
    }
  },
  "farmer-carry": {
    forearms: {
      forearms_flexors: 0.7,
      forearms_extensors: 0.2,
      forearms_brachioradialis: 0.1
    },
    trap: {
      trap_upper: 0.7,
      trap_mid: 0.2,
      trap_lower: 0.1
    },
    abs: {
      abs_upper: 0.31,
      abs_lower: 0.31,
      abs_deep: 0.38
    },
    obliques: {
      obliques_external: 0.45,
      obliques_internal: 0.55
    }
  },
  "suitcase-carry": {
    obliques: {
      obliques_external: 0.5,
      obliques_internal: 0.5
    },
    forearms: {
      forearms_flexors: 0.7,
      forearms_extensors: 0.2,
      forearms_brachioradialis: 0.1
    },
    trap: {
      trap_upper: 0.7,
      trap_mid: 0.2,
      trap_lower: 0.1
    }
  },
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
  "diamond-pushup": {
    triceps: {
      triceps_long: 0.3,
      triceps_lateral: 0.4,
      triceps_medial: 0.3
    },
    chest: {
      chest_upper: 0.25,
      chest_mid: 0.45,
      chest_lower: 0.3
    }
  },
  "bench-dip": {
    triceps: {
      triceps_long: 0.3,
      triceps_lateral: 0.4,
      triceps_medial: 0.3
    },
    chest: {
      chest_upper: 0.15,
      chest_mid: 0.4,
      chest_lower: 0.45
    }
  },
  "single-arm-overhead-cable-extension": {
    triceps: {
      triceps_long: 0.5,
      triceps_lateral: 0.27,
      triceps_medial: 0.23
    }
  },
  "jm-press": {
    triceps: {
      triceps_long: 0.38,
      triceps_lateral: 0.35,
      triceps_medial: 0.27
    },
    chest: {
      chest_upper: 0.25,
      chest_mid: 0.45,
      chest_lower: 0.3
    }
  },
  "tate-press": {
    triceps: {
      triceps_long: 0.27,
      triceps_lateral: 0.4,
      triceps_medial: 0.33
    }
  },
  "machine-triceps-extension": {
    triceps: {
      triceps_long: 0.27,
      triceps_lateral: 0.4,
      triceps_medial: 0.33
    }
  },
  "cable-curl": {
    biceps: {
      biceps_long_head: 0.42,
      biceps_short_head: 0.42,
      biceps_brachialis: 0.16
    },
    forearms: {
      forearms_flexors: 0.5,
      forearms_extensors: 0.2,
      forearms_brachioradialis: 0.3
    }
  },
  "spider-curl": {
    biceps: {
      biceps_long_head: 0.35,
      biceps_short_head: 0.51,
      biceps_brachialis: 0.14
    },
    forearms: {
      forearms_flexors: 0.5,
      forearms_extensors: 0.2,
      forearms_brachioradialis: 0.3
    }
  },
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
    forearms: {
      forearms_flexors: 0.5,
      forearms_extensors: 0.2,
      forearms_brachioradialis: 0.3
    }
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
    forearms: {
      forearms_flexors: 0.13,
      forearms_extensors: 0.2,
      forearms_brachioradialis: 0.67
    }
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
  "plate-pinch-hold": {
    forearms: {
      forearms_flexors: 0.7,
      forearms_extensors: 0.2,
      forearms_brachioradialis: 0.1
    }
  },
  "dumbbell-fly": {
    chest: {
      chest_upper: 0.28,
      chest_mid: 0.47,
      chest_lower: 0.25
    }
  },
  "low-to-high-cable-fly": {
    chest: {
      chest_upper: 0.5,
      chest_mid: 0.35,
      chest_lower: 0.15
    }
  },
  "high-to-low-cable-fly": {
    chest: {
      chest_upper: 0.15,
      chest_mid: 0.4,
      chest_lower: 0.45
    }
  },
  "incline-cable-fly": {
    chest: {
      chest_upper: 0.5,
      chest_mid: 0.35,
      chest_lower: 0.15
    }
  },
  "dumbbell-pullover": {
    chest: {
      chest_upper: 0.15,
      chest_mid: 0.4,
      chest_lower: 0.45
    },
    lat: {
      lat_upper: 0.4,
      lat_lower: 0.6
    },
    triceps: {
      triceps_long: 0.5,
      triceps_lateral: 0.27,
      triceps_medial: 0.23
    }
  },
  "svend-press": {
    chest: {
      chest_upper: 0.28,
      chest_mid: 0.47,
      chest_lower: 0.25
    },
    triceps: {
      triceps_long: 0.3,
      triceps_lateral: 0.4,
      triceps_medial: 0.3
    }
  },
  "incline-machine-press": {
    chest: {
      chest_upper: 0.5,
      chest_mid: 0.35,
      chest_lower: 0.15
    },
    triceps: {
      triceps_long: 0.3,
      triceps_lateral: 0.4,
      triceps_medial: 0.3
    }
  },
  "landmine-press": {
    chest: {
      chest_upper: 0.55,
      chest_mid: 0.32,
      chest_lower: 0.13
    },
    triceps: {
      triceps_long: 0.3,
      triceps_lateral: 0.4,
      triceps_medial: 0.3
    },
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
  "cable-front-raise": {
    trap: {
      trap_upper: 0.55,
      trap_mid: 0.2,
      trap_lower: 0.25
    }
  },
  "bent-over-rear-delt-fly": {
    trap: {
      trap_upper: 0.15,
      trap_mid: 0.5,
      trap_lower: 0.35
    }
  },
  "cable-rear-delt-fly": {
    trap: {
      trap_upper: 0.15,
      trap_mid: 0.5,
      trap_lower: 0.35
    }
  },
  "machine-lateral-raise": {
    trap: {
      trap_upper: 0.55,
      trap_mid: 0.2,
      trap_lower: 0.25
    }
  },
  "straight-arm-pulldown": {
    lat: {
      lat_upper: 0.4,
      lat_lower: 0.6
    },
    triceps: {
      triceps_long: 0.5,
      triceps_lateral: 0.27,
      triceps_medial: 0.23
    }
  },
  "close-grip-pulldown": {
    lat: {
      lat_upper: 0.4,
      lat_lower: 0.6
    },
    biceps: {
      biceps_long_head: 0.42,
      biceps_short_head: 0.42,
      biceps_brachialis: 0.16
    }
  },
  "neutral-grip-pulldown": {
    lat: {
      lat_upper: 0.5,
      lat_lower: 0.5
    },
    biceps: {
      biceps_long_head: 0.42,
      biceps_short_head: 0.42,
      biceps_brachialis: 0.16
    }
  },
  "single-arm-lat-pulldown": {
    lat: {
      lat_upper: 0.4,
      lat_lower: 0.6
    },
    biceps: {
      biceps_long_head: 0.42,
      biceps_short_head: 0.42,
      biceps_brachialis: 0.16
    }
  },
  "meadows-row": {
    lat: {
      lat_upper: 0.6,
      lat_lower: 0.4
    },
    trap: {
      trap_upper: 0.2,
      trap_mid: 0.55,
      trap_lower: 0.25
    },
    biceps: {
      biceps_long_head: 0.42,
      biceps_short_head: 0.42,
      biceps_brachialis: 0.16
    }
  },
  "seal-row": {
    lat: {
      lat_upper: 0.55,
      lat_lower: 0.45
    },
    trap: {
      trap_upper: 0.15,
      trap_mid: 0.6,
      trap_lower: 0.25
    },
    biceps: {
      biceps_long_head: 0.42,
      biceps_short_head: 0.42,
      biceps_brachialis: 0.16
    }
  },
  "dumbbell-shrug": {
    trap: {
      trap_upper: 0.7,
      trap_mid: 0.2,
      trap_lower: 0.1
    },
    forearms: {
      forearms_flexors: 0.7,
      forearms_extensors: 0.2,
      forearms_brachioradialis: 0.1
    }
  },
  "prone-y-raise": {
    trap: {
      trap_upper: 0.1,
      trap_mid: 0.25,
      trap_lower: 0.65
    }
  },
  "rack-pull": {
    trap: {
      trap_upper: 0.6,
      trap_mid: 0.25,
      trap_lower: 0.15
    },
    glutes: {
      glutes_max_lower: 0.49,
      glutes_max_upper: 0.36,
      glutes_med_min: 0.15
    },
    hamstrings: {
      hamstrings_lateral: 0.43,
      hamstrings_medial: 0.57
    },
    lat: {
      lat_upper: 0.5,
      lat_lower: 0.5
    },
    forearms: {
      forearms_flexors: 0.7,
      forearms_extensors: 0.2,
      forearms_brachioradialis: 0.1
    }
  },
  "seated-leg-curl": {
    hamstrings: {
      hamstrings_lateral: 0.55,
      hamstrings_medial: 0.45
    }
  },
  "stiff-leg-deadlift": {
    hamstrings: {
      hamstrings_lateral: 0.5,
      hamstrings_medial: 0.5
    },
    glutes: {
      glutes_max_lower: 0.49,
      glutes_max_upper: 0.36,
      glutes_med_min: 0.15
    },
    forearms: {
      forearms_flexors: 0.7,
      forearms_extensors: 0.2,
      forearms_brachioradialis: 0.1
    }
  },
  "single-leg-romanian-deadlift": {
    hamstrings: {
      hamstrings_lateral: 0.43,
      hamstrings_medial: 0.57
    },
    glutes: {
      glutes_max_lower: 0.43,
      glutes_max_upper: 0.32,
      glutes_med_min: 0.25
    },
    forearms: {
      forearms_flexors: 0.7,
      forearms_extensors: 0.2,
      forearms_brachioradialis: 0.1
    }
  },
  "cable-pull-through": {
    glutes: {
      glutes_max_lower: 0.49,
      glutes_max_upper: 0.36,
      glutes_med_min: 0.15
    },
    hamstrings: {
      hamstrings_lateral: 0.43,
      hamstrings_medial: 0.57
    }
  },
  "cable-glute-kickback": {
    glutes: {
      glutes_max_lower: 0.52,
      glutes_max_upper: 0.38,
      glutes_med_min: 0.1
    },
    hamstrings: {
      hamstrings_lateral: 0.43,
      hamstrings_medial: 0.57
    }
  },
  "glute-kickback-machine": {
    glutes: {
      glutes_max_lower: 0.5,
      glutes_max_upper: 0.4,
      glutes_med_min: 0.1
    },
    hamstrings: {
      hamstrings_lateral: 0.43,
      hamstrings_medial: 0.57
    }
  },
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
  "frog-pump": {
    glutes: {
      glutes_max_lower: 0.5,
      glutes_max_upper: 0.4,
      glutes_med_min: 0.1
    },
    hamstrings: {
      hamstrings_lateral: 0.5,
      hamstrings_medial: 0.5
    }
  },
  "pistol-squat": {
    quads: {
      quads_rectus_femoris: 0.22,
      quads_vastus_lateralis: 0.4,
      quads_vastus_medialis: 0.38
    },
    glutes: {
      glutes_max_lower: 0.38,
      glutes_max_upper: 0.32,
      glutes_med_min: 0.3
    },
    hamstrings: {
      hamstrings_lateral: 0.5,
      hamstrings_medial: 0.5
    },
    abs: {
      abs_upper: 0.35,
      abs_lower: 0.35,
      abs_deep: 0.3
    }
  },
  "lateral-lunge": {
    quads: {
      quads_rectus_femoris: 0.22,
      quads_vastus_lateralis: 0.4,
      quads_vastus_medialis: 0.38
    },
    glutes: {
      glutes_max_lower: 0.32,
      glutes_max_upper: 0.28,
      glutes_med_min: 0.4
    },
    hamstrings: {
      hamstrings_lateral: 0.5,
      hamstrings_medial: 0.5
    }
  },
  "cossack-squat": {
    quads: {
      quads_rectus_femoris: 0.22,
      quads_vastus_lateralis: 0.4,
      quads_vastus_medialis: 0.38
    },
    glutes: {
      glutes_max_lower: 0.34,
      glutes_max_upper: 0.31,
      glutes_med_min: 0.35
    },
    hamstrings: {
      hamstrings_lateral: 0.5,
      hamstrings_medial: 0.5
    }
  },
  "pendulum-squat": {
    quads: {
      quads_rectus_femoris: 0.22,
      quads_vastus_lateralis: 0.4,
      quads_vastus_medialis: 0.38
    },
    glutes: {
      glutes_max_lower: 0.41,
      glutes_max_upper: 0.34,
      glutes_med_min: 0.25
    },
    hamstrings: {
      hamstrings_lateral: 0.5,
      hamstrings_medial: 0.5
    }
  },
  "single-leg-press": {
    quads: {
      quads_rectus_femoris: 0.22,
      quads_vastus_lateralis: 0.4,
      quads_vastus_medialis: 0.38
    },
    glutes: {
      glutes_max_lower: 0.43,
      glutes_max_upper: 0.34,
      glutes_med_min: 0.23
    },
    hamstrings: {
      hamstrings_lateral: 0.45,
      hamstrings_medial: 0.55
    }
  },
  "glute-bridge": {
    glutes: {
      glutes_max_lower: 0.5,
      glutes_max_upper: 0.4,
      glutes_med_min: 0.1
    },
    hamstrings: {
      hamstrings_lateral: 0.5,
      hamstrings_medial: 0.5
    }
  },
  "crunch": {
    abs: {
      abs_upper: 0.67,
      abs_lower: 0.22,
      abs_deep: 0.11
    },
    obliques: {
      obliques_external: 0.6,
      obliques_internal: 0.4
    }
  },
  "reverse-crunch": {
    abs: {
      abs_upper: 0.23,
      abs_lower: 0.6,
      abs_deep: 0.17
    },
    obliques: {
      obliques_external: 0.5,
      obliques_internal: 0.5
    }
  },
  "bicycle-crunch": {
    abs: {
      abs_upper: 0.35,
      abs_lower: 0.35,
      abs_deep: 0.3
    },
    obliques: {
      obliques_external: 0.6,
      obliques_internal: 0.4
    }
  },
  "dead-bug": {
    abs: {
      abs_upper: 0.29,
      abs_lower: 0.31,
      abs_deep: 0.4
    },
    obliques: {
      obliques_external: 0.45,
      obliques_internal: 0.55
    }
  },
  "hollow-hold": {
    abs: {
      abs_upper: 0.3,
      abs_lower: 0.42,
      abs_deep: 0.28
    },
    obliques: {
      obliques_external: 0.45,
      obliques_internal: 0.55
    }
  },
  "v-up": {
    abs: {
      abs_upper: 0.4,
      abs_lower: 0.45,
      abs_deep: 0.15
    },
    obliques: {
      obliques_external: 0.5,
      obliques_internal: 0.5
    },
    quads: {
      quads_rectus_femoris: 0.72,
      quads_vastus_lateralis: 0.15,
      quads_vastus_medialis: 0.13
    }
  },
  "decline-situp": {
    abs: {
      abs_upper: 0.67,
      abs_lower: 0.22,
      abs_deep: 0.11
    },
    obliques: {
      obliques_external: 0.6,
      obliques_internal: 0.4
    },
    quads: {
      quads_rectus_femoris: 0.6,
      quads_vastus_lateralis: 0.21,
      quads_vastus_medialis: 0.19
    }
  },
  "toes-to-bar": {
    abs: {
      abs_upper: 0.23,
      abs_lower: 0.6,
      abs_deep: 0.17
    },
    obliques: {
      obliques_external: 0.5,
      obliques_internal: 0.5
    },
    forearms: {
      forearms_flexors: 0.7,
      forearms_extensors: 0.2,
      forearms_brachioradialis: 0.1
    },
    lat: {
      lat_upper: 0.4,
      lat_lower: 0.6
    }
  },
  "dragon-flag": {
    abs: {
      abs_upper: 0.33,
      abs_lower: 0.37,
      abs_deep: 0.3
    },
    obliques: {
      obliques_external: 0.45,
      obliques_internal: 0.55
    },
    lat: {
      lat_upper: 0.45,
      lat_lower: 0.55
    }
  },
  "oblique-crunch": {
    obliques: {
      obliques_external: 0.45,
      obliques_internal: 0.55
    },
    abs: {
      abs_upper: 0.67,
      abs_lower: 0.22,
      abs_deep: 0.11
    }
  },
  "donkey-calf-raise": {
    calves: {
      calves_gastroc_medial: 0.4,
      calves_gastroc_lateral: 0.3,
      calves_soleus: 0.3
    }
  },
  "leg-press-calf-raise": {
    calves: {
      calves_gastroc_medial: 0.4,
      calves_gastroc_lateral: 0.3,
      calves_soleus: 0.3
    }
  },
  "single-leg-calf-raise": {
    calves: {
      calves_gastroc_medial: 0.4,
      calves_gastroc_lateral: 0.3,
      calves_soleus: 0.3
    }
  },
};

/**
 * Full region-weight map for an exercise: each group weight from `muscleWeights` distributed
 * across that group's regions via REGION_EMPHASIS (or the even-split default). For non-subdividing
 * groups the whole weight lands on the group's single region (id === group id). The returned
 * weights sum to the same total as `muscleWeights` — regions never invent or lose training credit.
 */
export function regionWeightsForExercise(ex: ExerciseDef): Partial<Record<MuscleRegion, number>> {
  const out: Partial<Record<MuscleRegion, number>> = {};
  const emph = REGION_EMPHASIS[ex.id];
  for (const key of Object.keys(ex.muscleWeights) as MuscleGroup[]) {
    const w = ex.muscleWeights[key];
    if (w == null || w <= 0) continue;
    if (!groupHasSubRegions(key)) {
      const r = key as unknown as MuscleRegion; // whole-region group: id === group id
      out[r] = (out[r] ?? 0) + w;
      continue;
    }
    const split = emph?.[key] ?? DEFAULT_REGION_SPLIT[key];
    if (!split) {
      const r = key as unknown as MuscleRegion;
      out[r] = (out[r] ?? 0) + w;
      continue;
    }
    for (const rid of Object.keys(split) as MuscleRegion[]) {
      out[rid] = (out[rid] ?? 0) + w * (split[rid] ?? 0);
    }
  }
  return out;
}

/** A region's share of its parent group within an exercise (0..1), for UI breakdowns. */
export function regionSharesForExercise(
  ex: ExerciseDef,
  group: MuscleGroup,
): Partial<Record<MuscleRegion, number>> {
  return REGION_EMPHASIS[ex.id]?.[group] ?? DEFAULT_REGION_SPLIT[group] ?? {};
}
