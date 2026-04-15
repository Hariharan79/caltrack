import { View, Pressable, StyleSheet, Text } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { House, ClockCounterClockwise, User } from 'phosphor-react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';

type IconProps = {
  weight: 'fill' | 'regular';
  color: string;
  size: number;
};

const TAB_ICONS: Record<string, React.ComponentType<IconProps>> = {
  index: House,
  history: ClockCounterClockwise,
  profile: User,
};

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const containerStyle = [
    styles.container,
    {
      bottom: insets.bottom + SPACING.md,
    },
  ];

  return (
    <View style={containerStyle} pointerEvents="box-none">
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;

          const iconColor = isFocused ? COLORS.text : COLORS.textTertiary;
          const iconWeight: 'fill' | 'regular' = isFocused ? 'fill' : 'regular';

          const IconComponent = TAB_ICONS[route.name];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[styles.tab, isFocused && styles.tabActive]}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={label}
            >
              {IconComponent && (
                <IconComponent
                  weight={iconWeight}
                  color={iconColor}
                  size={22}
                />
              )}
              <Text style={[styles.label, { color: iconColor }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderStrong,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.pill,
    gap: SPACING.xs,
    minHeight: 44,
  },
  tabActive: {
    backgroundColor: COLORS.primaryMuted,
  },
  label: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
});
