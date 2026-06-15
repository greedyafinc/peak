// Peak — balance distributions: single-leg stance eyes-closed (seconds) and Y-Balance
// composite reach (% limb length) (§2.2). Conditioned on sex + age. Higher is better.
// LOW CONFIDENCE by design — published balance norms are thin (§5.4, OQ-15) and
// study-to-study SD variance is large. Small K so first-party data dominates quickly.
//
// Sources:
//   single-leg eyes-closed: Springer et al. 2007 (healthy, not sex-dependent); sharp
//     age decline (18–39 ~13s, 50s ~6s, 60s ~2s).
//   Y-Balance composite: SRALab LQ-YBT — healthy adult composite ~90–100% limb length.

import type { Cohort, CohortDist, LeafId } from "../../types";
import { BLEND_K } from "../../constants";
import { interp, makeDistId, firstPartyWeight } from "./_shared";

// Single-leg stance eyes-closed hold (seconds) by age (sex-neutral; Springer 2007).
const SLS_EC_MEAN: { x: number; y: number }[] = [
  { x: 22, y: 13.1 },
  { x: 35, y: 12.0 },
  { x: 45, y: 10.0 },
  { x: 55, y: 6.1 },
  { x: 65, y: 2.5 },
  { x: 75, y: 1.0 },
];

// Y-Balance lower-quarter composite reach (% limb length) by age.
const YBAL_MEAN: { x: number; y: number }[] = [
  { x: 22, y: 96 },
  { x: 40, y: 93 },
  { x: 60, y: 88 },
  { x: 75, y: 82 },
];

export function balanceCohortDist(leafId: LeafId, cohort: Cohort): CohortDist | null {
  const K = BLEND_K.balance;
  const nObserved = 0;
  const fpw = firstPartyWeight(nObserved, K);
  const age = cohort.ageYears;

  const base = {
    lowerIsBetter: false,
    curveProvenance: "seed_population" as const,
    seedSources: ["BALANCE_NORMS"] as CohortDist["seedSources"],
    K,
    nObserved,
    firstPartyWeight: fpw,
    distributionId: makeDistId(leafId, cohort),
  };

  if (leafId === "balance.single_leg_eyes_closed") {
    const mean = interp(age, SLS_EC_MEAN);
    return {
      ...base,
      mean,
      sd: Math.max(4.5, mean * 0.6), // large study-to-study variance; floored at 0
      confidenceBasis: 0.45, // launch low-confidence (§5.4)
      dataSourceLabel: "Single-leg-stance (eyes closed) hold-time norms, Springer et al. 2007 — thin seed.",
      assumptions: [
        "THIN SEED — low-confidence launch; SD variance across studies is large.",
        "Sex-neutral; sharp age decline (18–39 ~13s, 50s ~6s, 60s ~2s).",
        "Hold floored at 0s; right-skewed.",
      ],
    };
  }

  if (leafId === "balance.y_balance") {
    const mean = interp(age, YBAL_MEAN);
    return {
      ...base,
      mean,
      sd: 8, // ~% limb length
      confidenceBasis: 0.42, // lowest balance confidence
      dataSourceLabel: "Y-Balance lower-quarter composite reach (% limb length), SRALab — thin/athletic samples.",
      assumptions: [
        "THIN SEED — mostly athletic samples; low-confidence launch.",
        "Composite reach as % of limb length; ~90–100% considered normal.",
      ],
    };
  }

  return null;
}
