import { type Muscle } from "../model";
import { heat } from "../theme";
import { FRONT, BACK } from "../data/bodyGeometry";

// Anatomical muscle heat map — full-body silhouette + per-muscle outlines reconstructed
// from the user's life-benchmark assets, filled by strength (cold teal → hot red), with
// glow on strong/selected muscles. Front and back share the 500×1093 frame.
export function BodyMap({
  muscles,
  selected,
  onSelect,
  view,
}: {
  muscles: Muscle[];
  selected: string | null;
  onSelect: (id: string) => void;
  view: "front" | "back";
}) {
  const body = view === "front" ? FRONT : BACK;

  return (
    <svg viewBox={body.viewBox} style={{ width: "100%", maxWidth: 198, display: "block", margin: "0 auto" }}>
      {/* full-body silhouette */}
      <path d={body.silhouette} fill="#181b21" stroke="rgba(255,255,255,0.08)" strokeWidth={2} strokeLinejoin="round" />

      {muscles.map((m) => {
        const d = body.muscles[m.id];
        if (!d) return null;

        const color = heat(m.score);
        const isSel = selected === m.id;
        const dim = selected != null && !isSel;
        const glow = isSel
          ? `drop-shadow(0 0 9px ${color})`
          : m.score >= 78
            ? `drop-shadow(0 0 5px ${color}aa)`
            : "none";

        return (
          <path
            key={m.id}
            d={d}
            fill={color}
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
