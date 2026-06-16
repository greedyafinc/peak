// Peak — the live Gym session (§6.4). A full-screen, in-progress workout tracker:
// a running clock, live volume + sets, per-set check-off with a rest timer, smart
// exercise swaps, and a minimize-to-bar so the session keeps running in the
// background. "Finish" commits the completed sets as a real Session via the store.

import { useEffect, useMemo, useState } from "react";
import { usePeak, type LiveExercise, type LiveSet } from "../store";
import { C, mono } from "../theme";
import { inputStyle, UnitToggle } from "./ui";
import { ExercisePickerModal } from "./ExercisePickerModal";
import { EXERCISE_BY_ID } from "../data/exercises";
import { categoryOf, isPerArm, perArmFactor } from "../data/exerciseCatalog";
import { fmtClock, kgToDisplay, weightUnit } from "../units";
import type { Session, UnitSystem } from "../types";

const REST_DEFAULT_SEC = 90;

// ── 1-second ticker — only runs while `active`, so an off-screen view's interval
//    isn't spinning (the elapsed/rest displays only matter while visible). ───────
function useNow(active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

const numOf = (s: string): number => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};
const repsValidOf = (st: LiveSet): boolean => Math.floor(numOf(st.reps)) > 0;

// Per-exercise "last time" from session history (newest-first), for ghost hints.
type Prev = { day: string; sets: { wKg: number | null; reps: number }[] };
function lastPerformance(exerciseId: string, sessions: Session[]): Prev | null {
  for (const sess of sessions) {
    const entry = sess.entries.find((e) => e.exerciseId === exerciseId);
    if (entry && entry.sets.length > 0) {
      return { day: sess.localDay, sets: entry.sets.map((st) => ({ wKg: st.weight?.value ?? null, reps: st.reps })) };
    }
  }
  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
//  MINIMIZED BAR — shows whenever a session is live but the screen is collapsed.
// ──────────────────────────────────────────────────────────────────────────────
export function MiniSessionBar() {
  const s = usePeak();
  const now = useNow(!!s.activeSession && !s.activeOpen);
  if (!s.activeSession || s.activeOpen) return null;
  const elapsed = Math.max(0, Math.floor((now - new Date(s.activeSession.startedAt).getTime()) / 1000));
  const doneSets = s.activeSession.exercises.reduce((n, ex) => n + ex.sets.filter((st) => st.done).length, 0);

  return (
    <button
      onClick={() => s.set({ activeOpen: true })}
      style={{
        position: "absolute", left: 10, right: 10, bottom: "calc(env(safe-area-inset-bottom) + 72px)",
        zIndex: 48, display: "flex", alignItems: "center", gap: 11, cursor: "pointer",
        padding: "11px 14px", borderRadius: 16, border: `1px solid ${C.accent}55`,
        background: "rgba(20,24,16,0.94)", backdropFilter: "blur(14px)",
        boxShadow: `0 8px 24px -10px ${C.accent}66`,
      }}
    >
      <span style={{ width: 9, height: 9, borderRadius: 5, background: C.accent, animation: "pulseDot 1.6s ease-in-out infinite", flexShrink: 0 }} />
      <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {s.activeSession.title || "Workout in progress"}
        </div>
        <div style={{ fontSize: 10.5, color: C.muted, fontFamily: mono }}>{doneSets} set{doneSets === 1 ? "" : "s"} done</div>
      </div>
      <span style={{ fontFamily: mono, fontSize: 17, fontWeight: 700, color: C.accent }}>{fmtClock(elapsed)}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.5px", flexShrink: 0 }}>Resume</span>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
//  ACTIVE SESSION — the full-screen live workout.
// ──────────────────────────────────────────────────────────────────────────────
export function ActiveSession() {
  const s = usePeak();
  const sys = s.data.unitSystem;
  const a = s.activeSession;
  const now = useNow(!!a && s.activeOpen);

  const [picker, setPicker] = useState<{ mode: "add" } | { mode: "swap"; liExId: string; exerciseId: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [routineName, setRoutineName] = useState("");
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  // This component stays mounted across sessions — wipe transient UI whenever the
  // session identity changes so nothing (stale menu, save dialog) bleeds over.
  const startedAt = a?.startedAt;
  useEffect(() => {
    setPicker(null); setMenuOpen(false); setConfirmDiscard(false);
    setSaveOpen(false); setRoutineName(""); setSavedFlash(null);
  }, [startedAt]);

  // Rest timer lives on the persisted draft, so it survives minimize and is tied
  // to the session. Buzz once + auto-dismiss a few seconds after it completes.
  const restEndsAt = a?.restEndsAt ?? null;
  const restRemaining = restEndsAt != null ? Math.max(0, Math.round((restEndsAt - now) / 1000)) : 0;
  const restOver = restEndsAt != null && restRemaining <= 0;
  useEffect(() => {
    if (!restOver) return;
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(180);
    const id = setTimeout(() => s.setRest(null), 5000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restOver]);

  if (!a || !s.activeOpen) return null;

  const elapsed = Math.max(0, Math.floor((now - new Date(a.startedAt).getTime()) / 1000));

  // Live stats from DONE sets (committed work).
  const stats = a.exercises.reduce(
    (acc, ex) => {
      // Per-arm dumbbell/kettlebell work moves both implements — count the total tonnage.
      const exDef = EXERCISE_BY_ID[ex.exerciseId];
      const armMult = exDef ? perArmFactor(exDef) : 1;
      for (const st of ex.sets) {
        acc.total += 1;
        if (st.done) {
          acc.done += 1;
          acc.volume += numOf(st.weight) * armMult * Math.floor(numOf(st.reps));
        }
      }
      return acc;
    },
    { done: 0, total: 0, volume: 0 },
  );
  const canFinish = a.exercises.some((ex) => ex.sets.some((st) => st.done && repsValidOf(st)));

  const onToggleDone = (liExId: string, st: LiveSet) => {
    if (!st.done && !repsValidOf(st)) return;   // can't complete an empty set
    const becomingDone = !st.done;
    s.toggleLiveSetDone(liExId, st.id);
    if (becomingDone) s.setRest(Date.now() + REST_DEFAULT_SEC * 1000);
  };

  const flashThenClear = (msg: string) => {
    setSavedFlash(msg);
    setTimeout(() => setSavedFlash(null), 2000);
  };

  const doSaveRoutine = () => {
    s.saveAsRoutine(routineName);
    setSaveOpen(false);
    setMenuOpen(false);
    setRoutineName("");
    flashThenClear("Routine saved — find it on the Start screen.");
  };

  // A session started from one of your routines can save its in-session changes —
  // added / swapped / removed exercises and set counts — straight back to that
  // routine (built-ins aren't user routines, so they only offer "Save as new").
  const sourceRoutine = a.routineId ? s.data.routines.find((r) => r.id === a.routineId) : undefined;
  const doUpdateRoutine = () => {
    if (!sourceRoutine || a.exercises.length === 0) return;
    s.upsertRoutine({
      id: sourceRoutine.id,
      name: sourceRoutine.name,
      focus: sourceRoutine.focus,
      exercises: a.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        sets: Math.max(1, ex.sets.length),
        repLow: ex.sets[0]?.targetRepLow ?? undefined,
        repHigh: ex.sets[0]?.targetReps ?? undefined,
      })),
    });
    setMenuOpen(false);
    flashThenClear(`"${sourceRoutine.name}" updated with your changes.`);
  };

  const existingIds = a.exercises.map((e) => e.exerciseId);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 80, background: C.screen, display: "flex", flexDirection: "column", animation: "sheetUp .28s cubic-bezier(.2,.8,.2,1)" }}>
      {/* ── Header: minimize · title · menu, then the live stat strip ── */}
      <div style={{ flexShrink: 0, padding: "calc(env(safe-area-inset-top) + 12px) 16px 12px", borderBottom: `1px solid ${C.line2}`, background: C.screen, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => s.set({ activeOpen: false })} aria-label="Minimize"
            style={{ background: C.inner, border: `1px solid ${C.line2}`, borderRadius: 10, color: C.ink2, cursor: "pointer", width: 34, height: 34, fontSize: 18, lineHeight: 1, flexShrink: 0 }}>⌄</button>
          <input
            value={a.title}
            onChange={(e) => s.setActiveTitle(e.target.value)}
            placeholder="Workout"
            aria-label="Workout title"
            style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: C.ink, fontSize: 19, fontWeight: 700, letterSpacing: "-0.4px", padding: "4px 2px" }}
          />
          <button onClick={() => { setMenuOpen((v) => !v); setConfirmDiscard(false); }} aria-label="Workout menu"
            style={{ background: C.inner, border: `1px solid ${C.line2}`, borderRadius: 10, color: C.ink2, cursor: "pointer", width: 34, height: 34, fontSize: 18, lineHeight: 1, flexShrink: 0 }}>⋯</button>
        </div>

        {/* stat strip */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
          <Stat value={fmtClock(elapsed)} label="Elapsed" color={C.accent} wide />
          <Stat value={`${Math.round(stats.volume).toLocaleString()}`} label={`Volume · ${weightUnit(sys)}`} />
          <Stat value={`${stats.done}/${stats.total}`} label="Sets done" />
        </div>

        {/* overflow menu */}
        {menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 1 }} />
            <div style={{ position: "absolute", right: 16, top: "calc(env(safe-area-inset-top) + 52px)", zIndex: 2, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 6, minWidth: 190, boxShadow: "0 16px 40px -12px rgba(0,0,0,0.7)" }}>
              {sourceRoutine && (
                <MenuItem label={`Update "${sourceRoutine.name}"`} disabled={a.exercises.length === 0} onClick={doUpdateRoutine} />
              )}
              <MenuItem label={sourceRoutine ? "Save as new routine" : "Save as routine"} disabled={a.exercises.length === 0} onClick={() => { setRoutineName(a.title); setSaveOpen(true); setMenuOpen(false); }} />
              {confirmDiscard ? (
                <MenuItem label="Tap again to discard" danger onClick={() => { setMenuOpen(false); s.discardSession(); }} />
              ) : (
                <MenuItem label="Discard workout" danger onClick={() => setConfirmDiscard(true)} />
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Body: exercise cards ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 20px" }}>
        {savedFlash && (
          <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 12, background: `${C.mint}1a`, border: `1px solid ${C.mint}44`, color: C.mint, fontSize: 12.5, fontWeight: 600, textAlign: "center" }}>
            {savedFlash}
          </div>
        )}

        {a.exercises.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", color: C.sub }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Empty workout</div>
            <div style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 18 }}>Add your first exercise to start tracking sets, volume and time.</div>
            <button onClick={() => setPicker({ mode: "add" })}
              style={{ fontSize: 14, fontWeight: 700, padding: "11px 20px", borderRadius: 12, border: "none", cursor: "pointer", background: C.accent, color: "#0a0b0d" }}>
              ＋ Add exercise
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {a.exercises.map((ex) => (
              <ExerciseCard
                key={ex.id}
                liEx={ex}
                sys={sys}
                sessions={s.data.sessions}
                onSwap={() => setPicker({ mode: "swap", liExId: ex.id, exerciseId: ex.exerciseId })}
                onRemove={() => s.removeLiveExercise(ex.id)}
                onAddSet={() => s.addLiveSet(ex.id)}
                onRemoveSet={(setId) => s.removeLiveSet(ex.id, setId)}
                onSetField={(setId, field, v) => s.setLiveSetField(ex.id, setId, field, v)}
                onToggleDone={(st) => onToggleDone(ex.id, st)}
              />
            ))}
            <button onClick={() => setPicker({ mode: "add" })}
              style={{ fontSize: 14, fontWeight: 700, padding: "13px", borderRadius: 14, cursor: "pointer", border: `1px dashed ${C.line2}`, background: "transparent", color: C.accent }}>
              ＋ Add exercise
            </button>
          </div>
        )}
      </div>

      {/* ── Rest timer (floats above the finish bar; stays for a completion cue) ── */}
      {restEndsAt != null && (
        restOver ? (
          <div style={{ flexShrink: 0, margin: "0 14px 8px", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 14, background: `${C.accent}1a`, border: `1px solid ${C.accent}55` }}>
            <span style={{ fontSize: 10.5, color: C.accent, textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 700 }}>Rest over</span>
            <span style={{ fontFamily: mono, fontSize: 20, fontWeight: 700, color: C.ink }}>0:00</span>
            <span style={{ fontSize: 11.5, color: C.sub }}>— next set</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <RestBtn label="+30" onClick={() => s.setRest(Date.now() + 30000)} />
              <RestBtn label="Dismiss" onClick={() => s.setRest(null)} fill={C.accent} />
            </div>
          </div>
        ) : (
          <div style={{ flexShrink: 0, margin: "0 14px 8px", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 14, background: `${C.blue}1a`, border: `1px solid ${C.blue}44` }}>
            <span style={{ fontSize: 10.5, color: C.blue, textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 700 }}>Rest</span>
            <span style={{ fontFamily: mono, fontSize: 20, fontWeight: 700, color: C.ink }}>{fmtClock(restRemaining)}</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <RestBtn label="−15" onClick={() => s.setRest(Math.max(Date.now(), restEndsAt - 15000))} />
              <RestBtn label="+15" onClick={() => s.setRest(restEndsAt + 15000)} />
              <RestBtn label="Skip" onClick={() => s.setRest(null)} fill={C.blue} />
            </div>
          </div>
        )
      )}

      {/* ── Finish bar ── */}
      <div style={{ flexShrink: 0, padding: "10px 16px max(16px, env(safe-area-inset-bottom))", borderTop: `1px solid ${C.line2}`, background: C.screen }}>
        <button
          onClick={() => s.finishSession()}
          disabled={!canFinish}
          style={{
            width: "100%", fontSize: 15.5, fontWeight: 700, padding: 15, borderRadius: 15, border: "none",
            cursor: canFinish ? "pointer" : "default",
            background: canFinish ? C.accent : C.lockCard,
            color: canFinish ? "#0a0b0d" : C.muted,
            transition: "background .15s",
          }}
        >
          {canFinish ? "Finish workout" : "Complete a set to finish"}
        </button>
      </div>

      {/* ── Save-as-routine modal ── */}
      {saveOpen && (
        <div onClick={() => setSaveOpen(false)} style={{ position: "absolute", inset: 0, zIndex: 95, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, animation: "fadeIn .2s ease" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 320, background: C.card, border: `1px solid ${C.line}`, borderRadius: 20, padding: 20 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Save as routine</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.45 }}>Reuse this exercise lineup as a template next time.</div>
            <input autoFocus value={routineName} placeholder="Routine name" onChange={(e) => setRoutineName(e.target.value)} style={{ ...inputStyle, marginBottom: 14 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setSaveOpen(false)} style={{ flex: 1, fontSize: 14, fontWeight: 700, padding: 12, borderRadius: 12, border: `1px solid ${C.line2}`, background: "transparent", color: C.sub, cursor: "pointer" }}>Cancel</button>
              <button onClick={doSaveRoutine} style={{ flex: 1, fontSize: 14, fontWeight: 700, padding: 12, borderRadius: 12, border: "none", background: C.accent, color: "#0a0b0d", cursor: "pointer" }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Exercise picker (add + swap) ── */}
      <ExercisePickerModal
        open={picker != null}
        mode={picker?.mode ?? "add"}
        swapForExerciseId={picker?.mode === "swap" ? picker.exerciseId : undefined}
        existingExerciseIds={existingIds}
        onClose={() => setPicker(null)}
        onAdd={(ids) => s.addLiveExercises(ids)}
        onSwap={(id) => { if (picker?.mode === "swap") s.replaceLiveExercise(picker.liExId, id); }}
      />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────
function Stat({ value, label, color, wide }: { value: string; label: string; color?: string; wide?: boolean }) {
  return (
    <div style={{ flex: wide ? 1.25 : 1, background: C.inner, border: `1px solid ${C.line2}`, borderRadius: 13, padding: "9px 11px" }}>
      <div style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: color ?? C.ink, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function MenuItem({ label, onClick, danger, disabled }: { label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: "block", width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 9, border: "none",
        background: "transparent", cursor: disabled ? "default" : "pointer", fontSize: 13.5, fontWeight: 600,
        color: disabled ? C.muted2 : danger ? C.red : C.ink2,
      }}
    >
      {label}
    </button>
  );
}

function RestBtn({ label, onClick, fill }: { label: string; onClick: () => void; fill?: string }) {
  return (
    <button onClick={onClick}
      style={{ fontSize: 12, fontFamily: mono, fontWeight: 700, padding: "5px 10px", borderRadius: 9, cursor: "pointer", border: `1px solid ${fill ?? C.line2}`, background: fill ?? C.inner, color: fill ? "#0a0b0d" : C.sub }}>
      {label}
    </button>
  );
}

function ExerciseCard({
  liEx, sys, sessions, onSwap, onRemove, onAddSet, onRemoveSet, onSetField, onToggleDone,
}: {
  liEx: LiveExercise;
  sys: UnitSystem;
  sessions: Session[];
  onSwap: () => void;
  onRemove: () => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onSetField: (setId: string, field: "weight" | "reps" | "rpe", v: string) => void;
  onToggleDone: (st: LiveSet) => void;
}) {
  const ex = EXERCISE_BY_ID[liEx.exerciseId];
  const prev = useMemo(() => lastPerformance(liEx.exerciseId, sessions), [liEx.exerciseId, sessions]);
  const wUnit = weightUnit(sys);
  const perArm = ex ? isPerArm(ex) : false;

  const prevSummary = prev
    ? prev.sets.map((p) => (p.wKg != null && p.wKg > 0 ? `${kgToDisplay(p.wKg, sys, 0)}×${p.reps}` : `${p.reps}`)).join(", ")
    : null;

  // Ghost hint per row: prior set at that index (fallback to last prior set), else target.
  const hintFor = (idx: number, st: LiveSet): { w: string; reps: string } => {
    const p = prev?.sets[idx] ?? prev?.sets[prev.sets.length - 1];
    const w = p?.wKg != null && p.wKg > 0 ? String(kgToDisplay(p.wKg, sys, 0)) : "—";
    const reps = p?.reps != null ? String(p.reps) : st.targetReps != null ? String(st.targetReps) : "0";
    return { w, reps };
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line2}`, borderRadius: 16, padding: 14 }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{ex?.name ?? liEx.exerciseId}</span>
            {perArm && (
              <span style={{ fontSize: 9, fontWeight: 700, color: C.blue, background: `${C.blue}1f`, padding: "2px 6px", borderRadius: 5, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                Per arm
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
            {prevSummary ? <>Last · {prevSummary} {wUnit}{perArm ? "/arm" : ""}</> : ex ? categoryOf(ex) : ""}
          </div>
        </div>
        <button onClick={onSwap} aria-label="Swap exercise"
          style={{ fontSize: 11.5, fontWeight: 700, padding: "6px 10px", borderRadius: 9, cursor: "pointer", border: `1px solid ${C.line2}`, background: C.inner, color: C.blue }}>
          Swap
        </button>
        <button onClick={onRemove} aria-label="Remove exercise"
          style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 19, lineHeight: 1, padding: "2px 2px" }}>×</button>
      </div>

      {/* column header — the weight unit is a live kg·lb toggle (lbs always available) */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, fontSize: 9.5, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
        <span style={{ width: 26, textAlign: "center" }}>Set</span>
        <span style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
          <UnitToggle kind="weight" />
          {perArm && <span style={{ color: C.blue }}>/ arm</span>}
        </span>
        <span style={{ flex: 1, textAlign: "center" }}>Reps</span>
        <span style={{ width: 36 }} />
      </div>

      {/* set rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {liEx.sets.map((st, i) => {
          const hint = hintFor(i, st);
          const repsOk = repsValidOf(st);
          return (
            <div key={st.id} style={{ display: "flex", gap: 8, alignItems: "center", background: st.done ? `${C.mint}14` : "transparent", borderRadius: 10, padding: "2px 2px", transition: "background .15s" }}>
              <span style={{ width: 26, textAlign: "center", fontFamily: mono, fontSize: 13, fontWeight: 700, color: st.done ? C.mint : C.sub }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <input type="number" inputMode="decimal" step="0.5" value={st.weight} placeholder={hint.w}
                  onChange={(e) => onSetField(st.id, "weight", e.target.value)}
                  style={{ ...inputStyle, padding: "9px 6px", textAlign: "center", fontFamily: mono, fontSize: 15 }} />
              </div>
              <div style={{ flex: 1 }}>
                <input type="number" inputMode="numeric" value={st.reps} placeholder={hint.reps}
                  onChange={(e) => onSetField(st.id, "reps", e.target.value)}
                  style={{ ...inputStyle, padding: "9px 6px", textAlign: "center", fontFamily: mono, fontSize: 15 }} />
              </div>
              <button
                onClick={() => onToggleDone(st)}
                aria-label={st.done ? "Mark set not done" : "Mark set done"}
                aria-pressed={st.done}
                title={!repsOk && !st.done ? "Enter reps to complete this set" : undefined}
                style={{
                  width: 36, height: 36, borderRadius: 10, cursor: repsOk || st.done ? "pointer" : "default", flexShrink: 0,
                  border: `1.5px solid ${st.done ? C.mint : repsOk ? C.muted : C.line2}`,
                  background: st.done ? C.mint : "transparent",
                  color: st.done ? "#0a0b0d" : C.muted2,
                  fontSize: 16, fontWeight: 900, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: !repsOk && !st.done ? 0.5 : 1,
                }}
              >
                ✓
              </button>
              <button onClick={() => onRemoveSet(st.id)} aria-label="Remove set"
                style={{ width: 18, background: "none", border: "none", color: C.muted2, cursor: "pointer", fontSize: 15, flexShrink: 0 }}>−</button>
            </div>
          );
        })}
      </div>

      <button onClick={onAddSet}
        style={{ marginTop: 8, width: "100%", fontSize: 12.5, fontWeight: 700, padding: "8px", borderRadius: 10, cursor: "pointer", border: `1px solid ${C.line2}`, background: C.inner, color: C.ink3 }}>
        ＋ Add set
      </button>
    </div>
  );
}
