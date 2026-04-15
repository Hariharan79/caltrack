import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, TYPOGRAPHY } from '@/constants/theme';

interface AvatarProps {
  name: string;
  size?: number;
  testID?: string;
}

function initialFor(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

export function Avatar({ name, size = 40, testID }: AvatarProps) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={[styles.base, dimension]} testID={testID}>
      <Text style={[styles.letter, { fontSize: Math.round(size * 0.42) }]}>
        {initialFor(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.pill,
  },
  letter: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
});
