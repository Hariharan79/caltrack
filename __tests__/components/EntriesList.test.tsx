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
    status: 'eaten',
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
    status: 'eaten',
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
    expect(getByText('No meals yet.')).toBeTruthy();
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

  it('forwards onPressEntry when a row is tapped', () => {
    const onPressEntry = jest.fn();
    const { getByTestId } = render(
      <EntriesList entries={sample} onPressEntry={onPressEntry} />
    );
    fireEvent.press(getByTestId('entry-row-e1'));
    expect(onPressEntry).toHaveBeenCalledWith(sample[0]);
  });

  it('renders the bullshit badge on rows with blatant macro mismatches', () => {
    const blatantEntry: MealEntry = {
      id: 'bad',
      name: 'Diet lie',
      calories: 200,
      proteinG: 125,
      carbsG: 0,
      fatG: 0,
      loggedAt: '2026-04-13T09:00:00.000Z',
      dayKey: '2026-04-13',
      foodId: null,
      servings: 1,
      status: 'eaten',
    };
    const { getByTestId } = render(<EntriesList entries={[blatantEntry]} />);
    expect(getByTestId('entry-badge-bad')).toBeTruthy();
  });

  it('does not render the bullshit badge on sane rows', () => {
    const { queryByTestId } = render(<EntriesList entries={sample} />);
    // Eggs: 14P 2C 14F = 56+8+126 = 190 vs claimed 200 → ok.
    expect(queryByTestId('entry-badge-e1')).toBeNull();
    // Toast: macros all null → ok.
    expect(queryByTestId('entry-badge-e2')).toBeNull();
  });
});
