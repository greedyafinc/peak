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
import { DEFAULT_REGION_SPLIT, REGION_EMPHASIS } from "./exerciseEmphasis";

// The per-exercise emphasis DATA lives in ./exerciseEmphasis; re-export it from this module's
// original path so existing importers of "../data/muscleRegions" keep working unchanged.
export { DEFAULT_REGION_SPLIT, REGION_EMPHASIS };

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
