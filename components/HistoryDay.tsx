import { View, Text, StyleSheet, Pressable } from 'react-native';
import { CaretRight, CaretDown } from 'phosphor-react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { COPY } from '@/lib/copy';
import type { DailyTotals, MealEntry } from '@/types';
import { formatDayLabel } from '@/lib/date';
import { EntryRow } from './EntryRow';

interface HistoryDayProps {
  totals: DailyTotals;
  entries: readonly MealEntry[];
  expanded: boolean;
  onToggle: (dayKey: string) => void;
  goalCalories: number;
}

export function HistoryDay({ totals, entries, expanded, onToggle, goalCalories }: HistoryDayProps) {
  const overGoal = totals.calories > goalCalories && goalCalories > 0;

  return (
    <View style={styles.wrap} testID={`history-day-${totals.dayKey}`}>
      <Pressable
        onPress={() => onToggle(totals.dayKey)}
        style={styles.summary}
        accessibilityRole="button"
        accessibilityLabel={`${formatDayLabel(totals.dayKey)}, ${totals.calories} calories`}
        accessibilityState={{ expanded }}
        testID={`history-toggle-${totals.dayKey}`}
      >
        <View style={styles.summaryLeft}>
          {expanded ? (
            <CaretDown color={COLORS.textSecondary} size={16} weight="bold" />
          ) : (
            <CaretRight color={COLORS.textSecondary} size={16} weight="bold" />
          )}
          <View style={styles.summaryText}>
            <Text style={styles.dayLabel}>{formatDayLabel(totals.dayKey)}</Text>
            <Text style={styles.dayMeta}>
              {totals.entryCount} {totals.entryCount === 1 ? COPY.history.mealsSingular : COPY.history.mealsPlural}
            </Text>
          </View>
        </View>
        <View style={styles.summaryRight}>
          <Text style={[styles.calories, overGoal && styles.over]}>{totals.calories}</Text>
          <Text style={styles.caloriesUnit}>kcal</Text>
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.entries} testID={`history-entries-${totals.dayKey}`}>
          {entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  summaryText: {
    flex: 1,
  },
  dayLabel: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  dayMeta: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    marginTop: 2,
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  calories: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  over: {
    color: COLORS.protein,
  },
  caloriesUnit: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.xs,
  },
  entries: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.backgroundAlt,
  },
});
