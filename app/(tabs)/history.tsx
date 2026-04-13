import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { useAppStore, selectHistory } from '@/lib/store';
import { HistoryDay } from '@/components/HistoryDay';

const TAB_BAR_PADDING = 96;

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const history = useAppStore(selectHistory);
  const goals = useAppStore((s) => s.goals);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (dayKey: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(dayKey)) {
        next.delete(dayKey);
      } else {
        next.add(dayKey);
      }
      return next;
    });
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
          <Text style={styles.heading}>History</Text>
          <Text style={styles.sub}>
            {history.length === 0 ? 'No past days yet' : `${history.length} day${history.length === 1 ? '' : 's'} logged`}
          </Text>
        </View>

        {history.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Logged meals will appear here once a day rolls over.</Text>
          </View>
        ) : (
          history.map((day) => (
            <HistoryDay
              key={day.totals.dayKey}
              totals={day.totals}
              entries={day.entries}
              expanded={expanded.has(day.totals.dayKey)}
              onToggle={toggle}
              goalCalories={goals.calorieGoal}
            />
          ))
        )}
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
  empty: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.md,
    textAlign: 'center',
  },
});
