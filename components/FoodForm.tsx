import { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';

import { COLORS, SPACING } from '@/constants/theme';
import { TextField } from './TextField';
import { PrimaryButton } from './PrimaryButton';
import {
  EMPTY_FOOD_DRAFT,
  validateFoodDraft,
  type FoodDraft,
} from '@/lib/foodForm';
import type { NewFoodInput } from '@/types';

interface FoodFormProps {
  initial?: FoodDraft;
  submitLabel: string;
  onSubmit: (parsed: NewFoodInput) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}

export function FoodForm({ initial, submitLabel, onSubmit, onDelete }: FoodFormProps) {
  const [draft, setDraft] = useState<FoodDraft>(initial ?? EMPTY_FOOD_DRAFT);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const validation = useMemo(() => validateFoodDraft(draft), [draft]);
  const visibleErrors = submitted ? validation.errors : {};

  const update = (key: keyof FoodDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!validation.parsed) return;
    setSaving(true);
    try {
      await onSubmit(validation.parsed);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <TextField
        label="Name"
        value={draft.name}
        onChangeText={(v) => update('name', v)}
        placeholder="e.g. Chicken breast"
        autoCapitalize="words"
        error={visibleErrors.name}
        testID="food-name"
      />
      <TextField
        label="Serving size"
        value={draft.servingSize}
        onChangeText={(v) => update('servingSize', v)}
        placeholder="e.g. 100 g, 1 cup"
        autoCapitalize="none"
        error={visibleErrors.servingSize}
        testID="food-serving-size"
      />
      <TextField
        label="Calories per serving"
        value={draft.kcalPerServing}
        onChangeText={(v) => update('kcalPerServing', v)}
        placeholder="0"
        keyboardType="number-pad"
        error={visibleErrors.kcalPerServing}
        testID="food-kcal"
      />

      <View style={styles.row}>
        <View style={styles.col}>
          <TextField
            label="Protein (g)"
            value={draft.proteinGPerServing}
            onChangeText={(v) => update('proteinGPerServing', v)}
            placeholder="—"
            keyboardType="number-pad"
            error={visibleErrors.proteinGPerServing}
            testID="food-protein"
          />
        </View>
        <View style={styles.col}>
          <TextField
            label="Carbs (g)"
            value={draft.carbsGPerServing}
            onChangeText={(v) => update('carbsGPerServing', v)}
            placeholder="—"
            keyboardType="number-pad"
            error={visibleErrors.carbsGPerServing}
            testID="food-carbs"
          />
        </View>
        <View style={styles.col}>
          <TextField
            label="Fat (g)"
            value={draft.fatGPerServing}
            onChangeText={(v) => update('fatGPerServing', v)}
            placeholder="—"
            keyboardType="number-pad"
            error={visibleErrors.fatGPerServing}
            testID="food-fat"
          />
        </View>
      </View>

      <PrimaryButton
        label={submitLabel}
        onPress={handleSubmit}
        loading={saving}
        testID="food-save"
        style={styles.submit}
      />

      {onDelete ? (
        <PrimaryButton
          label="Delete food"
          onPress={handleDelete}
          variant="danger"
          loading={deleting}
          testID="food-delete"
          style={styles.delete}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  col: {
    flex: 1,
  },
  submit: {
    marginTop: SPACING.md,
  },
  delete: {
    marginTop: SPACING.xl,
  },
});
