// Peak — bottom sheets: the real per-set logger (§6.4), the benchmark capture,
// and the goal builder. Each gated on its store flag, each using the shared Sheet.
import { useEffect, useState } from "react";
import { usePeak, type LogEntryInput, type LogSetInput } from "../store";
import { C, mono } from "../theme";
import {
  Sheet, Field, Chip, PrimaryButton, GhostButton, UnitToggle, DurationInput, inputStyle,
} from "../components/ui";
import { EXERCISE_BY_ID } from "../data/exercises";
import { isPerArm } from "../data/exerciseCatalog";
import { ExercisePickerModal } from "./ExercisePickerModal";
import { BENCHMARK_BY_LEAF, standardDistanceKm, eventNeedsHours } from "../data/benchmarks";
import { variantsForLeaf } from "../data/benchmarkVariants";
import { LEAF_BY_ID, DIMENSIONS } from "../data/capabilityTree";
import type {
  WorkoutType, DimensionId, RawMeasurement, Unit, LeafId, Quantity,
} from "../types";
import {
  distanceToKm, distanceUnit, kgToDisplay, lengthToMeters, lengthUnit,
  paceLabel, weightToKg, weightUnit,
} from "../units";

const WORKOUT_TYPES: WorkoutType[] = ["Gym", "Cardio", "Sport", "Mobility"];

// Small numeric input that keeps the raw string while editing.
function NumInput({ value, onChange, placeholder, step }: {
  value: string; onChange: (v: string) => void; placeholder?: string; step?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...inputStyle, padding: "10px 12px" }}
    />
  );
}

const num = (v: string): number | undefined => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
};

// ─────────────────────────────────────────────────────────────────────────────
//  LOG SHEET (§6.4)
// ─────────────────────────────────────────────────────────────────────────────
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
                      {perArm && (
                        <span style={{ fontSize: 8.5, fontWeight: 700, color: C.blue, background: `${C.blue}1f`, padding: "1px 5px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.4px" }}>Per arm</span>
                      )}
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

// ─────────────────────────────────────────────────────────────────────────────
//  BENCHMARK SHEET (§4.1, §4.2)
// ─────────────────────────────────────────────────────────────────────────────
export function BenchmarkSheet() {
  const s = usePeak();
  const sys = s.data.unitSystem;
  const leafId = s.benchLeaf;
  const proto = leafId ? BENCHMARK_BY_LEAF[leafId] : undefined;
  const variants = leafId ? variantsForLeaf(leafId) : [];

  // One capture slot per shape: a load+reps (with a variant), a clock, or a value.
  const [variantId, setVariantId] = useState("");
  const [load, setLoad] = useState("");
  const [reps, setReps] = useState("");
  const [durSec, setDurSec] = useState<number | null>(null);
  const [val, setVal] = useState(""); // max reps / vo2 / length / rom / distance (m)

  const resetFields = () => { setVariantId(""); setLoad(""); setReps(""); setDurSec(null); setVal(""); };

  // Whenever the targeted benchmark changes, clear the form.
  useEffect(() => { resetFields(); }, [leafId]);

  if (!s.benchOpen || !proto || !leafId) return null;

  const close = () => { resetFields(); s.set({ benchOpen: false, benchLeaf: null }); };
  const leafLabel = LEAF_BY_ID[leafId]?.label ?? leafId;
  const imp = sys === "imperial";
  const activeVariant = variants.find((v) => v.id === variantId) ?? variants[0];
  const perHand = activeVariant?.entry === "perHand";

  const q = (value: number, u: Unit): Quantity => ({ value, unit: u });
  const build = (): RawMeasurement | null => {
    switch (proto.measure) {
      case "max_load": {
        const L = num(load);
        if (L == null || L <= 0) return null;
        const total = perHand ? L * 2 : L;        // dumbbell entry = one bell × 2
        const r = num(reps);
        return {
          kind: "max_load",
          load: q(weightToKg(total, sys), "kg"),
          reps: r != null && r > 0 ? Math.round(r) : 1,
          variantId: activeVariant?.id,
          equipment: activeVariant?.equipment,
        };
      }
      case "rep_max": {
        const v = num(val);
        return v != null && v >= 0 ? { kind: "rep_max", reps: Math.round(v) } : null;
      }
      case "hold_duration":
        return durSec && durSec > 0 ? { kind: "hold_duration", duration: q(durSec, "sec") } : null;
      case "balance_hold":
        return durSec && durSec > 0 ? { kind: "balance_hold", duration: q(durSec, "sec") } : null;
      case "time_for_distance":
        return durSec && durSec > 0
          ? { kind: "time_for_distance", distance: q(standardDistanceKm(leafId), "km"), duration: q(durSec, "sec") }
          : null;
      case "sprint_time": {
        const d = leafId === "anaerobic.sprint_repeats" ? 40 : 400;
        return durSec && durSec > 0 ? { kind: "sprint_time", distance: q(d, "m"), duration: q(durSec, "sec") } : null;
      }
      case "distance_in_time": {
        const d = num(val);
        return d != null && d > 0 ? { kind: "distance_in_time", distance: q(d, "m"), duration: q(60, "sec") } : null;
      }
      case "vo2_proxy": {
        const v = num(val);
        return v != null && v > 0 ? { kind: "vo2_proxy", vo2: q(v, "ml/kg/min") } : null;
      }
      case "jump_height": {
        const v = num(val);
        return v != null && v > 0 ? { kind: "jump_height", height: q(lengthToMeters(v, sys), "m") } : null;
      }
      case "throw_distance": {
        const v = num(val);
        return v != null && v > 0 ? { kind: "throw_distance", distance: q(lengthToMeters(v, sys), "m") } : null;
      }
      case "reach_distance": {
        const v = num(val);
        return v != null ? { kind: "reach_distance", distance: q(lengthToMeters(v, sys), "m") } : null;
      }
      case "rom": {
        const v = num(val);
        return v != null && v > 0 ? { kind: "rom", angle: q(v, "degree") } : null;
      }
      default:
        return null;
    }
  };

  const raw = build();
  const onSave = () => { if (raw) { s.addBenchmark(leafId, raw); resetFields(); } };

  // Live standard-equivalent preview for a converted variant (e.g. dumbbell bench).
  let equivNote: string | null = null;
  if (raw?.kind === "max_load" && activeVariant && !activeVariant.isStandard) {
    const std = variants.find((v) => v.isStandard) ?? variants[0];
    const equivKg = raw.load.value * (raw.reps > 1 ? 1 + raw.reps / 30 : 1) * activeVariant.toStandardFactor;
    equivNote = `≈ ${kgToDisplay(equivKg, sys, 0)} ${weightUnit(sys)} ${std?.label?.toLowerCase() ?? "standard"}-equivalent 1RM`;
  }

  return (
    <Sheet title="Record a benchmark" onClose={close}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: C.ink }}>{leafLabel}</div>
        <div style={{ fontSize: 11, color: C.muted }}>{proto.category}</div>
      </div>

      <div style={{ background: C.inner, border: `1px solid ${C.line2}`, borderRadius: 14, padding: 13, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.55 }}>{proto.instructions}</div>
        {proto.restGuidanceSec > 0 && (
          <div style={{ fontSize: 11, color: C.muted, fontFamily: mono, marginTop: 10 }}>Rest guidance · {proto.restGuidanceSec}s</div>
        )}
      </div>

      {/* ── max_load: variant picker + load + reps ── */}
      {proto.measure === "max_load" && (
        <>
          {variants.length > 1 && (
            <Field label="Variant" hint={activeVariant && !activeVariant.isStandard ? activeVariant.note : "Log whatever you actually train — Peak converts it to the standard."}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {variants.map((v) => (
                  <Chip key={v.id} active={activeVariant?.id === v.id} onClick={() => setVariantId(v.id)}>{v.label}</Chip>
                ))}
              </div>
            </Field>
          )}
          <Field label={`${perHand ? "Per dumbbell" : "Load"} (${weightUnit(sys)})`} hint={equivNote ?? undefined}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}><UnitToggle kind="weight" /></div>
            <NumInput value={load} onChange={setLoad} placeholder={imp ? (perHand ? "45" : "225") : (perHand ? "20" : "100")} step="0.5" />
          </Field>
          <Field label="Reps in that set" hint="1–5 reps is fine — Peak estimates your 1RM via Epley.">
            <NumInput value={reps} onChange={setReps} placeholder="1" />
          </Field>
        </>
      )}

      {/* ── rep_max ── */}
      {proto.measure === "rep_max" && (
        <Field label="Max reps">
          <NumInput value={val} onChange={setVal} placeholder="0" />
        </Field>
      )}

      {/* ── holds (plank, balance) ── */}
      {(proto.measure === "hold_duration" || proto.measure === "balance_hold") && (
        <Field label="Hold time">
          <DurationInput valueSec={durSec} onChange={setDurSec} />
        </Field>
      )}

      {/* ── time_for_distance: clock only, distance fixed ── */}
      {proto.measure === "time_for_distance" && (
        <Field
          label="Finishing time"
          hint={
            raw?.kind === "time_for_distance"
              ? `Pace · ${paceLabel(standardDistanceKm(leafId), durSec ?? 0, sys)}`
              : "Enter your finishing time."
          }
        >
          <DurationInput valueSec={durSec} onChange={setDurSec} showHours={eventNeedsHours(leafId)} />
        </Field>
      )}

      {/* ── sprint_time: clock only ── */}
      {proto.measure === "sprint_time" && (
        <Field label="Time">
          <DurationInput valueSec={durSec} onChange={setDurSec} />
        </Field>
      )}

      {/* ── distance_in_time: meters covered in a fixed 60s ── */}
      {proto.measure === "distance_in_time" && (
        <Field label="Distance covered (m)" hint="How far you went in the 60-second effort.">
          <NumInput value={val} onChange={setVal} placeholder="250" />
        </Field>
      )}

      {/* ── vo2 ── */}
      {proto.measure === "vo2_proxy" && (
        <Field label="VO₂max (ml/kg/min)">
          <NumInput value={val} onChange={setVal} placeholder="45" step="0.1" />
        </Field>
      )}

      {/* ── jump / throw / reach: small length (cm/in) ── */}
      {(proto.measure === "jump_height" || proto.measure === "throw_distance" || proto.measure === "reach_distance") && (
        <Field label={`Measurement (${lengthUnit(sys)})`}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}><UnitToggle kind="length" /></div>
          <NumInput value={val} onChange={setVal} placeholder={imp ? "22" : "55"} step={imp ? "0.1" : "1"} />
        </Field>
      )}

      {/* ── rom ── */}
      {proto.measure === "rom" && (
        <Field label="Angle (degrees)">
          <NumInput value={val} onChange={setVal} placeholder="120" />
        </Field>
      )}

      <PrimaryButton disabled={!raw} onClick={onSave}>Save result</PrimaryButton>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  GOAL SHEET (§6.8)
// ─────────────────────────────────────────────────────────────────────────────

export function GoalSheet() {
  const s = usePeak();
  const [name, setName] = useState("");
  const [dimension, setDimension] = useState<DimensionId>("strength");
  const [targetLeafId, setTargetLeafId] = useState<LeafId | "">("");
  const [targetPct, setTargetPct] = useState("");

  if (!s.goalOpen) return null;

  const performed = DIMENSIONS.filter((d) => d.performed);
  const leafOptions = Object.values(LEAF_BY_ID).filter((l) => l.dimension === dimension && !l.deferred);

  const close = () => {
    setName(""); setDimension("strength"); setTargetLeafId(""); setTargetPct("");
    s.set({ goalOpen: false });
  };

  const save = () => {
    const pct = num(targetPct);
    s.addGoal({
      name, dimension,
      targetLeafId: targetLeafId || undefined,
      targetPercentileRaw: pct != null ? Math.max(0, Math.min(0.99, pct / 100)) : undefined,
    });
    setName(""); setDimension("strength"); setTargetLeafId(""); setTargetPct("");
  };

  return (
    <Sheet title="New goal" onClose={close}>
      <Field label="Name">
        <input value={name} placeholder="e.g. 2× bodyweight squat" onChange={(e) => setName(e.target.value)} style={inputStyle} />
      </Field>

      <Field label="Dimension">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {performed.map((d) => (
            <Chip key={d.id} active={dimension === d.id} color={d.color} onClick={() => { setDimension(d.id); setTargetLeafId(""); }}>
              {d.label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Target capability (optional)">
        <select value={targetLeafId} onChange={(e) => setTargetLeafId(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
          <option value="">No specific capability</option>
          {leafOptions.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      </Field>

      {targetLeafId && (
        <Field label="Target percentile (optional)" hint="The percentile vs your build you want to reach (1–99).">
          <NumInput value={targetPct} onChange={setTargetPct} placeholder="90" />
        </Field>
      )}

      <PrimaryButton disabled={!name.trim()} onClick={save}>Create goal</PrimaryButton>
    </Sheet>
  );
}
