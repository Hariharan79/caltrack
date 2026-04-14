import type { NewWeightInput } from '@/types';
import { COPY } from '@/lib/copy';

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
    errors.weightKg = COPY.profile.weight.required;
  } else if (!Number.isFinite(weightNum) || weightNum <= 0) {
    errors.weightKg = COPY.profile.weight.mustBePositive;
  } else if (weightNum > 635) {
    // sanity: heaviest human on record ~635kg
    errors.weightKg = COPY.profile.weight.mustBeRealistic;
  }

  let bodyFatPct: number | null = null;
  const bfRaw = draft.bodyFatPct.trim();
  if (bfRaw !== '') {
    const bfNum = Number(bfRaw);
    if (!Number.isFinite(bfNum) || bfNum < 0 || bfNum > 100) {
      errors.bodyFatPct = COPY.profile.weight.bodyFatRange;
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
