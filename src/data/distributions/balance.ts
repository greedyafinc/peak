// Peak — balance distributions: single-leg stance eyes-closed (seconds) and Y-Balance
// composite reach (% limb length). Conditioned on sex + age. Higher is better.
// LOW CONFIDENCE by design — published balance norms are thin (§5.4, OQ-15). Small K so
// first-party data dominates quickly.
//
// Each leaf is a GENERAL-POPULATION tier ladder fit at its population percentiles. The
// single-leg hold is right-skewed and zero-floored → log1p fit (the old symmetric Gaussian
// leaked ~29–41% of older cohorts below zero seconds). Y-Balance % reach is ~Gaussian.
//
// Sources: Springer et al. 2007 (single-leg eyes-closed, sex-neutral, sharp age decline);
// SRALab LQ-YBT composite reach (~90–100% limb length, mostly athletic samples).

import type { Cohort, CohortDist, LeafId } from "../../types";
import { BLEND_K } from "../../constants";
import { ladderCohortDist, type LadderLeaf } from "./_shared";

const BP = [0.2, 0.5, 0.8, 0.93, 0.985];

const slsRows = [
  { age: 25, tiers: [5, 13, 25, 40, 60] }, { age: 35, tiers: [4, 11, 22, 35, 55] },
  { age: 45, tiers: [3, 7, 15, 26, 45] }, { age: 55, tiers: [2, 5, 10, 18, 32] }, { age: 65, tiers: [1, 3, 6, 11, 22] },
];

const LADDERS: Record<string, LadderLeaf> = {
  "balance.single_leg_eyes_closed": {
    male: slsRows, female: slsRows, // sex-neutral (Springer 2007)
    pctls: BP, lowerIsBetter: false, skewed: true,
    seedSources: ["BALANCE_NORMS"], confidenceBasis: 0.45,
    dataSourceLabel: "Single-leg-stance (eyes closed) hold-time norms, Springer et al. 2007 — thin seed.",
    assumptions: [
      "General-population tier ladder fit in log1p space (right-skewed, zero-floored); median = an average adult.",
      "THIN SEED — low-confidence launch; sex-neutral; sharp age decline.",
    ],
  },
  "balance.y_balance": {
    male: [
      { age: 25, tiers: [85, 94, 102, 108, 115] }, { age: 35, tiers: [83, 92, 100, 106, 113] },
      { age: 45, tiers: [80, 89, 97, 103, 110] }, { age: 55, tiers: [76, 85, 93, 99, 106] }, { age: 65, tiers: [72, 81, 89, 95, 102] },
    ],
    female: [
      { age: 25, tiers: [83, 92, 100, 106, 113] }, { age: 35, tiers: [81, 90, 98, 104, 111] },
      { age: 45, tiers: [78, 87, 95, 101, 108] }, { age: 55, tiers: [74, 83, 91, 97, 104] }, { age: 65, tiers: [70, 79, 87, 93, 100] },
    ],
    pctls: BP, lowerIsBetter: false, skewed: false,
    seedSources: ["BALANCE_NORMS"], confidenceBasis: 0.42,
    dataSourceLabel: "Y-Balance lower-quarter composite reach (% limb length), SRALab — thin/athletic samples.",
    assumptions: [
      "General-population tier ladder fit at population percentiles; composite reach as % of limb length.",
      "THIN SEED — mostly athletic samples; low-confidence launch.",
    ],
  },
};

export function balanceCohortDist(leafId: LeafId, cohort: Cohort): CohortDist | null {
  const leaf = LADDERS[leafId];
  return leaf ? ladderCohortDist(leafId, cohort, BLEND_K.balance, leaf) : null;
}
