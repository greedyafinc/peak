// Peak — bottom sheets: the real per-set logger (§6.4), the benchmark capture,
// and the goal builder. Each gated on its store flag, each using the shared Sheet.
import { useMemo, useState } from "react";
import { usePeak, type LogEntryInput, type LogSetInput } from "../store";
import { C, mono } from "../theme";
import {
  Sheet, Field, Chip, PrimaryButton, GhostButton, inputStyle,
} from "../components/ui";
import { EXERCISES, EXERCISE_BY_ID } from "../data/exercises";
import { BENCHMARK_BY_LEAF } from "../data/benchmarks";
import { LEAF_BY_ID, DIMENSIONS } from "../data/capabilityTree";
import type {
  WorkoutType, DimensionId, RawMeasurement, Unit, LeafId, Quantity,
} from "../types";

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
  const [type, setType] = useState<WorkoutType>("Gym");
  const [title, setTitle] = useState("");
  const [entries, setEntries] = useState<DraftEntry[]>([]);
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [notes, setNotes] = useState("");
  // cardio
  const [cDist, setCDist] = useState("");
  const [cDur, setCDur] = useState("");
  const [cHr, setCHr] = useState("");

  const isCardio = type === "Cardio";

  const reset = () => {
    setType("Gym"); setTitle(""); setEntries([]); setPicking(false); setSearch("");
    setDurationMin(""); setNotes(""); setCDist(""); setCDur(""); setCHr("");
  };
  const close = () => { reset(); s.set({ logOpen: false }); };

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = EXERCISES.filter((e) => e.dimension !== "aerobic" && (!q || e.name.toLowerCase().includes(q)));
    const map = new Map<string, typeof EXERCISES>();
    for (const e of list) {
      const k = e.movementPattern;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return [...map.entries()];
  }, [search]);

  const addExercise = (id: string) => {
    setEntries((es) => [...es, { exerciseId: id, sets: [{ weight: "", reps: "", rpe: "" }] }]);
    setPicking(false); setSearch("");
  };
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
    ? num(cDur) != null && num(cDur)! > 0
    : entries.some((e) => e.sets.some((st) => num(st.reps) != null && num(st.reps)! > 0));

  const save = () => {
    if (isCardio) {
      s.logSession({
        type, title: title || undefined,
        cardio: [{ distanceKm: num(cDist) ?? null, durationMin: num(cDur) ?? 0, avgHr: num(cHr) ?? null }],
        durationMin: num(durationMin), notes: notes || undefined,
      });
    } else {
      const built: LogEntryInput[] = entries
        .map((e) => ({
          exerciseId: e.exerciseId,
          sets: e.sets
            .filter((st) => num(st.reps) != null && num(st.reps)! > 0)
            .map((st): LogSetInput => ({ weightKg: num(st.weight) ?? null, reps: num(st.reps)!, rpe: num(st.rpe) ?? null })),
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
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}><Field label="Distance (km)"><NumInput value={cDist} onChange={setCDist} placeholder="5" step="0.1" /></Field></div>
          <div style={{ flex: 1 }}><Field label="Duration (min)"><NumInput value={cDur} onChange={setCDur} placeholder="28" /></Field></div>
          <div style={{ flex: 1 }}><Field label="Avg HR"><NumInput value={cHr} onChange={setCHr} placeholder="155" /></Field></div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 4 }}>
            {entries.map((entry, ei) => {
              const ex = EXERCISE_BY_ID[entry.exerciseId];
              return (
                <div key={ei} style={{ background: C.inner, border: `1px solid ${C.line2}`, borderRadius: 14, padding: 13 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{ex?.name ?? entry.exerciseId}</span>
                    <button onClick={() => removeEntry(ei)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, lineHeight: 1 }} aria-label="Remove exercise">×</button>
                  </div>
                  {/* set header */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 9.5, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    <span style={{ width: 18 }}>#</span>
                    <span style={{ flex: 1 }}>kg</span>
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

          {picking ? (
            <div style={{ background: C.inner, border: `1px solid ${C.line2}`, borderRadius: 14, padding: 12, marginBottom: 14 }}>
              <input autoFocus value={search} placeholder="Search exercises…" onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
              <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
                {grouped.map(([pattern, list]) => (
                  <div key={pattern}>
                    <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>
                      {pattern.replace(/_/g, " ")}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {list.map((ex) => (
                        <button key={ex.id} onClick={() => addExercise(ex.id)}
                          style={{ fontSize: 12.5, fontWeight: 600, padding: "7px 11px", borderRadius: 10, cursor: "pointer", border: `1px solid ${C.line2}`, background: C.card, color: C.ink2 }}>
                          {ex.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <GhostButton color={C.muted} onClick={() => { setPicking(false); setSearch(""); }} style={{ marginTop: 10 }}>Cancel</GhostButton>
            </div>
          ) : (
            <GhostButton onClick={() => setPicking(true)} style={{ marginBottom: 14 }}>＋ Add exercise</GhostButton>
          )}
        </>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><Field label="Duration (min)"><NumInput value={durationMin} onChange={setDurationMin} placeholder="optional" /></Field></div>
      </div>
      <Field label="Notes">
        <textarea value={notes} placeholder="Optional" onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: "none" }} />
      </Field>

      <PrimaryButton onClick={save} disabled={!canSave}>Save session</PrimaryButton>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  BENCHMARK SHEET (§4.1, §4.2)
// ─────────────────────────────────────────────────────────────────────────────
export function BenchmarkSheet() {
  const s = usePeak();
  const leafId = s.benchLeaf;
  const proto = leafId ? BENCHMARK_BY_LEAF[leafId] : undefined;
  // fields keyed by RawMeasurement need: a primary value + a few optional helpers.
  const [a, setA] = useState(""); // primary (load / reps / duration sec / distance / angle / vo2 / height)
  const [b, setB] = useState(""); // secondary (reps for max_load; duration sec for time/sprint)

  if (!s.benchOpen || !proto || !leafId) return null;

  const close = () => { setA(""); setB(""); s.set({ benchOpen: false, benchLeaf: null }); };
  const leafLabel = LEAF_BY_ID[leafId]?.label ?? leafId;
  const unit: Unit = proto.units;

  // distance unit for time_for_distance — from the capture schema (km / mi / m)
  const distUnit = (proto.rawCaptureSchema.find((f) => f.name === "distance")?.unit ?? "km") as Unit;
  const defaultDist = proto.rawCaptureSchema.find((f) => f.name === "distance");

  const build = (): RawMeasurement | null => {
    const av = num(a);
    const bv = num(b);
    const q = (value: number, u: Unit): Quantity => ({ value, unit: u });
    switch (proto.measure) {
      case "max_load":
        if (av == null) return null;
        return { kind: "max_load", load: q(av, "kg"), reps: bv != null && bv > 0 ? bv : 1 };
      case "rep_max":
        if (av == null) return null;
        return { kind: "rep_max", reps: av };
      case "hold_duration":
        if (av == null) return null;
        return { kind: "hold_duration", duration: q(av, "sec") };
      case "balance_hold":
        if (av == null) return null;
        return { kind: "balance_hold", duration: q(av, "sec") };
      case "time_for_distance": {
        if (bv == null) return null;
        const dist = av != null ? av : (defaultDist ? defaultLeafDistance(leafId) : 0);
        return { kind: "time_for_distance", distance: q(dist, distUnit), duration: q(bv, "sec") };
      }
      case "sprint_time": {
        if (bv == null) return null;
        const dist = av != null ? av : 400;
        return { kind: "sprint_time", distance: q(dist, distUnit), duration: q(bv, "sec") };
      }
      case "distance_in_time": {
        if (av == null) return null;
        return { kind: "distance_in_time", distance: q(av, distUnit), duration: q(bv ?? 60, "sec") };
      }
      case "vo2_proxy":
        if (av == null) return null;
        return { kind: "vo2_proxy", vo2: q(av, "ml/kg/min") };
      case "jump_height":
        if (av == null) return null;
        return { kind: "jump_height", height: q(av, "m") };
      case "throw_distance":
        if (av == null) return null;
        return { kind: "throw_distance", distance: q(av, "m") };
      case "reach_distance":
        if (av == null) return null;
        return { kind: "reach_distance", distance: q(av, "m") };
      case "rom":
        if (av == null) return null;
        return { kind: "rom", angle: q(av, "degree") };
      default:
        return null;
    }
  };

  const fields = fieldSpec(proto.measure, unit, distUnit);
  const raw = build();

  return (
    <Sheet title="Record a benchmark" onClose={close}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 30 }}>{proto.icon}</span>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.ink }}>{leafLabel}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{proto.category}</div>
        </div>
      </div>

      <div style={{ background: C.inner, border: `1px solid ${C.line2}`, borderRadius: 14, padding: 13, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.55 }}>{proto.instructions}</div>
        {proto.restGuidanceSec > 0 && (
          <div style={{ fontSize: 11, color: C.muted, fontFamily: mono, marginTop: 10 }}>Rest guidance · {proto.restGuidanceSec}s</div>
        )}
      </div>

      <Field label={fields.aLabel} hint={fields.aHint}>
        <NumInput value={a} onChange={setA} placeholder={fields.aPlaceholder} step={fields.aStep} />
      </Field>
      {fields.bLabel && (
        <Field label={fields.bLabel} hint={fields.bHint}>
          <NumInput value={b} onChange={setB} placeholder={fields.bPlaceholder} />
        </Field>
      )}

      <PrimaryButton disabled={!raw} onClick={() => { if (raw) { s.addBenchmark(leafId, raw); setA(""); setB(""); } }}>
        Save result
      </PrimaryButton>
    </Sheet>
  );
}

// Most direct leaves run/sprint over a fixed distance — surface a sensible default.
function defaultLeafDistance(leafId: LeafId): number {
  if (leafId === "aerobic.5k") return 5;
  if (leafId === "aerobic.mile") return 1.609;
  return 0;
}

// Field config per measure kind. `a` is the primary capture, `b` the secondary.
function fieldSpec(measure: string, unit: Unit, distUnit: Unit) {
  switch (measure) {
    case "max_load":
      return { aLabel: "Load (kg)", aPlaceholder: "100", aStep: "0.5", bLabel: "Reps in that set", bPlaceholder: "1", bHint: "1–5 reps is fine — Peak estimates your 1RM via Epley." } as const;
    case "rep_max":
      return { aLabel: "Max reps", aPlaceholder: "0" } as const;
    case "hold_duration":
    case "balance_hold":
      return { aLabel: "Duration (sec)", aPlaceholder: "60" } as const;
    case "time_for_distance":
      return { aLabel: `Distance (${distUnit})`, aPlaceholder: "5", aStep: "0.01", aHint: "Leave blank to use the standard distance.", bLabel: "Finishing time (sec)", bPlaceholder: "1500" } as const;
    case "sprint_time":
      return { aLabel: "Distance (m)", aPlaceholder: "400", bLabel: "Time (sec)", bPlaceholder: "60" } as const;
    case "distance_in_time":
      return { aLabel: "Distance (m)", aPlaceholder: "250", bLabel: "Duration (sec)", bPlaceholder: "60" } as const;
    case "vo2_proxy":
      return { aLabel: "VO₂max (ml/kg/min)", aPlaceholder: "45", aStep: "0.1" } as const;
    case "jump_height":
      return { aLabel: `Measurement (${unit})`, aPlaceholder: "0.55", aStep: "0.01" } as const;
    case "throw_distance":
    case "reach_distance":
      return { aLabel: "Distance (m)", aPlaceholder: "0.5", aStep: "0.01" } as const;
    case "rom":
      return { aLabel: "Angle (degrees)", aPlaceholder: "120" } as const;
    default:
      return { aLabel: "Value", aPlaceholder: "0" } as const;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GOAL SHEET (§6.8)
// ─────────────────────────────────────────────────────────────────────────────
const EMOJI = ["🎯", "💪", "🏃", "🔥", "🏋️", "🧗", "⚡", "🦵", "🫁", "🧘"];

export function GoalSheet() {
  const s = usePeak();
  const [name, setName] = useState("");
  const [dimension, setDimension] = useState<DimensionId>("strength");
  const [icon, setIcon] = useState("🎯");
  const [targetLeafId, setTargetLeafId] = useState<LeafId | "">("");
  const [targetPct, setTargetPct] = useState("");

  if (!s.goalOpen) return null;

  const performed = DIMENSIONS.filter((d) => d.performed);
  const leafOptions = Object.values(LEAF_BY_ID).filter((l) => l.dimension === dimension && !l.deferred);

  const close = () => {
    setName(""); setDimension("strength"); setIcon("🎯"); setTargetLeafId(""); setTargetPct("");
    s.set({ goalOpen: false });
  };

  const save = () => {
    const pct = num(targetPct);
    s.addGoal({
      name, dimension, icon,
      targetLeafId: targetLeafId || undefined,
      targetPercentileRaw: pct != null ? Math.max(0, Math.min(0.99, pct / 100)) : undefined,
    });
    setName(""); setDimension("strength"); setIcon("🎯"); setTargetLeafId(""); setTargetPct("");
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

      <Field label="Icon">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {EMOJI.map((e) => (
            <button key={e} onClick={() => setIcon(e)}
              style={{ fontSize: 18, width: 40, height: 40, borderRadius: 10, cursor: "pointer",
                border: `1px solid ${icon === e ? C.accent : C.line2}`, background: icon === e ? `${C.accent}1f` : C.inner }}>
              {e}
            </button>
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
