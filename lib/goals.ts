import type { Goals } from '@/types';
import { COPY } from '@/lib/copy';

export interface GoalsDraft {
  calorieGoal: string;
  proteinGoalG: string;
  carbsGoalG: string;
  fatGoalG: string;
}

export interface GoalsValidation {
  errors: Partial<Record<keyof GoalsDraft, string>>;
  parsed: Goals | null;
}

export function goalsToDraft(goals: Goals): GoalsDraft {
  return {
    calorieGoal: String(goals.calorieGoal),
    proteinGoalG: goals.proteinGoalG == null ? '' : String(goals.proteinGoalG),
    carbsGoalG: goals.carbsGoalG == null ? '' : String(goals.carbsGoalG),
    fatGoalG: goals.fatGoalG == null ? '' : String(goals.fatGoalG),
  };
}

export function validateGoalsDraft(draft: GoalsDraft): GoalsValidation {
  const errors: Partial<Record<keyof GoalsDraft, string>> = {};

  const calorieNum = Number(draft.calorieGoal);
  if (draft.calorieGoal.trim() === '') {
    errors.calorieGoal = COPY.profile.goals.required;
  } else if (!Number.isFinite(calorieNum) || calorieNum <= 0) {
    errors.calorieGoal = COPY.profile.goals.mustBePositive;
  }

  const parseOptional = (raw: string, key: keyof GoalsDraft): number | null => {
    if (raw.trim() === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      errors[key] = COPY.profile.goals.mustBeNonNegative;
      return null;
    }
    return n;
  };

  const proteinGoalG = parseOptional(draft.proteinGoalG, 'proteinGoalG');
  const carbsGoalG = parseOptional(draft.carbsGoalG, 'carbsGoalG');
  const fatGoalG = parseOptional(draft.fatGoalG, 'fatGoalG');

  if (Object.keys(errors).length > 0) {
    return { errors, parsed: null };
  }

  return {
    errors,
    parsed: {
      calorieGoal: calorieNum,
      proteinGoalG,
      carbsGoalG,
      fatGoalG,
    },
  };
}
