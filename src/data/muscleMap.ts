// Peak — MuscleGroup ↔ body-map SVG key mapping (§2.1 AI-readiness flag).
//
// The data taxonomy (the 17-value `MuscleGroup` enum) is intentionally DECOUPLED
// from the drawing (the SVG region keys in bodyParts.json). The capability tree
// and inference engine speak `MuscleGroup`; the heat-map renderer speaks SVG keys.
// This module is the single, explicit bridge between them so neither side has to
// know the other's vocabulary.
//
// SVG region keys actually present in bodyParts.json (verified):
//   front.muscles: delts, chest, biceps, forearms, abs, obliques, quads, shins
//   back.muscles:  traps, rdelts, lats, triceps, forearms, lowerback, glutes, hams, calves
//
// Notes on the lossy spots (the SVG is coarser than the taxonomy):
//   - front "delts" is undifferentiated → mapped to front_delt + side_delt.
//   - back "rdelts" → rear_delt.
//   - the SVG has no dedicated side-delt region; side_delt shares the front "delts"
//     region (front view) — acceptable for a heat map.
//   - "shins" (front lower leg) is the tibialis; back "calves" is the calves.
//   - SVG_TO_MUSCLE picks ONE canonical MuscleGroup per SVG key (the primary one)
//     so the reverse map stays a clean Record<string, MuscleGroup>.

import type { MuscleGroup } from "../types";

export type MuscleSvgMapping = {
  svgKeys: string[];
  view: "front" | "back" | "both";
  label: string;
};

export const MUSCLE_TO_SVG: Record<MuscleGroup, MuscleSvgMapping> = {
  chest: { svgKeys: ["chest"], view: "front", label: "Chest" },
  front_delt: { svgKeys: ["delts"], view: "front", label: "Front Delts" },
  // No dedicated side-delt region in the asset; it shares the front delt cap region.
  side_delt: { svgKeys: ["delts"], view: "front", label: "Side Delts" },
  rear_delt: { svgKeys: ["rdelts"], view: "back", label: "Rear Delts" },
  biceps: { svgKeys: ["biceps"], view: "front", label: "Biceps" },
  triceps: { svgKeys: ["triceps"], view: "back", label: "Triceps" },
  forearms: { svgKeys: ["forearms"], view: "both", label: "Forearms" },
  lat: { svgKeys: ["lats"], view: "back", label: "Lats" },
  trap: { svgKeys: ["traps"], view: "back", label: "Traps" },
  lower_back: { svgKeys: ["lowerback"], view: "back", label: "Lower Back" },
  abs: { svgKeys: ["abs"], view: "front", label: "Abs" },
  obliques: { svgKeys: ["obliques"], view: "front", label: "Obliques" },
  glutes: { svgKeys: ["glutes"], view: "back", label: "Glutes" },
  quads: { svgKeys: ["quads"], view: "front", label: "Quads" },
  hamstrings: { svgKeys: ["hams"], view: "back", label: "Hamstrings" },
  calves: { svgKeys: ["calves"], view: "back", label: "Calves" },
  // The anterior shin region is the tibialis anterior.
  tibialis: { svgKeys: ["shins"], view: "front", label: "Tibialis" },
};

// Reverse map: each SVG key → its single canonical (primary) MuscleGroup.
// Where two MuscleGroups share an SVG region (delts → front_delt + side_delt), the
// primary one wins. front "delts" → front_delt; back "rdelts" → rear_delt.
export const SVG_TO_MUSCLE: Record<string, MuscleGroup> = {
  chest: "chest",
  delts: "front_delt",
  rdelts: "rear_delt",
  biceps: "biceps",
  triceps: "triceps",
  forearms: "forearms",
  lats: "lat",
  traps: "trap",
  lowerback: "lower_back",
  abs: "abs",
  obliques: "obliques",
  glutes: "glutes",
  quads: "quads",
  hams: "hamstrings",
  calves: "calves",
  shins: "tibialis",
};
