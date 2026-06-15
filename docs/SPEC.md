# Peak — Product & Technical Specification

## Abstract

Peak is a physical capability meter, not a workout logger: it answers "how close am I to my full physical potential, and how do I close the gap?" by scoring demonstrated capability as a **build-relative empirical percentile** conditioned only on a user's immutable frame (sex, height, age). This document specifies the product from vision through implementation: the north-star Peak Score and the capability tree that produces it (§1–§2); the immutable-build principle and the FFMI/body-fat-band composition model that exists because bodyweight is deliberately excluded from normalization (§3); the modular benchmark library, two-part onboarding, and per-leaf coverage/confidence model (§4); the private ranking model and the seed→first-party data strategy that solves the height-conditioned strength cold-start (§5); the AI-ready, raw-preserving, provenance-tagged data architecture (§6); and the honest bridge from today's prototype to that target, with a phased roadmap, locked decisions, open questions, and risks (§7). The AI coaching layer is deferred by decision, but every data choice is made AI-ready now so it can ship without a migration.

### Canonical conventions (binding — every section conforms)

These six conventions are stated once here and are **load-bearing**; where any later prose drifts, this block governs.

1. **Percentile scale is `0..1` everywhere.** A percentile is a fraction in `[0,1]` (e.g. `0.88` = 88th percentile). No section uses a `0..100` scale. Every stored percentile field is unit-tagged `unit: "fraction01"` in self-describing exports so a machine can never confuse `0.95` (95th) with a literal "0.95th."
2. **Capped vs uncapped is one fixed pair of fields.** `percentileRaw: number | null` is the **uncapped** `[0,1]` truth (canonical). `cappedPercentile: number | null = min(percentileRaw, PEAK_CAP)` is the **derived** value used in headline aggregation. There is no third field and no bare `percentile` field anywhere; `PEAK_CAP = 0.95`.
3. **`tier` is derived from `percentileRaw` (uncapped),** never from `cappedPercentile`. Capping affects only headline *contribution*, never tier classification, so `elite` (raw ∈ [0.90, 0.95)) and `peak` (raw ≥ 0.95) remain distinguishable.
4. **Band boundaries are half-open, lower-inclusive: `[lo, hi)`.** A leaf at exactly a boundary belongs to the upper band. The Peak threshold is `percentileRaw ≥ 0.95` (inclusive). The cap is `min(percentileRaw, 0.95)`. The 0.95 value therefore means three coincident, consistent things: tier `peak`, badge earned, and maximum contribution — no off-by-one.
5. **Dimension and leaf IDs use one snake_case namespace.** `DimensionId ∈ { strength, power, muscular_endurance, aerobic, anaerobic, mobility, balance, agility, body_composition, consistency }` (display names: strength → "Maximal Strength", power → "Power & Explosiveness", muscular_endurance → "Muscular Endurance", aerobic → "Aerobic Endurance", anaerobic → "Anaerobic Capacity", mobility → "Mobility & Flexibility", balance → "Balance & Stability", agility → "Agility & Coordination", body_composition → "Body Composition", consistency → "Consistency"). Leaf/sub-category IDs are dot-namespaced snake_case (e.g. `strength.chest`, `aerobic.5k`, `body_composition.ffmi`, `mobility.hip`). These IDs are stable enums, FK'd across the schema, and never re-spelled per section.
6. **Numeric values carry units.** A measured/derived numeric is a `Quantity { value, unit }` (§6.2) **except** dimensionless scores in `[0,1]` (`normalized`, `percentileRaw`, `cappedPercentile`, `confidence`, `coverage`), which are bare numbers explicitly documented as `[0,1]` fractions and unit-tagged in exports. Units are never baked into field names as the sole unit declaration.

## Table of Contents

1. [Product Vision & Positioning](#1-product-vision--positioning)
   - 1.1 What Peak Is
   - 1.2 The Core Promise & North-Star Metric
   - 1.3 Target Users
   - 1.4 Competitive Positioning
   - 1.5 The Moat
   - 1.6 Business Model
2. [The Capability Score Model](#2-the-capability-score-model)
   - 2.1 The capability tree
   - 2.2 The percentile method (two steps, per leaf)
   - 2.3 Tiers as percentile bands, and the per-leaf cap
   - 2.4 Per-leaf coverage and confidence
   - 2.5 Explicit gaps — untested is unknown, never zero
   - 2.6 Rollups: from leaves to the headline
   - 2.7 The consistency track (momentum, scored separately)
   - 2.8 Build snapshots and recalibration
   - 2.9 Serialization for the AI layer
3. [Build Normalization & Body Composition](#3-build-normalization--body-composition)
   - 3.1 The Immutable-Build Principle
   - 3.2 Why Bodyweight Is Excluded From Normalization
   - 3.3 The Body-Composition Dimension — Two Primitives, Not BMI
   - 3.4 Derived Ideal Weight — Rises With Muscle
   - 3.5 The Peak-Unique Move — Infer Muscularity From Logged Strength
   - 3.6 Responsibility Constraint — Target Band With a Healthy Floor
   - 3.7 Data Model — AI-Readiness Implications
4. [Benchmarks, Onboarding & Confidence](#4-benchmarks-onboarding--confidence)
   - 4.1 The benchmark as a modular library
   - 4.2 What a benchmark result captures (RAW + DERIVED)
   - 4.3 Inferred muscle-group strength (passive, benchmark-calibrated)
   - 4.4 Per-leaf coverage & confidence
   - 4.5 Onboarding — the two-part baseline, the missing-data path & first significant score
5. [Private Ranking & Data Strategy](#5-private-ranking--data-strategy)
   - 5.1 Private ranking model — tier + percentile, never rank
   - 5.2 Build cohorts — the immutable reference frame
   - 5.3 The cold-start challenge — height-conditioned strength distributions
   - 5.4 Distribution sourcing and the seed→first-party blend
   - 5.5 Contextual snapshot at ranking time
   - 5.6 Methodology transparency — the differentiator made into data
   - 5.7 Storage, recompute, and AI-export
6. [Data Architecture (AI-Ready)](#6-data-architecture-ai-ready)
   - 6.1 Design principles (how the mandate maps to schema)
   - 6.2 The shared `Provenance` and unit primitives
   - 6.3 Controlled vocabularies (enums)
   - 6.4 Per-set logging — the raw event store
   - 6.5 The capability tree — stable IDs + relational links
   - 6.6 Capability scores — percentile, confidence, provenance, tiers
   - 6.7 Build & composition snapshots + biometric profile
   - 6.8 Self-describing top-level document
   - 6.9 Local-first persistence and the AI context export
7. [Implementation Bridge, Roadmap & Open Questions](#7-implementation-bridge-roadmap--open-questions)
   - 7.1 Current state vs. target — the gap, by subsystem
   - 7.2 The migration bridge — `DATA_VERSION` 2 → 3
   - 7.3 Phased roadmap (sequenced for the cold-start reality)
   - 7.4 Decisions log (LOCKED)
   - 7.5 Open questions (UNRESOLVED)
   - 7.6 Risks
8. [Glossary](#glossary)

> **A note on terminology and conventions used throughout.** *Leaf* is the atomic unit of capability (the only level carrying a measured/inferred percentile); everything above it (sub-category → dimension → headline) is a *rollup*. *Provenance* tags where a datum came from (`measured` / `inferred-from-strength` / `seed-population`, etc.); *confidence* and *coverage* are always per-leaf, never global. The **immutable-build principle** — the normalizer conditions only on sex, height, and age — recurs in every section and is defined fully in §3.1. All capability data is RAW-first: raw measurement, normalized value, uncapped percentile, capped percentile, and tier are stored as separate, timestamped, provenance-stamped fields per the canonical conventions above. Tier *bands* (and the 95th-percentile "Peak" threshold) are fixed; tier *names* are an open question (§7.5, OQ-5). See the Glossary for all key terms.

---

## 1. Product Vision & Positioning

### 1.1 What Peak Is

Peak is a **physical capability meter**, not a workout logger. Logging is the input mechanism; the product is the answer it produces. Where Hevy stores what you did and WHOOP reports how recovered you are, Peak answers a harder, more motivating question: **"How close am I to my full physical potential — and how do I close the gap?"**

The product is built around two intertwined questions that every feature must serve:

1. **"How good am I, really?"** — an honest assessment of your capability against people of similar, immutable build (sex, height, age).
2. **"How do I get better?"** — a concrete, achievable path toward your personal ceiling, expressed as tiers, weekly attributed movement, and time-based ETAs.

If a feature does not help answer one of these two questions, it is secondary. The capability rating is the soul of the product; logging exists to feed it.

### 1.2 The Core Promise & North-Star Metric

The north-star metric is a single headline **Peak Score**: a build-relative, coverage-aware aggregate of demonstrated capability across the performed capability dimensions — Maximal Strength (`strength`), Power & Explosiveness (`power`), Muscular Endurance (`muscular_endurance`), Aerobic Endurance (`aerobic`), Anaerobic Capacity (`anaerobic`), Mobility & Flexibility (`mobility`), Balance & Stability (`balance`), Agility & Coordination (`agility`), and Body Composition (`body_composition`) — see §2 for the full dimension tree and §2.6 for the aggregation math. Consistency is a tenth dimension but is **momentum, not a capability percentile**, scored on its own track (§2.7) and surfaced beside the headline rather than blended into it.

Decisive properties of the Peak Score (these are invariants — any future scoring change must preserve them):

| Property | Decision | Why it matters |
|---|---|---|
| Build-relative | Score is an **empirical percentile conditioned on the user's immutable build** (sex + height + age), never raw numbers across mixed builds | A 5'8" 170 lb user is never compared to a 6'4" 220 lb user on raw load. This is the moat. |
| Coverage-aware | A **coverage-weighted aggregate of capped leaf percentiles**, explicitly NOT a flat average | A flat average punishes specialists and partial profiles; partial profiles are the normal case |
| "Peak" = top 5% for your build | Each leaf **caps its headline contribution at the top-5% threshold for your build** (`percentileRaw ≥ 0.95`), not literal #1 | Creates diminishing returns at the elite end (95th→99th earns nothing toward the headline), so the most efficient path up is always raising your **weakest tested leaf** — breadth rewarded through opportunity, never penalty |
| Recalibrates with build | As the immutable frame changes (age band, corrected height), the ceiling recalibrates | Keeps the potential ceiling honest as the body changes |
| Gaps are unknown, never zero | Untested capabilities are **absent with a confidence band**, never scored as zero | Honest assessment requires the system to know what it doesn't know |

The score is presented as a **tree, not flat bars**: Headline Peak Score → Dimensions → Sub-categories (per muscle group, sprint vs 5k, mobility per joint) → leaf capabilities, each carrying its own build-conditioned percentile and per-leaf coverage/confidence. Users get a per-leaf **"Peak" badge** (ceiling celebrated) and a coverage-weighted headline (demonstrated total) at two altitudes.

**AI-readiness implication (north-star):** The score is a *derived* value. Every percentile, tier, and aggregate must be stored alongside the raw measurements it was computed from (weight/reps/RPE/rest/time) and tagged with its **provenance** (`measured` | `inferred-from-strength` | `seed-population`) and a **confidence weight** — never as a bare display string. The future AI must be able to re-derive any score and reason about how trustworthy each leaf is. This directly contradicts the current prototype, where `Muscle.score`/`.pct`/`.trend` are hand-authored display strings with no raw lineage — a gap closed by the data model in §6 and the capability tree in §2.

### 1.3 Target Users

Peak is **mobile-first** (non-negotiable for a gym app) and aimed at people who train and want to know where they actually stand:

| Segment | Need Peak serves |
|---|---|
| **Intermediate lifters / hybrid athletes** (primary) | Already log; want an honest "how good am I?" and a sharp answer to "what's my weakest link?" |
| **Specialists** (powerlifters, runners) | Celebrated for their peak in their domain, never docked for gaps — the per-leaf cap + coverage-weighting + the confidence-floor rule (§2.6) protect them |
| **Returning / re-committing trainees** | A significant first score and time-based ETAs give an immediate, motivating reason to come back |
| **Injured / partial-profile users** | Must be **scoreable without penalty** for missing benchmarks; graceful degradation is a hard requirement, not an edge case. Eligibility is build/equipment/capability gated (§2.6) so a user who cannot run is not shown a coverage penalty for run leaves. |
| **Serious / data-literate users** | Will smell out a fake distribution or naive bodyweight ratio instantly — methodology transparency is what wins them |

The user's only competition is their **past self moving right on the curve**. There are **no public leaderboards, ever** (see §5.1).

### 1.4 Competitive Positioning

| App | What it does | What it doesn't answer | Peak's wedge |
|---|---|---|---|
| **Hevy** | Excellent passive logger (sets/reps/PRs) | "Am I actually good for my build?" — no capability verdict | Peak turns the same per-set log into a build-relative capability percentile |
| **WHOOP** | Recovery/strain/sleep from a wearable | "How strong/capable am I, and how do I improve it?" — measures readiness, not capability | Peak ingests the same passive biometrics but scores *capability and its ceiling*, not recovery |
| **Apple Fitness+** | Guided workouts + activity rings | "How close am I to my potential?" — closes rings, not gaps | Peak is an assessment + path, not a content library |

Differentiation must be sharper than "AI workout app." Peak is **first a genuinely good logger** with a capability meter on top; AI is a deferred layer (see §7.3, Phase P4), not the pitch. Every feature is evaluated against whether it sharpens the wedge versus these three named competitors.

### 1.5 The Moat

Three reinforcing, hard-to-copy properties form the defensible core:

1. **Build-relative empirical percentiles.** Capability is normalized only by **immutable** attributes (sex, height, age) via validated sports-science scaling (allometric ~mass^2/3 on the frame, VO2 ml/kg/min, WMA age-grading), then **empirically percentiled** against a seeded, build-stratified distribution. **Bodyweight is deliberately excluded** from normalization: baking it in would let fat loss fake a strength gain and muscle gain lower a ratio, conflating *condition* with *capability* (the full argument is in §3.2). Off-the-shelf strength standards (Wilks/IPF GL/DOTS/Symmetric Strength) are bodyweight-based and don't condition on height, so they are usable only as a secondary cross-check readout (§5.3, §7.4 Decision #5), never as the normalizer. Peak must build **height-conditioned distributions** from anthropometric data plus first-party data over time — a data asset that compounds and that competitors don't have (the cold-start construction is specified in §5.3).

2. **Per-muscle inference from logged training (the Peak-unique move).** Muscle-group strength and even a body-composition/muscularity prior are **inferred** from the compound + isolation lifts already captured (bench → chest/triceps/front-delt; squat → quads/glutes; benching 1.4× BW ⇒ demonstrably muscular). Per-muscle scores update **passively as the user trains** — formal benchmarks only *calibrate* the inference (§4.3). No generic calculator can do this because Peak has the training-history data; the meter gets sharper the more you use it.

3. **Methodology transparency.** Most apps hide their scoring. Peak **explains** it: every percentile is **labeled with its data source** (seed-population vs first-party), cross-dimension correlation assumptions are surfaced rather than hidden, and the curve is **seeded from real population data** (Symmetric Strength/ExRx, CDC/WHO, military fitness tests, NHANES anthropometrics + NHANES DEXA where vintage permits — see the dataset-vintage caveat in §5.4) and weighted toward real users over time — **never fabricated** (the sourcing registry and surfaced methodology notes are in §5.4 and §5.6). For a "how good am I?" product, an explained methodology is the trust asset that converts the skeptical serious user.

**AI-readiness implication (moat):** All three moat properties are only as strong as the data shape beneath them. Inference requires **stable relational IDs** linking leaf ↔ exercise ↔ muscle group ↔ dimension, a **machine-readable enum taxonomy** (muscle group, movement pattern, dimension, equipment), and **contextual snapshots** (build covariates + composition + bodyweight captured *at session time*) so the future AI can correlate composition change against performance. Transparency requires that every datum carry source + confidence, and that the recalibration events and methodology notes that explain trajectory discontinuities are themselves exported (§2.9, §6.9). These are not future retrofits — they are **first-class data-model constraints captured now** (see §6).

### 1.6 Business Model

**Freemium, mobile-first, shippable** (a real product, not a portfolio piece):

| Tier | Includes | Rationale |
|---|---|---|
| **Free** | A genuinely good per-set logger, streaks/consistency, basic body map | Acquisition; the free tier must stay good enough to retain on its own |
| **Paid** | Full capability scoring (build-relative tiers + percentiles), goal-driven program generation, projections/ETAs, and the AI coaching layer when it ships | The paywall sits on the **differentiated wedge** (scoring + AI), not on basic logging |

Primary retention hooks: **streaks/habit** (the consistency/momentum dimension — the habit is the motivation, the score is the proof; scored per §2.7) and the **projection feature** ("at this rate you'll hit 225 bench in 8 weeks" — gaps expressed as dates, not just numbers; see §2.6, the projection method in §2.6.1, and §7.3 Phase P3). The free/paid boundary across the roadmap is restated in §7.3: do not paywall raw logging.

---

## 2. The Capability Score Model

The Capability Score is the soul of Peak: a single, build-relative answer to *"how good am I, really?"* and the scaffold for *"how do I get better?"* This section specifies the score as a **tree** of build-conditioned percentiles, the **two-step normalization → empirical-percentile** method that makes it honest, the **per-leaf cap** that turns breadth into opportunity rather than penalty, the **headline aggregation** (Peak badges + coverage-weighted demonstrated total), the **consistency track** (momentum scored separately), and **recalibration** as the user's immutable frame is re-measured.

Every entity below is specified RAW-first per the canonical conventions: we store the raw measurement, the normalized value, the uncapped and capped percentiles, and the tier as **separate, timestamped, provenance-stamped fields** so the deferred AI layer (§6.9, §7.3 Phase P4) can re-derive any step, audit our math, and reason about trends. Where a choice has AI-readiness consequences, it is flagged inline; the full schema that persists these entities is §6. The current prototype's flat `peakScore()` (unweighted mean of 17 hand-set muscle scores in `src/model.ts`) is **replaced wholesale** by this model.

### 2.1 The capability tree

The score is a four-level tree, never flat bars. Each node has a stable ID; every edge is an explicit relational link so the AI layer can walk leaf ↔ exercise ↔ muscle group ↔ sub-category ↔ dimension ↔ headline in either direction (the persisted form is `CapabilityNode` in §6.5).

```
HEADLINE  ── Peak Score (coverage-weighted aggregate)  +  Peak Badge count
  │                                                     +  Consistency track (momentum, §2.7) shown alongside
  │
  ├─ DIMENSION  strength                        (Maximal Strength — per muscle group / movement pattern)
  │    ├─ SUB-CATEGORY  push.horizontal        (chest, front_delt, triceps …)
  │    │    └─ LEAF  strength.chest            ← inferred (infer/1) from logged sets
  │    │    └─ LEAF  strength.triceps
  │    ├─ SUB-CATEGORY  squat.pattern          (quads, glutes …)
  │    │    └─ LEAF  strength.legs
  │    └─ benchmark lifts                       LEAF strength.bench_1rm, strength.squat_1rm, strength.deadlift_1rm
  ├─ DIMENSION  power                           (Power & Explosiveness — see mass-relative note below)
  │    ├─ SUB-CATEGORY  power.lower_body        LEAF power.vertical_jump, power.broad_jump
  │    └─ SUB-CATEGORY  power.upper_body        LEAF power.med_ball_throw
  ├─ DIMENSION  muscular_endurance             (Muscular Endurance — reps/time to fatigue; see mass-relative note)
  │    ├─ SUB-CATEGORY  upper_push             LEAF muscular_endurance.pushups_max
  │    ├─ SUB-CATEGORY  upper_pull             LEAF muscular_endurance.pullups_max
  │    ├─ SUB-CATEGORY  core                   LEAF muscular_endurance.plank
  │    └─ SUB-CATEGORY  lower                  LEAF muscular_endurance.squats_bw
  ├─ DIMENSION  aerobic                         (Aerobic Endurance — sustained aerobic output; see mass-relative note)
  │    ├─ SUB-CATEGORY  aerobic.running        LEAF aerobic.5k, aerobic.mile
  │    └─ SUB-CATEGORY  aerobic.vo2            LEAF aerobic.vo2_proxy, aerobic.hr_recovery
  ├─ DIMENSION  anaerobic                       (Anaerobic Capacity — short maximal-effort output; see mass-relative note)
  │    ├─ SUB-CATEGORY  anaerobic.sprint       LEAF anaerobic.400m, anaerobic.sprint_repeats
  │    └─ SUB-CATEGORY  anaerobic.power_endurance  LEAF anaerobic.max_effort_60s
  ├─ DIMENSION  mobility                         (Mobility & Flexibility — range-of-motion, build-conditioned percentile)
  │    └─ SUB-CATEGORY  mobility.joint          LEAF mobility.hip, mobility.shoulder, mobility.ankle, mobility.spine
  ├─ DIMENSION  balance                          (Balance & Stability — LAUNCHES LOW-CONFIDENCE, thin population norms)
  │    ├─ SUB-CATEGORY  balance.static          LEAF balance.single_leg_eyes_closed
  │    └─ SUB-CATEGORY  balance.dynamic         LEAF balance.y_balance
  ├─ DIMENSION  agility                          (Agility & Coordination — LOWEST CONFIDENCE, likely v2)
  │    ├─ SUB-CATEGORY  agility.change_of_direction  LEAF agility.5_10_5
  │    └─ SUB-CATEGORY  agility.coordination    LEAF agility.t_test
  ├─ DIMENSION  body_composition               (Body Composition — see §3)
  │    ├─ SUB-CATEGORY  body_composition.lean  LEAF body_composition.ffmi
  │    └─ SUB-CATEGORY  body_composition.fat   LEAF body_composition.bf_band
  └─ DIMENSION  consistency                     (MOMENTUM — NOT a capability percentile; scored on its own track, §2.7; surfaced beside the headline, never blended as a leaf percentile)
       └─ (no capability leaves — see §2.7 for the streak/adherence track schema)
```

**The energy-system split (aerobic vs anaerobic), resolved.** The former single `cardio`/`endurance` pair is replaced by an **energy-system split** plus a separated muscular-endurance dimension. The split is by *physiological quality*, not by "is it cardiovascular":

- **`aerobic`** (Aerobic Endurance) measures **sustained aerobic output**: age-graded distance/running performance (`aerobic.5k`, `aerobic.mile`, normalized by `wma_age_grade`) and aerobic base (`aerobic.vo2_proxy`, `aerobic.hr_recovery`, normalized by `vo2_relative`). VO2 is the canonical aerobic-base measure and lives here, under `aerobic.vo2`.
- **`anaerobic`** (Anaerobic Capacity) measures **short maximal-effort output** that taxes the anaerobic energy systems: sprints and repeated sprints (`anaerobic.400m`, `anaerobic.sprint_repeats`) and power-endurance (`anaerobic.max_effort_60s`), normalized by `anaerobic_norm`.
- **`muscular_endurance`** (Muscular Endurance) measures **reps/time to local muscular fatigue** (`muscular_endurance.pushups_max`, `.pullups_max`, `.plank`, `.squats_bw`), normalized by `musc_endurance_norm` — a *sustained local-muscular capacity*, distinct from whole-body aerobic capacity.

So "cardiovascular" describes the system the `aerobic`/`anaerobic` dimensions tax; the dimensions differ in whether they score a *sustained aerobic output* (aerobic) or a *short maximal-effort output* (anaerobic). The aerobic↔anaerobic↔muscular-endurance overlap is documented as a methodology assumption (§5.6) because the three correlate.

**Mass-relative leaves (healthy-floor guard).** `power` (jump height and broad-jump distance are bodyweight-relative), `muscular_endurance` (bodyweight-movement reps/holds), `aerobic` (VO2 ml/kg/min and running), and `anaerobic` (sprint times) all contain **mass-relative leaves** whose raw performance rises as a user sheds mass. These carry the §3.6.1 healthy-floor guard so no dimension rewards dangerously sub-floor leanness.

**Mobility, balance & agility (resolved).** Mobility (Mobility & Flexibility) is its own top-level **capability dimension** with build-conditioned percentile leaves (`mobility.hip`, etc.) normalized by `rom_norm` (§2.2). **Balance** (Balance & Stability) and **agility** (Agility & Coordination) are also top-level performed dimensions, but launch at low confidence: balance population norms are thin (low-confidence seed) and agility is the lowest-confidence dimension (likely v2 — §7.3, §7.5). None of these is a child of `consistency` (which carries no capability percentile); each rolls into the headline like any other performed capability leaf (§2.6).

**Leaf** is the atomic unit of capability — the only level that carries a measured/inferred percentile. Everything above is a **rollup** (§2.6). Leaves come in two acquisition kinds:

| Leaf kind | How its value is obtained | Example leaves | Provenance default |
|-----------|---------------------------|----------------|--------------------|
| `direct` | A benchmark or logged performance maps straight to the leaf | `aerobic.5k`, `muscular_endurance.pushups_max`, `muscular_endurance.plank`, `power.vertical_jump`, `body_composition.ffmi`, `mobility.hip`, `balance.y_balance` | `measured` |
| `inferred` | No max test exists; value is derived from logged compound + isolation sets (e.g. bench → chest/triceps/front_delt) | `strength.chest`, `strength.lat` | `inferred-from-strength` |

Per-muscle strength leaves are **always `inferred`** and update **passively** as the user trains — we never require an isolation max test. A formal benchmark, when performed, raises that leaf's confidence and recalibrates the inference; it does not become a prerequisite (the inference mechanics are §4.3).

#### Leaf identity and taxonomy

Every leaf, sub-category, and dimension is a **stable string enum**, never free text, in the single snake_case namespace fixed by the canonical conventions. IDs are namespaced and immutable across versions; renames happen in a display-label table, never on the ID.

```ts
type LeafId = string;        // e.g. "strength.chest", "aerobic.5k", "mobility.hip", "body_composition.ffmi", "power.vertical_jump"
type SubCategoryId = string; // e.g. "push.horizontal", "aerobic.running", "mobility.joint", "balance.static"
type DimensionId =
  | "strength"            // "Maximal Strength"
  | "power"               // "Power & Explosiveness"
  | "muscular_endurance"  // "Muscular Endurance"
  | "aerobic"             // "Aerobic Endurance"
  | "anaerobic"           // "Anaerobic Capacity"
  | "mobility"            // "Mobility & Flexibility"
  | "balance"             // "Balance & Stability"
  | "agility"             // "Agility & Coordination"
  | "body_composition"    // "Body Composition"
  | "consistency";        // "Consistency"
// NOTE: "consistency" carries NO capability leaves (§2.7). All other dimensions do.

// movement-pattern + muscle taxonomy are enums shared with the logging layer (§6.3)
type MovementPattern =
  | "horizontal_push" | "vertical_push" | "horizontal_pull" | "vertical_pull"
  | "squat" | "hinge" | "lunge" | "carry" | "run" | "row_erg" | "cycle"
  | "swim" | "jump" | "rotation" | "isolation" | "isometric" | "mobility";
type MuscleGroup =
  | "chest" | "front_delt" | "side_delt" | "rear_delt" | "triceps" | "biceps"
  | "forearms" | "lat" | "trap" | "lower_back" | "abs" | "obliques"
  | "glutes" | "quads" | "hamstrings" | "calves" | "tibialis";  // extends the current 17-muscle keys

interface CapabilityLeaf {
  id: LeafId;
  dimension: DimensionId;             // never "consistency"
  subCategory: SubCategoryId;
  kind: "direct" | "inferred";
  // relational links for AI graph-walking
  muscleGroups: MuscleGroup[];        // [] for pure-aerobic/anaerobic/mobility/balance/agility leaves
  movementPatterns: MovementPattern[];
  contributingExerciseIds: string[];  // exercises whose sets feed this leaf (catalog owned by §6.5)
  normalizer: NormalizerSpec;         // see §2.2 — chosen BEFORE the leaf ships
  unit: Unit;                         // explicit unit of the RAW measure, e.g. "kg", "sec", "ml/kg/min", "degree"
  staleAfterDays: number;             // leaf-specific staleness horizon (§2.5, §4.4) — set per leaf at ship time
}
```

> **AI-readiness flag — taxonomy extension.** The prototype's `bodyParts.json` exposes 17 muscle keys; the `MuscleGroup` enum above splits delts (front/side/rear) for honest inference. The leaf graph must NOT be hard-coded to the SVG geometry — the SVG is a *view*. Keep `MuscleGroup` as the source of truth and map it to SVG paths in a separate table, or per-muscle scoring stays coupled to a drawing (this decoupling is also stated in §6.3).

### 2.2 The percentile method (two steps, per leaf)

Every leaf percentile is computed by the same two-step pipeline. **Raw is never percentiled across mixed builds.** The method is the moat; we store every intermediate so it is auditable and re-derivable.

**Step 1 — Normalize raw → build-neutral score.** Strip the bulk of build effect using the leaf's pre-declared normalizer, conditioning **only on immutable attributes** (sex, height, age — never bodyweight, never composition; the immutable-build principle, §3.1). Each leaf picks its method *before it ships*:

| Leaf family | Normalizer (`NormalizerSpec.method`) | Conditions on | Notes |
|-------------|--------------------------------------|---------------|-------|
| `strength` (Maximal Strength — per-muscle inferred + benchmark lifts) | `height_conditioned_strength` | sex, height, age | Off-the-shelf Wilks/DOTS/IPF-GL are **bodyweight-based and rejected** as the normalizer (cross-check only, §5.3, Decision #5). We build height-conditioned distributions from anthropometric datasets + first-party data (the bridge model, §5.3); early leaves launch lower-confidence (§2.4, §5.3). The functional form and allometric exponent are an open spec item (§5.3, OQ-9). |
| `power` (Power & Explosiveness — `power.vertical_jump`, `.broad_jump`, `.med_ball_throw`) | `power_norm` | sex, age, height | Jump height / throw distance vs sex+age+height norms; jump height is **build-relative** (height enters the norm). MASS-RELATIVE → §3.6.1 healthy-floor guard applies (jump height is bodyweight-relative). |
| `muscular_endurance` (Muscular Endurance — `pushups_max`, `pullups_max`, `plank`, `squats_bw`) | `musc_endurance_norm` | sex, age | Reps/time vs age/sex norms. MASS-RELATIVE (bodyweight-movement) → §3.6.1 guard. |
| `aerobic` — running (`aerobic.5k`, `aerobic.mile`) | `wma_age_grade` | sex, age | WMA age-graded tables; output is a 0–1 age-grade per distance. MASS-RELATIVE → §3.6.1 guard. |
| `aerobic` — VO2 base (`aerobic.vo2_proxy`, `aerobic.hr_recovery`) | `vo2_relative` | sex, age | VO₂ in ml/kg/min vs age/sex norm. MASS-RELATIVE → §3.6.1 guard. |
| `anaerobic` (Anaerobic Capacity — `anaerobic.400m`, `sprint_repeats`, `max_effort_60s`) | `anaerobic_norm` | sex, age | Time/distance vs age/sex norms. MASS-RELATIVE (sprint times) → §3.6.1 guard. |
| `mobility` (Mobility & Flexibility) | `rom_norm` | sex, age | ROM degrees vs age/sex norm bands. |
| `balance` (Balance & Stability — `balance.single_leg_eyes_closed`, `y_balance`) | `balance_norm` | sex, age | Time/reach vs age/sex norms. **Launches low-confidence** — population norms are thin (§5.4). |
| `agility` (Agility & Coordination — `agility.5_10_5`, `t_test`) | `agility_norm` | sex, age | Time vs age/sex norms. **Lowest confidence — likely v2** (§5.4, §7.3, §7.5). |
| Body comp — lean | `ffmi` | sex, age | FFMI = lean / height² (height already divided out in the metric, so it is **not** conditioned on again — see §3.3). |
| Body comp — fat | `bf_band` | sex, age | BF% scored against a target band with a healthy floor (§3.6). |

```ts
type NormalizerMethod =
  | "height_conditioned_strength"   // strength
  | "power_norm"                    // power (jump/throw vs sex+age+height; mass-relative)
  | "musc_endurance_norm"           // muscular_endurance (reps/holds vs age/sex; mass-relative)
  | "wma_age_grade"                 // aerobic running
  | "vo2_relative"                  // aerobic VO2 base (mass-relative)
  | "anaerobic_norm"                // anaerobic (sprint time/distance vs age/sex; mass-relative)
  | "rom_norm"                      // mobility
  | "balance_norm"                  // balance (time/reach; thin norms, low-confidence)
  | "agility_norm"                  // agility (time; lowest-confidence, likely v2)
  | "ffmi" | "bf_band";             // body composition

interface NormalizerSpec {
  method: NormalizerMethod;
  version: string;              // bump when the formula/table changes — re-derivable history
  conditionsOn: ("sex" | "height" | "age")[];   // immutable-build invariant: never bodyweight/composition
}
```

**Step 2 — Empirical percentile, stratified by build.** Look up the normalized value in a **seeded empirical distribution**, stratified by the strongest covariates (sex, age band; height enters via Step 1 conditioning). The output is `percentileRaw ∈ [0,1]` (uncapped) plus the tier band it falls in (derived from `percentileRaw`, §2.3). The distribution is real population data first, real users blended in over time, with the source always labeled (the distribution object, blend rule, and seed registry are specified in §5.4).

#### What we store per leaf score (the core record)

This is the central AI-ready datum. **Raw, normalized, uncapped percentile, capped percentile, tier, and provenance are all separate fields** so the AI can re-run Step 1 or Step 2, audit a percentile against its inputs, or recompute under a new normalizer version. Per the canonical conventions, there is no bare `percentile` field; `percentileRaw` is canonical truth and `cappedPercentile` is its derived sibling. (This is persisted as the `CapabilityScore` family in §6.6.)

```ts
interface LeafScore {
  leafId: LeafId;
  // RAW (never discarded) ──────────────────────────────
  raw: Quantity;                                  // e.g. { value:100, unit:"kg" } est-1RM, { value:1320, unit:"sec" } 5k
  rawSource: "benchmark" | "logged_set" | "health_integration";
  contributingSetIds?: MeasurementId[];           // links to the per-set/event rows that produced an inferred value (§6.2 MeasurementId)
  // DERIVED ────────────────────────────────────────────
  normalized: number;                             // Step 1 output, dimensionless [0,1]
  normalizerMethod: NormalizerMethod;
  normalizerVersion: string;
  percentileRaw: number | null;                   // UNCAPPED [0,1] — CANONICAL; null = untested (§2.5)
  cappedPercentile: number | null;                // = min(percentileRaw, 0.95); null = untested
  tier: TierId | null;                            // band of percentileRaw (§2.3); null = untested
  // CONTEXT / TRUST ────────────────────────────────────
  buildSnapshot: BuildSnapshot;                   // immutable covariates AT compute time (§2.8)
  confidence: number;                             // [0,1] per-leaf composite (§2.4)
  distributionSource: "seed_population" | "blended" | "first_party";  // labeled per percentile
  distributionId: DistributionId;                 // exact versioned distribution used (§5.4) — comparability
  computedAt: string;                             // ISO 8601
  state: LeafState;                               // explicit unknowns (§2.5)
}
```

> **AI-readiness flag — display vs data separation.** The prototype stores formatted display strings (`ratio: "1.2× BW"`, `pct: "81st"`, hex `diffColor`) intermixed with data (`src/model.ts Muscle`). That is **rejected** for `LeafScore`: store numbers + units + enums; formatting ("81st", "1.2× BW") is a render-time concern. A score record must serialize cleanly to a JSON feature vector (the full RAW+DERIVED separation rule is restated as a schema constraint in §6.1 and §6.6).

### 2.3 Tiers as percentile bands, and the per-leaf cap

Tiers are **percentile bands on the build-conditioned distribution**, derived from the **uncapped** `percentileRaw` (canonical convention #3) — never a raw 0–100 scale, and never from the capped value (which would collapse every leaf ≥ 0.95 into one band and destroy the `elite`/`peak` distinction). "Peak" is **~top 5% for your build**, the achievable ceiling, *not* literal #1. All bands are half-open lower-inclusive `[lo, hi)`:

| Tier (`TierId`) | `percentileRaw` band | Meaning |
|-----------------|----------------------|---------|
| `foundation` | `[0.00, 0.25)` | Starting out for your build |
| `developing` | `[0.25, 0.50)` | Below the build median |
| `proficient` | `[0.50, 0.75)` | Solidly above average for your build |
| `advanced` | `[0.75, 0.90)` | Strong |
| `elite` | `[0.90, 0.95)` | Rare |
| `peak` | `[0.95, 1.00]` | The achievable ceiling — earns a **Peak badge** |

Boundary rule (canonical convention #4): a value exactly on a boundary (`0.25, 0.50, 0.75, 0.90, 0.95`) belongs to the **upper** band. So `0.95` is unambiguously `peak`, badge-earning, and the cap value, with no off-by-one.

> The exact tier *names* are an open question (Bronze→Peak vs D→S-tier; §7.5, OQ-5); the **bands and the 95th-percentile "Peak" threshold are fixed.** Treat `TierId` as a stable enum independent of display labels.

**The per-leaf cap (diminishing returns).** A leaf's *contribution to the headline* caps at the **95th-percentile threshold**: `cappedPercentile = min(percentileRaw, 0.95)`. `percentileRaw` is retained uncapped for truth and tiering. The cap affects only headline aggregation (§2.6) — never tier classification.

Consequence, by design:
- Going **95th → 99th** on an already-Peak leaf earns **zero** additional headline movement (its `cappedPercentile` is pinned at 0.95) — but the leaf stays tier `peak` and its rising `percentileRaw` is preserved for plateau/redirect coaching.
- Therefore the **most efficient path to a higher headline is always raising your weakest tested leaf.**
- This rewards breadth through **opportunity** (a cheap, high-yield next move), **never through penalty** — a specialist is never docked for gaps; their Peak leaf is fully celebrated with a badge. This is the mechanism behind "wellroundedness is a lens, not a gate" (§7.4, Decision #8).

> **AI-readiness flag — keep both percentiles.** We store `percentileRaw` (uncapped, canonical) AND `cappedPercentile` (derived, for aggregation). If we discarded the uncapped value, the AI could not tell a 95th-percentile leaf from a 99.5th one, and plateau detection / "you've maxed this, redirect effort" coaching would be impossible.

### 2.4 Per-leaf coverage and confidence

Confidence/coverage is **per leaf**, not global, because data depth is uneven (solid for major lifts and running; thin for height-conditioned per-muscle endurance). Every leaf carries a `confidence ∈ [0,1]` derived from explicit factors so the AI can reason about *why* a score is soft. The factor set and combination rule below are **canonical** and are the single definition referenced by §4.4 (which lists the same five factors under benchmark-facing names).

```ts
interface LeafConfidence {
  leafId: LeafId;
  value: number;                       // [0,1] composite — see combination rule below
  factors: {
    distributionDepth: number;         // [0,1] how well-seeded/observed the build cohort is for this leaf (= §4.4 "covariate-match" × "curve provenance")
    measurementQuality: number;        // [0,1] protocol ceiling × execution quality (measured > inferred > health-estimate)
    recency: number;                   // [0,1] recency decay, see curve below; drives re-test prompts
    inferenceChainLength: number;      // [0,1] 1.0 for direct; lower for longer compound→muscle inference chains
  };
  asOf: string;                        // ISO 8601
}
```

**Combination rule (canonical).** The composite is the **product** of the four factors, each in `[0,1]`:

```
confidence = distributionDepth × measurementQuality × recency × inferenceChainLength
```

A product (not a sum/min) is chosen so that any single near-zero factor (e.g. a brand-new bridge-model strength leaf with `distributionDepth ≈ 0.4`, or a stale leaf with `recency ≈ 0.2`) correctly drags the whole leaf's confidence down — confidence is "weakest-link-leaning" by construction.

**Recency decay (canonical curve).** `recency = 0.5 ^ (daysSinceComputed / staleAfterDays)` — i.e. confidence-from-recency halves every `staleAfterDays` (the leaf-specific horizon on `CapabilityLeaf`, §2.1). A leaf crosses into `state: "stale"` (§2.5) once `daysSinceComputed > staleAfterDays`. `staleAfterDays` per leaf is set at ship time; defaults by family are an OQ (§7.5, OQ-12) — strength/inferred leaves shorter (they drift with training), composition longer.

**Reconciliation with §4.4.** §4.4 enumerates the same composite under benchmark-facing names — protocol ceiling and execution quality fold into `measurementQuality`; covariate-match and curve provenance fold into `distributionDepth`; recency decay is `recency`; the inference depth is `inferenceChainLength`. There is one composite and one product rule; the two sections are two views of it.

Confidence drives the UI **confidence band** around every percentile and the **coverage indicator** in onboarding (§4.5). It also down-weights a leaf in the headline rollup (§2.6) — subject to the **confidence-floor rule** (§2.6) that prevents a structurally cold-start dimension from suppressing a specialist's headline. Early height-conditioned strength leaves ship with `distributionDepth` low and honest — the per-leaf confidence system absorbs that (the strength-data-sourcing decision behind this is §5.3).

### 2.5 Explicit gaps — untested is unknown, never zero

A leaf the user has never benchmarked or trained is `state: "untested"` with **`percentileRaw: null`, `cappedPercentile: null`, `tier: null`, and `confidence: null`** — NOT `0` for any of them. This is a hard invariant: the difference between "tested and weak" (`developing`, percentileRaw 0.30) and "never tested" (`untested`, null) must survive into the data model, because the AI's first job is knowing what it doesn't know. A `confidence` of `0.0` is forbidden for an untested leaf: `0.0` is a *definite* "no confidence," whereas an untested leaf's confidence is *unknown* — and per §6.1 req. 5, `0` means "measured zero," never "absent."

```ts
type LeafState = "measured" | "inferred" | "stale" | "untested";
```

- `measured` — a direct benchmark/logged performance produced this score recently.
- `inferred` — value derived from logged sets (per-muscle strength); valid but lower-confidence.
- `stale` — once-measured, now past its `staleAfterDays` horizon; surfaces a re-test prompt, retains its last value with decayed confidence (recency curve, §2.4).
- `untested` — never produced; all derived fields `null`. **Excluded** from rollups and from the coverage *numerator* (it contributes coverage = 0, never a zero score).

> **AI-readiness flag — null is sacred.** The prototype defaults muscle scores to authored numbers and `peakScore()` averages all 17 as if every muscle were measured. That conflates "untested" with "scored," which would teach the AI a false floor. In the new model, `untested` leaves are **absent from the aggregate**, shown with a confidence band, never coerced to a number, and their confidence is `null` (unknown), never `0.0` (this enforces the "no pre-fabricated activity" working preference; the migration rule is §7.2).

### 2.6 Rollups: from leaves to the headline

There are **two headline outputs at two altitudes**, both derived purely from `LeafScore` records so nothing above leaf level is independently authored. Consistency/momentum is **not** part of either; it is scored on its own track (§2.7) and surfaced beside the headline.

#### (a) Peak badges — the ceiling, per leaf
A **Peak badge** is earned per leaf whenever `percentileRaw ≥ 0.95`. The headline surfaces a **badge count** (e.g. "4 Peak capabilities"). This celebrates a specialist's ceiling directly and is unaffected by coverage — a pure powerlifter with three Peak strength leaves and nothing else still proudly holds three Peak badges.

#### (b) Peak Score — the demonstrated total (coverage-weighted aggregate)
The headline number is a **coverage-weighted aggregate of capped leaf percentiles**, NOT a flat average. Untested leaves are excluded (coverage, not zero); each included leaf is weighted by an **effective confidence** and structural weights.

```
For each tested leaf i:
    cappedPct_i   = min(percentileRaw_i, 0.95)
    effConf_i     = max(confidence_i, CONF_FLOOR)              // confidence-floor rule, see below
    w_i           = effConf_i × dimWeight(dimension_i) × subCatWeight(subCategory_i)

PeakScore = Σ(w_i · cappedPct_i) / Σ(w_i)          // over tested leaves only, across the 9 PERFORMED dimensions:
                                                   //   strength, power, muscular_endurance, aerobic, anaerobic,
                                                   //   mobility, balance, agility, body_composition
                                                   // consistency is NOT in this aggregate (own momentum track, §2.7)

Coverage  = (# tested eligible leaves) / (# eligible leaves)   // reported alongside, never multiplied into the score
```

**Weights (`dimWeight`, `subCatWeight`).** These are versioned reference data (`weights/1`), shipped with the app and surfaced in the methodology note (§5.6), not magic numbers in code. The v1 values:

The weights are **redistributed across the expanded taxonomy** (9 performed dimensions); the v1 values below are defaults to be tuned against real profiles (OQ-13) — they are not final, and the redistribution preserves the locked invariants (body_composition stays elevated; thin-data/low-confidence dimensions carry low weight early). The exact numbers below are illustrative v1 defaults, not ratified constants:

| Dimension | `dimWeight` (v1 default) | Rationale |
|---|---|---|
| `strength` (Maximal Strength) | 1.0 | Baseline; the largest capability surface |
| `power` (Power & Explosiveness) | 0.9 | Distinct trainable quality; mass-relative leaves, moderate data |
| `muscular_endurance` (Muscular Endurance) | 0.9 | Distinct from aerobic; overlaps strength/aerobic, slightly discounted |
| `aerobic` (Aerobic Endurance) | 1.0 | Baseline; well-covered (WMA + VO2 seed) |
| `anaerobic` (Anaerobic Capacity) | 0.9 | Overlaps aerobic physiologically (§2.1 split note); slightly discounted to avoid double-counting |
| `mobility` (Mobility & Flexibility) | 0.7 | Real capability, thinner data + lower training centrality for the primary segment |
| `balance` (Balance & Stability) | 0.5 | **Low weight + low confidence early** — thin population norms (§5.4); contributes little until data accrues |
| `agility` (Agility & Coordination) | 0.4 | **Lowest weight + lowest confidence** — likely v2 (§7.3); contributes minimally at launch |
| `body_composition` (Body Composition) | 1.3 | **Elevated** because bodyweight is excluded from strength normalization (§3.2), so composition is where condition is legitimately scored; up-weighting it keeps the headline honest about body state without letting bodyweight leak into strength |
| `consistency` (Consistency) | n/a | Not in this aggregate — own track (§2.7) |

`subCatWeight` defaults to `1.0` for every sub-category in v1 (so the headline is, in v1, a dimension-weighted confidence-weighted mean of capped leaf percentiles). It exists as a tuning hook for later (e.g. de-emphasizing the VO2 sub-category vs running within `aerobic`); any non-1.0 value is published in `weights/N`. The exact future tuning of both weight tables — including this expanded-taxonomy redistribution — is tracked as an open question (§7.5, OQ-13).

**Confidence-floor rule (resolves the specialist-suppression problem).** Because cold-start strength leaves launch at low confidence (e.g. 0.4) while running launches near 0.85 (§5.3), a naive confidence-weighting would structurally suppress a strength specialist's headline relative to a runner of identical relative ability — breaking the "specialists are never penalized" promise (Decision #7). To prevent this, the weight uses `effConf_i = max(confidence_i, CONF_FLOOR)` with `CONF_FLOOR = 0.5` in v1. Confidence still widens the displayed band and still down-weights *within* the floor-to-1.0 range, but it can no longer drive a whole dimension's leaves toward zero weight purely because the *distribution* (not the user's data) is thin. The raw `confidence` is retained on every leaf so the AI sees the true value; only the *aggregation weight* is floored. `CONF_FLOOR` is part of `weights/1`.

**Eligibility (resolves "what counts toward coverage").** A leaf is **eligible** for a user only if it is build/equipment/capability-appropriate. Eligibility is gated, not universal:
- Leaves the user has structurally opted out of (e.g. an injured user marks running unavailable, or has no access to required equipment) are **excluded from the coverage denominator** — they are neither tested nor counted against coverage, so the coverage number shown is never demoralizing (the §1.3 product concern).
- All other reference-tree leaves are eligible and count toward the denominator whether tested or not (so coverage honestly reflects breadth of demonstrated capability).
- Eligibility is stored per user as an `eligibility` flag map keyed by `LeafId` (default: eligible), editable in profile, and exported so the AI knows the user's chosen scope. An untested-but-eligible leaf lowers coverage (an opportunity, surfaced as such); an ineligible leaf is invisible to coverage entirely.

Key properties (all by design):
- **Coverage-aware, not punitive.** A partial profile scores from what exists; it is reported *with* a coverage indicator, not penalized by one. Coverage is shown beside the score, never silently dragging it toward zero.
- **Cap-driven breadth nudge.** Because each leaf is capped at 0.95, the marginal gain from a new weak leaf exceeds the (zero) gain from pushing a Peak leaf higher.
- **Confidence-weighted, floored.** Soft leaves move the headline less, keeping it honest, but the floor prevents structural suppression of cold-start dimensions.
- **Single-leaf floor for a credible first score** (resolves "first score must feel significant"). The headline is only rendered as a Peak Score once **MIN_HEADLINE_LEAVES = 3 tested leaves spanning ≥ 2 dimensions** exist. Below that, onboarding shows **per-leaf tier placements** (each leaf's own percentile + tier, which always feels significant — "you're advanced at the bench for your build") plus a prominent coverage/next-step prompt, rather than a single-leaf headline artifact. The thresholds are part of `weights/1`. This is the defined behavior at the most important UX moment (§4.5).

> **Dimension weights & the body-comp/bodyweight boundary.** `body_composition` carries elevated weight (1.3) precisely because bodyweight is excluded from strength normalization (§3.2). Note this does **not** violate the "bodyweight is never a percentile input" invariant: the `body_composition.ffmi` leaf is percentiled on FFMI = lean/height² (a *composition* metric), and the cap/floor/weighting all operate on that composition percentile — bodyweight is an *input to deriving lean mass*, never a normalizer covariate (the boundary is restated and reconciled in §3.2 and §3.3).

#### Cross-dimension correlation model (`xdim/N`) — current effect and roadmap
Public seed datasets are siloed (strength and aerobic/anaerobic data rarely cover the same individuals), so any *blended* headline necessarily *assumes* something about cross-dimension correlation. Per the transparency principle, that assumption is **stored as a named, versioned parameter (`xdim/N`) and surfaced** (§5.6), never hidden, and is **exported in the AI context** (§2.9) so the AI can interpret reliability.

**Current (`xdim/1`) effect on the math — stated explicitly (no longer a gap):** in v1 the correlation model is the **identity / independence assumption**. The headline formula above is exactly the model: leaves are combined as a flat dimension-weighted, confidence-floored mean with **no covariance term**, i.e. `xdim/1` asserts "we do not adjust for cross-dimension correlation; each dimension contributes independently." This is the honest, conservative default given siloed data. `correlationModel: "xdim/1"` is stamped on every headline so the AI knows no covariance correction was applied. A future `xdim/2` (an actual covariance/shrinkage adjustment, requiring first-party multi-dimension data) is the subject of OQ-7 (§7.5); when it ships it changes the aggregation and bumps the stamp, and historical headlines remain recomputable from preserved leaf scores.

#### 2.6.1 Goal/ETA projection method (resolves the projection gap)
Time-based projections ("at this rate you'll hit 225 bench in 8 weeks"; gaps-as-time) are computed from a leaf's `ScorePoint[]` trajectory (§6.6) by a **named, versioned projector (`proj/1`)**, stamped on every projection so the AI can audit it:

- **Fit:** ordinary least-squares **linear regression** of the target metric (raw or `percentileRaw`, depending on the goal) against time, over a trailing window (default 84 days / 12 weeks; configurable in `proj/1`).
- **Plateau guard:** if the regression slope is within noise (|slope| < the regression standard error) the projector returns **"no current trend"** rather than an ETA — never an infinite or fabricated date.
- **Confidence interval:** the ETA is reported as a **range** from the slope's standard error (e.g. "6–10 weeks"), never a false-precision single date, and inherits the contributing leaf's `confidence`.
- **Saturation:** if the goal is a percentile near the 0.95 cap, the projector reports the ETA to 0.95 and flags that further gains stop moving the headline (the cap, §2.3).
- A goal with too few points (`< 4` ScorePoints in window) returns `state: "insufficient_data"`, never a guess.

`proj/1` is reference data; its window and CI method are surfaced in the methodology note (§5.6). The exact curve family beyond the linear default (exponential-plateau for near-ceiling leaves) is tracked as OQ-14 (§7.5).

#### Weekly attributed movement (structured, not prose)
Because every `LeafScore` is timestamped and sequenced, the headline delta between any two dates is **fully attributable** to specific leaves. Attribution is stored as a **structured `Attribution` record** the AI can compute over — never a free-text English sentence (the prose is rendered from it at display time):

```ts
type Attribution = {
  leafId: LeafId;
  fromPercentileRaw: number; toPercentileRaw: number;     // the leaf move
  fromCappedPercentile: number; toCappedPercentile: number;
  headlineDelta: number;                                  // this leaf's contribution to the Peak Score change
  triggeringSessionId: string | null;                    // the session/benchmark that caused it (§6.4)
  triggeringMeasurementIds: MeasurementId[];              // raw events behind the move
  windowStart: string; windowEnd: string;                // ISO 8601
};
```

Display ("mile time dropped 20s → aerobic.mile 78th→86th → +0.04 Peak Score") is rendered from this record; the structured form is what makes attribution and the gap-as-ETA projections (§2.6.1) computable rather than re-parsed from English. The persisted trajectory is `ScorePoint[]` and the attribution stream is `Attribution[]` in §6.6.

### 2.7 The consistency track (momentum, scored separately)

Consistency is the tenth dimension but is **momentum, not a capability percentile** — it has no capability leaves and is **never blended into the Peak Score** (§2.6). It is scored on its own track, surfaced *beside* the headline, and is a primary retention hook (§1.6). This section defines the track that the previous spec referenced but never specified.

The substrate is `Session.localDay` (§6.4): each logged session stamps a local calendar day. From the day-sequence of sessions, the track computes a small set of explicit, recomputable values — all derived, all re-derivable from the raw session log, none authored:

```ts
interface ConsistencyTrack {
  // RAW substrate: derived purely from Session.localDay history (§6.4)
  currentStreakDays: number;          // consecutive active days up to today (timezone-stable via localDay)
  longestStreakDays: number;
  activeDaysTrailing28: number;       // count of active days in the trailing 28-day window
  adherenceTrailing28: number | null; // [0,1] = sessions-with-programId-completed / programmedSessions in window; null if no program
  // DERIVED momentum score (own scale, NOT a build percentile, NOT capped)
  momentum: number;                   // [0,1] = w_streak·f(currentStreakDays) + w_active·(activeDaysTrailing28/28)
                                      //         + w_adherence·(adherenceTrailing28 ?? activeFraction)
  momentumModel: "momentum/1";        // versioned reference weights, surfaced in methodology note (§5.6)
  history: ConsistencyPoint[];        // timestamped trajectory for trend (same shape discipline as ScorePoint)
  asOf: string;                       // ISO 8601
}
type ConsistencyPoint = { at: string; momentum: number; currentStreakDays: number; activeDaysTrailing28: number };
```

`momentum/1` weights (reference data, surfaced): `w_streak = 0.4`, `w_active = 0.4`, `w_adherence = 0.2`, with `f(streak) = 1 − 0.5^(streakDays/7)` (saturating — a 7-day streak ≈ 0.5, a 28-day streak ≈ 0.94) so a long streak is rewarded with diminishing returns rather than runaway. When no program exists, the adherence term falls back to `activeDaysTrailing28/28` so `momentum` is always defined for an active user.

**Why separate:** momentum is a *behavioral* signal (did you show up), not a *capability* signal (how good you are for your build). Blending it into the Peak Score would let showing up inflate a capability number, conflating habit with ability — exactly the conflation the immutable-build principle forbids elsewhere. The momentum score is shown next to the headline ("Peak Score 0.71 · Momentum 0.62 · 11-day streak") so the habit is celebrated without polluting the capability verdict.

> **AI-readiness flag — consistency is exported.** `ConsistencyTrack` (current value + `history`) is included in the AI context (§2.9, §6.9) so the deferred AI can do adherence/habit coaching. The previous spec exported sessions but never the aggregated consistency track; that gap is closed — the AI gets the streak, the trailing-window activity, adherence, and the momentum trajectory as structured fields, not re-derived from raw `localDay`s.

### 2.8 Build snapshots and recalibration

The score is build-relative, so the **immutable build covariates are snapshotted at every compute** and recalibration is automatic when the frame's *measured* state changes.

```ts
interface BuildSnapshot {
  sex: "male" | "female" | "unspecified";   // immutable covariate (cohort behavior for "unspecified": §5.2)
  heightCm: number;                          // immutable covariate
  ageYears: number;                          // DERIVED for display; recomputed from birthDate (the source of truth)
  birthDate: string;                         // ISO 8601 — SOURCE OF TRUTH for age (resolves age-band drift, see below)
  // contextual (NOT normalizer inputs) — captured for AI correlation only:
  bodyweightKg: number | null;               // input only; never in the normalizer
  bodyFatPct: number | null;
  ffmi: number | null;
  capturedAt: string;                        // ISO 8601
  source: "health_integration" | "manual" | "inferred";  // provenance
}
```

**Age source-of-truth (resolves the birthDate-vs-int contradiction).** Age is stored as `birthDate` (ISO) on every snapshot, and `ageYears` is a derived convenience recomputed from `birthDate` at `capturedAt`. The snapshot does **not** freeze a bare int as the source of truth, so an AI can always recompute the exact age at compute time and age-band-crossing recalibration is unambiguous even when a session lands the day before vs after a birthday. `birthDate` itself comes from HealthKit/Google Fit where available, else user-stated at onboarding (the no-data path is §4.5); whichever, it is stored once and carried, never re-sourced per session.

**What recalibration means.** Build is two kinds of attribute:
- **Immutable frame** (sex, height, age) — defines the reference cohort. Age advancing into a new band, or a corrected height, re-selects the cohort and **re-percentiles every leaf**. Bodyweight and composition are **never** in this frame (immutable-build principle, §3.1); changing them does *not* move the cohort.
- **Condition** (bodyweight, composition) — measured as the body-comp dimension (§3) and stored in `BuildSnapshot` as **context only**. Auto-detected from health integrations; the user never manually logs bodyweight. Muscle gain correctly *raises* a strength leaf (more force on the same frame) without bodyweight diluting it; fat loss does **not** fake a strength gain.

**Mechanics.** Recalibration recomputes `normalized`, `percentileRaw`, `cappedPercentile`, and `tier` for affected leaves under the current frame and `NormalizerSpec.version`, writing **new** timestamped `LeafScore` rows (we never mutate history in place). A recalibration event is itself logged AND exported (§2.9):

```ts
interface RecalibrationEvent {
  id: string;
  trigger: "age_band_change" | "height_correction" | "normalizer_version_bump" | "distribution_reseed";
  affectedLeafIds: LeafId[];
  buildSnapshotBefore: BuildSnapshot;
  buildSnapshotAfter: BuildSnapshot;
  at: string;                         // ISO 8601
}
```

> **AI-readiness flag — snapshot composition with every score, and export the events.** Capturing `bodyweightKg`, `bodyFatPct`, and `ffmi` *at compute time* (even though they're excluded from the normalizer) is what lets the AI later correlate composition change with performance change ("you added 3 kg lean mass and your `strength.quads` rose two tiers"). Omitting these from the snapshot would permanently destroy that correlation signal — it is not recoverable retroactively. Separately, `RecalibrationEvent`s are **included in the AI context** (§2.9, §6.9) so the AI can distinguish a real user change from a recalibration artifact (an age-band crossing or distribution reseed) when reading the trajectory it is told to analyze for plateau/trend. (The same snapshot, captured on every session, is §6.7's `BuildSnapshot`/`CompositionSnapshot`.)

### 2.9 Serialization for the AI layer

The capability tree and its score records serialize to a **compact, self-describing, unit-tagged JSON context document** — the exact artifact a future LLM prompt or feature vector consumes (produced by `exportContext()` in §6.9). It is local-first and exportable, carrying only capability data (no PII beyond the immutable covariates needed to interpret a percentile). Percentiles are `[0,1]` and explicitly scale-tagged; untested leaves carry `null` (never `0` or `0.0`).

```jsonc
{
  "schemaVersion": "capability/1",
  "generatedAt": "2026-06-15T17:00:00Z",
  "scales": { "percentile": "fraction01", "confidence": "fraction01", "coverage": "fraction01" },
  "weightsModel": "weights/1", "correlationModel": "xdim/1", "projectionModel": "proj/1",
  "build": { "sex": "male", "heightCm": 178, "birthDate": "1996-04-02", "ageYears": 30 },
  "headline": { "peakScore": 0.71, "coverage": 0.62, "peakBadges": 2,
                "rendered": true, "minHeadlineLeavesMet": true },
  "consistency": { "momentum": 0.62, "currentStreakDays": 11, "activeDaysTrailing28": 16,
                   "adherenceTrailing28": 0.8, "momentumModel": "momentum/1" },
  "leaves": [
    { "id": "strength.chest", "state": "inferred",
      "raw": { "value": 102, "unit": "kg" }, "normalized": 0.74,
      "normalizer": "height_conditioned_strength@1",
      "percentileRaw": 0.88, "cappedPercentile": 0.88, "tier": "advanced",
      "confidence": 0.61, "distributionSource": "blended", "distributionId": "strength.chest|m_178_30|3",
      "computedAt": "2026-06-15T16:55:00Z",
      "muscleGroups": ["chest","front_delt","triceps"],
      "contributingSetIds": ["evt_8a1","evt_8a2"] },
    { "id": "aerobic.5k", "state": "untested",
      "percentileRaw": null, "cappedPercentile": null, "tier": null, "confidence": null }
  ],
  "attributions": [ /* Attribution[] (§2.6) — structured weekly movement, not prose */ ],
  "recalibrations": [ /* RecalibrationEvent[] (§2.8) — so discontinuities are interpretable */ ],
  "methodologyNotes": [ /* MethodologyNote[] (§5.6) — why a cohort/distribution is what it is */ ]
}
```

This is the contract that lets the deferred AI layer do gap analysis, plateau detection, and program generation **without re-engineering the data model** — every requirement (raw+derived, timestamps, enum taxonomy, provenance+confidence, explicit nulls, contextual snapshots, relational links, units, intent capture via the logging layer's target-hit flags, exportability) is satisfied at the point of capture, not retrofitted. Critically, the export now includes **consistency, recalibration events, methodology notes, and structured attribution** so the AI can interpret trajectory discontinuities and coach on habit — items the previous version omitted. The ten requirements are enumerated and mapped to schema in §6.1.

---

## 3. Build Normalization & Body Composition

This section defines the **immutable-build principle** — the foundational rule that governs what may and may not enter Peak's normalizer — and the body-composition dimension that exists *because* of that rule. It is the formal statement of the product's moat: capability is measured against a reference frame the user cannot game.

### 3.1 The Immutable-Build Principle

**Rule:** the normalizer (the reference frame against which raw performance is converted to a build-conditioned percentile, see §2.2) may contain **only attributes the user cannot or should not change.** Anything mutable or coachable is measured *as a dimension* or consumed *as an input* — it is never baked into the normalizer.

Normalizing against a changeable attribute conflates **condition** (where you are today) with **capability** (what your frame can express). That distinction is the whole product.

| Attribute | Mutable? | Role in Peak | Where it lives |
|-----------|----------|--------------|----------------|
| `sex` | No | Build covariate (normalizer) | `BuildProfile` (§3.7, §6.7) |
| `height_cm` | No | Build covariate (normalizer) | `BuildProfile` |
| `age` (from `birth_date`) | No (monotonic) | Build covariate (normalizer) | `BuildProfile` |
| frame size / limb proportions | No | Build covariate (normalizer) — **v2**, estimated empirically | `BuildProfile` (deferred; §7.5 OQ-11) |
| `bodyweight_kg` | Yes | **Input only** — load math, composition derivation, snapshots | `BodyComposition`, session snapshot |
| body-fat % / lean mass | Yes | **Measured dimension** (this section) | `BodyComposition` |

The v1 build covariates are exactly **sex + height + age**. Frame/limb proportions are deferred to v2 and will be *estimated empirically from first-party data, not guessed* (see §5.2 and §7.5, OQ-11).

### 3.2 Why Bodyweight Is Excluded From Normalization

This is the single most consequential normalization decision in Peak, so it is stated explicitly here (and referenced as an invariant throughout: §1.5, §2.2, §5.3, §7.4 Decision #4).

Bodyweight mixes **frame** (fixed) with **current condition** (changeable). If strength were normalized by bodyweight (the off-the-shelf Wilks / DOTS / Symmetric Strength approach), two perverse signals follow:

1. **Fat loss would fake a strength gain.** A user who drops 5 kg of fat while their bench stays flat would see their "strength-per-kg" ratio rise — the score would reward *getting lighter*, not getting *stronger*. That is condition masquerading as capability.
2. **Muscle gain could lower the score.** A user who adds 4 kg of muscle and 10 kg to their bench could see their bodyweight-ratio *fall* if the denominator grew faster than the numerator — punishing the exact behavior the product wants to celebrate.

**Peak's resolution:** strength is conditioned on **frame** (height + sex + age), so muscle gain correctly *raises* the percentile and fat changes are *neutral* to it.

- **Lean-mass normalization is also rejected** for strength. Dividing strength by lean mass would hide real, muscle-driven gains (the user got stronger *by* adding the lean mass — normalizing it out erases the win). We condition strength on the immutable frame, not on any mass term.
- **Bodyweight-movement and running tests** (pull-ups, push-ups, the mile) already reward leanness *at face value* through raw performance — a lighter athlete does more pull-ups. We let that happen naturally and do **not** double-count it by also normalizing the load surface by bodyweight. (The healthy-floor guard that keeps this from rewarding *dangerous* leanness is §3.6.1.)
- **Bodyweight remains a first-class input** for load suggestions, calorie/recovery guidance, the body-composition dimension below, and per-session contextual snapshots (§3.7).

**The bodyweight↔FFMI boundary, reconciled (resolves the "bodyweight re-enters as a scored primitive" tension).** FFMI = lean_mass / height², and lean_mass is derived from `bodyweight × (1 − bodyFatPct)`. So bodyweight *is* an input to *deriving* the value that the `body_composition.ffmi` leaf scores. This does **not** violate the invariant, and the invariant is stated precisely to make that clear: **bodyweight is never a normalizer covariate and never a percentile input for the strength dimension.** It is, legitimately, an input to the *composition* dimension's metric — that is exactly the dimension whose job is to score body state. The FFMI leaf is percentiled on FFMI (a composition quantity), conditioned on sex+age (not on bodyweight or height-again; see §3.3); bodyweight only flows in one step earlier, to compute lean mass. The elevated `body_composition` weight (§2.6, dimWeight 1.3) up-weights *composition* in the headline, not bodyweight-in-strength — the two are kept structurally separate, and any code path that joins bodyweight into a *strength* percentile is rejected in review (§3.7).

> **Consequence for strength data sourcing (cross-ref §5.3):** because validated standards are bodyweight-based and do not condition on height, they are **unusable off-the-shelf** as Peak's strength normalizer (cross-check display only, Decision #5). Peak must build height-conditioned strength distributions from anthropometric datasets plus first-party data; early height-conditioned strength leaves launch lower-confidence, absorbed by the per-leaf confidence system (§2.4, §4.4).

### 3.3 The Body-Composition Dimension — Two Primitives, Not BMI

**BMI is rejected as a scoring metric.** BMI knows only total mass and height, so it cannot separate fat from muscle and would label Peak's most engaged users — muscle-builders — "overweight" or "obese." Using it would torch credibility with the core audience.

Body composition is scored from **two primitives**, both conditioned **only on the immutable covariates sex + age** per §3.1. (Height is **not** a conditioning covariate for FFMI: FFMI already divides lean mass by height², so conditioning the FFMI percentile on height again would double-count height. This is the canonical covariate set; §2.2's normalizer table conforms.)

| Primitive | Definition | Conditioned on | Healthy reference | Seed source |
|-----------|------------|----------------|-------------------|-------------|
| **FFMI** (Fat-Free Mass Index) | `lean_mass_kg / (height_m)^2` — "BMI for muscle" | sex, age | natural ceiling ~25 (drug-free) | Symmetric Strength / ExRx, NHANES anthropometrics |
| **Body-fat % band** | measured BF%, scored against a *target band with a healthy floor* (§3.6) | sex, age | ACE / ACSM norm tables | NHANES DEXA body-comp data (vintage caveat, §5.4) |

FFMI captures the muscularity BMI is blind to; the BF% band captures leanness. The composition leaf percentiles roll up into the **`body_composition`** dimension of the score tree (§2.1, §2.6).

### 3.4 Derived Ideal Weight — Rises With Muscle

Peak surfaces an **ideal-weight target** that *inverts* BMI's flaw:

```
ideal_weight = target_lean_mass / (1 - target_bf_fraction)
```

Worked example: 160 lb lean mass at a 12% BF target → ~182 lb ideal weight. As the user adds muscle, `target_lean_mass` rises, so **ideal weight rises with it.** This is shown as a muscle-aware **range/target framed as a goal, never a judgment** — the opposite of "BMI says you're overweight."

The target BF% used here is the *center* of the healthy/athletic band from §3.6, never the essential-fat floor.

### 3.5 The Peak-Unique Move — Infer Muscularity From Logged Strength

When scale or body-comp data is **absent or thin**, no generic calculator can do better than fall back to BMI. Peak can, because it has the user's training data.

**The move:** infer a **muscularity prior** from logged strength and adjust composition expectations *upward* rather than defaulting to a fat-blind BMI read. Example: a user benching 1.4× bodyweight is *demonstrably* muscular; their lean-mass estimate is revised up and their composition is scored against a higher-muscularity expectation.

This inference is **a prior, never a measurement** — it is always overridden the moment real measured data arrives, and it carries explicit provenance and a lower confidence weight (§3.7).

**Measurement ladder** (confidence scales down the ladder):

| Rank | Method | `source` enum | Typical confidence | Notes |
|------|--------|---------------|--------------------|-------|
| 1 | DEXA scan | `measured_dexa` | highest | gold standard |
| 2 | BIA smart scale / Apple Watch | `measured_bia` | high (±3–5%) | passive HealthKit/Google Fit ingest |
| 3 | Tape / Navy method | `measured_tape` | medium | neck+waist (+hip for women) |
| 4 | Inferred from logged strength | `inferred_from_strength` | low | the Peak-unique prior |
| 5 | None | `unknown` | null | stored as **unknown (null), never zero** (§3.7) |

### 3.6 Responsibility Constraint — Target Band With a Healthy Floor

Composition scoring is a **target band with a healthy floor**, explicitly **not** "leaner is always better."

- The score rewards movement from unhealthy → healthy → athletic-optimal.
- At the **essential-fat line**, the reward curve **flattens and then reverses** — going below the healthy floor *reduces* the composition score, it does not maximize it.
- Peak **never coaches toward dangerously low body fat.** The derived ideal weight (§3.4) and any AI guidance (deferred, §7.3 Phase P4) are clamped to the healthy band.

Reference floors are stored as machine-readable numbers, not prose: `essential_floor_bf` per sex (~0.05 men / ~0.12 women, sourced from ACSM), plus the full **numeric band definition** (edges + center) so an AI can reason about *where in the band* a user sits without external tables (§3.7 stores these on the record).

#### 3.6.1 The healthy-floor guard on mass-relative leaves (resolves the leaner-is-better vs floor tension)

VO2 (ml/kg/min), bodyweight-movement tests (pull-ups, push-ups, the mile, plank), sprint times, and **jump height/broad-jump distance** (which are bodyweight-relative) all rise monotonically as a user sheds mass — including mass below the essential-fat floor. Left unguarded, a user could maximize these leaves by getting dangerously lean, and the score would reward it — directly contradicting §3.6's responsibility constraint. **This is resolved, not left as a tension:**

- **Healthy-floor performance guard.** For any mass-relative leaf — now spanning `aerobic` (`vo2_relative` and running), `anaerobic` (sprint times), `muscular_endurance` (bodyweight-movement reps/holds), **and `power`** (jump height and broad-jump distance are bodyweight-relative) — once the user's measured BF% is **below the essential-fat floor**, the leaf's *normalized* value is computed against the user's performance **as if their BF% were at the essential floor** (i.e. the mass advantage from being below-floor is removed before percentiling). Performance gains from training still raise the leaf; performance gains that come *only* from dropping below the floor do not. The raw measurement is preserved unchanged (req. 1); only the normalized/percentile derivation applies the guard, and the guard's application is recorded in the leaf's provenance (`method: "...+floor_guard"`).
- **No coaching toward sub-floor leanness.** Projections (§2.6.1) and any AI guidance never recommend dropping below the floor to raise a leaf; the guard makes that strategy yield zero additional score, removing the incentive.
- **Consistency with face-value leanness reward.** *Within* the healthy band, leanness is still rewarded at face value through raw performance (§3.2) — a lean (but healthy) athlete legitimately does more pull-ups. The guard activates *only below the essential floor*, so the product rewards healthy leanness and refuses to reward dangerous leanness. This makes the §1.5/§3.6 claim that "Peak never coaches toward dangerously low body fat" true across *all* dimensions, not just composition.

### 3.7 Data Model — AI-Readiness Implications

This section touches two entities. Both are designed to satisfy the AI-readiness mandate now, even though the AI layer is deferred. **This is a net-new entity: the current `AppData` (`src/model.ts`) has no biometric/build profile at all — a flagged gap this section closes** (and which §6.7 persists in the full schema). Per the canonical conventions, every numeric is a `Quantity { value, unit }` (or a documented `[0,1]` fraction) — units are **not** carried solely in field names. (This intentionally supersedes the older `*_kg` bare-number style; §6.7 is the single canonical schema and this section conforms to it.)

#### `BuildProfile` — immutable covariates (the normalizer's inputs)

```jsonc
{
  "schema": "peak.build_profile.v1",
  "sex": "male",                              // enum: male | female | unspecified (cohort path §5.2)
  "height": { "value": 178, "unit": "cm" },   // Quantity, not a unit-in-name bare number
  "birth_date": "1996-04-02",                 // ISO-8601; SOURCE OF TRUTH for age — age derived, never frozen as int
  "frame": null,                              // v2 — null = unknown, NEVER a default value
  "updated_at": "2026-06-15T14:32:00Z"
}
```

- These are the **only** values permitted into the normalizer (§3.1). Height/sex/age never change the score *for getting fitter* — exactly the point.

#### `BodyComposition` — the measured dimension (time-series, never overwritten)

Composition is stored as an **append-only series of measurements**, each carrying raw + derived + provenance + confidence, with all numerics as `Quantity`:

```jsonc
{
  "schema": "peak.body_composition.v1",
  "measured_at": "2026-06-15T07:01:00Z",      // req. 2: timestamp + sequence everything
  "raw": {                                     // req. 1: preserve RAW
    "bodyweight": { "value": 82.1, "unit": "kg" },
    "body_fat_pct": { "value": 14.8, "unit": "percent" },   // null if not measured -> see source/unknown
    "neck": null, "waist": null
  },
  "derived": {                                 // req. 1: store DERIVED alongside
    "lean_mass": { "value": 69.9, "unit": "kg" },
    "ffmi": { "value": 22.1, "unit": "kg/m2" },
    "ffmi_percentile": 0.71,                   // [0,1] fraction; build-conditioned (sex+age, §3.3)
    "bf_band": "athletic",                     // enum: essential|athletic|fitness|average|high
    "ideal_weight": { "low": { "value": 80.0, "unit": "kg" }, "high": { "value": 84.5, "unit": "kg" } }
  },
  "band_definition": {                         // req: numeric band readable from the record (resolves the enum-only-label lapse)
    "sex": "male", "source": "ACSM",
    "essential_floor_bf": 0.05,
    "edges": { "essential": [0.02, 0.06], "athletic": [0.06, 0.13],
               "fitness": [0.13, 0.18], "average": [0.18, 0.25], "high": [0.25, 1.0] },
    "target_center_bf": 0.12                   // the §3.4 ideal-weight center
  },
  "source": "measured_bia",                    // req. 4: provenance enum (the ladder, §3.5)
  "confidence": 0.85                            // req. 4: confidence weight [0,1]; null if source=unknown
}
```

The `band_definition` block makes the composition record **self-contained**: an AI can compute "how far into/below the healthy band" a user sits — and whether they are below the essential floor (triggering the §3.6.1 guard) — from the stored record alone, without an external ACE/ACSM table. The band definition is denormalized from versioned reference data at write time so historical records remain interpretable even if the reference tables are later updated.

**How each AI-readiness requirement is honored in this section** (the canonical numbered list is §6.1):

| # | Requirement | How this section satisfies it |
|---|-------------|-------------------------------|
| 1 | Raw + derived | `raw.bodyweight` / `raw.body_fat_pct` kept verbatim as `Quantity`; `derived.{lean_mass, ffmi, ffmi_percentile, ideal_weight}` stored beside them — the AI can re-derive and audit. |
| 2 | Timestamp + sequence | `BodyComposition` is append-only with `measured_at`; composition trajectory is directly computable. |
| 3 | Machine-readable taxonomy | `sex`, `source`, `bf_band` are stable enums, not free text (current `Muscle.ratio: "1.2× BW"` style strings are explicitly rejected here). |
| 4 | Provenance + confidence | every measurement carries `source` (the §3.5 ladder) + a `confidence` weight; `inferred_from_strength` is flagged distinctly from `measured_*`. |
| 5 | Explicit gaps | un-measured fields are `null` and `source: "unknown"` with `confidence: null` — **never 0%, never 0.0 confidence**. A missing BF% is *unknown*, which is what lets the AI know to prompt for a scale reading rather than reasoning off a phantom zero. |
| 6 | Contextual snapshots | every workout session (§4.5, §6.7) embeds a **copy of the active `BuildProfile` covariates + latest `BodyComposition` derived values + band_definition + that day's bodyweight** at session time, so the AI can correlate composition change against performance change without time-aligning two series after the fact. |
| 7 | Stable IDs + relational links | composition links into the score tree via the stable `body_composition` dimension id (leaf → dimension), consistent with §2.1 and §6.5. |
| 8 | Self-describing schema + units | `schema` version tag on each entity; every numeric is a `Quantity` with explicit `unit` (or a documented `[0,1]` fraction); serializes cleanly to JSON for an LLM prompt / feature vector. |
| 9 | Intent / targets | `derived.ideal_weight` band and `band_definition.target_center_bf` encode the *goal*, enabling adherence reasoning (actual vs target weight trajectory). |
| 10 | Local-first, serializable | both entities are plain JSON in the on-device `AppData` document and export into the compact context document the AI consumes (§6.9). |

**Flagged data risks (per the mandate):**

- **Bodyweight must never leak into the strength normalizer.** It is structurally separated: `bodyweight` lives only in `BodyComposition.raw` and session snapshots, never in `BuildProfile`, and feeds only the *composition* dimension (via lean mass) and load math — never a strength percentile. Any future code path that joins bodyweight into a *strength* percentile computation violates §3.2 and must be rejected in review.
- **The `inferred_from_strength` prior must stay distinguishable from measured data forever.** It is a separate `source` enum value with lower `confidence`; collapsing it into a generic "estimate" would destroy the AI's ability to weight it correctly and would let a guess masquerade as a measurement.
- **Current persisted shape is display-coupled and unfit for this** (e.g. `Muscle.ratio: "1.2× BW"`, hex `diffColor`). This section mandates **separating raw measurements from derived/display values**; composition data is stored as typed `Quantity`s + enums, with formatting applied only at render time (the same separation enforced in §6.1, §6.2).

---

## 4. Benchmarks, Onboarding & Confidence

Peak's assessment layer is built around three convictions carried over from §1 (Product Vision) and §2 (the Capability Score Model): capability is measured as a build-conditioned empirical percentile, coverage is first-class (never punitive), and every datum carries provenance and confidence. The benchmark is not a gate or a single timed session — it is a **modular library of category tests** that the user draws from over time, producing a *sparse, timestamped set of leaf percentiles*. Muscle-group strength is **inferred from logged sets** (calibrated, not carried, by benchmarks) so the profile sharpens passively as the user trains. This section defines the benchmark library, the onboarding baseline, and the per-leaf confidence/coverage model that ties them together.

> **One join key for provenance (resolves the dangling-`Measurement` lapse).** Every raw event that can back a derived value — a `SetRecord`, a `CardioSetRecord`, a `BenchmarkResult`, or a passive health reading — carries a stable `MeasurementId` (defined in §6.2). `Measurement` is **not** a separate entity; it is the common interface (`{ id: MeasurementId, kind, performedAt, raw, … }`) that all of those records satisfy. Every `contributingSetIds`, `sourceMeasurementId`, and `triggeringMeasurementIds` link points at a `MeasurementId`, so the provenance graph is unbroken across §4/§5/§6 — there is no type that one section references and another fails to define.

### 4.1 The benchmark as a modular library

A benchmark is **not** a workout session and is stored separately from the session/feed activity log (see §6.4). A benchmark is a deliberate, representativeness-optimized measurement of one leaf capability in the capability tree (§2.1). The library is a versioned catalog of `BenchmarkProtocol` records — **reference data, not user data** — analogous to how the model catalog is "data, not code."

Core rules (decided):

- **Modular / by-category.** The user picks categories; nobody is required to do every test. A profile is the union of whatever leaves have been benchmarked.
- **Partial completion is the normal case.** Coverage raises confidence and completeness; it **never gates or unlocks** the score (§2.6 coverage-aware aggregate). Score from whatever exists.
- **No time constraint.** Each protocol optimizes for a *representative, insightful* read (e.g. a true 3–5 rep max with adequate rest), not for speed. Tests may span separate sessions and days.
- **Results go stale.** Every benchmark result is timestamped; staleness drives re-test prompts (§4.4) after the leaf's `staleAfterDays` horizon (§2.1). A leaf's confidence decays per the §2.4 recency curve.

#### `BenchmarkProtocol` (catalog record — versioned reference data)

| Field | Type | Notes |
|---|---|---|
| `protocolId` | `string` (stable ID) | e.g. `bench.1rm.v1`. Immutable; versioned via suffix. |
| `protocolVersion` | `int` | Bumped when the test or its normalization changes. |
| `leafId` | `LeafId` (enum) | Capability-tree leaf this test measures (§2.1). Stable FK. |
| `dimension` | `DimensionId` (enum) | One of the **performed** dimensions: `strength \| power \| muscular_endurance \| aerobic \| anaerobic \| mobility \| balance \| agility \| body_composition` (never `consistency`). Canonical snake_case (§canonical conventions). |
| `movementPattern` | `MovementPattern` (enum) | From the §6.3 shared enum, e.g. `horizontal_push \| vertical_pull \| squat \| hinge \| carry \| run \| row_erg \| …`. Spelled identically to the logging layer. |
| `primaryMuscles` | `MuscleGroup[]` (enum) | Drives strength inference attribution (§4.3). |
| `equipment` | `Equipment` (enum) | From the §6.3 shared enum, e.g. `barbell \| dumbbell \| bodyweight \| treadmill \| track \| erg \| …`. Spelled identically to the logging layer. |
| `measure` | `MeasureKind` (enum) | `max_load \| rep_max \| time_for_distance \| distance_in_time \| vo2_proxy \| hold_duration \| rom \| composition \| jump_height \| throw_distance \| sprint_time \| balance_hold \| reach_distance \| agility_time` (the latter six added for the `power`/`anaerobic`/`balance`/`agility` dimensions, Decision #20). |
| `units` | `Unit` (enum) | Explicit SI-first units from §6.3 (`kg`, `m`, `sec`, `ml/kg/min`, `degree`, `percent`). Never implicit. |
| `normalizationMethod` | `NormalizerMethod` (enum) | The §2.2 step-1 normalizer chosen **before shipping** the test (e.g. `height_conditioned_strength`, `power_norm`, `musc_endurance_norm`, `wma_age_grade`, `vo2_relative`, `anaerobic_norm`, `rom_norm`, `balance_norm`, `agility_norm`). |
| `rawCaptureSchema` | `FieldSpec[]` | Self-describing list of the raw fields this test records (name, type, unit) — see §4.2. |
| `restGuidance` | `Quantity` (sec) | Recommended rest to make the read representative. |
| `instructions` | `string` | Human-facing protocol copy. |
| `confidenceCeiling` | `number` [0,1] | Max confidence a single clean execution can confer (encodes data-depth limits, e.g. height-conditioned strength launches lower — see §4.4, §5.3). Folds into `measurementQuality` (§2.4). |

**AI-readiness:** the protocol record is itself self-describing (req. 8) and supplies the stable enum taxonomy (req. 3) and explicit units (req. 8) for every result it produces, using the **same** movement-pattern/equipment/unit enums as the logging layer (§6.3) — no per-section re-spelling. Choosing `normalizationMethod` per category up front (§2.2) means a derived normalized value can always be recomputed from raw, satisfying preserve-raw-+-derived (req. 1). The exact per-category protocols are an open question (§7.5, OQ-3).

### 4.2 What a benchmark result captures (RAW + DERIVED)

Each completed test writes one immutable `BenchmarkResult`. Raw is captured at full fidelity and **never discarded**; derived values are stored alongside and are always recomputable from raw + the cited protocol/curve version. A `BenchmarkResult` carries a `MeasurementId` and satisfies the common `Measurement` interface (§6.2), so any `RankResult.sourceMeasurementId` can point at it.

#### `BenchmarkResult`

| Field | Type | Provenance / notes |
|---|---|---|
| `id` | `MeasurementId` (stable) | The join target for `sourceMeasurementId` / `contributingSetIds` (§6.2). |
| `protocolId` / `protocolVersion` | `string` / `int` | FK to the catalog record actually used. |
| `leafId` | `LeafId` (enum) | Relational link leaf ↔ result (req. 7). |
| `performedAt` | ISO-8601 timestamp | Sequence/trend key (req. 2). |
| `raw` | `RawMeasurement` | The literal performance — see below. **Source = `measured`.** |
| `sets` | `SetRecord[]` | Per-set detail when the test is rep/load-based — **the same `SetRecord` shape as the per-set log in §6.4** (each with its own `MeasurementId`) so a benchmark and a hard training set are structurally identical and comparable. |
| `normalizedValue` | `number` | DERIVED: raw after §2.2 step-1 normalization (build effect stripped), dimensionless. |
| `percentileRaw` | `number` [0,1] | DERIVED: §2.2 step-2 empirical percentile (uncapped, canonical), **conditioned on the build snapshot below**. |
| `cappedPercentile` | `number` [0,1] | DERIVED: `min(percentileRaw, 0.95)` (§2.3). |
| `tier` | `TierId` (enum) | DERIVED: band of `percentileRaw` (§2.3; exact naming open, §7.5 OQ-5). |
| `curveSource` | `CurveProvenance` | Which distribution backed the percentile: `seed_population` (+`datasetId`, e.g. `nhanes_dexa`, `symmetric_strength`, `military_apft`) or `first_party` or `blended` (+ blend weight). **Always labeled** (§5.6 transparency). |
| `distributionId` | `DistributionId` | exact versioned distribution used (§5.4) — comparability across results. |
| `confidence` | `number` [0,1] | This result's confidence (the §2.4 product of its factors). |
| `buildSnapshot` | `BuildSnapshot` | Contextual snapshot at performance time (req. 6) — see §4.5. |
| `source` | `ProvenanceSource` (enum) | `measured` for benchmarks (§6.2). |

`RawMeasurement` is a typed union keyed by `measure`, each value a `Quantity`: `{ kind: "max_load", load: Quantity, reps }`, `{ kind: "time_for_distance", distance: Quantity, duration: Quantity }`, `{ kind: "vo2_proxy", vo2: Quantity }`, `{ kind: "rom", angle: Quantity }`, `{ kind: "composition", bodyFatPct: Quantity, ffmi: Quantity, method }`, `{ kind: "jump_height", height: Quantity }` / `{ kind: "throw_distance", distance: Quantity }` (power), `{ kind: "sprint_time", distance: Quantity, duration: Quantity }` (anaerobic), `{ kind: "balance_hold", duration: Quantity }` / `{ kind: "reach_distance", distance: Quantity }` (balance), `{ kind: "agility_time", duration: Quantity }` (agility), etc.

**AI-readiness:** this record satisfies preserve-raw-+-derived (1), timestamp+sequence (2), enum taxonomy (3), provenance+confidence on every datum (4, via `source` + `curveSource` + `confidence`), contextual snapshot (6), stable relational links via `MeasurementId` (7), self-describing + units (8), and intent capture (9, via per-set `targetHit`). **FLAG:** the current code stores display strings (`best: "95 kg"`, `pct: "81st"`, `ratio: "1.2× BW"`) intermixed with data in `Muscle` (`src/model.ts`); this is *not* AI-ready and cannot be re-derived. The `BenchmarkResult`/`SetRecord` model replaces those free-text fields — display strings become a pure *view* over typed raw+derived values (the persisted set shape is §6.4).

### 4.3 Inferred muscle-group strength (passive, benchmark-calibrated)

Per-muscle-group strength is **inferred, never max-tested in isolation** (decided; §7.4 Decision #12). The system reads the compound and isolation sets the user already logs (§6.4 per-set logging) and attributes them to muscle groups via each exercise's `muscleWeights` enum mapping (§6.5 `ExerciseDef`), producing a passively-updating `MuscleGroupEstimate` per group. Formal benchmarks **calibrate** this inference — they anchor the estimate to a known-good measured point — but the estimate continues to move between benchmarks as the user trains.

#### The inference engine (specified — no longer hand-waved)

This is moat property #2, so the attribution math is stated concretely as versioned reference data (`infer/1`):

1. **Per-set est-1RM.** Each logged `SetRecord` produces an estimated 1RM via the **Epley** formula by default: `est1RM = weight × (1 + reps/30)`. The method is recorded in the set's `derived.provenance.method` (e.g. `"epley"`); the formula is part of `infer/1` and can be versioned. The raw set is never altered; the est-1RM is a sibling derived value (§6.4).
2. **Attribution to muscle groups.** Each exercise carries `muscleWeights: Record<MuscleGroup, number>` (§6.5) — fixed, enum-keyed attribution coefficients in `[0,1]` summing to ~1 across the muscles it trains. Primary movers get the largest weights (e.g. barbell bench: chest 0.5, front_delt 0.25, triceps 0.25); secondary muscles get small fixed weights. A set's est-1RM contributes `est1RM × muscleWeights[g]` toward group `g`. These coefficients ship with each `ExerciseDef` and are **included in the AI export** (§6.9) so the AI can re-derive an inferred score, not merely see its inputs.
3. **Quality weighting.** Each set's contribution is scaled by an execution-quality factor in `[0,1]` derived from RPE plausibility and `targetHit`: `quality = clamp(0.5 + 0.05 × (RPE − 5), 0.5, 1.0)` when RPE is present (higher-effort sets are more informative of true capability), `0.7` when RPE is absent. Part of `infer/1`.
4. **Recency weighting.** Contributions are recency-decayed with the same half-life shape as confidence (§2.4): a set's weight is multiplied by `0.5 ^ (daysAgo / RECENCY_HALFLIFE_DAYS)`, `RECENCY_HALFLIFE_DAYS = 28` in `infer/1` for strength.
5. **Combine.** `estStrength[g]` is the recency-and-quality-weighted **maximum-biased mean** of attributed est-1RMs: specifically the weighted mean of the top-K (`K=5`, `infer/1`) attributed contributions for group `g` within the trailing window, so a single fluke set cannot dominate and incidental light volume cannot drag a strong group down. The result is one `estStrength` per group, fed into the §2.2 height-conditioned-strength normalizer like any raw value.
6. **Benchmark anchoring.** A `measured` benchmark for a leaf in that group resets the anchor (its est-1RM is treated as a high-quality, high-recency point) and raises `confidence`.

#### `MuscleGroupEstimate` (derived, recomputed; one per `MuscleGroup`)

| Field | Type | Notes |
|---|---|---|
| `muscleGroup` | `MuscleGroup` (enum) | Stable ID; replaces the 17 free-text muscle ids' authored `score`. |
| `estStrength` | `Quantity` | DERIVED rolling estimate (step 5 above) in `kg`. |
| `normalizedValue` / `percentileRaw` / `cappedPercentile` / `tier` | as in §4.2 | Same build-conditioned pipeline. |
| `inferenceModel` | `"infer/1"` | versioned attribution model used (auditable). |
| `source` | `ProvenanceSource` (enum) | `inferred-strength` (passive) vs `measured` (benchmark-anchored). Both can contribute. |
| `confidence` | `number` [0,1] | §2.4 composite; high when a recent direct benchmark anchors the group, lower when purely inferred. Decays with staleness. |
| `lastCalibratedAt` / `lastUpdatedAt` | ISO-8601 | Calibration time vs last passive update (req. 2). |
| `contributingSetIds` | `MeasurementId[]` | Relational link estimate ↔ the raw sets behind it (req. 7) — the AI can audit *why* a group scored as it did, and (with `muscleWeights` + `infer/1` in the export) **recompute** it. |

**AI-readiness:** keeping `contributingSetIds`, the raw est-1RM per set, the `muscleWeights` (shipped in the export), and the `inferenceModel` version means the AI can re-derive, explain ("calves are dragging legs — last direct calf work was 4 weeks ago, confidence 0.4"), and detect plateaus from the same store. **FLAG:** the current `store.bumpMuscle` (±1 nudge on a hand-authored 0–100 `Muscle.score`) and `peakScore()` (flat mean of those scores) must be retired — they are neither inferred nor build-conditioned and break provenance.

### 4.4 Per-leaf coverage & confidence

Coverage and confidence are **per-leaf**, not global (decided) — data depth is genuinely uneven (solid for major barbell lifts and running; thin for height-conditioned strength and per-muscle endurance). Every leaf therefore carries its own confidence band, and the profile always surfaces *what it doesn't know*. This is the benchmark-side, persisted view of the **same** model and **same** product-rule defined in §2.4 — there is one composite and one combination rule (the §2.4 product of four factors); the names below map onto those four factors (the mapping is given in §2.4 and restated here).

#### `LeafCoverage` (one per `LeafId` in the capability tree)

| Field | Type | Notes |
|---|---|---|
| `leafId` | `LeafId` (enum) | |
| `state` | `LeafState` (enum) | **`untested` \| `inferred` \| `measured` \| `stale`** (the §2.5 `LeafState` — one enum, no separate `CoverageState`). `untested` ⇒ all derived values **`null`, never `0`**, and confidence **`null`, never `0.0`** (req. 5). |
| `confidence` | `number \| null` [0,1] | The §2.4 composite (product of distributionDepth × measurementQuality × recency × inferenceChainLength); `null` when `untested`. |
| `lastMeasuredAt` | ISO-8601 \| null | Drives staleness → `stale` after the leaf's `staleAfterDays` horizon (§2.1) → re-test prompt. |
| `curveProvenance` | `CurveProvenance` | Surfaced to the user as a methodology label (§5.6 transparency). |
| `eligible` | `bool` | Build/equipment/capability eligibility (§2.6). Ineligible leaves are excluded from the coverage denominator. |
| `contributesToScore` | `bool` | `untested`/ineligible leaves are simply absent from the §2.6 aggregate (a confidence band, not a zero). |

**Confidence factor mapping (to §2.4's four canonical factors):**
- `measurementQuality` (§2.4) = protocol `confidenceCeiling` × execution quality (rest hit, RPE plausibility, `targetHit`).
- `distributionDepth` (§2.4) = covariate-match (how well a `seed_population` curve matches the user's `BuildSnapshot`) × curve-provenance weight (`first_party` > `blended` > `seed_population` for cohort fit, but always labeled).
- `recency` (§2.4) = the §2.4 recency-decay curve keyed on the leaf's `staleAfterDays`.
- `inferenceChainLength` (§2.4) = 1.0 for direct/benchmarked leaves, lower for longer compound→muscle inference chains.
These multiply (§2.4) into the single `confidence`. Height-conditioned strength leaves launch capped lower via `confidenceCeiling` per §5.3.

**Explicit-gaps rule (hard requirement):** missing/untested capabilities are represented as `null` (and `confidence: null`) with `state: untested`, **never** scored as `0` and **never** silently averaged in. This is both the product promise (specialists/partial/injured profiles never penalized — §1.3, §2.6) and AI-readiness req. 5 — the model must distinguish "no posterior-chain work in 3 weeks" (a known gap to act on) from "posterior chain is weak."

**AI-readiness:** the `LeafState` enum is the canonical machine-readable "what we don't know," and `confidence` + `curveProvenance` + `eligible` on every leaf give the eventual AI the trust-weighting and scope it needs to avoid over-confident suggestions on thin data.

### 4.5 Onboarding — the two-part baseline, the missing-data path & first significant score

Onboarding establishes a baseline from two sources and ends on a **first score that feels significant** (§1.3). It never blocks on completeness, and it has a **defined behavior when its mandatory normalizer inputs are unavailable** (the missing-data path below).

#### (a) Passive biometrics — and the denial/missing-data path

On first launch the user authorizes **Apple HealthKit / Google Fit**. From it Peak ingests, automatically and on an ongoing basis: height, bodyweight, body-composition (if a smart scale/watch feeds it), resting HR, and sleep (if tracked). **The user never manually logs bodyweight.** This populates the immutable build covariates (sex, height, age — §2.8, §3.1) plus the mutable inputs (bodyweight, composition) used as *dimension inputs only*, never as normalizers. Auto-ingestion is what lets the score **recalibrate** as build changes (§2.8).

**Mandatory-covariate fallback (resolves the missing-height/age/denial gap).** Height and age are **required** for every normalizer (§2.2) and cohort assignment (§5.2). The source of truth is unified: **`birth_date` and `height` live in `BuildProfile` (§3.7)**; HealthKit/Google Fit are *preferred ingestion sources* that populate those fields, not a competing source of truth. The engine's behavior when passive data is unavailable is explicit:

1. **Permission denied, or platform returns no height/DOB:** Peak falls back to a **one-time manual entry** of height and birth date during onboarding (sex is always asked). These are stored in `BuildProfile` with `provenance.source = "user-stated"`. The user can later connect HealthKit to upgrade provenance; the value is not re-sourced per session.
2. **User declines manual entry too (height and/or age still missing):** the build-relative engine **cannot produce a percentile** (it has no cohort). Rather than fabricate, Peak enters **"unconditioned preview" mode**: it shows raw performance and per-leaf *trend* (you-vs-your-past-self) with **no tier/percentile**, every leaf marked `state` appropriate but with `percentileRaw: null` and a clear "connect a height & age to unlock your build-relative score" prompt. No percentile is ever invented from a missing covariate — `null` is honored end-to-end.
3. **No smart scale / no composition:** composition uses the measurement ladder's lower rungs (Navy tape if entered, else `inferred_from_strength` prior, else `unknown` with `confidence: null`); the composition dimension is simply lower-coverage, never zero-filled.

This makes the scoring engine's behavior fully defined when its mandatory inputs are absent — it degrades to honest raw/trend display, never to a fabricated build-relative number.

#### `BuildSnapshot` (captured at every session/benchmark — the contextual snapshot, req. 6)

| Field | Type | Mutability / role |
|---|---|---|
| `capturedAt` | ISO-8601 | req. 2. |
| `sex` | `Gender` (enum) | **Immutable** → normalizer/covariate (§3.1). |
| `heightCm` | `Quantity` | **Immutable** → normalizer/covariate. |
| `birthDate` | ISO-8601 | **Immutable** → source of truth for age; `ageYears` derived (§2.8). |
| `bodyweightKg` | `Quantity \| null` | **Mutable input only** — load/recovery guidance + composition dimension; **excluded from strength normalization** (§3.2). |
| `bodyFatPct` | `Quantity \| null` | Mutable; composition dimension. `null` ⇒ inferred-muscularity prior from logged strength (§3.5). |
| `ffmi` | `Quantity \| null` | DERIVED from lean mass + height. |
| `compositionMethod` | `CompMethod` (enum) | `dexa \| bia \| tape_navy \| inferred_from_strength \| none` — the measurement ladder (§3.5); drives composition confidence. |
| `source` | `ProvenanceSource` (enum) | `healthkit \| googlefit \| manual \| inferred`. |

Snapshotting build **at session time** (not just "current") is what lets the future AI correlate composition change with performance change (req. 6) — e.g. "your squat percentile rose as FFMI climbed." (The persisted session-embedded form is §6.7.)

#### (b) Initial benchmark

The user completes **some** categories from the §4.1 library — not all — under **no time limit**, each optimized for an insightful read. Recommended-but-optional starter set spans dimensions for early breadth (e.g. one push, one pull/hinge, one aerobic run, plus passive composition from HealthKit), but the user may do fewer. Each completed test writes a `BenchmarkResult` (§4.2); untested categories stay `state: untested`.

#### First-score output (the hook) — and the minimum-coverage rule

The result screen renders from whatever exists and must feel **significant**, governed by the **MIN_HEADLINE_LEAVES rule (§2.6):**

- If **≥ 3 tested leaves spanning ≥ 2 dimensions** exist: render the headline **Peak Score** + coverage + Peak-badge count, plus per-leaf tiers.
- If **fewer**: do **not** render a single-leaf headline artifact. Instead lead with **per-leaf tier placement + curve position** for each benchmarked leaf (named tier + percentile, §2.3) — which is itself significant ("you're advanced at the bench press for your build") — and a prominent **coverage/next-step** prompt to reach the headline. This is the defined behavior at the most important UX moment, not undefined.
- **Top gaps** surfaced as opportunity, never deduction (§2.3 — celebrate asymmetry; raising the weakest tested leaf is the most efficient path up).
- A first-class **coverage indicator** — which *eligible* categories are still `untested`, framed as "unlock more of your picture," not as a penalty (ineligible leaves are not shown as gaps, §2.6).
- Graceful degradation: an injured user who can't run or squat is fully scoreable from whatever they *did* test (run/squat leaves marked ineligible, excluded from coverage); missing leaves are absent with a confidence band, never zero (§2.5, §4.4). If mandatory covariates are missing, the unconditioned-preview path (above) applies.

#### No prefabricated activity (carried from product principle)

Activity — `feed`, `streak`, `weeklyVolume` — starts **empty/zero** and is earned only by on-device logging; the v1→v2 migration (`src/store.tsx`) already strips fabricated demo activity while preserving real user data. The same honesty extends to assessment: the bell curve is **seeded from labeled real population data** and weighted toward first-party data over time (§5.4) — it is never invented, and the backing source is always labeled (`curveProvenance`, §5.6). The user's first benchmark is real measurement, not a pre-filled placeholder.

**Resolved (was OQ-10):** seeded Body-Assessment muscle scores and Goals **start empty, exactly like activity** — this is now a locked decision (§7.4 Decision #18), consistent with the "untested is null" invariant (§2.5) and the migration rule (§7.2). The prototype's seeded muscle scores are not carried in as scores; they are dropped (see §7.2 for exactly how legacy rows are handled). This closes the contradiction where the migration could not be written until the question was answered.

**AI-readiness (onboarding):** even a partial onboarding produces a clean, serializable slice of the AI context document (req. 10) — typed `BenchmarkResult`s, a `BuildSnapshot`, and a full `LeafCoverage` map where unknowns are explicit `null`s (and confidences `null`). The AI inherits, from day one of a profile, the provenance, confidence, units, and explicit gaps it needs to reason without fabricating.

---

## 5. Private Ranking & Data Strategy

This section defines how Peak turns a raw, normalized performance value (the output of the two-step method in §2.2 — normalize, then percentile) into the user-facing position on a distribution, and how that distribution is built, sourced, versioned, and trusted. Two things are non-negotiable here: the ranking is **private** (the user competes only with their past self), and the distribution is **real** (seeded from published population data, never fabricated). The hardest engineering problem in this section is the **strength cold-start**: every validated strength formula is bodyweight-based and Peak's normalizer is height-based (§3.2), so we cannot reuse them off-the-shelf and must construct height-conditioned distributions ourselves.

All percentiles in this section are `[0,1]` fractions (canonical convention #1); tier is derived from the uncapped `percentileRaw`; the cap is `min(percentileRaw, 0.95)`.

### 5.1 Private ranking model — tier + percentile, never rank

There are no public, global, or social leaderboards in Peak — not in v1, not ever. Ranking is expressed as a **private position on a build-conditioned distribution**, surfaced as a named tier plus a percentile, never as an ordinal rank against named people.

A leaf's ranking output is a `RankResult`:

| Field | Type | Meaning |
|---|---|---|
| `leafId` | `LeafId` (stable enum) | the capability being ranked (links to capability tree, §2.1) |
| `normalizedValue` | `number` | output of §2.2's normalization step (build effect stripped), dimensionless |
| `percentileRaw` | `number \| null` [0,1] | empirical percentile within cohort (uncapped, canonical); `null` = untested (never `0`) |
| `cappedPercentile` | `number \| null` [0,1] | `min(percentileRaw, 0.95)` — the top-5%-is-Peak cap (§2.3) |
| `tier` | `TierId \| null` | named band derived from **`percentileRaw`** (§2.3); `null` if untested |
| `cohortId` | `CohortId` | which build cohort this percentile was computed against |
| `distributionId` | `DistributionId` | the exact seeded/blended distribution + version used |
| `confidence` | `number \| null` [0,1] | per-leaf confidence (§2.4); drives the displayed band width; `null` if untested |
| `provenance` | `RankProvenanceEnum` | `seed-population \| blended \| first-party` — what backs this percentile |
| `computedAt` | ISO-8601 string | when this ranking was computed (sequenceable) |
| `sourceMeasurementId` | `MeasurementId \| null` | the raw measurement this ranking was derived from (§6.2; points at a `SetRecord`/`BenchmarkResult`/health reading — never a phantom type) |

`TierId` is a stable enum of percentile bands derived from the **uncapped** `percentileRaw` — bands are data, labels are cosmetic (final names are an open question; §7.5, OQ-5). The bands are **identical to §2.3** (this section does not introduce a second band scheme):

| Tier (`TierId`) | `percentileRaw` band ([lo, hi)) | Meaning |
|---|---|---|
| `foundation` | `[0.00, 0.25)` | building baseline |
| `developing` | `[0.25, 0.50)` | below the typical-build median |
| `proficient` | `[0.50, 0.75)` | above median for your build |
| `advanced` | `[0.75, 0.90)` | strong for your build |
| `elite` | `[0.90, 0.95)` | rare for your build |
| `peak` | `[0.95, 1.00]` | top-5% ceiling — "Peak" for your build |

> Tier is computed from `percentileRaw` (not from `cappedPercentile`) so `elite` and `peak` remain distinguishable; the cap is applied only to the headline *contribution* (§2.6), never to tiering. The previous draft's "bands on the capped distribution" wording is corrected here.

Because each leaf caps its contribution at 0.95, there is no headline reward for chasing 95→99, which (per §2.3) makes raising the weakest tested leaf the most efficient path up the headline — this section only needs to guarantee the **cap is applied before the headline aggregation** (§2.6), never to the stored `percentileRaw` or to `tier`.

**The user's only competition is their past self.** The longitudinal hook is built from the `computedAt`-sequenced history of `RankResult`s per leaf: "you moved from the 0.61 to the 0.68 percentile for your build over 6 weeks." This is the data substrate for §2.6's structured weekly-attributed movement and the §2.6.1 / §7.3 Phase P3 time-based ETAs. AI-readiness: because every `RankResult` is timestamped, carries its `sourceMeasurementId` (a real `MeasurementId`), and is never overwritten (new computations append), a future AI can reconstruct a clean per-leaf trajectory and attribute movement to specific logged sessions.

### 5.2 Build cohorts — the immutable reference frame

A `Cohort` is the set of "similar-build people" a user's normalized value is percentiled against. Per the immutable-build principle (§3.1), a cohort is defined **only** by immutable covariates:

| Covariate | Type | Binning |
|---|---|---|
| `sex` | `GenderEnum` | discrete (`male \| female \| unspecified` — see fallback below) |
| `heightCm` | `number` | banded (e.g. 5 cm bands), with kernel-smoothing across adjacent bands |
| `ageBand` | `AgeBandEnum` | e.g. `18-24, 25-34, 35-44, 45-54, 55-64, 65+` (derived from `birthDate`) |

Bodyweight, body composition, and training age are **excluded** from the cohort key — they are mutable/coachable and are measured as dimensions or used as inputs (§3.2, §3.3). Frame/limb proportions are deferred to v2 (estimated empirically once first-party data is large enough; §7.5 OQ-11). Race is **not** a cohort covariate in v1 (recommended against — poor physiological proxy, non-representative seed data, trust/PR risk; open question §7.5 OQ-1, and if ever added it must be optional and never required).

**`unspecified` sex (resolves the third-value gap).** When sex is `unspecified` (declined), the cohort uses a **sex-pooled distribution**: the leaf's percentile is computed against a blend of the male and female distributions for the matching height/age band, weighted by population share, and **confidence is reduced** (an explicit `distributionDepth` penalty in §2.4) because the reference frame is coarser. The user is told their score is sex-pooled and offered to specify sex to sharpen it. There is always a defined cohort path; `unspecified` never produces a missing percentile (unlike a missing height/age, which has no cohort at all — §4.5 unconditioned preview).

A `CohortId` is a stable, deterministic hash of `{sex, heightBand, ageBand, schemaVersion}` so the same build always maps to the same cohort and rankings are reproducible. **`schemaVersion` is part of both the hash and the stored `cohortKey`** (resolving the §6.7 mismatch): `BiometricProfile.cohortKey` (§6.7) stores the full `{sex × heightBand × ageBand × schemaVersion}` tuple (and its hash), so versioned recompute (§5.7) is reproducible — the stored key contains everything that went into the hash. AI-readiness: storing `cohortId` (and the snapshot of covariates that produced it, §5.5) on every `RankResult` lets the AI know exactly which reference frame a percentile was computed in, and detect when a user's cohort changes (e.g. crossing an age band — which triggers a `RecalibrationEvent`, §2.8).

### 5.3 The cold-start challenge — height-conditioned strength distributions

**This is the core data problem of the entire scoring engine, and it is called out as a first-class risk (§7.6) and open question (§7.5, OQ-9).**

The validated, peer-reviewed strength formulas — **Wilks, IPF GL, DOTS, and the Symmetric Strength / ExRx standards** — are all **bodyweight-based**. They normalize performance by the very attribute Peak deliberately excludes (§3.2), and none of them condition on **height**, which is the attribute Peak's strength normalizer *requires*. Therefore:

> **Decision: the off-the-shelf strength formulas cannot be used as Peak's strength normalizer or as its strength distribution.** They are usable only as cross-checks, as a fallback display ("bodyweight-relative" as a secondary readout), and as a sanity bound — never as the build-relative percentile itself. (This is Decision #5's "cross-check only" framing; Wilks/DOTS are **not** part of the normalize step.)

Peak must **build its own height-conditioned strength distributions.** Construction strategy, in priority order:

1. **Anthropometric performance datasets** — datasets that pair **height + per-lift performance** for the same individuals. These are rare (most strength datasets record bodyweight, not height), so coverage will be uneven across lifts and cohorts. This is the primary seed where it exists.
2. **Bodyweight→height re-projection (bridge model)** — where only bodyweight-conditioned strength data exists (the common case, e.g. Symmetric Strength / ExRx), use published **height↔weight↔frame** population relationships (NHANES anthropometrics) to *re-express* a bodyweight-conditioned distribution as an approximate height-conditioned one.

   **The bridge functional form (specified — no longer a total gap).** Strength scales allometrically with lean cross-sectional area, ~ mass^(2/3). The bridge proceeds: (a) for a target height/age/sex cohort, draw the **population bodyweight distribution at that height** from NHANES anthropometrics (`P(weight | height, sex, age)`); (b) for each bodyweight, take the bodyweight-conditioned strength standard's expected performance; (c) integrate over the height-conditioned weight distribution to produce an expected strength and spread *at that height*, applying an **allometric exponent `b = 2/3`** (a tunable parameter of the bridge model version, validated against any direct height-performance data in tier 1). This yields a height-conditioned quantile table per cohort. The bridge is explicitly an **inference**, is the lowest-confidence seed tier, and every percentile derived through it is tagged `provenance = seed-population`, `distributionSource = blended/seed`, with a low `confidence` (via `distributionDepth`) and a documented assumption (§5.6). The exponent value, the exact integration, and validation against first-party data as it accrues are tracked as OQ-9 (§7.5) — the *method* is specified; the *fitted constants* are what first-party data refines.
3. **Military fitness datasets** — strong coverage of the capable/athletic right tail of the curve; used to anchor the upper percentiles (and therefore the `elite`/`peak` thresholds) where consumer data thins out.
4. **First-party data over time** — as real users log per-set strength data *with their height captured*, Peak accumulates true height-conditioned observations and blends them in (§5.4), eventually dominating the seed.

**Consequence — early height-conditioned strength leaves launch low-confidence, by design.** The per-leaf confidence system (§2.4, §4.4) absorbs this: a bench-press leaf backed only by the bridge model launches at, say, `confidence ≈ 0.4` and shows a wide tier band; a 5k-run leaf backed by WMA age-graded tables launches near `confidence ≈ 0.85`. We do **not** hide this — we surface it (§5.6). The **confidence-floor rule** (§2.6) ensures this honest low confidence does not *structurally suppress* a strength specialist's headline relative to a runner. Lifts (height-conditioned, sparse data) will visibly carry lower confidence than running (well-covered) at launch; that asymmetry is honest and expected.

AI-readiness implication: because the bridge model is an explicit inference layer, **the raw measured lift must be stored separately from the bridge-derived percentile** (raw + derived, requirement 1). When real height-conditioned first-party data later replaces the bridge, the AI (and the recompute job) can re-derive every historical percentile from the preserved raw measurements without data loss. **Flag:** if we ever stored only the bridge-derived percentile and discarded the raw lift + the bodyweight/height snapshot at logging time, this re-derivation would be impossible — so the contextual snapshot (§5.5) is mandatory, not optional.

### 5.4 Distribution sourcing and the seed→first-party blend

A `Distribution` is the per-leaf, per-cohort statistical object that turns a normalized value into a percentile. Each is versioned and self-describing:

| Field | Type | Notes |
|---|---|---|
| `distributionId` | stable id | `{leafId, cohortId, version}` |
| `dimension` | `DimensionId` | one of the **performed** dimensions `strength \| power \| muscular_endurance \| aerobic \| anaerobic \| mobility \| balance \| agility \| body_composition` (the canonical snake_case enum; **not** a separate SCREAMING-case list — `consistency` never has a distribution). Note `balance`/`agility` distributions seed thin/low-confidence (see below), and the former `cardio`/`endurance` distributions are replaced by `aerobic`/`anaerobic`. |
| `representation` | `DistributionRepr` | quantile table / fitted params (mean+sd or skew-normal) + the percentile mapping |
| `units` | `Unit` | explicit units of the normalized value's source measure (e.g. `ml/kg/min`, `kg`, `kg/m2`, `degree`) |
| `seedSources` | `SeedSource[]` | which external datasets seeded it (see table below) |
| `firstPartyWeight` | `number` [0,1] | fraction of the blend now coming from Peak's own users |
| `nObserved` | `number` | first-party observation count backing this cohort |
| `K` | `number` | the per-dimension shrinkage constant used in the blend (see below) — stored on the distribution for reproducibility |
| `confidenceBasis` | `number` [0,1] | base confidence before per-user coverage adjustments |
| `methodologyDocId` | id | link to the human-readable methodology note (§5.6) |
| `version` | int | bumped on any reseed or blend recompute |

**Seed source registry** (each source is a typed, versioned record, never inlined as a magic number; persisted reference data referenced by `Provenance.datasetId`, §6.7):

| `SeedSource` | Dimension(s) seeded | Role | Vintage note |
|---|---|---|---|
| `SYMMETRIC_STRENGTH` / `EXRX` | strength | large-population strength standards by sex + **bodyweight** → consumed only through the bridge model (§5.3), low confidence for height cohorts | bodyweight-based; never used directly |
| `MILITARY_FITNESS` | strength, aerobic, anaerobic, muscular_endurance, power | anchors the athletic right tail / elite thresholds; covers pushup/situp/run/jump test batteries | right-tail anchor only |
| `CDC` / `WHO` | body comp, aerobic (cardiovascular) | population norms by age/sex | current |
| `NHANES_DEXA` | body comp | DEXA-measured body-fat% norms (a seed for the composition dimension, §3.3) | **Vintage caveat:** NHANES whole-body DEXA is from 1999–2006 (with partial 2011–2018) and is aging; its vintage and representativeness are **surfaced in the methodology note** (§5.6) and its weight is reduced as first-party DEXA/BIA data accrues. Treated as a dated reference, not a current authoritative norm. |
| `NHANES_ANTHRO` | (bridge) | height↔weight↔frame relationships powering the strength bridge model | current anthropometrics |
| `WMA_AGE_GRADED` | aerobic (running) | age-graded normalization tables (high confidence) | maintained |
| `BALANCE_NORMS` | balance | thin published balance/postural-stability norms (e.g. Y-Balance, single-leg-stance) | **Thin seed — low-confidence launch (§5.6); first-party data needed to harden.** |
| `AGILITY_NORMS` | agility | sparse change-of-direction / coordination norms (e.g. 5-10-5, T-test) | **Sparsest seed — lowest-confidence; likely v2 (§7.3, §7.5).** |

**The blend rule.** A user's percentile is always computed against the **current blended distribution** for their cohort. Early on, `firstPartyWeight ≈ 0` (pure seed); as `nObserved` grows for a cohort, first-party observations are weighted in until they dominate that cohort's bracket:

```
firstPartyWeight(cohort) = nObserved / (nObserved + K)
```

**The shrinkage constant K (specified).** `K` is per-dimension reference data (`blend/1`), stored on each `Distribution` for reproducibility. v1 values, chosen so that a cohort reaches ~50% first-party weight at `nObserved = K`:

| Dimension | `K` (v1) | Rationale |
|---|---|---|
| `aerobic` | 200 | well-covered by WMA + VO2 seed; hand off slowly, demand solid first-party n before trusting it |
| `anaerobic` | 200 | as aerobic; military right-tail seed but otherwise sparse |
| `muscular_endurance` | 150 | moderate seed (military/ACSM rep norms); hand off a little sooner |
| `power` | 150 | jump/throw norms exist but are uneven across cohorts; hand off when first-party data accrues |
| `body_composition` | 300 | NHANES seed is broad; require substantial first-party n before overriding |
| `mobility` | 150 | thinner seed; hand off a little sooner |
| `balance` | 80 | **small K** — seed is thin/low-confidence (§5.4), so first-party data should dominate quickly once it exists |
| `agility` | 80 | **small K** — sparsest seed; first-party data most valuable, but the dimension may not ship until v2 (§7.3) |
| `strength` | 100 | **smaller K** — the seed (bridge model) is the *weakest* (§5.3), so first-party height-conditioned data should dominate sooner |

"Smaller K for well-covered dimensions" in the prose is corrected to the precise intent: **K is smaller where the *seed* is weakest and first-party data is most valuable** (strength, balance, agility), larger where the seed is strong (composition). This is a smooth, per-cohort handoff — there is no flag-day cutover, and sparse cohorts (e.g. tall older women on an obscure lift) correctly stay seed-dominated longer. **Siloed-data caveat:** because external datasets are siloed (strength and aerobic rarely cover the same individuals), the blend operates **per leaf/dimension independently** — Peak does not assume cross-dimension correlation in the seed; any composite/headline correlation assumption is the subject of §2.6 (`xdim/N`) and OQ-7 (§7.5) and must be documented, not buried here.

AI-readiness: the distribution is fully self-describing (units, dimension enum, seed provenance, version, n, K) and serializes cleanly to JSON, so it can drop into an LLM prompt or a feature vector. Because `RankResult.distributionId` pins the exact distribution version used, the AI can tell whether two percentiles are comparable or were computed against different distribution versions.

### 5.5 Contextual snapshot at ranking time

Per AI-readiness requirement 6 (and to make the cold-start re-derivation in §5.3 possible), **every ranking computation captures a snapshot of the build covariates and condition at that moment** alongside the raw measurement. This lives on the measurement record, not the display layer. It is the ranking-layer counterpart of the `BuildSnapshot` captured per session (§4.5, §6.7) and per score-compute (§2.8) — the same `BuildSnapshot` shape, attached to the `Measurement` (via its `MeasurementId`) that `RankResult.sourceMeasurementId` points at.

A `MeasurementSnapshot` (attached to each `Measurement`, §6.2, and referenced by `RankResult.sourceMeasurementId`):

| Field | Type | Provenance | Notes |
|---|---|---|---|
| `sexAtTime` | `GenderEnum` | profile | immutable cohort input |
| `heightCmAtTime` | `Quantity` | HealthKit/Google Fit (passive) or user-stated | immutable cohort input |
| `birthDateAtTime` | ISO-8601 | profile | source of truth for age; age-at-time derived |
| `bodyweightKgAtTime` | `Quantity \| null` | passive health integration | **input only**, never in cohort key; `null` if unknown |
| `bodyFatPctAtTime` | `Quantity \| null` | measurement ladder (§3.5) | for composition↔performance correlation; drives §3.6.1 floor guard |
| `ffmiAtTime` | `Quantity \| null` | derived (§3.3) | muscularity context |
| `measurementSource` | `MeasurementSourceEnum` | — | `benchmark \| logged_set \| inferred_from_strength \| passive_health` |
| `confidence` | `number \| null` [0,1] | — | per-datum confidence; `null` if untested |
| `capturedAt` | ISO-8601 | — | timestamp + sequence |

This snapshot is what lets a future AI correlate composition change with performance change ("your 5k percentile rose as your body-fat% fell into the target band") — the central analytic payoff of capturing condition at session time. **Untested is `null`, never `0`** (requirement 5): a missing body-fat% or an unbenchmarked leaf is explicitly unknown so the AI knows the boundary of what it can reason about.

### 5.6 Methodology transparency — the differentiator made into data

Most competitors hide their scoring; Peak treats **methodology transparency as a product differentiator (the third moat property, §1.5) and stores it as first-class data**, not as marketing copy. Every percentile the user sees can be drilled into to reveal exactly what backs it. **`MethodologyNote`s are included in the AI context export (§2.9, §6.9)** so the AI can interpret why a cohort or distribution is what it is, and distinguish a real user change from a recalibration artifact.

A user-facing `MethodologyNote` (one per `distributionId`, surfaced from any `RankResult`):

- **Data source label** — the human-readable `seedSources` ("Your bench percentile is currently estimated from population strength standards adjusted for height, not yet from Peak's own users"), including the **NHANES DEXA vintage caveat** (§5.4) where relevant.
- **Provenance + confidence** — `seed-population` vs `blended` vs `first-party`, with `firstPartyWeight`, `nObserved`, and `K` shown plainly ("backed by 1,240 Peak users of similar build").
- **Cold-start honesty** — for bridge-model strength leaves, an explicit statement that the height adjustment is an inference (allometric `b=2/3`, §5.3) and confidence is therefore lower, with the band shown wider.
- **Documented assumptions** — any modeling assumption (the bodyweight→height bridge, the `xdim/N` cross-dimension correlation used downstream in §2.6, the `momentum/N` and `proj/N` models) is written down and surfaced here, never buried.

UI copy uses **tier + percentile language**, not raw 0–100 numbers (§2.3). Crucially, the current prototype's claim that "Strength is scored from your logged lifts relative to bodyweight & population data" is **incorrect for this model and must be replaced** — strength is scored relative to **height-conditioned** population data, with bodyweight excluded from the normalizer (it appears only as snapshot context). **Flag:** any remaining bodyweight-relative copy in the UI contradicts the immutable-build principle (§3.1) and must be corrected when this engine lands (see also §7.6).

### 5.7 Storage, recompute, and AI-export

This section's data is **local-first** (on-device `AppData`; the full persistence model is §6.8–§6.9), but it deliberately separates concerns the current prototype conflates:

- **Raw layer (never discarded):** `Measurement` (the common `MeasurementId`-bearing interface — a `SetRecord`/`BenchmarkResult`/health reading, §6.2) + `MeasurementSnapshot` — the raw lift/time/composition reading and the contextual snapshot.
- **Reference layer (versioned, shippable, replaceable):** `Distribution` + `SeedSource` + `MethodologyNote` + the model-version constants (`weights/1`, `xdim/1`, `proj/1`, `infer/1`, `blend/1`, `momentum/1`) — bundled with the app and updatable out-of-band; bumping a distribution version triggers a **recompute** of derived percentiles from the preserved raw layer (no raw data is ever mutated; this is the `distribution_reseed` trigger of `RecalibrationEvent`, §2.8).
- **Derived layer (recomputable):** `RankResult` / `LeafScore` history — append-only, timestamped, each pinned to the `distributionId` and `sourceMeasurementId` it came from.

Because the derived layer is fully recomputable from raw + reference, the seed→first-party blend (§5.4) and the eventual replacement of the cold-start bridge model (§5.3) can re-rank all of a user's history without data loss.

**Flag (against the current prototype):** today's `Muscle.score/best/ratio/pct/trend` are hand-authored display strings (e.g. `ratio: "1.2× BW"`, `pct: "81st"`) with no raw measurement, no timestamp, no cohort, and no provenance behind them. That shape violates AI-readiness requirements 1, 2, 4, 5, and 7 and **cannot** carry this ranking model — it must be replaced by the raw/reference/derived separation above before any real percentile is computed (the migration that does this is §7.2).

For the AI layer (deferred, but data-ready now), a leaf's full ranking state serializes to a compact, privacy-respecting **context document** (§6.9 `exportContext()`): the raw measurements, the snapshot covariates, the derived percentile history, the cohort, the methodology/provenance, the recalibration events, and the consistency track — everything an LLM needs to explain a percentile, attribute its movement, interpret discontinuities, and reason about confidence, with **no global/other-user data ever leaving the device** (the bell curve ships as anonymized seed parameters, not as other people's records).

---

## 6. Data Architecture (AI-Ready)

This section defines the persisted data model for Peak and is the canonical home of the **ten AI-readiness requirements** referenced throughout §§1–5. The AI coaching layer (§7.3 Phase P4) is deferred, but per the AI-readiness mandate the schema below is the **data contract that future layer will consume** — built now so an LLM/ML system can analyze it and produce high-quality suggestions without a migration. We describe only the contract, not the AI.

The current app persists a single display-oriented document (`AppData` in `src/model.ts`); this section **extends** that into a normalized, raw-preserving, provenance-tagged event store. The current shape is treated as a *projection* (a denormalized view for rendering), not the source of truth. This section is the **single canonical schema**; where any earlier section sketched a field, it conforms to the types here (e.g. §3.7's composition entity uses the `Quantity` convention defined below).

### 6.1 Design principles (how the mandate maps to schema)

Every entity in this section is required to satisfy these. They are restated as enforceable rules so any future field can be checked against them. (Sections 2–5 cite these by number; this table is the source of truth.)

| # | Mandate | Concrete schema rule |
|---|---------|----------------------|
| 1 | Raw + derived | Every record stores raw measured fields; derived values live in a sibling `derived` block, never overwriting raw. Raw is immutable once written. **Derived values that have provenance/method are also preserved at-time, not silently overwritten** (see §6.4 `SetRecord.derived` — appended, version-stamped, not cleared). |
| 2 | Timestamp + sequence | Every record carries `id`, `createdAt` (ISO-8601 UTC), `seq` (monotonic per-device counter). No display-only time strings as the sole temporal field. |
| 3 | Machine-readable taxonomy | Muscle group, movement pattern, dimension, equipment, unit are **stable snake_case enums** (§6.3), never free text, spelled identically across catalog and logging layers. |
| 4 | Provenance + confidence | Every datum that is a *value about the user* — **including AI-written intent (programmed sets, goal targets)** — carries a `Provenance` block (`source`, `confidence`, `asOf`, optional `method`). |
| 5 | Explicit gaps | Untested = record **absent** or value `null` with `provenance.source = "untested"` and `confidence: null`; never `0` and never `0.0` confidence. A `0` means "measured zero." |
| 6 | Contextual snapshots | Each session embeds a `BuildSnapshot` + `CompositionSnapshot` (incl. numeric band definition) captured at session time. |
| 7 | Stable IDs + links | Leaf ↔ exercise ↔ muscle group ↔ dimension linked by stable string IDs; every raw event carries a `MeasurementId` (§6.2) that is the single join target for all `*MeasurementId`/`contributingSetIds` references. |
| 8 | Self-describing + units | Numeric fields are `Quantity { value, unit }` (or a documented `[0,1]` fraction with a scale tag in exports); the document serializes to JSON cleanly (§6.8). |
| 9 | Intent / targets | Programmed vs actual, `targetHit`, and goal targets are first-class fields, **each carrying provenance** so AI-authored intent is auditable (§6.4, §6.6, §6.8). |
| 10 | Local-first, exportable | Everything stays on-device (extends current `storage.ts`); a deterministic `exportContext()` produces a compact privacy-respecting JSON document for the AI (§6.9). |

### 6.2 The shared `Provenance`, `MeasurementId`, and unit primitives

These value-objects are embedded everywhere and are the backbone of requirements 4, 5, 7, and 8.

```ts
type MeasurementId = string;   // stable id on EVERY raw event (SetRecord, CardioSetRecord, BenchmarkResult, health reading)

// The common interface every raw, percentile-backing event satisfies. There is NO separate `Measurement` entity:
// `Measurement` is this shape, and SetRecord/CardioSetRecord/BenchmarkResult/HealthReading all implement it.
type Measurement = {
  id: MeasurementId;
  kind: "set" | "cardio_set" | "benchmark" | "health_reading";
  performedAt: string;          // ISO-8601
  snapshot?: BuildSnapshot;     // §5.5 MeasurementSnapshot is a BuildSnapshot attached here
};

type ProvenanceSource =
  | "measured"            // user logged it / device sensor / benchmark test
  | "inferred-strength"   // derived from logged lifts (e.g. muscle score, muscularity prior)
  | "inferred-related"    // cross-dimension assumption (documented per §5.6 transparency)
  | "seed-population"      // external dataset (Symmetric Strength, NHANES, etc.)
  | "healthkit"           // passive biometric integration
  | "user-stated"         // self-reported (e.g. height/birthdate at onboarding fallback, §4.5)
  | "ai-suggested"        // AI-authored intent (programmed set / goal target) — REQ 4 for intent
  | "untested";           // explicit unknown — the ONLY way to encode a gap

type Provenance = {
  source: ProvenanceSource;
  confidence: number | null; // [0,1]; per-leaf, never global (§2.4); null = unknown (untested), never 0.0 for a gap
  asOf: string;              // ISO-8601 — when this value became true / was observed
  method?: string;          // e.g. "epley", "dexa", "navy-tape", "wma-age-grade", "...+floor_guard" (§3.6.1)
  modelVersion?: string;    // e.g. "infer/1", "weights/1", "proj/1" — re-derivable lineage
  datasetId?: string;       // FK into the seed-dataset registry (§5.4) when source=seed-population
  authoredBy?: "user" | "template" | "ai";  // for intent records (programmed sets, goal targets) — REQ 4/9
  contextRef?: string;      // for ai-suggested: the AIContext export hash that produced the suggestion (auditability)
  staleAfterDays?: number;  // drives re-test prompts (§4.1, §4.4)
};

// Self-describing measurement. Raw is ALWAYS a typed value+unit, never a formatted string.
type Quantity = { value: number; unit: Unit };
```

> **Replaces a current anti-pattern, and unifies the join key.** Today `Muscle` stores `best: "95 kg"`, `ratio: "1.2× BW"`, `pct: "81st"`, `trend: "+6%"` — formatted strings intermixed with data, with no source. The new model stores `Quantity` + `Provenance` and renders the string in the UI layer. Every provenance link points at a `MeasurementId`, so the §5 ranking layer and the §6 event store share one join key — no dangling `Measurement` type. **FLAG resolved:** the "storage is display-shape coupled" gap and the "Measurement link target undefined" gap are both closed here.

### 6.3 Controlled vocabularies (enums)

All taxonomy is enums with stable string values (requirement 3), in the single snake_case namespace fixed by the canonical conventions. These are versioned reference data, not code constants the UI free-types. (Section 2.1 declares the same `MuscleGroup`/`MovementPattern`/`DimensionId` enums for the capability tree; §4.1 uses the same `MovementPattern`/`Equipment`/`Unit`; this is their single persisted home.)

```ts
type Dimension =
  | "strength"            // "Maximal Strength"
  | "power"               // "Power & Explosiveness"
  | "muscular_endurance"  // "Muscular Endurance"
  | "aerobic"             // "Aerobic Endurance"
  | "anaerobic"           // "Anaerobic Capacity"
  | "mobility"            // "Mobility & Flexibility"
  | "balance"             // "Balance & Stability"
  | "agility"             // "Agility & Coordination"
  | "body_composition"    // "Body Composition"
  | "consistency";        // "Consistency"
  // "wellroundedness" is a LENS over these, not a stored dimension (§2.3, §7.4 Decision #8) — never persisted as a value.
  // "consistency" carries no capability leaves/distributions (§2.7).

type MuscleGroup =
  | "chest" | "front_delt" | "side_delt" | "rear_delt" | "biceps" | "triceps"
  | "forearms" | "lat" | "trap" | "lower_back" | "abs" | "obliques"
  | "glutes" | "quads" | "hamstrings" | "calves" | "tibialis";

type MovementPattern =
  | "horizontal_push" | "vertical_push" | "horizontal_pull" | "vertical_pull"
  | "squat" | "hinge" | "lunge" | "carry" | "rotation" | "isolation"
  | "run" | "row_erg" | "cycle" | "swim" | "jump" | "isometric" | "mobility";

type Equipment =
  | "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight"
  | "kettlebell" | "band" | "treadmill" | "track" | "erg" | "none";

type Unit =
  | "kg" | "lb" | "reps" | "rpe" | "sec" | "min" | "m" | "km" | "mi"
  | "ml/kg/min" | "percent" | "bpm" | "kg/m2" | "degree" | "count" | "points" | "fraction01";
```

> **Granularity note (capability tree, §2.1).** `MuscleGroup` expands the current 17 `bodyParts.json` ids into a stable normalized set and splits `delts` into front/side/rear so inference from presses vs raises is separable. The SVG `bodyParts.json` keys become a *render-time mapping table* onto these enum values, decoupling visualization geometry from the data taxonomy (the same decoupling flagged in §2.1). `MovementPattern` and `Equipment` here are **identical** to the enums the benchmark catalog uses (§4.1) — `run` (not `locomotion`), `treadmill`/`track`/`erg` (not `watch_hr`) — so catalog and logging share one vocabulary.

### 6.4 Per-set logging — the raw event store (the irreplaceable fuel)

This is the single most important extension and the one that **cannot be retrofitted** (per-set logging from day one; §7.4 Decision #14, §7.3 Phase P0). The current `LogSheet` captures only `minutes` + optional total volume and never populates `Workout.exercises`. We replace that with a true event hierarchy: **Session → ExerciseEntry → SetRecord**. This is the raw substrate the inferred muscle-group strength of §4.3 reads, and it feeds the consistency track (§2.7) via `localDay`.

```ts
type Session = {
  id: string;                 // stable
  seq: number;                // monotonic device sequence
  createdAt: string;          // ISO-8601 UTC — REQ 2
  localDay: string;           // "YYYY-MM-DD" local — drives day-streak / consistency track (§2.7)
  type: WorkoutType;          // "Gym"|"Cardio"|"Sport"|"Mobility"
  build: BuildSnapshot;       // REQ 6 — covariates AT session time (§6.7)
  composition: CompositionSnapshot | null;   // REQ 6 — null = untested, NOT 0
  programId?: string;         // FK → programmed plan (REQ 9 adherence)
  entries: ExerciseEntry[];
  notes?: string;             // free text allowed ONLY here (never in taxonomy fields)
};

type ExerciseEntry = {
  id: string;
  exerciseId: string;         // FK → ExerciseDef (§6.5) — links into the capability tree
  programmedSets?: ProgrammedSet[];  // REQ 9 — intent (now provenance-stamped, see below)
  sets: SetRecord[];                 // REQ 1 — raw, immutable
};

type SetRecord = {
  id: MeasurementId;          // REQ 7 — the join target for contributingSetIds / sourceMeasurementId
  seq: number;                // order within the entry
  // RAW — first-class from day one. Each is a self-describing Quantity.
  weight: Quantity | null;    // null for bodyweight-only; unit ∈ {kg,lb}
  reps: number;
  rpe: number | null;         // 1..10; null = not captured (NOT 0)
  restSec: Quantity | null;   // rest BEFORE this set; null = untimed
  targetHit: boolean | null;  // REQ 9 — programmed vs actual; null if no target set
  tempo?: string;             // optional "3-1-1-0"
  // DERIVED — recomputed, never replaces raw (REQ 1). APPENDED, version-stamped — NOT cleared.
  derived?: SetDerived[];     // history of derivations; latest is current, prior ones retained for lineage
};

// At-time est-1RM lineage is PRESERVED (resolves the "cleared/rebuilt destroys lineage" lapse):
// when the est-1RM method/version changes, a NEW SetDerived is appended; the prior is kept so the AI
// can see what the set's est-1RM was under the previous method.
type SetDerived = {
  computedAt: string;         // ISO-8601 — when this derivation was produced
  est1RM: Quantity;
  provenance: Provenance;     // source:"inferred-strength", method e.g. "epley", modelVersion e.g. "infer/1"
  superseded: boolean;        // false for the current/latest derivation; true once a newer one is appended
};

type ProgrammedSet = {
  targetWeight?: Quantity; targetReps?: number; targetRpe?: number;
  provenance: Provenance;     // REQ 4/9 — authoredBy: "user" | "template" | "ai"; contextRef for AI-authored
};

// Aerobic/anaerobic (cardio) sets reuse the same MeasurementId discipline:
type CardioSetRecord = {
  id: MeasurementId; seq: number;
  distance: Quantity | null; duration: Quantity; avgHr: Quantity | null;
  vo2Estimate?: Quantity;    // derived; provenance.method e.g. "cooper-vo2"
  targetHit: boolean | null;
  derived?: SetDerived[];    // same append-not-clear discipline
};
```

> **At-time derived lineage is preserved (lapse resolved).** `SetRecord.derived` is an **append-only array of version-stamped `SetDerived`**, not a single value "cleared/rebuilt by the scoring engine." When the est-1RM formula version changes, a new `SetDerived` is appended and the prior is marked `superseded: true` but **retained**. This makes the at-time est-1RM and its method version re-derivable (req. 1) — the AI can see what a set's est-1RM was under the prior method, matching the "never mutate history" discipline applied to scores (§2.8). Raw fields remain immutable; only the derived array grows.

> **AI-readiness implication.** Because every set is timestamped, sequenced, RPE-tagged, target-flagged, rest-aware, and `MeasurementId`-keyed, the deferred AI can compute the four flagship use cases directly off raw events: progressive-overload (last session's `targetHit` + RPE trend), plateau detection (flat current-`est1RM` over ≥4 sessions of the same `exerciseId`), gap analysis (no `entries` touching a `MuscleGroup` in N days), and adherence (`programmedSets` vs `sets`, with `authoredBy` distinguishing AI-suggested from user-set targets). None of this is possible against the current `stats:[{v:"30",k:"minutes"}]` shape — **FLAG (closed): the current log shape is AI-dead and is replaced here.**

### 6.5 The capability tree — stable IDs + relational links

Requirement 7. Four entity tiers, linked by stable IDs, so the AI can traverse leaf → exercise → muscle group → dimension and roll values up (the capability tree of §2.1). Exercise and capability definitions are **reference data** (versioned, like the model catalog) — not user data. `ExerciseDef.muscleWeights` are the attribution coefficients the inference engine (§4.3) uses and are **shipped in the AI export** (§6.9) so inferred scores are re-derivable, not merely inspectable.

```ts
// Reference: an exercise the user can log.
type ExerciseDef = {
  id: string;                  // stable, e.g. "barbell-bench-press"
  name: string;
  movementPattern: MovementPattern;
  equipment: Equipment;
  primaryMuscles: MuscleGroup[];     // weighted links → muscle-group inference (§4.3)
  secondaryMuscles: MuscleGroup[];
  muscleWeights: Record<MuscleGroup, number>;  // attribution coefficients (sum ~1) for inference (§4.3); exported (§6.9)
  dimension: Dimension;        // usually "strength" or "aerobic"
};

// A scored capability node (leaf, sub-category, dimension, or headline).
type CapabilityNode = {
  id: string;                  // stable, e.g. "strength.chest" (leaf), "push.horizontal" (subcat),
                               //   "dim.strength" (dimension), "headline.peak" (headline) — snake_case namespace
  kind: "leaf" | "subcategory" | "dimension" | "headline";
  label: string;
  dimension: Dimension | null; // null only for headline
  parentId: string | null;     // tree edges → roll-up
  muscleGroup?: MuscleGroup;    // present on muscle-strength sub-categories
  sourceExerciseIds?: string[]; // leaves: which exercises feed this node
};
```

The user-specific *value* on any node is a `CapabilityScore` (§6.6). The tree structure is shared reference data; the scores are per-user, on-device.

### 6.6 Capability scores — percentile, confidence, provenance, tiers

This is where §2's scoring model (`LeafScore`) and §5's `RankResult` are persisted in an AI-legible way. **Raw normalized value AND uncapped percentile AND capped percentile AND tier are all stored** (requirement 1), each with provenance and confidence (requirement 4), and absence is explicit (requirement 5). All percentiles are `[0,1]` (canonical convention #1); tier derives from `percentileRaw`.

```ts
type CapabilityScore = {
  nodeId: string;              // FK → CapabilityNode
  // RAW (preserved so AI can re-derive — REQ 1)
  rawBest?: Quantity;          // best measured performance feeding this node
  normalizedValue?: number;   // build-stripped value (dimensionless; method in provenance)
  // DERIVED — canonical capped/uncapped pair (NO bare "percentile" field)
  percentileRaw: number | null;   // [0,1] uncapped, build-conditioned; null = untested (NOT 0) — REQ 5
  cappedPercentile: number | null;// = min(percentileRaw, 0.95) (§2.3); null = untested
  tier: Tier | null;           // band of percentileRaw, not capped (§2.3); null = untested
  isPeak?: boolean;            // percentileRaw ≥ 0.95 → per-leaf "Peak" badge (§2.6)
  provenance: Provenance;      // source + confidence + datasetId + modelVersion + asOf — REQ 4
  distributionId?: string;     // exact versioned distribution used (§5.4)
  coverage: number;            // [0,1] how well this node is benchmarked — drives confidence band
  eligible: boolean;           // §2.6 eligibility (excluded from coverage denominator if false)
  history: ScorePoint[];       // REQ 2 — timestamped trajectory for trend/ETA, NOT a "+6%" string
  attributions?: Attribution[];// REQ 2 — STRUCTURED weekly-attributed movement (§2.6), not prose
};

type ScorePoint = {
  at: string;                  // ISO-8601
  percentileRaw: number | null;
  cappedPercentile: number | null;
  normalizedValue?: number;
  // NOTE: no free-text `cause`. Attribution lives in the structured Attribution[] (below / §2.6).
};

type Tier = "foundation" | "developing" | "proficient" | "advanced" | "elite" | "peak";
// "untested" is NOT a tier — it is a LeafState with tier=null (the `tier` field above is `Tier | null`).
// Exact naming TBD (§7.5 OQ-5); the ENUM is stable and percentile-band-backed regardless (§2.3, §5.1).
```

The weekly-attribution explanation is the **structured `Attribution`** record (§2.6) — `{ leafId, fromPercentileRaw, toPercentileRaw, headlineDelta, triggeringSessionId, triggeringMeasurementIds, window }` — not a prose `cause` string. The English sentence ("mile time dropped 20s, +0.04 pts") is *rendered* from it at display time, so the AI computes over structured deltas instead of re-parsing English. This resolves the "free-text cause carries attribution semantics" lapse.

> **Replaces a current anti-pattern.** `Muscle.score` (flat 0–100, hand-set, nudged ±1) and `peakScore()` (flat mean) carry no build, population, percentile, or provenance. Under the new model, a muscle-group strength leaf's `CapabilityScore` is `provenance.source = "inferred-strength"` with `confidence` < a directly-benchmarked leaf — exactly the per-leaf honesty §2.4/§4.4 require. The current `peakScore`/`symmetryPct` functions become a thin projection over `CapabilityScore.cappedPercentile`, not the source of truth.

> **Trend storage (REQ 2).** The current `trend:"+6%"` string is unrecoverable. `history: ScorePoint[]` + `attributions: Attribution[]` make trajectory, weekly-attributed movement (§2.6), and gap-as-ETA (§2.6.1, §7.3 P3) computable. **FLAG (closed): no timestamps/time-series in current model is the blocker for projections; resolved here.**

### 6.7 Build & composition snapshots + biometric profile

Requirement 6, and the precondition for the entire build-relative thesis (§2, §3) that **does not exist at all today** (no height/weight/sex/age entity). Snapshots are embedded on each `Session` so the AI can correlate composition change with performance over time. Bodyweight is captured but, per the immutable-build principle (§3.1, §3.2), is an **input** (composition + load suggestions) and is **never** part of the normalizer. This is the persisted form of the `BuildSnapshot`/`BodyComposition` of §2.8, §3.7, §4.5, and §5.5 — one canonical shape.

```ts
// Immutable-frame covariates — the ONLY attributes in the reference frame (§3.1).
type BuildSnapshot = {
  sex: "male" | "female" | "unspecified";   // provenance:"user-stated" or "healthkit"; cohort path for "unspecified" §5.2
  heightCm: Quantity;                          // immutable
  birthDate: string;                           // ISO-8601 — SOURCE OF TRUTH for age (§2.8); ageYears derived, not frozen
  ageYears: number;                            // DERIVED from birthDate at capturedAt (convenience only)
  // frame/limb proportions intentionally absent — deferred to v2 (§7.5 OQ-11)
  provenance: Provenance;
  capturedAt: string;                          // ISO-8601
};

// Mutable condition — a measured DIMENSION + input, never a normalizer (§3.1).
type CompositionSnapshot = {
  bodyweight: Quantity | null;       // HealthKit-fed; user NEVER manually logs (§4.5). null=unknown
  bodyFatPct: Quantity | null;       // null = untested (NOT 0) — REQ 5
  ffmi: Quantity | null;             // derived lean-mass-for-frame; provenance.method
  bandDefinition?: BandDefinition;   // numeric band edges + essential floor + center (§3.7) — machine-readable
  measurementLadder?: "dexa" | "bia" | "tape_navy" | "inferred_from_strength" | "none"; // drives confidence (§3.5)
  derivedIdealWeight?: { low: Quantity; high: Quantity };  // muscle-aware target (§3.4) — derived, not a judgment
  provenance: Provenance;
};

type BandDefinition = {            // resolves the "band stored as label only" lapse
  sex: "male" | "female"; source: string;        // e.g. "ACSM"
  essentialFloorBf: number;                        // [0,1] fraction
  edges: Record<"essential"|"athletic"|"fitness"|"average"|"high", [number, number]>;
  targetCenterBf: number;                          // the §3.4 center
};

// Persisted once + updated; the latest is denormalized into each session snapshot.
type BiometricProfile = {
  build: BuildSnapshot;
  latestComposition: CompositionSnapshot | null;
  healthSources: { healthKit: boolean; googleFit: boolean };
  // Full cohort key INCLUDING schemaVersion (resolves the §5.2/§6.7 mismatch) — reproducible recompute:
  cohort: { sex: string; heightBand: string; ageBand: string; schemaVersion: string };
  cohortKey: string;                 // deterministic hash of the cohort tuple above (§5.2)
};
```

> **AI-readiness implication.** Because each `Session` freezes the build/composition (incl. the numeric `bandDefinition`) that were true *at that time*, the deferred AI can answer "did my bench percentile rise because I got stronger or because I leaned out?" and "is the user below the essential floor?" (the §3.6.1 guard) — from the record alone. **FLAG (closed): the "no biometric/body-build profile entity" gap is the single largest blocker to the product vision; this subsection introduces it.** The cohort key stores `schemaVersion`, so a versioned recompute reproduces the exact reference frame.

The seed-dataset registry referenced by `Provenance.datasetId` (e.g. `symmetric-strength`, `nhanes-dexa`, `nhanes-anthro`, `wma-running`, `military-apft`) is versioned reference data carrying its own methodology note (§5.6 transparency: always label the data source backing a percentile, incl. the NHANES DEXA vintage caveat). It is read-only and shipped with the app; its full schema is the `SeedSource` registry of §5.4.

### 6.8 Self-describing top-level document (extends current `AppData`)

The persisted root extends today's single-document model (`AppData`, `storage.ts` key `peak.appdata.v1`, debounced + flush + `migrate()`/`reconcile()` pipeline — all reused unchanged; see §7.1, §7.2). New data lives under typed sub-trees; the existing display structures (`metrics`, `gaps`, `drills`, `liveMetrics`, `chat`, `added`) are retained as a **render projection** and explicitly marked non-authoritative.

```ts
type PeakData = {
  version: number;                       // DOCUMENT version → migrate(); current DATA_VERSION=2, this lands as v3
  schema: {
    spec: "peak-data-v3";                // document-level schema id
    units: "explicit";
    scales: { percentile: "fraction01"; confidence: "fraction01"; coverage: "fraction01" };
    // Document version ⇒ a fixed SET of per-entity schema versions it embeds (resolves the v3-vs-v1 ambiguity):
    entitySchemas: {                     // doc v3 pins exactly these entity versions
      buildProfile: "peak.build_profile.v1";
      bodyComposition: "peak.body_composition.v1";
      capability: "capability/1";
      session: "peak.session.v1";
    };
    referenceModels: {                   // versioned reference/model constants in effect
      weights: "weights/1"; correlation: "xdim/1"; projection: "proj/1";
      inference: "infer/1"; blend: "blend/1"; momentum: "momentum/1";
    };
    generatedBy: string;
  };

  biometric: BiometricProfile;           // NEW — §6.7
  sessions: Session[];                   // NEW — raw event store, §6.4 (replaces `feed` as source of truth)
  capabilityScores: CapabilityScore[];   // NEW — §6.6 (replaces hand-set muscle scores)
  consistency: ConsistencyTrack;         // NEW — §2.7 momentum track (own scale, not in headline)
  recalibrations: RecalibrationEvent[];  // NEW — §2.8 (exported for trajectory interpretation)
  goals: GoalV3[];                       // EXTENDED — §6.6 targets are measurable + provenance-stamped

  // Reference data (read-only, versioned, shipped):
  // exerciseDefs, capabilityTree, seedDatasets, distributions, methodologyNotes — referenced by ID.

  // Retained display projection (NON-authoritative; rebuilt from the above):
  projection: {
    muscles: { front: Muscle[]; back: Muscle[] };  // current shape, now derived
    metrics: Metric[]; gaps: Gap[]; streak: Streak; profile: { symmetry: number; weeklyVolume: number };
  };
};

type GoalV3 = Goal & {
  target?: { nodeId: string; targetPercentileRaw?: number; targetQuantity?: Quantity }; // REQ 9 measurable
  provenance: Provenance;    // REQ 4 — authoredBy: "user" | "ai"; contextRef if AI-authored (auditable)
  etaProjectedAt?: { low: string; high: string } | null;  // §2.6.1 proj/1 ETA RANGE; null if insufficient/no-trend
  projectionModel?: "proj/1";
};
```

**Document version vs entity schema versions (ambiguity resolved).** The top-level `PeakData.version` (the migration counter, landing as `3`) is distinct from per-entity schema ids (`peak.build_profile.v1`, `capability/1`, …). The relationship is made explicit: **`schema.entitySchemas` pins exactly which entity-schema versions document v3 embeds**, and `schema.referenceModels` pins the model-constant versions in effect. A migration bumps the document version and updates these pinned maps; an entity schema can evolve independently (e.g. `capability/2`) and a future document version will re-pin it. There is no longer an unstated relationship between "v3" and "v1" sub-entities.

Every numeric field is either a `Quantity` (carries its unit) or a documented `[0,1]` fraction (scale-tagged in `schema.scales`), so the document is unambiguous to a machine without external context (requirement 8). A v2→v3 migration adds the new sub-trees empty (no fabricated data — "no pre-fabricated activity"; §4.5, §7.4 Decision #10/#18), preserves goals/biometric edits, and leaves untested capability scores **absent** rather than zero-filled. The full migration is §7.2.

### 6.9 Local-first persistence and the AI context export

Requirement 10. All of the above stays **on-device**, reusing the existing dual-backend persistence (`tauri-plugin-store` native / `localStorage` web), the 250ms debounced write, the `pagehide`/`visibilitychange` flush, and the `migrate()`/`reconcile()` lifecycle. Nothing touches the network — unchanged.

The data contract the deferred AI consumes is produced by a single deterministic, privacy-respecting function (this is the concrete implementation of the serialization sketched in §2.9 and §5.7):

```ts
function exportContext(d: PeakData, opts?: { sinceDays?: number }): AIContext;
```

`AIContext` is a compact JSON document that:

- **Includes** capability scores (raw + normalized + uncapped percentile + capped percentile + tier + confidence + provenance + distributionId), the recent session/set time-series, build & composition snapshots (incl. numeric `bandDefinition`) and their trajectory, programmed-vs-actual adherence with `authoredBy` provenance, goals with provenance-stamped targets/ETAs, **the `ConsistencyTrack` (streak + momentum trajectory, §2.7), the `RecalibrationEvent`s (§2.8), the `MethodologyNote`s (§5.6), the structured `Attribution`s (§2.6), and the `ExerciseDef.muscleWeights` + active model versions (`infer/1`, `weights/1`, `xdim/1`, `proj/1`)** needed to re-derive inferred scores — plus explicit `untested`/`null` markers for every gap.
- **Strips** rendering-only fields (color hex, formatted strings, SVG geometry, `added` toggles, chat history) and any raw biometric identifiers beyond what's needed (e.g. it can ship the derived `cohortKey` instead of exact height where appropriate).
- **Self-documents** units, scales, and the enum vocabularies inline so it can be dropped into an LLM prompt or flattened into a feature vector without a schema lookup.

This export is the boundary: the AI layer (§7.3 Phase P4) reads `AIContext` and writes only suggestions back as `programmedSets`/`GoalV3.target` — **each stamped with `provenance.source = "ai-suggested"`, `authoredBy: "ai"`, a `confidence`, and a `contextRef` to the export that produced it** — and it never mutates raw history. That keeps requirement 1 (raw is immutable) intact and makes the "every AI suggestion auditable against the data that produced it" promise actually fulfillable (resolving the intent-provenance lapse).

> **Net FLAG status.** The five AI-readiness gaps the code digest raised — no biometric entity, no per-set capture, no timestamps/time-series, display-coupled storage, and a flat hand-authored score — are resolved by §6.4, §6.6, and §6.7. The export-completeness lapses (consistency, recalibration events, methodology notes, structured attribution, `muscleWeights`, intent provenance, the unified `MeasurementId` join, preserved `SetDerived` lineage) are resolved by §6.2, §6.4, §6.6, and this subsection. The one item this section *cannot* satisfy alone is the population reference distribution (the seed datasets); that is reference data tracked under §5's data strategy and only referenced here by `datasetId`.

---

## 7. Implementation Bridge, Roadmap & Open Questions

This section is the honest reckoning between what Peak *is* today (a polished on-device prototype with a flat, hand-authored scoring model) and what the preceding sections (§1 Product Vision, §2 Capability Score Model, §3 Build Normalization & Body Composition, §4 Benchmarks & Onboarding, §5 Private Ranking & Data Strategy, §6 AI-Ready Data Architecture) commit it to becoming. It states the gap plainly, sequences a roadmap that respects the cold-start data reality, locks the decisions that are settled, and flags the risks and open questions that could still move the architecture.

### 7.1 Current state vs. target — the gap, by subsystem

The current build (`apps/peak`) already gets the *hardest plumbing* right — local-first persistence, a versioned migration pipeline, and a no-fabricated-activity stance — but its **data shape is display-oriented, not analyzable**, and its scoring is a flat mean of hand-authored numbers. Everything that makes Peak *Peak* (build-relative percentiles, capability tree, AI-readiness) is unbuilt.

| Subsystem | Current implementation | Target (per §2–§6) | Gap severity |
|---|---|---|---|
| **Persistence** | Single `AppData` doc, key `peak.appdata.v1`; tauri-plugin-store / localStorage dual backend; 250ms debounced save + pagehide/visibilitychange flush; `migrate()`+`reconcile()` (`src/storage.ts`, `src/store.tsx`) | Same engine, but storing a normalized RAW+DERIVED schema (§6) | **Low** — reuse as-is; this is the asset to build on |
| **Biometric / build profile** | None. No height, weight, sex, age, archetype anywhere in `AppData` | `BuildProfile` of immutable covariates (sex/height/age) + passive HealthKit/Google Fit composition & bodyweight time-series, with the missing-data fallback (§3.7, §4.5, §5.5, §6.7) | **Critical** — blocks the entire build-relative moat |
| **Per-set logging** | `LogSheet` captures title/focus/minutes/optional total volume only; `Workout.exercises[]` & `Exercise.pr` defined but never populated (`src/components/CreateSheets.tsx`) | Per-set `{ weight, reps, rpe, targetHit, restSec, timestamp, MeasurementId }` as first-class, day-one fields (§6.4) | **Critical** — irrecoverable data; every later AI/projection feature depends on it |
| **Scoring engine** | `peakScore()` = unweighted mean of 17 manual muscle scores; `symmetryPct()` = front-vs-back (mislabeled "L/R"); muscle `.score/.best/.ratio/.pct/.trend` are authored/nudged ±1 (`src/model.ts`, `store.bumpMuscle`) | Two-step normalize→empirical-percentile per leaf, capped at top-5%, coverage-weighted + confidence-floored roll-up into the capability tree (§2) | **Critical** — no derivation from logged lifts exists |
| **Reference distributions** | None; `pct` strings ("81st") hand-typed in `seed.ts` | Seeded population curves (Symmetric Strength/ExRx via bridge, NHANES DEXA [vintage-caveated], NHANES anthro, CDC/WHO, military, WMA), stratified by covariate, with source labels and blend constant K (§5.3, §5.4) | **Critical** |
| **Timestamps / time-series** | `Workout.time` is a display string ("4:32 PM"); no ISO `createdAt`; `trend` values static text | ISO `createdAt`+monotonic `seq` on every datum; longitudinal `ScorePoint[]` + structured `Attribution[]` for weekly-attributed movement (§2.6, §6.6) | **High** — blocks trends, ETAs, plateau detection |
| **Taxonomy** | 17 grouped muscle ids in `bodyParts.json`; 6 radar metrics unlinked to the muscle model | Stable snake_case enums (muscle group, movement pattern, dimension, equipment) + relational leaf↔exercise↔muscle↔dimension links via `MeasurementId` (§6.3, §6.5) | **High** |
| **AI coach** | `coachReply()` — regex over ~6 hard-coded paragraphs with fixed numbers; no data read (`src/coach.ts`) | Deferred (§7.3 P4). Must be *replaced*, not extended; it reads nothing real today | **Deferred** — but do not ship its numbers as if real |
| **Onboarding / benchmark** | None | Modular, untimed, partial benchmark library; first-score flow with coverage indicator + MIN_HEADLINE_LEAVES rule + missing-covariate fallback (§4) | **High** |

**AI-readiness implication of the current shape:** the persisted doc intermixes formatted display strings (`ratio: "1.2× BW"`, hex `diffColor`, `pct: "81st"`) with the numbers they encode. This violates the RAW+DERIVED separation (req. 1, §6.1) and the explicit-units rule (req. 8): an LLM cannot re-derive from `"1.2× BW"`, and `pct: "81st"` carries no provenance or confidence (req. 4). **Flag:** the v3 schema migration (below) must split every such field into a typed raw measurement + a derived/display projection — display strings are computed at render time, never persisted as the source of truth.

### 7.2 The migration bridge — `DATA_VERSION` 2 → 3

The existing `migrate()`/`reconcile()` pipeline is the chosen vehicle; it has already proven the pattern (v1→v2 stripped fabricated demo activity while preserving real data). The bridge to the target architecture is a **single additive v3 migration** that introduces the normalized schema (§6) *alongside* the legacy display fields, then deprecates the latter.

- **v3 adds, never destroys real user data.** New top-level keys — `biometric` (§6.7), `sessions` (per-set, timestamped; §6.4), composition/bodyweight time-series, `capabilityScores` (§6.6), `consistency` (§2.7), `recalibrations` (§2.8), and score `history`/`attributions` — are merged onto the existing doc by `reconcile()`. Legacy `muscles[].score/best/ratio/pct/trend`, `metrics`, and `profile.weeklyVolume` are retained read-only during transition (as the §6.8 `projection`) so the current UI keeps rendering.
- **Legacy hand-authored muscle scores are DROPPED as scores, not imported (contradiction resolved).** Because OQ-10 is now resolved (Decision #18: seeded Body-Assessment scores start empty like activity) and untested leaves must be `null` (§2.5), the migration does **not** carry the prototype's hand-authored 0–100 muscle numbers into `capabilityScores` as if they were measured or seed data. Every leaf with **no logged sets behind it** is initialized `state: "untested"` with `percentileRaw: null` and `confidence: null` — there is no double-tagging. The legacy numbers survive only inside the non-authoritative `projection.muscles` block (for transitional rendering) and are never read by the scoring engine. The migration **never manufactures a percentile or a confidence for an untested leaf.**
- **The only data that produces a v3 score is real logged data.** Once per-set logging (P0) is live, real sets flow through the §4.3 inference engine to produce `inferred-strength` capability scores with honest confidence; nothing in the migration fabricates a starting score.
- **Provenance on any migrated real datum (req. 4, req. 5).** If a user already had real composition/bodyweight (none exists in the current prototype, but defensively): carried in with its true `source` + `confidence`. Untested stays untested.
- **Existing flush/debounce guarantees carry over** unchanged — no new persistence engineering is required, which is why "Critical" gaps above are concentrated in *modeling*, not *plumbing*.

Because OQ-10 is closed before P0, the migration is now fully specifiable and P0's "schema migration first" ordering (§7.3) is unblocked.

### 7.3 Phased roadmap (sequenced for the cold-start reality)

The governing constraint is **cold-start data**: build-relative percentiles are only credible once seeded population curves exist, and per-leaf strength conditioning on height launches low-confidence regardless (§5.3). The roadmap therefore front-loads *irrecoverable raw capture* and *honest plumbing*, and defers anything that would force us to fake a distribution.

| Phase | Theme | Ships | Why this order |
|---|---|---|---|
| **P0 — Foundation** | Capture the irrecoverable | v3 schema migration (OQ-10 resolved → migration writable); per-set `LogSheet` (weight/reps/RPE/target-hit/rest + `MeasurementId`); ISO timestamps + `seq` on all events; `BuildProfile` entry + HealthKit/Google Fit passive ingestion + missing-covariate fallback (§4.5); contextual session snapshots (req. 6) | Per-set & timestamp data are **not recoverable retroactively**; nothing downstream works without them. Build covariates unblock everything build-relative. |
| **P1 — Honest scoring v1** | Real numbers, narrow scope | Seed population curves for the **highest-confidence leaves only** (major compound lifts via bridge model; `aerobic` running via WMA + VO2 base); two-step normalize→percentile engine (§2.2); per-leaf coverage/confidence (§2.4); capability-tree roll-up with `weights/1` + `CONF_FLOOR` replacing flat `peakScore()`; **always-visible data-source label** (§5.6) | Ship percentiles only where the curve is credible. Coverage-aware + confidence-floored headline means a sparse-but-honest profile is *valid* on day one. |
| **P2 — The assessment & the loop** | First-score hook + passive improvement | Modular untimed benchmark library; first-score onboarding with coverage indicator, MIN_HEADLINE_LEAVES rule & top-gaps (§4.5); inferred muscle-group strength (`infer/1`) from logged sets (§4.3); FFMI + BF%-band body-composition dimension with §3.6.1 floor guard (reject BMI; §3); `power`, `muscular_endurance`, and `anaerobic` performed dimensions where a credible seed exists; consistency track (`momentum/1`) from real streaks (§2.7); **`balance` ships low-confidence here or in P3** (thin norms, §5.4, OQ-15) | The benchmark is the product's first impression (§4); it needs P1's engine behind it. Inference loop makes the score sharpen with use. |
| **P3 — Motion & projection** | Make progress legible | Structured weekly-attributed movement (§2.6); gaps-as-time ETAs (`proj/1`, §2.6.1); celebrate-asymmetry surfacing; tier bands + percentile language; first-party data weighted into the curve via `blend/1`/K as it accumulates (§5.4); **`balance` hardened from low-confidence as data accrues** (OQ-15) | Requires P0's time-series + P1's percentiles. ETAs/trends are the retention wedge and the hand-off point to AI. |
| **P4 — AI layer (deferred)** | Signal-gated coaching | Goal-driven programs, mid-set overload, gap analysis, plateau detection — built on the export-ready context document (req. 10, §6.9), writing only provenance-stamped `ai-suggested` intent | Deferred by decision; unlocked *for free* if P0–P3 honor the AI-readiness contract. No AI work proceeds until the data carries provenance/confidence/links/units. |

**`agility` is deferred to v2 / P-later.** Per Decision #20 and OQ-15, `agility` (Agility & Coordination) has the sparsest population norms and lowest launch confidence; it does **not** ship in P0–P3. It is targeted for **v2 (a post-P3 / P-later phase)**, gated on adequate seed + first-party data (OQ-15), and is carried in the taxonomy now (canonical enum, §6.3) so adding it later requires no migration.

**Free/paid boundary across phases:** P0–P2's logger + coverage-aware basic scoring stay free; the differentiated layer (full capability scoring depth, projections, AI) is the paid wedge (per §1.6). Do not paywall raw logging.

### 7.4 Decisions log (LOCKED — do not relitigate)

These are settled and constrain all downstream work:

1. **Capability over logging** — the product measures closeness to physical potential; every feature serves "how good am I?" / "how do I improve?" or is secondary (§1.1).
2. **Build-relative percentiles are the moat** — capability is always an empirical percentile *conditioned on build*, never raw across mixed builds (§1.5, §2.2).
3. **Immutable-build normalization** — the reference frame contains ONLY sex, height, age (limb proportions → v2). Mutable attributes are never in the normalizer (§3.1).
4. **Bodyweight is excluded from the strength normalizer** — it is an input only (load suggestions, composition dimension via lean mass); strength conditions on frame, not bodyweight (§3.2).
5. **Two-step method per category** — normalize (height-conditioned strength via the bridge model, allometric ~mass^2/3, VO2 ml/kg/min, WMA age-grading, ROM norms) → empirical percentile stratified by covariate. Method chosen *before* a category ships. **Wilks/DOTS/Symmetric Strength are bodyweight-based and are explicitly NOT part of the normalize step — they are a secondary cross-check/display readout only** (§3.2, §5.3, OQ-9). (This corrects the earlier "Wilks/DOTS context" phrasing, which wrongly implied they were in the normalizer.)
6. **"Peak" = top 5% for your build**, capped per leaf at `cappedPercentile = min(percentileRaw, 0.95)` → diminishing returns at the elite end → raising your weakest tested leaf is always the most efficient path up; tier is read from uncapped `percentileRaw` (§2.3).
7. **Coverage-aware, never punitive** — headline is a coverage-weighted, **confidence-floored** aggregate, not a flat mean; missing categories are absent with a confidence band, **never scored 0**; the `CONF_FLOOR` rule prevents cold-start dimensions from suppressing specialists (§2.5, §2.6, §4.4).
8. **Wellroundedness is a lens, not a gate**; asymmetry is opportunity, never a deduction (§2.3).
9. **No public leaderboards, ever** — private bell-curve positioning, named tiers + percentile, only competitor is past self (§5.1).
10. **Don't fabricate data** — seed the curve from real, labeled population data; user activity (feed/streak/volume) starts empty and is earned on-device (enforced via v1→v2 migration; §4.5).
11. **Body composition uses FFMI + BF%-band, never BMI**; FFMI conditioned on sex+age only (height already in the metric); ideal weight is a muscle-aware target with a healthy floor; mass-relative leaves carry the §3.6.1 floor guard so no dimension rewards sub-floor leanness (§3.3, §3.4, §3.6, §3.6.1).
12. **Infer muscle-group strength from logged sets** via the `infer/1` engine (per-set Epley est-1RM × enum-keyed `muscleWeights` × quality × recency); never require isolation max tests (§4.3).
13. **Modular, untimed, partial benchmark**; sparse timestamped percentile sets; coverage raises confidence but never gates the score (§4.1).
14. **Rich per-set logging from day one** (weight, reps, RPE, target-hit, rest), each a `MeasurementId`-bearing raw event with append-only derived lineage (§6.4).
15. **AI is a deferred layer**, but ALL data decisions are made AI-ready now (the 10-requirement contract, §6.1); AI-written intent carries `ai-suggested` provenance (§6.9).
16. **Local-first / on-device**, serializable/exportable; real user data is never wiped; `exportContext()` includes consistency, recalibration events, methodology notes, structured attribution, and `muscleWeights` (§6.9).
17. **Shippable, mobile-first, freemium** — free logger genuinely good; paid holds scoring depth + AI + projections (§1.6).
18. **Body Assessment scores & Goals start empty, like activity** (resolves former OQ-10) — no seeded muscle scores are carried in as scores; untested leaves are `null` until real logged data produces them (§4.5, §7.2).
19. **One canonical representation for the scoring fields** — percentiles are `[0,1]`; `percentileRaw` (uncapped) is canonical with `cappedPercentile` derived; tier from uncapped; one snake_case dimension/leaf-id namespace (`DimensionId ∈ { strength, power, muscular_endurance, aerobic, anaerobic, mobility, balance, agility, body_composition, consistency }`, Decision #20); consistency is momentum scored on its own track; mobility/balance/agility are their own capability dimensions (Canonical conventions; §2.1, §2.3, §2.7).
20. **Expanded capability dimension taxonomy ratified** — the dimension set is the 8 performed quality dimensions (`strength`/Maximal Strength, `power`/Power & Explosiveness, `muscular_endurance`/Muscular Endurance, `aerobic`/Aerobic Endurance, `anaerobic`/Anaerobic Capacity, `mobility`/Mobility & Flexibility, `balance`/Balance & Stability, `agility`/Agility & Coordination) **plus** `body_composition` (special-scored, FFMI + BF% band, §3) **plus** `consistency` (momentum, own track, §2.7). The headline aggregates the **9 performed dimensions** (the 8 + `body_composition`); `consistency` stays separate. The former `cardio`/`endurance` IDs are **removed and replaced by `aerobic` + `anaerobic`** (an energy-system split), and `strength` keeps its ID but displays as "Maximal Strength". **A dimension earns a top-level slot only if it is a distinct trainable quality measurable via a defined test/proxy** — `balance` and `agility` qualify but launch low-confidence (thin/sparse norms; agility likely v2), and anything failing this bar stays low-confidence or deferred to v2 rather than being a headline dimension (§1.2, §2.1, §2.6, §6.3).

### 7.5 Open questions (UNRESOLVED — surface, do not silently assume)

| # | Question | Current lean | Blocks |
|---|---|---|---|
| OQ-1 | **Race as a build covariate** | **Against** — poor proxy, non-representative seed data, trust/PR risk; if ever included, optional & never required. **Not finalized.** | Covariate stratification design (§5.2) |
| OQ-2 | **Headline-score meaning** — per-leaf "Peak" badges + coverage-weighted, confidence-floored aggregate of capped percentiles | Largely resolved (§2.6); **confirm with user before treating as final** | P1 roll-up implementation |
| OQ-3 | **Exact per-category benchmark protocols** — which specific test(s) represent each category, now spanning the **larger expanded set** (strength, power, muscular_endurance, aerobic, anaerobic, mobility, balance, agility, body_composition; Decision #20) | Structure decided (modular/partial/untimed, §4.1); per-category protocols undecided across all performed dimensions | Each leaf is blocked until its protocol + normalization method are chosen (Decision #5) |
| OQ-4 | **App name** | Working title "Peak" (repo name); **not locked** | Branding, store listing |
| OQ-5 | **Tier-naming scheme** — Bronze→Peak vs D→S-tier | Undecided (bands themselves are fixed; §2.3, §5.1) | Score UI copy, P1 |
| OQ-6 | **Stack** — native vs cross-platform | Mobile-first is **fixed**; stack is not. Current prototype is React+TS via Vite + Tauri | Long-term platform commitment |
| OQ-7 | **Cross-dimension correlation (`xdim/2`)** for the composite/headline | `xdim/1` = independence (no covariance term, §2.6); a real covariance model needs first-party multi-dimension data. **The core methodology challenge.** | Trustworthiness of any *blended* headline beyond the conservative default |
| OQ-8 | **Composition measurement ladder calibration** — the strength-inference prior (1.4× BW bench ⇒ muscular) needs first-party calibration data | Ladder decided (§3.5); prior coefficients need data | Confidence weighting on the composition dimension |
| OQ-9 | **Height-conditioned strength sourcing & fitted constants** — the bridge *method* is specified (allometric `b=2/3`, NHANES integration, §5.3) but the fitted exponent/integration must be validated against direct height-performance + first-party data | Build height-conditioned distributions; early leaves low-confidence; refine `b` with data | Credibility of every strength leaf at P1 |
| OQ-11 | **Frame/limb proportions as covariates** | Deferred to **v2**, estimated empirically from first-party data — not guessed (§3.1, §5.2) | Residual-effect estimation (post-P3) |
| OQ-12 | **Per-leaf `staleAfterDays` defaults** — the recency horizon driving staleness + confidence decay (§2.4) | Method fixed (half-life decay); per-family defaults (strength/inferred shorter, composition longer) need tuning | Re-test prompt cadence; confidence calibration (P1/P2) |
| OQ-13 | **`dimWeight`/`subCatWeight`/`CONF_FLOOR` tuning** — v1 values are set (§2.6, `weights/1`) but should be validated against real profiles | v1 values shipped as defaults; tune with first-party data | Headline calibration; `weights/2` |
| OQ-14 | **Projection curve family** — `proj/1` uses linear-fit + plateau guard (§2.6.1); near-ceiling leaves may want an exponential-plateau model | Linear default decided; exponential variant deferred | ETA accuracy near the cap (P3) |
| OQ-15 | **Balance & agility population-norm sourcing + launch confidence** (expanded taxonomy, Decision #20) — published `balance` norms are thin and `agility` norms are sparsest (§5.4); both launch low-confidence and `agility` is **likely deferred to v2**. When does each ship, and what minimum seed/first-party n is required before showing a percentile vs an unconditioned trend? | Both launch low-confidence (small K, §5.4); `agility` timing leans v2; **sourcing + go-live thresholds undecided** | `balance` go-live (P2/P3 low-confidence); `agility` go-live (v2 / P-later); credibility of these leaves |

### 7.6 Risks (candid)

- **Cold-start credibility (highest risk).** A "how good am I?" product lives or dies on the curve feeling *real*. Seeded population data covers the high-confidence leaves but is thin and siloed elsewhere (OQ-7, OQ-9; §5.3). Serious users will smell a fake distribution instantly. **Mitigation:** ship percentiles only where the seed is credible (P1 scope discipline), label the data source on every percentile incl. the NHANES DEXA vintage caveat (§5.6), and lean on per-leaf confidence bands rather than over-claiming coverage. Methodology transparency is the differentiator that turns this risk into trust.
- **Height-conditioned strength launches low-confidence.** The off-the-shelf standards normalize by the exact attribute (bodyweight) we exclude. Early strength leaves will be coarse. **Mitigation:** the per-leaf confidence system (§2.4, §4.4) absorbs this; the `CONF_FLOOR` rule (§2.6) prevents it from suppressing specialists; first-party data sharpens it over time via a small K (§5.4).
- **Irrecoverable-data window.** Every day P0 ships late is a day of per-set/timestamp data never captured. **Mitigation:** P0 is non-negotiable first; the schema migration is additive, reuses proven plumbing, and is now fully writable (OQ-10 resolved; §7.2).
- **Display-coupled legacy schema leaking into the AI-ready model.** If v3 keeps persisting formatted strings as source-of-truth, the AI layer (P4) inherits un-analyzable data and a second migration. **Mitigation:** enforce RAW+DERIVED separation at the v3 boundary (§6.1, §7.1 flag); display strings are render-time projections only.
- **The canned coach masquerading as real.** `coach.ts` emits fixed numbers ("stamina sits at 68") with no data read. **Mitigation:** treat it as a non-shipping placeholder; gate any AI surface on real signal (Decision #15), and do not surface its hard-coded numbers in production copy.
- **Correlation assumption for a blended headline (OQ-7).** Any cross-dimension composite rests on an assumption the siloed data can't validate. **Mitigation:** `xdim/1` is the conservative independence default (§2.6), stamped and exported; prefer per-leaf/per-dimension honesty over an over-confident blended number; document and surface any future covariance model (§5.6) rather than hide it.
- **Rewarding dangerous leanness (resolved, monitored).** Mass-relative leaves could reward dropping below the essential-fat floor. **Mitigation:** the §3.6.1 floor guard removes the score incentive below the floor across all dimensions; monitor that the guard's floor values stay current with ACSM guidance.

---

## Glossary

- **Peak Score** — the single headline metric: a build-relative, coverage-weighted, confidence-floored aggregate of capped leaf percentiles across the 9 performed capability dimensions (Maximal Strength, Power & Explosiveness, Muscular Endurance, Aerobic Endurance, Anaerobic Capacity, Mobility & Flexibility, Balance & Stability, Agility & Coordination, Body Composition). The north-star; presented at two altitudes alongside a Peak-badge count and the consistency/momentum track. Rendered only once MIN_HEADLINE_LEAVES is met (§1.2, §2.6).
- **Peak tier** — a named percentile *band* on the build-conditioned distribution, derived from the **uncapped** `percentileRaw`: `foundation` → `developing` → `proficient` → `advanced` → `elite` → `peak`. Bands are half-open lower-inclusive `[lo, hi)`; the 95th-percentile threshold is fixed; display *names* are open (§2.3, §5.1, OQ-5).
- **Peak / Peak badge** — the achievable ceiling = **top ~5% for your build** (`percentileRaw ≥ 0.95`), *not* literal #1. Each leaf caps its headline *contribution* at this threshold (`cappedPercentile`); earning it grants a per-leaf Peak badge while the leaf stays tier `peak` (§2.3, §2.6).
- **percentileRaw / cappedPercentile** — the canonical pair. `percentileRaw ∈ [0,1]` is the uncapped truth (and the source for tiering); `cappedPercentile = min(percentileRaw, 0.95)` is the derived value used in headline aggregation. There is no bare `percentile` field, and the scale is always `[0,1]` (Canonical conventions; §2.2, §2.3).
- **Capability tree** — the four-level structure Headline → Dimension → Sub-category → Leaf; every edge is a stable relational link the AI can traverse in either direction (§2.1, §6.5).
- **Leaf** — the atomic unit of capability and the *only* level carrying a measured/inferred percentile. `direct` (benchmark/logged performance maps straight to it) or `inferred` (derived from logged sets, e.g. per-muscle strength). Everything above a leaf is a rollup (§2.1).
- **Dimension** — a top-level capability category. The 9 **performed** dimensions (each carrying capability leaves that roll into the headline) are `strength` (Maximal Strength), `power` (Power & Explosiveness), `muscular_endurance` (Muscular Endurance), `aerobic` (Aerobic Endurance), `anaerobic` (Anaerobic Capacity), `mobility` (Mobility & Flexibility), `balance` (Balance & Stability), `agility` (Agility & Coordination), and `body_composition` (Body Composition); plus `consistency` (Consistency — momentum, no capability leaves, own track). The `aerobic`/`anaerobic` split is by energy system — sustained aerobic output vs short maximal-effort output — and `muscular_endurance` is reps/time to local fatigue; this energy-system split replaces the former `cardio`/`endurance` pair (Decision #20; §2.1, §6.3).
- **Maximal Strength (`strength`)** — the largest capability surface: per-muscle-group strength (inferred from logged sets via `infer/1`) plus benchmark lifts (`strength.bench_1rm`, `.squat_1rm`, `.deadlift_1rm`), normalized by `height_conditioned_strength` (the bridge model, §5.3) (§2.1, §2.2, §4.3).
- **Power & Explosiveness (`power`)** — rate-of-force output: vertical/broad jump and medicine-ball throw, normalized by `power_norm` (jump height/throw distance vs sex+age+height; jump height is build-relative). Mass-relative leaves carry the §3.6.1 floor guard (§2.1, §2.2).
- **Muscular Endurance (`muscular_endurance`)** — reps/time to local muscular fatigue (`pushups_max`, `pullups_max`, `plank`, `squats_bw`), normalized by `musc_endurance_norm` vs age/sex norms; distinct from whole-body aerobic capacity. Mass-relative → §3.6.1 guard (§2.1, §2.2).
- **Aerobic Endurance (`aerobic`)** — sustained aerobic output: age-graded running (`aerobic.5k`, `aerobic.mile`, `wma_age_grade`) and aerobic base (`aerobic.vo2_proxy`, `aerobic.hr_recovery`, `vo2_relative`). Mass-relative → §3.6.1 guard. Replaces the former `cardio` dimension's timed-output role and the former `endurance` dimension's aerobic-base role (§2.1, §2.2).
- **Anaerobic Capacity (`anaerobic`)** — short maximal-effort output: sprints, sprint repeats, and power-endurance (`anaerobic.400m`, `sprint_repeats`, `max_effort_60s`), normalized by `anaerobic_norm` vs age/sex norms. Mass-relative → §3.6.1 guard (§2.1, §2.2).
- **Balance & Stability (`balance`)** — postural/dynamic stability (`balance.single_leg_eyes_closed`, `balance.y_balance`), normalized by `balance_norm` (time/reach vs age/sex). **Launches low-confidence** — population norms are thin (§5.4, OQ-15) (§2.1, §2.2).
- **Agility & Coordination (`agility`)** — change-of-direction and coordination (`agility.5_10_5`, `agility.t_test`), normalized by `agility_norm` (time vs age/sex). **Lowest confidence; deferred to v2** (sparsest norms; §5.4, §7.3, OQ-15) (§2.1, §2.2).
- **Consistency track / momentum** — the tenth dimension (`consistency`), scored on its own `[0,1]` `momentum` scale (`momentum/1`) from streak + trailing-window activity + adherence; surfaced beside the headline, **never blended into the Peak Score** (§2.7).
- **Mobility (`mobility`, Mobility & Flexibility)** — its own top-level capability dimension with build-conditioned ROM percentile leaves (`mobility.hip`, `.shoulder`, `.ankle`, `.spine`) normalized by `rom_norm`; not a child of consistency (§2.1).
- **Immutable-build principle** — the foundational rule: the normalizer may condition **only** on attributes the user cannot/should not change (sex, height, age in v1; frame/limb proportions in v2). Mutable attributes are measured as dimensions or used as inputs, never baked into the reference frame (§3.1).
- **Normalizer (two-step method)** — Step 1 normalizes raw → build-neutral value conditioning only on immutable covariates; Step 2 looks that value up in a seeded, build-stratified empirical distribution to produce `percentileRaw`. Each leaf's normalizer method is chosen before the leaf ships (§2.2).
- **FFMI (Fat-Free Mass Index)** — `lean_mass_kg / (height_m)²`, "BMI for muscle"; the lean-mass primitive of body composition, percentiled on sex+age only (height already divided out — not conditioned on again). Natural drug-free ceiling ~25. Chosen over BMI, which cannot separate fat from muscle (§3.3).
- **Body-fat % band** — measured BF% scored against a *target band with a healthy floor* (not "leaner is always better"); the leanness primitive of body composition. Its numeric edges + essential floor are stored on the record (`BandDefinition`) so an AI can reason about where in the band a user sits (§3.3, §3.6, §3.7).
- **Healthy-floor guard** — for mass-relative leaves (VO2, bodyweight-movement), performance below the essential-fat floor is normalized as if BF% were at the floor, so no dimension rewards dangerously low body fat; healthy leanness is still rewarded at face value (§3.6.1).
- **Cohort** — the set of similar-build people a normalized value is percentiled against, keyed *only* on immutable covariates (sex × height band × age band × schemaVersion). `CohortId` is a deterministic hash so rankings are reproducible; `unspecified` sex uses a sex-pooled distribution with reduced confidence (§5.2).
- **Coverage** — the fraction of *eligible* leaves that have been tested; reported *alongside* the score, never multiplied into it. Eligibility is build/equipment/capability-gated, so an injured user is not penalized for leaves they cannot perform (§2.6, §4.4).
- **Confidence** — a per-leaf (never global) weight in `[0,1]`, the **product** of distribution depth, measurement quality, recency (half-life decay on the leaf's `staleAfterDays`), and inference-chain length; drives the displayed band and down-weights soft leaves in the rollup, subject to `CONF_FLOOR`. `null` (not `0.0`) when untested (§2.4, §2.6, §4.4).
- **Provenance** — the labeled source of any datum: `measured` / `inferred-strength` / `inferred-related` / `seed-population` / `healthkit` / `user-stated` / `ai-suggested` / `untested`. Every value-about-the-user (incl. AI-authored intent) carries it, with confidence and (for inferred/derived) a `modelVersion` (§6.1, §6.2).
- **Untested vs. zero** — a hard invariant: an unmeasured leaf is `untested` with `percentileRaw = null`, `cappedPercentile = null`, `tier = null`, and `confidence = null` (excluded from rollups), **never** scored as `0` or `0.0` (which means "measured zero" / "definitely no confidence"). Knowing what it doesn't know is the system's first job (§2.5, §4.4).
- **MeasurementId / Measurement** — the single stable join key on every raw, percentile-backing event (`SetRecord`, `CardioSetRecord`, `BenchmarkResult`, health reading). `Measurement` is the common interface those records satisfy, not a separate entity. Every `contributingSetIds`/`sourceMeasurementId`/`triggeringMeasurementIds` points at a `MeasurementId`, so the provenance graph is unbroken (§4, §5, §6.2).
- **Cold-start (height-conditioned strength)** — the core data problem: validated strength formulas (Wilks/IPF GL/DOTS/Symmetric Strength) are bodyweight-based and don't condition on height, so they're a cross-check only, never the normalizer. Peak builds its own height-conditioned distributions, with an explicit lowest-confidence bridge model (allometric `b=2/3` over NHANES height↔weight relationships) until first-party data accumulates (§5.3).
- **Seed → first-party blend** — every percentile is computed against the current blended distribution for the cohort; `firstPartyWeight = nObserved/(nObserved+K)` smoothly hands off from seeded population data to real users per cohort. K is per-dimension (`blend/1`): smaller where the seed is weakest (strength), larger where it is strong (composition); source always labeled (§5.4).
- **Attribution** — the structured record of weekly-attributed movement (`{ leafId, from/to percentile, headlineDelta, triggeringSessionId, triggeringMeasurementIds, window }`); the AI computes over it and the UI renders prose from it — never a free-text `cause` string (§2.6, §6.6).
- **Projection (`proj/1`)** — the versioned ETA method: trailing-window linear fit with a plateau guard (returns "no trend" within noise), a saturation flag near the 0.95 cap, an `insufficient_data` state under 4 points, and an ETA reported as a range, not a false-precision date (§2.6.1).
- **Cross-dimension correlation (`xdim/N`)** — the named, versioned, exported assumption for blending dimensions. `xdim/1` is the conservative independence default (no covariance term); a future `xdim/2` requires first-party multi-dimension data (§2.6, OQ-7).
- **Methodology transparency** — the third moat property: every percentile is drillable to its data source (incl. dataset vintage), provenance, confidence, blend K, and documented model assumptions, stored as first-class data (`MethodologyNote`) and exported to the AI, never hidden (§1.5, §5.6, §6.9).
- **Recalibration** — recomputing affected leaf percentiles (writing new timestamped rows, never mutating history) when the immutable frame's measured state changes (age band, height correction) or a normalizer/distribution version is bumped. `RecalibrationEvent`s are exported so the AI can interpret trajectory discontinuities (§2.8, §6.9).
- **Build snapshot / contextual snapshot** — the immutable covariates (sex, height, `birthDate` as the source of truth for age) plus contextual condition (bodyweight, BF%, FFMI, numeric band definition as *context only*, never normalizer inputs) captured at every session/benchmark/score-compute, so the AI can correlate composition change with performance change (§2.8, §4.5, §5.5, §6.7).
- **Per-set logging** — first-class raw capture of `weight, reps, RPE, restSec, targetHit` per set (Session → ExerciseEntry → SetRecord), each `MeasurementId`-keyed with append-only version-stamped derived est-1RM lineage, from day one; the irreplaceable, non-retrofittable fuel for inference, plateau detection, and adherence (§6.4).
- **Inference engine (`infer/1`)** — moat property #2: per-set Epley est-1RM × fixed enum-keyed `muscleWeights` attribution × RPE-quality × 28-day recency half-life, combined as a recency/quality-weighted top-K mean into `estStrength` per muscle group; `muscleWeights` and the model version are exported so inferred scores are re-derivable (§4.3, §6.9).
- **AI-readiness requirements (the 10)** — the data contract (raw+derived with preserved at-time lineage, timestamp+sequence, enum taxonomy, provenance+confidence incl. on AI intent, explicit nulls, contextual snapshots, stable IDs+`MeasurementId` links, self-describing+units, intent/targets, local-first+exportable) that all data decisions satisfy now so the deferred AI layer ships without a migration (§6.1).
- **`exportContext()` / AIContext** — the single deterministic, privacy-respecting serializer that produces the compact, unit/scale-tagged JSON context document the deferred AI consumes; includes capability scores, sessions, snapshots, the consistency track, recalibration events, methodology notes, structured attributions, and `muscleWeights`+model versions; strips rendering-only fields; ships no other-user data off-device (§2.9, §6.9).
