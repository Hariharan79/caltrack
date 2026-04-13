import { useMemo } from 'react';
import { Alert, Text, View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';
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
        <Text style={styles.missingText}>That food isn&apos;t in your library.</Text>
      </View>
    );
  }

  const handleSubmit = async (parsed: NewFoodInput) => {
    try {
      await updateFood(food.id, parsed);
      router.back();
    } catch (err) {
      Alert.alert('Could not update food', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete food?', `Remove "${food.name}" from your library.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFood(food.id);
            router.back();
          } catch (err) {
            Alert.alert(
              'Could not delete food',
              err instanceof Error ? err.message : 'Unknown error'
            );
          }
        },
      },
    ]);
  };

  return (
    <FoodForm
      initial={initialDraft}
      submitLabel="Save changes"
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
