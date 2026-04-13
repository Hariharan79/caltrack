import type { Food, NewFoodInput } from '@/types';

export interface FoodDraft {
  name: string;
  servingSize: string;
  kcalPerServing: string;
  proteinGPerServing: string;
  carbsGPerServing: string;
  fatGPerServing: string;
}

export interface FoodValidation {
  errors: Partial<Record<keyof FoodDraft, string>>;
  parsed: NewFoodInput | null;
}

export const EMPTY_FOOD_DRAFT: FoodDraft = {
  name: '',
  servingSize: '',
  kcalPerServing: '',
  proteinGPerServing: '',
  carbsGPerServing: '',
  fatGPerServing: '',
};

export function foodToDraft(food: Food): FoodDraft {
  return {
    name: food.name,
    servingSize: food.servingSize ?? '',
    kcalPerServing: String(food.kcalPerServing),
    proteinGPerServing:
      food.proteinGPerServing == null ? '' : String(food.proteinGPerServing),
    carbsGPerServing:
      food.carbsGPerServing == null ? '' : String(food.carbsGPerServing),
    fatGPerServing: food.fatGPerServing == null ? '' : String(food.fatGPerServing),
  };
}

export function validateFoodDraft(draft: FoodDraft): FoodValidation {
  const errors: Partial<Record<keyof FoodDraft, string>> = {};

  const name = draft.name.trim();
  if (!name) {
    errors.name = 'Name is required';
  }

  const kcalNum = Number(draft.kcalPerServing);
  if (draft.kcalPerServing.trim() === '') {
    errors.kcalPerServing = 'Calories per serving is required';
  } else if (!Number.isFinite(kcalNum) || kcalNum <= 0) {
    errors.kcalPerServing = 'Must be a positive number';
  }

  const parseOptional = (raw: string, key: keyof FoodDraft): number | null => {
    if (raw.trim() === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      errors[key] = 'Must be ≥ 0';
      return null;
    }
    return n;
  };

  const proteinGPerServing = parseOptional(draft.proteinGPerServing, 'proteinGPerServing');
  const carbsGPerServing = parseOptional(draft.carbsGPerServing, 'carbsGPerServing');
  const fatGPerServing = parseOptional(draft.fatGPerServing, 'fatGPerServing');

  if (Object.keys(errors).length > 0) {
    return { errors, parsed: null };
  }

  const servingSize = draft.servingSize.trim();

  return {
    errors,
    parsed: {
      name,
      servingSize: servingSize === '' ? null : servingSize,
      kcalPerServing: kcalNum,
      proteinGPerServing,
      carbsGPerServing,
      fatGPerServing,
    },
  };
}
