// Peak — Onboarding (§4.5): the two-part baseline + first significant score.
// A multi-step flow — welcome → connect health → immutable build → composition
// → modular untimed benchmark — building an OnboardInput and routing to Score.

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { usePeak, type OnboardInput } from "../store";
import { SCREEN_STYLE, contentPad } from "./layoutPresets";
import { BENCHMARKS, eventNeedsHours } from "../data/benchmarks";
import { variantsForLeaf } from "../data/benchmarkVariants";
import { LEAF_BY_ID, DIM_META, isDimensionEnabled } from "../data/capabilityTree";
import type { BenchmarkProtocol, LeafId, RawMeasurement, Sex } from "../types";
import { buildRaw, valueField, type BenchEntry } from "../engine/benchmarkInput";
import { C, mono, sans, radius } from "../theme";
import {
  Card,
  Chip,
  DurationInput,
  Field,
  Kicker,
  PrimaryButton,
  UnitToggle,
  inputStyle,
} from "../components/ui";
import {
  cmToFtIn,
  ftInToCm,
  kgToLb,
  lbToKg,
  weightUnit,
} from "../units";

// ── Step model ────────────────────────────────────────────────────────────────
const STEPS = ["Welcome", "Health", "Build", "Composition", "Baseline"] as const;
type StepName = (typeof STEPS)[number];

// Starter protocols (excluding derived composition leaves — those come from step 4).
const STARTERS: BenchmarkProtocol[] = BENCHMARKS.filter(
  (b) => b.starter && b.measure !== "composition" && isDimensionEnabled(b.dimension),
);

// Onboarding has a shorter bottom safe-area than the tabbed screens (no bottom
// nav), so it overrides SCREEN_STYLE's bottom padding; the gutter is 22, not 18.
const pageWrap: CSSProperties = { ...SCREEN_STYLE, padding: "58px 0 28px" };
const content: CSSProperties = contentPad(22);

export function Onboarding() {
  const s = usePeak();
  const sys = s.data.unitSystem;
  const [step, setStep] = useState(0);

  // Form state
  const [healthConnected, setHealthConnected] = useState<boolean | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [heightCm, setHeightCm] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [bodyweightKg, setBodyweightKg] = useState("");
  const [bodyFatPct, setBodyFatPct] = useState("");
  const [bench, setBench] = useState<Record<LeafId, BenchEntry>>({});

  const stepName: StepName = STEPS[step];

  const buildValid = !!sex && Number(heightCm) > 50 && !!birthDate;

  const enteredBenchmarks = useMemo(() => {
    const out: { leafId: LeafId; raw: RawMeasurement }[] = [];
    for (const p of STARTERS) {
      const raw = buildRaw(p, bench[p.leafId] ?? {}, sys);
      if (raw) out.push({ leafId: p.leafId, raw });
    }
    return out;
  }, [bench, sys]);

  function finish() {
    const input: OnboardInput = {
      sex: sex ?? "unspecified",
      heightCm: Number(heightCm),
      birthDate,
      bodyweightKg: bodyweightKg !== "" ? Number(bodyweightKg) : null,
      bodyFatPct: bodyFatPct !== "" ? Number(bodyFatPct) : null,
      compMethod: bodyFatPct !== "" ? "bia" : "none",
      healthConnected: !!healthConnected,
      benchmarks: enteredBenchmarks,
    };
    s.completeOnboarding(input);
  }

  function next() {
    if (step < STEPS.length - 1) setStep((n) => n + 1);
    else finish();
  }
  function back() {
    if (step > 0) setStep((n) => n - 1);
  }

  // Per-step continue gating.
  const canContinue =
    stepName === "Welcome"
      ? true
      : stepName === "Health"
        ? healthConnected !== null
        : stepName === "Build"
          ? buildValid
          : true; // Composition + Baseline are skippable

  return (
    <div style={pageWrap}>
      {/* Progress */}
      <div style={{ ...content, marginBottom: 22 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: i <= step ? C.accent : C.line2,
                transition: "background .25s",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <div style={{ fontFamily: mono, fontSize: 11, color: C.muted, letterSpacing: "1.5px", textTransform: "uppercase" }}>
            Step {step + 1} / {STEPS.length}
          </div>
          {step > 0 && (
            <button
              onClick={back}
              style={{ background: "none", border: "none", color: C.sub, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "4px 0" }}
            >
              ← Back
            </button>
          )}
        </div>
      </div>

      <div style={content}>
        {stepName === "Welcome" && <WelcomeStep />}
        {stepName === "Health" && (
          <HealthStep
            connected={healthConnected}
            onConnect={() => setHealthConnected(true)}
            onManual={() => setHealthConnected(false)}
          />
        )}
        {stepName === "Build" && (
          <BuildStep
            sex={sex}
            setSex={setSex}
            heightCm={heightCm}
            setHeightCm={setHeightCm}
            birthDate={birthDate}
            setBirthDate={setBirthDate}
          />
        )}
        {stepName === "Composition" && (
          <CompositionStep
            bodyweightKg={bodyweightKg}
            setBodyweightKg={setBodyweightKg}
            bodyFatPct={bodyFatPct}
            setBodyFatPct={setBodyFatPct}
          />
        )}
        {stepName === "Baseline" && (
          <BaselineStep bench={bench} setBench={setBench} enteredCount={enteredBenchmarks.length} />
        )}
      </div>

      {/* Footer CTA */}
      <div style={{ ...content, marginTop: 26 }}>
        <PrimaryButton onClick={next} disabled={!canContinue}>
          {stepName === "Welcome"
            ? "Begin"
            : stepName === "Baseline"
              ? enteredBenchmarks.length > 0
                ? `See my score · ${enteredBenchmarks.length} logged`
                : "Skip to my score"
              : "Continue"}
        </PrimaryButton>
        {stepName === "Baseline" && (
          <div style={{ textAlign: "center", fontSize: 11, color: C.muted, marginTop: 12, lineHeight: 1.5 }}>
            Coverage is shown as opportunity, never a penalty. Your picture sharpens over time.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step 1: Welcome ─────────────────────────────────────────────────────────
function WelcomeStep() {
  const diff = [
    { t: "Build-relative", d: "Compared only to people of your exact frame — sex, height, age." },
    { t: "Never your bodyweight", d: "Getting fitter never changes your frame, so the score is real capability." },
    { t: "Honest gaps", d: "Untested is shown as opportunity, never scored as zero." },
  ];
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Kicker>Capability meter</Kicker>
      </div>
      <div
        style={{
          fontFamily: sans,
          fontSize: 56,
          fontWeight: 800,
          letterSpacing: "-2.5px",
          lineHeight: 0.95,
          color: C.ink,
          marginBottom: 14,
        }}
      >
        PEAK
      </div>
      <div style={{ fontSize: 18, lineHeight: 1.4, color: C.ink2, fontWeight: 500, marginBottom: 26 }}>
        Measure how close you are to your full physical potential — and how to close the gap.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {diff.map((x) => (
          <Card key={x.t} style={{ padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: C.accent, marginTop: 5, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{x.t}</div>
              <div style={{ fontSize: 12.5, color: C.sub, marginTop: 2, lineHeight: 1.45 }}>{x.d}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Step 2: Connect health ────────────────────────────────────────────────────
function HealthStep({ connected, onConnect, onManual }: { connected: boolean | null; onConnect: () => void; onManual: () => void }) {
  return (
    <div>
      <StepHead title="Connect your health data" sub="Peak reads height, bodyweight & composition passively. You never log bodyweight by hand." />
      <div style={{ height: 12 }} />
      <button
        onClick={onConnect}
        style={{
          width: "100%",
          padding: 16,
          borderRadius: radius.xl,
          border: connected === true ? `1.5px solid ${C.accent}` : `1px solid ${C.line2}`,
          background: connected === true ? `${C.accent}1a` : C.card,
          color: C.ink,
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <span style={{ color: connected === true ? C.accent : C.ink }}>{connected === true ? "✓ Apple Health connected" : "Connect Apple Health"}</span>
      </button>
      <button
        onClick={onManual}
        style={{
          width: "100%",
          padding: 14,
          borderRadius: 14,
          border: connected === false ? `1.5px solid ${C.blue}` : `1px solid ${C.line2}`,
          background: connected === false ? `${C.blue}14` : "transparent",
          color: connected === false ? C.blue : C.sub,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {connected === false ? "✓ Entering manually" : "Enter manually instead"}
      </button>
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 18, lineHeight: 1.5, textAlign: "center" }}>
        Auto-ingestion is what lets your score recalibrate as your build changes. You can connect later to upgrade accuracy.
      </div>
    </div>
  );
}

// Round a converted weight to one decimal (lbs/kg display convenience).
const w1 = (n: number): number => Math.round(n * 10) / 10;

// Unit suffix shown inside an input (the absolute-positioned label).
const unitSuffix: CSSProperties = {
  position: "absolute",
  right: 14,
  top: 13,
  fontSize: 13,
  color: C.muted,
  fontFamily: mono,
  pointerEvents: "none",
};

// ── Step 3: Build ───────────────────────────────────────────────────────────
function BuildStep({
  sex,
  setSex,
  heightCm,
  setHeightCm,
  birthDate,
  setBirthDate,
}: {
  sex: Sex | null;
  setSex: (s: Sex) => void;
  heightCm: string;
  setHeightCm: (s: string) => void;
  birthDate: string;
  setBirthDate: (s: string) => void;
}) {
  // Canonical state is always heightCm; the global unitSystem only changes how
  // it's entered.
  const sys = usePeak().data.unitSystem;
  const isImp = sys === "imperial";
  const cmNum = Number(heightCm);
  const hasHeight = cmNum > 50;

  // ft/in have their own local strings so typing "5" then "10" doesn't jitter
  // through a lossy cm round-trip on every keystroke.
  const [feet, setFeet] = useState(() => (hasHeight ? String(cmToFtIn(cmNum).ft) : ""));
  const [inches, setInches] = useState(() => (hasHeight ? String(cmToFtIn(cmNum).inch) : ""));

  // When the user flips to imperial, seed ft/in from the canonical cm so the
  // fields aren't blank. Flipping back to cm needs no seeding (cm is the truth).
  useEffect(() => {
    if (isImp && cmNum > 50) {
      const { ft, inch } = cmToFtIn(cmNum);
      setFeet(String(ft));
      setInches(String(inch));
    }
    // Only re-seed on a unit flip, not on every cm keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isImp]);

  function updateFtIn(f: string, i: string) {
    setFeet(f);
    setInches(i);
    if (f === "" && i === "") {
      setHeightCm("");
      return;
    }
    const cm = ftInToCm(Number(f) || 0, Number(i) || 0);
    setHeightCm(cm > 0 ? String(cm) : "");
  }

  const hint = !hasHeight
    ? undefined
    : isImp
      ? `≈ ${cmNum} cm`
      : (() => {
          const { ft, inch } = cmToFtIn(cmNum);
          return `≈ ${ft}′${inch}″`;
        })();

  return (
    <div>
      <StepHead title="Your build" sub="The immutable frame you're measured against." />
      <Field label="Sex">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Chip active={sex === "male"} onClick={() => setSex("male")}>Male</Chip>
          <Chip active={sex === "female"} onClick={() => setSex("female")}>Female</Chip>
          <Chip active={sex === "unspecified"} onClick={() => setSex("unspecified")}>Prefer not to say</Chip>
        </div>
      </Field>

      <Field label="Height" hint={hint}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <UnitToggle kind="height" />
        </div>
        {!isImp ? (
          <div style={{ position: "relative" }}>
            <input
              style={inputStyle}
              type="number"
              inputMode="numeric"
              placeholder="178"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
            />
            <span style={unitSuffix}>cm</span>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                style={inputStyle}
                type="number"
                inputMode="numeric"
                placeholder="5"
                value={feet}
                onChange={(e) => updateFtIn(e.target.value, inches)}
              />
              <span style={unitSuffix}>ft</span>
            </div>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                style={inputStyle}
                type="number"
                inputMode="numeric"
                placeholder="10"
                value={inches}
                onChange={(e) => updateFtIn(feet, e.target.value)}
              />
              <span style={unitSuffix}>in</span>
            </div>
          </div>
        )}
      </Field>

      <Field label="Birth date">
        <input
          style={{ ...inputStyle, colorScheme: "dark" } as CSSProperties}
          type="date"
          max="2012-12-31"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
        />
      </Field>

      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4, lineHeight: 1.55, background: C.inner, border: `1px solid ${C.line2}`, borderRadius: radius.lg, padding: "12px 14px" }}>
        These define who you're compared against. They're <strong style={{ color: C.sub }}>immutable</strong> — getting fitter never changes your frame, so your score reflects real capability, not just losing weight.
      </div>
    </div>
  );
}

// ── Step 4: Composition (optional) ──────────────────────────────────────────
function CompositionStep({
  bodyweightKg,
  setBodyweightKg,
  bodyFatPct,
  setBodyFatPct,
}: {
  bodyweightKg: string;
  setBodyweightKg: (s: string) => void;
  bodyFatPct: string;
  setBodyFatPct: (s: string) => void;
}) {
  // Canonical state is always kg; the global unitSystem only changes how it's entered.
  const sys = usePeak().data.unitSystem;
  const isImp = sys === "imperial";
  const kgNum = Number(bodyweightKg);
  const hasWeight = bodyweightKg !== "" && kgNum > 0;

  // lbs keeps its own local string so typing doesn't jitter through a lossy
  // kg round-trip on every keystroke.
  const [lbsStr, setLbsStr] = useState(() => (hasWeight ? String(w1(kgToLb(kgNum))) : ""));

  // Re-seed lbs from canonical kg when the user flips to imperial.
  useEffect(() => {
    if (isImp && kgNum > 0) setLbsStr(String(w1(kgToLb(kgNum))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isImp]);

  function updateLbs(v: string) {
    setLbsStr(v);
    const lbs = Number(v);
    if (v === "" || !isFinite(lbs) || lbs <= 0) {
      setBodyweightKg("");
      return;
    }
    setBodyweightKg(String(w1(lbToKg(lbs))));
  }

  const weightHint = !hasWeight
    ? undefined
    : isImp
      ? `≈ ${kgNum} kg`
      : `≈ ${w1(kgToLb(kgNum))} lb`;

  return (
    <div>
      <StepHead title="Composition" sub="Optional — leave blank to skip." />
      <Field label="Bodyweight" hint={weightHint}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <UnitToggle kind="weight" />
        </div>
        <div style={{ position: "relative" }}>
          {!isImp ? (
            <input
              style={inputStyle}
              type="number"
              inputMode="decimal"
              placeholder="—"
              value={bodyweightKg}
              onChange={(e) => setBodyweightKg(e.target.value)}
            />
          ) : (
            <input
              style={inputStyle}
              type="number"
              inputMode="decimal"
              placeholder="—"
              value={lbsStr}
              onChange={(e) => updateLbs(e.target.value)}
            />
          )}
          <span style={unitSuffix}>{weightUnit(sys)}</span>
        </div>
      </Field>
      <Field label="Body fat">
        <div style={{ position: "relative" }}>
          <input
            style={inputStyle}
            type="number"
            inputMode="decimal"
            placeholder="—"
            value={bodyFatPct}
            onChange={(e) => setBodyFatPct(e.target.value)}
          />
          <span style={unitSuffix}>%</span>
        </div>
      </Field>
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4, lineHeight: 1.55, background: C.inner, border: `1px solid ${C.line2}`, borderRadius: radius.lg, padding: "12px 14px" }}>
        Bodyweight is <strong style={{ color: C.sub }}>never</strong> used to score your strength — only to derive body composition (lean mass + fat band). This is the immutable-build principle.
      </div>
    </div>
  );
}

// ── Step 5: Baseline benchmark ──────────────────────────────────────────────
function BaselineStep({
  bench,
  setBench,
  enteredCount,
}: {
  bench: Record<LeafId, BenchEntry>;
  setBench: (b: Record<LeafId, BenchEntry>) => void;
  enteredCount: number;
}) {
  const setEntry = (leafId: LeafId, patch: Partial<BenchEntry>) =>
    setBench({ ...bench, [leafId]: { ...bench[leafId], ...patch } });

  // Group starters by dimension for a scannable layout.
  const byDim = useMemo(() => {
    const groups: Record<string, BenchmarkProtocol[]> = {};
    for (const p of STARTERS) (groups[p.dimension] ??= []).push(p);
    return groups;
  }, []);

  return (
    <div>
      <StepHead
        title="Set your baseline"
        sub="Do as many or as few as you like — there's no time limit."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {Object.entries(byDim).map(([dim, protos]) => {
          const meta = DIM_META[dim as keyof typeof DIM_META];
          return (
            <div key={dim}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: meta?.color ?? C.accent }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                  {meta?.label ?? dim}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {protos.map((p) => (
                  <BenchCard key={p.leafId} p={p} entry={bench[p.leafId] ?? {}} onChange={(patch) => setEntry(p.leafId, patch)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {enteredCount >= 3 && (
        <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: radius.lg, background: `${C.accent}12`, border: `1px solid ${C.accent}33`, fontSize: 12.5, color: C.ink2, fontWeight: 600 }}>
          {enteredCount} tested — enough to unlock your Peak Score.
        </div>
      )}
    </div>
  );
}

function BenchCard({ p, entry, onChange }: { p: BenchmarkProtocol; entry: BenchEntry; onChange: (patch: Partial<BenchEntry>) => void }) {
  const sys = usePeak().data.unitSystem;
  const meta = DIM_META[p.dimension];
  const filled = buildRaw(p, entry, sys) != null;
  const small: CSSProperties = {
    ...inputStyle,
    fontSize: 15,
    padding: "9px 10px",
    textAlign: "center",
  };
  const clear = () => onChange({ a: "", b: "", durSec: null });

  const isLift = p.measure === "max_load";
  const isClock =
    p.measure === "hold_duration" ||
    p.measure === "balance_hold" ||
    p.measure === "time_for_distance" ||
    p.measure === "sprint_time";

  const variants = isLift ? variantsForLeaf(p.leafId) : [];
  const activeVariant = variants.find((v) => v.id === entry.variantId) ?? variants[0];
  const perHand = activeVariant?.entry === "perHand";
  const vf = valueField(p, sys);

  return (
    <Card style={{ padding: 13 }} glow={filled ? meta?.color : undefined}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{LEAF_BY_ID[p.leafId]?.label ?? p.leafId}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{p.category}</div>
        </div>
        {filled && (
          <button onClick={clear} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
            Skip
          </button>
        )}
      </div>

      {/* variant chips for the benchmark lifts */}
      {isLift && variants.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 11 }}>
          {variants.map((v) => (
            <Chip key={v.id} active={activeVariant?.id === v.id} onClick={() => onChange({ variantId: v.id })}>{v.label}</Chip>
          ))}
        </div>
      )}

      {isClock ? (
        <div style={{ marginTop: 11 }}>
          <DurationInput
            valueSec={entry.durSec ?? null}
            onChange={(sec) => onChange({ durSec: sec })}
            showHours={p.measure === "time_for_distance" && eventNeedsHours(p.leafId)}
          />
        </div>
      ) : isLift ? (
        <div style={{ display: "flex", gap: 8, marginTop: 11, alignItems: "flex-end" }}>
          <div style={{ flex: 1.4 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>{perHand ? "Per DB" : "Load"} ({weightUnit(sys)})</span>
              <UnitToggle kind="weight" />
            </div>
            <input style={small} type="number" inputMode="decimal" placeholder={perHand ? "20" : "100"} value={entry.a ?? ""} onChange={(e) => onChange({ a: e.target.value })} />
          </div>
          <div style={{ paddingBottom: 9, color: C.muted, fontSize: 16, fontFamily: mono }}>×</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Reps</div>
            <input style={small} type="number" inputMode="numeric" placeholder="1" value={entry.b ?? ""} onChange={(e) => onChange({ b: e.target.value })} />
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 11 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>{vf.label}</span>
            {vf.unitKind && <UnitToggle kind={vf.unitKind} />}
          </div>
          <input style={small} type="number" inputMode="decimal" placeholder={vf.ph} value={entry.a ?? ""} onChange={(e) => onChange({ a: e.target.value })} />
        </div>
      )}
    </Card>
  );
}

// ── Shared step header ──────────────────────────────────────────────────────
function StepHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: C.ink, letterSpacing: "-0.8px", lineHeight: 1.1 }}>{title}</div>
      <div style={{ fontSize: 14, color: C.sub, marginTop: 7, lineHeight: 1.45 }}>{sub}</div>
    </div>
  );
}
