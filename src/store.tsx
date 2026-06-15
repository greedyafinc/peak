import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { coachReply } from "./coach";
import { DEFAULT_DATA, DATA_VERSION } from "./seed";
import { catColor } from "./theme";
import { load, loadSync, save } from "./storage";
import { newId, type AppData, type WorkoutType, type Stat } from "./model";

export type Tab = "feed" | "body" | "coach" | "goals";
export type BodyView = "front" | "back";
export type CoachTab = "chat" | "live" | "drills";

// Ephemeral view state — navigation, selections, in-flight input. Not persisted.
export type UIState = {
  tab: Tab;
  bodyView: BodyView;
  selMuscle: string | null;
  sheet: boolean;
  coachTab: CoachTab;
  sport: string;
  filter: string;
  draft: string;
  thinking: boolean;
  logType: WorkoutType | null; // non-null ⇒ the Log Session modal is open for that type
  goalOpen: boolean; // the New Goal modal
};

export type LogInput = { type: WorkoutType; title: string; sub: string; dur: string; stats: Stat[]; volumeKg?: number };
export type GoalInput = { name: string; cat: string; icon: string; milestones: string[] };

export type PeakStore = UIState & {
  data: AppData;
  hydrated: boolean;
  set: (patch: Partial<UIState>) => void;
  go: (tab: Tab) => void;
  selectMuscle: (id: string) => void;
  toggleAdded: (id: string) => void;
  send: () => void;
  quick: (label: string) => void;
  resetChat: () => void;
  bumpMuscle: (view: BodyView, id: string, delta: number) => void;
  setGoalProgress: (goalId: string, completed: number) => void;
  addGoal: (g: GoalInput) => void;
  logWorkout: (w: LogInput) => void;
  resetData: () => void;
};

const INITIAL_UI: UIState = {
  tab: "body",
  bodyView: "front",
  selMuscle: "biceps",
  sheet: false,
  coachTab: "chat",
  sport: "Basketball",
  filter: "all",
  draft: "",
  thinking: false,
  logType: null,
  goalOpen: false,
};

const clone = (d: AppData): AppData => JSON.parse(JSON.stringify(d));

// Upgrade an already-persisted document to the current DATA_VERSION. Runs before
// reconcile, so it sees the raw stored doc. Each step only transforms what that
// version needs and is a no-op once the stored version has caught up.
function migrate(loaded: Partial<AppData>): Partial<AppData> {
  let d = loaded;
  // v1 → v2: v1 shipped a fabricated demo athlete's activity. Strip the activity
  // (the workout feed, the consistency streak, and accrued volume) so the only
  // activity ever shown is what the user logged. Body assessment, goals, drills,
  // etc. are preserved — they aren't activity.
  if ((d.version ?? 0) < 2) {
    d = {
      ...d,
      feed: [],
      streak: clone(DEFAULT_DATA).streak,
      profile: { ...DEFAULT_DATA.profile, ...(d.profile || {}), weeklyVolume: 0 },
    };
  }
  return { ...d, version: DATA_VERSION };
}

// Fold any persisted document onto the current defaults so fields added in
// later versions of the app always have a value. We merge onto a fresh clone so
// the result never aliases the DEFAULT_DATA seed constant.
function reconcile(loaded: Partial<AppData> | null): AppData {
  const base = clone(DEFAULT_DATA);
  if (!loaded) return base;
  const m = migrate(loaded);
  return {
    ...base,
    ...m,
    muscles: { ...base.muscles, ...(m.muscles || {}) },
    streak: { ...base.streak, ...(m.streak || {}) },
    profile: { ...base.profile, ...(m.profile || {}) },
    drills: { ...base.drills, ...(m.drills || {}) },
  };
}

function clockTime(): string {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

// A local calendar-day key (not a timestamp) so the streak advances once per day.
function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Day-based streak: same day ⇒ unchanged, the very next day ⇒ +1, any larger gap
// (or the first session ever) ⇒ restart at 1.
function nextStreakCount(prev: number, lastLog: string | null | undefined): number {
  const today = todayKey();
  if (lastLog === today) return prev || 1;
  const d = new Date();
  const yesterday = todayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
  return lastLog === yesterday ? prev + 1 : 1;
}

const Ctx = createContext<PeakStore | null>(null);

export function PeakProvider({ children }: { children: ReactNode }) {
  const [ui, setUI] = useState<UIState>(INITIAL_UI);
  // Seed the first render synchronously on web (no flash); native hydrates below.
  const [data, setData] = useState<AppData>(() => reconcile(loadSync<AppData>()));
  const [hydrated, setHydrated] = useState<boolean>(() => loadSync<AppData>() !== null || typeof window === "undefined");

  // Hydrate from the device, then begin persisting changes.
  useEffect(() => {
    let alive = true;
    load<AppData>().then((loaded) => {
      if (!alive) return;
      if (loaded) setData(reconcile(loaded));
      setHydrated(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Persist the whole document shortly after any change (coalesces bursts).
  useEffect(() => {
    if (!hydrated) return;
    const id = setTimeout(() => void save(data), 250);
    return () => clearTimeout(id);
  }, [data, hydrated]);

  // Latest values for async callbacks (the coach reply timer) and flush handlers.
  const dataRef = useRef(data);
  dataRef.current = data;
  const uiRef = useRef(ui);
  uiRef.current = ui;
  const hydratedRef = useRef(hydrated);
  hydratedRef.current = hydrated;

  // Durably flush the latest document when the app is backgrounded or closed, so
  // a change made within the debounce window isn't lost on quit / tab close /
  // app-to-background (mobile). Gated on hydration so we never write the seed
  // over real device data before the initial load resolves.
  useEffect(() => {
    const flush = () => {
      if (hydratedRef.current) void save(dataRef.current);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const store = useMemo<PeakStore>(() => {
    const set = (patch: Partial<UIState>) => setUI((s) => ({ ...s, ...patch }));
    const update = (fn: (d: AppData) => AppData) => setData((d) => fn(d));

    const sendText = (text: string) => {
      const t = text.trim();
      if (!t || uiRef.current.thinking) return;
      update((d) => ({ ...d, chat: [...d.chat, { role: "me", text: t }] }));
      set({ draft: "", thinking: true });
      setTimeout(() => {
        update((d) => ({ ...d, chat: [...d.chat, { role: "coach", text: coachReply(t) }] }));
        set({ thinking: false });
      }, 750);
    };

    return {
      ...ui,
      data,
      hydrated,
      set,
      go: (tab) => set({ tab }),
      selectMuscle: (id) => set({ selMuscle: id }),
      toggleAdded: (id) => update((d) => ({ ...d, added: { ...d.added, [id]: !d.added[id] } })),
      send: () => sendText(uiRef.current.draft),
      quick: (label) => sendText(label),
      // Resets the conversation back to the coach's opening message.
      resetChat: () => update((d) => ({ ...d, chat: DEFAULT_DATA.chat.map((m) => ({ ...m })) })),

      bumpMuscle: (view, id, delta) =>
        update((d) => {
          const list = d.muscles[view].map((m) =>
            m.id === id ? { ...m, score: Math.max(0, Math.min(100, m.score + delta)) } : m,
          );
          return { ...d, muscles: { ...d.muscles, [view]: list } };
        }),

      setGoalProgress: (goalId, completed) =>
        update((d) => ({
          ...d,
          goals: d.goals.map((g) =>
            g.id === goalId && !g.locked
              ? { ...g, completed: Math.max(0, Math.min(g.milestones.length, completed)) }
              : g,
          ),
        })),

      addGoal: (g) =>
        update((d) => ({
          ...d,
          goals: [
            ...d.goals,
            {
              id: newId("goal"),
              name: g.name.trim() || "New Goal",
              cat: g.cat,
              catColor: catColor(g.cat),
              icon: g.icon || "🎯",
              eta: "Just added",
              completed: 0,
              milestones: g.milestones.length ? g.milestones : ["Start", "Build", "Refine", "Achieve"],
            },
          ],
        })),

      logWorkout: (w) =>
        update((d) => {
          const workout = {
            id: newId("w"),
            title: w.title.trim() || `${w.type} Session`,
            type: w.type,
            time: clockTime(),
            dur: w.dur,
            sub: w.sub,
            stats: w.stats,
          };
          const today = todayKey();
          const firstToday = d.streak.lastLog !== today; // first session of a new day?
          const bars = d.streak.bars.slice();
          // A new active day lights the most recent empty bar; extra sessions the
          // same day don't double-count it.
          if (firstToday) {
            const idx = bars.map((b) => b.on).lastIndexOf(false);
            if (idx >= 0) bars[idx] = { ...bars[idx], on: true, h: 34 };
          }
          const weekDone = firstToday ? Math.min(d.streak.weekTarget, d.streak.weekDone + 1) : d.streak.weekDone;
          const rate = Math.min(100, Math.round((weekDone / d.streak.weekTarget) * 100));
          return {
            ...d,
            feed: [workout, ...d.feed],
            streak: {
              ...d.streak,
              count: nextStreakCount(d.streak.count, d.streak.lastLog),
              weekDone,
              rate,
              lastLog: today,
              bars,
            },
            // Volume accrues per session regardless of day.
            profile: { ...d.profile, weeklyVolume: d.profile.weeklyVolume + (w.volumeKg || 0) },
          };
        }),

      resetData: () => setData(clone(DEFAULT_DATA)),
    };
  }, [ui, data, hydrated]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function usePeak(): PeakStore {
  const s = useContext(Ctx);
  if (!s) throw new Error("usePeak must be used within PeakProvider");
  return s;
}
