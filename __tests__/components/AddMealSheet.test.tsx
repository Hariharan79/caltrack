import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AddMealSheet, validateDraft } from '@/components/AddMealSheet';

describe('validateDraft', () => {
  const base = { name: '', calories: '', protein: '', carbs: '', fat: '' };

  it('rejects empty name', () => {
    const result = validateDraft({ ...base, name: '   ', calories: '100' });
    expect(result.errors.name).toBeDefined();
    expect(result.parsed).toBeNull();
  });

  it('rejects empty calories', () => {
    const result = validateDraft({ ...base, name: 'Burrito' });
    expect(result.errors.calories).toBeDefined();
    expect(result.parsed).toBeNull();
  });

  it('rejects zero or negative calories', () => {
    expect(validateDraft({ ...base, name: 'A', calories: '0' }).errors.calories).toBeDefined();
    expect(validateDraft({ ...base, name: 'A', calories: '-5' }).errors.calories).toBeDefined();
  });

  it('rejects non-numeric calories', () => {
    expect(validateDraft({ ...base, name: 'A', calories: 'abc' }).errors.calories).toBeDefined();
  });

  it('rejects negative macros', () => {
    expect(
      validateDraft({ ...base, name: 'A', calories: '100', protein: '-1' }).errors.protein
    ).toBeDefined();
  });

  it('accepts a valid required-only draft', () => {
    const result = validateDraft({ ...base, name: 'Apple', calories: '95' });
    expect(result.errors).toEqual({});
    expect(result.parsed).toEqual({
      name: 'Apple',
      calories: 95,
      proteinG: null,
      carbsG: null,
      fatG: null,
    });
  });

  it('accepts a valid full draft and trims name', () => {
    const result = validateDraft({
      name: '  Steak ',
      calories: '500',
      protein: '40',
      carbs: '0',
      fat: '30',
    });
    expect(result.parsed).toEqual({
      name: 'Steak',
      calories: 500,
      proteinG: 40,
      carbsG: 0,
      fatG: 30,
    });
  });
});

describe('AddMealSheet — submit flow', () => {
  it('does not call onSubmit when fields are empty', () => {
    const onSubmit = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = render(
      <AddMealSheet visible={true} onSubmit={onSubmit} onClose={onClose} />
    );
    fireEvent.press(getByTestId('meal-save'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onSubmit with parsed input then closes when valid', () => {
    const onSubmit = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = render(
      <AddMealSheet visible={true} onSubmit={onSubmit} onClose={onClose} />
    );

    fireEvent.changeText(getByTestId('meal-name'), 'Oats');
    fireEvent.changeText(getByTestId('meal-calories'), '320');
    fireEvent.changeText(getByTestId('meal-protein'), '12');
    fireEvent.press(getByTestId('meal-save'));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Oats',
      calories: 320,
      proteinG: 12,
      carbsG: null,
      fatG: null,
    });
    expect(onClose).toHaveBeenCalled();
  });
});
