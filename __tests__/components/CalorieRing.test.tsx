import React from 'react';
import { render } from '@testing-library/react-native';
import { CalorieRing, ringProgress } from '@/components/CalorieRing';

describe('ringProgress', () => {
  it('returns 0 when goal is 0', () => {
    expect(ringProgress(500, 0)).toBe(0);
  });

  it('returns 0 when goal is negative', () => {
    expect(ringProgress(500, -100)).toBe(0);
  });

  it('returns 0 when consumed is negative', () => {
    expect(ringProgress(-50, 2000)).toBe(0);
  });

  it('returns 0.25 when one quarter consumed', () => {
    expect(ringProgress(500, 2000)).toBe(0.25);
  });

  it('returns 1 when consumed equals goal', () => {
    expect(ringProgress(2000, 2000)).toBe(1);
  });

  it('clamps at 1 when consumed exceeds goal', () => {
    expect(ringProgress(3000, 2000)).toBe(1);
  });

  it('handles non-finite ratios by returning 0', () => {
    expect(ringProgress(Number.NaN, 2000)).toBe(0);
  });
});

describe('CalorieRing', () => {
  it('renders consumed value and remaining label below goal', () => {
    const { getByTestId } = render(
      <CalorieRing consumed={1200} goal={2000} />
    );
    expect(getByTestId('calorie-ring-consumed').props.children).toBe(1200);
    expect(getByTestId('calorie-ring-delta').props.children).toBe('800 left');
  });

  it('renders over label when consumed exceeds goal', () => {
    const { getByTestId } = render(
      <CalorieRing consumed={2300} goal={2000} />
    );
    expect(getByTestId('calorie-ring-delta').props.children).toBe('300 over');
  });

  it('renders 0 left when goal is zero', () => {
    const { getByTestId } = render(
      <CalorieRing consumed={500} goal={0} />
    );
    // goal=0 → not "over" branch (overGoal requires goal > 0). Remaining = max(0, 0-500) = 0.
    expect(getByTestId('calorie-ring-delta').props.children).toBe('0 left');
  });
});
