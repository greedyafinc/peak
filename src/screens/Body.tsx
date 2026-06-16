// Peak — BODY screen (§3 + §4.3).
//   A) Inferred per-muscle strength heat map (§4.3) — fed passively by logged sets.
//   B) Body composition (§3.3–§3.6) — FFMI + BF band, ideal weight rises with muscle.
import { useMemo } from "react";
import { usePeak } from "../store";
import { C, mono, heat } from "../theme";
import {
  Card, TierBadge, StatTile, SectionTitle, Kicker, Chip, PrimaryButton,
  ConfidenceMeter, PercentileBar, pctLabel, pct100,
} from "../components/ui";
import { tierForPercentile } from "../engine";
import { BodyMap, type BodyMuscle } from "../viz/BodyMap";
import { MUSCLE_TO_SVG, SVG_TO_MUSCLE } from "../data/muscleMap";
import { ALL_MUSCLES } from "../data/capabilityTree";
import { fmtWeight, kgToDisplay, weightUnit } from "../units";
import type { BfBand, BandDefinition, MuscleGroup, MuscleGroupEstimate } from "../types";

const SCREEN: React.CSSProperties = {
  position: "absolute", inset: 0, overflowY: "auto", padding: "58px 0 104px",
  animation: "scrIn .28s ease",
};
const PAD: React.CSSProperties = { padding: "0 18px" };

const BAND_LABEL: Record<BfBand, string> = {
  essential: "Essential", athletic: "Athletic", fitness: "Fitness", average: "Average", high: "High",
};
const BAND_COLOR: Record<BfBand, string> = {
  essential: C.blue, athletic: C.mint, fitness: C.accent, average: C.orange, high: C.red,
};

export function Body() {
  const s = usePeak();
  const { data } = s;
  const sys = data.unitSystem;
  const comp = data.biometric?.latestComposition ?? null;

  // ── A) muscle heat map data ────────────────────────────────────────────────
  const muscles: BodyMuscle[] = useMemo(() => {
    const out: BodyMuscle[] = [];
    const seen = new Set<string>();
    for (const mg of ALL_MUSCLES) {
      const est = data.muscleEstimates[mg];
      const tested = !!est && est.percentileRaw != null;
      const score = tested ? pct100(est!.percentileRaw) : 0;
      for (const key of MUSCLE_TO_SVG[mg].svgKeys) {
        // Multiple MuscleGroups can share an SVG key (delts). Keep the strongest.
        if (seen.has(key)) {
          const prev = out.find((m) => m.id === key);
          if (prev && tested && (prev.untested || score > prev.score)) {
            prev.score = score; prev.untested = false;
          }
          continue;
        }
        seen.add(key);
        out.push({ id: key, score, untested: !tested });
      }
    }
    return out;
  }, [data.muscleEstimates]);

  // ── selected muscle detail ─────────────────────────────────────────────────
  const selMg: MuscleGroup | null = s.selMuscle ? SVG_TO_MUSCLE[s.selMuscle] ?? null : null;
  const selEst: MuscleGroupEstimate | undefined = selMg ? data.muscleEstimates[selMg] : undefined;
  const selLabel = s.selMuscle
    ? (selMg ? MUSCLE_TO_SVG[selMg].label : s.selMuscle)
    : null;

  return (
    <div style={SCREEN}>
      <div style={PAD}>
        <Kicker>Body Map · §4.3</Kicker>
        <div style={{ height: 8 }} />
        <SectionTitle sub="Per-muscle strength inferred from the sets you log — never a guess about an untested area.">
          Strength heat map
        </SectionTitle>
      </div>

      {/* ── Front / Back toggle ── */}
      <div style={{ ...PAD, display: "flex", gap: 8, marginBottom: 4 }}>
        <Chip active={s.bodyView === "front"} onClick={() => s.set({ bodyView: "front" })}>Front</Chip>
        <Chip active={s.bodyView === "back"} onClick={() => s.set({ bodyView: "back" })}>Back</Chip>
      </div>

      {/* ── Heat map ── */}
      <div style={{ ...PAD, paddingTop: 6, paddingBottom: 10 }}>
        <Card style={{ padding: "16px 12px 12px", background: C.inner }}>
          <BodyMap muscles={muscles} selected={s.selMuscle} onSelect={s.selectMuscle} view={s.bodyView} />
          <Legend />
        </Card>
      </div>

      {/* ── Selected muscle detail ── */}
      {selLabel && (
        <div style={{ ...PAD, paddingBottom: 12 }}>
          <Card glow={selEst?.tier ? heat(pct100(selEst.percentileRaw)) : undefined}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.ink, letterSpacing: "-0.3px" }}>{selLabel}</div>
              <TierBadge tier={selEst?.percentileRaw != null ? tierForPercentile(selEst.percentileRaw) : null} small />
            </div>

            {selEst && selEst.percentileRaw != null ? (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12 }}>
                  <div style={{ fontFamily: mono, fontSize: 30, fontWeight: 700, color: heat(pct100(selEst.percentileRaw)) }}>
                    {pctLabel(selEst.percentileRaw)}
                  </div>
                  <div style={{ fontSize: 12, color: C.sub }}>percentile vs your build</div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <PercentileBar percentile={selEst.percentileRaw} confidence={selEst.confidence} color={heat(pct100(selEst.percentileRaw))} height={9} />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 13 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px" }}>Est. working strength</span>
                    <span style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: C.ink }}>
                      {selEst.estStrength ? fmtWeight(selEst.estStrength.value, sys, 0) : "—"}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                    <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px" }}>Confidence</span>
                    <ConfidenceMeter confidence={selEst.confidence} />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: C.sub, marginTop: 14, lineHeight: 1.5, borderTop: `1px solid ${C.line2}`, paddingTop: 12 }}>
                  Inferred from your logged sets — log more sets that train this muscle to sharpen it.
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: C.sub, marginTop: 12, lineHeight: 1.5 }}>
                <span style={{ color: C.muted, fontFamily: mono, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.6px" }}>Untested</span>
                <div style={{ marginTop: 6 }}>Log sets that train this muscle and Peak will infer its strength here — no fabricated score until you do.</div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── B) Body composition ── */}
      <div style={{ ...PAD, paddingTop: 14 }}>
        <Kicker>Body Composition · §3</Kicker>
        <div style={{ height: 8 }} />
        <SectionTitle sub="Fat-vs-lean — FFMI and a healthy body-fat band, never BMI. Bodyweight is never used to score strength.">
          Composition
        </SectionTitle>
      </div>

      {comp && comp.ffmi && comp.bodyFatPct ? (
        <Composition comp={comp} />
      ) : (
        <div style={{ ...PAD }}>
          <Card style={{ textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Unlock composition</div>
            <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.5, marginBottom: 16 }}>
              Add your bodyweight & body-fat to unlock FFMI, your body-fat band, and a muscle-aware ideal-weight range.
              We never use bodyweight to score your strength.
            </div>
            <PrimaryButton onClick={() => s.set({ benchOpen: true, benchLeaf: "body_composition.ffmi" })}>
              Add composition
            </PrimaryButton>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Weak → strong legend ──────────────────────────────────────────────────────
function Legend() {
  const stops = [30, 45, 58, 72, 83, 92];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 10, color: C.muted, fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.6px" }}>Weak</span>
      <div style={{ display: "flex", borderRadius: 6, overflow: "hidden" }}>
        {stops.map((v) => (
          <div key={v} style={{ width: 22, height: 8, background: heat(v) }} />
        ))}
      </div>
      <span style={{ fontSize: 10, color: C.muted, fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.6px" }}>Strong</span>
      <span style={{ width: 11, height: 11, borderRadius: 3, background: "#23262d", marginLeft: 6 }} />
      <span style={{ fontSize: 10, color: C.muted, fontFamily: mono }}>untested</span>
    </div>
  );
}

// ── Composition block ───────────────────────────────────────────────────────
function Composition({ comp }: { comp: NonNullable<ReturnType<typeof usePeak>["data"]["biometric"]>["latestComposition"] }) {
  const sys = usePeak().data.unitSystem;
  if (!comp || !comp.ffmi || !comp.bodyFatPct) return null;
  const ffmiTier = comp.ffmiPercentile != null ? tierForPercentile(comp.ffmiPercentile) : null;
  const band = comp.bandDefinition;
  const ideal = comp.derivedIdealWeight;

  return (
    <div style={PAD}>
      {/* stat tiles */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <StatTile value={comp.ffmi.value.toFixed(1)} label="FFMI kg/m²" color={C.accent} />
        <StatTile value={`${comp.bodyFatPct.value.toFixed(0)}%`} label="Body fat" color={C.mint} />
        <StatTile value={comp.leanMass ? `${kgToDisplay(comp.leanMass.value, sys, 0)}` : "—"} label={`Lean mass ${weightUnit(sys)}`} color={C.blue} />
      </div>

      {/* FFMI card */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Fat-Free Mass Index</div>
          <TierBadge tier={ffmiTier} small />
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
          <span style={{ fontFamily: mono, fontSize: 26, fontWeight: 700, color: C.ink }}>{comp.ffmi.value.toFixed(1)}</span>
          <span style={{ fontSize: 12, color: C.sub }}>kg/m² · {pctLabel(comp.ffmiPercentile ?? null)} percentile</span>
        </div>
        <PercentileBar percentile={comp.ffmiPercentile ?? null} confidence={comp.provenance.confidence} color={C.accent} height={9} />
        <div style={{ fontSize: 12, color: C.sub, marginTop: 11, lineHeight: 1.5 }}>
          Lean mass relative to your height — Peak's muscularity signal. More muscle for your frame moves this up.
        </div>
      </Card>

      {/* BF band visual */}
      {band && comp.bfBand && (
        <Card style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Body-fat band</div>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase",
              padding: "4px 10px", borderRadius: 20, color: BAND_COLOR[comp.bfBand], background: `${BAND_COLOR[comp.bfBand]}1f`,
            }}>
              {BAND_LABEL[comp.bfBand]}
            </span>
          </div>
          <BfBandBar band={band} bf={comp.bodyFatPct.value / 100} />
          <div style={{ fontSize: 12, color: C.sub, marginTop: 14, lineHeight: 1.5 }}>
            Scored against a healthy target band — never "leaner is always better". The essential floor is the lower limit you should not cross.
          </div>
        </Card>
      )}

      {/* ideal weight as a goal */}
      {ideal && (
        <Card glow={C.mint}>
          <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 }}>Muscle-aware ideal weight</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontFamily: mono, fontSize: 24, fontWeight: 700, color: C.mint }}>
              {kgToDisplay(ideal.low.value, sys, 0)}–{kgToDisplay(ideal.high.value, sys, 0)}
            </span>
            <span style={{ fontSize: 13, color: C.sub }}>{weightUnit(sys)}</span>
          </div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 10, lineHeight: 1.5 }}>
            Ideal weight rises with muscle — it's a target, never a judgment. As your lean mass grows, this range moves up with you.
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Horizontal BF band bar with 5 edges + marker + essential floor ────────────
function BfBandBar({ band, bf }: { band: BandDefinition; bf: number }) {
  const order: BfBand[] = ["essential", "athletic", "fitness", "average", "high"];
  // Overall axis from the low edge of essential to the high edge of `high`.
  const lo = band.edges.essential[0];
  const hi = band.edges.high[1];
  const span = Math.max(0.0001, hi - lo);
  const pos = (v: number) => Math.max(0, Math.min(100, ((v - lo) / span) * 100));
  const markerPct = pos(bf);
  const floorPct = pos(band.essentialFloorBf);

  return (
    <div>
      {/* segmented bar */}
      <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", position: "relative" }}>
        {order.map((b) => {
          const [e0, e1] = band.edges[b];
          const w = ((Math.min(e1, hi) - Math.max(e0, lo)) / span) * 100;
          return <div key={b} style={{ width: `${w}%`, background: `${BAND_COLOR[b]}cc` }} />;
        })}
        {/* essential floor tick */}
        <div style={{ position: "absolute", left: `${floorPct}%`, top: -2, bottom: -2, width: 2, background: C.ink, opacity: 0.7 }} />
        {/* user marker */}
        <div style={{
          position: "absolute", left: `calc(${markerPct}% - 7px)`, top: -3,
          width: 14, height: 20, borderRadius: 4, background: C.ink,
          border: `2px solid ${C.screen}`, boxShadow: "0 0 8px rgba(0,0,0,0.6)",
        }} />
      </div>
      {/* labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        {order.map((b) => (
          <span key={b} style={{ fontSize: 9, color: C.muted, fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.3px" }}>
            {BAND_LABEL[b]}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: C.sub, fontFamily: mono }}>
        <span>floor {Math.round(band.essentialFloorBf * 100)}%</span>
        <span style={{ color: C.ink }}>you {Math.round(bf * 100)}%</span>
      </div>
    </div>
  );
}
