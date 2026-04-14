import React from 'react';
import { render } from '@testing-library/react-native';
import { WeightChart } from '@/components/WeightChart';
import type { WeightEntry } from '@/types';

function makeEntry(overrides: Partial<WeightEntry>): WeightEntry {
  return {
    id: 'w-x',
    weightKg: 70,
    bodyFatPct: null,
    loggedAt: '2026-04-13T08:00:00.000Z',
    dayKey: '2026-04-13',
    ...overrides,
  };
}

describe('WeightChart', () => {
  it('renders an empty state when there are no entries', () => {
    const { getByText } = render(
      <WeightChart entries={[]} width={320} testID="chart" />
    );
    expect(getByText('No weight logged yet.')).toBeTruthy();
  });

  it('renders a single data point with latest label', () => {
    const entries = [makeEntry({ id: 'a', weightKg: 72.4 })];
    const { getByText } = render(<WeightChart entries={entries} width={320} />);
    expect(getByText('72.4 kg')).toBeTruthy();
  });

  it('renders multiple entries with a delta label', () => {
    const entries = [
      makeEntry({
        id: 'a',
        weightKg: 73.0,
        loggedAt: '2026-04-10T08:00:00.000Z',
      }),
      makeEntry({
        id: 'b',
        weightKg: 72.4,
        loggedAt: '2026-04-12T08:00:00.000Z',
      }),
      makeEntry({
        id: 'c',
        weightKg: 72.0,
        loggedAt: '2026-04-13T08:00:00.000Z',
      }),
    ];
    const { getByText } = render(<WeightChart entries={entries} width={320} />);
    // Latest weight label
    expect(getByText('72.0 kg')).toBeTruthy();
    // Delta: 72.0 - 73.0 = -1.0
    expect(getByText('-1.0 kg')).toBeTruthy();
  });

  it('shows body fat % in the legend when latest entry has one', () => {
    const entries = [makeEntry({ id: 'a', weightKg: 72.4, bodyFatPct: 18.5 })];
    const { getByText } = render(<WeightChart entries={entries} width={320} />);
    expect(getByText('72.4 kg · 18.5% bf')).toBeTruthy();
  });
});
