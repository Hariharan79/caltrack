import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockSearchByText = jest.fn();
jest.mock('@/lib/foodLookup', () => ({
  searchByText: (...args: unknown[]) => mockSearchByText(...args),
  getByBarcode: jest.fn(),
}));

const mockAddEntry = jest.fn();
const mockUpdateEntry = jest.fn();
const mockUpsertFoodFromLookup = jest.fn();

interface MockFood {
  id: string;
  name: string;
}

interface MockState {
  foods: MockFood[];
  entries: unknown[];
  addEntry: typeof mockAddEntry;
  updateEntry: typeof mockUpdateEntry;
  upsertFoodFromLookup: typeof mockUpsertFoodFromLookup;
}

const mockState: MockState = {
  foods: [],
  entries: [],
  addEntry: mockAddEntry,
  updateEntry: mockUpdateEntry,
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
import type { MealEntry } from '@/types';

beforeEach(() => {
  mockSearchByText.mockReset();
  mockAddEntry.mockReset();
  mockUpdateEntry.mockReset();
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

describe('AddMealSheet — edit mode', () => {
  const initialEntry: MealEntry = {
    id: 'entry-1',
    name: 'Oats',
    calories: 320,
    proteinG: 12,
    carbsG: 55,
    fatG: 6,
    loggedAt: '2026-04-13T08:00:00.000Z',
    dayKey: '2026-04-13',
    foodId: 'food-1',
    servings: 1,
  };

  it('prefills the Quick add form from initialEntry and shows Edit meal title', () => {
    const { getByTestId, getByText } = render(
      <AddMealSheet visible={true} onClose={jest.fn()} initialEntry={initialEntry} />
    );
    expect(getByText('Edit meal')).toBeTruthy();
    expect(getByTestId('meal-name').props.value).toBe('Oats');
    expect(getByTestId('meal-calories').props.value).toBe('320');
    expect(getByTestId('meal-protein').props.value).toBe('12');
    expect(getByTestId('meal-carbs').props.value).toBe('55');
    expect(getByTestId('meal-fat').props.value).toBe('6');
  });

  it('save calls updateEntry with patched fields, not addEntry', async () => {
    mockUpdateEntry.mockResolvedValue({ ...initialEntry, calories: 400 });
    const onClose = jest.fn();
    const { getByTestId } = render(
      <AddMealSheet visible={true} onClose={onClose} initialEntry={initialEntry} />
    );

    fireEvent.changeText(getByTestId('meal-calories'), '400');
    fireEvent.press(getByTestId('meal-save'));

    await waitFor(() => expect(mockUpdateEntry).toHaveBeenCalled());
    expect(mockAddEntry).not.toHaveBeenCalled();
    expect(mockUpdateEntry).toHaveBeenCalledWith('entry-1', {
      name: 'Oats',
      calories: 400,
      proteinG: 12,
      carbsG: 55,
      fatG: 6,
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('cancel closes without calling store actions', () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <AddMealSheet visible={true} onClose={onClose} initialEntry={initialEntry} />
    );
    fireEvent.press(getByLabelText('Cancel'));
    expect(onClose).toHaveBeenCalled();
    expect(mockUpdateEntry).not.toHaveBeenCalled();
    expect(mockAddEntry).not.toHaveBeenCalled();
  });
});

describe('AddMealSheet — scan entry point', () => {
  it('renders the Scan button when onRequestScan is provided and invokes it on press', () => {
    const onRequestScan = jest.fn();
    const { getByTestId } = render(
      <AddMealSheet visible={true} onClose={jest.fn()} onRequestScan={onRequestScan} />
    );
    const scanButton = getByTestId('log-scan');
    fireEvent.press(scanButton);
    expect(onRequestScan).toHaveBeenCalledTimes(1);
  });

  it('does not render the Scan button when onRequestScan is omitted', () => {
    const { queryByTestId } = render(<AddMealSheet visible={true} onClose={jest.fn()} />);
    expect(queryByTestId('log-scan')).toBeNull();
  });

  it('opens the servings-stepper view with a pre-seeded scanned food', async () => {
    const scanned = {
      source: 'off' as const,
      sourceId: '3017620422003',
      name: 'Nutella',
      brand: 'Ferrero',
      servingSize: '15 g',
      kcalPerServing: 81,
      proteinG: 1,
      carbsG: 8.6,
      fatG: 4.7,
      imageUrl: null,
    };
    mockUpsertFoodFromLookup.mockResolvedValue({
      id: 'food-nutella',
      name: 'Ferrero — Nutella',
      servingSize: '15 g',
      kcalPerServing: 81,
      proteinGPerServing: 1,
      carbsGPerServing: 8.6,
      fatGPerServing: 4.7,
      barcode: '3017620422003',
      source: 'off',
      sourceId: '3017620422003',
      createdAt: '2026-04-14T00:00:00Z',
      updatedAt: '2026-04-14T00:00:00Z',
    });
    mockAddEntry.mockResolvedValue({ id: 'e1' });
    const onClose = jest.fn();

    const { getByTestId } = render(
      <AddMealSheet visible={true} onClose={onClose} initialScannedFood={scanned} />
    );

    // Search view is skipped; we land directly on the stepper.
    expect(getByTestId('servings-stepper')).toBeTruthy();
    expect(getByTestId('log-save')).toBeTruthy();

    fireEvent.press(getByTestId('log-save'));
    await waitFor(() => expect(mockUpsertFoodFromLookup).toHaveBeenCalled());
    await waitFor(() => expect(mockAddEntry).toHaveBeenCalled());
    expect(mockAddEntry.mock.calls[0][0].foodId).toBe('food-nutella');
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
