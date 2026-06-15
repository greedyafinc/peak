import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { load, loadSync, save } from "./storage";
import { emptyPeakData, DATA_VERSION } from "./defaults";
import {
  recomputeAll,
  getHeadlineAndDimensions,
  getMethodologyNotes,
  scoreBenchmark,
  cohortTuple,
  cohortKeyString,
  compositionSnapshotFrom,
  ageYearsFrom,
  project,
  type DimensionRollup,
} from "./engine";
import type {
  PeakData,
  BuildSnapshot,
  CompositionSnapshot,
  RawMeasurement,
  LeafId,
  DimensionId,
  Sex,
  WorkoutType,
  Session,
  ExerciseEntry,
  SetRecord,
  CardioSetRecord,
  Headline,
  GoalV3,
  Provenance,
  CompMethod,
  Projection,
  MethodologyNote,
} from "./types";

// ── Ephemeral view state (not persisted) ─────────────────────────────────────
export type Tab = "score" | "body" | "log" | "improve";
export type BodyView = "front" | "back";

export type UIState = {
  tab: Tab;
  bodyView: BodyView;
  selDimension: DimensionId | null;
  selLeaf: LeafId | null;
  selMuscle: string | null;          // SVG muscle key, for the body map
  logOpen: boolean;
  benchOpen: boolean;
  benchLeaf: LeafId | null;          // which benchmark the bench sheet is capturing
  goalOpen: boolean;
};

const INITIAL_UI: UIState = {
  tab: "score",
  bodyView: "front",
  selDimension: null,
  selLeaf: null,
  selMuscle: null,
  logOpen: false,
  benchOpen: false,
  benchLeaf: null,
  goalOpen: false,
};

// ── Action inputs ─────────────────────────────────────────────────────────────
export type OnboardInput = {
  sex: Sex;
  heightCm: number;
  birthDate: string;                 // ISO yyyy-mm-dd
  bodyweightKg?: number | null;
  bodyFatPct?: number | null;        // percent (e.g. 15)
  compMethod?: CompMethod;
  healthConnected?: boolean;
  benchmarks: { leafId: LeafId; raw: RawMeasurement }[];
};

export type LogSetInput = { weightKg?: number | null; reps: number; rpe?: number | null };
export type LogEntryInput = { exerciseId: string; sets: LogSetInput[] };
export type LogCardioInput = { distanceKm?: number | null; durationMin: number; avgHr?: number | null };
export type LogSessionInput = {
  type: WorkoutType;
  title?: string;
  entries?: LogEntryInput[];
  cardio?: LogCardioInput[];
  durationMin?: number;
  notes?: string;
};
export type GoalInput = { name: string; dimension: DimensionId; icon?: string; targetLeafId?: LeafId; targetPercentileRaw?: number };

export type Derived = {
  headline: Headline;
  dimensions: DimensionRollup[];
  methodology: MethodologyNote[];
};

export type PeakStore = UIState & {
  data: PeakData;
  hydrated: boolean;
  derived: Derived;
  set: (patch: Partial<UIState>) => void;
  go: (tab: Tab) => void;
  selectDimension: (id: DimensionId | null) => void;
  selectLeaf: (id: LeafId | null) => void;
  selectMuscle: (id: string | null) => void;
  completeOnboarding: (input: OnboardInput) => void;
  addBenchmark: (leafId: LeafId, raw: RawMeasurement) => void;
  logSession: (input: LogSessionInput) => void;
  addGoal: (g: GoalInput) => void;
  removeGoal: (id: string) => void;
  setEligibility: (leafId: LeafId, eligible: boolean) => void;
  projectLeaf: (leafId: LeafId) => Projection;
  resetData: () => void;
};

const nowISO = () => new Date().toISOString();
function localDayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
let _seq = 0;
function uid(prefix: string): string {
  _seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${_seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// Migrate / reconcile: this is a fresh v3 model, so any older/missing doc resets
// to an empty v3 document (the old v1 prototype lived under a different storage
// key, so no real user data is destroyed).
function reconcile(loaded: Partial<PeakData> | null): PeakData {
  const base = emptyPeakData();
  if (!loaded || (loaded.version ?? 0) < DATA_VERSION || !loaded.schema) return base;
  return { ...base, ...loaded } as PeakData;
}

// Build the immutable BuildSnapshot from stored covariates, refreshing the derived
// ageYears + capturedAt at the moment of capture (birthDate is the source of truth).
function snapshotBuild(build: BuildSnapshot, comp: CompositionSnapshot | null, at: string): BuildSnapshot {
  return {
    ...build,
    ageYears: ageYearsFrom(build.birthDate, at),
    bodyweightKg: comp?.bodyweight?.value ?? build.bodyweightKg,
    bodyFatPct: comp?.bodyFatPct?.value ?? build.bodyFatPct,
    ffmi: comp?.ffmi?.value ?? build.ffmi,
    capturedAt: at,
  };
}

const Ctx = createContext<PeakStore | null>(null);

export function PeakProvider({ children }: { children: ReactNode }) {
  const [ui, setUI] = useState<UIState>(INITIAL_UI);
  // Recompute on load so derived scores always reflect the CURRENT shipped reference
  // data (distributions/weights can change between app versions; §5.7 recompute).
  const [data, setData] = useState<PeakData>(() => recomputeAll(reconcile(loadSync<PeakData>()), nowISO()));
  const [hydrated, setHydrated] = useState<boolean>(() => loadSync<PeakData>() !== null || typeof window === "undefined");

  useEffect(() => {
    let alive = true;
    load<PeakData>().then((loaded) => {
      if (!alive) return;
      if (loaded) setData(recomputeAll(reconcile(loaded), nowISO()));
      setHydrated(true);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const id = setTimeout(() => void save(data), 250);
    return () => clearTimeout(id);
  }, [data, hydrated]);

  const dataRef = useRef(data); dataRef.current = data;
  const hydratedRef = useRef(hydrated); hydratedRef.current = hydrated;
  useEffect(() => {
    const flush = () => { if (hydratedRef.current) void save(dataRef.current); };
    const onVis = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Recompute scores from the raw store after every data mutation.
  const derived = useMemo<Derived>(() => {
    const hd = getHeadlineAndDimensions(data);
    return { headline: hd.headline, dimensions: hd.dimensions, methodology: getMethodologyNotes(data) };
  }, [data]);

  const store = useMemo<PeakStore>(() => {
    const set = (patch: Partial<UIState>) => setUI((s) => ({ ...s, ...patch }));
    const update = (fn: (d: PeakData) => PeakData) => setData((d) => recomputeAll(fn(d), nowISO()));

    return {
      ...ui,
      data,
      hydrated,
      derived,
      set,
      go: (tab) => set({ tab }),
      selectDimension: (id) => set({ selDimension: id }),
      selectLeaf: (id) => set({ selLeaf: id }),
      selectMuscle: (id) => set({ selMuscle: id }),

      completeOnboarding: (input) => {
        const at = nowISO();
        const build: BuildSnapshot = {
          sex: input.sex,
          heightCm: input.heightCm,
          birthDate: input.birthDate,
          ageYears: ageYearsFrom(input.birthDate, at),
          bodyweightKg: input.bodyweightKg ?? null,
          bodyFatPct: input.bodyFatPct ?? null,
          ffmi: null,
          capturedAt: at,
          source: input.healthConnected ? "healthkit" : "user-stated",
        };
        const comp: CompositionSnapshot | null =
          input.bodyweightKg != null
            ? compositionSnapshotFrom(input.bodyweightKg, input.bodyFatPct ?? null, build, {
                asOf: at,
                method: input.bodyFatPct != null ? (input.compMethod ?? "bia") : "none",
              })
            : null;
        const tuple = cohortTuple(build);
        const benchmarkResults = input.benchmarks.map((b) => scoreBenchmark(b.leafId, b.raw, build, at));
        update((d) => ({
          ...d,
          onboarded: true,
          biometric: {
            build,
            latestComposition: comp,
            healthSources: { healthKit: !!input.healthConnected, googleFit: false },
            cohort: tuple,
            cohortKey: cohortKeyString(build),
          },
          benchmarkResults: [...d.benchmarkResults, ...benchmarkResults],
        }));
        set({ tab: "score" });
      },

      addBenchmark: (leafId, raw) => {
        update((d) => {
          if (!d.biometric) return d;
          const result = scoreBenchmark(leafId, raw, d.biometric.build, nowISO());
          return { ...d, benchmarkResults: [...d.benchmarkResults, result] };
        });
        set({ benchOpen: false, benchLeaf: null });
      },

      logSession: (input) => {
        update((d) => {
          if (!d.biometric) return d;
          const at = nowISO();
          const build = snapshotBuild(d.biometric.build, d.biometric.latestComposition, at);
          const entries: ExerciseEntry[] = (input.entries ?? []).map((e) => ({
            id: uid("entry"),
            exerciseId: e.exerciseId,
            sets: e.sets.map((s, i): SetRecord => ({
              id: uid("set"),
              seq: i,
              weight: s.weightKg != null ? { value: s.weightKg, unit: "kg" } : null,
              reps: s.reps,
              rpe: s.rpe ?? null,
              restSec: null,
              targetHit: null,
            })),
          }));
          const cardio: CardioSetRecord[] | undefined = input.cardio?.map((c, i) => ({
            id: uid("cardio"),
            seq: i,
            distance: c.distanceKm != null ? { value: c.distanceKm, unit: "km" } : null,
            duration: { value: c.durationMin, unit: "min" },
            avgHr: c.avgHr != null ? { value: c.avgHr, unit: "bpm" } : null,
            targetHit: null,
          }));
          const session: Session = {
            id: uid("session"),
            seq: (d.sessions[0]?.seq ?? 0) + 1,
            createdAt: at,
            localDay: localDayKey(),
            type: input.type,
            title: input.title?.trim() || `${input.type} Session`,
            build,
            composition: d.biometric.latestComposition,
            entries,
            cardio,
            durationMin: input.durationMin,
            notes: input.notes,
          };
          return { ...d, sessions: [session, ...d.sessions] };
        });
        set({ logOpen: false, tab: "log" });
      },

      addGoal: (g) => {
        update((d) => {
          const at = nowISO();
          const provenance: Provenance = { source: "user-stated", confidence: null, asOf: at, authoredBy: "user" };
          const goal: GoalV3 = {
            id: uid("goal"),
            name: g.name.trim() || "New Goal",
            dimension: g.dimension,
            icon: g.icon || "🎯",
            createdAt: at,
            target: g.targetLeafId
              ? { nodeId: g.targetLeafId, targetPercentileRaw: g.targetPercentileRaw }
              : undefined,
            provenance,
            projectionModel: "proj/1",
            state: "active",
          };
          return { ...d, goals: [...d.goals, goal] };
        });
        set({ goalOpen: false });
      },

      removeGoal: (id) => update((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) })),

      setEligibility: (leafId, eligible) =>
        update((d) => ({ ...d, eligibility: { ...d.eligibility, [leafId]: eligible } })),

      projectLeaf: (leafId) => {
        const ls = dataRef.current.leafScores[leafId];
        return project(ls?.history ?? []);
      },

      resetData: () => setData(emptyPeakData()),
    };
  }, [ui, data, hydrated, derived]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function usePeak(): PeakStore {
  const s = useContext(Ctx);
  if (!s) throw new Error("usePeak must be used within PeakProvider");
  return s;
}
