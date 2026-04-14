import { kcalFromMacros, checkMacroSanity } from '@/lib/nutrition';

describe('kcalFromMacros', () => {
  it('computes kcal via 4P + 4C + 9F', () => {
    expect(kcalFromMacros({ proteinG: 10, carbsG: 20, fatG: 5 })).toBe(
      10 * 4 + 20 * 4 + 5 * 9,
    );
  });

  it('treats undefined macros as 0', () => {
    expect(
      kcalFromMacros({ proteinG: undefined, carbsG: undefined, fatG: undefined }),
    ).toBe(0);
  });

  it('treats null macros as 0', () => {
    expect(kcalFromMacros({ proteinG: null, carbsG: null, fatG: null })).toBe(0);
  });

  it('treats NaN macros as 0', () => {
    expect(kcalFromMacros({ proteinG: NaN, carbsG: 10, fatG: NaN })).toBe(40);
  });

  it('handles fractional macros correctly', () => {
    // 31 * 4 + 0 * 4 + 3.6 * 9 = 124 + 32.4 = 156.4
    expect(
      kcalFromMacros({ proteinG: 31, carbsG: 0, fatG: 3.6 }),
    ).toBeCloseTo(156.4, 5);
  });

  it('returns 0 when all macros are zero', () => {
    expect(kcalFromMacros({ proteinG: 0, carbsG: 0, fatG: 0 })).toBe(0);
  });
});

describe('checkMacroSanity', () => {
  it('flags chicken breast as ok (165 kcal, 31P, 0C, 3.6F → implied ~156)', () => {
    const result = checkMacroSanity({
      calories: 165,
      proteinG: 31,
      carbsG: 0,
      fatG: 3.6,
    });
    expect(result.ok).toBe(true);
    expect(result.severity).toBe('ok');
    expect(result.impliedKcal).toBeCloseTo(156.4, 5);
    expect(result.deltaKcal).toBeCloseTo(8.6, 5);
  });

  it('allows small rounding (claimed 200, implied 210 → within tolerance)', () => {
    // 10 * 4 + 20 * 4 + 10 * 9 = 40 + 80 + 90 = 210. Delta 10 < 25 tolerance.
    const result = checkMacroSanity({
      calories: 200,
      proteinG: 10,
      carbsG: 20,
      fatG: 10,
    });
    expect(result.ok).toBe(true);
    expect(result.severity).toBe('ok');
  });

  it('flags when delta exceeds the 25 kcal absolute floor for low-cal foods', () => {
    // claimed 50, protein 20 → implied 80. Delta = 30 > tolerance max(25, 7.5) = 25.
    // ratio = 30/50 = 0.6 > 0.30 → blatant.
    const result = checkMacroSanity({
      calories: 50,
      proteinG: 20,
      carbsG: 0,
      fatG: 0,
    });
    expect(result.ok).toBe(false);
    expect(result.severity).toBe('blatant');
    expect(result.impliedKcal).toBe(80);
    expect(result.deltaKcal).toBe(30);
  });

  it('flags mild when delta is just over the 15% relative tolerance for higher-cal foods', () => {
    // claimed 500. protein 20 carbs 50 fat 40 → 80+200+360=640. Wait reset.
    // Want implied such that delta is just over 75 but ratio <= 0.30.
    // claimed 500, implied 580 → delta 80, ratio 0.16. Need macros summing to 580.
    // e.g. protein 10, carbs 10, fat 60 → 40+40+540=620. Too high.
    // protein 20, carbs 20, fat 55 → 80+80+495=655. Still high.
    // protein 45, carbs 45, fat 40 → 180+180+360=720. No.
    // Use direct construction: protein 50, carbs 50, fat 20 → 200+200+180=580. Delta=80.
    const result = checkMacroSanity({
      calories: 500,
      proteinG: 50,
      carbsG: 50,
      fatG: 20,
    });
    expect(result.ok).toBe(false);
    expect(result.severity).toBe('mild');
    expect(result.impliedKcal).toBe(580);
    expect(result.deltaKcal).toBe(80);
    expect(result.deltaRatio).toBeCloseTo(0.16, 5);
  });

  it('flags blatant when the ratio exceeds 30%', () => {
    // claimed 200, implied 500 (p 50, c 50, f 100/9 rounded... just use p 125 → 500).
    // p 125 c 0 f 0 → 500. delta 300, ratio 1.5 → blatant.
    const result = checkMacroSanity({
      calories: 200,
      proteinG: 125,
      carbsG: 0,
      fatG: 0,
    });
    expect(result.ok).toBe(false);
    expect(result.severity).toBe('blatant');
    expect(result.deltaRatio).toBeGreaterThan(0.3);
  });

  it('returns ok for a blank food template (all zero)', () => {
    const result = checkMacroSanity({
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
    expect(result.ok).toBe(true);
    expect(result.severity).toBe('ok');
    expect(result.impliedKcal).toBe(0);
  });

  it('flags zero claimed calories with non-zero macros', () => {
    // claimed 0, protein 10 → implied 40. delta 40, tolerance 25, ratio = 0.
    // ratio 0 <= 0.30 → mild.
    const result = checkMacroSanity({
      calories: 0,
      proteinG: 10,
      carbsG: 0,
      fatG: 0,
    });
    expect(result.ok).toBe(false);
    expect(result.severity).toBe('mild');
    expect(result.impliedKcal).toBe(40);
    expect(result.deltaKcal).toBe(40);
  });

  it('returns ok when every macro is null (not enough info to flag)', () => {
    const result = checkMacroSanity({
      calories: 500,
      proteinG: null,
      carbsG: null,
      fatG: null,
    });
    expect(result.ok).toBe(true);
    expect(result.severity).toBe('ok');
    expect(result.impliedKcal).toBe(0);
  });

  it('computes against present macros when one is null and still flags mismatches', () => {
    // claimed 500, protein 20, carbs 30, fat null → implied 80+120=200. Delta 300.
    // tolerance max(25, 75) = 75. 300 > 75. ratio = 0.6 > 0.30 → blatant.
    const result = checkMacroSanity({
      calories: 500,
      proteinG: 20,
      carbsG: 30,
      fatG: null,
    });
    expect(result.ok).toBe(false);
    expect(result.severity).toBe('blatant');
    expect(result.impliedKcal).toBe(200);
  });

  it('allows high-fiber style mismatch into mild rather than blatant', () => {
    // claimed 200, carbs 60 → implied 240. Delta 40. Tolerance max(25, 30) = 30.
    // 40 > 30 → flag. ratio = 40/200 = 0.20 <= 0.30 → mild.
    const result = checkMacroSanity({
      calories: 200,
      proteinG: 0,
      carbsG: 60,
      fatG: 0,
    });
    expect(result.ok).toBe(false);
    expect(result.severity).toBe('mild');
  });

  it('handles decimal macros without floating-point drift', () => {
    // claimed 170, protein 31.2, carbs 0.5, fat 3.6 → 124.8 + 2 + 32.4 = 159.2.
    // Delta 10.8 < 25 tolerance → ok.
    const result = checkMacroSanity({
      calories: 170,
      proteinG: 31.2,
      carbsG: 0.5,
      fatG: 3.6,
    });
    expect(result.ok).toBe(true);
    expect(result.impliedKcal).toBeCloseTo(159.2, 5);
  });

  it('returns ok exactly at the tolerance boundary (delta === 25 floor)', () => {
    // claimed 100, implied 125 → delta 25, tolerance max(25, 15)=25. Exactly at.
    const result = checkMacroSanity({
      calories: 100,
      proteinG: 0,
      carbsG: 0,
      fatG: 125 / 9,
    });
    expect(result.ok).toBe(true);
    expect(result.severity).toBe('ok');
    expect(result.deltaKcal).toBeCloseTo(25, 5);
  });

  it('returns ok exactly at the relative 15% tolerance boundary', () => {
    // claimed 1000, implied 1150 → delta 150, tolerance max(25, 150)=150. Exactly at.
    // Use carbs only: 287.5g * 4 = 1150.
    const result = checkMacroSanity({
      calories: 1000,
      proteinG: 0,
      carbsG: 287.5,
      fatG: 0,
    });
    expect(result.ok).toBe(true);
    expect(result.severity).toBe('ok');
    expect(result.deltaKcal).toBeCloseTo(150, 5);
  });

  it('returns mild exactly at the 30% ratio boundary', () => {
    // claimed 100, implied 130 → delta 30, tolerance 25, 30 > 25 → flag.
    // ratio = 30/100 = 0.30 → exactly at mild cutoff, so mild.
    const result = checkMacroSanity({
      calories: 100,
      proteinG: 0,
      carbsG: 32.5,
      fatG: 0,
    });
    expect(result.ok).toBe(false);
    expect(result.severity).toBe('mild');
    expect(result.deltaRatio).toBeCloseTo(0.3, 5);
  });

  it('handles whole-pizza magnitude mismatches as blatant', () => {
    // claimed 2200, protein 40, carbs 200, fat 80 → 160 + 800 + 720 = 1680. Delta 520.
    // tolerance max(25, 330) = 330. 520 > 330. ratio = 520/2200 ≈ 0.236 → mild.
    // Want blatant: bump fat way down. protein 40 carbs 200 fat 20 → 160+800+180=1140.
    // delta 1060, ratio 0.48 → blatant.
    const result = checkMacroSanity({
      calories: 2200,
      proteinG: 40,
      carbsG: 200,
      fatG: 20,
    });
    expect(result.ok).toBe(false);
    expect(result.severity).toBe('blatant');
    expect(result.deltaRatio).toBeGreaterThan(0.3);
  });

  it('treats negative claimed calories defensively (clamp to 0 → ok for zero macros)', () => {
    // Negative kcal is nonsense, but we clamp to 0 instead of bailing out.
    // claimed -50 → treated as 0. With non-zero macros → flag per normal logic.
    const negativeOnly = checkMacroSanity({
      calories: -50,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
    expect(negativeOnly.ok).toBe(true);
    expect(negativeOnly.severity).toBe('ok');
  });

  it('treats NaN claimed calories as 0', () => {
    const result = checkMacroSanity({
      calories: Number.NaN,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
    expect(result.ok).toBe(true);
    expect(result.severity).toBe('ok');
  });
});
