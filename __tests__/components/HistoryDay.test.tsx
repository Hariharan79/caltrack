import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HistoryDay } from '@/components/HistoryDay';
import type { DailyTotals, MealEntry } from '@/types';

jest.mock('phosphor-react-native', () => {
  const { Text } = require('react-native');
  const make = (n: string) => () => <Text testID={`icon-${n}`}>{n}</Text>;
  return {
    CaretRight: make('CaretRight'),
    CaretDown: make('CaretDown'),
  };
});

const totals: DailyTotals = {
  dayKey: '2026-04-12',
  calories: 1850,
  proteinG: 110,
  carbsG: 200,
  fatG: 60,
  entryCount: 3,
};

const entries: MealEntry[] = [
  {
    id: 'e1',
    name: 'Breakfast',
    calories: 400,
    proteinG: 20,
    carbsG: 60,
    fatG: 10,
    loggedAt: '2026-04-12T08:00:00.000Z',
    dayKey: '2026-04-12',
  },
  {
    id: 'e2',
    name: 'Lunch',
    calories: 900,
    proteinG: 50,
    carbsG: 90,
    fatG: 30,
    loggedAt: '2026-04-12T13:00:00.000Z',
    dayKey: '2026-04-12',
  },
];

describe('HistoryDay', () => {
  it('renders day label, calories, and entry count', () => {
    const { getByText } = render(
      <HistoryDay
        totals={totals}
        entries={entries}
        expanded={false}
        onToggle={() => undefined}
        goalCalories={2000}
      />
    );
    expect(getByText('1850')).toBeTruthy();
    expect(getByText('3 meals')).toBeTruthy();
  });

  it('shows singular "meal" for entryCount of 1', () => {
    const single = { ...totals, entryCount: 1 };
    const { getByText } = render(
      <HistoryDay
        totals={single}
        entries={[entries[0]]}
        expanded={false}
        onToggle={() => undefined}
        goalCalories={2000}
      />
    );
    expect(getByText('1 meal')).toBeTruthy();
  });

  it('does not render entries when collapsed', () => {
    const { queryByTestId } = render(
      <HistoryDay
        totals={totals}
        entries={entries}
        expanded={false}
        onToggle={() => undefined}
        goalCalories={2000}
      />
    );
    expect(queryByTestId('history-entries-2026-04-12')).toBeNull();
  });

  it('renders entries when expanded', () => {
    const { getByTestId } = render(
      <HistoryDay
        totals={totals}
        entries={entries}
        expanded={true}
        onToggle={() => undefined}
        goalCalories={2000}
      />
    );
    expect(getByTestId('history-entries-2026-04-12')).toBeTruthy();
    expect(getByTestId('entry-row-e1')).toBeTruthy();
    expect(getByTestId('entry-row-e2')).toBeTruthy();
  });

  it('calls onToggle with dayKey when summary is pressed', () => {
    const onToggle = jest.fn();
    const { getByTestId } = render(
      <HistoryDay
        totals={totals}
        entries={entries}
        expanded={false}
        onToggle={onToggle}
        goalCalories={2000}
      />
    );
    fireEvent.press(getByTestId('history-toggle-2026-04-12'));
    expect(onToggle).toHaveBeenCalledWith('2026-04-12');
  });
});
