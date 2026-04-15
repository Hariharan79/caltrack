import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, CaretRight } from 'phosphor-react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { COPY } from '@/lib/copy';
import { useAppStore } from '@/lib/store';
import { CalendarGrid } from '@/components/CalendarGrid';
import { DayDetailSheet } from '@/components/DayDetailSheet';
import { AppHeader } from '@/components/AppHeader';
import { WeekStreak } from '@/components/WeekStreak';
import { SectionCard } from '@/components/SectionCard';
import {
  addMonths,
  buildMonthGrid,
  buildTotalsByDay,
  currentMonth,
  formatMonthLabel,
  isSameMonth,
  type CalendarMonth,
} from '@/lib/calendar';

const TAB_BAR_PADDING = 110;

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const entries = useAppStore((s) => s.entries);
  const goals = useAppStore((s) => s.goals);

  const [visibleMonth, setVisibleMonth] = useState<CalendarMonth>(() =>
    currentMonth()
  );
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const rows = useMemo(
    () => buildMonthGrid(visibleMonth.year, visibleMonth.month),
    [visibleMonth]
  );
  const totalsByDay = useMemo(() => buildTotalsByDay(entries), [entries]);
  const monthLabel = formatMonthLabel(visibleMonth.year, visibleMonth.month);
  const thisMonth = currentMonth();
  const atCurrentMonth = isSameMonth(visibleMonth, thisMonth);

  const selectedTotals = selectedDay ? totalsByDay.get(selectedDay) ?? null : null;
  const selectedEntries = selectedDay
    ? entries.filter((e) => e.dayKey === selectedDay)
    : [];

  const goPrev = () => {
    setVisibleMonth((m) => addMonths(m.year, m.month, -1));
  };
  const goNext = () => {
    setVisibleMonth((m) => addMonths(m.year, m.month, 1));
  };
  const goToday = () => {
    setVisibleMonth(currentMonth());
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
        <AppHeader title={COPY.history.heading} />

        <WeekStreak entries={entries} />

        <SectionCard>
          <View style={styles.monthBar}>
            <Pressable
              onPress={goPrev}
              accessibilityRole="button"
              accessibilityLabel={COPY.history.prevMonth}
              testID="cal-prev"
              style={styles.navButton}
              hitSlop={8}
            >
              <CaretLeft color={COLORS.text} size={20} weight="bold" />
            </Pressable>

            <Text style={styles.monthLabel} testID="cal-month-label">
              {monthLabel}
            </Text>

            <Pressable
              onPress={goNext}
              accessibilityRole="button"
              accessibilityLabel={COPY.history.nextMonth}
              testID="cal-next"
              style={styles.navButton}
              hitSlop={8}
            >
              <CaretRight color={COLORS.text} size={20} weight="bold" />
            </Pressable>
          </View>

          {!atCurrentMonth ? (
            <Pressable
              onPress={goToday}
              accessibilityRole="button"
              accessibilityLabel={COPY.history.jumpToToday}
              testID="cal-today"
              style={styles.todayButton}
            >
              <Text style={styles.todayLabel}>{COPY.history.jumpToToday}</Text>
            </Pressable>
          ) : null}

          <CalendarGrid
            rows={rows}
            totalsByDay={totalsByDay}
            goalCalories={goals.calorieGoal}
            onDayPress={(dayKey) => setSelectedDay(dayKey)}
            testID="cal-grid"
          />

          <View style={styles.legend}>
            <LegendItem color={COLORS.primary} label={COPY.history.legendAtGoal} />
            <LegendItem color={COLORS.fat} label={COPY.history.legendUnder} />
            <LegendItem color={COLORS.protein} label={COPY.history.legendOver} />
          </View>
        </SectionCard>
      </ScrollView>

      <DayDetailSheet
        visible={selectedDay !== null}
        dayKey={selectedDay}
        totals={selectedTotals}
        entries={selectedEntries}
        goalCalories={goals.calorieGoal}
        onClose={() => setSelectedDay(null)}
      />
    </View>
  );
}

interface LegendItemProps {
  color: string;
  label: string;
}

function LegendItem({ color, label }: LegendItemProps) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
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
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  monthLabel: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  navButton: {
    padding: SPACING.sm,
  },
  todayButton: {
    alignSelf: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  todayLabel: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
  },
});
