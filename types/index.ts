export interface MealEntry {
  id: string;
  name: string;
  calories: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  loggedAt: string;
  dayKey: string;
}

export type NewMealInput = Omit<MealEntry, 'id' | 'loggedAt' | 'dayKey'>;

export interface Goals {
  calorieGoal: number;
  proteinGoalG: number | null;
  carbsGoalG: number | null;
  fatGoalG: number | null;
}

export interface DailyTotals {
  dayKey: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  entryCount: number;
}

export type TabName = 'index' | 'history' | 'profile';
