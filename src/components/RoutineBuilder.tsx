// Peak — routine builder (§6.4 program scaffolding). Create a reusable Gym
// template from scratch or edit an existing one: name it, add exercises, set the
// suggested working sets + rep range. Saves to PeakData.routines via the store.

import { useEffect, useState } from "react";
import { usePeak } from "../store";
import { C, mono } from "../theme";
import { Sheet, Field, PrimaryButton, inputStyle, PerArmBadge } from "./ui";
import { ExercisePickerModal } from "./ExercisePickerModal";
import { EXERCISE_BY_ID } from "../data/exercises";
import { isPerArm, exerciseSubtitle } from "../data/exerciseCatalog";
import type { RoutineExercise } from "../types";

const intOr = (v: string): number | undefined => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export function RoutineBuilder() {
  const s = usePeak();
  const [name, setName] = useState("");
  const [focus, setFocus] = useState("");
  const [exs, setExs] = useState<RoutineExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Seed from the routine being edited (or blank for a new one) each time it opens.
  useEffect(() => {
    if (!s.routineEditorOpen) return;
    const r = s.routineEditId ? s.data.routines.find((x) => x.id === s.routineEditId) : null;
    setName(r?.name ?? "");
    setFocus(r?.focus ?? "");
    setExs(r ? r.exercises.map((e) => ({ ...e })) : []);
    setPickerOpen(false);
  }, [s.routineEditorOpen, s.routineEditId, s.data.routines]);

  if (!s.routineEditorOpen) return null;

  const editing = s.routineEditId != null;
  const addExercises = (ids: string[]) =>
    setExs((cur) => [...cur, ...ids.map((id) => ({ exerciseId: id, sets: 3 }))]);
  const removeAt = (i: number) => setExs((cur) => cur.filter((_, j) => j !== i));
  const patchAt = (i: number, patch: Partial<RoutineExercise>) =>
    setExs((cur) => cur.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const move = (i: number, dir: -1 | 1) =>
    setExs((cur) => {
      const j = i + dir;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const canSave = name.trim().length > 0 && exs.length > 0;
  const save = () => {
    if (!canSave) return;
    s.upsertRoutine({ id: s.routineEditId ?? undefined, name, focus, exercises: exs });
    s.closeRoutineEditor();
  };

  return (
    <Sheet title={editing ? "Edit routine" : "New routine"} onClose={() => s.closeRoutineEditor()}>
      <Field label="Name">
        <input value={name} placeholder="e.g. Push Day A" onChange={(e) => setName(e.target.value)} style={inputStyle} />
      </Field>
      <Field label="Focus (optional)" hint="A short tag shown on the card, e.g. Push, Legs, Full Body.">
        <input value={focus} placeholder="Push" onChange={(e) => setFocus(e.target.value)} style={inputStyle} />
      </Field>

      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.8px", margin: "4px 0 10px" }}>
        Exercises{exs.length ? ` · ${exs.length}` : ""}
      </div>

      {exs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "22px 16px", borderRadius: 14, border: `1px dashed ${C.line2}`, color: C.muted, fontSize: 13, marginBottom: 12 }}>
          No exercises yet. Add a few to build your routine.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
          {exs.map((re, i) => (
            <RoutineExRow
              key={`${re.exerciseId}-${i}`}
              re={re}
              first={i === 0}
              last={i === exs.length - 1}
              onSets={(n) => patchAt(i, { sets: n })}
              onReps={(low, high) => patchAt(i, { repLow: low, repHigh: high })}
              onUp={() => move(i, -1)}
              onDown={() => move(i, 1)}
              onRemove={() => removeAt(i)}
            />
          ))}
        </div>
      )}

      <button
        onClick={() => setPickerOpen(true)}
        style={{ width: "100%", fontSize: 14, fontWeight: 700, padding: "12px", borderRadius: 13, cursor: "pointer", border: `1px dashed ${C.line2}`, background: "transparent", color: C.accent, marginBottom: 16 }}
      >
        ＋ Add exercise
      </button>

      <PrimaryButton disabled={!canSave} onClick={save}>
        {editing ? "Save changes" : "Save routine"}
      </PrimaryButton>

      <ExercisePickerModal
        open={pickerOpen}
        mode="add"
        existingExerciseIds={exs.map((e) => e.exerciseId)}
        onClose={() => setPickerOpen(false)}
        onAdd={addExercises}
      />
    </Sheet>
  );
}

function RoutineExRow({
  re, first, last, onSets, onReps, onUp, onDown, onRemove,
}: {
  re: RoutineExercise;
  first: boolean;
  last: boolean;
  onSets: (n: number) => void;
  onReps: (low: number | undefined, high: number | undefined) => void;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  const ex = EXERCISE_BY_ID[re.exerciseId];
  const perArm = ex ? isPerArm(ex) : false;
  const clampSets = (n: number) => Math.max(1, Math.min(12, n));

  return (
    <div style={{ background: C.inner, border: `1px solid ${C.line2}`, borderRadius: 14, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{ex?.name ?? re.exerciseId}</span>
            {perArm && <PerArmBadge />}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{ex ? exerciseSubtitle(ex) : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          <IconBtn label="Move up" disabled={first} onClick={onUp}>▲</IconBtn>
          <IconBtn label="Move down" disabled={last} onClick={onDown}>▼</IconBtn>
        </div>
        <button onClick={onRemove} aria-label="Remove exercise" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 2px" }}>×</button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        {/* sets stepper */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Sets</span>
          <Stepper value={re.sets} onChange={(n) => onSets(clampSets(n))} />
        </div>
        {/* rep range (optional) */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Reps</span>
          <input
            type="number" inputMode="numeric" value={re.repLow ?? ""} placeholder="–"
            onChange={(e) => onReps(intOr(e.target.value), re.repHigh)}
            style={{ ...inputStyle, width: 46, padding: "7px 6px", textAlign: "center", fontFamily: mono, fontSize: 14 }}
          />
          <span style={{ color: C.muted }}>–</span>
          <input
            type="number" inputMode="numeric" value={re.repHigh ?? ""} placeholder="–"
            onChange={(e) => onReps(re.repLow, intOr(e.target.value))}
            style={{ ...inputStyle, width: 46, padding: "7px 6px", textAlign: "center", fontFamily: mono, fontSize: 14 }}
          />
        </div>
      </div>
    </div>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const btn: React.CSSProperties = {
    width: 30, height: 30, borderRadius: 9, cursor: "pointer", border: `1px solid ${C.line2}`,
    background: C.card, color: C.ink2, fontSize: 17, lineHeight: 1, fontWeight: 700,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button aria-label="Fewer sets" onClick={() => onChange(value - 1)} style={btn}>−</button>
      <span style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: C.ink, width: 16, textAlign: "center" }}>{value}</span>
      <button aria-label="More sets" onClick={() => onChange(value + 1)} style={btn}>＋</button>
    </div>
  );
}

function IconBtn({ children, label, onClick, disabled }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={label}
      style={{ width: 26, height: 26, borderRadius: 7, cursor: disabled ? "default" : "pointer", border: `1px solid ${C.line2}`, background: C.card, color: disabled ? C.muted2 : C.sub, fontSize: 10, lineHeight: 1, opacity: disabled ? 0.4 : 1 }}
    >
      {children}
    </button>
  );
}
