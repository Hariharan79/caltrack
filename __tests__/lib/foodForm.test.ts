import {
  EMPTY_FOOD_DRAFT,
  foodToDraft,
  validateFoodDraft,
} from '@/lib/foodForm';
import type { Food } from '@/types';

const SAMPLE_FOOD: Food = {
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
};

describe('foodToDraft', () => {
  it('converts numeric fields to strings and preserves nulls as empty strings', () => {
    const draft = foodToDraft(SAMPLE_FOOD);
    expect(draft.name).toBe('Chicken breast');
    expect(draft.servingSize).toBe('100 g');
    expect(draft.kcalPerServing).toBe('165');
    expect(draft.proteinGPerServing).toBe('31');
    expect(draft.carbsGPerServing).toBe('0');
    expect(draft.fatGPerServing).toBe('3.6');
  });

  it('renders null servingSize and null macros as empty strings', () => {
    const draft = foodToDraft({
      ...SAMPLE_FOOD,
      servingSize: null,
      proteinGPerServing: null,
      carbsGPerServing: null,
      fatGPerServing: null,
    });
    expect(draft.servingSize).toBe('');
    expect(draft.proteinGPerServing).toBe('');
    expect(draft.carbsGPerServing).toBe('');
    expect(draft.fatGPerServing).toBe('');
  });
});

describe('validateFoodDraft', () => {
  it('rejects an empty draft with name + calories errors', () => {
    const result = validateFoodDraft(EMPTY_FOOD_DRAFT);
    expect(result.parsed).toBeNull();
    expect(result.errors.name).toBeDefined();
    expect(result.errors.kcalPerServing).toBeDefined();
  });

  it('rejects zero and negative kcal', () => {
    const result = validateFoodDraft({
      ...EMPTY_FOOD_DRAFT,
      name: 'Oats',
      kcalPerServing: '0',
    });
    expect(result.parsed).toBeNull();
    expect(result.errors.kcalPerServing).toBeDefined();
  });

  it('accepts valid draft with optional macros left blank', () => {
    const result = validateFoodDraft({
      name: '  Apple  ',
      servingSize: '1 medium',
      kcalPerServing: '95',
      proteinGPerServing: '',
      carbsGPerServing: '25',
      fatGPerServing: '',
    });
    expect(result.errors).toEqual({});
    expect(result.parsed).toEqual({
      name: 'Apple',
      servingSize: '1 medium',
      kcalPerServing: 95,
      proteinGPerServing: null,
      carbsGPerServing: 25,
      fatGPerServing: null,
    });
  });

  it('rejects negative macros', () => {
    const result = validateFoodDraft({
      name: 'Bad',
      servingSize: '',
      kcalPerServing: '100',
      proteinGPerServing: '-5',
      carbsGPerServing: '',
      fatGPerServing: '',
    });
    expect(result.parsed).toBeNull();
    expect(result.errors.proteinGPerServing).toBeDefined();
  });

  it('normalizes empty serving size to null', () => {
    const result = validateFoodDraft({
      name: 'Rice',
      servingSize: '   ',
      kcalPerServing: '200',
      proteinGPerServing: '',
      carbsGPerServing: '',
      fatGPerServing: '',
    });
    expect(result.parsed?.servingSize).toBeNull();
  });
});
