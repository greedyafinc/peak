// Default / empty PeakData (peak-data-v3). No fabricated activity (Decision #10/#18):
// every leaf starts untested (absent from leafScores), feed/streak/momentum empty,
// goals empty. A score is earned only by real on-device logging + benchmarks.

import type { PeakData } from "./types";
import { MODELS } from "./constants";

export const DATA_VERSION = 3;

export function emptyPeakData(): PeakData {
  return {
    version: DATA_VERSION,
    schema: {
      spec: "peak-data-v3",
      units: "explicit",
      scales: { percentile: "fraction01", confidence: "fraction01", coverage: "fraction01" },
      entitySchemas: {
        buildProfile: "peak.build_profile.v1",
        bodyComposition: "peak.body_composition.v1",
        capability: "capability/1",
        session: "peak.session.v1",
      },
      referenceModels: {
        weights: MODELS.weights,
        correlation: MODELS.correlation,
        projection: MODELS.projection,
        inference: MODELS.inference,
        blend: MODELS.blend,
        momentum: MODELS.momentum,
      },
      generatedBy: "peak-beta",
    },
    onboarded: false,
    biometric: null,
    sessions: [],
    leafScores: {},
    muscleEstimates: {},
    benchmarkResults: [],
    consistency: {
      currentStreakDays: 0,
      longestStreakDays: 0,
      activeDaysTrailing28: 0,
      adherenceTrailing28: null,
      momentum: 0,
      momentumModel: MODELS.momentum,
      history: [],
      asOf: "",
    },
    recalibrations: [],
    goals: [],
    eligibility: {},
  };
}
