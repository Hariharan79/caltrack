import type { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';

interface MealSectionProps {
  title: string;
  kcalSubtotal: number;
  children: ReactNode;
  testID?: string;
}

export function MealSection({
  title,
  kcalSubtotal,
  children,
  testID,
}: MealSectionProps) {
  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtotal}>{Math.round(kcalSubtotal)} kcal</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  subtotal: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
});
