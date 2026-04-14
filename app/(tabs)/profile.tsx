import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { COPY } from '@/lib/copy';
import { useAppStore, selectLatestWeight } from '@/lib/store';
import { TextField } from '@/components/TextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { WeightChart } from '@/components/WeightChart';
import { WeightLogSheet } from '@/components/WeightLogSheet';
import { signOut } from '@/lib/auth';
import {
  goalsToDraft,
  validateGoalsDraft,
  type GoalsDraft,
} from '@/lib/goals';

const TAB_BAR_PADDING = 96;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const goals = useAppStore((s) => s.goals);
  const updateGoals = useAppStore((s) => s.updateGoals);
  const foodsCount = useAppStore((s) => s.foods.length);
  const weightEntries = useAppStore((s) => s.weightEntries);
  const addWeight = useAppStore((s) => s.addWeight);
  const latestWeight = useMemo(() => selectLatestWeight(weightEntries), [weightEntries]);

  const [draft, setDraft] = useState<GoalsDraft>(() => goalsToDraft(goals));
  const [submitted, setSubmitted] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [weightSheetVisible, setWeightSheetVisible] = useState(false);
  const [chartWidth, setChartWidth] = useState(0);

  const onChartLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== chartWidth) setChartWidth(w);
  };

  const handleLogWeight = async (input: { weightKg: number; bodyFatPct: number | null }) => {
    try {
      await addWeight(input);
    } catch (err) {
      Alert.alert(
        COPY.profile.weight.saveFailedTitle,
        err instanceof Error ? err.message : COPY.errors.unknown
      );
    }
  };

  useEffect(() => {
    setDraft(goalsToDraft(goals));
  }, [goals]);

  const validation = useMemo(() => validateGoalsDraft(draft), [draft]);
  const visibleErrors = submitted ? validation.errors : {};

  const update = (key: keyof GoalsDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSubmitted(true);
    if (!validation.parsed) return;
    setSaving(true);
    try {
      await updateGoals(validation.parsed);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (err) {
      Alert.alert(COPY.profile.goals.saveFailedTitle, err instanceof Error ? err.message : COPY.errors.unknown);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(COPY.profile.dangerZone.signOutTitle, COPY.profile.dangerZone.signOutBody, [
      { text: COPY.profile.dangerZone.signOutCancel, style: 'cancel' },
      {
        text: COPY.profile.dangerZone.signOutConfirm,
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
          } catch (err) {
            Alert.alert(COPY.profile.dangerZone.signOutFailedTitle, err instanceof Error ? err.message : COPY.errors.unknown);
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
          <Text style={styles.heading}>{COPY.profile.heading}</Text>
          <Text style={styles.sub}>{COPY.profile.subtitle}</Text>
        </View>

        <View style={styles.weightCard} onLayout={onChartLayout}>
          <View style={styles.weightHeader}>
            <Text style={styles.sectionLabel}>{COPY.profile.sectionWeight}</Text>
            {latestWeight ? (
              <Text style={styles.weightLatest} testID="weight-latest">
                {latestWeight.weightKg.toFixed(1)} kg
              </Text>
            ) : null}
          </View>
          {chartWidth > 0 ? (
            <WeightChart
              entries={weightEntries}
              width={chartWidth}
              testID="weight-chart"
            />
          ) : null}
          <PrimaryButton
            label={COPY.profile.logWeightButton}
            onPress={() => setWeightSheetVisible(true)}
            variant="secondary"
            testID="open-weight-sheet"
            style={styles.weightButton}
          />
        </View>

        <PrimaryButton
          label={foodsCount > 0 ? COPY.profile.openLibraryWithCount(foodsCount) : COPY.profile.openLibrary}
          variant="secondary"
          onPress={() => router.push('/foods')}
          testID="open-foods"
          style={styles.libraryButton}
        />

        <TextField
          label={COPY.profile.goals.calorieLabel}
          value={draft.calorieGoal}
          onChangeText={(v) => update('calorieGoal', v)}
          placeholder={COPY.profile.goals.caloriePlaceholder}
          keyboardType="number-pad"
          error={visibleErrors.calorieGoal}
          testID="goal-calories"
        />
        <TextField
          label={COPY.profile.goals.proteinLabel}
          value={draft.proteinGoalG}
          onChangeText={(v) => update('proteinGoalG', v)}
          placeholder={COPY.profile.goals.optionalPlaceholder}
          keyboardType="number-pad"
          error={visibleErrors.proteinGoalG}
          testID="goal-protein"
        />
        <TextField
          label={COPY.profile.goals.carbsLabel}
          value={draft.carbsGoalG}
          onChangeText={(v) => update('carbsGoalG', v)}
          placeholder={COPY.profile.goals.optionalPlaceholder}
          keyboardType="number-pad"
          error={visibleErrors.carbsGoalG}
          testID="goal-carbs"
        />
        <TextField
          label={COPY.profile.goals.fatLabel}
          value={draft.fatGoalG}
          onChangeText={(v) => update('fatGoalG', v)}
          placeholder={COPY.profile.goals.optionalPlaceholder}
          keyboardType="number-pad"
          error={visibleErrors.fatGoalG}
          testID="goal-fat"
        />

        {savedFlash ? (
          <Text style={styles.savedFlash} testID="saved-flash">
            {COPY.profile.goals.saved}
          </Text>
        ) : null}

        <PrimaryButton
          label={COPY.profile.goals.saveButton}
          onPress={handleSave}
          loading={saving}
          testID="save-goals"
          style={styles.saveButton}
        />

        <Pressable
          onPress={() => router.push('/data-sources')}
          accessibilityRole="link"
          accessibilityLabel={COPY.dataSources.profileLink}
          hitSlop={8}
          style={styles.dataSourcesLink}
          testID="open-data-sources"
        >
          <Text style={styles.dataSourcesLinkText}>{COPY.dataSources.profileLink}</Text>
        </Pressable>

        <View style={styles.dangerZone}>
          <Text style={styles.dangerLabel}>{COPY.profile.sectionSession}</Text>
          <PrimaryButton
            label={COPY.profile.dangerZone.signOutButton}
            onPress={handleSignOut}
            variant="danger"
            loading={signingOut}
            testID="sign-out"
          />
        </View>
      </ScrollView>

      <WeightLogSheet
        visible={weightSheetVisible}
        onClose={() => setWeightSheetVisible(false)}
        onSubmit={handleLogWeight}
      />
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
  libraryButton: {
    marginBottom: SPACING.lg,
  },
  weightCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  weightHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  sectionLabel: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  weightLatest: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  weightButton: {
    marginTop: SPACING.md,
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
  dataSourcesLink: {
    alignSelf: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.lg,
  },
  dataSourcesLinkText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    textDecorationLine: 'underline',
  },
});
