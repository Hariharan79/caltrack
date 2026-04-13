import { Stack } from 'expo-router';

import { COLORS, TYPOGRAPHY } from '@/constants/theme';

export default function FoodsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          color: COLORS.text,
          fontSize: TYPOGRAPHY.size.lg,
          fontWeight: TYPOGRAPHY.weight.semibold,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Foods' }} />
      <Stack.Screen name="new" options={{ title: 'New food' }} />
      <Stack.Screen name="[id]" options={{ title: 'Edit food' }} />
    </Stack>
  );
}
