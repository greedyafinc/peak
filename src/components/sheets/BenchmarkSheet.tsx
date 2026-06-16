// Peak — benchmark capture bottom sheet (§4.1, §4.2). Gated on the store's benchOpen
// flag, built on the shared Sheet shell. (Split out of the former Sheets.tsx.)
import { useEffect, useState } from "react";
import { usePeak } from "../../store";
import { C, mono } from "../../theme";
import { Sheet, Field, Chip, PrimaryButton, UnitToggle, DurationInput } from "../ui";
import { est1RM } from "../../engine/math";
import { BENCHMARK_BY_LEAF, standardDistanceKm, eventNeedsHours } from "../../data/benchmarks";
import { variantsForLeaf } from "../../data/benchmarkVariants";
import { LEAF_BY_ID } from "../../data/capabilityTree";
import type { RawMeasurement, Unit, Quantity } from "../../types";
import {
  kgToDisplay, lengthToMeters, lengthUnit, paceLabel, weightToKg, weightUnit,
} from "../../units";
import { NumInput, num } from "./shared";

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
    const equivKg = (raw.reps > 1 ? est1RM(raw.load.value, raw.reps) : raw.load.value) * activeVariant.toStandardFactor;
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
