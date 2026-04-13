import { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { TextField } from './TextField';
import { PrimaryButton } from './PrimaryButton';
import type { NewMealInput } from '@/types';

interface AddMealSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: NewMealInput) => void;
}

interface DraftState {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

const EMPTY: DraftState = {
  name: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
};

interface ValidationResult {
  errors: Partial<Record<keyof DraftState, string>>;
  parsed: NewMealInput | null;
}

export function validateDraft(draft: DraftState): ValidationResult {
  const errors: Partial<Record<keyof DraftState, string>> = {};

  const name = draft.name.trim();
  if (!name) errors.name = 'Name is required';

  const calNum = Number(draft.calories);
  if (draft.calories.trim() === '') {
    errors.calories = 'Calories required';
  } else if (!Number.isFinite(calNum) || calNum <= 0) {
    errors.calories = 'Must be a positive number';
  }

  const parseOptional = (raw: string, key: keyof DraftState): number | null => {
    if (raw.trim() === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      errors[key] = 'Must be ≥ 0';
      return null;
    }
    return n;
  };

  const proteinG = parseOptional(draft.protein, 'protein');
  const carbsG = parseOptional(draft.carbs, 'carbs');
  const fatG = parseOptional(draft.fat, 'fat');

  if (Object.keys(errors).length > 0) {
    return { errors, parsed: null };
  }

  return {
    errors,
    parsed: {
      name,
      calories: calNum,
      proteinG,
      carbsG,
      fatG,
    },
  };
}

export function AddMealSheet({ visible, onClose, onSubmit }: AddMealSheetProps) {
  const [draft, setDraft] = useState<DraftState>(EMPTY);
  const [submitted, setSubmitted] = useState(false);

  const validation = useMemo(() => validateDraft(draft), [draft]);
  const visibleErrors = submitted ? validation.errors : {};

  const update = (key: keyof DraftState, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const reset = () => {
    setDraft(EMPTY);
    setSubmitted(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    setSubmitted(true);
    if (validation.parsed) {
      onSubmit(validation.parsed);
      reset();
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'formSheet' : 'overFullScreen'}
      transparent={Platform.OS !== 'ios'}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={handleClose} accessibilityRole="button" accessibilityLabel="Cancel">
              <Text style={styles.headerAction}>Cancel</Text>
            </Pressable>
            <Text style={styles.title}>Log meal</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <TextField
              label="Name"
              value={draft.name}
              onChangeText={(v) => update('name', v)}
              placeholder="e.g. Chicken bowl"
              autoCapitalize="words"
              error={visibleErrors.name}
              testID="meal-name"
            />
            <TextField
              label="Calories"
              value={draft.calories}
              onChangeText={(v) => update('calories', v)}
              placeholder="0"
              keyboardType="number-pad"
              error={visibleErrors.calories}
              testID="meal-calories"
            />
            <View style={styles.row}>
              <View style={styles.col}>
                <TextField
                  label="Protein (g)"
                  value={draft.protein}
                  onChangeText={(v) => update('protein', v)}
                  placeholder="—"
                  keyboardType="number-pad"
                  error={visibleErrors.protein}
                  testID="meal-protein"
                />
              </View>
              <View style={styles.col}>
                <TextField
                  label="Carbs (g)"
                  value={draft.carbs}
                  onChangeText={(v) => update('carbs', v)}
                  placeholder="—"
                  keyboardType="number-pad"
                  error={visibleErrors.carbs}
                  testID="meal-carbs"
                />
              </View>
              <View style={styles.col}>
                <TextField
                  label="Fat (g)"
                  value={draft.fat}
                  onChangeText={(v) => update('fat', v)}
                  placeholder="—"
                  keyboardType="number-pad"
                  error={visibleErrors.fat}
                  testID="meal-fat"
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <PrimaryButton label="Save meal" onPress={handleSubmit} testID="meal-save" />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerAction: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
    minWidth: 60,
  },
  headerSpacer: {
    minWidth: 60,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  col: {
    flex: 1,
  },
  footer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
});
