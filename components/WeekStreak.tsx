import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { dayKey } from '@/lib/date';
import type { MealEntry } from '@/types';

interface WeekStreakProps {
  entries?: readonly MealEntry[];
  /**
   * Pre-computed set of day keys that have at least one logged (eaten) entry.
   * Use this when the parent already has aggregated data — avoids recomputing.
   */
  loggedDays?: ReadonlySet<string>;
  now?: Date;
  testID?: string;
}

interface DayCell {
  key: string;
  letter: string;
  isToday: boolean;
  isLogged: boolean;
}

const WEEK_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

/**
 * Build the 7-day strip ending today. Returns Sunday→Saturday in local time,
 * with each cell flagged for "isToday" and "isLogged".
 */
export function buildWeekDays(
  loggedSet: ReadonlySet<string>,
  now: Date = new Date()
): DayCell[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKeyStr = dayKey(today);
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  const cells: DayCell[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const key = dayKey(d);
    cells.push({
      key,
      letter: WEEK_LETTERS[i],
      isToday: key === todayKeyStr,
      isLogged: loggedSet.has(key),
    });
  }
  return cells;
}

function buildLoggedSet(entries: readonly MealEntry[]): Set<string> {
  const out = new Set<string>();
  for (const e of entries) {
    if (e.status === 'eaten') out.add(e.dayKey);
  }
  return out;
}

export function WeekStreak({
  entries,
  loggedDays,
  now,
  testID = 'week-streak',
}: WeekStreakProps) {
  const set = loggedDays ?? buildLoggedSet(entries ?? []);
  const cells = buildWeekDays(set, now);
  return (
    <View style={styles.row} testID={testID}>
      {cells.map((cell, i) => {
        const dotStyle = [
          styles.dot,
          cell.isLogged && styles.dotLogged,
          cell.isToday && styles.dotToday,
        ];
        return (
          <View key={`${cell.key}-${i}`} style={styles.cell} testID={`week-streak-${cell.key}`}>
            <Text style={[styles.letter, cell.isToday && styles.letterToday]}>
              {cell.letter}
            </Text>
            <View style={dotStyle} />
          </View>
        );
      })}
    </View>
  );
}

const DOT_SIZE = 10;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  cell: {
    alignItems: 'center',
    flex: 1,
    gap: SPACING.xs,
  },
  letter: {
    color: COLORS.textTertiary,
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    textTransform: 'uppercase',
  },
  letterToday: {
    color: COLORS.text,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.borderStrong,
  },
  dotLogged: {
    backgroundColor: COLORS.primary,
  },
  dotToday: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    width: DOT_SIZE + 4,
    height: DOT_SIZE + 4,
    borderRadius: RADIUS.pill,
  },
});
