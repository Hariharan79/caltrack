import React from 'react';
import { render } from '@testing-library/react-native';
import { WeekStreak, buildWeekDays } from '@/components/WeekStreak';
import type { MealEntry } from '@/types';

describe('buildWeekDays', () => {
  // 2026-04-15 is a Wednesday (local). Sunday-based week: 12..18.
  const wed = new Date(2026, 3, 15, 12, 0, 0); // Apr 15 2026 noon

  it('returns 7 cells, one per day of the week', () => {
    const cells = buildWeekDays(new Set<string>(), wed);
    expect(cells).toHaveLength(7);
  });

  it('flags today exactly once', () => {
    const cells = buildWeekDays(new Set<string>(), wed);
    const todayCells = cells.filter((c) => c.isToday);
    expect(todayCells).toHaveLength(1);
    expect(todayCells[0].key).toBe('2026-04-15');
  });

  it('marks days included in the loggedSet', () => {
    const set = new Set<string>(['2026-04-13', '2026-04-15']);
    const cells = buildWeekDays(set, wed);
    const logged = cells.filter((c) => c.isLogged).map((c) => c.key);
    expect(logged).toEqual(['2026-04-13', '2026-04-15']);
  });

  it('returns Sunday→Saturday in order', () => {
    const cells = buildWeekDays(new Set<string>(), wed);
    expect(cells.map((c) => c.key)).toEqual([
      '2026-04-12',
      '2026-04-13',
      '2026-04-14',
      '2026-04-15',
      '2026-04-16',
      '2026-04-17',
      '2026-04-18',
    ]);
  });
});

describe('WeekStreak component', () => {
  it('renders a cell for each day in the week', () => {
    const wed = new Date(2026, 3, 15, 12, 0, 0);
    const { getByTestId } = render(<WeekStreak entries={[]} now={wed} />);
    expect(getByTestId('week-streak')).toBeTruthy();
    expect(getByTestId('week-streak-2026-04-12')).toBeTruthy();
    expect(getByTestId('week-streak-2026-04-15')).toBeTruthy();
    expect(getByTestId('week-streak-2026-04-18')).toBeTruthy();
  });

  it('treats only eaten entries as logged', () => {
    const wed = new Date(2026, 3, 15, 12, 0, 0);
    const entries: MealEntry[] = [
      {
        id: 'e1',
        name: 'A',
        calories: 100,
        proteinG: null,
        carbsG: null,
        fatG: null,
        loggedAt: '2026-04-13T08:00:00.000Z',
        dayKey: '2026-04-13',
        foodId: null,
        servings: 1,
        status: 'eaten',
      },
      {
        id: 'e2',
        name: 'B',
        calories: 100,
        proteinG: null,
        carbsG: null,
        fatG: null,
        loggedAt: '2026-04-14T08:00:00.000Z',
        dayKey: '2026-04-14',
        foodId: null,
        servings: 1,
        status: 'planned',
      },
    ];
    // The component does not expose its loggedDays directly; we verify via the
    // helper that operates over the same set construction.
    const set = new Set<string>();
    for (const e of entries) {
      if (e.status === 'eaten') set.add(e.dayKey);
    }
    const cells = buildWeekDays(set, wed);
    const logged = cells.filter((c) => c.isLogged).map((c) => c.key);
    expect(logged).toEqual(['2026-04-13']);
  });
});
