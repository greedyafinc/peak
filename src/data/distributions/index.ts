// Peak — cohort-conditioned distribution layer (§2.2, §5.2, §5.4). THE KEY DELIVERABLE.
//
// The data↔engine boundary: the engine asks for a leaf's cohort-conditioned distribution
// of the RAW measure; this layer answers by interpolating its hard-coded published norms
// (+ the strength bridge model, §5.3). The percentile of a raw value within the returned
// Gaussian IS the build-relative empirical percentile.
//
// Contract (the only hard contract the engine relies on — the two exported functions):
//   lookupCohortDist(leafId, cohort): CohortDist | null
//     - returns a NON-NULL CohortDist for EVERY non-deferred leaf in LEAVES (so the
//       engine never lacks a distribution for a tested, eligible leaf).
//     - returns null ONLY for `deferred` leaves (agility, §7.3) or an unknown leaf id.
//   methodologyNoteFor(leafId, cohort): MethodologyNote  (always non-null, §5.6)
//
// Each per-dimension builder returns null for leaves it does not own; dispatch picks
// the first non-null, then falls back to a clearly-labeled low-confidence placeholder
// for any known non-deferred leaf a builder missed — so the engine contract holds.

import type { Cohort, CohortDist, LeafId, MethodologyNote } from "../../types";
import { LEAF_BY_ID } from "../capabilityTree";
import { BLEND_K } from "../../constants";
import { makeDistId, firstPartyWeight } from "./_shared";
import { strengthCohortDist } from "./strength";
import { aerobicCohortDist } from "./aerobic";
import { anaerobicCohortDist } from "./anaerobic";
import { powerCohortDist } from "./power";
import { muscularEnduranceCohortDist } from "./bodyweightMovements";
import { mobilityCohortDist } from "./mobility";
import { balanceCohortDist } from "./balance";
import { compositionCohortDist } from "./composition";

// Ordered dispatch: leaf ids are disjoint across builders, so order is irrelevant to
// correctness; kept dimension-grouped for readability.
const BUILDERS: ((leafId: LeafId, cohort: Cohort) => CohortDist | null)[] = [
  strengthCohortDist,
  aerobicCohortDist,
  anaerobicCohortDist,
  powerCohortDist,
  muscularEnduranceCohortDist,
  mobilityCohortDist,
  balanceCohortDist,
  compositionCohortDist,
];

/**
 * Last-resort fallback so NO eligible (non-deferred) leaf ever returns null even if a
 * dimension builder misses. An intentionally vague Gaussian, clearly labeled
 * low-confidence and seed-only. Should essentially never fire — every non-deferred leaf
 * has a real table — but it guarantees the engine contract.
 */
function fallbackDist(leafId: LeafId, cohort: Cohort): CohortDist {
  const leaf = LEAF_BY_ID[leafId];
  const dim = leaf?.dimension ?? "strength";
  const K = BLEND_K[dim] ?? 100;
  return {
    mean: 1,
    sd: 1,
    lowerIsBetter: false,
    seedSources: [],
    curveProvenance: "seed_population",
    confidenceBasis: leaf?.launchConfidenceCeiling ?? 0.3,
    distributionId: makeDistId(leafId, cohort),
    K,
    nObserved: 0,
    firstPartyWeight: firstPartyWeight(0, K),
    dataSourceLabel: "Generic fallback distribution — no specific seed table for this leaf.",
    assumptions: [
      "FALLBACK: no dimension-specific seed table matched this leaf id; low-confidence placeholder.",
    ],
  };
}

/**
 * §2.2 / §5.2 — the cohort-conditioned distribution of the RAW measure for one leaf.
 * Non-null for every non-deferred leaf; null for deferred (agility) or unknown ids.
 */
export function lookupCohortDist(leafId: LeafId, cohort: Cohort): CohortDist | null {
  const leaf = LEAF_BY_ID[leafId];

  // Deferred leaves (agility) may legitimately return null — not scored at launch (§7.3).
  if (leaf?.deferred) return null;

  for (const build of BUILDERS) {
    const d = build(leafId, cohort);
    if (d) return d;
  }

  // Known, non-deferred leaf the dispatch missed → safe fallback (never null).
  if (leaf) return fallbackDist(leafId, cohort);

  // Truly unknown leaf id → null (not a tree leaf).
  return null;
}

/**
 * §5.6 — the human-readable methodology note for a (leaf, cohort). Always non-null.
 * Denormalizes the data-source label, provenance, cold-start note, and documented
 * assumptions from the distribution that backs the percentile.
 */
export function methodologyNoteFor(leafId: LeafId, cohort: Cohort): MethodologyNote {
  const leaf = LEAF_BY_ID[leafId];

  if (leaf?.deferred) {
    return {
      distributionId: makeDistId(leafId, cohort),
      dataSourceLabel:
        "Agility is deferred — carried in the taxonomy but not scored at launch (§7.3). " +
        "Published change-of-direction norms are the sparsest seed.",
      provenance: "seed_population",
      coldStartNote: "Deferred to a later release; no percentile is shown for this leaf at launch.",
      assumptions: ["Lowest-confidence dimension; awaiting sufficient seed/first-party data."],
    };
  }

  const dist = lookupCohortDist(leafId, cohort) ?? fallbackDist(leafId, cohort);

  const isBridge =
    leaf?.dimension === "strength" && leaf?.normalizer.method === "height_conditioned_strength";

  const coldStartNote = isBridge
    ? "Your strength percentile is currently ESTIMATED from population strength standards " +
      "adjusted for your height (the bridge model, allometric b=2/3, §5.3) — not yet from " +
      "Peak's own users. The height adjustment is an inference, so confidence is lower and the " +
      "tier band is shown wider. It sharpens as Peak accumulates height-conditioned data."
    : dist.firstPartyWeight < 0.2
      ? "Early cohort — backed mostly by seeded population data, not yet Peak's own users; the " +
        "source is labeled and first-party data is weighted in over time (§5.4)."
      : undefined;

  return {
    distributionId: dist.distributionId,
    dataSourceLabel: dist.dataSourceLabel,
    provenance: dist.curveProvenance,
    coldStartNote,
    assumptions: dist.assumptions ?? [],
  };
}

// Re-export composition + anthropometric helpers from the distributions barrel.
export { bandDefinitionForSex } from "./composition";
export { representativeBodyweightKg, bodyweightSdKg } from "./nhanesAnthro";
