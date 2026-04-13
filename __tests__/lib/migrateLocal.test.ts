type QueryResult = { data: unknown; error: { message: string } | null };

const mockAsyncStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockAsyncStore.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockAsyncStore.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockAsyncStore.delete(key);
    }),
  },
}));

jest.mock('@/lib/supabase', () => {
  const state = {
    queue: [] as QueryResult[],
    lastInsertPayload: null as unknown,
  };
  return {
    __esModule: true,
    __state: state,
    supabase: {
      from: jest.fn(() => {
        const builder: Record<string, unknown> = {};
        builder.insert = jest.fn(async (payload: unknown) => {
          state.lastInsertPayload = payload;
          return state.queue.shift() ?? { data: null, error: null };
        });
        return builder;
      }),
    },
  };
});

import * as supabaseMock from '@/lib/supabase';
import { migrateLegacyEntries } from '@/lib/migrateLocal';

const mock = supabaseMock as unknown as {
  __state: {
    queue: QueryResult[];
    lastInsertPayload: unknown;
  };
};

const LEGACY_KEY = 'caltrack-store';
const DONE_KEY = 'caltrack-v2-migrated';

function legacyBlob(entries: unknown[]): string {
  return JSON.stringify({ state: { entries, goals: null }, version: 1 });
}

beforeEach(() => {
  mockAsyncStore.clear();
  mock.__state.queue = [];
  mock.__state.lastInsertPayload = null;
});

describe('migrateLegacyEntries', () => {
  it('skips when migration is already marked done', async () => {
    mockAsyncStore.set(DONE_KEY, 'true');
    mockAsyncStore.set(
      LEGACY_KEY,
      legacyBlob([
        {
          id: '1',
          name: 'Oats',
          calories: 320,
          proteinG: null,
          carbsG: null,
          fatG: null,
          loggedAt: '2026-04-12T08:00:00.000Z',
          dayKey: '2026-04-12',
        },
      ])
    );
    const result = await migrateLegacyEntries('user-1');
    expect(result).toEqual({ migrated: 0, skipped: 'already-done' });
    expect(mockAsyncStore.get(LEGACY_KEY)).toBeDefined();
  });

  it('marks done when no legacy blob exists', async () => {
    const result = await migrateLegacyEntries('user-1');
    expect(result).toEqual({ migrated: 0, skipped: 'no-legacy' });
    expect(mockAsyncStore.get(DONE_KEY)).toBe('true');
  });

  it('marks done and clears when legacy blob has no entries', async () => {
    mockAsyncStore.set(LEGACY_KEY, legacyBlob([]));
    const result = await migrateLegacyEntries('user-1');
    expect(result).toEqual({ migrated: 0, skipped: 'empty' });
    expect(mockAsyncStore.get(DONE_KEY)).toBe('true');
    expect(mockAsyncStore.has(LEGACY_KEY)).toBe(false);
  });

  it('marks done when legacy JSON is malformed', async () => {
    mockAsyncStore.set(LEGACY_KEY, '{not-json');
    const result = await migrateLegacyEntries('user-1');
    expect(result).toEqual({ migrated: 0, skipped: 'malformed' });
    expect(mockAsyncStore.get(DONE_KEY)).toBe('true');
  });

  it('uploads valid entries, clears legacy, and marks done', async () => {
    mockAsyncStore.set(
      LEGACY_KEY,
      legacyBlob([
        {
          id: '1',
          name: '  Oats  ',
          calories: 320,
          proteinG: 12,
          carbsG: 55,
          fatG: 6,
          loggedAt: '2026-04-12T08:00:00.000Z',
          dayKey: '2026-04-12',
        },
        {
          id: '2',
          name: 'Sandwich',
          calories: 450,
          proteinG: null,
          carbsG: null,
          fatG: null,
          loggedAt: '2026-04-12T13:00:00.000Z',
          dayKey: '2026-04-12',
        },
      ])
    );
    mock.__state.queue.push({ data: null, error: null });

    const result = await migrateLegacyEntries('user-1');
    expect(result).toEqual({ migrated: 2, skipped: null });
    expect(mockAsyncStore.has(LEGACY_KEY)).toBe(false);
    expect(mockAsyncStore.get(DONE_KEY)).toBe('true');

    const payload = mock.__state.lastInsertPayload as Array<Record<string, unknown>>;
    expect(payload).toHaveLength(2);
    expect(payload[0]).toMatchObject({
      user_id: 'user-1',
      name: 'Oats',
      kcal: 320,
      protein_g: 12,
      carbs_g: 55,
      fat_g: 6,
      logged_at: '2026-04-12T08:00:00.000Z',
      day_key: '2026-04-12',
    });
    expect(payload[1]).toMatchObject({
      user_id: 'user-1',
      name: 'Sandwich',
      protein_g: null,
    });
  });

  it('throws and does not mark done when supabase insert fails', async () => {
    mockAsyncStore.set(
      LEGACY_KEY,
      legacyBlob([
        {
          id: '1',
          name: 'Oats',
          calories: 320,
          proteinG: null,
          carbsG: null,
          fatG: null,
          loggedAt: '2026-04-12T08:00:00.000Z',
          dayKey: '2026-04-12',
        },
      ])
    );
    mock.__state.queue.push({ data: null, error: { message: 'rls denied' } });

    await expect(migrateLegacyEntries('user-1')).rejects.toThrow(/rls denied/);
    expect(mockAsyncStore.get(DONE_KEY)).toBeUndefined();
    expect(mockAsyncStore.get(LEGACY_KEY)).toBeDefined();
  });

  it('skips entries with malformed shapes but keeps valid ones', async () => {
    mockAsyncStore.set(
      LEGACY_KEY,
      legacyBlob([
        { id: 'x', name: 'no-calories' },
        {
          id: '1',
          name: 'Oats',
          calories: 320,
          proteinG: null,
          carbsG: null,
          fatG: null,
          loggedAt: '2026-04-12T08:00:00.000Z',
          dayKey: '2026-04-12',
        },
      ])
    );
    mock.__state.queue.push({ data: null, error: null });

    const result = await migrateLegacyEntries('user-1');
    expect(result.migrated).toBe(1);
    const payload = mock.__state.lastInsertPayload as Array<Record<string, unknown>>;
    expect(payload).toHaveLength(1);
    expect(payload[0].name).toBe('Oats');
  });
});
