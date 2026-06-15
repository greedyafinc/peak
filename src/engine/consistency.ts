// Peak scoring engine — consistency / momentum track (§2.7, momentum/1).
//
// Consistency is the tenth dimension but is MOMENTUM, not a capability percentile:
// it has no capability leaves and is NEVER blended into the Peak Score (§2.6). It
// is derived purely from Session.localDay history — nothing authored.
//
//   currentStreakDays   — consecutive active days up to asOf's local day
//   longestStreakDays   — longest run of consecutive active days ever
//   activeDaysTrailing28 — distinct active days in the trailing 28-day window
//   adherenceTrailing28  — completed/programmed in window; null if no program
//   momentum = wStreak·f(streak) + wActive·(active28/28)
//            + wAdherence·(adherence ?? active28/28),  f(s) = 1 − 0.5^(s/7)
//
// Empty sessions → all zeros, momentum 0 (never fabricated).
//
// PURE / DETERMINISTIC given (sessions, asOf).

import type { ConsistencyPoint, ConsistencyTrack, Session } from "../types";
import { MOMENTUM, MODELS } from "../constants";

/** Parse a "YYYY-MM-DD" local day to a UTC-midnight epoch-day integer. */
function dayNumber(localDay: string): number {
  const [y, m, d] = localDay.split("-").map((s) => parseInt(s, 10));
  return Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86_400_000);
}

/** asOf ISO → its local-day number (uses the instant's calendar date in UTC). */
function asOfDayNumber(asOf: string): number {
  const dt = new Date(asOf);
  return Math.floor(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()) / 86_400_000);
}

/** §2.7 — saturating streak reward f(streak) = 1 − 0.5^(streak/halfLife). */
function streakReward(streakDays: number): number {
  if (streakDays <= 0) return 0;
  return 1 - Math.pow(0.5, streakDays / MOMENTUM.streakHalfLifeDays);
}

/** Compute the streak / window stats for a given reference day from a set of active days. */
function statsForDay(activeDays: Set<number>, refDay: number): {
  currentStreakDays: number;
  activeDaysTrailing28: number;
} {
  // Current streak: count back from refDay (inclusive) while consecutive days are active.
  let currentStreakDays = 0;
  if (activeDays.has(refDay)) {
    let d = refDay;
    while (activeDays.has(d)) {
      currentStreakDays += 1;
      d -= 1;
    }
  } else if (activeDays.has(refDay - 1)) {
    // Active yesterday but not today: streak still alive (today not yet logged).
    let d = refDay - 1;
    while (activeDays.has(d)) {
      currentStreakDays += 1;
      d -= 1;
    }
  }

  // Trailing-28 window is [refDay-27, refDay].
  let activeDaysTrailing28 = 0;
  for (let d = refDay - 27; d <= refDay; d++) {
    if (activeDays.has(d)) activeDaysTrailing28 += 1;
  }
  return { currentStreakDays, activeDaysTrailing28 };
}

/** Longest run of consecutive active days across the full history. */
function longestStreak(sortedDays: number[]): number {
  if (sortedDays.length === 0) return 0;
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    if (sortedDays[i] === sortedDays[i - 1] + 1) {
      run += 1;
    } else if (sortedDays[i] !== sortedDays[i - 1]) {
      run = 1;
    }
    if (run > longest) longest = run;
  }
  return longest;
}

/** §2.7 — momentum from the three weighted terms. */
function momentumOf(
  currentStreakDays: number,
  activeDaysTrailing28: number,
  adherence: number | null,
): number {
  const activeFraction = activeDaysTrailing28 / 28;
  const adh = adherence ?? activeFraction;
  const m =
    MOMENTUM.wStreak * streakReward(currentStreakDays) +
    MOMENTUM.wActive * activeFraction +
    MOMENTUM.wAdherence * adh;
  return Math.max(0, Math.min(1, m));
}

/**
 * §2.7 — build the ConsistencyTrack from session history. Adherence is computed
 * from sessions carrying a programId (completed) vs the programmed count in the
 * window; with no program it stays null and momentum falls back to active-days.
 */
export function computeConsistency(sessions: Session[], asOf: string): ConsistencyTrack {
  if (sessions.length === 0) {
    return {
      currentStreakDays: 0,
      longestStreakDays: 0,
      activeDaysTrailing28: 0,
      adherenceTrailing28: null,
      momentum: 0,
      momentumModel: MODELS.momentum,
      history: [],
      asOf,
    };
  }

  const activeDays = new Set<number>();
  for (const s of sessions) activeDays.add(dayNumber(s.localDay));
  const sortedDays = [...activeDays].sort((a, b) => a - b);

  const refDay = asOfDayNumber(asOf);
  const { currentStreakDays, activeDaysTrailing28 } = statsForDay(activeDays, refDay);
  const longestStreakDays = longestStreak(sortedDays);

  // Adherence: only meaningful when a program is being followed. Count sessions
  // with a programId in the trailing-28 window as "completed". Without an explicit
  // programmed-session schedule we treat each programmed day as a completion, so
  // adherence reflects program engagement; null when no program is present at all.
  const hasProgram = sessions.some((s) => !!s.programId);
  let adherenceTrailing28: number | null = null;
  if (hasProgram) {
    const windowDays = new Set<number>();
    const programDays = new Set<number>();
    for (const s of sessions) {
      const dn = dayNumber(s.localDay);
      if (dn >= refDay - 27 && dn <= refDay) {
        windowDays.add(dn);
        if (s.programId) programDays.add(dn);
      }
    }
    adherenceTrailing28 = windowDays.size > 0 ? programDays.size / windowDays.size : null;
  }

  const momentum = momentumOf(currentStreakDays, activeDaysTrailing28, adherenceTrailing28);

  // History: recompute a ConsistencyPoint at each distinct active day (a compact,
  // re-derivable trajectory). Each point reflects what the track looked like that day.
  const history: ConsistencyPoint[] = sortedDays.map((day) => {
    const st = statsForDay(activeDays, day);
    return {
      at: dayNumberToISO(day),
      momentum: momentumOf(st.currentStreakDays, st.activeDaysTrailing28, null),
      currentStreakDays: st.currentStreakDays,
      activeDaysTrailing28: st.activeDaysTrailing28,
    };
  });

  return {
    currentStreakDays,
    longestStreakDays,
    activeDaysTrailing28,
    adherenceTrailing28,
    momentum,
    momentumModel: MODELS.momentum,
    history,
    asOf,
  };
}

function dayNumberToISO(day: number): string {
  return new Date(day * 86_400_000).toISOString();
}
