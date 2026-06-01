/** Cross-cutting types that don't fit under constants/ or schema/. */

export interface WeekKey {
  /** ISO week key, e.g. "2026-W22". */
  readonly value: string;
  readonly year: number;
  readonly weekNumber: number;
}

/** Construct an ISO-week key from a Date. UTC-anchored. */
export function getWeekKey(now: Date = new Date()): WeekKey {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  const year = d.getUTCFullYear();
  return { value: `${year}-W${String(weekNumber).padStart(2, "0")}`, year, weekNumber };
}
