// Peak — heat-map sub-region geometry (§4.3 granular body map).
//
// The traced SVG muscle outlines in bodyParts.json are single, often BILATERAL paths
// (both pecs in one "chest" blob, both thighs in one "quads" blob). A muscle's heads can
// be drawn honestly ONLY when they're stacked vertically, because a horizontal band clipped
// to the outline follows the real silhouette — whereas a left/right (medial vs lateral) split
// of a bilateral path would just cut the two limbs apart, not the heads. So we subdivide only
// the vertically-arranged muscles: chest (clavicular→costal), abs (upper→lower), lats
// (upper→lower), traps (upper→mid→lower). Medial/lateral-headed muscles (triceps, biceps,
// quads) stay whole on the silhouette — their granularity lives in the exercise-detail and
// "sub-regions you train" breakdowns instead, which keeps the map anatomically truthful.

import type { MuscleRegion } from "../types";

export type RegionBand = { id: MuscleRegion; label: string; y0: number; y1: number }; // y fractions of bbox, top→bottom

// SVG region key (bodyParts.json) → ordered vertical bands. Region ids match the MuscleRegion
// taxonomy in src/data/muscleRegions.ts. abs_deep (transversus) is internal and not drawn.
export const SUBREGION_BANDS: Record<string, RegionBand[]> = {
  chest: [
    { id: "chest_upper", label: "Upper Chest", y0: 0.0, y1: 0.36 },
    { id: "chest_mid", label: "Mid Chest", y0: 0.36, y1: 0.7 },
    { id: "chest_lower", label: "Lower Chest", y0: 0.7, y1: 1.0 },
  ],
  abs: [
    { id: "abs_upper", label: "Upper Abs", y0: 0.0, y1: 0.5 },
    { id: "abs_lower", label: "Lower Abs", y0: 0.5, y1: 1.0 },
  ],
  lats: [
    { id: "lat_upper", label: "Upper Lat", y0: 0.0, y1: 0.5 },
    { id: "lat_lower", label: "Lower Lat", y0: 0.5, y1: 1.0 },
  ],
  traps: [
    { id: "trap_upper", label: "Upper Trap", y0: 0.0, y1: 0.34 },
    { id: "trap_mid", label: "Mid Trap", y0: 0.34, y1: 0.64 },
    { id: "trap_lower", label: "Lower Trap", y0: 0.64, y1: 1.0 },
  ],
};

export type BBox = { minX: number; minY: number; maxX: number; maxY: number; w: number; h: number };

// Approximate bounding box of an SVG path from its absolute coordinate pairs. The traced
// outlines use only M/L/C with absolute x,y values, so pairing consecutive numbers and taking
// min/max gives a box tight enough to band against (control points sit on/near the curve).
export function pathBBox(d: string): BBox {
  const nums = d.match(/-?\d*\.?\d+(?:e-?\d+)?/gi);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  if (nums) {
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = parseFloat(nums[i]);
      const y = parseFloat(nums[i + 1]);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 0; maxY = 0; }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}
