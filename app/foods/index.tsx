import { useMemo, useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Barcode, MagnifyingGlass } from 'phosphor-react-native';

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { COPY } from '@/lib/copy';
import { FoodRow } from '@/components/FoodRow';
import { useAppStore, searchFoods } from '@/lib/store';

export default function FoodsListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const foods = useAppStore((s) => s.foods);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => searchFoods(foods, query), [foods, query]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={COPY.foods.library.closeLabel}
          hitSlop={12}
          testID="food-close"
        >
          <Text style={styles.headerAction}>{COPY.foods.library.closeAction}</Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={() => router.push('/foods/new')}
          accessibilityRole="button"
          accessibilityLabel={COPY.foods.library.addLabel}
          hitSlop={12}
          testID="food-add"
        >
          <Text style={styles.headerAction}>{COPY.foods.library.addAction}</Text>
        </Pressable>
      ),
    });
  }, [navigation, router]);

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <View style={styles.searchPill}>
          <MagnifyingGlass color={COLORS.textSecondary} size={18} weight="bold" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={COPY.foods.library.searchPlaceholder}
            placeholderTextColor={COLORS.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
            accessibilityLabel={COPY.foods.library.searchLabel}
            testID="food-search"
          />
          <Pressable
            onPress={() => router.push({ pathname: '/foods/scan', params: { destination: 'library' } })}
            accessibilityRole="button"
            accessibilityLabel={COPY.foods.library.scanLabel}
            hitSlop={12}
            testID="food-scan"
            style={styles.scanButton}
          >
            <Barcode color={COLORS.text} size={20} weight="bold" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {foods.length === 0
                ? COPY.foods.library.emptyLibrary
                : COPY.foods.library.emptySearch}
            </Text>
          </View>
        ) : (
          filtered.map((food) => (
            <FoodRow
              key={food.id}
              food={food}
              onPress={(id) => router.push({ pathname: '/foods/[id]', params: { id } })}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchWrap: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderStrong,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.md,
    paddingVertical: SPACING.xs,
  },
  scanButton: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  empty: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.md,
    textAlign: 'center',
  },
  headerAction: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    paddingHorizontal: SPACING.sm,
  },
});
