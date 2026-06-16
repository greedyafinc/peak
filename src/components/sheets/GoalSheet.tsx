// Peak — goal builder bottom sheet (§6.8). Gated on the store's goalOpen flag,
// built on the shared Sheet shell. (Split out of the former Sheets.tsx.)
import { useState } from "react";
import { usePeak } from "../../store";
import { Sheet, Field, Chip, PrimaryButton, inputStyle } from "../ui";
import { LEAF_BY_ID, DIMENSIONS } from "../../data/capabilityTree";
import type { DimensionId, LeafId } from "../../types";
import { NumInput, num } from "./shared";

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
