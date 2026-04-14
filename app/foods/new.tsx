import { useMemo } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { FoodForm } from '@/components/FoodForm';
import { COPY } from '@/lib/copy';
import { useAppStore } from '@/lib/store';
import { setScanDraft, takeScanDraft, type LibraryScanDraft } from '@/lib/scanDraft';
import type { NewFoodInput } from '@/types';

export default function NewFoodScreen() {
  const router = useRouter();
  const addFood = useAppStore((s) => s.addFood);

  // Consume any pending scan draft exactly once on mount, but only if it was
  // routed to the library. Log-destination drafts belong to the Today screen —
  // if we see one here it means the user bounced into foods/new while a log
  // scan was in flight, so we put it back and let the intended consumer claim
  // it on its next focus pass. useMemo keeps this side-effect-free across
  // re-renders (takeScanDraft clears the singleton as it reads).
  const scanDraft = useMemo<LibraryScanDraft | null>(() => {
    const draft = takeScanDraft();
    if (!draft) return null;
    if (draft.destination !== 'library') {
      setScanDraft(draft);
      return null;
    }
    return draft;
  }, []);

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
