import type { ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onTrailingPress?: () => void;
  trailingLabel?: string;
  testID?: string;
}

export function AppHeader({
  title,
  subtitle,
  trailing,
  onTrailingPress,
  trailingLabel,
  testID,
}: AppHeaderProps) {
  const trailingNode = trailing ? (
    onTrailingPress ? (
      <Pressable
        onPress={onTrailingPress}
        accessibilityRole="button"
        accessibilityLabel={trailingLabel}
        hitSlop={12}
        testID={testID ? `${testID}-trailing` : undefined}
      >
        {trailing}
      </Pressable>
    ) : (
      trailing
    )
  ) : null;

  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailingNode}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.display,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.md,
    marginTop: 2,
  },
});
