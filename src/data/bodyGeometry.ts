// Body heat-map geometry — silhouette + per-muscle outlines reconstructed from the
// user's life-benchmark muscle-map assets (per-muscle "Solo" SVGs + Naked outline PNG),
// each rasterized and traced into a clean flat region in a shared 500×1093 frame so the
// layers align exactly. See /tmp/trace/extract2.cjs for the build.
import parts from "./bodyParts.json";

export type BodySide = { viewBox: string; silhouette: string; muscles: Record<string, string> };

export const FRONT = parts.front as BodySide;
export const BACK = parts.back as BodySide;
