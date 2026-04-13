import { useMemo, useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { TextField } from '@/components/TextField';
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
          accessibilityLabel="Close food library"
          hitSlop={12}
          testID="food-close"
        >
          <Text style={styles.headerAction}>Close</Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={() => router.push('/foods/new')}
          accessibilityRole="button"
          accessibilityLabel="Add food"
          hitSlop={12}
          testID="food-add"
        >
          <Text style={styles.headerAction}>Add</Text>
        </Pressable>
      ),
    });
  }, [navigation, router]);

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <TextField
          label="Search"
          value={query}
          onChangeText={setQuery}
          placeholder="Find a food"
          autoCapitalize="none"
          autoCorrect={false}
          testID="food-search"
        />
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
                ? 'Your food library is empty. Tap Add to create your first food.'
                : 'No foods match that search.'}
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
