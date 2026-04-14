import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { COPY } from '@/lib/copy';
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
  const progress = clampProgress(totals.calories, goals.calorieGoal);
  const remaining = remainingCalories(totals.calories, goals.calorieGoal);
  const overGoal = totals.calories > goals.calorieGoal;

  return (
    <View style={styles.card} testID="totals-card">
      <Text style={styles.label}>{COPY.totals.todayLabel}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value} testID="totals-calories">
          {totals.calories}
        </Text>
        <Text style={styles.unit}>/ {goals.calorieGoal} kcal</Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%` },
            overGoal && styles.progressFillOver,
          ]}
          testID="totals-progress"
        />
      </View>

      <Text style={styles.remaining} testID="totals-remaining">
        {overGoal
          ? COPY.totals.over(totals.calories - goals.calorieGoal)
          : COPY.totals.remaining(remaining)}
      </Text>

      <View style={styles.macroRow}>
        <MacroChip label={COPY.totals.proteinLabel} value={totals.proteinG} unit="g" color={COLORS.protein} />
        <MacroChip label={COPY.totals.carbsLabel} value={totals.carbsG} unit="g" color={COLORS.carbs} />
        <MacroChip label={COPY.totals.fatLabel} value={totals.fatG} unit="g" color={COLORS.fat} />
      </View>
    </View>
  );
}

interface MacroChipProps {
  label: string;
  value: number;
  unit: string;
  color: string;
}

function MacroChip({ label, value, unit, color }: MacroChipProps) {
  return (
    <View style={styles.chip}>
      <View style={[styles.chipDot, { backgroundColor: color }]} />
      <View style={styles.chipText}>
        <Text style={styles.chipLabel}>{label}</Text>
        <Text style={styles.chipValue}>
          {Math.round(value)}
          {unit}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: SPACING.sm,
  },
  value: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.display,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  unit: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.md,
    marginLeft: SPACING.sm,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.backgroundAlt,
    overflow: 'hidden',
    marginTop: SPACING.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressFillOver: {
    backgroundColor: COLORS.protein,
  },
  remaining: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    marginTop: SPACING.sm,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: RADIUS.md,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    flex: 1,
  },
  chipLabel: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.xs,
  },
  chipValue: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
});
