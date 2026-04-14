import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { dayStatus, type CalendarCell, type DayStatus } from '@/lib/calendar';
import type { DailyTotals } from '@/types';

interface CalendarGridProps {
  rows: CalendarCell[][];
  totalsByDay: Map<string, DailyTotals>;
  goalCalories: number;
  onDayPress: (dayKey: string) => void;
  testID?: string;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

function statusColor(status: DayStatus): string {
  switch (status) {
    case 'hit':
      return COLORS.primary;
    case 'under':
      return COLORS.fat;
    case 'over':
      return COLORS.protein;
    case 'none':
    default:
      return 'transparent';
  }
}

export function CalendarGrid({
  rows,
  totalsByDay,
  goalCalories,
  onDayPress,
  testID,
}: CalendarGridProps) {
  return (
    <View testID={testID}>
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <Text
            key={`${label}-${i}`}
            style={styles.weekdayLabel}
            accessibilityElementsHidden
          >
            {label}
          </Text>
        ))}
      </View>

      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((cell) => {
            const totals = totalsByDay.get(cell.dayKey);
            const status = dayStatus(totals?.calories, goalCalories);
            const interactive = !cell.isFuture;

            return (
              <Pressable
                key={cell.dayKey}
                onPress={interactive ? () => onDayPress(cell.dayKey) : undefined}
                disabled={!interactive}
                accessibilityRole="button"
                accessibilityLabel={`${cell.dayKey}${
                  totals ? `, ${totals.calories} calories` : ', no entries'
                }`}
                testID={`cal-cell-${cell.dayKey}`}
                style={({ pressed }) => [
                  styles.cell,
                  !cell.inMonth && styles.cellOutOfMonth,
                  cell.isFuture && styles.cellFuture,
                  pressed && interactive && styles.cellPressed,
                ]}
              >
                <View
                  style={[
                    styles.cellInner,
                    cell.isToday && styles.cellToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      !cell.inMonth && styles.dayNumberMuted,
                      cell.isFuture && styles.dayNumberMuted,
                    ]}
                  >
                    {cell.dayOfMonth}
                  </Text>
                  {status !== 'none' ? (
                    <View
                      style={[styles.dot, { backgroundColor: statusColor(status) }]}
                      testID={`cal-dot-${cell.dayKey}`}
                    />
                  ) : (
                    <View style={styles.dotPlaceholder} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 2,
    marginBottom: SPACING.xs,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 2,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    padding: 2,
  },
  cellInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundAlt,
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  cellOutOfMonth: {
    opacity: 0.35,
  },
  cellFuture: {
    opacity: 0.4,
  },
  cellPressed: {
    opacity: 0.6,
  },
  dayNumber: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  dayNumberMuted: {
    color: COLORS.textSecondary,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 3,
  },
  dotPlaceholder: {
    width: 6,
    height: 6,
    marginTop: 3,
  },
});
