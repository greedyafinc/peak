// Peak — weekly routine plan status (§6.4). PURE / DETERMINISTIC given
// (plan, sessions, asOf). Derives the current-week agenda + adherence from the
// recurring 7-day plan and the honest Session history. Nothing is fabricated:
// a planned day is only "done" when a Session exists that calendar day or the
// user explicitly ticked it; a never-planned day stays a rest day.

import type { Session, WeeklyPlan, WeeklyPlanItem } from "../types";
import { pad2 } from "../units";

export type DayKind = "done" | "today" | "upcoming" | "missed" | "rest";

export type WeekDayStatus = {
  weekday: number;          // 0 = Mon … 6 = Sun
  dateKey: string;          // "YYYY-MM-DD" local
  dayShort: string;         // "Mon"
  dayLetter: string;        // "M"
  dateLabel: string;        // "Jun 8"
  items: WeeklyPlanItem[];
  isRest: boolean;
  isToday: boolean;
  isPast: boolean;          // calendar day strictly before today
  loggedSession: boolean;   // a real Session exists that day
  done: boolean;            // completed (logged that day or manually ticked)
  kind: DayKind;
};

export type WeekStatus = {
  days: WeekDayStatus[];
  hasPlan: boolean;
  planCount: number;        // planned (non-rest) days this week
  doneCount: number;        // completed planned days this week
  pct: number;              // doneCount / planCount, 0 when planCount is 0
  weekRangeLabel: string;   // "Jun 8 – 14"
  onPlanRate: number | null; // trailing-28d adherence [0,1], or null when nothing to rate
  todayIndex: number;       // 0..6 (Mon-based)
  todayItems: WeeklyPlanItem[];
};

const DOW_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A blank week (7 rest days) — the shape an unset plan renders against. */
export const EMPTY_WEEK_DAYS: WeeklyPlanItem[][] = [[], [], [], [], [], [], []];

/** Monday-based weekday index: Mon = 0 … Sun = 6. */
export function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

const dayKey = (d: Date): string => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** Local-midnight Date n days from the given date (DST-safe via the y/m/d ctor). */
function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

/** True when there is no plan, or every weekday is empty. */
export function planIsEmpty(plan: WeeklyPlan | null): boolean {
  return !plan || plan.days.every((d) => d.length === 0);
}

/**
 * Build the current-week agenda + adherence. `asOf` is "now"; the week is the
 * Monday→Sunday block containing it. Per-day status is derived from the recurring
 * plan and the real Session history (matched by local-day), with manual ticks
 * from `plan.completions` layered on top.
 */
export function computeWeekStatus(
  plan: WeeklyPlan | null,
  sessions: Session[],
  asOf: Date,
): WeekStatus {
  const today = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  const todayKey = dayKey(today);
  const todayIdx = mondayIndex(today);
  const monday = addDays(today, -todayIdx);

  const sessionDays = new Set(sessions.map((s) => s.localDay));
  const completions = new Set(plan?.completions ?? []);
  const days7 = plan?.days ?? EMPTY_WEEK_DAYS;

  const days: WeekDayStatus[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(monday, i);
    const dKey = dayKey(date);
    const items = days7[i] ?? [];
    const isRest = items.length === 0;
    const isToday = dKey === todayKey;
    const isPast = dKey < todayKey;
    const loggedSession = sessionDays.has(dKey);
    // "done" is earned: a real Session that day, or an explicit tick — but a tick
    // on a FUTURE day never counts (you can't complete a workout that hasn't
    // happened), so it can't inflate this week's progress.
    const done = !isRest && (loggedSession || (completions.has(dKey) && dKey <= todayKey));
    let kind: DayKind;
    if (isRest) kind = "rest";
    else if (done) kind = "done";
    else if (isToday) kind = "today";
    else if (isPast) kind = "missed";
    else kind = "upcoming";
    days.push({
      weekday: i,
      dateKey: dKey,
      dayShort: DOW_SHORT[i],
      dayLetter: DOW_SHORT[i][0],
      dateLabel: `${MONTHS[date.getMonth()]} ${date.getDate()}`,
      items,
      isRest,
      isToday,
      isPast,
      loggedSession,
      done,
      kind,
    });
  }

  const planned = days.filter((d) => !d.isRest);
  const planCount = planned.length;
  const doneCount = planned.filter((d) => d.done).length;
  const pct = planCount ? doneCount / planCount : 0;

  // Week range label, e.g. "Jun 8 – 14" (drop the trailing month when it matches).
  const startD = monday;
  const endD = addDays(monday, 6);
  const weekRangeLabel =
    startD.getMonth() === endD.getMonth()
      ? `${days[0].dateLabel} – ${endD.getDate()}`
      : `${days[0].dateLabel} – ${days[6].dateLabel}`;

  // Trailing-28d adherence: of the PAST planned weekdays since the plan was created
  // (and within the window), the fraction completed. Today (not yet over) is excluded
  // so an unfinished day never drags the rate down. null when there is nothing to rate.
  let onPlanRate: number | null = null;
  if (plan && !planIsEmpty(plan)) {
    const createdKey = plan.createdAt ? plan.createdAt.slice(0, 10) : "";
    let planned28 = 0;
    let done28 = 0;
    for (let back = 1; back <= 28; back++) {
      const d = addDays(today, -back);
      const k = dayKey(d);
      if (createdKey && k < createdKey) continue; // before the plan existed
      const idx = mondayIndex(d);
      if ((days7[idx] ?? []).length === 0) continue; // rest weekday — not planned
      planned28 += 1;
      if (sessionDays.has(k) || completions.has(k)) done28 += 1;
    }
    onPlanRate = planned28 > 0 ? done28 / planned28 : null;
  }

  return {
    days,
    hasPlan: !planIsEmpty(plan),
    planCount,
    doneCount,
    pct,
    weekRangeLabel,
    onPlanRate,
    todayIndex: todayIdx,
    todayItems: days[todayIdx].items,
  };
}
