// The shape of everything Peak knows about a user. One JSON document, persisted
// on-device (see storage.ts). Authored sample content seeds it on first run
// (see seed.ts); after that, every screen reads and writes this — nothing is
// hard-coded into the UI and nothing leaves the device.

export type Muscle = {
  id: string;
  name: string;
  score: number;
  lift: string;
  best: string;
  ratio: string;
  pct: string;
  trend: string;
  ex: string[];
};

export type Exercise = { name: string; detail: string; pr?: boolean };

export type WorkoutType = "Gym" | "Cardio" | "Sport" | "Mobility";

export type Stat = { v: string; k: string };

export type Workout = {
  id: string;
  title: string;
  type: WorkoutType;
  time: string;
  dur: string;
  sub: string;
  stats: Stat[];
  exercises?: Exercise[];
};

// One athleticism axis (the six-spoke radar + the labelled bars below it).
export type Metric = { label: string; abbr: string; val: number };

export type Drill = { name: string; focus: string; vol: string; diff: string; diffColor: string };

export type Goal = {
  id: string;
  name: string;
  cat: string;
  catColor: string;
  icon: string;
  eta: string;
  completed: number;
  milestones: string[];
  locked?: boolean;
};

export type LiveMetric = { label: string; note: string; val: string; color: string };

export type Gap = { id: string; title: string; dot: string; reason: string; workout: string; dur: string; tag: string };

export type ChatMsg = { role: "coach" | "me"; text: string };

export type StreakBar = { d: string; h: number; on: boolean };
// `lastLog` is the calendar day (local) of the most recent logged session, used
// to advance the day-streak at most once per day. null until the first session.
export type Streak = { count: number; weekDone: number; weekTarget: number; rate: number; lastLog?: string | null; bars: StreakBar[] };

export type AppData = {
  version: number;
  muscles: { front: Muscle[]; back: Muscle[] };
  metrics: Metric[];
  feed: Workout[];
  goals: Goal[];
  drills: Record<string, Drill[]>;
  liveMetrics: LiveMetric[];
  gaps: Gap[];
  streak: Streak;
  profile: { symmetry: number; weeklyVolume: number };
  chat: ChatMsg[];
  added: Record<string, boolean>;
};

// ── Derived values ─────────────────────────────────────────────────────────
// These are computed from the stored data rather than hard-coded, so editing a
// muscle score or logging a session immediately moves the headline numbers.

export function allMuscles(d: AppData): Muscle[] {
  return [...d.muscles.front, ...d.muscles.back];
}

const avg = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0);

/** Peak score = the rounded average of every muscle's strength score. */
export function peakScore(d: AppData): number {
  return Math.round(avg(allMuscles(d).map((m) => m.score)));
}

/** Front/back balance, expressed as a 0–100 symmetry percentage. */
export function symmetryPct(d: AppData): number {
  const f = avg(d.muscles.front.map((m) => m.score));
  const b = avg(d.muscles.back.map((m) => m.score));
  return Math.max(0, Math.min(100, Math.round(100 - Math.abs(f - b))));
}

/** Format a kg figure the way the tiles do: 28400 → "28.4k". */
export function formatVolume(kg: number): string {
  if (kg >= 1000) return (kg / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(Math.round(kg));
}

let _seq = 0;
/** A collision-resistant id for newly created records. Combines a per-session
 *  counter with wall-clock time and randomness so ids stay unique across reloads
 *  (these are used as React keys and as record lookup keys). */
export function newId(prefix: string): string {
  _seq += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${_seq.toString(36)}${rand}`;
}
