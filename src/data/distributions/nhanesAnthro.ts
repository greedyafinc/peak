// Peak — NHANES anthropometric height→bodyweight relationship (§5.3, §5.4).
//
// Powers the strength BRIDGE MODEL: published strength standards are conditioned on
// BODYWEIGHT, but Peak conditions on HEIGHT (bodyweight is deliberately excluded from
// normalization, §3.2). To re-express a bodyweight-conditioned standard as a
// height-conditioned one we need P(weight | height, sex): the representative bodyweight
// for a person of a given height.
//
// Source: CDC/NCHS Anthropometric Reference Data, US 2011–2014 (Series 3, No. 39).
// NHANES publishes mean weight and mean height SEPARATELY by sex (not a joint table),
// and the raw population means are inflated by US obesity (mean BMI ≈ 29). For a
// capability product whose users skew toward training, we anchor the representative
// bodyweight to a HEALTHY/lean-athletic BMI band rather than the obese population mean:
// a trained adult at low body fat typically sits around BMI 24–26.
//
//   representative_weight_kg ≈ BMI_anchor × height_m²
//
// We use BMI_anchor = 24.5 (men) / 23.0 (women) — a lean-but-muscular default that
// places a 180cm man at ~79kg and a 165cm woman at ~63kg, matching the
// research-derived "healthy/lifter band" anchors. This is an explicit modeling
// assumption surfaced in the methodology note (§5.6); it is the single largest
// inference in the bridge and is refined by first-party data over time (OQ-9).

import type { Sex } from "../../types";

const BMI_ANCHOR: Record<"male" | "female", number> = {
  male: 24.5,
  female: 23.0,
};

/**
 * Representative (healthy-band) bodyweight in kg for a person of the given sex and
 * height. Used by the bridge model to pick the bodyweight at which to read the
 * bodyweight-conditioned strength standard.
 */
export function representativeBodyweightKg(sex: Sex, heightCm: number): number {
  const anchor = sex === "female" ? BMI_ANCHOR.female : BMI_ANCHOR.male;
  const hM = heightCm / 100;
  return anchor * hM * hM;
}

/**
 * Population spread of bodyweight at a given height (kg). Used for the allometric
 * spread term in the bridge. Derived from NHANES weight variability at fixed height;
 * roughly ~13% of the representative weight for adults, slightly larger for women.
 */
export function bodyweightSdKg(sex: Sex, heightCm: number): number {
  const mean = representativeBodyweightKg(sex, heightCm);
  const cv = sex === "female" ? 0.16 : 0.14; // coefficient of variation
  return mean * cv;
}
