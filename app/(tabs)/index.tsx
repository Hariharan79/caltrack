import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'phosphor-react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { COPY } from '@/lib/copy';
import {
  useAppStore,
  selectTodayEntries,
  selectTodayTotals,
} from '@/lib/store';
import { TotalsCard } from '@/components/TotalsCard';
import { EntriesList } from '@/components/EntriesList';
import { AddMealSheet } from '@/components/AddMealSheet';
import type { MealEntry } from '@/types';

const TAB_BAR_PADDING = 96;

function todayHeaderLabel(now: Date = new Date()): string {
  return now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MealEntry | null>(null);

  const goals = useAppStore((s) => s.goals);
  const rawEntries = useAppStore((s) => s.entries);
  const removeEntry = useAppStore((s) => s.removeEntry);

  const totals = useMemo(() => selectTodayTotals(rawEntries), [rawEntries]);
  const entries = useMemo(() => selectTodayEntries(rawEntries), [rawEntries]);

  const handleRemoveEntry = async (id: string) => {
    try {
      await removeEntry(id);
    } catch (err) {
      Alert.alert(COPY.today.deleteFailedTitle, err instanceof Error ? err.message : COPY.errors.unknown);
    }
  };

  const handlePressEntry = (entry: MealEntry) => {
    setEditingEntry(entry);
    setSheetVisible(true);
  };

  const handleCloseSheet = () => {
    setSheetVisible(false);
    setEditingEntry(null);
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
          <Text style={styles.greeting}>{COPY.today.heading}</Text>
          <Text style={styles.date}>{todayHeaderLabel()}</Text>
        </View>

        <TotalsCard totals={totals} goals={goals} />

        <Text style={styles.sectionTitle}>{COPY.today.sectionMeals}</Text>
        <EntriesList
          entries={entries}
          onDelete={handleRemoveEntry}
          onPressEntry={handlePressEntry}
          emptyText={COPY.today.emptyEntries}
        />
      </ScrollView>

      <Pressable
        onPress={() => {
          setEditingEntry(null);
          setSheetVisible(true);
        }}
        style={[styles.fab, { bottom: TAB_BAR_PADDING + insets.bottom - 32 }]}
        accessibilityRole="button"
        accessibilityLabel={COPY.today.fabLabel}
        testID="log-meal-fab"
      >
        <Plus color={COLORS.text} size={28} weight="bold" />
      </Pressable>

      <AddMealSheet
        visible={sheetVisible}
        onClose={handleCloseSheet}
        initialEntry={editingEntry}
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
  greeting: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.display,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  date: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.md,
    marginTop: 2,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  fab: {
    position: 'absolute',
    right: SPACING.xl,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
});
