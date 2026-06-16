// Data migration / normalization helpers. Pure transforms run on load and at
// capture time — no React, no store state.

import { emptyPeakData, DATA_VERSION } from "../defaults";
import { ageYearsFrom } from "../engine";
import type { PeakData, BuildSnapshot, CompositionSnapshot } from "../types";

// Migrate / reconcile: this is a fresh v3 model, so any older/missing doc resets
// to an empty v3 document (the old v1 prototype lived under a different storage
// key, so no real user data is destroyed).
export function reconcile(loaded: Partial<PeakData> | null): PeakData {
  const base = emptyPeakData();
  if (!loaded || (loaded.version ?? 0) < DATA_VERSION || !loaded.schema) return base;
  return { ...base, ...loaded } as PeakData;
}

// Build the immutable BuildSnapshot from stored covariates, refreshing the derived
// ageYears + capturedAt at the moment of capture (birthDate is the source of truth).
export function snapshotBuild(build: BuildSnapshot, comp: CompositionSnapshot | null, at: string): BuildSnapshot {
  return {
    ...build,
    ageYears: ageYearsFrom(build.birthDate, at),
    bodyweightKg: comp?.bodyweight?.value ?? build.bodyweightKg,
    bodyFatPct: comp?.bodyFatPct?.value ?? build.bodyFatPct,
    ffmi: comp?.ffmi?.value ?? build.ffmi,
    capturedAt: at,
  };
}
