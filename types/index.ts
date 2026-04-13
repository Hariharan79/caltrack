export interface FoodEntry {
  id: string;
  userId: string;
  foodName: string;
  calories: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  loggedAt: string;
  source: 'nutritionix' | 'local_db' | 'manual';
}

export interface UserProfile {
  id: string;
  calorieGoal: number;
  proteinGoalG: number | null;
  carbsGoalG: number | null;
  fatGoalG: number | null;
  createdAt: string;
}

export interface DailyTotals {
  date: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  entryCount: number;
}

export type TabName = 'index' | 'history' | 'profile';
