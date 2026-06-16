// Peak scoring engine — body composition (§3.3–§3.6.1).
//
// Two primitives, never BMI: FFMI (fat-free mass index) captures muscularity,
// the body-fat band captures leanness. Both conditioned only on sex+age (height
// is already divided out of FFMI, §3.3, so it is NOT a conditioning covariate).
// Ideal weight rises with muscle (§3.4). A healthy-floor guard (§3.6.1) prevents
// any mass-relative leaf from rewarding dangerously sub-essential leanness.
//
// PURE / DETERMINISTIC given (inputs, build, asOf).

import type {
  BandDefinition,
  BfBand,
  BuildSnapshot,
  CapabilityLeaf,
  CompMethod,
  CompositionSnapshot,
  MuscleGroup,
  Provenance,
  Quantity,
} from "../types";
import { LEAF_BY_ID } from "../data/capabilityTree";
import { buildCohort } from "./cohort";
import { lookupCohortDist } from "../data/distributions";
import { bandDefinitionForSex } from "../data/distributions/composition";
import { percentileInGaussian, tierForPercentile, cappedOf, leafConfidence, distributionDepthOf } from "./score";
import { round1 } from "./math";
import { PEAK_CAP } from "../constants";

// ── Primitives (§3.3) ───────────────────────────────────────────────────────

/** Lean (fat-free) mass in kg from bodyweight and body-fat fraction. */
export function leanMassKg(bodyweightKg: number, bodyFatPct: number): number {
  const bf = toBfFraction(bodyFatPct);
  return bodyweightKg * (1 - bf);
}

/**
 * §3.3 — FFMI = lean_mass / height_m². We use the RAW (un-normalized) FFMI; the
 * +6.1×(1.8−height_m) height-normalization is intentionally NOT applied here,
 * because §3.3 conditions the FFMI percentile on sex+age and treats height as
 * already divided out by the /height² term. Documenting the choice: raw FFMI
 * keeps height out of the metric exactly once (no double-count), matching the
 * spec's covariate set.
 */
export function ffmiOf(leanMass: number, heightCm: number): number {
  const hM = heightCm / 100;
  if (hM <= 0) return 0;
  return leanMass / (hM * hM);
}

/** §3.6 — which body-fat band a BF% falls into, per the sex's band edges (lower-inclusive). */
export function bfBandOf(bodyFatPct: number, band: BandDefinition): BfBand {
  const bf = toBfFraction(bodyFatPct);
  const order: BfBand[] = ["essential", "athletic", "fitness", "average", "high"];
  for (const b of order) {
    const [lo, hi] = band.edges[b];
    if (bf >= lo && bf < hi) return b;
  }
  // Above the top edge → "high"; below the lowest → "essential".
  return bf < band.edges.essential[0] ? "essential" : "high";
}

/** §3.6.1 — is the user below the essential-fat floor (triggers the guard)? */
export function belowEssentialFloor(bodyFatPct: number, band: BandDefinition): boolean {
  return toBfFraction(bodyFatPct) < band.essentialFloorBf;
}

/**
 * §3.6 — the body-fat value to PERCENTILE against the population BF Gaussian, so the
 * leaf is scored as a TARGET BAND with a healthy floor rather than "leaner is always
 * better". Without this transform a raw `lowerIsBetter` percentile rewards sub-essential
 * leanness as ~99th percentile (the §3.6 violation). The transform:
 *   • above the target center → score the real BF% (leaner reads better through the
 *     overweight→fit range, exactly as the population curve says);
 *   • between the essential floor and the target center → PLATEAU at the target center
 *     (you've reached ideal leanness; being leaner is not "more capable", §3.4);
 *   • below the essential floor → REFLECT past the center (center + (floor − bf)) so a
 *     dangerously-lean reading scores BELOW the healthy target, never above it.
 * Fed through percentileInGaussian with the bf_band dist's lowerIsBetter=true.
 */
export function effectiveBfForScoring(bodyFatPct: number, band: BandDefinition): number {
  const bf = toBfFraction(bodyFatPct);
  const center = band.targetCenterBf;
  const floor = band.essentialFloorBf;
  if (bf >= center) return bf;
  if (bf >= floor) return center;
  return center + (floor - bf);
}

// ── Derived ideal weight (§3.4) ─────────────────────────────────────────────

/**
 * §3.4 — ideal_weight = target_lean / (1 − target_bf). The target BF% is the
 * CENTER of the healthy/athletic band (never the essential floor). We surface a
 * small range around the center (±~2 percentage points of BF, mapped through the
 * same inversion) framed as a goal, never a judgment.
 */
export function idealWeightRange(leanMass: number, band: BandDefinition): { low: Quantity; high: Quantity } {
  const center = band.targetCenterBf;
  // A modest BF spread around the center to express a range rather than a point.
  const spread = 0.02;
  const lowBf = clampFrac(center - spread);
  const highBf = clampFrac(center + spread);
  // Leaner target (lowBf) → lower bodyweight; fatter target (highBf) → higher.
  const wLow = leanMass / (1 - lowBf);
  const wHigh = leanMass / (1 - highBf);
  return {
    low: { value: round1(Math.min(wLow, wHigh)), unit: "kg" },
    high: { value: round1(Math.max(wLow, wHigh)), unit: "kg" },
  };
}

// ── Healthy-floor guard for mass-relative leaves (§3.6.1) ───────────────────

/**
 * §3.6.1 — for a mass-relative leaf, if the user is below the essential-fat
 * floor, recompute the EFFECTIVE raw as if BF% were at the floor: remove the
 * mass advantage gained purely from being sub-floor before percentiling. Raw is
 * preserved unchanged by the caller; only the value fed to the percentiler is
 * adjusted, and provenance is stamped "...+floor_guard".
 *
 * Approximation (documented): a sub-floor athlete's bodyweight would rise to
 * `floorAdjustedBodyweight = leanMass / (1 − floorBf)` if topped back up to the
 * floor. Mass-relative performance scales ~ (bodyweight)^(-k) (lighter → better),
 * so we scale the raw by (actualBW / floorBW)^k toward what it would be at the
 * floor. k = 1/3 is used as a conservative allometric exponent on body mass
 * (~mass^(2/3) force vs mass → relative ~ mass^(-1/3)). For lowerIsBetter raws
 * (run/sprint times) the direction inverts: at the heavier floor weight the time
 * would be SLOWER, so the effective raw is scaled UP by the same factor.
 */
export function applyFloorGuard(rawValue: number, build: BuildSnapshot, leaf: CapabilityLeaf): number {
  if (!leaf.massRelative) return rawValue;
  const bw = build.bodyweightKg;
  const bf = build.bodyFatPct;
  if (bw == null || bf == null) return rawValue;

  const band = bandDefinitionForSex(sexForBand(build.sex));
  if (!belowEssentialFloor(bf, band)) return rawValue;

  const lean = leanMassKg(bw, bf);
  const floorBw = lean / (1 - band.essentialFloorBf);
  if (floorBw <= 0 || bw <= 0) return rawValue;

  const k = 1 / 3;
  const factor = Math.pow(bw / floorBw, k); // < 1 (actual is lighter than floor)
  // Determine direction from the cohort distribution if available.
  const cohort = buildCohort(build);
  const dist = lookupCohortDist(leaf.id, cohort);
  const lowerIsBetter = dist?.lowerIsBetter ?? false;

  if (lowerIsBetter) {
    // Heavier (at floor) → slower → larger time. factor<1 ⇒ divide to inflate.
    return rawValue / factor;
  }
  // Heavier (at floor) → less reps/height/VO2 → smaller value. factor<1 ⇒ multiply to shrink.
  return rawValue * factor;
}

// ── Composition snapshot (§3.3–§3.6) ────────────────────────────────────────

export type CompositionOpts = {
  asOf: string;
  /** measurement ladder rung that produced the BF% (dexa > bia > tape > inferred). */
  method?: CompMethod;
  /** existing snapshot, for confidence/recency context (unused in beta beyond ladder). */
};

/**
 * §3.3–§3.6 — build a CompositionSnapshot from bodyweight + (optional) BF%.
 * Fills ffmi, leanMass, bfBand, FFMI/BF percentiles (via lookupCohortDist for
 * body_composition.ffmi / body_composition.bf_band), idealWeight, bandDefinition,
 * measurementLadder, and provenance. When BF% is null we cannot derive lean mass
 * / FFMI / band, so those stay null and source is "untested" (the inferred-from-
 * strength prior path is left to muscularityPrior + a future calibration step).
 */
export function compositionSnapshotFrom(
  bodyweightKg: number,
  bodyFatPct: number | null,
  build: BuildSnapshot,
  opts: CompositionOpts,
): CompositionSnapshot {
  const band = bandDefinitionForSex(sexForBand(build.sex));
  const cohort = buildCohort(build);

  if (bodyFatPct == null) {
    // No fat measurement → composition is low-coverage, NOT zero-filled (§4.5 #3).
    const provenance: Provenance = {
      source: "untested",
      confidence: null,
      asOf: opts.asOf,
      method: "none",
    };
    return {
      bodyweight: { value: round1(bodyweightKg), unit: "kg" },
      bodyFatPct: null,
      ffmi: null,
      leanMass: null,
      bandDefinition: band,
      bfBand: null,
      ffmiPercentile: null,
      bfPercentile: null,
      measurementLadder: "none",
      derivedIdealWeight: undefined,
      provenance,
      measuredAt: opts.asOf,
    };
  }

  const bf = toBfFraction(bodyFatPct);
  const lean = leanMassKg(bodyweightKg, bf);
  const ffmi = ffmiOf(lean, build.heightCm);
  const bfBand = bfBandOf(bf, band);

  // FFMI percentile: higher FFMI = more muscle = better.
  const ffmiDist = lookupCohortDist("body_composition.ffmi", cohort);
  const ffmiPercentile = ffmiDist ? percentileInGaussian(ffmi, ffmiDist) : null;

  // BF band percentile: scored against a target band with a healthy floor (§3.6).
  // effectiveBfForScoring plateaus the reward at the target center and reflects
  // sub-essential leanness back down, so being leaner-than-ideal never out-scores the
  // healthy target — fixing the old monotone "leaner = higher percentile" that read a
  // dangerous 4% body-fat at ~99.8th.
  const bfDist = lookupCohortDist("body_composition.bf_band", cohort);
  const bfPercentile = bfDist
    ? percentileInGaussian(effectiveBfForScoring(bodyFatPct, band), bfDist)
    : null;

  const idealWeight = idealWeightRange(lean, band);
  const ladder: CompMethod = opts.method ?? "inferred_from_strength";

  const provenance: Provenance = {
    source: "measured",
    confidence: ffmiDist
      ? leafConfidence(LEAF_BY_ID["body_composition.ffmi"], ffmiDist, {
          distributionDepth: distributionDepthOf(ffmiDist),
          measurementQuality: measurementQualityForLadder(ladder),
          recency: 1,
          inferenceChainLength: 1,
        })
      : null,
    asOf: opts.asOf,
    method: methodLabelForLadder(ladder),
  };

  return {
    bodyweight: { value: round1(bodyweightKg), unit: "kg" },
    bodyFatPct: { value: round1(bf * 100), unit: "percent" },
    ffmi: { value: round1(ffmi), unit: "kg/m2" },
    leanMass: { value: round1(lean), unit: "kg" },
    bandDefinition: band,
    bfBand,
    ffmiPercentile,
    bfPercentile,
    measurementLadder: ladder,
    derivedIdealWeight: idealWeight,
    provenance,
    measuredAt: opts.asOf,
  };
}

/**
 * §3.5 — the Peak-unique move: infer a muscularity prior from logged strength.
 * Example: benching ~1.4× bodyweight ⇒ demonstrably muscular, revise the lean-
 * mass expectation upward. Returns a [0,1] prior (0.5 = build-median muscularity)
 * or null when there is no usable strength signal / no bodyweight. In the beta
 * this is an explicit prior, never a measurement — always overridden by real
 * composition data and carrying lower confidence at the call site.
 */
export function muscularityPrior(
  estStrengthByMuscle: Partial<Record<MuscleGroup, number>>,
  build: BuildSnapshot,
): number | null {
  const bw = build.bodyweightKg;
  if (bw == null || bw <= 0) return null;

  // Use the chest est-strength (bench proxy) as the headline muscularity signal,
  // falling back to the strongest available group. Map strength-to-bodyweight
  // ratio onto a saturating [0,1] prior centered so ~1.0× BW bench ≈ 0.5.
  const chest = estStrengthByMuscle.chest;
  const best = chest ?? maxVal(estStrengthByMuscle);
  if (best == null) return null;

  const ratio = best / bw; // strength / bodyweight
  // Saturating logistic-ish map: 0.5 at ratio 1.0, ~0.78 at 1.4, ~0.22 at 0.6.
  const prior = 1 / (1 + Math.exp(-2.5 * (ratio - 1.0)));
  return clampFrac(prior);
}

/**
 * §3.3 — score the two body-composition leaves into a {ffmi, bf_band} percentile
 * pair plus tiers/confidence, reusing compositionSnapshotFrom's percentiles. Used
 * by recomputeAll to produce body_composition.* LeafScores.
 */
export function compositionLeafPercentiles(snap: CompositionSnapshot): {
  ffmi: { percentileRaw: number | null; capped: number | null; tier: ReturnType<typeof tierForPercentile> | null };
  bf: { percentileRaw: number | null; capped: number | null; tier: ReturnType<typeof tierForPercentile> | null };
} {
  const fp = snap.ffmiPercentile ?? null;
  const bp = snap.bfPercentile ?? null;
  return {
    ffmi: {
      percentileRaw: fp,
      capped: cappedOf(fp),
      tier: fp == null ? null : tierForPercentile(fp),
    },
    bf: {
      percentileRaw: bp,
      capped: cappedOf(bp),
      tier: bp == null ? null : tierForPercentile(bp),
    },
  };
}

// ── local helpers ───────────────────────────────────────────────────────────

function clampFrac(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Normalize a body-fat input to a FRACTION in [0,1], accepting either convention:
 * a value > 1 is interpreted as a PERCENT (e.g. 15 → 0.15); a value ≤ 1 is already
 * a fraction. All real body-fat values (≈3–50%) disambiguate cleanly. The data
 * layer's BF distribution + band edges are fractions, so this is the single
 * conversion boundary (the canonical UI/type unit for bodyFatPct is percent).
 */
function toBfFraction(v: number): number {
  const f = v > 1 ? v / 100 : v;
  return clampFrac(f);
}

function maxVal(rec: Partial<Record<MuscleGroup, number>>): number | null {
  let m: number | null = null;
  for (const k of Object.keys(rec) as MuscleGroup[]) {
    const v = rec[k];
    if (v != null && (m == null || v > m)) m = v;
  }
  return m;
}

/** unspecified sex → use the male band as a neutral default for the floor math (§5.2 pools elsewhere). */
function sexForBand(sex: BuildSnapshot["sex"]): "male" | "female" {
  return sex === "female" ? "female" : "male";
}

function measurementQualityForLadder(m: CompMethod): number {
  switch (m) {
    case "dexa":
      return 1.0;
    case "bia":
      return 0.85;
    case "tape_navy":
      return 0.7;
    case "inferred_from_strength":
      return 0.45;
    case "none":
      return 0.3;
  }
}

function methodLabelForLadder(m: CompMethod): string {
  return m === "inferred_from_strength" ? "inferred_from_strength" : `composition:${m}`;
}

// PEAK_CAP imported for documentation parity with score.ts capping; re-exported
// nowhere — the cap is applied via cappedOf().
void PEAK_CAP;
