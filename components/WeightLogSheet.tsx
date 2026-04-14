import { useState, useMemo, useEffect } from 'react';
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
import type { NewWeightInput } from '@/types';
import {
  EMPTY_WEIGHT_DRAFT,
  validateWeightDraft,
  type WeightDraft,
} from '@/lib/weight';

interface WeightLogSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: NewWeightInput) => void | Promise<void>;
}

export function WeightLogSheet({ visible, onClose, onSubmit }: WeightLogSheetProps) {
  const [draft, setDraft] = useState<WeightDraft>(EMPTY_WEIGHT_DRAFT);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const validation = useMemo(() => validateWeightDraft(draft), [draft]);
  const visibleErrors = submitted ? validation.errors : {};

  useEffect(() => {
    if (!visible) {
      setDraft(EMPTY_WEIGHT_DRAFT);
      setSubmitted(false);
      setSaving(false);
    }
  }, [visible]);

  const update = (key: keyof WeightDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!validation.parsed) return;
    setSaving(true);
    try {
      await onSubmit(validation.parsed);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'formSheet' : 'overFullScreen'}
      transparent={Platform.OS !== 'ios'}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.headerAction}>Cancel</Text>
            </Pressable>
            <Text style={styles.title}>Log weight</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <TextField
              label="Weight (kg)"
              value={draft.weightKg}
              onChangeText={(v) => update('weightKg', v)}
              placeholder="e.g. 72.4"
              keyboardType="decimal-pad"
              error={visibleErrors.weightKg}
              testID="weight-kg"
            />
            <TextField
              label="Body fat % (optional)"
              value={draft.bodyFatPct}
              onChangeText={(v) => update('bodyFatPct', v)}
              placeholder="—"
              keyboardType="decimal-pad"
              error={visibleErrors.bodyFatPct}
              testID="weight-bodyfat"
            />
          </ScrollView>

          <View style={styles.footer}>
            <PrimaryButton
              label="Save weight"
              onPress={handleSubmit}
              loading={saving}
              testID="weight-save"
            />
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
  footer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
});
