import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Stepper, clampStep, formatServings } from '@/components/Stepper';

describe('clampStep', () => {
  it('snaps to step grid', () => {
    expect(clampStep(1.3, 0.5, 99.5, 0.5)).toBe(1.5);
    expect(clampStep(1.2, 0.5, 99.5, 0.5)).toBe(1);
  });

  it('respects min', () => {
    expect(clampStep(0.1, 0.5, 99.5, 0.5)).toBe(0.5);
    expect(clampStep(-2, 0.5, 99.5, 0.5)).toBe(0.5);
  });

  it('respects max', () => {
    expect(clampStep(150, 0.5, 99.5, 0.5)).toBe(99.5);
  });

  it('falls back to min for non-finite', () => {
    expect(clampStep(NaN, 0.5, 99.5, 0.5)).toBe(0.5);
  });
});

describe('formatServings', () => {
  it('renders integers without decimals', () => {
    expect(formatServings(1)).toBe('1');
    expect(formatServings(3)).toBe('3');
  });

  it('strips trailing zeros from fractions', () => {
    expect(formatServings(0.5)).toBe('0.5');
    expect(formatServings(2.25)).toBe('2.25');
  });
});

describe('Stepper component', () => {
  it('calls onChange with incremented value', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <Stepper value={1} onChange={onChange} testID="srv" />
    );
    fireEvent.press(getByTestId('srv-increment'));
    expect(onChange).toHaveBeenCalledWith(1.5);
  });

  it('calls onChange with decremented value', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <Stepper value={2} onChange={onChange} testID="srv" />
    );
    fireEvent.press(getByTestId('srv-decrement'));
    expect(onChange).toHaveBeenCalledWith(1.5);
  });

  it('does not go below min', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <Stepper value={0.5} onChange={onChange} testID="srv" />
    );
    fireEvent.press(getByTestId('srv-decrement'));
    // decrement is disabled, no call
    expect(onChange).not.toHaveBeenCalled();
  });

  it('switches to text input when value is tapped and commits on submit', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <Stepper value={1} onChange={onChange} testID="srv" />
    );
    fireEvent.press(getByTestId('srv-value'));
    const input = getByTestId('srv-input');
    fireEvent.changeText(input, '2.5');
    fireEvent(input, 'submitEditing');
    expect(onChange).toHaveBeenCalledWith(2.5);
  });

  it('clamps typed value to step grid', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <Stepper value={1} onChange={onChange} testID="srv" />
    );
    fireEvent.press(getByTestId('srv-value'));
    const input = getByTestId('srv-input');
    fireEvent.changeText(input, '1.3');
    fireEvent(input, 'submitEditing');
    expect(onChange).toHaveBeenCalledWith(1.5);
  });
});
