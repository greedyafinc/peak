import { heat } from "../theme";
import { FRONT, BACK } from "../data/bodyGeometry";
import { SUBREGION_BANDS, pathBBox, type BBox } from "./bodyRegions";

// A muscle region the heat map can render: an SVG key + a 0–100 heat score.
// `untested` regions render neutral (no score). Decoupled from the data taxonomy
// (§2.1): the caller maps MuscleGroup → SVG key via MUSCLE_TO_SVG.
export type BodyMuscle = { id: string; score: number; untested?: boolean };

// Anatomical muscle heat map — full-body silhouette + per-muscle outlines reconstructed
// from the user's life-benchmark assets, filled by strength (cold teal → hot red), with
// glow on strong/selected muscles. Vertically-headed muscles (chest, abs, lats, traps) are
// drawn subdivided into sub-region bands (§4.3): the bands carry the group's strength color
// by default, and recolor by your TRAINING emphasis when that muscle is selected and
// `regionScores` is supplied. Front and back share the 500×1093 frame.
export function BodyMap({
  muscles,
  selected,
  onSelect,
  view,
  regionKey,
  regionScores,
}: {
  muscles: BodyMuscle[];
  selected: string | null;
  onSelect: (id: string) => void;
  view: "front" | "back";
  regionKey?: string | null;                          // svg key whose bands show region emphasis
  regionScores?: Partial<Record<string, number>>;     // regionId → 0..100 heat (for regionKey)
}) {
  const body = view === "front" ? FRONT : BACK;

  return (
    <svg viewBox={body.viewBox} style={{ width: "100%", maxWidth: 198, display: "block", margin: "0 auto" }}>
      {/* full-body silhouette */}
      <path d={body.silhouette} fill="#181b21" stroke="rgba(255,255,255,0.08)" strokeWidth={2} strokeLinejoin="round" />

      {muscles.map((m) => {
        const d = body.muscles[m.id];
        if (!d) return null;

        const baseColor = m.untested ? "#23262d" : heat(m.score);
        const isSel = selected === m.id;
        const dim = selected != null && !isSel;
        const glow = isSel
          ? `drop-shadow(0 0 9px ${m.untested ? "#5aa9ff" : baseColor})`
          : !m.untested && m.score >= 78
            ? `drop-shadow(0 0 5px ${baseColor}aa)`
            : "none";

        const bands = SUBREGION_BANDS[m.id];
        if (bands) {
          const bb: BBox = pathBBox(d);
          const clipId = `rc-${view}-${m.id}`;
          const px = (f: number) => bb.minY + f * bb.h;
          return (
            <g key={m.id} style={{ transition: "opacity .2s ease", opacity: dim ? 0.4 : 1, filter: glow }}>
              <clipPath id={clipId}>
                <path d={d} />
              </clipPath>
              <g clipPath={`url(#${clipId})`}>
                {bands.map((b) => {
                  const col = m.id === regionKey && regionScores?.[b.id] != null ? heat(regionScores[b.id]!) : baseColor;
                  return (
                    <rect key={b.id} x={bb.minX - 4} y={px(b.y0)} width={bb.w + 8} height={(b.y1 - b.y0) * bb.h + 0.6} fill={col} />
                  );
                })}
                {/* faint dividers between heads so the sub-regions are always legible */}
                {bands.slice(1).map((b) => (
                  <line key={`dv-${b.id}`} x1={bb.minX - 4} y1={px(b.y0)} x2={bb.maxX + 4} y2={px(b.y0)} stroke="rgba(10,11,13,0.55)" strokeWidth={1.5} />
                ))}
              </g>
              {/* outline + selection ring; `pointerEvents: all` makes the whole interior a
                  hit target even though fill is none (the bands beneath carry no handler) */}
              <path
                d={d}
                fill="none"
                onClick={() => onSelect(m.id)}
                stroke={isSel ? "#ffffff" : "rgba(10,11,13,0.5)"}
                strokeWidth={isSel ? 4 : 1.8}
                strokeLinejoin="round"
                style={{ cursor: "pointer", pointerEvents: "all" }}
              />
            </g>
          );
        }

        return (
          <path
            key={m.id}
            d={d}
            fill={baseColor}
            onClick={() => onSelect(m.id)}
            stroke={isSel ? "#ffffff" : "rgba(10,11,13,0.5)"}
            strokeWidth={isSel ? 4 : 1.8}
            strokeLinejoin="round"
            style={{ cursor: "pointer", transition: "opacity .2s ease", opacity: dim ? 0.4 : 1, filter: glow }}
          />
        );
      })}
    </svg>
  );
}
