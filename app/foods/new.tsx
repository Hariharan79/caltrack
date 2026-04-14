import { useMemo } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { FoodForm } from '@/components/FoodForm';
import { COPY } from '@/lib/copy';
import { useAppStore } from '@/lib/store';
import { takeScanDraft } from '@/lib/scanDraft';
import type { NewFoodInput } from '@/types';

export default function NewFoodScreen() {
  const router = useRouter();
  const addFood = useAppStore((s) => s.addFood);

  // Consume any pending scan draft exactly once on mount. useMemo keeps this
  // side-effect-free across re-renders (the draft is cleared inside take()).
  const scanDraft = useMemo(() => takeScanDraft(), []);

  const handleSubmit = async (parsed: NewFoodInput) => {
    try {
      await addFood({
        ...parsed,
        source: scanDraft?.source ?? 'manual',
        sourceId: scanDraft?.sourceId ?? null,
        barcode: scanDraft?.barcode ?? null,
      });
      router.back();
    } catch (err) {
      Alert.alert(
        COPY.foods.form.saveFailedTitle,
        err instanceof Error ? err.message : COPY.errors.unknown
      );
    }
  };

  return (
    <FoodForm
      initial={scanDraft?.initial}
      submitLabel={COPY.foods.form.saveNew}
      onSubmit={handleSubmit}
    />
  );
}
