// Peak — canonical data model (peak-data-v3).
//
// This file is the SINGLE SOURCE OF TRUTH for the capability-meter data contract,
// authored directly from docs/SPEC.md (§2–§6). Every other module — the reference
// data (src/data/*), the scoring engine (src/engine/*), and the UI (src/screens/*)
// — builds against these types. Conventions that are load-bearing per the spec's
// "Canonical conventions" block are enforced in the shapes below:
//
//   1. Percentiles are [0,1] fractions everywhere (never 0..100).
//   2. `percentileRaw` (uncapped, canonical) + `cappedPercentile = min(raw, 0.95)`
//      are one fixed pair; there is no bare `percentile` field.
//   3. `tier` derives from the UNCAPPED `percentileRaw`.
//   4. Tier bands are half-open, lower-inclusive [lo, hi); Peak threshold = 0.95.
//   5. Dimension / leaf IDs are one snake_case namespace.
//   6. Measured/derived numerics carry units via `Quantity` (except documented
//      [0,1] fractions).
//
// "untested is null, never 0" and "no fabricated data" are invariants: an
// unmeasured leaf is absent / null, never zero; confidence is null when unknown.

// ── Units & quantities (convention 6) ────────────────────────────────────────
export type Unit =
  | "kg" | "lb" | "reps" | "rpe" | "sec" | "min" | "m" | "km" | "mi"
  | "ml/kg/min" | "percent" | "bpm" | "kg/m2" | "degree" | "count" | "points" | "fraction01";

export type Quantity = { value: number; unit: Unit };

// Display/entry preference. The store is always canonical metric; this only
// changes how values are shown and entered (see src/units.ts). One global flag
// flips every input + display; subtle per-field toggles all write to it.
export type UnitSystem = "metric" | "imperial";

// ── Controlled vocabularies (§6.3) ───────────────────────────────────────────
export type DimensionId =
  | "strength"            // "Maximal Strength"
  | "power"               // "Power & Explosiveness"
  | "muscular_endurance"  // "Muscular Endurance"
  | "aerobic"             // "Aerobic Endurance"
  | "anaerobic"           // "Anaerobic Capacity"
  | "mobility"            // "Mobility & Flexibility"
  | "balance"             // "Balance & Stability"
  | "agility"             // "Agility & Coordination"
  | "body_composition"    // "Body Composition"
  | "consistency";        // "Consistency" (momentum, own track — no capability leaves)

export type LeafId = string;        // e.g. "strength.chest", "aerobic.5k"
export type SubCategoryId = string; // e.g. "push.horizontal", "aerobic.running"
export type MeasurementId = string; // stable id on every raw, percentile-backing event
export type DistributionId = string;
export type CohortId = string;

export type MuscleGroup =
  | "chest" | "front_delt" | "side_delt" | "rear_delt" | "biceps" | "triceps"
  | "forearms" | "lat" | "trap" | "lower_back" | "abs" | "obliques"
  | "glutes" | "quads" | "hamstrings" | "calves" | "tibialis";

// Granular sub-region (head/portion) of a MuscleGroup — the ATTRIBUTION layer below
// the scoring groups (§4.3 extension). Different exercises bias these differently
// (lower vs upper chest, long vs lateral triceps head, VL vs VM quad). Metadata,
// parent mapping, and per-exercise emphasis live in src/data/muscleRegions.ts; the
// regions of any group always sum back to that group's existing muscleWeight, so the
// scoring spine is untouched. Whole-muscle groups (delts, lower back, tibialis) do not
// subdivide — their region id equals the group id.
export type MuscleRegion =
  | "chest_upper" | "chest_mid" | "chest_lower"
  | "triceps_long" | "triceps_lateral" | "triceps_medial"
  | "biceps_long_head" | "biceps_short_head" | "biceps_brachialis"
  | "lat_upper" | "lat_lower"
  | "trap_upper" | "trap_mid" | "trap_lower"
  | "quads_rectus_femoris" | "quads_vastus_lateralis" | "quads_vastus_medialis"
  | "hamstrings_lateral" | "hamstrings_medial"
  | "glutes_max_lower" | "glutes_max_upper" | "glutes_med_min"
  | "abs_upper" | "abs_lower" | "abs_deep"
  | "obliques_external" | "obliques_internal"
  | "forearms_flexors" | "forearms_extensors" | "forearms_brachioradialis"
  | "calves_gastroc_medial" | "calves_gastroc_lateral" | "calves_soleus"
  // whole-muscle regions (group does not subdivide):
  | "front_delt" | "side_delt" | "rear_delt" | "lower_back" | "tibialis";

export type MovementPattern =
  | "horizontal_push" | "vertical_push" | "horizontal_pull" | "vertical_pull"
  | "squat" | "hinge" | "lunge" | "carry" | "rotation" | "isolation"
  | "run" | "row_erg" | "cycle" | "swim" | "jump" | "isometric" | "mobility";

export type Equipment =
  | "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight"
  | "kettlebell" | "band" | "treadmill" | "track" | "erg" | "none";

export type MeasureKind =
  | "max_load" | "rep_max" | "time_for_distance" | "distance_in_time"
  | "vo2_proxy" | "hold_duration" | "rom" | "composition"
  | "jump_height" | "throw_distance" | "sprint_time"
  | "balance_hold" | "reach_distance" | "agility_time";

export type NormalizerMethod =
  | "height_conditioned_strength"
  | "power_norm"
  | "musc_endurance_norm"
  | "wma_age_grade"
  | "vo2_relative"
  | "anaerobic_norm"
  | "rom_norm"
  | "balance_norm"
  | "agility_norm"
  | "ffmi"
  | "bf_band";

// Tier is a stable enum of percentile bands (§2.3 / §5.1). Naming is cosmetic
// (OQ-5); the bands and the 0.95 Peak threshold are fixed.
export type TierId = "foundation" | "developing" | "proficient" | "advanced" | "elite" | "peak";

// LeafState (§2.5) — the canonical machine-readable "what we know".
export type LeafState = "measured" | "inferred" | "stale" | "untested";

export type Sex = "male" | "female" | "unspecified";

// ── Provenance (§6.2) ────────────────────────────────────────────────────────
export type ProvenanceSource =
  | "measured"
  | "inferred-strength"
  | "inferred-related"
  | "seed-population"
  | "healthkit"
  | "user-stated"
  | "ai-suggested"
  | "untested";

export type Provenance = {
  source: ProvenanceSource;
  confidence: number | null;  // [0,1]; null = unknown (untested), NEVER 0.0 for a gap
  asOf: string;               // ISO-8601
  method?: string;            // e.g. "epley", "wma-age-grade", "...+floor_guard"
  modelVersion?: string;      // e.g. "infer/1", "weights/1"
  datasetId?: string;         // FK into the seed-dataset registry (§5.4)
  authoredBy?: "user" | "template" | "ai";
  contextRef?: string;
  staleAfterDays?: number;
};

// ── Build & composition snapshots (§2.8, §3.7, §6.7) ─────────────────────────
export type BuildSnapshot = {
  sex: Sex;                   // immutable covariate
  heightCm: number;           // immutable covariate
  birthDate: string;          // ISO-8601 — SOURCE OF TRUTH for age
  ageYears: number;           // DERIVED from birthDate at capturedAt (convenience)
  bodyweightKg: number | null;  // contextual input ONLY — never a normalizer covariate
  bodyFatPct: number | null;
  ffmi: number | null;
  capturedAt: string;         // ISO-8601
  source: "healthkit" | "googlefit" | "manual" | "inferred" | "user-stated";
};

export type BfBand = "essential" | "athletic" | "fitness" | "average" | "high";
export type CompMethod = "dexa" | "bia" | "tape_navy" | "inferred_from_strength" | "none";

export type BandDefinition = {
  sex: "male" | "female";
  source: string;             // e.g. "ACSM"
  essentialFloorBf: number;   // [0,1] fraction
  edges: Record<BfBand, [number, number]>;
  targetCenterBf: number;     // the §3.4 ideal-weight center
};

export type CompositionSnapshot = {
  bodyweight: Quantity | null;     // HealthKit-fed; user never manually logs (§4.5)
  bodyFatPct: Quantity | null;     // null = untested (NOT 0)
  ffmi: Quantity | null;
  leanMass?: Quantity | null;
  bandDefinition?: BandDefinition;
  bfBand?: BfBand | null;
  ffmiPercentile?: number | null;  // [0,1]
  bfPercentile?: number | null;    // [0,1]
  measurementLadder?: CompMethod;
  derivedIdealWeight?: { low: Quantity; high: Quantity };
  provenance: Provenance;
  measuredAt: string;              // ISO-8601
};

export type BiometricProfile = {
  build: BuildSnapshot;
  latestComposition: CompositionSnapshot | null;
  healthSources: { healthKit: boolean; googleFit: boolean };
  cohort: { sex: string; heightBand: string; ageBand: string; schemaVersion: string };
  cohortKey: string;
};

// ── Capability tree (§2.1, §6.5) ─────────────────────────────────────────────
export type LeafKind = "direct" | "inferred";

export type NormalizerSpec = {
  method: NormalizerMethod;
  version: string;
  conditionsOn: ("sex" | "height" | "age")[];
};

export type CapabilityLeaf = {
  id: LeafId;
  label: string;
  dimension: DimensionId;             // never "consistency"
  subCategory: SubCategoryId;
  kind: LeafKind;
  muscleGroups: MuscleGroup[];        // [] for pure aerobic/anaerobic/mobility/balance/agility
  movementPatterns: MovementPattern[];
  contributingExerciseIds: string[];
  normalizer: NormalizerSpec;
  unit: Unit;                         // unit of the RAW measure
  staleAfterDays: number;
  massRelative?: boolean;             // §3.6.1 healthy-floor guard applies
  launchConfidenceCeiling?: number;   // [0,1] — caps confidence at launch (cold-start, §5.3)
  deferred?: boolean;                 // carried in taxonomy but not scored at launch (agility, §7.3)
};

export type CapabilityNode = {
  id: string;                  // "strength.chest" (leaf) | "push.horizontal" (subcat) | "dim.strength" | "headline.peak"
  kind: "leaf" | "subcategory" | "dimension" | "headline";
  label: string;
  dimension: DimensionId | null;
  parentId: string | null;
  muscleGroup?: MuscleGroup;
  sourceExerciseIds?: string[];
};

export type DimensionMeta = {
  id: DimensionId;
  label: string;
  blurb: string;
  weight: number;              // dimWeight (weights/1)
  color: string;
  performed: boolean;          // false only for consistency
  lowConfidence?: boolean;     // balance, agility launch low-confidence
};

// ── Exercise catalog (§6.5) — reference data ─────────────────────────────────
export type ExerciseDef = {
  id: string;                  // stable, e.g. "barbell-bench-press"
  name: string;
  movementPattern: MovementPattern;
  equipment: Equipment;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  muscleWeights: Partial<Record<MuscleGroup, number>>;  // attribution coeffs (sum ~1), exported (§6.9)
  dimension: DimensionId;
  isBodyweight?: boolean;
};

// ── Benchmark library (§4.1, §4.2) — reference data + results ────────────────
export type FieldSpec = { name: string; type: "number" | "int" | "duration" | "bool"; unit: Unit };

export type BenchmarkProtocol = {
  protocolId: string;          // e.g. "bench.1rm.v1"
  protocolVersion: number;
  leafId: LeafId;
  dimension: DimensionId;      // never "consistency"
  movementPattern: MovementPattern;
  primaryMuscles: MuscleGroup[];
  equipment: Equipment;
  measure: MeasureKind;
  units: Unit;
  normalizationMethod: NormalizerMethod;
  rawCaptureSchema: FieldSpec[];
  restGuidanceSec: number;
  instructions: string;
  confidenceCeiling: number;   // [0,1]
  // beta UX helpers:
  category: string;            // grouping label for the benchmark picker
  starter?: boolean;           // part of the recommended onboarding starter set
};

// RawMeasurement is a typed union keyed by `kind` (§4.2).
export type RawMeasurement =
  // `load`/`reps` are ALWAYS the actual variant lifted (canonical, honest). For a
  // non-standard variant (e.g. dumbbell bench), `variantId`/`equipment` record what
  // was done; the engine maps the est-1RM onto the standard's curve via a documented
  // conversion factor (§4.2 flexible benchmarking) — the raw is never rewritten.
  | { kind: "max_load"; load: Quantity; reps: number; variantId?: string; equipment?: Equipment }
  | { kind: "rep_max"; reps: number; load?: Quantity }
  | { kind: "time_for_distance"; distance: Quantity; duration: Quantity }
  | { kind: "distance_in_time"; distance: Quantity; duration: Quantity }
  | { kind: "vo2_proxy"; vo2: Quantity }
  | { kind: "hold_duration"; duration: Quantity }
  | { kind: "rom"; angle: Quantity }
  | { kind: "composition"; bodyFatPct: Quantity; ffmi: Quantity; method: CompMethod }
  | { kind: "jump_height"; height: Quantity }
  | { kind: "throw_distance"; distance: Quantity }
  | { kind: "sprint_time"; distance: Quantity; duration: Quantity }
  | { kind: "balance_hold"; duration: Quantity }
  | { kind: "reach_distance"; distance: Quantity }
  | { kind: "agility_time"; duration: Quantity };

export type CurveProvenance = "seed_population" | "first_party" | "blended";

export type BenchmarkResult = {
  id: MeasurementId;
  protocolId: string;
  protocolVersion: number;
  leafId: LeafId;
  performedAt: string;         // ISO-8601
  raw: RawMeasurement;
  sets?: SetRecord[];
  normalizedValue: number;     // DERIVED [0,1]
  percentileRaw: number | null;
  cappedPercentile: number | null;
  tier: TierId | null;
  curveSource: CurveProvenance;
  distributionId: DistributionId;
  confidence: number;
  buildSnapshot: BuildSnapshot;
  source: ProvenanceSource;    // "measured"
};

// ── Per-set logging — the raw event store (§6.4) ─────────────────────────────
export type WorkoutType = "Gym" | "Cardio" | "Sport" | "Mobility";

export type SetDerived = {
  computedAt: string;
  est1RM: Quantity;
  provenance: Provenance;
  superseded: boolean;
};

export type SetRecord = {
  id: MeasurementId;
  seq: number;
  weight: Quantity | null;     // null for bodyweight-only
  reps: number;
  rpe: number | null;          // 1..10; null = not captured (NOT 0)
  restSec: Quantity | null;
  targetHit: boolean | null;
  tempo?: string;
  derived?: SetDerived[];
};

export type ProgrammedSet = {
  targetWeight?: Quantity;
  targetReps?: number;
  targetRpe?: number;
  provenance: Provenance;
};

export type ExerciseEntry = {
  id: string;
  exerciseId: string;          // FK → ExerciseDef
  programmedSets?: ProgrammedSet[];
  sets: SetRecord[];
};

export type CardioSetRecord = {
  id: MeasurementId;
  seq: number;
  distance: Quantity | null;
  duration: Quantity;
  avgHr: Quantity | null;
  vo2Estimate?: Quantity;
  targetHit: boolean | null;
  derived?: SetDerived[];
};

export type Session = {
  id: string;
  seq: number;
  createdAt: string;           // ISO-8601 UTC
  localDay: string;            // "YYYY-MM-DD" local — drives consistency track
  type: WorkoutType;
  title: string;
  build: BuildSnapshot;
  composition: CompositionSnapshot | null;
  programId?: string;          // FK → RoutineDef.id when started from a routine
  entries: ExerciseEntry[];
  cardio?: CardioSetRecord[];
  notes?: string;
  durationMin?: number;
};

// ── Routines / templates (§6.4 program scaffolding) ──────────────────────────
// A reusable Gym template the live session can be seeded from. Built-ins ship as
// reference data; user-saved routines live in PeakData.routines. Suggested sets /
// rep range are scaffolding only — the honest raw events are still the logged sets.
export type RoutineExercise = {
  exerciseId: string;          // FK → ExerciseDef
  sets: number;                // suggested working-set count
  repLow?: number;             // suggested rep-range low
  repHigh?: number;            // suggested rep-range high
};

export type RoutineDef = {
  id: string;
  name: string;
  focus?: string;              // short tag, e.g. "Push", "Full Body"
  blurb?: string;
  exercises: RoutineExercise[];
  builtIn?: boolean;           // true for shipped templates
  createdAt?: string;          // ISO-8601, for user-saved routines
};

// ── Weekly routine plan (§6.4 — recurring weekly agenda) ─────────────────────
// A recurring 7-day template the Feed's "This Week" card renders against. Each
// weekday (index 0 = Monday … 6 = Sunday) holds zero or more plan items; an empty
// day is a rest day. A Gym item links to a RoutineDef (so "Start" can seed the live
// session); cardio / sport / mobility items carry a free-text title + detail.
//
// Completion is EARNED, never fabricated: a planned day reads "done" when a real
// Session is logged that calendar day, OR the user explicitly ticks it off — those
// manual ticks live in `completions` as "YYYY-MM-DD" local-day keys.
export type WeeklyPlanItem = {
  id: string;
  type: WorkoutType;           // drives the accent + status semantics (Gym/Cardio/Sport/Mobility)
  routineId?: string;          // FK → RoutineDef.id when type === "Gym" and linked to a routine
  title: string;               // display name, e.g. "Push Day", "Run · 5K"
  detail?: string;             // sub line, e.g. "Tempo · 28 min" (Gym items derive it live)
};

export type WeeklyPlan = {
  days: WeeklyPlanItem[][];    // length 7, index 0 = Monday … 6 = Sunday
  completions: string[];       // "YYYY-MM-DD" local days manually ticked done
  createdAt: string;           // ISO-8601 — when the plan was first set up
  updatedAt: string;           // ISO-8601 — last structural edit
};

// ── Capability scores (§2.2, §6.6) ───────────────────────────────────────────
export type ScorePoint = {
  at: string;                  // ISO-8601
  percentileRaw: number | null;
  cappedPercentile: number | null;
  normalizedValue?: number;
};

export type Attribution = {
  leafId: LeafId;
  fromPercentileRaw: number;
  toPercentileRaw: number;
  fromCappedPercentile: number;
  toCappedPercentile: number;
  headlineDelta: number;
  triggeringSessionId: string | null;
  triggeringMeasurementIds: MeasurementId[];
  windowStart: string;
  windowEnd: string;
};

// The persisted per-leaf score (LeafScore / CapabilityScore unified for the beta).
export type LeafScore = {
  leafId: LeafId;
  // RAW
  raw?: Quantity;
  rawSource?: "benchmark" | "logged_set" | "health_integration";
  contributingSetIds?: MeasurementId[];
  // DERIVED
  normalized?: number;         // [0,1]
  normalizerMethod?: NormalizerMethod;
  normalizerVersion?: string;
  percentileRaw: number | null;   // UNCAPPED canonical; null = untested
  cappedPercentile: number | null;
  tier: TierId | null;
  isPeak?: boolean;
  // CONTEXT / TRUST
  buildSnapshot?: BuildSnapshot;
  confidence: number | null;      // null = untested (NOT 0)
  distributionSource?: CurveProvenance;
  distributionId?: DistributionId;
  computedAt: string;
  state: LeafState;
  coverage: number;               // [0,1]
  eligible: boolean;
  history: ScorePoint[];
  attributions?: Attribution[];
};

// ── Inferred muscle-group strength (§4.3) ────────────────────────────────────
export type MuscleGroupEstimate = {
  muscleGroup: MuscleGroup;
  estStrength: Quantity | null;   // null = untested
  normalizedValue: number | null;
  percentileRaw: number | null;
  cappedPercentile: number | null;
  tier: TierId | null;
  inferenceModel: string;         // "infer/1"
  source: ProvenanceSource;
  confidence: number | null;
  lastCalibratedAt: string | null;
  lastUpdatedAt: string | null;
  contributingSetIds: MeasurementId[];
};

// ── Consistency / momentum track (§2.7) ──────────────────────────────────────
export type ConsistencyPoint = { at: string; momentum: number; currentStreakDays: number; activeDaysTrailing28: number };

export type ConsistencyTrack = {
  currentStreakDays: number;
  longestStreakDays: number;
  activeDaysTrailing28: number;
  adherenceTrailing28: number | null;
  momentum: number;               // [0,1] own scale — NOT a build percentile, NOT capped
  momentumModel: string;          // "momentum/1"
  history: ConsistencyPoint[];
  asOf: string;
};

// ── Recalibration (§2.8) ─────────────────────────────────────────────────────
export type RecalibrationEvent = {
  id: string;
  trigger: "age_band_change" | "height_correction" | "normalizer_version_bump" | "distribution_reseed";
  affectedLeafIds: LeafId[];
  buildSnapshotBefore: BuildSnapshot;
  buildSnapshotAfter: BuildSnapshot;
  at: string;
};

// ── Headline rollup output (§2.6) ────────────────────────────────────────────
export type Headline = {
  peakScore: number | null;       // [0,1] — null until MIN_HEADLINE_LEAVES met
  coverage: number;               // [0,1]
  peakBadges: number;
  rendered: boolean;
  minHeadlineLeavesMet: boolean;
  testedLeaves: number;
  testedDimensions: number;
  eligibleLeaves: number;
  correlationModel: string;       // "xdim/1"
  weightsModel: string;           // "weights/1"
};

// ── Distributions & seed registry (§5.4) ─────────────────────────────────────
export type SeedSourceId =
  | "SYMMETRIC_STRENGTH" | "EXRX" | "MILITARY_FITNESS" | "CDC" | "WHO"
  | "NHANES_DEXA" | "NHANES_ANTHRO" | "WMA_AGE_GRADED" | "BALANCE_NORMS" | "AGILITY_NORMS"
  | "ACSM" | "COOPER" | "RUNNING_LEVEL" | "TRIATHLON_NORMS";

export type SeedSource = {
  id: SeedSourceId;
  label: string;
  dimensions: DimensionId[];
  role: string;
  vintageNote?: string;
  url?: string;
};

// A cohort-conditioned distribution as a Gaussian (mean+sd) on the NORMALIZED value,
// or an explicit quantile table. Higher normalized value = better, unless `lowerIsBetter`.
export type Distribution = {
  distributionId: DistributionId;
  leafId: LeafId;
  dimension: DimensionId;
  units: Unit;
  repr: { kind: "gaussian"; mean: number; sd: number } | { kind: "quantiles"; q: { p: number; v: number }[] };
  lowerIsBetter?: boolean;
  seedSources: SeedSourceId[];
  firstPartyWeight: number;       // [0,1]
  nObserved: number;
  K: number;
  confidenceBasis: number;        // [0,1] base confidence before per-user adjustment
  methodologyDocId: string;
  version: number;
};

export type MethodologyNote = {
  distributionId: DistributionId;
  dataSourceLabel: string;
  provenance: CurveProvenance;
  coldStartNote?: string;
  assumptions: string[];
};

// ── The data↔engine boundary (the contract both parallel layers agree on) ────
// A Cohort is the immutable reference frame (§5.2). The engine asks the data
// layer for a leaf's cohort-conditioned distribution; the data layer interpolates
// its hard-coded published norms (+ the strength bridge model, §5.3) to answer.
export type Cohort = { sex: Sex; heightCm: number; ageYears: number };

// Cohort-conditioned distribution of the RAW measure for one leaf. The percentile
// of a raw value within this Gaussian IS the build-relative empirical percentile
// (§2.2): mean/sd are conditioned on the immutable build, so percentile ranks the
// user against similar-build people. `lowerIsBetter` flips direction (run/sprint
// times). `confidenceBasis` is the seed's base confidence before per-user factors.
export type CohortDist = {
  mean: number;          // expected RAW value for this cohort, in the leaf's unit
  sd: number;            // spread of the RAW value for this cohort
  lowerIsBetter: boolean;
  seedSources: SeedSourceId[];
  curveProvenance: CurveProvenance;
  confidenceBasis: number; // [0,1]
  distributionId: DistributionId;
  K: number;
  nObserved: number;
  firstPartyWeight: number;
  dataSourceLabel: string; // human-readable, for the methodology note (§5.6)
  assumptions?: string[];
};

// ── Goals (§6.8) ─────────────────────────────────────────────────────────────
export type GoalV3 = {
  id: string;
  name: string;
  dimension: DimensionId;
  createdAt: string;
  target?: { nodeId: string; targetPercentileRaw?: number; targetQuantity?: Quantity };
  provenance: Provenance;
  etaProjectedAt?: { low: string; high: string } | null;
  projectionModel?: string;
  state?: "active" | "insufficient_data" | "no_trend" | "achieved";
};

// ── Projection output (§2.6.1) ───────────────────────────────────────────────
export type Projection =
  | { state: "ok"; etaWeeks: { low: number; high: number }; saturating: boolean; model: string }
  | { state: "no_trend"; model: string }
  | { state: "insufficient_data"; model: string };

// ── Root document (§6.8) ─────────────────────────────────────────────────────
export type PeakData = {
  version: number;             // document/migration version → lands as 3
  schema: {
    spec: "peak-data-v3";
    units: "explicit";
    scales: { percentile: "fraction01"; confidence: "fraction01"; coverage: "fraction01" };
    entitySchemas: Record<string, string>;
    referenceModels: Record<string, string>;
    generatedBy: string;
  };
  onboarded: boolean;
  unitSystem: UnitSystem;      // display/entry preference (canonical store stays metric)
  biometric: BiometricProfile | null;
  sessions: Session[];
  routines: RoutineDef[];      // user-saved Gym templates (built-ins ship as data)
  weeklyPlan: WeeklyPlan | null;  // recurring weekly routine; null = not set up yet
  leafScores: Record<LeafId, LeafScore>;
  muscleEstimates: Partial<Record<MuscleGroup, MuscleGroupEstimate>>;
  benchmarkResults: BenchmarkResult[];
  consistency: ConsistencyTrack;
  recalibrations: RecalibrationEvent[];
  goals: GoalV3[];
  eligibility: Record<LeafId, boolean>;
};

// ── AI context export (§2.9, §6.9) ───────────────────────────────────────────
export type AIContext = {
  schemaVersion: "capability/1";
  generatedAt: string;
  scales: { percentile: "fraction01"; confidence: "fraction01"; coverage: "fraction01" };
  weightsModel: string;
  correlationModel: string;
  projectionModel: string;
  build: { sex: Sex; heightCm: number; birthDate: string; ageYears: number };
  headline: Headline;
  consistency: Pick<ConsistencyTrack, "momentum" | "currentStreakDays" | "activeDaysTrailing28" | "adherenceTrailing28" | "momentumModel">;
  leaves: unknown[];
  attributions: Attribution[];
  recalibrations: RecalibrationEvent[];
  methodologyNotes: MethodologyNote[];
};
