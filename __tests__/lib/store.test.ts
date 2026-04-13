type QueryResult = { data: unknown; error: { message: string } | null };

jest.mock('@/lib/supabase', () => {
  const state = {
    session: null as { user: { id: string } } | null,
    queue: [] as QueryResult[],
    calls: [] as Array<{ table: string; method: string; args: unknown[] }>,
  };

  const makeBuilder = (table: string) => {
    const shift = (): QueryResult => state.queue.shift() ?? { data: null, error: null };
    const record = (method: string, args: unknown[]) => {
      state.calls.push({ table, method, args });
    };
    const builder: Record<string, unknown> = {};
    const chain = (method: string) => (...args: unknown[]) => {
      record(method, args);
      return builder;
    };
    builder.insert = chain('insert');
    builder.delete = chain('delete');
    builder.update = chain('update');
    builder.select = chain('select');
    builder.eq = chain('eq');
    builder.order = chain('order');
    builder.limit = chain('limit');
    builder.single = jest.fn(async () => {
      record('single', []);
      return shift();
    });
    builder.maybeSingle = jest.fn(async () => {
      record('maybeSingle', []);
      return shift();
    });
    builder.then = (resolve: (r: QueryResult) => unknown, reject?: (err: unknown) => unknown) => {
      record('await', []);
      return Promise.resolve(shift()).then(resolve, reject);
    };
    return builder;
  };

  return {
    __esModule: true,
    __state: state,
    supabase: {
      auth: {
        getSession: jest.fn(async () => ({
          data: { session: state.session },
          error: null,
        })),
      },
      from: jest.fn((table: string) => makeBuilder(table)),
    },
  };
});

import * as supabaseMock from '@/lib/supabase';
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

const mock = supabaseMock as unknown as {
  __state: {
    session: { user: { id: string } } | null;
    queue: QueryResult[];
    calls: Array<{ table: string; method: string; args: unknown[] }>;
  };
};

function enqueue(result: QueryResult) {
  mock.__state.queue.push(result);
}

function signedIn(userId = 'user-1') {
  mock.__state.session = { user: { id: userId } };
}

beforeEach(() => {
  mock.__state.session = null;
  mock.__state.queue = [];
  mock.__state.calls = [];
  useAppStore.getState().reset();
});

describe('useAppStore — initial state', () => {
  it('starts empty with default goals and hydrated=false', () => {
    const state = useAppStore.getState();
    expect(state.entries).toHaveLength(0);
    expect(state.goals).toEqual(DEFAULT_GOALS);
    expect(state.hydrated).toBe(false);
    expect(state.hydrating).toBe(false);
    expect(state.error).toBeNull();
  });
});

describe('useAppStore.addEntry', () => {
  it('inserts via supabase and prepends the returned row to local state', async () => {
    signedIn('user-1');
    enqueue({
      data: {
        id: 'row-1',
        user_id: 'user-1',
        name: 'Oats',
        kcal: 320,
        protein_g: 12,
        carbs_g: 55,
        fat_g: 6,
        logged_at: '2026-04-13T08:00:00.000Z',
        day_key: todayKey(),
        food_id: null,
        meal_type: null,
        status: 'eaten',
        servings: 1,
        created_at: '2026-04-13T08:00:00.000Z',
        updated_at: '2026-04-13T08:00:00.000Z',
      },
      error: null,
    });

    const entry = await useAppStore.getState().addEntry({
      name: '  Oats  ',
      calories: 320,
      proteinG: 12,
      carbsG: 55,
      fatG: 6,
    });

    expect(entry.id).toBe('row-1');
    expect(entry.name).toBe('Oats');
    expect(useAppStore.getState().entries).toHaveLength(1);
    expect(useAppStore.getState().entries[0].id).toBe('row-1');

    const insertCall = mock.__state.calls.find((c) => c.method === 'insert');
    expect(insertCall).toBeDefined();
    const payload = insertCall!.args[0] as Record<string, unknown>;
    expect(payload.user_id).toBe('user-1');
    expect(payload.name).toBe('Oats');
    expect(payload.kcal).toBe(320);
  });

  it('throws when not authenticated and does not touch local state', async () => {
    await expect(
      useAppStore.getState().addEntry({
        name: 'A',
        calories: 100,
        proteinG: null,
        carbsG: null,
        fatG: null,
      })
    ).rejects.toThrow(/authenticated/i);
    expect(useAppStore.getState().entries).toHaveLength(0);
  });

  it('throws the supabase error message and does not touch local state', async () => {
    signedIn();
    enqueue({ data: null, error: { message: 'permission denied' } });
    await expect(
      useAppStore.getState().addEntry({
        name: 'A',
        calories: 100,
        proteinG: null,
        carbsG: null,
        fatG: null,
      })
    ).rejects.toThrow('permission denied');
    expect(useAppStore.getState().entries).toHaveLength(0);
  });
});

describe('useAppStore.removeEntry', () => {
  it('deletes via supabase then removes from local state', async () => {
    useAppStore.setState({
      entries: [
        {
          id: 'row-1',
          name: 'A',
          calories: 100,
          proteinG: null,
          carbsG: null,
          fatG: null,
          loggedAt: '2026-04-13T08:00:00.000Z',
          dayKey: todayKey(),
        },
      ],
    });
    enqueue({ data: null, error: null });

    await useAppStore.getState().removeEntry('row-1');
    expect(useAppStore.getState().entries).toHaveLength(0);

    const deleteCall = mock.__state.calls.find((c) => c.method === 'delete');
    expect(deleteCall).toBeDefined();
  });

  it('leaves local state untouched when supabase errors', async () => {
    useAppStore.setState({
      entries: [
        {
          id: 'row-1',
          name: 'A',
          calories: 100,
          proteinG: null,
          carbsG: null,
          fatG: null,
          loggedAt: '2026-04-13T08:00:00.000Z',
          dayKey: todayKey(),
        },
      ],
    });
    enqueue({ data: null, error: { message: 'network down' } });
    await expect(useAppStore.getState().removeEntry('row-1')).rejects.toThrow('network down');
    expect(useAppStore.getState().entries).toHaveLength(1);
  });
});

describe('useAppStore.updateGoals', () => {
  it('inserts a new log-style row with merged goals and updates local state', async () => {
    signedIn('user-1');
    useAppStore.setState({
      goals: {
        calorieGoal: 2000,
        proteinGoalG: null,
        carbsGoalG: null,
        fatGoalG: null,
      },
    });

    enqueue({
      data: {
        id: 'goals-1',
        user_id: 'user-1',
        kcal_goal: 2500,
        protein_goal_g: null,
        carbs_goal_g: null,
        fat_goal_g: null,
        set_at: '2026-04-13T09:00:00.000Z',
      },
      error: null,
    });

    await useAppStore.getState().updateGoals({ calorieGoal: 2500 });
    expect(useAppStore.getState().goals.calorieGoal).toBe(2500);

    const insertCall = mock.__state.calls.find((c) => c.method === 'insert');
    expect(insertCall).toBeDefined();
    const payload = insertCall!.args[0] as Record<string, unknown>;
    expect(payload.user_id).toBe('user-1');
    expect(payload.kcal_goal).toBe(2500);
    expect(payload.protein_goal_g).toBeNull();
  });

  it('throws when not authenticated', async () => {
    await expect(
      useAppStore.getState().updateGoals({ calorieGoal: 2500 })
    ).rejects.toThrow(/authenticated/i);
  });

  it('throws and leaves local goals unchanged on supabase error', async () => {
    signedIn();
    enqueue({ data: null, error: { message: 'rls denied' } });
    await expect(
      useAppStore.getState().updateGoals({ calorieGoal: 2500 })
    ).rejects.toThrow('rls denied');
    expect(useAppStore.getState().goals).toEqual(DEFAULT_GOALS);
  });
});

describe('useAppStore.hydrate', () => {
  it('loads goals + entries and flips hydrated=true', async () => {
    enqueue({
      data: {
        id: 'goals-1',
        user_id: 'user-1',
        kcal_goal: 2200,
        protein_goal_g: 150,
        carbs_goal_g: null,
        fat_goal_g: null,
        set_at: '2026-04-13T09:00:00.000Z',
      },
      error: null,
    });
    enqueue({
      data: [
        {
          id: 'row-1',
          user_id: 'user-1',
          name: 'Oats',
          kcal: 320,
          protein_g: 12,
          carbs_g: 55,
          fat_g: 6,
          logged_at: '2026-04-13T08:00:00.000Z',
          day_key: '2026-04-13',
          food_id: null,
          meal_type: null,
          status: 'eaten',
          servings: 1,
          created_at: '2026-04-13T08:00:00.000Z',
          updated_at: '2026-04-13T08:00:00.000Z',
        },
      ],
      error: null,
    });

    await useAppStore.getState().hydrate('user-1');
    const state = useAppStore.getState();
    expect(state.hydrated).toBe(true);
    expect(state.hydrating).toBe(false);
    expect(state.goals.calorieGoal).toBe(2200);
    expect(state.goals.proteinGoalG).toBe(150);
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0].id).toBe('row-1');
  });

  it('falls back to DEFAULT_GOALS when goals row is missing', async () => {
    enqueue({ data: null, error: null });
    enqueue({ data: [], error: null });

    await useAppStore.getState().hydrate('user-1');
    expect(useAppStore.getState().goals).toEqual(DEFAULT_GOALS);
    expect(useAppStore.getState().entries).toHaveLength(0);
    expect(useAppStore.getState().hydrated).toBe(true);
  });

  it('records error and does not mark hydrated on failure', async () => {
    enqueue({ data: null, error: { message: 'bad jwt' } });
    enqueue({ data: null, error: null });

    await expect(useAppStore.getState().hydrate('user-1')).rejects.toThrow('bad jwt');
    expect(useAppStore.getState().hydrated).toBe(false);
    expect(useAppStore.getState().error).toMatch(/bad jwt/);
  });
});

describe('useAppStore.reset', () => {
  it('clears entries, goals, hydrated flag, and error', () => {
    useAppStore.setState({
      entries: [
        {
          id: 'x',
          name: 'X',
          calories: 100,
          proteinG: null,
          carbsG: null,
          fatG: null,
          loggedAt: '2026-04-13T08:00:00.000Z',
          dayKey: todayKey(),
        },
      ],
      goals: { ...DEFAULT_GOALS, calorieGoal: 2500 },
      hydrated: true,
      error: 'something',
    });
    useAppStore.getState().reset();
    const state = useAppStore.getState();
    expect(state.entries).toHaveLength(0);
    expect(state.goals).toEqual(DEFAULT_GOALS);
    expect(state.hydrated).toBe(false);
    expect(state.error).toBeNull();
  });
});

describe('selectors', () => {
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
