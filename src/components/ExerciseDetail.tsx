// Peak — EXERCISE / EFFORT DETAIL overlay (Direction B from the design handoff).
//
// A full-screen screen pushed over the app with a back arrow, opened by tapping an
// individual exercise (or cardio effort) in the session feed. Layout mirrors the
// design: a projection hero + chart, a stat row (current top set + percentile bell),
// an improving-trend strip, past efforts, and gentle coach tips. All numbers come
// from the pure builder, which reads only real on-device history (no fabrication).

import { useMemo, type ReactNode } from "react";
import { usePeak } from "../store";
import { C, mono } from "../theme";
import { pctLabel } from "./ui";
import { buildExerciseDetail, type DetailTip, type MuscleWorked } from "../engine/exerciseDetail";
import type { ExerciseCategory } from "../data/exerciseCatalog";
import { ProjectionChart, BellCurve, Sparkline } from "../viz/DetailCharts";

// Each body-part category owns an accent — bench reads chest-red, arms yellow, a run
// cardio-green — matching the design's per-category coloring of the hero.
const CATEGORY_COLOR: Record<ExerciseCategory, string> = {
  Chest: C.red,
  Back: C.blue,
  Shoulders: C.orange,
  Arms: "#ffd23f",
  Legs: C.accent,
  Core: C.mint,
  Cardio: C.mint,
};

const hexA = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export function ExerciseDetail() {
  const s = usePeak();
  const spec = s.exDetail;
  const view = useMemo(() => (spec ? buildExerciseDetail(s.data, spec) : null), [spec, s.data]);
  if (!spec) return null;

  const close = () => s.set({ exDetail: null });
  const color = view ? CATEGORY_COLOR[view.categoryKey] : C.accent;

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 78, background: C.screen, display: "flex", flexDirection: "column", animation: "scrIn .26s ease" }}>
      {/* ── header ── */}
      <div style={{ flexShrink: 0, padding: "50px 18px 12px", background: `linear-gradient(180deg, ${C.screen} 78%, rgba(10,11,13,0))` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <CircleButton onClick={close} ariaLabel="Back">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke={C.ink3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </CircleButton>
          <div style={{ textAlign: "center", flex: 1, minWidth: 0, padding: "0 10px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, letterSpacing: "-0.3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {view ? view.name : "Detail"}
            </div>
            {view && (
              <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "1px", color: C.muted, textTransform: "uppercase", marginTop: 1 }}>{view.subtitle}</div>
            )}
          </div>
          <CircleButton onClick={close} ariaLabel="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="3.4" r="1.5" fill={C.sub} />
              <circle cx="8" cy="8" r="1.5" fill={C.sub} />
              <circle cx="8" cy="12.6" r="1.5" fill={C.sub} />
            </svg>
          </CircleButton>
        </div>
      </div>

      {/* ── body ── */}
      {view ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 18px 30px" }}>
          {/* HERO · projection */}
          <div style={{ background: "linear-gradient(160deg,#181b16,#15171d)", border: `1px solid ${hexA(color, 0.22)}`, borderRadius: 22, padding: "18px 16px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "0 2px" }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M2 10l3.5-4 2.5 2.5L12 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 4h3v3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color, whiteSpace: "nowrap" }}>{view.hero.kicker}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 10, padding: "0 2px", flexWrap: "wrap" }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: C.ink, letterSpacing: "-1.4px", lineHeight: 1, fontFamily: mono, whiteSpace: "nowrap" }}>{view.hero.big}</span>
              {view.hero.delta && <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: C.accent }}>{view.hero.delta}</span>}
            </div>
            <div style={{ fontSize: 13, color: C.ink3, marginTop: 6, padding: "0 2px", lineHeight: 1.5 }}>{view.hero.sub}</div>
            {view.hero.chart && (
              <>
                <div style={{ margin: "10px -2px 0" }}>
                  <ProjectionChart
                    points={view.hero.chart}
                    color={color}
                    lowerBetter={view.lowerIsBetter}
                    nowIndex={view.hero.nowIndex}
                    nowLabel={view.hero.nowLabel}
                    targetLabel={view.hero.targetLabel}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "6px 4px 0" }}>
                  <LegendSwatch color={color} dotted={false} label="Logged" />
                  {view.hero.projecting && <LegendSwatch color={color} dotted label="Projected" />}
                </div>
              </>
            )}
          </div>

          {/* STAT ROW */}
          <div style={{ display: "flex", gap: 10, marginTop: 13 }}>
            <StatBox>
              <div style={tinyLabel}>{view.prLabel}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.ink, letterSpacing: "-0.5px", marginTop: 5, lineHeight: 1 }}>{view.prValue}</div>
              <div style={{ fontFamily: mono, fontSize: 10, color: C.sub, marginTop: 4 }}>{view.prMeta}</div>
            </StatBox>
            {view.percentile != null ? (
              <StatBox>
                <div style={tinyLabel}>Percentile</div>
                <div style={{ fontSize: 20, fontWeight: 700, color, letterSpacing: "-0.5px", marginTop: 5, lineHeight: 1, fontFamily: mono }}>{pctLabel(view.percentile)}</div>
                <div style={{ marginTop: 4 }}>
                  <BellCurve pct={view.percentile} color={color} />
                </div>
              </StatBox>
            ) : (
              <StatBox>
                <div style={tinyLabel}>Percentile</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.muted, marginTop: 6, lineHeight: 1.3 }}>Not scored yet</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 5, lineHeight: 1.4 }}>Log or benchmark more to rank this against your build.</div>
              </StatBox>
            )}
          </div>

          {/* TREND STRIP */}
          {view.trend && (
            <div style={{ marginTop: 10, background: C.inner, border: `1px solid ${C.line3}`, borderRadius: 16, padding: "13px 15px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: trendColor(view.trend.dir) }}>
                  {trendWord(view.trend.dir)}
                </div>
                <div style={{ fontSize: 13, color: C.ink3, marginTop: 5, lineHeight: 1.45 }}>
                  <strong style={{ color: C.ink }}>{view.trend.abs}</strong>
                  {view.trend.pct ? ` · ${view.trend.pct}` : ""} over your {view.trend.window}.
                </div>
              </div>
              {view.spark && (
                <div style={{ flexShrink: 0 }}>
                  <Sparkline values={view.spark} lowerBetter={view.lowerIsBetter} color={view.trend.dir === "down" ? C.muted : C.accent} />
                </div>
              )}
            </div>
          )}

          {/* MUSCLES WORKED — granular per-region breakdown */}
          {view.musclesWorked.length > 0 && (
            <>
              <SectionHead title="Muscles worked" right="by region" />
              <div style={{ background: C.card, border: `1px solid ${C.line3}`, borderRadius: 16, padding: "6px 15px 13px" }}>
                {view.musclesWorked.map((m, i) => (
                  <MuscleRow key={m.group} m={m} accent={color} first={i === 0} />
                ))}
                <div style={{ fontSize: 11, color: C.muted, marginTop: 11, lineHeight: 1.5 }}>
                  How this lift's work splits across each muscle and its heads — the same attribution Peak uses to infer your strength.
                </div>
              </div>
            </>
          )}

          {/* PAST EFFORTS */}
          {view.history.length > 0 && (
            <>
              <SectionHead title="Past efforts" right={`last ${view.history.length}`} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {view.history.map((h, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, background: C.card, border: `1px solid ${C.line3}`, borderRadius: 14, padding: "12px 14px" }}>
                    <div style={{ width: 52, flexShrink: 0, fontFamily: mono, fontSize: 12, fontWeight: 700, color: C.sub }}>{h.date}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, letterSpacing: "-0.2px" }}>{h.main}</div>
                      <div style={{ fontFamily: mono, fontSize: 11, color: C.muted, marginTop: 1 }}>{h.sub}</div>
                    </div>
                    {h.pr && (
                      <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.8px", color: C.accent, background: hexA("#c6ff3d", 0.12), padding: "4px 7px", borderRadius: 6, flexShrink: 0 }}>PR</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* COACH TIPS */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "22px 2px 11px" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z" fill={C.accent} /></svg>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.ink, letterSpacing: "-0.3px" }}>Coach tips</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {view.tips.map((t, i) => (
              <TipCard key={i} tip={t} accent={color} />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ fontSize: 14, color: C.sub, textAlign: "center", lineHeight: 1.5 }}>
            We couldn't find history for this yet. Log a set and it'll appear here.
          </div>
        </div>
      )}
    </div>
  );
}

// ── small pieces ─────────────────────────────────────────────────────────────
const tinyLabel: React.CSSProperties = { fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.7px" };

function StatBox({ children }: { children: ReactNode }) {
  return <div style={{ flex: 1, background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 13, minWidth: 0 }}>{children}</div>;
}

function CircleButton({ children, onClick, ariaLabel }: { children: ReactNode; onClick: () => void; ariaLabel: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{ width: 38, height: 38, borderRadius: "50%", border: `1px solid ${C.line2}`, background: C.card, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
    >
      {children}
    </button>
  );
}

function LegendSwatch({ color, dotted, label }: { color: string; dotted: boolean; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 16, borderTop: `2.5px ${dotted ? "dotted" : "solid"} ${color}` }} />
      <span style={{ fontSize: 10, color: C.sub }}>{label}</span>
    </div>
  );
}

function SectionHead({ title, right }: { title: string; right?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "22px 2px 11px" }}>
      <span style={{ fontSize: 16, fontWeight: 700, color: C.ink, letterSpacing: "-0.3px" }}>{title}</span>
      {right && <span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>{right}</span>}
    </div>
  );
}

function MuscleRow({ m, accent, first }: { m: MuscleWorked; accent: string; first: boolean }) {
  const pct = Math.round(m.share * 100);
  return (
    <div style={{ paddingTop: first ? 8 : 12, marginTop: first ? 0 : 12, borderTop: first ? "none" : `1px solid ${C.line3}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.ink, letterSpacing: "-0.2px" }}>{m.label}</span>
          <span style={{
            fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.6px", textTransform: "uppercase",
            color: m.primary ? accent : C.muted, background: m.primary ? hexA(accent, 0.13) : "transparent",
            border: m.primary ? "none" : `1px solid ${C.line2}`, padding: "2px 6px", borderRadius: 5,
          }}>
            {m.primary ? "Primary" : "Assist"}
          </span>
        </div>
        <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: C.ink3, flexShrink: 0 }}>{pct}%</span>
      </div>
      {/* within-group split across anatomical sub-regions */}
      <div style={{ display: "flex", height: 9, borderRadius: 5, overflow: "hidden", marginTop: 8, background: C.inner }}>
        {m.regions.length > 0
          ? m.regions.map((r, i) => (
              <div key={r.id} title={`${r.label} ${Math.round(r.share * 100)}%`}
                style={{ width: `${r.share * 100}%`, background: hexA(accent, Math.max(0.3, 0.85 - i * 0.22)), borderRight: i < m.regions.length - 1 ? `1.5px solid ${C.card}` : "none" }} />
            ))
          : <div style={{ width: "100%", background: hexA(accent, 0.66) }} />}
      </div>
      {m.regions.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 12px", marginTop: 7 }}>
          {m.regions.map((r) => (
            <span key={r.id} style={{ fontSize: 11, color: C.sub }}>
              <span style={{ color: C.ink3, fontWeight: 600 }}>{r.label}</span>
              <span style={{ fontFamily: mono, color: C.muted }}> {Math.round(r.share * 100)}%</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function trendWord(dir: "up" | "flat" | "down"): string {
  return dir === "up" ? "Improving" : dir === "down" ? "Slipping" : "Holding steady";
}
function trendColor(dir: "up" | "flat" | "down"): string {
  return dir === "up" ? C.accent : dir === "down" ? C.orange : C.sub;
}

const TIP_COLOR: Record<DetailTip["kind"], string> = { load: C.accent, assist: C.blue, rest: "#c98aff" };

function TipCard({ tip, accent }: { tip: DetailTip; accent: string }) {
  const col = tip.kind === "load" ? accent : TIP_COLOR[tip.kind];
  return (
    <div style={{ display: "flex", gap: 12, background: C.card, border: `1px solid ${C.line3}`, borderRadius: 16, padding: "14px 15px" }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: hexA(col.startsWith("#") ? col : "#c6ff3d", 0.14), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <TipIcon kind={tip.kind} color={col} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, letterSpacing: "-0.2px" }}>{tip.title}</div>
        <div style={{ fontSize: 13, color: C.sub, marginTop: 3, lineHeight: 1.5 }}>{tip.body}</div>
      </div>
    </div>
  );
}

function TipIcon({ kind, color }: { kind: DetailTip["kind"]; color: string }) {
  if (kind === "load")
    return (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
        <path d="M9 14V5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M5.5 8.5L9 5l3.5 3.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (kind === "assist")
    return (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
        <path d="M7 11l4-4" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
        <path d="M9.5 5.2l1-1a2.4 2.4 0 013.3 3.3l-1 1" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
        <path d="M8.5 12.8l-1 1a2.4 2.4 0 01-3.3-3.3l1-1" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
      <path d="M14.5 10.2A5.2 5.2 0 117.8 3.5a4.1 4.1 0 006.7 6.7z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
