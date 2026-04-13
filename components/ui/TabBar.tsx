import { BlurView } from 'expo-blur';
import { View, Pressable, StyleSheet, Text, Platform } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { House, ClockCounterClockwise, User } from 'phosphor-react-native';
import { COLORS, SPACING } from '@/constants/theme';

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
    { paddingBottom: insets.bottom },
  ];

  const content = state.routes.map((route, index) => {
    const isFocused = state.index === index;
    const { options } = descriptors[route.key];
    const label = options.title ?? route.name;

    const iconColor = isFocused ? COLORS.primary : COLORS.textSecondary;
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
        style={styles.tab}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={label}
      >
        {IconComponent && (
          <IconComponent
            weight={iconWeight}
            color={iconColor}
            size={24}
          />
        )}
        <Text
          style={[
            styles.label,
            { color: iconColor },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  });

  if (Platform.OS === 'ios') {
    return (
      <BlurView
        tint="systemChromeMaterialDark"
        intensity={80}
        style={containerStyle}
      >
        {content}
      </BlurView>
    );
  }

  return (
    <View style={[containerStyle, styles.androidBackground]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  androidBackground: {
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: SPACING.sm,
    paddingBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: SPACING.xs,
  },
});
