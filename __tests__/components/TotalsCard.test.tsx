import React from 'react';
import { render } from '@testing-library/react-native';
import { TotalsCard, clampProgress, remainingCalories } from '@/components/TotalsCard';
import type { DailyTotals, Goals } from '@/types';

describe('clampProgress', () => {
  it('returns 0 when goal is 0', () => {
    expect(clampProgress(500, 0)).toBe(0);
  });

  it('returns 0 for negative consumed', () => {
    expect(clampProgress(-100, 2000)).toBe(0);
  });

  it('returns 0.5 when half consumed', () => {
    expect(clampProgress(1000, 2000)).toBe(0.5);
  });

  it('clamps to 1 when consumed exceeds goal', () => {
    expect(clampProgress(3000, 2000)).toBe(1);
  });
});

describe('remainingCalories', () => {
  it('subtracts consumed from goal', () => {
    expect(remainingCalories(800, 2000)).toBe(1200);
  });

  it('never returns negative', () => {
    expect(remainingCalories(2500, 2000)).toBe(0);
  });
});

describe('TotalsCard', () => {
  const goals: Goals = {
    calorieGoal: 2000,
    proteinGoalG: null,
    carbsGoalG: null,
    fatGoalG: null,
  };
  const totals: DailyTotals = {
    dayKey: '2026-04-13',
    calories: 800,
    proteinG: 50,
    carbsG: 100,
    fatG: 25,
    entryCount: 3,
  };

  it('renders calories and remaining text', () => {
    const { getByTestId } = render(<TotalsCard totals={totals} goals={goals} />);
    expect(getByTestId('totals-calories').props.children).toBe(800);
    expect(getByTestId('totals-remaining').props.children).toBe('1200 kcal left.');
  });

  it('shows over-goal text when consumed exceeds goal', () => {
    const overTotals = { ...totals, calories: 2300 };
    const { getByTestId } = render(<TotalsCard totals={overTotals} goals={goals} />);
    expect(getByTestId('totals-remaining').props.children).toBe('300 over.');
  });
});
