import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import type { MealEntry } from '@/types';
import { EntryRow } from './EntryRow';

interface EntriesListProps {
  entries: readonly MealEntry[];
  onDelete?: (id: string) => void;
  onPressEntry?: (entry: MealEntry) => void;
  emptyText?: string;
}

export function EntriesList({
  entries,
  onDelete,
  onPressEntry,
  emptyText = 'No meals yet',
}: EntriesListProps) {
  if (entries.length === 0) {
    return (
      <View style={styles.empty} testID="entries-empty">
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  return (
    <View testID="entries-list">
      {entries.map((entry) => (
        <EntryRow
          key={entry.id}
          entry={entry}
          onDelete={onDelete}
          onPress={onPressEntry}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.md,
  },
});
