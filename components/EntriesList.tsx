import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { COPY } from '@/lib/copy';
import type { MealEntry } from '@/types';
import { EntryRow, type EntryRowVariant } from './EntryRow';
import { MealSection } from './MealSection';
import { inferMealType, MEAL_TYPE_ORDER, type MealType } from '@/lib/mealType';

interface EntriesListProps {
  entries: readonly MealEntry[];
  onDelete?: (id: string) => void;
  onPressEntry?: (entry: MealEntry) => void;
  onMarkEaten?: (id: string) => void;
  emptyText?: string;
  variant?: EntryRowVariant;
  testID?: string;
  groupByMeal?: boolean;
}

const MEAL_TITLES: Record<MealType, string> = {
  breakfast: COPY.today.sectionBreakfast,
  lunch: COPY.today.sectionLunch,
  dinner: COPY.today.sectionDinner,
  snacks: COPY.today.sectionSnacks,
};

export interface MealGroup {
  meal: MealType;
  entries: MealEntry[];
  kcalSubtotal: number;
}

export function groupEntriesByMeal(
  entries: readonly MealEntry[]
): MealGroup[] {
  const buckets = new Map<MealType, MealGroup>();
  for (const entry of entries) {
    const meal = inferMealType(entry.loggedAt);
    const existing = buckets.get(meal);
    if (existing) {
      existing.entries.push(entry);
      existing.kcalSubtotal += entry.calories;
    } else {
      buckets.set(meal, {
        meal,
        entries: [entry],
        kcalSubtotal: entry.calories,
      });
    }
  }
  return MEAL_TYPE_ORDER.flatMap((meal) => {
    const group = buckets.get(meal);
    if (!group) return [];
    // Sort within a section by loggedAt ascending so meals read top-to-bottom
    // in the order they happened.
    return [
      {
        ...group,
        entries: [...group.entries].sort((a, b) =>
          a.loggedAt.localeCompare(b.loggedAt)
        ),
      },
    ];
  });
}

export function EntriesList({
  entries,
  onDelete,
  onPressEntry,
  onMarkEaten,
  emptyText = COPY.entries.defaultEmpty,
  variant = 'default',
  testID = 'entries-list',
  groupByMeal = false,
}: EntriesListProps) {
  if (entries.length === 0) {
    return (
      <View style={styles.empty} testID="entries-empty">
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  if (groupByMeal) {
    const groups = groupEntriesByMeal(entries);
    return (
      <View testID={testID}>
        {groups.map((group) => (
          <MealSection
            key={group.meal}
            title={MEAL_TITLES[group.meal]}
            kcalSubtotal={group.kcalSubtotal}
            testID={`meal-section-${group.meal}`}
          >
            {group.entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                onDelete={onDelete}
                onPress={onPressEntry}
                onMarkEaten={onMarkEaten}
                variant={variant}
              />
            ))}
          </MealSection>
        ))}
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
    textAlign: 'center',
  },
});
