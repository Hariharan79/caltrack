import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { COPY } from '@/lib/copy';
import { TextField } from './TextField';
import { PrimaryButton } from './PrimaryButton';
import {
  EMPTY_FOOD_DRAFT,
  validateFoodDraft,
  type FoodDraft,
} from '@/lib/foodForm';
import { checkMacroSanity } from '@/lib/nutrition';
import type { NewFoodInput } from '@/types';

const MILD_WARNING_BG = '#facc15';
const BLATANT_WARNING_BG = '#ef4444';

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

  const sanity = useMemo(() => {
    const kcalNum = Number(draft.kcalPerServing);
    if (!Number.isFinite(kcalNum) || kcalNum <= 0) return null;
    const parseMacro = (raw: string): number | null => {
      if (raw.trim() === '') return null;
      const n = Number(raw);
      if (!Number.isFinite(n)) return null;
      return n;
    };
    const proteinG = parseMacro(draft.proteinGPerServing);
    const carbsG = parseMacro(draft.carbsGPerServing);
    const fatG = parseMacro(draft.fatGPerServing);
    if (proteinG == null && carbsG == null && fatG == null) return null;
    return checkMacroSanity({ calories: kcalNum, proteinG, carbsG, fatG });
  }, [
    draft.kcalPerServing,
    draft.proteinGPerServing,
    draft.carbsGPerServing,
    draft.fatGPerServing,
  ]);

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
        label={COPY.foods.form.nameLabel}
        value={draft.name}
        onChangeText={(v) => update('name', v)}
        placeholder={COPY.foods.form.namePlaceholder}
        autoCapitalize="words"
        error={visibleErrors.name}
        testID="food-name"
      />
      <TextField
        label={COPY.foods.form.servingLabel}
        value={draft.servingSize}
        onChangeText={(v) => update('servingSize', v)}
        placeholder={COPY.foods.form.servingPlaceholder}
        autoCapitalize="none"
        error={visibleErrors.servingSize}
        testID="food-serving-size"
      />
      <TextField
        label={COPY.foods.form.kcalLabel}
        value={draft.kcalPerServing}
        onChangeText={(v) => update('kcalPerServing', v)}
        placeholder={COPY.foods.form.kcalPlaceholder}
        keyboardType="number-pad"
        error={visibleErrors.kcalPerServing}
        testID="food-kcal"
      />

      <View style={styles.row}>
        <View style={styles.col}>
          <TextField
            label={COPY.foods.form.proteinLabel}
            value={draft.proteinGPerServing}
            onChangeText={(v) => update('proteinGPerServing', v)}
            placeholder={COPY.foods.form.macroPlaceholder}
            keyboardType="number-pad"
            error={visibleErrors.proteinGPerServing}
            testID="food-protein"
          />
        </View>
        <View style={styles.col}>
          <TextField
            label={COPY.foods.form.carbsLabel}
            value={draft.carbsGPerServing}
            onChangeText={(v) => update('carbsGPerServing', v)}
            placeholder={COPY.foods.form.macroPlaceholder}
            keyboardType="number-pad"
            error={visibleErrors.carbsGPerServing}
            testID="food-carbs"
          />
        </View>
        <View style={styles.col}>
          <TextField
            label={COPY.foods.form.fatLabel}
            value={draft.fatGPerServing}
            onChangeText={(v) => update('fatGPerServing', v)}
            placeholder={COPY.foods.form.macroPlaceholder}
            keyboardType="number-pad"
            error={visibleErrors.fatGPerServing}
            testID="food-fat"
          />
        </View>
      </View>

      {sanity && !sanity.ok ? (
        <View
          style={[
            styles.sanityChip,
            sanity.severity === 'blatant'
              ? styles.sanityChipBlatant
              : styles.sanityChipMild,
          ]}
          testID={`food-sanity-${sanity.severity}`}
        >
          <Text style={styles.sanityText}>
            {sanity.severity === 'blatant'
              ? `${COPY.foods.form.sanityBlatantPrefix}. ${COPY.foods.form.sanityImplied(Math.round(sanity.impliedKcal))}`
              : `${COPY.foods.form.sanityMildPrefix}. ${COPY.foods.form.sanityImplied(Math.round(sanity.impliedKcal))}`}
          </Text>
        </View>
      ) : null}

      <PrimaryButton
        label={submitLabel}
        onPress={handleSubmit}
        loading={saving}
        testID="food-save"
        style={styles.submit}
      />

      {onDelete ? (
        <PrimaryButton
          label={COPY.foods.form.deleteButton}
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
  sanityChip: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  sanityChipMild: {
    backgroundColor: MILD_WARNING_BG,
  },
  sanityChipBlatant: {
    backgroundColor: BLATANT_WARNING_BG,
  },
  sanityText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
});
