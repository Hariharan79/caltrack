/**
 * Pure helper: bucket an ISO timestamp into a meal type by local hour.
 *
 * Buckets (local time):
 *  - breakfast: 04:00–09:59 (4 ≤ h < 10)
 *  - lunch:     10:00–14:59 (10 ≤ h < 15)
 *  - dinner:    15:00–20:59 (15 ≤ h < 21)
 *  - snacks:    everything else (21:00–03:59)
 */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export function inferMealType(isoString: string): MealType {
  const d = new Date(isoString);
  const h = d.getHours();
  if (h >= 4 && h < 10) return 'breakfast';
  if (h >= 10 && h < 15) return 'lunch';
  if (h >= 15 && h < 21) return 'dinner';
  return 'snacks';
}

export const MEAL_TYPE_ORDER: readonly MealType[] = [
  'breakfast',
  'lunch',
  'dinner',
  'snacks',
] as const;
