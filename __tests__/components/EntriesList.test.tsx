import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EntriesList } from '@/components/EntriesList';
import type { MealEntry } from '@/types';

const sample: MealEntry[] = [
  {
    id: 'e1',
    name: 'Eggs',
    calories: 200,
    proteinG: 14,
    carbsG: 2,
    fatG: 14,
    loggedAt: '2026-04-13T08:00:00.000Z',
    dayKey: '2026-04-13',
    foodId: null,
    servings: 1,
  },
  {
    id: 'e2',
    name: 'Toast',
    calories: 150,
    proteinG: null,
    carbsG: null,
    fatG: null,
    loggedAt: '2026-04-13T08:05:00.000Z',
    dayKey: '2026-04-13',
    foodId: null,
    servings: 1,
  },
];

describe('EntriesList', () => {
  it('renders empty state when there are no entries', () => {
    const { getByTestId, getByText } = render(<EntriesList entries={[]} emptyText="Nothing yet" />);
    expect(getByTestId('entries-empty')).toBeTruthy();
    expect(getByText('Nothing yet')).toBeTruthy();
  });

  it('falls back to a default empty message', () => {
    const { getByText } = render(<EntriesList entries={[]} />);
    expect(getByText('No meals yet')).toBeTruthy();
  });

  it('renders a row for each entry', () => {
    const { getByTestId } = render(<EntriesList entries={sample} />);
    expect(getByTestId('entries-list')).toBeTruthy();
    expect(getByTestId('entry-row-e1')).toBeTruthy();
    expect(getByTestId('entry-row-e2')).toBeTruthy();
  });

  it('forwards onDelete to rows', () => {
    const onDelete = jest.fn();
    const { getByTestId } = render(<EntriesList entries={sample} onDelete={onDelete} />);
    fireEvent.press(getByTestId('delete-e1'));
    expect(onDelete).toHaveBeenCalledWith('e1');
  });
});
