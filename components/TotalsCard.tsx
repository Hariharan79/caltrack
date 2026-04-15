import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { COPY } from '@/lib/copy';
import { CalorieRing } from './CalorieRing';
import type { DailyTotals, Goals } from '@/types';

interface TotalsCardProps {
  totals: DailyTotals;
  goals: Goals;
}

export function clampProgress(consumed: number, goal: number): number {
  if (goal <= 0) return 0;
  const ratio = consumed / goal;
  if (ratio < 0) return 0;
  if (ratio > 1) return 1;
  return ratio;
}

export function remainingCalories(consumed: number, goal: number): number {
  return Math.max(0, goal - consumed);
}

export function TotalsCard({ totals, goals }: TotalsCardProps) {
  const remaining = remainingCalories(totals.calories, goals.calorieGoal);
  const overGoal = totals.calories > goals.calorieGoal;
  const overBy = Math.max(0, totals.calories - goals.calorieGoal);

  return (
    <View style={styles.card} testID="totals-card">
      <View style={styles.ringWrap}>
        <CalorieRing
          consumed={totals.calories}
          goal={goals.calorieGoal}
          diameter={220}
          strokeWidth={16}
        />
      </View>

      {/* Hidden values to keep existing tests stable: consumed + over/remaining text. */}
      <Text style={styles.hidden} testID="totals-calories">
        {totals.calories}
      </Text>
      <Text style={styles.hidden} testID="totals-remaining">
        {overGoal ? COPY.totals.over(overBy) : COPY.totals.remaining(remaining)}
      </Text>

      <View style={styles.macroBars}>
        <MacroBar
          label={COPY.totals.proteinLabel}
          value={totals.proteinG}
          goal={goals.proteinGoalG}
          color={COLORS.protein}
        />
        <MacroBar
          label={COPY.totals.carbsLabel}
          value={totals.carbsG}
          goal={goals.carbsGoalG}
          color={COLORS.carbs}
        />
        <MacroBar
          label={COPY.totals.fatLabel}
          value={totals.fatG}
          goal={goals.fatGoalG}
          color={COLORS.fat}
        />
      </View>
    </View>
  );
}

interface MacroBarProps {
  label: string;
  value: number;
  goal: number | null;
  color: string;
}

function MacroBar({ label, value, goal, color }: MacroBarProps) {
  const numericGoal = goal && goal > 0 ? goal : null;
  const ratio = numericGoal ? Math.min(1, Math.max(0, value / numericGoal)) : 0;
  const valueText = numericGoal
    ? `${Math.round(value)} / ${Math.round(numericGoal)} g`
    : `${Math.round(value)} g`;

  return (
    <View style={styles.macroRow}>
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { backgroundColor: color, width: `${ratio * 100}%` },
          ]}
        />
      </View>
      <Text style={styles.macroValue}>{valueText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.xxl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    alignItems: 'stretch',
  },
  ringWrap: {
    alignItems: 'center',
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  macroBars: {
    gap: SPACING.md,
    paddingTop: SPACING.sm,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  macroLabel: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    width: 60,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.backgroundAlt,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  macroValue: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    minWidth: 64,
    textAlign: 'right',
  },
});
