import { inferMealType, MEAL_TYPE_ORDER } from '@/lib/mealType';

/**
 * The bucket boundaries are evaluated in LOCAL time. We construct dates using
 * `new Date(year, month, day, hour)` which is local-time, then pass the iso to
 * `inferMealType` which re-extracts the local hour via `Date#getHours()`.
 */
function localIso(hour: number): string {
  return new Date(2026, 3, 15, hour, 0, 0).toISOString();
}

describe('inferMealType', () => {
  it('classifies 4am as breakfast (inclusive lower edge)', () => {
    expect(inferMealType(localIso(4))).toBe('breakfast');
  });

  it('classifies 9:59am as breakfast (just before exclusive upper edge)', () => {
    const iso = new Date(2026, 3, 15, 9, 59, 0).toISOString();
    expect(inferMealType(iso)).toBe('breakfast');
  });

  it('classifies 10am as lunch (inclusive lower edge)', () => {
    expect(inferMealType(localIso(10))).toBe('lunch');
  });

  it('classifies 14:59 as lunch (just before exclusive upper edge)', () => {
    const iso = new Date(2026, 3, 15, 14, 59, 0).toISOString();
    expect(inferMealType(iso)).toBe('lunch');
  });

  it('classifies 3pm as dinner (inclusive lower edge)', () => {
    expect(inferMealType(localIso(15))).toBe('dinner');
  });

  it('classifies 8:59pm as dinner (just before exclusive upper edge)', () => {
    const iso = new Date(2026, 3, 15, 20, 59, 0).toISOString();
    expect(inferMealType(iso)).toBe('dinner');
  });

  it('classifies 9pm as snacks (everything outside the meal windows)', () => {
    expect(inferMealType(localIso(21))).toBe('snacks');
  });

  it('classifies midnight as snacks', () => {
    expect(inferMealType(localIso(0))).toBe('snacks');
  });

  it('classifies 3:59am as snacks (still before breakfast window)', () => {
    const iso = new Date(2026, 3, 15, 3, 59, 0).toISOString();
    expect(inferMealType(iso)).toBe('snacks');
  });
});

describe('MEAL_TYPE_ORDER', () => {
  it('lists meal types in canonical display order', () => {
    expect(MEAL_TYPE_ORDER).toEqual(['breakfast', 'lunch', 'dinner', 'snacks']);
  });
});
