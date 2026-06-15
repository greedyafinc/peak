// Peak — shared UI primitives + formatting helpers. The "design system" the
// screens build on so the beta stays visually coherent. Dark performance-tech
// theme, inline styles, Space Grotesk + JetBrains Mono.

import type { CSSProperties, ReactNode } from "react";
import { C, mono } from "../theme";
import { TIER_LABEL, TIER_COLOR, TIER_BANDS } from "../constants";
import type { TierId, CurveProvenance } from "../types";

/** Band a percentile [0,1] into its tier (half-open, lower-inclusive; §2.3). */
export function tierFromPct(p: number): TierId {
  for (const b of TIER_BANDS) if (p >= b.lo && p < b.hi) return b.tier;
  return "peak";
}

// ── Formatting ────────────────────────────────────────────────────────────────
/** 0.88 → "88th". Handles the awkward 11/12/13 → "th" and 21st/22nd/23rd. */
export function pctLabel(p: number | null): string {
  if (p == null) return "—";
  const n = Math.round(p * 100);
  const v = Math.max(1, Math.min(99, n));
  const t = v % 100;
  if (t >= 11 && t <= 13) return `${v}th`;
  switch (v % 10) {
    case 1: return `${v}st`;
    case 2: return `${v}nd`;
    case 3: return `${v}rd`;
    default: return `${v}th`;
  }
}

export const pct100 = (p: number | null): number => (p == null ? 0 : Math.round(p * 100));
export const tierLabel = (t: TierId | null): string => (t ? TIER_LABEL[t] : "Untested");
export const tierColor = (t: TierId | null): string => (t ? TIER_COLOR[t] : C.muted);

export function score100(p: number | null): string {
  return p == null ? "—" : String(Math.round(p * 100));
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style, onClick, glow }: { children: ReactNode; style?: CSSProperties; onClick?: () => void; glow?: string }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.card,
        border: `1px solid ${C.line2}`,
        borderRadius: 18,
        padding: 16,
        ...(glow ? { boxShadow: `0 0 0 1px ${glow}33, 0 8px 30px -12px ${glow}55` } : {}),
        ...(onClick ? { cursor: "pointer" } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Tier badge ──────────────────────────────────────────────────────────────
export function TierBadge({ tier, small }: { tier: TierId | null; small?: boolean }) {
  const col = tierColor(tier);
  const isPeak = tier === "peak";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: small ? 10 : 11,
        fontWeight: 700,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        padding: small ? "3px 8px" : "4px 10px",
        borderRadius: 20,
        color: tier ? (isPeak ? "#0a0b0d" : col) : C.muted,
        background: tier ? (isPeak ? col : `${col}1f`) : "transparent",
        border: tier ? "none" : `1px solid ${C.line2}`,
      }}
    >
      {isPeak && <span style={{ fontSize: small ? 9 : 10 }}>★</span>}
      {tierLabel(tier)}
    </span>
  );
}

// ── Percentile bar with confidence band (§2.4 — soft leaves show a wider band) ─
export function PercentileBar({
  percentile,
  confidence,
  color,
  height = 8,
}: {
  percentile: number | null;
  confidence?: number | null;
  color?: string;
  height?: number;
}) {
  const p = pct100(percentile);
  // Color by tier when no explicit color is given (untested → neutral).
  const col = color ?? (percentile == null ? C.muted : tierColor(tierFromPct(percentile)));
  // Confidence band half-width in percentile points: lower confidence → wider band.
  const conf = confidence ?? 0.6;
  const band = percentile == null ? 0 : Math.round((1 - conf) * 18);
  const lo = Math.max(0, p - band);
  const hi = Math.min(100, p + band);
  return (
    <div style={{ height, borderRadius: height / 2, background: C.inner, overflow: "hidden", position: "relative" }}>
      {percentile != null && band > 0 && (
        <div style={{ position: "absolute", left: `${lo}%`, width: `${hi - lo}%`, top: 0, bottom: 0, background: `${col}33` }} />
      )}
      <div style={{ position: "absolute", left: 0, width: `${p}%`, top: 0, bottom: 0, background: col, borderRadius: height / 2 }} />
    </div>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────────────
export function StatTile({ value, label, color }: { value: ReactNode; label: string; color?: string }) {
  return (
    <div style={{ flex: 1, background: C.card, border: `1px solid ${C.line2}`, borderRadius: 16, padding: "13px 12px" }}>
      <div style={{ fontFamily: mono, fontSize: 20, fontWeight: 700, color: color ?? C.ink }}>{value}</div>
      <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", marginTop: 4, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
export function SectionTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, letterSpacing: "-0.3px" }}>{children}</div>
      {sub && <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function Kicker({ children }: { children: ReactNode }) {
  return <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "2px", color: C.muted, textTransform: "uppercase" }}>{children}</div>;
}

// ── Buttons / inputs ────────────────────────────────────────────────────────
export function PrimaryButton({ children, onClick, disabled, style }: { children: ReactNode; onClick?: () => void; disabled?: boolean; style?: CSSProperties }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        fontSize: 15,
        fontWeight: 700,
        padding: 14,
        borderRadius: 14,
        border: "none",
        cursor: disabled ? "default" : "pointer",
        background: disabled ? C.lockCard : C.accent,
        color: disabled ? C.muted : "#0a0b0d",
        transition: "background .15s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, color, style }: { children: ReactNode; onClick?: () => void; color?: string; style?: CSSProperties }) {
  const col = color ?? C.accent;
  return (
    <button
      onClick={onClick}
      style={{ fontSize: 13, fontWeight: 700, padding: "9px 14px", borderRadius: 11, border: "none", cursor: "pointer", background: `${col}26`, color: col, ...style }}
    >
      {children}
    </button>
  );
}

export const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontSize: 16,
  color: C.ink,
  background: C.inner,
  border: `1px solid ${C.line2}`,
  borderRadius: 12,
  padding: "12px 14px",
  outline: "none",
};

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6, display: "block" }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: C.muted, marginTop: 5, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

export function Chip({ active, color, onClick, children }: { active?: boolean; color?: string; onClick?: () => void; children: ReactNode }) {
  const col = color ?? C.accent;
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 13,
        fontWeight: 600,
        padding: "7px 13px",
        borderRadius: 30,
        cursor: "pointer",
        border: `1px solid ${active ? col : C.line2}`,
        background: active ? col : C.inner,
        color: active ? "#0a0b0d" : C.sub,
      }}
    >
      {children}
    </button>
  );
}

// ── Segmented toggle (unit switch, mode picker, …) ────────────────────────────
export function SegToggle<T extends string>({
  options,
  value,
  onChange,
  color,
  style,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  color?: string;
  style?: CSSProperties;
}) {
  const col = color ?? C.accent;
  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex",
        background: C.inner,
        border: `1px solid ${C.line2}`,
        borderRadius: 11,
        padding: 3,
        gap: 2,
        ...style,
      }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            style={{
              fontFamily: mono,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.3px",
              padding: "7px 13px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
              background: on ? col : "transparent",
              color: on ? "#0a0b0d" : C.sub,
              transition: "background .15s, color .15s",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Bottom sheet shell ──────────────────────────────────────────────────────
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "absolute", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.6)", animation: "fadeIn .2s ease", display: "flex", alignItems: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", background: C.card, borderTop: `1px solid ${C.line}`, borderRadius: "28px 28px 0 0", padding: "12px 18px 30px", animation: "sheetUp .3s cubic-bezier(.2,.8,.2,1)", maxHeight: "90%", overflowY: "auto" }}
      >
        <div style={{ width: 38, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.2)", margin: "0 auto 18px" }} />
        <div style={{ fontSize: 20, fontWeight: 700, color: C.ink, letterSpacing: "-0.5px", marginBottom: 16 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

// ── Provenance label (§5.6 methodology transparency) ──────────────────────────
export function SourceTag({ provenance }: { provenance: CurveProvenance }) {
  const map: Record<CurveProvenance, { label: string; color: string }> = {
    seed_population: { label: "Population seed", color: C.blue },
    blended: { label: "Blended", color: C.mint },
    first_party: { label: "Peak users", color: C.accent },
  };
  const m = map[provenance];
  return (
    <span style={{ fontSize: 10, fontFamily: mono, color: m.color, background: `${m.color}1a`, padding: "2px 7px", borderRadius: 6, letterSpacing: "0.3px" }}>
      {m.label}
    </span>
  );
}

// ── Confidence dot row ────────────────────────────────────────────────────────
export function ConfidenceMeter({ confidence }: { confidence: number | null }) {
  if (confidence == null) return <span style={{ fontSize: 11, color: C.muted, fontFamily: mono }}>conf —</span>;
  const dots = 5;
  const lit = Math.round(confidence * dots);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }} title={`confidence ${confidence.toFixed(2)}`}>
      {Array.from({ length: dots }).map((_, i) => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: 3, background: i < lit ? C.mint : C.line2 }} />
      ))}
    </span>
  );
}
