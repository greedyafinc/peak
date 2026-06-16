// Peak — full-page LOGGED SESSION editor. Opened from a session's "⋯ → Edit", it
// loads a committed Session into a local draft (no global live-session state, so it
// never collides with an in-progress workout), lets you correct title, notes,
// duration, every set's load/reps/RPE, add/remove/swap exercises, and edit cardio
// efforts, then writes it back via store.updateSession (which recomputes scores).
//
// Drafts are display-unit strings (mirrors the live session + quick-log); they're
// converted to canonical metric on save. Cancel just closes — local draft is dropped.

import { useEffect, useMemo, useState } from "react";
import { usePeak, type LogEntryInput, type LogSetInput, type LogCardioInput } from "../store";
import { C, mono, WORKOUT_THEME } from "../theme";
import { inputStyle, DurationInput } from "./ui";
import { ExercisePickerModal } from "./ExercisePickerModal";
import { EXERCISE_BY_ID } from "../data/exercises";
import { isPerArm } from "../data/exerciseCatalog";
import { kgToDisplay, weightToKg, kmToDisplay, distanceToKm, weightUnit, distanceUnit } from "../units";
import type { Session, UnitSystem } from "../types";

// ── Local draft model (display-unit strings) ──────────────────────────────────
// `origKg`/`seedW` (and the cardio equivalents) carry the ORIGINAL canonical value
// plus the exact string it was seeded as, so compile() can re-emit the untouched
// canonical number instead of round-tripping it through display units (which would
// drift logged loads on any save — even a no-op title/notes edit).
type DSet = { id: string; weight: string; reps: string; rpe: string; origKg: number | null; seedW: string };
type DEx = { id: string; exerciseId: string; sets: DSet[] };
type DCardio = { id: string; distance: string; durationSec: number | null; avgHr: string; origKm: number | null; seedDist: string };
type Draft = { title: string; notes: string; durationSec: number | null; exercises: DEx[]; cardio: DCardio[] };

let _seq = 0;
const lid = (p: string): string => `${p}${(_seq += 1).toString(36)}`;
const newSet = (): DSet => ({ id: lid("set"), weight: "", reps: "", rpe: "", origKg: null, seedW: "" });
const newEx = (exerciseId: string): DEx => ({ id: lid("ex"), exerciseId, sets: [newSet()] });
const newCardio = (): DCardio => ({ id: lid("c"), distance: "", durationSec: null, avgHr: "", origKm: null, seedDist: "" });

function seed(session: Session, sys: UnitSystem): Draft {
  return {
    title: session.title ?? "",
    notes: session.notes ?? "",
    durationSec: session.durationMin != null ? session.durationMin * 60 : null,
    exercises: session.entries.map((entry) => ({
      id: lid("ex"),
      exerciseId: entry.exerciseId,
      sets: entry.sets.map((st) => {
        const kg = st.weight?.value != null && st.weight.value > 0 ? st.weight.value : null;
        const seedW = kg != null ? String(kgToDisplay(kg, sys, 1)) : "";
        return {
          id: lid("set"),
          weight: seedW,
          reps: st.reps > 0 ? String(st.reps) : "",
          rpe: st.rpe != null ? String(st.rpe) : "",
          origKg: kg,
          seedW,
        };
      }),
    })),
    cardio: (session.cardio ?? []).map((cs) => {
      const km = cs.distance?.value != null && cs.distance.value > 0 ? cs.distance.value : null;
      const seedDist = km != null ? String(kmToDisplay(km, sys, 2)) : "";
      return {
        id: lid("c"),
        distance: seedDist,
        durationSec: cs.duration.value * 60,
        avgHr: cs.avgHr?.value != null ? String(cs.avgHr.value) : "",
        origKm: km,
        seedDist,
      };
    }),
  };
}

// Compile a draft into canonical-metric log inputs (drops empty/invalid rows).
function compile(draft: Draft, sys: UnitSystem): { entries: LogEntryInput[]; cardio: LogCardioInput[] } {
  const entries: LogEntryInput[] = draft.exercises
    .map((ex) => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets
        .map((st): LogSetInput | null => {
          const reps = Math.floor(parseFloat(st.reps) || 0);
          if (reps <= 0) return null;
          const w = parseFloat(st.weight);
          const rpe = parseFloat(st.rpe);
          // Untouched load → keep the exact canonical kg (no display round-trip drift).
          const weightKg =
            st.weight.trim() === st.seedW && st.origKg != null
              ? st.origKg
              : Number.isFinite(w) && w > 0
                ? weightToKg(w, sys)
                : null;
          return {
            weightKg,
            reps,
            rpe: Number.isFinite(rpe) && rpe > 0 ? rpe : null,
          };
        })
        .filter((x): x is LogSetInput => x !== null),
    }))
    .filter((e) => e.sets.length > 0);

  const cardio: LogCardioInput[] = draft.cardio
    .map((c): LogCardioInput | null => {
      const durMin = c.durationSec != null ? c.durationSec / 60 : 0;
      if (durMin <= 0) return null;
      const dist = parseFloat(c.distance);
      const hr = parseFloat(c.avgHr);
      // Untouched distance → keep the exact canonical km (no display round-trip drift).
      const distanceKm =
        c.distance.trim() === c.seedDist && c.origKm != null
          ? c.origKm
          : Number.isFinite(dist) && dist > 0
            ? distanceToKm(dist, sys)
            : null;
      return {
        distanceKm,
        durationMin: durMin,
        avgHr: Number.isFinite(hr) && hr > 0 ? hr : null,
      };
    })
    .filter((x): x is LogCardioInput => x !== null);

  return { entries, cardio };
}

export function SessionEditor() {
  const s = usePeak();
  const id = s.sessionEditId;
  const sys = s.data.unitSystem;
  const session = useMemo(() => (id ? s.data.sessions.find((x) => x.id === id) ?? null : null), [id, s.data.sessions]);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [picker, setPicker] = useState<{ mode: "add" } | { mode: "swap"; exId: string; exerciseId: string } | null>(null);

  // (Re)seed the local draft whenever the edited session identity changes.
  useEffect(() => {
    setDraft(session ? seed(session, sys) : null);
    setPicker(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const compiled = useMemo(() => (draft ? compile(draft, sys) : { entries: [], cardio: [] }), [draft, sys]);

  if (!id || !session || !draft) return null;

  const theme = WORKOUT_THEME[session.type];
  const wUnit = weightUnit(sys);
  const canSave = compiled.entries.length > 0 || compiled.cardio.length > 0;

  const patch = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const mapEx = (exId: string, fn: (ex: DEx) => DEx) =>
    setDraft((d) => (d ? { ...d, exercises: d.exercises.map((ex) => (ex.id === exId ? fn(ex) : ex)) } : d));
  const mapCardio = (cid: string, fn: (c: DCardio) => DCardio) =>
    setDraft((d) => (d ? { ...d, cardio: d.cardio.map((c) => (c.id === cid ? fn(c) : c)) } : d));

  const close = () => s.set({ sessionEditId: null });
  const onSave = () => {
    if (!canSave) return;
    const durationMin = draft.durationSec != null ? Math.max(1, Math.round(draft.durationSec / 60)) : null;
    s.updateSession(id, {
      type: session.type,
      title: draft.title,
      notes: draft.notes,
      durationMin,
      entries: compiled.entries,
      cardio: compiled.cardio,
    });
  };

  const showStrength = session.type === "Gym" || draft.exercises.length > 0;
  const showCardio = session.type !== "Gym" || draft.cardio.length > 0;
  const existingIds = draft.exercises.map((e) => e.exerciseId);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 82, background: C.screen, display: "flex", flexDirection: "column", animation: "sheetUp .28s cubic-bezier(.2,.8,.2,1)" }}>
      {/* ── Header ── */}
      <div style={{ flexShrink: 0, padding: "calc(env(safe-area-inset-top) + 12px) 16px 12px", borderBottom: `1px solid ${C.line2}`, background: C.screen }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={close} aria-label="Cancel"
            style={{ background: C.inner, border: `1px solid ${C.line2}`, borderRadius: 10, color: C.ink2, cursor: "pointer", width: 34, height: 34, fontSize: 17, lineHeight: 1, flexShrink: 0 }}>✕</button>
          <input
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Workout"
            aria-label="Session title"
            style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: C.ink, fontSize: 19, fontWeight: 700, letterSpacing: "-0.4px", padding: "4px 2px" }}
          />
          <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", padding: "3px 9px", borderRadius: 6, color: theme.color, background: theme.tagBg }}>{session.type}</span>
        </div>
        <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "1px", color: C.muted, textTransform: "uppercase", marginTop: 6, paddingLeft: 2 }}>Editing logged session</div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 20px" }}>
        {showStrength && (
          <>
            <Heading>Exercises</Heading>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {draft.exercises.map((ex) => (
                <EditExerciseCard
                  key={ex.id}
                  ex={ex}
                  wUnit={wUnit}
                  onSwap={() => setPicker({ mode: "swap", exId: ex.id, exerciseId: ex.exerciseId })}
                  onRemove={() => setDraft((d) => (d ? { ...d, exercises: d.exercises.filter((x) => x.id !== ex.id) } : d))}
                  onAddSet={() => mapEx(ex.id, (e) => ({ ...e, sets: [...e.sets, newSet()] }))}
                  onRemoveSet={(setId) => mapEx(ex.id, (e) => ({ ...e, sets: e.sets.filter((st) => st.id !== setId) }))}
                  onSetField={(setId, field, v) => mapEx(ex.id, (e) => ({ ...e, sets: e.sets.map((st) => (st.id === setId ? { ...st, [field]: v } : st)) }))}
                />
              ))}
              <button onClick={() => setPicker({ mode: "add" })}
                style={{ fontSize: 13.5, fontWeight: 700, padding: "12px", borderRadius: 14, cursor: "pointer", border: `1px dashed ${C.line2}`, background: "transparent", color: C.accent }}>
                ＋ Add exercise
              </button>
            </div>
          </>
        )}

        {showCardio && (
          <>
            <Heading>Cardio</Heading>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {draft.cardio.map((c) => (
                <EditCardioCard
                  key={c.id}
                  c={c}
                  sys={sys}
                  onRemove={() => setDraft((d) => (d ? { ...d, cardio: d.cardio.filter((x) => x.id !== c.id) } : d))}
                  onDistance={(v) => mapCardio(c.id, (x) => ({ ...x, distance: v }))}
                  onDuration={(sec) => mapCardio(c.id, (x) => ({ ...x, durationSec: sec }))}
                  onHr={(v) => mapCardio(c.id, (x) => ({ ...x, avgHr: v }))}
                />
              ))}
              <button onClick={() => setDraft((d) => (d ? { ...d, cardio: [...d.cardio, newCardio()] } : d))}
                style={{ fontSize: 13.5, fontWeight: 700, padding: "12px", borderRadius: 14, cursor: "pointer", border: `1px dashed ${C.line2}`, background: "transparent", color: theme.color }}>
                ＋ Add cardio effort
              </button>
            </div>
          </>
        )}

        {/* Duration + notes */}
        <Heading>Details</Heading>
        <div style={{ background: C.card, border: `1px solid ${C.line2}`, borderRadius: 16, padding: "14px 15px" }}>
          <label style={fieldLabel}>Duration</label>
          <DurationInput key={`dur-${id}`} valueSec={draft.durationSec} showHours onChange={(sec) => patch({ durationSec: sec })} />
          <label style={{ ...fieldLabel, marginTop: 16 }}>Notes</label>
          <textarea
            value={draft.notes}
            onChange={(e) => patch({ notes: e.target.value })}
            placeholder="How did it go?"
            rows={3}
            style={{ ...inputStyle, resize: "vertical", minHeight: 64, lineHeight: 1.5, fontFamily: "inherit" }}
          />
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ flexShrink: 0, padding: "10px 16px max(16px, env(safe-area-inset-bottom))", borderTop: `1px solid ${C.line2}`, background: C.screen }}>
        <button
          onClick={onSave}
          disabled={!canSave}
          style={{
            width: "100%", fontSize: 15.5, fontWeight: 700, padding: 15, borderRadius: 15, border: "none",
            cursor: canSave ? "pointer" : "default",
            background: canSave ? C.accent : C.lockCard,
            color: canSave ? "#0a0b0d" : C.muted,
            transition: "background .15s",
          }}
        >
          {canSave ? "Save changes" : "Log a set or effort to save"}
        </button>
      </div>

      {/* ── Exercise picker (add + swap) ── */}
      <ExercisePickerModal
        open={picker != null}
        mode={picker?.mode ?? "add"}
        swapForExerciseId={picker?.mode === "swap" ? picker.exerciseId : undefined}
        existingExerciseIds={existingIds}
        onClose={() => setPicker(null)}
        onAdd={(ids) => setDraft((d) => (d ? { ...d, exercises: [...d.exercises, ...ids.map(newEx)] } : d))}
        onSwap={(newId) => {
          if (picker?.mode !== "swap") return;
          const exId = picker.exId;
          mapEx(exId, (e) => ({ ...e, exerciseId: newId, sets: e.sets.map((st) => ({ ...st, weight: "" })) }));
        }}
      />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
const fieldLabel: React.CSSProperties = { fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6, display: "block" };
const colLabel: React.CSSProperties = { fontSize: 9.5, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center" };

function Heading({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, letterSpacing: "-0.2px", margin: "20px 2px 11px" }}>{children}</div>;
}

function EditExerciseCard({
  ex, wUnit, onSwap, onRemove, onAddSet, onRemoveSet, onSetField,
}: {
  ex: DEx;
  wUnit: string;
  onSwap: () => void;
  onRemove: () => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onSetField: (setId: string, field: "weight" | "reps" | "rpe", v: string) => void;
}) {
  const def = EXERCISE_BY_ID[ex.exerciseId];
  const perArm = def ? isPerArm(def) : false;

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line2}`, borderRadius: 16, padding: 14 }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{def?.name ?? ex.exerciseId}</span>
            {perArm && (
              <span style={{ fontSize: 9, fontWeight: 700, color: C.blue, background: `${C.blue}1f`, padding: "2px 6px", borderRadius: 5, textTransform: "uppercase", letterSpacing: "0.4px" }}>Per arm</span>
            )}
          </div>
        </div>
        <button onClick={onSwap} aria-label="Swap exercise"
          style={{ fontSize: 11.5, fontWeight: 700, padding: "6px 10px", borderRadius: 9, cursor: "pointer", border: `1px solid ${C.line2}`, background: C.inner, color: C.blue }}>
          Swap
        </button>
        <button onClick={onRemove} aria-label="Remove exercise"
          style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 19, lineHeight: 1, padding: "2px 2px" }}>×</button>
      </div>

      {/* column header */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
        <span style={{ ...colLabel, width: 24 }}>Set</span>
        <span style={{ ...colLabel, flex: 1.1 }}>{wUnit}{perArm ? " /arm" : ""}</span>
        <span style={{ ...colLabel, flex: 0.85 }}>Reps</span>
        <span style={{ ...colLabel, flex: 0.7 }}>RPE</span>
        <span style={{ width: 18 }} />
      </div>

      {/* set rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {ex.sets.map((st, i) => (
          <div key={st.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ width: 24, textAlign: "center", fontFamily: mono, fontSize: 13, fontWeight: 700, color: C.sub }}>{i + 1}</span>
            <input style={{ ...cellInput, flex: 1.1 }} type="number" inputMode="decimal" step="0.5" value={st.weight} placeholder="—"
              onChange={(e) => onSetField(st.id, "weight", e.target.value)} aria-label={`Set ${i + 1} weight`} />
            <input style={{ ...cellInput, flex: 0.85 }} type="number" inputMode="numeric" value={st.reps} placeholder="0"
              onChange={(e) => onSetField(st.id, "reps", e.target.value)} aria-label={`Set ${i + 1} reps`} />
            <input style={{ ...cellInput, flex: 0.7 }} type="number" inputMode="decimal" step="0.5" value={st.rpe} placeholder="—"
              onChange={(e) => onSetField(st.id, "rpe", e.target.value)} aria-label={`Set ${i + 1} RPE`} />
            <button onClick={() => onRemoveSet(st.id)} aria-label="Remove set"
              style={{ width: 18, background: "none", border: "none", color: C.muted2, cursor: "pointer", fontSize: 15, flexShrink: 0 }}>−</button>
          </div>
        ))}
      </div>

      <button onClick={onAddSet}
        style={{ marginTop: 8, width: "100%", fontSize: 12.5, fontWeight: 700, padding: "8px", borderRadius: 10, cursor: "pointer", border: `1px solid ${C.line2}`, background: C.inner, color: C.ink3 }}>
        ＋ Add set
      </button>
    </div>
  );
}

function EditCardioCard({
  c, sys, onRemove, onDistance, onDuration, onHr,
}: {
  c: DCardio;
  sys: UnitSystem;
  onRemove: () => void;
  onDistance: (v: string) => void;
  onDuration: (sec: number | null) => void;
  onHr: (v: string) => void;
}) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line2}`, borderRadius: 16, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Cardio effort</span>
        <button onClick={onRemove} aria-label="Remove cardio effort"
          style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 19, lineHeight: 1, padding: "2px 2px" }}>×</button>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={fieldLabel}>Distance · {distanceUnit(sys)}</label>
          <input style={{ ...inputStyle, fontFamily: mono, textAlign: "center" }} type="number" inputMode="decimal" step="0.01" value={c.distance} placeholder="—"
            onChange={(e) => onDistance(e.target.value)} aria-label="Distance" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={fieldLabel}>Avg HR · bpm</label>
          <input style={{ ...inputStyle, fontFamily: mono, textAlign: "center" }} type="number" inputMode="numeric" value={c.avgHr} placeholder="—"
            onChange={(e) => onHr(e.target.value)} aria-label="Average heart rate" />
        </div>
      </div>
      <label style={{ ...fieldLabel, marginTop: 14 }}>Duration</label>
      <DurationInput key={`cdur-${c.id}`} valueSec={c.durationSec} showHours onChange={onDuration} />
    </div>
  );
}

const cellInput: React.CSSProperties = {
  ...inputStyle,
  padding: "9px 6px",
  textAlign: "center",
  fontFamily: mono,
  fontSize: 15,
};
