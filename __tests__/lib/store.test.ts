import {
  useAppStore,
  selectTodayEntries,
  selectTodayTotals,
  selectHistory,
  computeDailyTotals,
  DEFAULT_GOALS,
} from '@/lib/store';
import type { MealEntry } from '@/types';
import { todayKey } from '@/lib/date';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

function reset() {
  useAppStore.getState().clearAll();
}

describe('useAppStore — actions', () => {
  beforeEach(() => reset());

  it('starts with no entries and default goals', () => {
    const state = useAppStore.getState();
    expect(state.entries).toHaveLength(0);
    expect(state.goals).toEqual(DEFAULT_GOALS);
  });

  it('addEntry appends a meal with id, loggedAt, and dayKey set', () => {
    useAppStore.getState().addEntry({
      name: 'Oats',
      calories: 320,
      proteinG: 12,
      carbsG: 55,
      fatG: 6,
    });
    const state = useAppStore.getState();
    expect(state.entries).toHaveLength(1);
    const entry = state.entries[0];
    expect(entry.id).toMatch(/^meal_/);
    expect(entry.name).toBe('Oats');
    expect(entry.calories).toBe(320);
    expect(entry.dayKey).toBe(todayKey());
    expect(typeof entry.loggedAt).toBe('string');
  });

  it('addEntry trims whitespace from name', () => {
    useAppStore.getState().addEntry({
      name: '  Burrito  ',
      calories: 700,
      proteinG: null,
      carbsG: null,
      fatG: null,
    });
    expect(useAppStore.getState().entries[0].name).toBe('Burrito');
  });

  it('addEntry generates unique ids for sequential calls', () => {
    const add = useAppStore.getState().addEntry;
    add({ name: 'A', calories: 1, proteinG: null, carbsG: null, fatG: null });
    add({ name: 'B', calories: 2, proteinG: null, carbsG: null, fatG: null });
    const ids = useAppStore.getState().entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('removeEntry deletes by id', () => {
    useAppStore.getState().addEntry({
      name: 'A',
      calories: 100,
      proteinG: null,
      carbsG: null,
      fatG: null,
    });
    const id = useAppStore.getState().entries[0].id;
    useAppStore.getState().removeEntry(id);
    expect(useAppStore.getState().entries).toHaveLength(0);
  });

  it('removeEntry is a no-op for unknown ids', () => {
    useAppStore.getState().addEntry({
      name: 'A',
      calories: 100,
      proteinG: null,
      carbsG: null,
      fatG: null,
    });
    useAppStore.getState().removeEntry('not-a-real-id');
    expect(useAppStore.getState().entries).toHaveLength(1);
  });

  it('updateGoals merges only supplied keys', () => {
    useAppStore.getState().updateGoals({ calorieGoal: 2500 });
    expect(useAppStore.getState().goals.calorieGoal).toBe(2500);
    expect(useAppStore.getState().goals.proteinGoalG).toBe(DEFAULT_GOALS.proteinGoalG);

    useAppStore.getState().updateGoals({ proteinGoalG: 150 });
    expect(useAppStore.getState().goals.calorieGoal).toBe(2500);
    expect(useAppStore.getState().goals.proteinGoalG).toBe(150);
  });

  it('clearAll resets entries and goals to defaults', () => {
    useAppStore.getState().addEntry({
      name: 'A',
      calories: 100,
      proteinG: null,
      carbsG: null,
      fatG: null,
    });
    useAppStore.getState().updateGoals({ calorieGoal: 3000 });
    useAppStore.getState().clearAll();
    const state = useAppStore.getState();
    expect(state.entries).toHaveLength(0);
    expect(state.goals).toEqual(DEFAULT_GOALS);
  });
});

describe('selectors', () => {
  beforeEach(() => reset());

  it('selectTodayEntries returns only entries with today dayKey, newest first', () => {
    const today = todayKey();
    useAppStore.setState({
      entries: [
        {
          id: '1',
          name: 'Old',
          calories: 1,
          proteinG: null,
          carbsG: null,
          fatG: null,
          loggedAt: '2026-04-12T08:00:00.000Z',
          dayKey: '2026-04-12',
        },
        {
          id: '2',
          name: 'Morning',
          calories: 200,
          proteinG: null,
          carbsG: null,
          fatG: null,
          loggedAt: new Date(2026, 3, 13, 8, 0).toISOString(),
          dayKey: today,
        },
        {
          id: '3',
          name: 'Lunch',
          calories: 600,
          proteinG: null,
          carbsG: null,
          fatG: null,
          loggedAt: new Date(2026, 3, 13, 13, 0).toISOString(),
          dayKey: today,
        },
      ] as MealEntry[],
    });

    const result = selectTodayEntries(useAppStore.getState().entries);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Lunch');
    expect(result[1].name).toBe('Morning');
  });

  it('selectTodayTotals sums calories and macros for today', () => {
    const today = todayKey();
    useAppStore.setState({
      entries: [
        {
          id: '1',
          name: 'A',
          calories: 300,
          proteinG: 20,
          carbsG: 40,
          fatG: 10,
          loggedAt: '2026-04-13T08:00:00.000Z',
          dayKey: today,
        },
        {
          id: '2',
          name: 'B',
          calories: 500,
          proteinG: 30,
          carbsG: 60,
          fatG: 15,
          loggedAt: '2026-04-13T13:00:00.000Z',
          dayKey: today,
        },
        {
          id: '3',
          name: 'Yesterday',
          calories: 9999,
          proteinG: 9999,
          carbsG: 9999,
          fatG: 9999,
          loggedAt: '2026-04-12T08:00:00.000Z',
          dayKey: '2026-04-12',
        },
      ] as MealEntry[],
    });

    const totals = selectTodayTotals(useAppStore.getState().entries);
    expect(totals.calories).toBe(800);
    expect(totals.proteinG).toBe(50);
    expect(totals.carbsG).toBe(100);
    expect(totals.fatG).toBe(25);
    expect(totals.entryCount).toBe(2);
  });

  it('computeDailyTotals treats null macros as 0', () => {
    const totals = computeDailyTotals(
      [
        {
          id: '1',
          name: 'A',
          calories: 200,
          proteinG: null,
          carbsG: null,
          fatG: null,
          loggedAt: '2026-04-13T08:00:00.000Z',
          dayKey: '2026-04-13',
        },
      ],
      '2026-04-13'
    );
    expect(totals.calories).toBe(200);
    expect(totals.proteinG).toBe(0);
    expect(totals.carbsG).toBe(0);
    expect(totals.fatG).toBe(0);
  });

  it('computeDailyTotals returns zeros for an empty day', () => {
    const totals = computeDailyTotals([], '2026-04-13');
    expect(totals.calories).toBe(0);
    expect(totals.entryCount).toBe(0);
  });

  it('selectHistory groups past entries by day, excludes today, newest day first', () => {
    const today = todayKey();
    useAppStore.setState({
      entries: [
        {
          id: '1',
          name: 'Today',
          calories: 100,
          proteinG: null,
          carbsG: null,
          fatG: null,
          loggedAt: new Date().toISOString(),
          dayKey: today,
        },
        {
          id: '2',
          name: 'Yesterday A',
          calories: 200,
          proteinG: null,
          carbsG: null,
          fatG: null,
          loggedAt: '2026-04-12T09:00:00.000Z',
          dayKey: '2026-04-12',
        },
        {
          id: '3',
          name: 'Yesterday B',
          calories: 300,
          proteinG: null,
          carbsG: null,
          fatG: null,
          loggedAt: '2026-04-12T13:00:00.000Z',
          dayKey: '2026-04-12',
        },
        {
          id: '4',
          name: 'Older',
          calories: 400,
          proteinG: null,
          carbsG: null,
          fatG: null,
          loggedAt: '2026-04-10T13:00:00.000Z',
          dayKey: '2026-04-10',
        },
      ] as MealEntry[],
    });

    const history = selectHistory(useAppStore.getState().entries);
    expect(history).toHaveLength(2);
    expect(history[0].totals.dayKey).toBe('2026-04-12');
    expect(history[0].totals.calories).toBe(500);
    expect(history[0].entries).toHaveLength(2);
    expect(history[0].entries[0].name).toBe('Yesterday B');
    expect(history[1].totals.dayKey).toBe('2026-04-10');
    expect(history[1].totals.calories).toBe(400);
  });

  it('selectHistory returns [] when there are no past entries', () => {
    expect(selectHistory(useAppStore.getState().entries)).toEqual([]);
  });
});
