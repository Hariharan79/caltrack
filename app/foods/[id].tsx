import { useMemo } from 'react';
import { Alert, Text, View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { COPY } from '@/lib/copy';
import { FoodForm } from '@/components/FoodForm';
import { foodToDraft } from '@/lib/foodForm';
import { useAppStore } from '@/lib/store';
import type { NewFoodInput } from '@/types';

export default function EditFoodScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const food = useAppStore((s) => s.foods.find((f) => f.id === id));
  const updateFood = useAppStore((s) => s.updateFood);
  const deleteFood = useAppStore((s) => s.deleteFood);

  const initialDraft = useMemo(() => (food ? foodToDraft(food) : undefined), [food]);

  if (!food) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>{COPY.foods.edit.missing}</Text>
      </View>
    );
  }

  const handleSubmit = async (parsed: NewFoodInput) => {
    try {
      await updateFood(food.id, parsed);
      router.back();
    } catch (err) {
      Alert.alert(COPY.foods.form.updateFailedTitle, err instanceof Error ? err.message : COPY.errors.unknown);
    }
  };

  const confirmDelete = () => {
    Alert.alert(COPY.foods.form.deleteConfirmTitle, COPY.foods.form.deleteConfirmBody(food.name), [
      { text: COPY.foods.form.deleteConfirmCancel, style: 'cancel' },
      {
        text: COPY.foods.form.deleteConfirmAction,
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFood(food.id);
            router.back();
          } catch (err) {
            Alert.alert(
              COPY.foods.form.deleteFailedTitle,
              err instanceof Error ? err.message : COPY.errors.unknown
            );
          }
        },
      },
    ]);
  };

  return (
    <FoodForm
      initial={initialDraft}
      submitLabel={COPY.foods.form.saveEdit}
      onSubmit={handleSubmit}
      onDelete={confirmDelete}
    />
  );
}

const styles = StyleSheet.create({
  missing: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.md,
    textAlign: 'center',
  },
});
