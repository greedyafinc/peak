// Peak — seed-source registry (§5.4). Versioned reference data; each external
// dataset that seeds a cohort distribution is a typed record, never an inlined
// magic number. Referenced by `Provenance.datasetId` and by every `CohortDist`'s
// `seedSources` array, and surfaced verbatim in the methodology note (§5.6) so a
// percentile is ALWAYS labeled with the data backing it.
//
// Roles, vintage notes, and URLs below reflect the real datasets researched for
// the launch seed. The NHANES DEXA vintage caveat is carried explicitly (§5.4).

import type { SeedSource } from "../types";

export const SEED_SOURCES: SeedSource[] = [
  {
    id: "SYMMETRIC_STRENGTH",
    label: "Symmetric Strength",
    dimensions: ["strength"],
    role:
      "Large-population one-rep-max strength standards by sex + BODYWEIGHT (untrained→elite). " +
      "Consumed ONLY through the height-conditioned bridge model (§5.3) — bodyweight-based, " +
      "so it is never used directly as Peak's normalizer (Decision #5). Cross-check readout only.",
    vintageNote: "Bodyweight-based standards; aggregated from logged lifts. Used via bridge, never directly.",
    url: "https://symmetricstrength.com/",
  },
  {
    id: "EXRX",
    label: "ExRx.net Strength Standards",
    dimensions: ["strength"],
    role:
      "Classic bench/squat/deadlift/OHP 1RM standards as multiples of bodyweight, by sex and age " +
      "band. Cross-checked against StrengthLevel (22M+ logged lifts). Feeds the bridge model (§5.3).",
    vintageNote: "Bodyweight-based; secondary cross-check, never the normalizer.",
    url: "https://exrx.net/Testing/WeightLifting/StrengthStandards",
  },
  {
    id: "MILITARY_FITNESS",
    label: "US Military Fitness Tests (Army AFT/ACFT, USMC PFT)",
    dimensions: ["strength", "aerobic", "anaerobic", "muscular_endurance", "power"],
    role:
      "Anchors the athletic right tail / elite thresholds. Push-up, plank, pull-up, run, and jump " +
      "test batteries with published min (60-pt) and max (100-pt) scoring tables by age.",
    vintageNote: "Right-tail anchor only; selected (fit) population, not general-population mean.",
    url: "https://www.army.mil/acft/",
  },
  {
    id: "CDC",
    label: "CDC / NCHS Population Norms",
    dimensions: ["body_composition", "aerobic"],
    role: "Population health/anthropometric norms by age and sex; cardiovascular fitness context.",
    vintageNote: "Current (NHANES cycles).",
    url: "https://www.cdc.gov/nchs/nhanes/",
  },
  {
    id: "WHO",
    label: "World Health Organization Population Norms",
    dimensions: ["body_composition", "aerobic"],
    role: "International population norms by age/sex for body composition and cardiovascular health.",
    vintageNote: "Current.",
    url: "https://www.who.int/data/gho",
  },
  {
    id: "NHANES_DEXA",
    label: "NHANES Whole-Body DEXA Body-Composition",
    dimensions: ["body_composition"],
    role: "DEXA-measured body-fat% norms; a seed for the composition dimension (§3.3).",
    vintageNote:
      "VINTAGE CAVEAT: NHANES whole-body DEXA is from 1999–2006 (partial 2011–2018) and is aging. " +
      "Its vintage and representativeness are surfaced here and its weight is reduced as first-party " +
      "DEXA/BIA data accrues. Treated as a dated reference, not a current authoritative norm.",
    url: "https://wwwn.cdc.gov/nchs/nhanes/",
  },
  {
    id: "NHANES_ANTHRO",
    label: "NHANES / NCHS Anthropometric Reference Data",
    dimensions: ["strength"], // taxonomy lists no "bridge" dimension; the bridge feeds strength.
    role:
      "Height↔weight↔frame relationships powering the strength bridge model (§5.3). Mean " +
      "weight-at-height is used to pick a representative bodyweight for a target (sex, height) cohort.",
    vintageNote: "Current anthropometrics (CDC/NCHS Anthropometric Reference Data, US 2011–2014, Series 3 No. 39).",
    url: "https://www.cdc.gov/nchs/data/series/sr_03/sr03_039.pdf",
  },
  {
    id: "WMA_AGE_GRADED",
    label: "World Masters Athletics Age-Graded Tables",
    dimensions: ["aerobic"],
    role:
      "Age-graded normalization tables for running (high confidence). Open-class standards per " +
      "event/sex scaled by an age factor ≤ 1.0; age-grade % = age_standard ÷ time (§2.2).",
    vintageNote: "Maintained (1989; revised 1994/2006/2010/2015/2023).",
    url: "https://world-masters-athletics.org/",
  },
  {
    id: "BALANCE_NORMS",
    label: "Balance / Postural-Stability Norms",
    dimensions: ["balance"],
    role:
      "Thin published balance norms — single-leg-stance (eyes closed) times (Springer et al. 2007) " +
      "and Y-Balance composite reach (% limb length). Seeds the low-confidence balance launch.",
    vintageNote:
      "THIN SEED — low-confidence launch (§5.6). Study-to-study SD variance is large; first-party " +
      "data needed to harden. Small K so first-party data dominates quickly.",
    url: "https://www.sralab.org/rehabilitation-measures/timed-unipedal-stance-test-single-leg-support-one-leg-stance-test",
  },
  {
    id: "AGILITY_NORMS",
    label: "Agility / Change-of-Direction Norms",
    dimensions: ["agility"],
    role: "Sparse change-of-direction / coordination norms (e.g. 5-10-5 pro agility, T-test).",
    vintageNote: "SPARSEST SEED — lowest confidence; agility is deferred to a later release (§7.3, §7.5).",
    url: "https://www.topendsports.com/testing/tests/505-agility.htm",
  },
  {
    id: "ACSM",
    label: "ACSM / ACE Fitness Norms",
    dimensions: ["muscular_endurance", "aerobic", "mobility", "body_composition"],
    role:
      "ACSM Guidelines norm tables: push-up/curl-up endurance, sit-and-reach flexibility, VO2max " +
      "fitness categories, and body-fat % bands by sex/age. The bedrock general-population seed.",
    vintageNote: "Current (ACSM Guidelines 11th ed.; ACE body-fat categories).",
    url: "https://www.acsm.org/",
  },
  {
    id: "COOPER",
    label: "Cooper Institute (Aerobics Center Longitudinal Study)",
    dimensions: ["aerobic"],
    role:
      "VO2max percentile norms (ml/kg/min) by sex and age decade from 80k+ adults; the primary " +
      "cardiorespiratory-fitness reference behind the ACSM VO2max table.",
    vintageNote: "Maintained; foundational CRF percentile reference.",
    url: "https://www.cooperinstitute.org/",
  },
];

export const SEED_SOURCE_BY_ID = Object.fromEntries(
  SEED_SOURCES.map((s) => [s.id, s]),
) as Record<SeedSource["id"], SeedSource>;
