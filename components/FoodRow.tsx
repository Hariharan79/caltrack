import { View, Text, StyleSheet, Pressable } from 'react-native';

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { COPY } from '@/lib/copy';
import type { Food } from '@/types';
import { Avatar } from './Avatar';

interface FoodRowProps {
  food: Food;
  onPress?: (id: string) => void;
}

export function FoodRow({ food, onPress }: FoodRowProps) {
  const macros: string[] = [];
  if (food.proteinGPerServing != null) macros.push(`${Math.round(food.proteinGPerServing)}P`);
  if (food.carbsGPerServing != null) macros.push(`${Math.round(food.carbsGPerServing)}C`);
  if (food.fatGPerServing != null) macros.push(`${Math.round(food.fatGPerServing)}F`);
  const metaParts: string[] = [];
  if (food.servingSize) metaParts.push(food.servingSize);
  if (macros.length > 0) metaParts.push(macros.join(' · '));
  const meta = metaParts.join(' · ');

  return (
    <Pressable
      onPress={onPress ? () => onPress(food.id) : undefined}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={COPY.foods.form.editLabel(food.name)}
      testID={`food-row-${food.id}`}
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.pressed : null]}
    >
      <Avatar name={food.name} size={40} />
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>
          {food.name}
        </Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <Text style={styles.calories}>{Math.round(food.kcalPerServing)}</Text>
        <Text style={styles.caloriesUnit}>kcal</Text>
      </View>
    </Pressable>
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
  pressed: {
    opacity: 0.7,
  },
  left: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
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
});
