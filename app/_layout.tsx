import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/theme';
import { useSession } from '@/hooks/useSession';
import { useAppStore } from '@/lib/store';
import { migrateLegacyEntries } from '@/lib/migrateLocal';

function SessionGate() {
  const { session, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const hydrate = useAppStore((s) => s.hydrate);
  const reset = useAppStore((s) => s.reset);

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, router]);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      reset();
      return;
    }
    const userId = session.user.id;
    let cancelled = false;
    (async () => {
      try {
        await migrateLegacyEntries(userId);
      } catch (err) {
        if (!cancelled) {
          console.warn('Legacy migration failed', err);
        }
      }
      if (cancelled) return;
      try {
        await hydrate(userId);
      } catch (err) {
        if (!cancelled) {
          console.warn('Hydration failed', err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, loading, hydrate, reset]);

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: COLORS.background }} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="foods" options={{ presentation: 'modal' }} />
      <Stack.Screen
        name="data-sources"
        options={{
          presentation: 'modal',
          headerShown: true,
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SessionGate />
    </SafeAreaProvider>
  );
}
