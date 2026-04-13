jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { goalsToDraft, validateGoalsDraft } from '@/lib/goals';
import { DEFAULT_GOALS } from '@/lib/store';

describe('goalsToDraft', () => {
  it('converts numbers to strings and nulls to empty strings', () => {
    const draft = goalsToDraft({
      calorieGoal: 2000,
      proteinGoalG: 150,
      carbsGoalG: null,
      fatGoalG: null,
    });
    expect(draft).toEqual({
      calorieGoal: '2000',
      proteinGoalG: '150',
      carbsGoalG: '',
      fatGoalG: '',
    });
  });

  it('handles default goals', () => {
    const draft = goalsToDraft(DEFAULT_GOALS);
    expect(draft.calorieGoal).toBe('2000');
    expect(draft.proteinGoalG).toBe('');
  });
});

describe('validateGoalsDraft', () => {
  const empty = { calorieGoal: '', proteinGoalG: '', carbsGoalG: '', fatGoalG: '' };

  it('rejects empty calorie goal', () => {
    const r = validateGoalsDraft(empty);
    expect(r.errors.calorieGoal).toBeDefined();
    expect(r.parsed).toBeNull();
  });

  it('rejects zero calorie goal', () => {
    const r = validateGoalsDraft({ ...empty, calorieGoal: '0' });
    expect(r.errors.calorieGoal).toBeDefined();
  });

  it('rejects negative calorie goal', () => {
    const r = validateGoalsDraft({ ...empty, calorieGoal: '-100' });
    expect(r.errors.calorieGoal).toBeDefined();
  });

  it('rejects non-numeric calorie goal', () => {
    const r = validateGoalsDraft({ ...empty, calorieGoal: 'two thousand' });
    expect(r.errors.calorieGoal).toBeDefined();
  });

  it('rejects negative macros', () => {
    const r = validateGoalsDraft({ ...empty, calorieGoal: '2000', proteinGoalG: '-1' });
    expect(r.errors.proteinGoalG).toBeDefined();
  });

  it('accepts a calorie-only draft, leaves macros null', () => {
    const r = validateGoalsDraft({ ...empty, calorieGoal: '1800' });
    expect(r.errors).toEqual({});
    expect(r.parsed).toEqual({
      calorieGoal: 1800,
      proteinGoalG: null,
      carbsGoalG: null,
      fatGoalG: null,
    });
  });

  it('accepts a fully populated draft', () => {
    const r = validateGoalsDraft({
      calorieGoal: '2200',
      proteinGoalG: '160',
      carbsGoalG: '250',
      fatGoalG: '70',
    });
    expect(r.parsed).toEqual({
      calorieGoal: 2200,
      proteinGoalG: 160,
      carbsGoalG: 250,
      fatGoalG: 70,
    });
  });

  it('accepts zero for optional macros (means "track me, but no target")', () => {
    const r = validateGoalsDraft({ ...empty, calorieGoal: '2000', carbsGoalG: '0' });
    expect(r.parsed?.carbsGoalG).toBe(0);
  });
});
