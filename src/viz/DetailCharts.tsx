// Peak — SVG charts for the exercise-detail screen (Direction B). Ported from the
// design handoff's renderers into themed, typed React: a projection chart (solid
// logged → dotted projected), a percentile bell curve (inverse-normal marker), and
// a tiny trend sparkline. All pure presentational SVG; width-responsive via viewBox.

import { C, mono } from "../theme";
import { invNormCdf } from "../data/distributions/_shared";
import { normalizeRange, makeScaler } from "./chartHelpers";
import type { ProjPoint } from "../engine/exerciseDetail";

// ── Projection chart ─────────────────────────────────────────────────────────
// Logged portion is a solid line + area; the single projected point (if any)
// continues as a dotted line to a target marker. `lowerBetter` flips the vertical
// axis so improvement always reads UP (pace times go down as you get faster).
export function ProjectionChart({
  points,
  color,
  lowerBetter,
  nowIndex,
  nowLabel,
  targetLabel,
}: {
  points: ProjPoint[];
  color: string;
  lowerBetter: boolean;
  nowIndex: number;
  nowLabel: string;
  targetLabel: string | null;
}) {
  const W = 320;
  const H = 168;
  const padL = 16;
  const padR = 18;
  const padT = 26;
  const padB = 24;
  const pw = W - padL - padR;
  const ph = H - padT - padB;
  const n = points.length;
  if (n === 0) return null;

  const mt = (v: number): number => (lowerBetter ? -v : v);
  const { min: mn, max: mx } = normalizeRange(points.map((p) => mt(p.value)));
  const sp = mx - mn || 1;
  const lo = mn - sp * 0.34;
  const hi = mx + sp * 0.3;
  const X = (i: number): number => padL + (n > 1 ? (pw * i) / (n - 1) : pw / 2);
  const yScale = makeScaler(lo, hi, padT + ph, padT);
  const Y = (v: number): number => yScale(mt(v));

  const nowI = Math.min(Math.max(0, nowIndex), n - 1);
  const hasProj = n - 1 > nowI;

  // solid (logged) path + area
  let solid = `M ${X(0)} ${Y(points[0].value)}`;
  for (let i = 1; i <= nowI; i++) solid += ` L ${X(i)} ${Y(points[i].value)}`;
  let area = `M ${X(0)} ${padT + ph}`;
  for (let i = 0; i <= nowI; i++) area += ` L ${X(i)} ${Y(points[i].value)}`;
  area += ` L ${X(nowI)} ${padT + ph} Z`;

  // dotted (projected) path
  let dash = "";
  if (hasProj) {
    dash = `M ${X(nowI)} ${Y(points[nowI].value)}`;
    for (let i = nowI + 1; i < n; i++) dash += ` L ${X(i)} ${Y(points[i].value)}`;
  }

  const gid = `pjgrad`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.24} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f, i) => (
        <line key={`g${i}`} x1={padL} y1={padT + ph * f} x2={W - padR} y2={padT + ph * f} stroke={C.line3} strokeWidth={1} />
      ))}
      {/* "now" divider */}
      <line x1={X(nowI)} y1={padT - 4} x2={X(nowI)} y2={padT + ph} stroke="rgba(255,255,255,0.18)" strokeWidth={1} strokeDasharray="2 3" />
      <path d={area} fill={`url(#${gid})`} />
      <path d={solid} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      {hasProj && (
        <path d={dash} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 6" opacity={0.95} />
      )}
      {/* logged dots */}
      {points.slice(0, nowI).map((p, i) => (
        <circle key={`pd${i}`} cx={X(i)} cy={Y(p.value)} r={3} fill={C.inner} stroke={color} strokeWidth={2} />
      ))}
      {/* projected interior dots */}
      {hasProj &&
        points.slice(nowI + 1, n - 1).map((p, i) => (
          <circle key={`fd${i}`} cx={X(nowI + 1 + i)} cy={Y(p.value)} r={2.8} fill={color} opacity={0.45} />
        ))}
      {/* now marker */}
      <circle cx={X(nowI)} cy={Y(points[nowI].value)} r={5} fill={color} stroke={C.inner} strokeWidth={2.5} />
      {/* target marker */}
      {hasProj && (
        <>
          <circle cx={X(n - 1)} cy={Y(points[n - 1].value)} r={9.5} fill="none" stroke={color} strokeWidth={1.2} opacity={0.4} />
          <circle cx={X(n - 1)} cy={Y(points[n - 1].value)} r={5.5} fill={color} stroke={C.inner} strokeWidth={2.5} />
        </>
      )}
      {/* value labels */}
      <text x={X(nowI)} y={Y(points[nowI].value) - 12} fill={C.ink} fontSize={11} fontWeight={700} fontFamily={mono} textAnchor={hasProj ? "middle" : "end"}>
        {nowLabel}
      </text>
      {hasProj && targetLabel && (
        <text x={X(n - 1)} y={Y(points[n - 1].value) - 13} fill={color} fontSize={11} fontWeight={700} fontFamily={mono} textAnchor="end">
          {targetLabel}
        </text>
      )}
      {/* x-axis labels */}
      {points.map((p, i) => (
        <text key={`xl${i}`} x={X(i)} y={H - 7} fill={i === nowI ? C.ink : C.muted} fontSize={9} fontWeight={i === nowI ? 700 : 500} fontFamily={mono} textAnchor="middle">
          {p.label}
        </text>
      ))}
    </svg>
  );
}

// ── Percentile bell curve ────────────────────────────────────────────────────
// A genuine normal curve, shaded up to the user's percentile, with a marker placed
// at the inverse-CDF of that percentile (so the marker sits where they actually are).
export function BellCurve({ pct, color }: { pct: number; color: string }) {
  const W = 320;
  const H = 56;
  const padX = 6;
  const padT = 8;
  const padB = 8;
  const z = invNormCdf(Math.max(0.01, Math.min(0.99, pct)));
  const zmin = -3.1;
  const zmax = 3.1;
  const span = zmax - zmin;
  const xOf = (zz: number): number => padX + ((W - 2 * padX) * (zz - zmin)) / span;
  const top = padT;
  const bot = H - padB;
  const g = (zz: number): number => Math.exp((-zz * zz) / 2);
  const yOf = (v: number): number => bot - (bot - top) * v;
  const N = 120;

  let fill = `M ${xOf(zmin)} ${bot}`;
  for (let i = 0; i <= N; i++) {
    const zz = zmin + (span * i) / N;
    if (zz > z) break;
    fill += ` L ${xOf(zz)} ${yOf(g(zz))}`;
  }
  fill += ` L ${xOf(Math.min(z, zmax))} ${bot} Z`;

  let curve = `M ${xOf(zmin)} ${yOf(g(zmin))}`;
  for (let i = 1; i <= N; i++) {
    const zz = zmin + (span * i) / N;
    curve += ` L ${xOf(zz)} ${yOf(g(zz))}`;
  }

  const mxp = xOf(z);
  const myp = yOf(g(z));
  const gid = "bellgrad";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.42} />
          <stop offset="100%" stopColor={color} stopOpacity={0.04} />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${gid})`} />
      <path d={curve} fill="none" stroke={color} strokeWidth={1.6} opacity={0.92} strokeLinejoin="round" />
      <line x1={xOf(zmin)} y1={bot} x2={xOf(zmax)} y2={bot} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
      <line x1={mxp} y1={top - 3} x2={mxp} y2={bot} stroke={color} strokeWidth={1.2} strokeDasharray="3 3" opacity={0.9} />
      <circle cx={mxp} cy={myp} r={3.4} fill={color} stroke={C.inner} strokeWidth={1.6} />
    </svg>
  );
}

// ── Sparkline ────────────────────────────────────────────────────────────────
export function Sparkline({ values, lowerBetter, color = C.accent }: { values: number[]; lowerBetter: boolean; color?: string }) {
  const w = 64;
  const h = 28;
  if (values.length < 2) return null;
  const mt = (v: number): number => (lowerBetter ? -v : v);
  const arr = values.map(mt);
  const { min: mn, max: mx } = normalizeRange(arr);
  const X = (i: number): number => 3 + ((w - 6) * i) / (values.length - 1);
  const yScale = makeScaler(mn, mx, 3, 3 + (h - 6), true);
  const Y = (i: number): number => yScale(arr[i]);
  let p = `M ${X(0)} ${Y(0)}`;
  for (let i = 1; i < values.length; i++) p += ` L ${X(i)} ${Y(i)}`;
  const li = values.length - 1;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: w, height: h, display: "block" }}>
      <path d={p} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
      <circle cx={X(li)} cy={Y(li)} r={2.6} fill={color} />
    </svg>
  );
}

