import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { COPY } from '@/lib/copy';
import type { MealEntry } from '@/types';
import { formatTime } from '@/lib/date';
import { checkMacroSanity } from '@/lib/nutrition';

interface EntryRowProps {
  entry: MealEntry;
  onDelete?: (id: string) => void;
  onPress?: (entry: MealEntry) => void;
  showTime?: boolean;
}

export function EntryRow({ entry, onDelete, onPress, showTime = true }: EntryRowProps) {
  const macros: string[] = [];
  if (entry.proteinG != null) macros.push(`${Math.round(entry.proteinG)}P`);
  if (entry.carbsG != null) macros.push(`${Math.round(entry.carbsG)}C`);
  if (entry.fatG != null) macros.push(`${Math.round(entry.fatG)}F`);
  const macroLine = macros.join(' · ');

  const sanity = checkMacroSanity({
    calories: entry.calories,
    proteinG: entry.proteinG,
    carbsG: entry.carbsG,
    fatG: entry.fatG,
  });
  const showBlatantBadge = sanity.severity === 'blatant';

  const inner = (
    <>
      <View style={styles.left}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {entry.name}
          </Text>
          {showBlatantBadge ? (
            <Text
              style={styles.bullshitBadge}
              accessibilityLabel={COPY.entries.badgeLabel}
              testID={`entry-badge-${entry.id}`}
            >
              {'\u26A0'}
            </Text>
          ) : null}
        </View>
        <Text style={styles.meta}>
          {showTime ? `${formatTime(entry.loggedAt)}` : ''}
          {showTime && macroLine ? ' · ' : ''}
          {macroLine}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.calories}>{entry.calories}</Text>
        <Text style={styles.caloriesUnit}>kcal</Text>
      </View>
      {onDelete ? (
        <Pressable
          onPress={() => onDelete(entry.id)}
          style={styles.delete}
          accessibilityRole="button"
          accessibilityLabel={COPY.entries.deleteLabel(entry.name)}
          testID={`delete-${entry.id}`}
          hitSlop={8}
        >
          <Text style={styles.deleteText}>{COPY.entries.deleteButton}</Text>
        </Pressable>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={() => onPress(entry)}
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel={COPY.entries.editLabel(entry.name)}
        testID={`entry-row-${entry.id}`}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View style={styles.row} testID={`entry-row-${entry.id}`}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  left: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  name: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    flexShrink: 1,
  },
  bullshitBadge: {
    color: '#facc15',
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  meta: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  calories: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  caloriesUnit: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.xs,
  },
  delete: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  deleteText: {
    color: COLORS.protein,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
});
