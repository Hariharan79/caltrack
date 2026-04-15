import {
  addMonths,
  buildMonthGrid,
  buildTotalsByDay,
  currentMonth,
  dayStatus,
  formatMonthLabel,
  isSameMonth,
} from '@/lib/calendar';
import type { MealEntry } from '@/types';

describe('buildMonthGrid', () => {
  it('produces 6 rows of 7 cells each', () => {
    const grid = buildMonthGrid(2026, 3, new Date(2026, 3, 13));
    expect(grid).toHaveLength(6);
    for (const row of grid) {
      expect(row).toHaveLength(7);
    }
  });

  it('starts the first row on the Sunday on or before the 1st', () => {
    // April 2026: 1st is a Wednesday (day 3). Row 0 should start on Sun Mar 29.
    const grid = buildMonthGrid(2026, 3, new Date(2026, 3, 13));
    const first = grid[0][0];
    expect(first.dayKey).toBe('2026-03-29');
    expect(first.inMonth).toBe(false);
  });

  it('marks inMonth correctly for cells within and outside the month', () => {
    const grid = buildMonthGrid(2026, 3, new Date(2026, 3, 13));
    const flat = grid.flat();
    const inMonth = flat.filter((c) => c.inMonth);
    expect(inMonth).toHaveLength(30); // April has 30 days
    expect(inMonth[0].dayOfMonth).toBe(1);
    expect(inMonth[inMonth.length - 1].dayOfMonth).toBe(30);
  });

  it('flags today correctly', () => {
    const now = new Date(2026, 3, 13);
    const grid = buildMonthGrid(2026, 3, now);
    const today = grid.flat().find((c) => c.isToday);
    expect(today).toBeDefined();
    expect(today!.dayKey).toBe('2026-04-13');
  });

  it('marks future days as isFuture', () => {
    const now = new Date(2026, 3, 13);
    const grid = buildMonthGrid(2026, 3, now);
    const flat = grid.flat();
    const apr14 = flat.find((c) => c.dayKey === '2026-04-14');
    const apr12 = flat.find((c) => c.dayKey === '2026-04-12');
    expect(apr14?.isFuture).toBe(true);
    expect(apr12?.isFuture).toBe(false);
  });

  it('handles months where the 1st is a Sunday', () => {
    // March 2026: 1st is a Sunday, so no leading padding.
    const grid = buildMonthGrid(2026, 2, new Date(2026, 2, 15));
    expect(grid[0][0].dayKey).toBe('2026-03-01');
    expect(grid[0][0].inMonth).toBe(true);
  });
});

describe('dayStatus', () => {
  it('returns none for null, undefined, zero calories, or zero goal', () => {
    expect(dayStatus(null, 2000)).toBe('none');
    expect(dayStatus(undefined, 2000)).toBe('none');
    expect(dayStatus(0, 2000)).toBe('none');
    expect(dayStatus(1500, 0)).toBe('none');
  });

  it('classifies within ±10% of goal as "hit"', () => {
    expect(dayStatus(2000, 2000)).toBe('hit');
    expect(dayStatus(1800, 2000)).toBe('hit'); // exactly -10%
    expect(dayStatus(2200, 2000)).toBe('hit'); // exactly +10%
    expect(dayStatus(1900, 2000)).toBe('hit');
    expect(dayStatus(2100, 2000)).toBe('hit');
  });

  it('classifies below 90% of goal as "under"', () => {
    expect(dayStatus(1799, 2000)).toBe('under');
    expect(dayStatus(500, 2000)).toBe('under');
  });

  it('classifies above 110% of goal as "over"', () => {
    expect(dayStatus(2201, 2000)).toBe('over');
    expect(dayStatus(5000, 2000)).toBe('over');
  });
});

describe('buildTotalsByDay', () => {
  it('aggregates entries by dayKey with totals', () => {
    const entries: MealEntry[] = [
      {
        id: '1',
        name: 'A',
        calories: 400,
        proteinG: 20,
        carbsG: 30,
        fatG: 10,
        loggedAt: '2026-04-12T08:00:00.000Z',
        dayKey: '2026-04-12',
        foodId: null,
        servings: 1,
        status: 'eaten',
      },
      {
        id: '2',
        name: 'B',
        calories: 600,
        proteinG: 30,
        carbsG: 40,
        fatG: 20,
        loggedAt: '2026-04-12T13:00:00.000Z',
        dayKey: '2026-04-12',
        foodId: null,
        servings: 1,
        status: 'eaten',
      },
      {
        id: '3',
        name: 'C',
        calories: 800,
        proteinG: null,
        carbsG: null,
        fatG: null,
        loggedAt: '2026-04-13T08:00:00.000Z',
        dayKey: '2026-04-13',
        foodId: null,
        servings: 1,
        status: 'eaten',
      },
    ];
    const map = buildTotalsByDay(entries);
    expect(map.size).toBe(2);
    expect(map.get('2026-04-12')?.calories).toBe(1000);
    expect(map.get('2026-04-12')?.proteinG).toBe(50);
    expect(map.get('2026-04-12')?.entryCount).toBe(2);
    expect(map.get('2026-04-13')?.calories).toBe(800);
    expect(map.get('2026-04-13')?.entryCount).toBe(1);
  });

  it('returns an empty map for empty input', () => {
    expect(buildTotalsByDay([]).size).toBe(0);
  });
});

describe('addMonths', () => {
  it('advances within the same year', () => {
    expect(addMonths(2026, 3, 1)).toEqual({ year: 2026, month: 4 });
    expect(addMonths(2026, 3, -1)).toEqual({ year: 2026, month: 2 });
  });

  it('rolls over across year boundaries', () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });

  it('handles multi-year deltas', () => {
    expect(addMonths(2026, 3, 12)).toEqual({ year: 2027, month: 3 });
    expect(addMonths(2026, 3, -24)).toEqual({ year: 2024, month: 3 });
  });
});

describe('formatMonthLabel', () => {
  it('renders a human-readable month + year', () => {
    const label = formatMonthLabel(2026, 3);
    // Don't hard-code locale formatting; just check both parts appear.
    expect(label).toMatch(/April/);
    expect(label).toMatch(/2026/);
  });
});

describe('currentMonth + isSameMonth', () => {
  it('currentMonth reflects the passed date', () => {
    expect(currentMonth(new Date(2026, 3, 13))).toEqual({ year: 2026, month: 3 });
  });

  it('isSameMonth compares year and month', () => {
    expect(isSameMonth({ year: 2026, month: 3 }, { year: 2026, month: 3 })).toBe(
      true
    );
    expect(isSameMonth({ year: 2026, month: 3 }, { year: 2026, month: 4 })).toBe(
      false
    );
    expect(isSameMonth({ year: 2026, month: 3 }, { year: 2025, month: 3 })).toBe(
      false
    );
  });
});
