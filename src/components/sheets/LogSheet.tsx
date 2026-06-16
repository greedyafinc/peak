// Peak — the real per-set logger bottom sheet (§6.4). Gated on the store's logOpen
// flag, built on the shared Sheet shell. (Split out of the former Sheets.tsx.)
import { useState } from "react";
import { usePeak, type LogEntryInput, type LogSetInput } from "../../store";
import { C, mono } from "../../theme";
import {
  Sheet, Field, Chip, PrimaryButton, GhostButton, UnitToggle, DurationInput, inputStyle, PerArmBadge,
} from "../ui";
import { EXERCISE_BY_ID } from "../../data/exercises";
import { isPerArm } from "../../data/exerciseCatalog";
import { ExercisePickerModal } from "../ExercisePickerModal";
import type { WorkoutType } from "../../types";
import { distanceToKm, distanceUnit, paceLabel, weightToKg } from "../../units";
import { NumInput, num } from "./shared";

const WORKOUT_TYPES: WorkoutType[] = ["Gym", "Cardio", "Sport", "Mobility"];

type DraftSet = { weight: string; reps: string; rpe: string };
type DraftEntry = { exerciseId: string; sets: DraftSet[] };

export function LogSheet() {
  const s = usePeak();
  const sys = s.data.unitSystem;
  const [type, setType] = useState<WorkoutType>("Gym");
  const [title, setTitle] = useState("");
  const [entries, setEntries] = useState<DraftEntry[]>([]);
  const [picking, setPicking] = useState(false);
  const [durationMin, setDurationMin] = useState("");
  const [notes, setNotes] = useState("");
  // cardio
  const [cDist, setCDist] = useState("");
  const [cDurSec, setCDurSec] = useState<number | null>(null);
  const [cHr, setCHr] = useState("");

  const isCardio = type === "Cardio";

  const reset = () => {
    setType("Gym"); setTitle(""); setEntries([]); setPicking(false);
    setDurationMin(""); setNotes(""); setCDist(""); setCDurSec(null); setCHr("");
  };
  const close = () => { reset(); s.set({ logOpen: false }); };

  // Append picks from the shared exercise picker (each starts with one blank set).
  const addExercises = (ids: string[]) =>
    setEntries((es) => [...es, ...ids.map((id) => ({ exerciseId: id, sets: [{ weight: "", reps: "", rpe: "" }] }))]);
  const removeEntry = (idx: number) => setEntries((es) => es.filter((_, i) => i !== idx));
  const addSet = (ei: number) =>
    setEntries((es) => es.map((e, i) => i === ei ? { ...e, sets: [...e.sets, { weight: "", reps: "", rpe: "" }] } : e));
  const removeSet = (ei: number, si: number) =>
    setEntries((es) => es.map((e, i) => i === ei ? { ...e, sets: e.sets.filter((_, j) => j !== si) } : e));
  const setSetField = (ei: number, si: number, field: keyof DraftSet, v: string) =>
    setEntries((es) => es.map((e, i) => i === ei
      ? { ...e, sets: e.sets.map((st, j) => j === si ? { ...st, [field]: v } : st) }
      : e));

  const canSave = isCardio
    ? cDurSec != null && cDurSec > 0
    : entries.some((e) => e.sets.some((st) => num(st.reps) != null && num(st.reps)! > 0));

  const save = () => {
    if (isCardio) {
      const d = num(cDist);
      s.logSession({
        type, title: title || undefined,
        cardio: [{ distanceKm: d != null ? distanceToKm(d, sys) : null, durationMin: (cDurSec ?? 0) / 60, avgHr: num(cHr) ?? null }],
        durationMin: durationMin !== "" ? num(durationMin) : (cDurSec != null ? Math.round(cDurSec / 60) : undefined),
        notes: notes || undefined,
      });
    } else {
      const built: LogEntryInput[] = entries
        .map((e) => ({
          exerciseId: e.exerciseId,
          sets: e.sets
            .filter((st) => num(st.reps) != null && num(st.reps)! > 0)
            .map((st): LogSetInput => {
              const w = num(st.weight);
              return { weightKg: w != null ? weightToKg(w, sys) : null, reps: num(st.reps)!, rpe: num(st.rpe) ?? null };
            }),
        }))
        .filter((e) => e.sets.length > 0);
      s.logSession({ type, title: title || undefined, entries: built, durationMin: num(durationMin), notes: notes || undefined });
    }
    reset();
  };

  if (!s.logOpen) return null;

  return (
    <Sheet title="Log a session" onClose={close}>
      <Field label="Type">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {WORKOUT_TYPES.map((t) => (
            <Chip key={t} active={type === t} onClick={() => setType(t)}>{t}</Chip>
          ))}
        </div>
      </Field>

      <Field label="Title">
        <input value={title} placeholder={`${type} Session`} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
      </Field>

      {isCardio ? (
        <>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <Field label={`Distance (${distanceUnit(sys)})`}>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}><UnitToggle kind="distance" /></div>
                <NumInput value={cDist} onChange={setCDist} placeholder={sys === "imperial" ? "3.1" : "5"} step="0.1" />
              </Field>
            </div>
            <div style={{ flex: 1 }}><Field label="Avg HR"><NumInput value={cHr} onChange={setCHr} placeholder="155" /></Field></div>
          </div>
          <Field
            label="Duration"
            hint={
              cDurSec && num(cDist)
                ? `Pace · ${paceLabel(distanceToKm(num(cDist)!, sys), cDurSec, sys)}`
                : undefined
            }
          >
            <DurationInput valueSec={cDurSec} onChange={setCDurSec} showHours />
          </Field>
        </>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 4 }}>
            {entries.map((entry, ei) => {
              const ex = EXERCISE_BY_ID[entry.exerciseId];
              const perArm = ex ? isPerArm(ex) : false;
              return (
                <div key={ei} style={{ background: C.inner, border: `1px solid ${C.line2}`, borderRadius: 14, padding: 13 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{ex?.name ?? entry.exerciseId}</span>
                      {perArm && <PerArmBadge />}
                    </span>
                    <button onClick={() => removeEntry(ei)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, lineHeight: 1 }} aria-label="Remove exercise">×</button>
                  </div>
                  {/* set header */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 9.5, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", alignItems: "center" }}>
                    <span style={{ width: 18 }}>#</span>
                    <span style={{ flex: 1, display: "flex", alignItems: "center", gap: 3 }}><UnitToggle kind="weight" />{perArm && <span style={{ color: C.blue }}>/ arm</span>}</span>
                    <span style={{ flex: 1 }}>reps</span>
                    <span style={{ flex: 1 }}>rpe</span>
                    <span style={{ width: 24 }} />
                  </div>
                  {entry.sets.map((st, si) => (
                    <div key={si} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                      <span style={{ width: 18, fontFamily: mono, fontSize: 12, color: C.muted }}>{si + 1}</span>
                      <div style={{ flex: 1 }}><NumInput value={st.weight} onChange={(v) => setSetField(ei, si, "weight", v)} placeholder="—" step="0.5" /></div>
                      <div style={{ flex: 1 }}><NumInput value={st.reps} onChange={(v) => setSetField(ei, si, "reps", v)} placeholder="0" /></div>
                      <div style={{ flex: 1 }}><NumInput value={st.rpe} onChange={(v) => setSetField(ei, si, "rpe", v)} placeholder="–" /></div>
                      <button onClick={() => removeSet(ei, si)} style={{ width: 24, background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16 }} aria-label="Remove set">−</button>
                    </div>
                  ))}
                  <GhostButton onClick={() => addSet(ei)} style={{ marginTop: 4, padding: "7px 12px" }}>＋ Add set</GhostButton>
                </div>
              );
            })}
          </div>

          <GhostButton onClick={() => setPicking(true)} style={{ marginBottom: 14 }}>＋ Add exercise</GhostButton>
        </>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><Field label="Duration (min)"><NumInput value={durationMin} onChange={setDurationMin} placeholder="optional" /></Field></div>
      </div>
      <Field label="Notes">
        <textarea value={notes} placeholder="Optional" onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: "none" }} />
      </Field>

      <PrimaryButton onClick={save} disabled={!canSave}>Save session</PrimaryButton>

      <ExercisePickerModal
        open={picking}
        mode="add"
        existingExerciseIds={entries.map((e) => e.exerciseId)}
        onClose={() => setPicking(false)}
        onAdd={addExercises}
      />
    </Sheet>
  );
}
