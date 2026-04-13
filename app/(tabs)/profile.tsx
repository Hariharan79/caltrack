import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { useAppStore } from '@/lib/store';
import { TextField } from '@/components/TextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { signOut } from '@/lib/auth';
import {
  goalsToDraft,
  validateGoalsDraft,
  type GoalsDraft,
} from '@/lib/goals';

const TAB_BAR_PADDING = 96;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const goals = useAppStore((s) => s.goals);
  const updateGoals = useAppStore((s) => s.updateGoals);

  const [draft, setDraft] = useState<GoalsDraft>(() => goalsToDraft(goals));
  const [submitted, setSubmitted] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setDraft(goalsToDraft(goals));
  }, [goals]);

  const validation = useMemo(() => validateGoalsDraft(draft), [draft]);
  const visibleErrors = submitted ? validation.errors : {};

  const update = (key: keyof GoalsDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setSubmitted(true);
    if (validation.parsed) {
      updateGoals(validation.parsed);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'Your data stays on the server.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
          } catch (err) {
            Alert.alert('Sign out failed', err instanceof Error ? err.message : 'Unknown error');
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: TAB_BAR_PADDING + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.heading}>Profile</Text>
          <Text style={styles.sub}>Daily nutrition goals</Text>
        </View>

        <TextField
          label="Calorie goal"
          value={draft.calorieGoal}
          onChangeText={(v) => update('calorieGoal', v)}
          placeholder="2000"
          keyboardType="number-pad"
          error={visibleErrors.calorieGoal}
          testID="goal-calories"
        />
        <TextField
          label="Protein goal (g)"
          value={draft.proteinGoalG}
          onChangeText={(v) => update('proteinGoalG', v)}
          placeholder="optional"
          keyboardType="number-pad"
          error={visibleErrors.proteinGoalG}
          testID="goal-protein"
        />
        <TextField
          label="Carbs goal (g)"
          value={draft.carbsGoalG}
          onChangeText={(v) => update('carbsGoalG', v)}
          placeholder="optional"
          keyboardType="number-pad"
          error={visibleErrors.carbsGoalG}
          testID="goal-carbs"
        />
        <TextField
          label="Fat goal (g)"
          value={draft.fatGoalG}
          onChangeText={(v) => update('fatGoalG', v)}
          placeholder="optional"
          keyboardType="number-pad"
          error={visibleErrors.fatGoalG}
          testID="goal-fat"
        />

        {savedFlash ? (
          <Text style={styles.savedFlash} testID="saved-flash">
            Goals saved
          </Text>
        ) : null}

        <PrimaryButton label="Save goals" onPress={handleSave} testID="save-goals" style={styles.saveButton} />

        <View style={styles.dangerZone}>
          <Text style={styles.dangerLabel}>Session</Text>
          <PrimaryButton
            label="Sign out"
            onPress={handleSignOut}
            variant="danger"
            loading={signingOut}
            testID="sign-out"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  heading: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.display,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  sub: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.md,
    marginTop: 2,
  },
  savedFlash: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    textAlign: 'center',
    marginVertical: SPACING.sm,
  },
  saveButton: {
    marginTop: SPACING.sm,
  },
  dangerZone: {
    marginTop: SPACING.xxxl,
    paddingTop: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  dangerLabel: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.md,
  },
});
