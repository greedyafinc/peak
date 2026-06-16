// Pure date/time helpers. `nowISO` is the canonical wall-clock timestamp; the
// local-day key is the calendar day in the device's local timezone (NOT UTC),
// which is what drives the consistency/streak tracks.

export const nowISO = (): string => new Date().toISOString();

/** Local calendar day as "YYYY-MM-DD" (device timezone, not UTC). */
export function localDayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
