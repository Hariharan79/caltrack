export interface MealEntry {
  id: string;
  name: string;
  calories: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  loggedAt: string;
  dayKey: string;
  foodId: string | null;
  servings: number;
}

export interface NewMealInput {
  name: string;
  calories: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  foodId?: string | null;
  servings?: number;
}

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

export interface Food {
  id: string;
  name: string;
  servingSize: string | null;
  kcalPerServing: number;
  proteinGPerServing: number | null;
  carbsGPerServing: number | null;
  fatGPerServing: number | null;
  barcode: string | null;
  source: string;
  sourceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewFoodInput {
  name: string;
  servingSize: string | null;
  kcalPerServing: number;
  proteinGPerServing: number | null;
  carbsGPerServing: number | null;
  fatGPerServing: number | null;
  source?: string;
  sourceId?: string | null;
  barcode?: string | null;
}

export type FoodUpdateInput = Partial<NewFoodInput>;

export interface WeightEntry {
  id: string;
  weightKg: number;
  bodyFatPct: number | null;
  loggedAt: string;
  dayKey: string;
}

export type NewWeightInput = Omit<WeightEntry, 'id' | 'loggedAt' | 'dayKey'>;
