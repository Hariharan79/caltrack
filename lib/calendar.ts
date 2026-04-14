import { dayKey } from './date';
import type { DailyTotals, MealEntry } from '@/types';

export type DayStatus = 'none' | 'under' | 'hit' | 'over';

export interface CalendarCell {
  dayKey: string;
  dayOfMonth: number;
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface CalendarMonth {
  year: number;
  /** 0-indexed month (JS Date convention) */
  month: number;
}

/**
 * Build a 6×7 calendar grid for the given month, Sunday-first.
 * Trailing/leading days from adjacent months are included so every row has 7 cells.
 */
export function buildMonthGrid(
  year: number,
  month: number,
  now: Date = new Date()
): CalendarCell[][] {
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay();

  const gridStart = new Date(year, month, 1 - firstWeekday);

  const todayKey = dayKey(now);
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();

  const rows: CalendarCell[][] = [];
  for (let r = 0; r < 6; r++) {
    const row: CalendarCell[] = [];
    for (let c = 0; c < 7; c++) {
      const d = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + r * 7 + c
      );
      const key = dayKey(d);
      row.push({
        dayKey: key,
        dayOfMonth: d.getDate(),
        inMonth: d.getMonth() === month,
        isToday: key === todayKey,
        isFuture: d.getTime() > todayMidnight,
      });
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Classify a day's total calories against the user's goal.
 * Tolerance: ±10% around the goal is "hit". No entries → "none".
 */
export function dayStatus(
  calories: number | null | undefined,
  goal: number
): DayStatus {
  if (calories == null || calories <= 0) return 'none';
  if (goal <= 0) return 'none';
  const low = goal * 0.9;
  const high = goal * 1.1;
  if (calories < low) return 'under';
  if (calories > high) return 'over';
  return 'hit';
}

/**
 * Group entries by dayKey → DailyTotals for O(1) calendar cell lookup.
 * Inlined instead of delegating to `store.computeDailyTotals` so this module
 * can be imported from tests without pulling in the Supabase client.
 */
export function buildTotalsByDay(
  entries: readonly MealEntry[]
): Map<string, DailyTotals> {
  const out = new Map<string, DailyTotals>();
  for (const entry of entries) {
    const existing = out.get(entry.dayKey);
    if (existing) {
      existing.calories += entry.calories;
      existing.proteinG += entry.proteinG ?? 0;
      existing.carbsG += entry.carbsG ?? 0;
      existing.fatG += entry.fatG ?? 0;
      existing.entryCount += 1;
    } else {
      out.set(entry.dayKey, {
        dayKey: entry.dayKey,
        calories: entry.calories,
        proteinG: entry.proteinG ?? 0,
        carbsG: entry.carbsG ?? 0,
        fatG: entry.fatG ?? 0,
        entryCount: 1,
      });
    }
  }
  return out;
}

/**
 * Return the previous or next month, normalizing year rollover.
 * delta may be any integer.
 */
export function addMonths(
  year: number,
  month: number,
  delta: number
): CalendarMonth {
  const total = year * 12 + month + delta;
  return {
    year: Math.floor(total / 12),
    month: ((total % 12) + 12) % 12,
  };
}

export function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export function currentMonth(now: Date = new Date()): CalendarMonth {
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function isSameMonth(a: CalendarMonth, b: CalendarMonth): boolean {
  return a.year === b.year && a.month === b.month;
}
