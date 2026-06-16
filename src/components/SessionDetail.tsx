// Peak — full-page LOGGED SESSION detail. Tapping a session in the feed expands
// it here: rich per-set breakdown, session totals, the muscle emphasis it trained,
// and an "⋯" menu to edit or remove it. Individual exercises / cardio efforts still
// tap through to their own effort-detail overlay. Numbers come from the pure
// builder (buildSessionSummary) — only real logged content, nothing fabricated.

import { useMemo } from "react";
import { usePeak } from "../store";
import { C, mono, WORKOUT_THEME, radius } from "../theme";
import { CircleButton, SectionHead, StatTile, PerArmBadge, FullScreenOverlay } from "./ui";
import { EllipsisMenu } from "./SessionMenu";
import { buildSessionSummary, type SessionExerciseRow, type SessionCardioRow } from "../engine/sessionDetail";
import { fmtClock, fmtDistanceKm, kgToDisplay, kmToDisplay, weightUnit, paceLabel, distanceUnit } from "../units";
import { Z_INDEX } from "../constants/ui";

export function SessionDetail() {
  const s = usePeak();
  const id = s.sessionDetailId;
  const sys = s.data.unitSystem;
  const view = useMemo(() => (id ? buildSessionSummary(s.data, id) : null), [id, s.data]);
  if (!id) return null;

  const close = () => s.set({ sessionDetailId: null });
  const theme = WORKOUT_THEME[view?.type ?? "Gym"];
  const color = theme.color;

  return (
    <FullScreenOverlay z={Z_INDEX.sessionDetail}>
      {/* ── header ── */}
      <div style={{ flexShrink: 0, padding: "50px 18px 12px", background: `linear-gradient(180deg, ${C.screen} 78%, rgba(10,11,13,0))` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CircleButton onClick={close} ariaLabel="Back">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke={C.ink3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </CircleButton>
          <div style={{ textAlign: "center", flex: 1, minWidth: 0, padding: "0 4px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, letterSpacing: "-0.3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {view ? view.title : "Session"}
            </div>
            {view && (
              <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "1px", color: C.muted, textTransform: "uppercase", marginTop: 1 }}>
                {view.type} · {view.dateLabel}
              </div>
            )}
          </div>
          {view ? (
            <EllipsisMenu
              round
              size={38}
              ariaLabel="Session actions"
              actions={[
                { label: "Edit session", onClick: () => s.set({ sessionEditId: id }) },
                { label: "Remove session", danger: true, confirmLabel: "Tap to confirm remove", onClick: () => s.removeSession(id) },
              ]}
            />
          ) : (
            <span style={{ width: 38, height: 38, flexShrink: 0 }} />
          )}
        </div>
      </div>

      {/* ── body ── */}
      {view ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 18px 30px" }}>
          {/* meta line */}
          <div style={{ fontFamily: mono, fontSize: 12, color: C.muted, padding: "0 2px 12px" }}>
            {view.dateLabel} · {view.timeLabel}{view.durationMin ? ` · ${view.durationMin} min` : ""}
          </div>

          {/* TOTALS */}
          {view.exercises.length > 0 && (
            <div style={{ display: "flex", gap: 10 }}>
              <StatTile variant="totals" label={`Volume · ${weightUnit(sys)}`} value={kgToDisplay(view.totalVolumeKg, sys, 0).toLocaleString()} accent={color} />
              <StatTile variant="totals" label="Sets" value={String(view.totalSets)} />
              <StatTile variant="totals" label="Reps" value={String(view.totalReps)} />
            </div>
          )}
          {view.cardio.length > 0 && (
            <div style={{ display: "flex", gap: 10, marginTop: view.exercises.length > 0 ? 10 : 0 }}>
              <StatTile variant="totals" label={`Distance · ${distanceUnit(sys)}`} value={view.totalDistanceKm > 0 ? String(kmToDisplay(view.totalDistanceKm, sys, 2)) : "—"} accent={color} />
              <StatTile variant="totals" label="Time" value={fmtClock(view.totalCardioSec)} />
              <StatTile variant="totals" label="Avg pace" value={view.avgPaceSecPerKm != null && view.totalDistanceKm > 0 ? paceLabel(view.totalDistanceKm, view.totalCardioSec, sys) : "—"} />
            </div>
          )}

          {/* EXERCISES */}
          {view.exercises.length > 0 && (
            <>
              <SectionHead title="Exercises" right={`${view.exercises.length}`} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {view.exercises.map((ex) => (
                  <ExerciseBlock key={ex.entryId} ex={ex} sys={sys} onOpen={() => s.set({ exDetail: { kind: "strength", exerciseId: ex.exerciseId } })} />
                ))}
              </div>
            </>
          )}

          {/* CARDIO */}
          {view.cardio.length > 0 && (
            <>
              <SectionHead title="Cardio" right={`${view.cardio.length}`} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {view.cardio.map((c) => (
                  <CardioBlock key={c.cardioId} c={c} sys={sys} onOpen={() => s.set({ exDetail: { kind: "cardio", sessionId: id, cardioId: c.cardioId } })} />
                ))}
              </div>
            </>
          )}

          {/* MUSCLES WORKED */}
          {view.muscles.length > 0 && (
            <>
              <SectionHead title="Muscles worked" right="emphasis" />
              <div style={{ background: C.card, border: `1px solid ${C.line3}`, borderRadius: radius.xl, padding: "13px 15px" }}>
                {view.muscles.slice(0, 8).map((m) => {
                  const pct = Math.round(m.share * 100);
                  return (
                    <div key={m.group} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.ink2 }}>{m.label}</span>
                        <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: C.ink3 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 7, borderRadius: radius.sm, background: C.inner, overflow: "hidden" }}>
                        <div style={{ width: `${Math.max(2, m.share * 100)}%`, height: "100%", background: color, opacity: 0.78 }} />
                      </div>
                    </div>
                  );
                })}
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
                  Estimated emphasis across this session's work — the same attribution Peak uses to infer your strength.
                </div>
              </div>
            </>
          )}

          {/* NOTES */}
          {view.notes && (
            <>
              <SectionHead title="Notes" />
              <div style={{ background: C.card, border: `1px solid ${C.line3}`, borderRadius: radius.xl, padding: "13px 15px", fontSize: 13, color: C.sub, lineHeight: 1.55 }}>
                {view.notes}
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ fontSize: 14, color: C.sub, textAlign: "center", lineHeight: 1.5 }}>This session is no longer available.</div>
        </div>
      )}
    </FullScreenOverlay>
  );
}

// ── small pieces ─────────────────────────────────────────────────────────────
function ExerciseBlock({ ex, sys, onOpen }: { ex: SessionExerciseRow; sys: "metric" | "imperial"; onOpen: () => void }) {
  const wUnit = weightUnit(sys);
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line2}`, borderRadius: radius.xl, padding: "13px 15px" }}>
      <button
        onClick={onOpen}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", marginBottom: 9 }}
      >
        <span style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>{ex.name}</span>
        {ex.perArm && <PerArmBadge />}
        <span style={{ marginLeft: "auto", color: C.muted, fontSize: 16, fontWeight: 700, lineHeight: 1 }}>›</span>
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {ex.sets.map((set, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: mono, fontSize: 12 }}>
            <span style={{ color: C.muted, width: 18 }}>{i + 1}</span>
            <span style={{ color: C.ink }}>
              {set.weightKg != null && set.weightKg > 0 ? `${kgToDisplay(set.weightKg, sys, 1)}${wUnit}${ex.perArm ? "/arm" : ""} × ${set.reps}` : `${set.reps} reps`}
            </span>
            {set.rpe != null && <span style={{ color: C.orange }}>@{set.rpe}</span>}
            {set.est1RM != null && <span style={{ color: C.muted, marginLeft: "auto" }}>~{kgToDisplay(set.est1RM, sys, 0)}{wUnit} 1RM</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CardioBlock({ c, sys, onOpen }: { c: SessionCardioRow; sys: "metric" | "imperial"; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, fontFamily: mono, fontSize: 13, color: C.ink, flexWrap: "wrap", background: C.card, border: `1px solid ${C.line2}`, borderRadius: 14, padding: "12px 14px", textAlign: "left", cursor: "pointer" }}
    >
      {c.distanceKm != null && c.distanceKm > 0 && <span>{fmtDistanceKm(c.distanceKm, sys)}</span>}
      {c.distanceKm != null && c.distanceKm > 0 && <span style={{ color: C.muted }}>·</span>}
      <span>{fmtClock(c.durSec)}</span>
      {c.distanceKm != null && c.distanceKm > 0 && (
        <><span style={{ color: C.muted }}>·</span><span style={{ color: C.muted }}>{paceLabel(c.distanceKm, c.durSec, sys)}</span></>
      )}
      {c.avgHrBpm != null && <><span style={{ color: C.muted }}>·</span><span style={{ color: C.red }}>{c.avgHrBpm} bpm</span></>}
      <span style={{ marginLeft: "auto", color: C.muted, fontSize: 16, fontWeight: 700, lineHeight: 1 }}>›</span>
    </button>
  );
}
