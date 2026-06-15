// Peak scoring engine — hierarchical rollup, leaf → headline (§2.6).
//
// The score is a TREE, not flat bars: leaf → sub-category → dimension → headline.
//   • sub-category percentile = effConf-weighted mean of capped leaf percentiles
//   • dimension percentile     = mean of its sub-category percentiles
//   • headline Peak Score       = Σ(w_i · dimPct_i)/Σ(w_i) over the 9 PERFORMED
//                                 dimensions, w_i = DIM_WEIGHT × dimension-effConf
//   • coverage is reported alongside, NEVER multiplied into the score
//   • Peak badges = leaves with percentileRaw ≥ 0.95
//   • rendered only if testedLeaves ≥ MIN_HEADLINE_LEAVES across ≥ MIN_HEADLINE_DIMENSIONS
//
// A specialist (e.g. 3 peak strength leaves, nothing else) is NEVER penalized:
// they get a valid headline from what's tested, coverage shown separately, and
// the badges they earned. The confidence FLOOR (CONF_FLOOR) prevents cold-start
// dimensions from structurally suppressing the headline.
//
// PURE / DETERMINISTIC given (leafScores, eligibility).

import type {
  DimensionId,
  Headline,
  LeafId,
  LeafScore,
  TierId,
} from "../types";
import {
  DIM_WEIGHT,
  PEAK_CAP,
  MIN_HEADLINE_LEAVES,
  MIN_HEADLINE_DIMENSIONS,
  MODELS,
} from "../constants";
import {
  LEAF_BY_ID,
  LEAVES,
  PERFORMED_DIMENSIONS,
  leavesForDimension,
  subcategoriesForDimension,
  leavesForSubcategory,
  DIM_META,
} from "../data/capabilityTree";
import { effConf, tierForPercentile } from "./score";

export type Eligibility = Record<LeafId, boolean>;

/** A scored sub-category node in the rollup tree. */
export type SubcategoryRollup = {
  subCategory: string;
  percentile: number | null; // effConf-weighted mean of capped leaf percentiles; null if none tested
  tier: TierId | null;
  coverage: number; // tested-eligible / eligible within this subcat
  testedLeaves: number;
  eligibleLeaves: number;
  confidence: number | null; // mean effConf of contributing leaves (raw mean of confidence)
};

/** A scored dimension node in the rollup tree. */
export type DimensionRollup = {
  dimension: DimensionId;
  label: string;
  percentile: number | null; // mean of tested sub-category percentiles; null if none tested
  tier: TierId | null;
  coverage: number;
  testedLeaves: number;
  eligibleLeaves: number;
  confidence: number | null; // mean confidence across tested leaves (true value, not floored)
  weight: number; // DIM_WEIGHT
  subcats: SubcategoryRollup[];
};

/** A leaf is "tested" iff it has a non-null percentileRaw (measured/inferred/stale). */
function isTested(score: LeafScore | undefined): score is LeafScore {
  return !!score && score.percentileRaw != null;
}

function isEligible(leafId: LeafId, eligibility: Eligibility): boolean {
  // Default: eligible unless explicitly opted out (false). Deferred leaves
  // (agility at launch) are excluded from the coverage denominator.
  const leaf = LEAF_BY_ID[leafId];
  if (leaf?.deferred) return false;
  const e = eligibility[leafId];
  return e !== false;
}

/**
 * §2.6 — roll a single sub-category: effConf-weighted mean of capped percentiles
 * over its tested leaves. Untested/ineligible leaves are excluded from the
 * numerator; eligible-untested count toward the coverage denominator.
 */
function rollupSubcategory(
  subCat: string,
  scores: Record<LeafId, LeafScore>,
  eligibility: Eligibility,
): SubcategoryRollup {
  const leaves = leavesForSubcategory(subCat);
  let num = 0;
  let den = 0;
  let tested = 0;
  let eligible = 0;
  let confSum = 0;
  let confN = 0;

  for (const leaf of leaves) {
    const elig = isEligible(leaf.id, eligibility);
    if (elig) eligible += 1;
    const s = scores[leaf.id];
    if (!isTested(s) || !elig) continue;
    const capped = s.cappedPercentile ?? Math.min(s.percentileRaw as number, PEAK_CAP);
    const w = effConf(s.confidence);
    num += w * capped;
    den += w;
    tested += 1;
    if (s.confidence != null) {
      confSum += s.confidence;
      confN += 1;
    }
  }

  const percentile = den > 0 ? num / den : null;
  return {
    subCategory: subCat,
    percentile,
    tier: percentile == null ? null : tierForPercentile(percentile),
    coverage: eligible > 0 ? tested / eligible : 0,
    testedLeaves: tested,
    eligibleLeaves: eligible,
    confidence: confN > 0 ? confSum / confN : null,
  };
}

/**
 * §2.6 — roll a dimension: mean of its tested sub-category percentiles. Coverage
 * and counts aggregate over the dimension's leaves.
 */
export function rollupDimension(
  dimension: DimensionId,
  scores: Record<LeafId, LeafScore>,
  eligibility: Eligibility,
): DimensionRollup {
  const subCats = subcategoriesForDimension(dimension);
  const subRollups = subCats.map((sc) => rollupSubcategory(sc, scores, eligibility));

  const testedSubs = subRollups.filter((s) => s.percentile != null);
  const percentile =
    testedSubs.length > 0
      ? testedSubs.reduce((a, s) => a + (s.percentile as number), 0) / testedSubs.length
      : null;

  let testedLeaves = 0;
  let eligibleLeaves = 0;
  let confSum = 0;
  let confN = 0;
  for (const s of subRollups) {
    testedLeaves += s.testedLeaves;
    eligibleLeaves += s.eligibleLeaves;
  }
  // True (un-floored) confidence across tested leaves of the dimension.
  for (const leaf of leavesForDimension(dimension)) {
    const sc = scores[leaf.id];
    if (isTested(sc) && sc.confidence != null && isEligible(leaf.id, eligibility)) {
      confSum += sc.confidence;
      confN += 1;
    }
  }

  return {
    dimension,
    label: DIM_META[dimension].label,
    percentile,
    tier: percentile == null ? null : tierForPercentile(percentile),
    coverage: eligibleLeaves > 0 ? testedLeaves / eligibleLeaves : 0,
    testedLeaves,
    eligibleLeaves,
    confidence: confN > 0 ? confSum / confN : null,
    weight: DIM_WEIGHT[dimension],
    subcats: subRollups,
  };
}

/**
 * §2.6 — the headline. Aggregates the 9 PERFORMED dimensions weighted by
 * DIM_WEIGHT × dimension-effConf. Coverage is reported alongside (never folded
 * into the score). Peak badge count = leaves with percentileRaw ≥ 0.95. The
 * headline is rendered only when ≥ MIN_HEADLINE_LEAVES tested leaves span
 * ≥ MIN_HEADLINE_DIMENSIONS.
 */
export function computeHeadline(
  scores: Record<LeafId, LeafScore>,
  eligibility: Eligibility,
): { headline: Headline; dimensions: DimensionRollup[] } {
  const dimensions = PERFORMED_DIMENSIONS.map((d) => rollupDimension(d, scores, eligibility));

  // Headline aggregate over performed dimensions that have a tested percentile.
  let num = 0;
  let den = 0;
  for (const dim of dimensions) {
    if (dim.percentile == null) continue;
    // Weight by DIM_WEIGHT × effConf(dimension confidence). The CONF_FLOOR inside
    // effConf prevents a cold-start dimension's low confidence from suppressing it.
    const w = dim.weight * effConf(dim.confidence);
    num += w * dim.percentile;
    den += w;
  }
  const peakScore = den > 0 ? num / den : null;

  // Counts across all eligible leaves (for coverage + the render gate).
  let testedLeaves = 0;
  let eligibleLeaves = 0;
  let peakBadges = 0;
  const testedDims = new Set<DimensionId>();

  for (const leaf of LEAVES) {
    if (leaf.dimension === "consistency") continue; // never a capability leaf
    const elig = isEligible(leaf.id, eligibility);
    if (elig) eligibleLeaves += 1;
    const s = scores[leaf.id];
    if (isTested(s) && elig) {
      testedLeaves += 1;
      testedDims.add(leaf.dimension);
      if ((s.percentileRaw as number) >= PEAK_CAP) peakBadges += 1;
    }
  }

  const testedDimensions = testedDims.size;
  const minHeadlineLeavesMet =
    testedLeaves >= MIN_HEADLINE_LEAVES && testedDimensions >= MIN_HEADLINE_DIMENSIONS;
  const rendered = minHeadlineLeavesMet && peakScore != null;
  const coverage = eligibleLeaves > 0 ? testedLeaves / eligibleLeaves : 0;

  const headline: Headline = {
    peakScore: rendered ? peakScore : null,
    coverage,
    peakBadges,
    rendered,
    minHeadlineLeavesMet,
    testedLeaves,
    testedDimensions,
    eligibleLeaves,
    correlationModel: MODELS.correlation, // "xdim/1"
    weightsModel: MODELS.weights, // "weights/1"
  };

  return { headline, dimensions };
}
