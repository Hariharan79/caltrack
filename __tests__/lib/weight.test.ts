import {
  EMPTY_WEIGHT_DRAFT,
  formatWeight,
  validateWeightDraft,
} from '@/lib/weight';

describe('validateWeightDraft', () => {
  it('rejects an empty draft with a weight error', () => {
    const result = validateWeightDraft(EMPTY_WEIGHT_DRAFT);
    expect(result.parsed).toBeNull();
    expect(result.errors.weightKg).toBeDefined();
    expect(result.errors.bodyFatPct).toBeUndefined();
  });

  it('rejects zero and negative weights', () => {
    expect(
      validateWeightDraft({ weightKg: '0', bodyFatPct: '' }).parsed
    ).toBeNull();
    expect(
      validateWeightDraft({ weightKg: '-10', bodyFatPct: '' }).parsed
    ).toBeNull();
  });

  it('rejects unrealistically large weights', () => {
    const result = validateWeightDraft({ weightKg: '1200', bodyFatPct: '' });
    expect(result.parsed).toBeNull();
    expect(result.errors.weightKg).toBeDefined();
  });

  it('accepts a valid weight with no body fat', () => {
    const result = validateWeightDraft({ weightKg: '72.4', bodyFatPct: '' });
    expect(result.errors).toEqual({});
    expect(result.parsed).toEqual({ weightKg: 72.4, bodyFatPct: null });
  });

  it('accepts a valid weight with a valid body fat %', () => {
    const result = validateWeightDraft({ weightKg: '72.4', bodyFatPct: '18.5' });
    expect(result.errors).toEqual({});
    expect(result.parsed).toEqual({ weightKg: 72.4, bodyFatPct: 18.5 });
  });

  it('rejects body fat % outside [0, 100]', () => {
    expect(
      validateWeightDraft({ weightKg: '72', bodyFatPct: '-1' }).parsed
    ).toBeNull();
    expect(
      validateWeightDraft({ weightKg: '72', bodyFatPct: '150' }).parsed
    ).toBeNull();
  });

  it('rejects non-numeric body fat', () => {
    const result = validateWeightDraft({ weightKg: '72', bodyFatPct: 'abc' });
    expect(result.parsed).toBeNull();
    expect(result.errors.bodyFatPct).toBeDefined();
  });

  it('trims whitespace in inputs', () => {
    const result = validateWeightDraft({
      weightKg: '  72.4  ',
      bodyFatPct: '  18  ',
    });
    expect(result.parsed).toEqual({ weightKg: 72.4, bodyFatPct: 18 });
  });
});

describe('formatWeight', () => {
  it('formats with one decimal and unit', () => {
    expect(formatWeight(72.4)).toBe('72.4 kg');
    expect(formatWeight(72)).toBe('72.0 kg');
  });
});
