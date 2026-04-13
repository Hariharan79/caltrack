import { create } from 'zustand';
import type { MealEntry, NewMealInput, Goals, DailyTotals } from '@/types';
import type { Database } from '../types/db';
import { dayKey, todayKey } from './date';
import { supabase } from './supabase';

type LogEntryRow = Database['public']['Tables']['log_entries']['Row'];
type GoalsRow = Database['public']['Tables']['goals']['Row'];

export interface AppState {
  entries: MealEntry[];
  goals: Goals;
  hydrated: boolean;
  hydrating: boolean;
  error: string | null;
  hydrate: (userId: string) => Promise<void>;
  reset: () => void;
  addEntry: (input: NewMealInput) => Promise<MealEntry>;
  removeEntry: (id: string) => Promise<void>;
  updateGoals: (patch: Partial<Goals>) => Promise<void>;
  clearAll: () => void;
}

export const DEFAULT_GOALS: Goals = {
  calorieGoal: 2000,
  proteinGoalG: null,
  carbsGoalG: null,
  fatGoalG: null,
};

const INITIAL_STATE = {
  entries: [] as MealEntry[],
  goals: DEFAULT_GOALS,
  hydrated: false,
  hydrating: false,
  error: null as string | null,
};

function rowToEntry(row: LogEntryRow): MealEntry {
  return {
    id: row.id,
    name: row.name,
    calories: Number(row.kcal),
    proteinG: row.protein_g === null ? null : Number(row.protein_g),
    carbsG: row.carbs_g === null ? null : Number(row.carbs_g),
    fatG: row.fat_g === null ? null : Number(row.fat_g),
    loggedAt: row.logged_at,
    dayKey: row.day_key,
  };
}

function rowToGoals(row: GoalsRow): Goals {
  return {
    calorieGoal: row.kcal_goal,
    proteinGoalG: row.protein_goal_g,
    carbsGoalG: row.carbs_goal_g,
    fatGoalG: row.fat_goal_g,
  };
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const userId = data.session?.user.id;
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

export const useAppStore = create<AppState>()((set, get) => ({
  ...INITIAL_STATE,

  hydrate: async (userId: string) => {
    set({ hydrating: true, error: null });
    try {
      const [goalsRes, entriesRes] = await Promise.all([
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', userId)
          .order('set_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('log_entries')
          .select('*')
          .eq('user_id', userId)
          .order('logged_at', { ascending: false }),
      ]);

      if (goalsRes.error) throw new Error(goalsRes.error.message);
      if (entriesRes.error) throw new Error(entriesRes.error.message);

      set({
        goals: goalsRes.data ? rowToGoals(goalsRes.data) : DEFAULT_GOALS,
        entries: (entriesRes.data ?? []).map(rowToEntry),
        hydrated: true,
        hydrating: false,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Hydration failed';
      set({ hydrating: false, error: message });
      throw err;
    }
  },

  reset: () => set({ ...INITIAL_STATE }),

  addEntry: async (input) => {
    const userId = await requireUserId();
    const now = new Date();
    const { data, error } = await supabase
      .from('log_entries')
      .insert({
        user_id: userId,
        name: input.name.trim(),
        kcal: input.calories,
        protein_g: input.proteinG,
        carbs_g: input.carbsG,
        fat_g: input.fatG,
        logged_at: now.toISOString(),
        day_key: dayKey(now),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Insert returned no row');

    const entry = rowToEntry(data);
    set((state) => ({ entries: [entry, ...state.entries] }));
    return entry;
  },

  removeEntry: async (id) => {
    const { error } = await supabase.from('log_entries').delete().eq('id', id);
    if (error) throw new Error(error.message);
    set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
  },

  updateGoals: async (patch) => {
    const userId = await requireUserId();
    const merged: Goals = { ...get().goals, ...patch };
    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        kcal_goal: merged.calorieGoal,
        protein_goal_g: merged.proteinGoalG,
        carbs_goal_g: merged.carbsGoalG,
        fat_goal_g: merged.fatGoalG,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Insert returned no row');

    set({ goals: rowToGoals(data) });
  },

  clearAll: () => set({ ...INITIAL_STATE }),
}));

export function selectTodayEntries(entries: readonly MealEntry[]): MealEntry[] {
  const today = todayKey();
  return entries
    .filter((e) => e.dayKey === today)
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
}

export function computeDailyTotals(
  entries: readonly MealEntry[],
  targetDayKey: string
): DailyTotals {
  const dayEntries = entries.filter((e) => e.dayKey === targetDayKey);
  return dayEntries.reduce<DailyTotals>(
    (acc, e) => ({
      dayKey: targetDayKey,
      calories: acc.calories + e.calories,
      proteinG: acc.proteinG + (e.proteinG ?? 0),
      carbsG: acc.carbsG + (e.carbsG ?? 0),
      fatG: acc.fatG + (e.fatG ?? 0),
      entryCount: acc.entryCount + 1,
    }),
    {
      dayKey: targetDayKey,
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      entryCount: 0,
    }
  );
}

export function selectTodayTotals(entries: readonly MealEntry[]): DailyTotals {
  return computeDailyTotals(entries, todayKey());
}

export interface HistoryDay {
  totals: DailyTotals;
  entries: MealEntry[];
}

export function selectHistory(entries: readonly MealEntry[]): HistoryDay[] {
  const today = todayKey();
  const byDay = new Map<string, MealEntry[]>();
  for (const entry of entries) {
    if (entry.dayKey === today) continue;
    const existing = byDay.get(entry.dayKey);
    if (existing) {
      existing.push(entry);
    } else {
      byDay.set(entry.dayKey, [entry]);
    }
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, dayEntries]) => ({
      totals: computeDailyTotals(dayEntries, key),
      entries: [...dayEntries].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)),
    }));
}
