import { C, mono, hexA } from "../theme";

// One axis of the capability radar: a short label + a 0–100 value.
export type RadarAxis = { abbr: string; val: number };

// Multi-axis capability radar. Driven by the dimension rollups (build-relative
// percentiles ×100), not a hard-coded constant.
export function Radar({ metrics }: { metrics: RadarAxis[] }) {
  const labels = metrics.map((m) => m.abbr);
  const vals = metrics.map((m) => m.val);
  const cx = 130;
  const cy = 128;
  const rad = 84;
  const n = vals.length || 1;
  const ang = (i: number) => ((-90 + i * (360 / n)) * Math.PI) / 180;
  const pt = (i: number, r: number): [number, number] => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
  const ring = (f: number) => vals.map((_, i) => pt(i, rad * f).join(",")).join(" ");
  const dataPts = vals.map((v, i) => pt(i, (rad * v) / 100).join(",")).join(" ");

  return (
    <svg viewBox="0 0 260 256" style={{ width: "100%", maxWidth: 280, display: "block", margin: "0 auto" }}>
      {[1, 0.66, 0.33].map((f, k) => (
        <polygon key={"g" + k} points={ring(f)} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={1} />
      ))}
      {vals.map((_, i) => {
        const p = pt(i, rad);
        return <line key={"ax" + i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke={C.line} strokeWidth={1} />;
      })}
      <polygon points={dataPts} fill={hexA(C.accent, 0.16)} stroke={C.accent} strokeWidth={2} strokeLinejoin="round" />
      {vals.map((v, i) => {
        const p = pt(i, (rad * v) / 100);
        return <circle key={"dot" + i} cx={p[0]} cy={p[1]} r={3.5} fill={C.accent} />;
      })}
      {labels.map((l, i) => {
        const p = pt(i, rad + 18);
        return (
          <g key={"l" + i}>
            <text x={p[0]} y={p[1] - 2} fill={C.muted} fontSize={10} fontFamily={mono} fontWeight={700} textAnchor="middle" dominantBaseline="middle">
              {l}
            </text>
            <text x={p[0]} y={p[1] + 11} fill={C.ink} fontSize={11} fontFamily={mono} fontWeight={700} textAnchor="middle" dominantBaseline="middle">
              {vals[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
