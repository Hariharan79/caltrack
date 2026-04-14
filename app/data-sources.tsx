import { useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Alert } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { COPY } from '@/lib/copy';

/**
 * Data source attribution screen.
 *
 * Open Food Facts ships under ODbL 1.0, which requires visible attribution in
 * consumer apps that use the database. USDA FoodData Central is public domain
 * and does not legally require credit, but we list it as a courtesy so users
 * know where the numbers come from.
 */
export default function DataSourcesScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: COPY.dataSources.heading,
      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={COPY.dataSources.closeLabel}
          hitSlop={12}
          testID="data-sources-close"
        >
          <Text style={styles.headerAction}>{COPY.foods.library.closeAction}</Text>
        </Pressable>
      ),
    });
  }, [navigation, router]);

  const open = async (url: string): Promise<void> => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(COPY.errors.unknown);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>{COPY.dataSources.heading}</Text>

        <View style={styles.card}>
          <Text style={styles.sourceTitle}>{COPY.dataSources.usda.title}</Text>
          <Text style={styles.sourceBody}>{COPY.dataSources.usda.body}</Text>
          <Pressable
            onPress={() => void open(COPY.dataSources.usda.linkUrl)}
            accessibilityRole="link"
            accessibilityLabel={COPY.dataSources.usda.linkLabel}
            hitSlop={8}
            testID="data-sources-usda-link"
          >
            <Text style={styles.link}>{COPY.dataSources.usda.linkLabel}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sourceTitle}>{COPY.dataSources.off.title}</Text>
          <Text style={styles.sourceBody}>{COPY.dataSources.off.body}</Text>
          <Pressable
            onPress={() => void open(COPY.dataSources.off.linkUrl)}
            accessibilityRole="link"
            accessibilityLabel={COPY.dataSources.off.linkLabel}
            hitSlop={8}
            testID="data-sources-off-link"
          >
            <Text style={styles.link}>{COPY.dataSources.off.linkLabel}</Text>
          </Pressable>
          <Pressable
            onPress={() => void open(COPY.dataSources.off.licenseUrl)}
            accessibilityRole="link"
            accessibilityLabel={COPY.dataSources.off.licenseLabel}
            hitSlop={8}
            testID="data-sources-off-license"
          >
            <Text style={styles.link}>{COPY.dataSources.off.licenseLabel}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  heading: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.display,
    fontWeight: TYPOGRAPHY.weight.bold,
    marginBottom: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sourceTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    marginBottom: SPACING.sm,
  },
  sourceBody: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.md,
    lineHeight: TYPOGRAPHY.size.md * 1.4,
    marginBottom: SPACING.md,
  },
  link: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
    paddingVertical: SPACING.xs,
  },
  headerAction: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    paddingHorizontal: SPACING.sm,
  },
});
