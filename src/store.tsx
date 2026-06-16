import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { load, loadSync, save, loadSyncAt, loadAt, saveAt, removeAt, ACTIVE_SESSION_KEY } from "./storage";
import { emptyPeakData, DATA_VERSION } from "./defaults";
import { ROUTINE_BY_ID } from "./data/routines";
import { weightToKg, kgToDisplay } from "./units";
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
  UnitSystem,
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
  RoutineDef,
  RoutineExercise,
} from "./types";
import type { ExerciseDetailSpec } from "./engine/exerciseDetail";

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
  startOpen: boolean;                // the "start a workout" chooser
  activeOpen: boolean;               // the full-screen live Gym session
  routineEditorOpen: boolean;        // the routine builder
  routineEditId: string | null;      // null = building a new routine
  exDetail: ExerciseDetailSpec | null;  // the full-screen exercise/effort detail (null = closed)
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
  startOpen: false,
  activeOpen: false,
  routineEditorOpen: false,
  routineEditId: null,
  exDetail: null,
};

// ── Live Gym session (in-progress; draft strings in the active display unit) ──
// This is NOT scored capability data — it persists under its own storage key and
// only becomes a real Session (committed via logSession) on "Finish". Weight/reps
// are kept as draft strings while editing (mirrors LogSheet), converted on finish.
export type LiveSet = {
  id: string;
  weight: string;            // draft, in the active display unit
  reps: string;
  rpe: string;
  done: boolean;             // explicit completion — gates commit + drives stats
  targetReps?: number | null;     // suggested rep-range high (placeholder hint)
  targetRepLow?: number | null;
};
export type LiveExercise = {
  id: string;
  exerciseId: string;
  sets: LiveSet[];
};
export type ActiveSession = {
  startedAt: string;         // ISO-8601 — drives the elapsed timer + duration
  title: string;
  routineId?: string;        // FK → RoutineDef.id when seeded from a routine
  exercises: LiveExercise[];
  restEndsAt?: number | null;  // epoch ms — rest-timer target; persisted so it
                               // survives minimize and never bleeds into a new session
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
  programId?: string;          // FK → RoutineDef.id when committed from a routine
};
export type GoalInput = { name: string; dimension: DimensionId; targetLeafId?: LeafId; targetPercentileRaw?: number };
export type RoutineDraft = { id?: string; name: string; focus?: string; exercises: RoutineExercise[] };

export type Derived = {
  headline: Headline;
  dimensions: DimensionRollup[];
  methodology: MethodologyNote[];
};

export type PeakStore = UIState & {
  data: PeakData;
  hydrated: boolean;
  derived: Derived;
  activeSession: ActiveSession | null;
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
  setUnitSystem: (sys: UnitSystem) => void;
  projectLeaf: (leafId: LeafId) => Projection;
  resetData: () => void;
  // ── Live Gym session ──
  startSession: (opts?: { routineId?: string; title?: string }) => void;
  addLiveExercises: (exerciseIds: string[]) => void;
  removeLiveExercise: (liExId: string) => void;
  replaceLiveExercise: (liExId: string, newExerciseId: string) => void;
  addLiveSet: (liExId: string) => void;
  removeLiveSet: (liExId: string, setId: string) => void;
  setLiveSetField: (liExId: string, setId: string, field: "weight" | "reps" | "rpe", v: string) => void;
  toggleLiveSetDone: (liExId: string, setId: string) => void;
  setRest: (endsAtMs: number | null) => void;
  setActiveTitle: (title: string) => void;
  finishSession: () => void;
  discardSession: () => void;
  saveAsRoutine: (name: string) => void;
  removeRoutine: (id: string) => void;
  upsertRoutine: (draft: RoutineDraft) => void;
  duplicateRoutine: (source: RoutineDef) => void;
  openRoutineEditor: (id: string | null) => void;
  closeRoutineEditor: () => void;
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
  // Live Gym session — persisted under its own key so a reload mid-workout is safe.
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(() => loadSyncAt<ActiveSession>(ACTIVE_SESSION_KEY));
  const [activeHydrated, setActiveHydrated] = useState<boolean>(() => loadSyncAt<ActiveSession>(ACTIVE_SESSION_KEY) !== null || typeof window === "undefined");

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

  // Async-hydrate + debounced-persist the live session (native backend path).
  useEffect(() => {
    let alive = true;
    loadAt<ActiveSession>(ACTIVE_SESSION_KEY).then((a) => {
      if (!alive) return;
      if (a) setActiveSession(a);
      setActiveHydrated(true);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!activeHydrated) return;
    const id = setTimeout(() => {
      if (activeSession) void saveAt(ACTIVE_SESSION_KEY, activeSession);
      else void removeAt(ACTIVE_SESSION_KEY);
    }, 250);
    return () => clearTimeout(id);
  }, [activeSession, activeHydrated]);

  const dataRef = useRef(data); dataRef.current = data;
  const hydratedRef = useRef(hydrated); hydratedRef.current = hydrated;
  const activeRef = useRef(activeSession); activeRef.current = activeSession;
  const activeHydratedRef = useRef(activeHydrated); activeHydratedRef.current = activeHydrated;
  useEffect(() => {
    const flush = () => {
      if (hydratedRef.current) void save(dataRef.current);
      if (activeHydratedRef.current) {
        if (activeRef.current) void saveAt(ACTIVE_SESSION_KEY, activeRef.current);
        else void removeAt(ACTIVE_SESSION_KEY);
      }
    };
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
    const mutateActive = (fn: (a: ActiveSession) => ActiveSession) =>
      setActiveSession((a) => (a ? fn(a) : a));
    const newLiveSet = (low?: number | null, high?: number | null): LiveSet => ({
      id: uid("lset"), weight: "", reps: "", rpe: "", done: false,
      targetRepLow: low ?? null, targetReps: high ?? null,
    });
    const repsOf = (st: LiveSet): number => Math.floor(parseFloat(st.reps) || 0);

    // Commit the in-progress session to a real Session via logSession (shared by
    // the retrospective LogSheet and the live-session Finish action).
    const logSession = (input: LogSessionInput) => {
      update((d) => {
        if (!d.biometric) return d;
        const at = nowISO();
        const build = snapshotBuild(d.biometric.build, d.biometric.latestComposition, at);
        const entries: ExerciseEntry[] = (input.entries ?? []).map((e) => ({
          id: uid("entry"),
          exerciseId: e.exerciseId,
          sets: e.sets.map((st, i): SetRecord => ({
            id: uid("set"),
            seq: i,
            weight: st.weightKg != null ? { value: st.weightKg, unit: "kg" } : null,
            reps: st.reps,
            rpe: st.rpe ?? null,
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
          programId: input.programId,
          entries,
          cardio,
          durationMin: input.durationMin,
          notes: input.notes,
        };
        return { ...d, sessions: [session, ...d.sessions] };
      });
      set({ logOpen: false, tab: "log" });
    };

    return {
      ...ui,
      data,
      hydrated,
      derived,
      activeSession,
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

      logSession,

      // ── Live Gym session ───────────────────────────────────────────────────
      startSession: (opts) => {
        const at = nowISO();
        const routineId = opts?.routineId;
        let title = opts?.title?.trim() ?? "";
        let exercises: LiveExercise[] = [];
        if (routineId) {
          const r = ROUTINE_BY_ID[routineId] ?? dataRef.current.routines.find((x) => x.id === routineId);
          if (r) {
            title = title || r.name;
            exercises = r.exercises.map((re) => ({
              id: uid("lex"),
              exerciseId: re.exerciseId,
              sets: Array.from({ length: Math.max(1, re.sets) }, () => newLiveSet(re.repLow, re.repHigh)),
            }));
          }
        }
        setActiveSession({ startedAt: at, title, routineId, exercises, restEndsAt: null });
        set({ startOpen: false, activeOpen: true });
      },

      addLiveExercises: (ids) =>
        mutateActive((a) => ({
          ...a,
          exercises: [
            ...a.exercises,
            ...ids.map((eid) => ({ id: uid("lex"), exerciseId: eid, sets: [newLiveSet()] })),
          ],
        })),

      removeLiveExercise: (liExId) =>
        mutateActive((a) => ({ ...a, exercises: a.exercises.filter((ex) => ex.id !== liExId) })),

      replaceLiveExercise: (liExId, newExerciseId) =>
        mutateActive((a) => ({
          ...a,
          exercises: a.exercises.map((ex) =>
            ex.id === liExId
              // Keep the set scaffold; clear the load (it differs for the new
              // movement) and the completion flag so nothing false is committed.
              ? { ...ex, exerciseId: newExerciseId, sets: ex.sets.map((st) => ({ ...st, weight: "", done: false })) }
              : ex),
        })),

      addLiveSet: (liExId) =>
        mutateActive((a) => ({
          ...a,
          exercises: a.exercises.map((ex) => {
            if (ex.id !== liExId) return ex;
            const last = ex.sets[ex.sets.length - 1];
            return { ...ex, sets: [...ex.sets, newLiveSet(last?.targetRepLow, last?.targetReps)] };
          }),
        })),

      removeLiveSet: (liExId, setId) =>
        mutateActive((a) => ({
          ...a,
          exercises: a.exercises.map((ex) =>
            ex.id === liExId ? { ...ex, sets: ex.sets.filter((st) => st.id !== setId) } : ex),
        })),

      setLiveSetField: (liExId, setId, field, v) =>
        mutateActive((a) => ({
          ...a,
          exercises: a.exercises.map((ex) =>
            ex.id === liExId
              ? { ...ex, sets: ex.sets.map((st) => (st.id === setId ? { ...st, [field]: v } : st)) }
              : ex),
        })),

      toggleLiveSetDone: (liExId, setId) =>
        mutateActive((a) => ({
          ...a,
          exercises: a.exercises.map((ex) =>
            ex.id === liExId
              ? {
                  ...ex,
                  sets: ex.sets.map((st) => {
                    if (st.id !== setId) return st;
                    // A set can only be marked complete once it has real reps.
                    if (!st.done && repsOf(st) <= 0) return st;
                    return { ...st, done: !st.done };
                  }),
                }
              : ex),
        })),

      setRest: (endsAtMs) => mutateActive((a) => ({ ...a, restEndsAt: endsAtMs })),

      setActiveTitle: (title) => mutateActive((a) => ({ ...a, title })),

      finishSession: () => {
        if (!activeSession) return;
        const sys = dataRef.current.unitSystem;
        const entries: LogEntryInput[] = activeSession.exercises
          .map((ex) => ({
            exerciseId: ex.exerciseId,
            sets: ex.sets
              .filter((st) => st.done && repsOf(st) > 0)
              .map((st): LogSetInput => {
                const w = parseFloat(st.weight);
                const rpe = parseFloat(st.rpe);
                return {
                  weightKg: Number.isFinite(w) && w > 0 ? weightToKg(w, sys) : null,
                  reps: repsOf(st),
                  rpe: Number.isFinite(rpe) ? rpe : null,
                };
              }),
          }))
          .filter((e) => e.sets.length > 0);
        if (entries.length === 0) return;  // nothing committable (UI guards this)
        const elapsedMs = Date.now() - new Date(activeSession.startedAt).getTime();
        const durationMin = Math.max(1, Math.round(elapsedMs / 60000));
        logSession({
          type: "Gym",
          title: activeSession.title || undefined,
          entries,
          durationMin,
          programId: activeSession.routineId,
        });
        setActiveSession(null);
        set({ activeOpen: false, startOpen: false });
      },

      discardSession: () => {
        setActiveSession(null);
        set({ activeOpen: false });
      },

      saveAsRoutine: (name) => {
        if (!activeSession || activeSession.exercises.length === 0) return;
        const at = nowISO();
        const routine: RoutineDef = {
          id: uid("routine"),
          name: name.trim() || activeSession.title.trim() || "My Routine",
          builtIn: false,
          createdAt: at,
          exercises: activeSession.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            sets: Math.max(1, ex.sets.length),
          })),
        };
        update((d) => ({ ...d, routines: [routine, ...d.routines] }));
      },

      removeRoutine: (id) =>
        update((d) => ({ ...d, routines: d.routines.filter((r) => r.id !== id) })),

      // Create or replace a user routine (the routine builder's save).
      upsertRoutine: (draft) =>
        update((d) => {
          const id = draft.id ?? uid("routine");
          const existing = d.routines.find((r) => r.id === id);
          const routine: RoutineDef = {
            id,
            name: draft.name.trim() || "My Routine",
            focus: draft.focus?.trim() || undefined,
            exercises: draft.exercises,
            builtIn: false,
            createdAt: existing?.createdAt ?? nowISO(),
          };
          const routines = existing
            ? d.routines.map((r) => (r.id === id ? routine : r))
            : [routine, ...d.routines];
          return { ...d, routines };
        }),

      // Copy any routine (built-in or user) into the user's routines and open it for editing.
      duplicateRoutine: (source) => {
        const id = uid("routine");
        update((d) => ({
          ...d,
          routines: [
            { id, name: `${source.name} (copy)`, focus: source.focus, exercises: source.exercises.map((e) => ({ ...e })), builtIn: false, createdAt: nowISO() },
            ...d.routines,
          ],
        }));
        set({ startOpen: false, routineEditorOpen: true, routineEditId: id });
      },

      openRoutineEditor: (id) => set({ startOpen: false, routineEditorOpen: true, routineEditId: id }),
      closeRoutineEditor: () => set({ routineEditorOpen: false, routineEditId: null, startOpen: true }),

      addGoal: (g) => {
        update((d) => {
          const at = nowISO();
          const provenance: Provenance = { source: "user-stated", confidence: null, asOf: at, authoredBy: "user" };
          const goal: GoalV3 = {
            id: uid("goal"),
            name: g.name.trim() || "New Goal",
            dimension: g.dimension,
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

      setUnitSystem: (sys) => {
        const prev = dataRef.current.unitSystem;
        // A live session keeps draft weights as strings in the active display unit;
        // when the unit flips, re-express them so the physical load is preserved
        // (otherwise "100" kg would silently become "100" lb).
        if (prev !== sys) {
          setActiveSession((a) => {
            if (!a) return a;
            const conv = (w: string): string => {
              const n = parseFloat(w);
              if (!Number.isFinite(n)) return w;
              return String(kgToDisplay(weightToKg(n, prev), sys, 1));
            };
            return {
              ...a,
              exercises: a.exercises.map((ex) => ({
                ...ex,
                sets: ex.sets.map((st) => ({ ...st, weight: conv(st.weight) })),
              })),
            };
          });
        }
        update((d) => ({ ...d, unitSystem: sys }));
      },

      projectLeaf: (leafId) => {
        const ls = dataRef.current.leafScores[leafId];
        return project(ls?.history ?? []);
      },

      resetData: () => { setData(emptyPeakData()); setActiveSession(null); },
    };
  }, [ui, data, hydrated, derived, activeSession]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function usePeak(): PeakStore {
  const s = useContext(Ctx);
  if (!s) throw new Error("usePeak must be used within PeakProvider");
  return s;
}
