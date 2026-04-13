import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { FoodForm } from '@/components/FoodForm';
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
      Alert.alert('Could not save food', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return <FoodForm submitLabel="Save food" onSubmit={handleSubmit} />;
}
