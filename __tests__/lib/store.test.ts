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
  searchFoods,
  selectWeightHistory,
  selectLatestWeight,
  selectRecentFoods,
  DEFAULT_GOALS,
} from '@/lib/store';
import type { Food, MealEntry, WeightEntry } from '@/types';
import type { NormalizedFood } from '@/lib/foodNormalizers';
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
          foodId: null,
          servings: 1,
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
          foodId: null,
          servings: 1,
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
          foodId: null,
          servings: 1,
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
          foodId: null,
          servings: 1,
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

const SAMPLE_FOOD_ROW = {
  id: 'food-1',
  user_id: 'user-1',
  name: 'Chicken breast',
  serving_size: '100 g',
  kcal_per_serving: 165,
  protein_g_per_serving: 31,
  carbs_g_per_serving: 0,
  fat_g_per_serving: 3.6,
  barcode: null,
  source: 'user',
  source_id: null,
  created_at: '2026-04-13T00:00:00.000Z',
  updated_at: '2026-04-13T00:00:00.000Z',
};

describe('useAppStore.addFood', () => {
  it('inserts via supabase and keeps foods sorted by name', async () => {
    signedIn('user-1');
    useAppStore.setState({
      foods: [
        {
          id: 'existing',
          name: 'Zebra meat',
          servingSize: null,
          kcalPerServing: 100,
          proteinGPerServing: null,
          carbsGPerServing: null,
          fatGPerServing: null,
          barcode: null,
          source: 'user',
          sourceId: null,
          createdAt: '2026-04-12T00:00:00.000Z',
          updatedAt: '2026-04-12T00:00:00.000Z',
        },
      ],
    });
    enqueue({ data: SAMPLE_FOOD_ROW, error: null });

    const food = await useAppStore.getState().addFood({
      name: '  Chicken breast  ',
      servingSize: '100 g',
      kcalPerServing: 165,
      proteinGPerServing: 31,
      carbsGPerServing: 0,
      fatGPerServing: 3.6,
    });

    expect(food.id).toBe('food-1');
    const foods = useAppStore.getState().foods;
    expect(foods).toHaveLength(2);
    expect(foods[0].name).toBe('Chicken breast');
    expect(foods[1].name).toBe('Zebra meat');

    const insertCall = mock.__state.calls.find((c) => c.method === 'insert');
    expect(insertCall).toBeDefined();
    const payload = insertCall!.args[0] as Record<string, unknown>;
    expect(payload.user_id).toBe('user-1');
    expect(payload.name).toBe('Chicken breast');
    expect(payload.kcal_per_serving).toBe(165);
  });

  it('throws when not authenticated', async () => {
    await expect(
      useAppStore.getState().addFood({
        name: 'X',
        servingSize: null,
        kcalPerServing: 100,
        proteinGPerServing: null,
        carbsGPerServing: null,
        fatGPerServing: null,
      })
    ).rejects.toThrow(/authenticated/i);
    expect(useAppStore.getState().foods).toHaveLength(0);
  });

  it('throws supabase error and leaves foods untouched', async () => {
    signedIn();
    enqueue({ data: null, error: { message: 'rls denied' } });
    await expect(
      useAppStore.getState().addFood({
        name: 'X',
        servingSize: null,
        kcalPerServing: 100,
        proteinGPerServing: null,
        carbsGPerServing: null,
        fatGPerServing: null,
      })
    ).rejects.toThrow('rls denied');
    expect(useAppStore.getState().foods).toHaveLength(0);
  });
});

describe('useAppStore.updateFood', () => {
  it('updates the row and swaps it in local state', async () => {
    useAppStore.setState({
      foods: [
        {
          id: 'food-1',
          name: 'Chicken breast',
          servingSize: '100 g',
          kcalPerServing: 165,
          proteinGPerServing: 31,
          carbsGPerServing: 0,
          fatGPerServing: 3.6,
          barcode: null,
          source: 'user',
          sourceId: null,
          createdAt: '2026-04-13T00:00:00.000Z',
          updatedAt: '2026-04-13T00:00:00.000Z',
        },
      ],
    });
    enqueue({
      data: { ...SAMPLE_FOOD_ROW, name: 'Chicken thigh', kcal_per_serving: 209 },
      error: null,
    });

    const updated = await useAppStore.getState().updateFood('food-1', {
      name: 'Chicken thigh',
      kcalPerServing: 209,
    });

    expect(updated.name).toBe('Chicken thigh');
    expect(useAppStore.getState().foods[0].name).toBe('Chicken thigh');

    const updateCall = mock.__state.calls.find((c) => c.method === 'update');
    expect(updateCall).toBeDefined();
    const payload = updateCall!.args[0] as Record<string, unknown>;
    expect(payload.name).toBe('Chicken thigh');
    expect(payload.kcal_per_serving).toBe(209);
    expect(payload.carbs_g_per_serving).toBeUndefined();
  });

  it('throws and leaves local state untouched on error', async () => {
    useAppStore.setState({
      foods: [
        {
          id: 'food-1',
          name: 'Old name',
          servingSize: null,
          kcalPerServing: 100,
          proteinGPerServing: null,
          carbsGPerServing: null,
          fatGPerServing: null,
          barcode: null,
          source: 'user',
          sourceId: null,
          createdAt: '2026-04-13T00:00:00.000Z',
          updatedAt: '2026-04-13T00:00:00.000Z',
        },
      ],
    });
    enqueue({ data: null, error: { message: 'not found' } });
    await expect(
      useAppStore.getState().updateFood('food-1', { name: 'New' })
    ).rejects.toThrow('not found');
    expect(useAppStore.getState().foods[0].name).toBe('Old name');
  });
});

describe('useAppStore.deleteFood', () => {
  it('removes the food from local state after supabase delete', async () => {
    useAppStore.setState({
      foods: [
        {
          id: 'food-1',
          name: 'A',
          servingSize: null,
          kcalPerServing: 100,
          proteinGPerServing: null,
          carbsGPerServing: null,
          fatGPerServing: null,
          barcode: null,
          source: 'user',
          sourceId: null,
          createdAt: '2026-04-13T00:00:00.000Z',
          updatedAt: '2026-04-13T00:00:00.000Z',
        },
      ],
    });
    enqueue({ data: null, error: null });
    await useAppStore.getState().deleteFood('food-1');
    expect(useAppStore.getState().foods).toHaveLength(0);
  });

  it('leaves local state untouched on supabase error', async () => {
    useAppStore.setState({
      foods: [
        {
          id: 'food-1',
          name: 'A',
          servingSize: null,
          kcalPerServing: 100,
          proteinGPerServing: null,
          carbsGPerServing: null,
          fatGPerServing: null,
          barcode: null,
          source: 'user',
          sourceId: null,
          createdAt: '2026-04-13T00:00:00.000Z',
          updatedAt: '2026-04-13T00:00:00.000Z',
        },
      ],
    });
    enqueue({ data: null, error: { message: 'fk violation' } });
    await expect(useAppStore.getState().deleteFood('food-1')).rejects.toThrow(
      'fk violation'
    );
    expect(useAppStore.getState().foods).toHaveLength(1);
  });
});

describe('useAppStore.hydrate with foods', () => {
  it('loads foods alongside goals and entries', async () => {
    enqueue({ data: null, error: null });
    enqueue({ data: [], error: null });
    enqueue({
      data: [SAMPLE_FOOD_ROW, { ...SAMPLE_FOOD_ROW, id: 'food-2', name: 'Broccoli' }],
      error: null,
    });

    await useAppStore.getState().hydrate('user-1');
    const foods = useAppStore.getState().foods;
    expect(foods).toHaveLength(2);
    expect(foods[0].name).toBe('Chicken breast');
    expect(foods[1].name).toBe('Broccoli');
  });
});

describe('searchFoods', () => {
  const foods: Food[] = [
    {
      id: '1',
      name: 'Chicken breast',
      servingSize: null,
      kcalPerServing: 165,
      proteinGPerServing: null,
      carbsGPerServing: null,
      fatGPerServing: null,
      barcode: null,
      source: 'user',
      sourceId: null,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: '2',
      name: 'Broccoli',
      servingSize: null,
      kcalPerServing: 30,
      proteinGPerServing: null,
      carbsGPerServing: null,
      fatGPerServing: null,
      barcode: null,
      source: 'user',
      sourceId: null,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: '3',
      name: 'Brown rice',
      servingSize: null,
      kcalPerServing: 215,
      proteinGPerServing: null,
      carbsGPerServing: null,
      fatGPerServing: null,
      barcode: null,
      source: 'user',
      sourceId: null,
      createdAt: '',
      updatedAt: '',
    },
  ];

  it('returns all foods for an empty query', () => {
    expect(searchFoods(foods, '')).toHaveLength(3);
    expect(searchFoods(foods, '   ')).toHaveLength(3);
  });

  it('case-insensitive substring match', () => {
    expect(searchFoods(foods, 'BRO').map((f) => f.name)).toEqual(['Broccoli', 'Brown rice']);
    expect(searchFoods(foods, 'rice').map((f) => f.name)).toEqual(['Brown rice']);
  });

  it('returns [] when nothing matches', () => {
    expect(searchFoods(foods, 'xyz')).toEqual([]);
  });
});

const SAMPLE_WEIGHT_ROW = {
  id: 'weight-1',
  user_id: 'user-1',
  weight_kg: 72.4,
  body_fat_pct: 18.5,
  logged_at: '2026-04-13T08:00:00.000Z',
  day_key: '2026-04-13',
  created_at: '2026-04-13T08:00:00.000Z',
};

describe('useAppStore.addWeight', () => {
  it('inserts via supabase and prepends the returned row to local state', async () => {
    signedIn('user-1');
    enqueue({ data: SAMPLE_WEIGHT_ROW, error: null });

    const entry = await useAppStore.getState().addWeight({
      weightKg: 72.4,
      bodyFatPct: 18.5,
    });

    expect(entry.id).toBe('weight-1');
    expect(entry.weightKg).toBe(72.4);
    expect(entry.bodyFatPct).toBe(18.5);

    const entries = useAppStore.getState().weightEntries;
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('weight-1');

    const insertCall = mock.__state.calls.find((c) => c.method === 'insert');
    expect(insertCall).toBeDefined();
    const payload = insertCall!.args[0] as Record<string, unknown>;
    expect(payload.user_id).toBe('user-1');
    expect(payload.weight_kg).toBe(72.4);
    expect(payload.body_fat_pct).toBe(18.5);
    expect(payload.day_key).toBeDefined();
  });

  it('persists null body fat when omitted', async () => {
    signedIn();
    enqueue({
      data: { ...SAMPLE_WEIGHT_ROW, body_fat_pct: null },
      error: null,
    });
    const entry = await useAppStore
      .getState()
      .addWeight({ weightKg: 72.4, bodyFatPct: null });
    expect(entry.bodyFatPct).toBeNull();
  });

  it('throws when not authenticated', async () => {
    await expect(
      useAppStore.getState().addWeight({ weightKg: 72, bodyFatPct: null })
    ).rejects.toThrow(/authenticated/i);
    expect(useAppStore.getState().weightEntries).toHaveLength(0);
  });

  it('throws supabase error and leaves local state untouched', async () => {
    signedIn();
    enqueue({ data: null, error: { message: 'rls denied' } });
    await expect(
      useAppStore.getState().addWeight({ weightKg: 72, bodyFatPct: null })
    ).rejects.toThrow('rls denied');
    expect(useAppStore.getState().weightEntries).toHaveLength(0);
  });
});

describe('useAppStore.removeWeight', () => {
  it('removes the weight from local state after supabase delete', async () => {
    useAppStore.setState({
      weightEntries: [
        {
          id: 'weight-1',
          weightKg: 72.4,
          bodyFatPct: 18.5,
          loggedAt: '2026-04-13T08:00:00.000Z',
          dayKey: '2026-04-13',
        },
      ],
    });
    enqueue({ data: null, error: null });
    await useAppStore.getState().removeWeight('weight-1');
    expect(useAppStore.getState().weightEntries).toHaveLength(0);
  });

  it('leaves local state untouched on supabase error', async () => {
    useAppStore.setState({
      weightEntries: [
        {
          id: 'weight-1',
          weightKg: 72.4,
          bodyFatPct: null,
          loggedAt: '2026-04-13T08:00:00.000Z',
          dayKey: '2026-04-13',
        },
      ],
    });
    enqueue({ data: null, error: { message: 'network down' } });
    await expect(useAppStore.getState().removeWeight('weight-1')).rejects.toThrow(
      'network down'
    );
    expect(useAppStore.getState().weightEntries).toHaveLength(1);
  });
});

describe('useAppStore.hydrate with weights', () => {
  it('loads weight entries alongside goals, entries, and foods', async () => {
    enqueue({ data: null, error: null }); // goals
    enqueue({ data: [], error: null }); // log_entries
    enqueue({ data: [], error: null }); // foods
    enqueue({
      data: [
        SAMPLE_WEIGHT_ROW,
        { ...SAMPLE_WEIGHT_ROW, id: 'weight-2', weight_kg: 72.1 },
      ],
      error: null,
    });

    await useAppStore.getState().hydrate('user-1');
    const weights = useAppStore.getState().weightEntries;
    expect(weights).toHaveLength(2);
    expect(weights[0].id).toBe('weight-1');
    expect(weights[0].weightKg).toBe(72.4);
    expect(weights[1].weightKg).toBe(72.1);
  });
});

describe('weight selectors', () => {
  const makeEntry = (overrides: Partial<WeightEntry>): WeightEntry => ({
    id: 'w-x',
    weightKg: 70,
    bodyFatPct: null,
    loggedAt: '2026-04-13T08:00:00.000Z',
    dayKey: '2026-04-13',
    ...overrides,
  });

  it('selectWeightHistory sorts newest first', () => {
    const unsorted: WeightEntry[] = [
      makeEntry({ id: 'a', loggedAt: '2026-04-10T08:00:00.000Z', weightKg: 73 }),
      makeEntry({ id: 'b', loggedAt: '2026-04-13T08:00:00.000Z', weightKg: 72.4 }),
      makeEntry({ id: 'c', loggedAt: '2026-04-12T08:00:00.000Z', weightKg: 72.8 }),
    ];
    const sorted = selectWeightHistory(unsorted);
    expect(sorted.map((w) => w.id)).toEqual(['b', 'c', 'a']);
  });

  it('selectLatestWeight returns null on empty', () => {
    expect(selectLatestWeight([])).toBeNull();
  });

  it('selectLatestWeight returns the most recent entry', () => {
    const entries: WeightEntry[] = [
      makeEntry({ id: 'a', loggedAt: '2026-04-10T08:00:00.000Z', weightKg: 73 }),
      makeEntry({ id: 'b', loggedAt: '2026-04-13T08:00:00.000Z', weightKg: 72.4 }),
    ];
    expect(selectLatestWeight(entries)?.id).toBe('b');
  });
});

describe('selectRecentFoods', () => {
  const food = (id: string, name: string): Food => ({
    id,
    name,
    servingSize: null,
    kcalPerServing: 100,
    proteinGPerServing: null,
    carbsGPerServing: null,
    fatGPerServing: null,
    barcode: null,
    source: 'manual',
    sourceId: null,
    createdAt: '',
    updatedAt: '',
  });

  const entry = (
    id: string,
    foodId: string | null,
    loggedAt: string
  ): MealEntry => ({
    id,
    name: 'x',
    calories: 100,
    proteinG: null,
    carbsG: null,
    fatG: null,
    loggedAt,
    dayKey: loggedAt.slice(0, 10),
    foodId,
    servings: 1,
  });

  it('returns recently-logged distinct foods, newest first', () => {
    const foods = [food('f-1', 'Apple'), food('f-2', 'Banana'), food('f-3', 'Carrot')];
    const entries = [
      entry('e-1', 'f-1', '2026-04-10T08:00:00Z'),
      entry('e-2', 'f-2', '2026-04-12T08:00:00Z'),
      entry('e-3', 'f-1', '2026-04-13T08:00:00Z'),
      entry('e-4', null, '2026-04-13T09:00:00Z'),
    ];
    const result = selectRecentFoods(entries, foods);
    expect(result.map((f) => f.id)).toEqual(['f-1', 'f-2']);
  });

  it('returns [] when no entries reference a food', () => {
    const foods = [food('f-1', 'Apple')];
    const entries = [entry('e-1', null, '2026-04-13T08:00:00Z')];
    expect(selectRecentFoods(entries, foods)).toEqual([]);
  });

  it('respects the limit', () => {
    const foods = Array.from({ length: 12 }, (_, i) => food(`f-${i}`, `n${i}`));
    const entries = foods.map((f, i) =>
      entry(`e-${i}`, f.id, `2026-04-${String(i + 1).padStart(2, '0')}T08:00:00Z`)
    );
    expect(selectRecentFoods(entries, foods, 3)).toHaveLength(3);
  });
});

describe('useAppStore.upsertFoodFromLookup', () => {
  const lookup: NormalizedFood = {
    source: 'usda',
    sourceId: '12345',
    name: 'Chicken breast',
    brand: 'Tyson',
    servingSize: '100 g',
    kcalPerServing: 165,
    proteinG: 31,
    carbsG: 0,
    fatG: 3.6,
    imageUrl: null,
  };

  it('returns existing food when (source, sourceId) already in state', async () => {
    const existing: Food = {
      id: 'food-1',
      name: 'Tyson — Chicken breast',
      servingSize: '100 g',
      kcalPerServing: 165,
      proteinGPerServing: 31,
      carbsGPerServing: 0,
      fatGPerServing: 3.6,
      barcode: null,
      source: 'usda',
      sourceId: '12345',
      createdAt: '',
      updatedAt: '',
    };
    useAppStore.setState({ foods: [existing] });

    const result = await useAppStore.getState().upsertFoodFromLookup(lookup);
    expect(result.id).toBe('food-1');
    expect(mock.__state.calls.find((c) => c.method === 'insert')).toBeUndefined();
  });

  it('inserts a new food when none matches', async () => {
    signedIn('user-1');
    enqueue({
      data: {
        id: 'food-2',
        user_id: 'user-1',
        name: 'Tyson — Chicken breast',
        serving_size: '100 g',
        kcal_per_serving: 165,
        protein_g_per_serving: 31,
        carbs_g_per_serving: 0,
        fat_g_per_serving: 3.6,
        barcode: null,
        source: 'usda',
        source_id: '12345',
        created_at: '2026-04-13T00:00:00.000Z',
        updated_at: '2026-04-13T00:00:00.000Z',
      },
      error: null,
    });

    const result = await useAppStore.getState().upsertFoodFromLookup(lookup);
    expect(result.id).toBe('food-2');
    expect(result.source).toBe('usda');
    expect(result.sourceId).toBe('12345');

    const insertCall = mock.__state.calls.find((c) => c.method === 'insert');
    expect(insertCall).toBeDefined();
    const payload = insertCall!.args[0] as Record<string, unknown>;
    expect(payload.source).toBe('usda');
    expect(payload.source_id).toBe('12345');
    expect(payload.name).toBe('Tyson — Chicken breast');
  });
});
