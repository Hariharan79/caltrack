import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { FoodForm } from '@/components/FoodForm';
import { COPY } from '@/lib/copy';
import { useAppStore } from '@/lib/store';
import type { NewFoodInput } from '@/types';

export default function NewFoodScreen() {
  const router = useRouter();
  const addFood = useAppStore((s) => s.addFood);

  const handleSubmit = async (parsed: NewFoodInput) => {
    try {
      await addFood(parsed);
      router.back();
    } catch (err) {
      Alert.alert(COPY.foods.form.saveFailedTitle, err instanceof Error ? err.message : COPY.errors.unknown);
    }
  };

  return <FoodForm submitLabel={COPY.foods.form.saveNew} onSubmit={handleSubmit} />;
}
