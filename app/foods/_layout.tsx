import { Stack } from 'expo-router';

import { COLORS, TYPOGRAPHY } from '@/constants/theme';
import { COPY } from '@/lib/copy';

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
      <Stack.Screen name="index" options={{ title: COPY.foods.library.title }} />
      <Stack.Screen name="new" options={{ title: COPY.foods.new.title }} />
      <Stack.Screen name="[id]" options={{ title: COPY.foods.edit.title }} />
      <Stack.Screen name="scan" options={{ title: COPY.barcode.screenTitle }} />
    </Stack>
  );
}
