// Peak — minimal circular progress ring (a single value 0–100). The recovery hero,
// the selected-muscle detail, and the Body-screen readiness widget all draw the same
// ring, so it lives here once. Caller positions any centered label over it.

export function ProgressRing({
  pct,
  color,
  size,
  strokeWidth,
}: {
  pct: number;
  color: string;
  size: number;
  strokeWidth: number;
}) {
  const r = (size - strokeWidth) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={strokeWidth} />
      <circle
        cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={off} transform={`rotate(-90 ${c} ${c})`}
        style={{ transition: "stroke-dashoffset .4s ease" }}
      />
    </svg>
  );
}
