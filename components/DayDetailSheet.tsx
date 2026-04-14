import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { COPY } from '@/lib/copy';
import type { DailyTotals, MealEntry } from '@/types';
import { formatDayLabel } from '@/lib/date';
import { EntryRow } from './EntryRow';

interface DayDetailSheetProps {
  visible: boolean;
  dayKey: string | null;
  totals: DailyTotals | null;
  entries: readonly MealEntry[];
  goalCalories: number;
  onClose: () => void;
}

export function DayDetailSheet({
  visible,
  dayKey,
  totals,
  entries,
  goalCalories,
  onClose,
}: DayDetailSheetProps) {
  const label = dayKey ? formatDayLabel(dayKey) : '';
  const overGoal =
    totals != null && goalCalories > 0 && totals.calories > goalCalories;

  const sortedEntries = [...entries].sort((a, b) =>
    b.loggedAt.localeCompare(a.loggedAt)
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'formSheet' : 'overFullScreen'}
      transparent={Platform.OS !== 'ios'}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={COPY.history.detailClose}
            testID="day-detail-close"
          >
            <Text style={styles.headerAction}>{COPY.history.detailClose}</Text>
          </Pressable>
          <Text style={styles.title}>{label}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {totals ? (
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{COPY.history.detailCaloriesLabel}</Text>
                <Text
                  style={[styles.summaryValue, overGoal && styles.over]}
                >
                  {totals.calories}
                  {goalCalories > 0 ? ` / ${goalCalories}` : ''} kcal
                </Text>
              </View>
              <View style={styles.macroRow}>
                <Text style={styles.macro}>{Math.round(totals.proteinG)}P</Text>
                <Text style={styles.macro}>{Math.round(totals.carbsG)}C</Text>
                <Text style={styles.macro}>{Math.round(totals.fatG)}F</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>{COPY.history.emptyDay}</Text>
          )}

          {sortedEntries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  summary: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  over: {
    color: COLORS.protein,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  macro: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.md,
    textAlign: 'center',
    paddingVertical: SPACING.xl,
  },
});
