// Peak — small "muscles worked" body map for the EXERCISE DETAIL screen.
//
// A compact, read-only companion to the per-region "Muscles worked" rows: the same
// front/back silhouettes the strength heat-map uses (§4.3), but lit by THIS LIFT's
// attribution rather than your strength. Worked muscles glow in the exercise's accent
// color — primary movers brightest, assists fainter, scaled by each group's share of
// the lift. Only the view(s) the exercise actually trains are drawn (a curl shows just
// the front; a bench shows front + back), so there's never an empty silhouette.

import { FRONT, BACK, type BodySide } from "../data/bodyGeometry";
import { MUSCLE_TO_SVG } from "../data/muscleMap";
import { C, mono, hexA, glow } from "../theme";
import type { MuscleWorked } from "../engine/exerciseDetail";

// Per-SVG-region highlight: how hot to light it, and whether it's a primary mover
// (primaries get a glow). Several MuscleGroups can share one SVG key (front+side delt
// → "delts"); we keep the strongest and OR the primary flag.
type Fill = { intensity: number; primary: boolean };

export function ExerciseBodyMap({ muscles, color }: { muscles: MuscleWorked[]; color: string }) {
  const maxShare = Math.max(...muscles.map((m) => m.share), 1e-4);
  const fills: Record<string, Fill> = {};
  for (const m of muscles) {
    const map = MUSCLE_TO_SVG[m.group];
    if (!map) continue;
    // Heaviest group lights fully; lighter assists fade toward a 0.35 floor.
    const intensity = 0.35 + 0.6 * (m.share / maxShare);
    for (const key of map.svgKeys) {
      const prev = fills[key];
      fills[key] = {
        intensity: Math.max(intensity, prev?.intensity ?? 0),
        primary: m.primary || (prev?.primary ?? false),
      };
    }
  }

  const showFront = Object.keys(fills).some((k) => FRONT.muscles[k]);
  const showBack = Object.keys(fills).some((k) => BACK.muscles[k]);
  if (!showFront && !showBack) return null;

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 14, padding: "4px 0 2px" }}>
      {showFront && <Side body={FRONT} fills={fills} color={color} label="Front" />}
      {showBack && <Side body={BACK} fills={fills} color={color} label="Back" />}
    </div>
  );
}

function Side({ body, fills, color, label }: { body: BodySide; fills: Record<string, Fill>; color: string; label: string }) {
  return (
    <div style={{ flex: "0 1 150px", minWidth: 0 }}>
      <svg viewBox={body.viewBox} style={{ width: "100%", display: "block", margin: "0 auto" }}>
        <path d={body.silhouette} fill={C.silhouette} stroke={C.line2} strokeWidth={2} strokeLinejoin="round" />
        {Object.entries(body.muscles).map(([key, d]) => {
          const f = fills[key];
          if (!f) {
            // Untouched muscles stay as faint anatomy so the lit ones read clearly.
            return <path key={key} d={d} fill={hexA(C.ink, 0.04)} strokeLinejoin="round" />;
          }
          return (
            <path
              key={key}
              d={d}
              fill={hexA(color, f.intensity)}
              stroke={hexA(color, Math.min(1, f.intensity + 0.2))}
              strokeWidth={1.4}
              strokeLinejoin="round"
              style={{ filter: f.primary ? glow.drop(hexA(color, 0.45), 5) : "none" }}
            />
          );
        })}
      </svg>
      <div style={{ textAlign: "center", fontFamily: mono, fontSize: 9, letterSpacing: "1px", textTransform: "uppercase", color: C.muted, marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}
