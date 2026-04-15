import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { COPY } from '@/lib/copy';
import type { MealEntry } from '@/types';
import { EntryRow, type EntryRowVariant } from './EntryRow';

interface EntriesListProps {
  entries: readonly MealEntry[];
  onDelete?: (id: string) => void;
  onPressEntry?: (entry: MealEntry) => void;
  onMarkEaten?: (id: string) => void;
  emptyText?: string;
  variant?: EntryRowVariant;
  testID?: string;
}

export function EntriesList({
  entries,
  onDelete,
  onPressEntry,
  onMarkEaten,
  emptyText = COPY.entries.defaultEmpty,
  variant = 'default',
  testID = 'entries-list',
}: EntriesListProps) {
  if (entries.length === 0) {
    return (
      <View style={styles.empty} testID="entries-empty">
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  return (
    <View testID={testID}>
      {entries.map((entry) => (
        <EntryRow
          key={entry.id}
          entry={entry}
          onDelete={onDelete}
          onPress={onPressEntry}
          onMarkEaten={onMarkEaten}
          variant={variant}
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
