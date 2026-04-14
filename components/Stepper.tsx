import { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { Minus, Plus } from 'phosphor-react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';

interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  testID?: string;
}

export function clampStep(value: number, min: number, max: number, step: number): number {
  if (!Number.isFinite(value)) return min;
  const snapped = Math.round(value / step) * step;
  if (snapped < min) return min;
  if (snapped > max) return max;
  return Number(snapped.toFixed(2));
}

export function formatServings(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

export function Stepper({
  value,
  onChange,
  min = 0.5,
  max = 99.5,
  step = 0.5,
  testID,
}: StepperProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(formatServings(value));

  const commit = () => {
    const parsed = Number(draft);
    onChange(clampStep(parsed, min, max, step));
    setEditing(false);
  };

  const decrement = () => onChange(clampStep(value - step, min, max, step));
  const increment = () => onChange(clampStep(value + step, min, max, step));

  const decDisabled = value <= min;
  const incDisabled = value >= max;

  return (
    <View style={styles.container} testID={testID}>
      <Pressable
        onPress={decrement}
        disabled={decDisabled}
        accessibilityRole="button"
        accessibilityLabel="Decrease servings"
        style={[styles.button, decDisabled && styles.buttonDisabled]}
        testID={testID ? `${testID}-decrement` : undefined}
      >
        <Minus color={COLORS.text} size={20} weight="bold" />
      </Pressable>

      {editing ? (
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="decimal-pad"
          autoFocus
          selectTextOnFocus
          style={[styles.value, styles.valueInput]}
          testID={testID ? `${testID}-input` : undefined}
        />
      ) : (
        <Pressable
          onPress={() => {
            setDraft(formatServings(value));
            setEditing(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Servings: ${formatServings(value)}. Tap to edit.`}
          style={styles.valueWrap}
          testID={testID ? `${testID}-value` : undefined}
        >
          <Text style={styles.value}>{formatServings(value)}</Text>
        </Pressable>
      )}

      <Pressable
        onPress={increment}
        disabled={incDisabled}
        accessibilityRole="button"
        accessibilityLabel="Increase servings"
        style={[styles.button, incDisabled && styles.buttonDisabled]}
        testID={testID ? `${testID}-increment` : undefined}
      >
        <Plus color={COLORS.text} size={20} weight="bold" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xs,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  valueWrap: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    flex: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.semibold,
    textAlign: 'center',
    minWidth: 60,
  },
  valueInput: {
    paddingVertical: SPACING.xs,
  },
});
