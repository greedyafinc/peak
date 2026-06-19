// Peak — full-page MUSCLE RECOVERY / readiness view. Opened from the Body screen.
// Shows, top to bottom: an overall readiness hero, a fatigue body map (front/back,
// tappable), the selected muscle's recovery detail, and a recovery clock ranking
// every group by how much fatigue it's still clearing. All of it is derived from the
// sets you've logged (engine/recovery.ts) — a muscle reads fresh because it is.

import { useMemo, useState } from "react";
import { usePeak } from "../store";
import { C, mono, radius, hexA } from "../theme";
import { FullScreenOverlay, CircleButton } from "./ui";
import { BodyMap, type BodyMuscle } from "../viz/BodyMap";
import { ProgressRing } from "../viz/ProgressRing";
import { computeRecovery, recoveryColor, type MuscleRecovery } from "../engine";
import { ALL_MUSCLES } from "../data/capabilityTree";
import { MUSCLE_TO_SVG } from "../data/muscleMap";
import { kgToDisplay, weightUnit } from "../units";
import { nowISO } from "../utils/date";
import { Z_INDEX } from "../constants/ui";
import type { MuscleGroup } from "../types";

// Groups that draw onto a given SVG region (only "delts" is shared: front + side).
function groupsForSvgKey(key: string): MuscleGroup[] {
  return (ALL_MUSCLES as MuscleGroup[]).filter((g) => MUSCLE_TO_SVG[g].svgKeys.includes(key));
}

function noteFor(fatigue: number): string {
  if (fatigue >= 70) return "Heavily fatigued — train through light mobility only and give it another day before loading it again.";
  if (fatigue >= 46) return "Still recovering. Light technique work is fine; save your heavy sets for when it reads green.";
  if (fatigue >= 28) return "Nearly fresh — good to train at moderate load today.";
  return "Fully recovered and ready for a hard session.";
}

export function Recovery() {
  const s = usePeak();
  const sys = s.data.unitSystem;
  const snap = useMemo(() => computeRecovery(s.data, nowISO()), [s.data]);

  // Open on the most-fatigued group (and the side it's drawn on) so the page leads
  // with something live and that muscle is highlighted on the map right away.
  const [view, setView] = useState<"front" | "back">(() => snap.muscles[0]?.view ?? "front");
  const [sel, setSel] = useState<MuscleGroup>(() => snap.muscles[0]?.group ?? "chest");

  // ── body-map fill: each SVG region takes the max fatigue of the groups on it ──
  const bodyMuscles: BodyMuscle[] = useMemo(() => {
    const bySvg: Record<string, number> = {};
    for (const g of ALL_MUSCLES as MuscleGroup[]) {
      const f = snap.byGroup[g]?.fatigue ?? 0;
      for (const key of MUSCLE_TO_SVG[g].svgKeys) bySvg[key] = Math.max(bySvg[key] ?? 0, f);
    }
    return Object.entries(bySvg).map(([id, fatigue]) => ({ id, score: fatigue, untested: false }));
  }, [snap]);

  if (!s.recoveryOpen) return null;
  const close = () => s.set({ recoveryOpen: false });

  const selData: MuscleRecovery = snap.byGroup[sel] ?? snap.muscles[0];
  const selSvgKey = MUSCLE_TO_SVG[sel].svgKeys[0];

  // Tapping a region selects the most-fatigued group drawn on it.
  const onMapSelect = (key: string) => {
    const cands = groupsForSvgKey(key);
    const best = cands.sort((a, b) => (snap.byGroup[b]?.fatigue ?? 0) - (snap.byGroup[a]?.fatigue ?? 0))[0];
    if (best) setSel(best);
  };
  // Selecting from the clock jumps to that muscle and flips to the side it's drawn on.
  const onQueueSelect = (m: MuscleRecovery) => { setSel(m.group); setView(m.view); };

  const overall = snap.overall;
  const oColor = recoveryColor(100 - overall);
  const status = !snap.anyRecentTraining ? "Recovered" : overall >= 75 ? "Primed" : overall >= 55 ? "Train light" : "Recover";
  const heroSub = !snap.anyRecentTraining
    ? "No recent training logged — nothing to recover from yet. Log a session and Peak will track each muscle's recovery here."
    : overall >= 75
      ? "Most systems are recharged. Only your most-worked muscles are still on the clock — everything else is a green light."
      : overall >= 55
        ? "You can train, but keep it moderate — several muscle groups are still clearing fatigue from your last sessions."
        : "Fatigue is stacked across most groups. A rest or active-recovery day will pay off more than another hard session.";

  return (
    <FullScreenOverlay z={Z_INDEX.recovery}>
      {/* ── header ── */}
      <div style={{ flexShrink: 0, padding: "50px 18px 12px", background: `linear-gradient(180deg, ${C.screen} 78%, rgba(10,11,13,0))` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CircleButton onClick={close} ariaLabel="Back">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke={C.ink3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </CircleButton>
          <div style={{ textAlign: "center", flex: 1, minWidth: 0, padding: "0 4px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, letterSpacing: "-0.3px" }}>Recovery</div>
            <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "1px", color: C.muted, textTransform: "uppercase", marginTop: 1 }}>Readiness by muscle</div>
          </div>
          <span style={{ width: 38, height: 38, flexShrink: 0 }} />
        </div>
      </div>

      {/* ── body ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 16px 34px" }}>

        {/* READINESS HERO */}
        <div style={{ background: "linear-gradient(157deg,#171a16,#15171d)", border: `1px solid ${hexA(oColor, 0.24)}`, borderRadius: 22, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ position: "relative", width: 118, height: 118, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ProgressRing pct={overall} color={oColor} size={118} strokeWidth={9} />
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontFamily: mono, fontSize: 34, fontWeight: 700, color: oColor, letterSpacing: "-1px", lineHeight: 1 }}>{overall}%</div>
                <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: "1.5px", color: C.muted, textTransform: "uppercase", marginTop: 2 }}>recovered</div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: hexA(oColor, 0.13), borderRadius: 20, padding: "4px 10px" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: oColor }} />
                <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: oColor }}>{status}</span>
              </div>
              <div style={{ fontSize: 14, color: C.ink3, marginTop: 9, lineHeight: 1.5 }}>{heroSub}</div>
              <div style={{ display: "flex", gap: 7, marginTop: 12 }}>
                <HeroStat value={snap.freshCount} label="fresh" color={C.mint} />
                <HeroStat value={snap.recoveringCount} label="recovering" color={C.orange} />
                <HeroStat value={snap.nextReady ? snap.nextReady.readyIn.replace("in ", "") : "—"} label="next ready" color={C.ink} />
              </div>
            </div>
          </div>
        </div>

        {/* MUSCLE FATIGUE — body map */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "24px 2px 10px" }}>
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.ink, letterSpacing: "-0.3px" }}>Muscle fatigue</span>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>Tap a muscle for its recovery clock</div>
          </div>
          <div style={{ display: "flex", background: C.card, border: `1px solid ${C.line2}`, borderRadius: radius.pill, padding: 4 }}>
            <ViewBtn label="Front" active={view === "front"} onClick={() => setView("front")} />
            <ViewBtn label="Back" active={view === "back"} onClick={() => setView("back")} />
          </div>
        </div>
        <div style={{ background: C.inner, border: `1px solid ${C.line3}`, borderRadius: 18, padding: "16px 12px 13px" }}>
          <BodyMap
            muscles={bodyMuscles}
            selected={selData?.view === view ? selSvgKey : null}
            onSelect={onMapSelect}
            view={view}
            colorFor={(m) => recoveryColor(m.score)}
          />
          {/* legend */}
          <div style={{ display: "flex", alignItems: "center", gap: 9, justifyContent: "center", marginTop: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: C.muted, fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.6px" }}>Fresh</span>
            <div style={{ display: "flex", borderRadius: 6, overflow: "hidden" }}>
              {["#3dffb0", "#8fd14f", "#ffd23f", "#ff8a3d", "#ff4d3d"].map((c) => (
                <div key={c} style={{ width: 22, height: 8, background: c }} />
              ))}
            </div>
            <span style={{ fontSize: 10, color: C.muted, fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.6px" }}>Fatigued</span>
          </div>
        </div>

        {/* SELECTED MUSCLE DETAIL */}
        {selData && (
          <div style={{ marginTop: 11, background: C.card, border: `1px solid ${hexA(selData.color, 0.22)}`, borderRadius: 18, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ position: "relative", width: 66, height: 66, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ProgressRing pct={selData.recovered} color={selData.color} size={66} strokeWidth={6} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: mono, fontSize: 17, fontWeight: 700, color: selData.color, letterSpacing: "-0.5px" }}>{selData.recovered}%</span>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: C.ink, letterSpacing: "-0.3px" }}>{selData.label}</span>
                  <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.6px", textTransform: "uppercase", color: selData.soreColor, background: hexA(selData.soreColor, 0.14), padding: "4px 8px", borderRadius: 7 }}>{selData.soreness}</span>
                </div>
                <div style={{ fontSize: 12, color: C.sub, marginTop: 3 }}>
                  {selData.ready ? "Recovered · ready now" : `Recovering · ready ${selData.readyIn}`}
                </div>
                <div style={{ height: 7, borderRadius: 4, background: C.inner, overflow: "hidden", marginTop: 9 }}>
                  <div style={{ width: `${selData.recovered}%`, height: "100%", background: selData.color, borderRadius: 4, transition: "width .3s ease" }} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <DetailTile label="Last trained" value={selData.last ? selData.last.dayLabel : "—"} sub={selData.last ? selData.last.title : "Not trained yet"} />
              <DetailTile
                label="Session load"
                value={selData.last ? `${Math.round(selData.last.sets)} sets` : "—"}
                sub={selData.last && selData.last.volumeKg > 0 ? `${kgToDisplay(selData.last.volumeKg, sys, 0).toLocaleString()} ${weightUnit(sys)}` : "—"}
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 9, marginTop: 11, background: hexA(selData.color, 0.07), border: `1px solid ${hexA(selData.color, 0.22)}`, borderRadius: 13, padding: "11px 12px" }}>
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><path d="M9 2.2l1.9 4 4.4.6-3.2 3 .8 4.3L9 12.1 5.1 14.1l.8-4.3-3.2-3 4.4-.6L9 2.2z" stroke={selData.color} strokeWidth="1.4" strokeLinejoin="round" /></svg>
              <span style={{ fontSize: 12.5, color: C.ink3, lineHeight: 1.5 }}>{noteFor(selData.fatigue)}</span>
            </div>
          </div>
        )}

        {/* RECOVERY CLOCK */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "24px 2px 11px" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.ink, letterSpacing: "-0.3px" }}>Recovery clock</span>
          <span style={{ fontFamily: mono, fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "1px" }}>by muscle</span>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.line3}`, borderRadius: 18, padding: "6px 14px" }}>
          {snap.muscles.map((m, i) => {
            const readyColor = m.ready ? C.mint : m.fatigue >= 60 ? C.orange : C.ink3;
            return (
              <div
                key={m.group}
                onClick={() => onQueueSelect(m)}
                style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 2px", borderBottom: i === snap.muscles.length - 1 ? "1px solid transparent" : `1px solid ${C.line3}`, cursor: "pointer", background: m.group === sel ? hexA(C.ink, 0.03) : "transparent", borderRadius: m.group === sel ? 8 : 0 }}
              >
                <span style={{ width: 9, height: 9, borderRadius: 3, background: m.color, flexShrink: 0 }} />
                <span style={{ width: 88, flexShrink: 0, fontSize: 13, fontWeight: 700, color: C.ink, letterSpacing: "-0.2px" }}>{m.label}</span>
                <div style={{ flex: 1, height: 7, borderRadius: 4, background: C.inner, overflow: "hidden" }}>
                  <div style={{ width: `${m.recovered}%`, height: "100%", background: m.color, borderRadius: 4 }} />
                </div>
                <span style={{ width: 54, flexShrink: 0, textAlign: "right", fontFamily: mono, fontSize: 11, fontWeight: 700, color: readyColor }}>{m.readyIn}</span>
              </div>
            );
          })}
        </div>

        <div style={{ height: 6 }} />
      </div>
    </FullScreenOverlay>
  );
}

// ── small pieces ───────────────────────────────────────────────────────────────
function HeroStat({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div style={{ flex: 1, background: hexA(C.ink, 0.04), borderRadius: 11, padding: "8px 9px", textAlign: "center" }}>
      <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 3 }}>{label}</div>
    </div>
  );
}

function DetailTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ flex: 1, background: C.inner, border: `1px solid ${C.line3}`, borderRadius: 12, padding: "10px 11px", minWidth: 0 }}>
      <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px" }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      <div style={{ fontFamily: mono, fontSize: 10, color: C.sub, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>
    </div>
  );
}

function ViewBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 24, border: "none", cursor: "pointer", background: active ? C.accent : "transparent", color: active ? "#0a0b0d" : C.sub }}
    >
      {label}
    </button>
  );
}
