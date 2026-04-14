import type { NewWeightInput } from '@/types';

export interface WeightDraft {
  weightKg: string;
  bodyFatPct: string;
}

export interface WeightValidation {
  errors: Partial<Record<keyof WeightDraft, string>>;
  parsed: NewWeightInput | null;
}

export const EMPTY_WEIGHT_DRAFT: WeightDraft = {
  weightKg: '',
  bodyFatPct: '',
};

export function validateWeightDraft(draft: WeightDraft): WeightValidation {
  const errors: Partial<Record<keyof WeightDraft, string>> = {};

  const weightRaw = draft.weightKg.trim();
  const weightNum = Number(weightRaw);
  if (weightRaw === '') {
    errors.weightKg = 'Weight is required';
  } else if (!Number.isFinite(weightNum) || weightNum <= 0) {
    errors.weightKg = 'Must be a positive number';
  } else if (weightNum > 635) {
    // sanity: heaviest human on record ~635kg
    errors.weightKg = 'Must be realistic';
  }

  let bodyFatPct: number | null = null;
  const bfRaw = draft.bodyFatPct.trim();
  if (bfRaw !== '') {
    const bfNum = Number(bfRaw);
    if (!Number.isFinite(bfNum) || bfNum < 0 || bfNum > 100) {
      errors.bodyFatPct = 'Must be between 0 and 100';
    } else {
      bodyFatPct = bfNum;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors, parsed: null };
  }

  return {
    errors,
    parsed: {
      weightKg: weightNum,
      bodyFatPct,
    },
  };
}

export function formatWeight(kg: number): string {
  return `${kg.toFixed(1)} kg`;
}
