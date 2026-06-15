// Peak — body-composition distributions: FFMI and body-fat % band (§3.3, §3.6).
// Conditioned on sex + age ONLY (NOT height — FFMI already divides lean by height²,
// §3.3). These are populated from the composition snapshot (biometrics), not a timed
// test. Higher FFMI is better (toward the natural ceiling). The bf_band leaf is
// special: it is scored against a TARGET BAND with a healthy floor (§3.6), not
// "leaner is always better" — so the Gaussian here describes the population BF%
// distribution (used for a percentile readout), while the BandDefinition carries the
// scoring edges + essential floor + target center the engine actually scores against.
//
// NOTE: the engine imports `bandDefinitionForSex` from this module per the data↔engine
// contract; that export (and its band-edge values) is preserved below.
//
// Sources:
//   FFMI: Kouri/Pope 1995 (157 athletes; natural mean ~21.8, no drug-free >25.0);
//         egym FFMI norms. Natural drug-free ceiling ~25 (men), ~22 (women).
//   BF% bands: ACSM/ACE categories; Gallagher et al. 2000 age-adjusted healthy bands;
//              ACSM essential-fat floor ~5% men / ~12% women.

import type { BandDefinition, Cohort, CohortDist, LeafId, Sex } from "../../types";
import { BLEND_K } from "../../constants";
import { interp, makeDistId, sexKey, firstPartyWeight } from "./_shared";

// ── Body-fat band definitions per sex (ACSM/ACE; §3.6 / §3.7) ──────────────────
// edges are [lo, hi) fractions; essentialFloorBf is the hard physiological minimum;
// targetCenterBf is the §3.4 ideal-weight center (center of the athletic/healthy band).
const BAND_DEFINITION: Record<"male" | "female", BandDefinition> = {
  male: {
    sex: "male",
    source: "ACSM",
    essentialFloorBf: 0.05,
    edges: {
      essential: [0.02, 0.06],
      athletic: [0.06, 0.13],
      fitness: [0.13, 0.18],
      average: [0.18, 0.25],
      high: [0.25, 1.0],
    },
    targetCenterBf: 0.12,
  },
  female: {
    sex: "female",
    source: "ACSM",
    essentialFloorBf: 0.12,
    edges: {
      essential: [0.1, 0.14],
      athletic: [0.14, 0.21],
      fitness: [0.21, 0.25],
      average: [0.25, 0.32],
      high: [0.32, 1.0],
    },
    targetCenterBf: 0.2,
  },
};

/** §3.6 — exported helper (data↔engine contract): the numeric band definition for a
 *  sex (machine-readable, denormalized onto each composition record so an AI can reason
 *  about band position and the §3.6.1 essential-floor guard from the record alone).
 *  Accepts the full `Sex` union; `unspecified` falls back to male-coded bands. */
export function bandDefinitionForSex(sex: Sex): BandDefinition {
  return BAND_DEFINITION[sexKey(sex)];
}

// ── FFMI population means (kg/m²) by sex × age ─────────────────────────────────
// General population mean (untrained-ish); women ~2–3 points lower. Mild age decline.
const FFMI_MEAN: Record<"male" | "female", { x: number; y: number }[]> = {
  male: [
    { x: 25, y: 19.0 },
    { x: 40, y: 18.8 },
    { x: 55, y: 18.3 },
    { x: 70, y: 17.5 },
  ],
  female: [
    { x: 25, y: 15.5 },
    { x: 40, y: 15.3 },
    { x: 55, y: 15.0 },
    { x: 70, y: 14.3 },
  ],
};

// Population BF% mean (fraction) by sex × age (Gallagher 2000 healthy-band centers,
// nudged toward the broader population which trends higher).
const BF_MEAN: Record<"male" | "female", { x: number; y: number }[]> = {
  male: [
    { x: 25, y: 0.18 },
    { x: 45, y: 0.21 },
    { x: 65, y: 0.24 },
  ],
  female: [
    { x: 25, y: 0.27 },
    { x: 45, y: 0.3 },
    { x: 65, y: 0.33 },
  ],
};

export function compositionCohortDist(leafId: LeafId, cohort: Cohort): CohortDist | null {
  const sk = sexKey(cohort.sex);
  const K = BLEND_K.body_composition;
  const nObserved = 0;
  const fpw = firstPartyWeight(nObserved, K);
  const age = cohort.ageYears;
  const sexNote =
    cohort.sex === "unspecified" ? ["Sex unspecified → male-coded norms used as fallback."] : [];

  const base = {
    curveProvenance: "seed_population" as const,
    K,
    nObserved,
    firstPartyWeight: fpw,
    distributionId: makeDistId(leafId, cohort),
  };

  if (leafId === "body_composition.ffmi") {
    const mean = interp(age, FFMI_MEAN[sk]);
    return {
      ...base,
      mean,
      sd: sk === "female" ? 2.0 : 2.3, // natural range ~16.7–25; SD ~2–2.3
      lowerIsBetter: false,
      seedSources: ["NHANES_DEXA", "NHANES_ANTHRO", "ACSM"],
      confidenceBasis: 0.85,
      dataSourceLabel:
        "FFMI norms (lean mass / height²): Kouri/Pope athlete data + NHANES DEXA. " +
        "Natural drug-free ceiling ~25 (men) / ~22 (women).",
      assumptions: [
        "Conditioned on sex + age only — height already divided out in FFMI (§3.3); not conditioned on height again.",
        "Populated from the composition snapshot (lean mass derived from bodyweight × (1−BF%)), not a timed test.",
        "NHANES DEXA vintage caveat applies (§5.4).",
        ...sexNote,
      ],
    };
  }

  if (leafId === "body_composition.bf_band") {
    const mean = interp(age, BF_MEAN[sk]);
    return {
      ...base,
      mean,
      sd: sk === "female" ? 0.06 : 0.055, // ~5.5–6% BF spread
      // NOTE: lowerIsBetter=true gives a naive population percentile (less fat = higher
      // population rank), but the ENGINE scores bf_band against the target band with a
      // healthy floor (§3.6) — it must NOT reward sub-essential leanness. The
      // BandDefinition is the authoritative scoring object; this Gaussian is a readout.
      lowerIsBetter: true,
      seedSources: ["NHANES_DEXA", "ACSM", "CDC"],
      confidenceBasis: 0.85,
      dataSourceLabel:
        "Body-fat % norm bands (ACSM/ACE), age-adjusted (Gallagher 2000); essential floor ~5% men / ~12% women.",
      assumptions: [
        "Conditioned on sex + age. Populated from the composition snapshot, not a timed test.",
        "SCORED AS A TARGET BAND WITH A HEALTHY FLOOR (§3.6) — NOT 'leaner is always better'. " +
          "Below the essential-fat floor the reward reverses; this Gaussian is a population readout only.",
        "BandDefinition (edges + essentialFloorBf + targetCenterBf) carried for machine-readable scoring.",
        "NHANES DEXA vintage caveat applies (§5.4).",
        ...sexNote,
      ],
    };
  }

  return null;
}
