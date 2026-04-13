import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MealEntry, NewMealInput, Goals, DailyTotals } from '@/types';
import { dayKey, todayKey } from './date';

export interface AppState {
  entries: MealEntry[];
  goals: Goals;
  addEntry: (input: NewMealInput) => void;
  removeEntry: (id: string) => void;
  updateGoals: (goals: Partial<Goals>) => void;
  clearAll: () => void;
}

export const DEFAULT_GOALS: Goals = {
  calorieGoal: 2000,
  proteinGoalG: null,
  carbsGoalG: null,
  fatGoalG: null,
};

let _idCounter = 0;
function generateId(): string {
  _idCounter += 1;
  return `meal_${Date.now()}_${_idCounter}`;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      entries: [],
      goals: DEFAULT_GOALS,
      addEntry: (input) =>
        set((state) => {
          const now = new Date();
          const entry: MealEntry = {
            id: generateId(),
            name: input.name.trim(),
            calories: input.calories,
            proteinG: input.proteinG,
            carbsG: input.carbsG,
            fatG: input.fatG,
            loggedAt: now.toISOString(),
            dayKey: dayKey(now),
          };
          return { entries: [...state.entries, entry] };
        }),
      removeEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        })),
      updateGoals: (goals) =>
        set((state) => ({
          goals: { ...state.goals, ...goals },
        })),
      clearAll: () => set({ entries: [], goals: DEFAULT_GOALS }),
    }),
    {
      name: 'caltrack-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);

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
