import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockSearchByText = jest.fn();
jest.mock('@/lib/foodLookup', () => ({
  searchByText: (...args: unknown[]) => mockSearchByText(...args),
  getByBarcode: jest.fn(),
}));

const mockAddEntry = jest.fn();
const mockUpsertFoodFromLookup = jest.fn();

interface MockFood {
  id: string;
  name: string;
}

interface MockState {
  foods: MockFood[];
  entries: unknown[];
  addEntry: typeof mockAddEntry;
  upsertFoodFromLookup: typeof mockUpsertFoodFromLookup;
}

const mockState: MockState = {
  foods: [],
  entries: [],
  addEntry: mockAddEntry,
  upsertFoodFromLookup: mockUpsertFoodFromLookup,
};

jest.mock('@/lib/store', () => ({
  useAppStore: <T,>(selector: (s: MockState) => T): T => selector(mockState),
  searchFoods: (foods: MockFood[], query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return [...foods];
    return foods.filter((f) => f.name.toLowerCase().includes(q));
  },
  selectRecentFoods: () => [],
}));

import { AddMealSheet, validateDraft } from '@/components/AddMealSheet';

beforeEach(() => {
  mockSearchByText.mockReset();
  mockAddEntry.mockReset();
  mockUpsertFoodFromLookup.mockReset();
  mockState.foods = [];
  mockState.entries = [];
});

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

describe('AddMealSheet — Quick add tab', () => {
  it('does not call addEntry when fields are empty', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<AddMealSheet visible={true} onClose={onClose} />);
    fireEvent.press(getByTestId('tab-quick'));
    fireEvent.press(getByTestId('meal-save'));
    expect(mockAddEntry).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls addEntry with parsed input then closes when valid', async () => {
    mockAddEntry.mockResolvedValue({ id: 'e1' });
    const onClose = jest.fn();
    const { getByTestId } = render(<AddMealSheet visible={true} onClose={onClose} />);

    fireEvent.press(getByTestId('tab-quick'));
    fireEvent.changeText(getByTestId('meal-name'), 'Oats');
    fireEvent.changeText(getByTestId('meal-calories'), '320');
    fireEvent.changeText(getByTestId('meal-protein'), '12');
    fireEvent.press(getByTestId('meal-save'));

    await waitFor(() => expect(mockAddEntry).toHaveBeenCalled());
    expect(mockAddEntry).toHaveBeenCalledWith({
      name: 'Oats',
      calories: 320,
      proteinG: 12,
      carbsG: null,
      fatG: null,
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

describe('AddMealSheet — Log tab', () => {
  it('logs a USDA result via stepper save', async () => {
    mockSearchByText.mockResolvedValue([
      {
        source: 'usda',
        sourceId: '12345',
        name: 'Chicken breast',
        brand: 'Tyson',
        servingSize: '100 g',
        kcalPerServing: 165,
        proteinG: 31,
        carbsG: 0,
        fatG: 3.6,
        imageUrl: null,
      },
    ]);
    mockUpsertFoodFromLookup.mockResolvedValue({
      id: 'food-1',
      name: 'Tyson — Chicken breast',
      servingSize: '100 g',
      kcalPerServing: 165,
      proteinGPerServing: 31,
      carbsGPerServing: 0,
      fatGPerServing: 3.6,
      barcode: null,
      source: 'usda',
      sourceId: '12345',
      createdAt: '2026-04-13T00:00:00Z',
      updatedAt: '2026-04-13T00:00:00Z',
    });
    mockAddEntry.mockResolvedValue({ id: 'e1' });
    const onClose = jest.fn();

    const { getByTestId } = render(<AddMealSheet visible={true} onClose={onClose} />);

    fireEvent.changeText(getByTestId('log-search'), 'chicken');

    await waitFor(() => expect(mockSearchByText).toHaveBeenCalledWith('chicken'));

    const result = await waitFor(() => getByTestId('result-usda-12345'));
    fireEvent.press(result);

    fireEvent.press(getByTestId('servings-stepper-increment'));
    fireEvent.press(getByTestId('log-save'));

    await waitFor(() => expect(mockUpsertFoodFromLookup).toHaveBeenCalled());
    await waitFor(() => expect(mockAddEntry).toHaveBeenCalled());

    const insertedEntry = mockAddEntry.mock.calls[0][0];
    expect(insertedEntry.foodId).toBe('food-1');
    expect(insertedEntry.servings).toBe(1.5);
    expect(insertedEntry.calories).toBe(Math.round(165 * 1.5));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
