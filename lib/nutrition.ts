/**
 * Macro-vs-calories "bullshit detector" (F-20, Phase 13).
 *
 * Pure functions only. Keep free of any store / supabase imports so these
 * modules stay safe to call from any test or component context.
 *
 * See DECISIONS.md D-20 (original tolerance) and D-29 (severity cutoffs).
 */

export interface MacroSanityInput {
  calories: number;
  proteinG: number | null | undefined;
  carbsG: number | null | undefined;
  fatG: number | null | undefined;
}

export interface MacroSanityResult {
  ok: boolean;
  severity: 'ok' | 'mild' | 'blatant';
  impliedKcal: number;
  deltaKcal: number;
  deltaRatio: number;
}

interface KcalFromMacrosInput {
  proteinG: number | null | undefined;
  carbsG: number | null | undefined;
  fatG: number | null | undefined;
}

const KCAL_PER_G_PROTEIN = 4;
const KCAL_PER_G_CARBS = 4;
const KCAL_PER_G_FAT = 9;

const ABSOLUTE_TOLERANCE_KCAL = 25;
const RELATIVE_TOLERANCE = 0.15;
const BLATANT_RATIO_CUTOFF = 0.3;

/**
 * Coerce a possibly-null/undefined/NaN macro value to a safe number.
 * Negative values are clamped to 0 (defensive — macros below zero have
 * no physical meaning, so we ignore them rather than produce a negative
 * implied kcal).
 */
function safeMacro(value: number | null | undefined): number {
  if (value == null) return 0;
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  return value;
}

/**
 * Implied calories from the standard Atwater factors:
 *   4·protein + 4·carbs + 9·fat
 *
 * Undefined / null / NaN macros are treated as 0. If all macros are
 * absent or zero, returns 0.
 */
export function kcalFromMacros(input: KcalFromMacrosInput): number {
  const p = safeMacro(input.proteinG);
  const c = safeMacro(input.carbsG);
  const f = safeMacro(input.fatG);
  return p * KCAL_PER_G_PROTEIN + c * KCAL_PER_G_CARBS + f * KCAL_PER_G_FAT;
}

/**
 * Compare claimed calories against implied calories from macros and
 * return a severity bucket.
 *
 * Tolerance: `max(25 kcal, 15% of claimed)`
 * Severity:
 *   - `ok`      if `|delta| <= tolerance`
 *   - `mild`    if `deltaRatio <= 0.30` (but outside tolerance)
 *   - `blatant` otherwise
 *
 * Edge cases:
 *   - All-zero food (calories === 0 and all macros zero) → ok.
 *   - All macros missing (null/undefined) → ok. Not enough info to flag.
 *   - Negative claimed calories are clamped to 0 (defensive).
 *   - NaN / non-finite claimed calories are treated as 0.
 */
export function checkMacroSanity(input: MacroSanityInput): MacroSanityResult {
  const rawCalories = input.calories;
  const claimedKcal =
    !Number.isFinite(rawCalories) || rawCalories < 0 ? 0 : rawCalories;

  const allMacrosMissing =
    input.proteinG == null && input.carbsG == null && input.fatG == null;

  const impliedKcal = kcalFromMacros({
    proteinG: input.proteinG,
    carbsG: input.carbsG,
    fatG: input.fatG,
  });

  const deltaKcal = Math.abs(claimedKcal - impliedKcal);
  const deltaRatio = claimedKcal > 0 ? deltaKcal / claimedKcal : 0;

  // Blank food template: no calories and no macros → nothing to flag.
  if (claimedKcal === 0 && impliedKcal === 0) {
    return {
      ok: true,
      severity: 'ok',
      impliedKcal,
      deltaKcal,
      deltaRatio,
    };
  }

  // Calories present but no macros listed at all → not enough info to judge.
  if (allMacrosMissing) {
    return {
      ok: true,
      severity: 'ok',
      impliedKcal,
      deltaKcal,
      deltaRatio,
    };
  }

  const tolerance = Math.max(
    ABSOLUTE_TOLERANCE_KCAL,
    RELATIVE_TOLERANCE * claimedKcal,
  );

  if (deltaKcal <= tolerance) {
    return {
      ok: true,
      severity: 'ok',
      impliedKcal,
      deltaKcal,
      deltaRatio,
    };
  }

  if (deltaRatio <= BLATANT_RATIO_CUTOFF) {
    return {
      ok: false,
      severity: 'mild',
      impliedKcal,
      deltaKcal,
      deltaRatio,
    };
  }

  return {
    ok: false,
    severity: 'blatant',
    impliedKcal,
    deltaKcal,
    deltaRatio,
  };
}
