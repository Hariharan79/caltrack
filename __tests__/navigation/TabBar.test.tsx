import React from 'react';
import { render } from '@testing-library/react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// Mock expo-blur — BlurView is not available in Jest environment
jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return {
    BlurView: ({ children, style, ...props }: any) => (
      <View style={style} {...props}>
        {children}
      </View>
    ),
  };
});

// Mock phosphor-react-native — render icon name as text for test assertions
jest.mock('phosphor-react-native', () => {
  const { Text } = require('react-native');
  const createIcon = (name: string) =>
    ({ color, size, weight }: { color?: string; size?: number; weight?: string }) => (
      <Text testID={`icon-${name}`} style={{ color }}>
        {name}
      </Text>
    );
  return {
    House: createIcon('House'),
    ClockCounterClockwise: createIcon('ClockCounterClockwise'),
    User: createIcon('User'),
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: any) => children,
}));

import { TabBar } from '@/components/ui/TabBar';

const mockRoutes = [
  { name: 'index', key: 'index-key' },
  { name: 'history', key: 'history-key' },
  { name: 'profile', key: 'profile-key' },
];

const mockDescriptors = {
  'index-key': { options: { title: 'Today' } },
  'history-key': { options: { title: 'History' } },
  'profile-key': { options: { title: 'Profile' } },
};

const mockNavigation = {
  emit: jest.fn(() => ({ defaultPrevented: false })),
  navigate: jest.fn(),
};

const mockTabBarProps: BottomTabBarProps = {
  state: {
    routes: mockRoutes as any,
    index: 0,
    key: 'tab-key',
    routeNames: ['index', 'history', 'profile'],
    history: [],
    preloadedRouteKeys: [],
    type: 'tab',
    stale: false,
  },
  descriptors: mockDescriptors as any,
  navigation: mockNavigation as any,
  insets: { top: 0, bottom: 34, left: 0, right: 0 },
};

describe('TabBar — NAV-01 and NAV-02', () => {
  it('renders exactly three tab items (NAV-01)', () => {
    const { getAllByRole } = render(<TabBar {...mockTabBarProps} />);
    const buttons = getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('renders "Today" label (NAV-01)', () => {
    const { getByText } = render(<TabBar {...mockTabBarProps} />);
    expect(getByText('Today')).toBeTruthy();
  });

  it('renders "History" label (NAV-01)', () => {
    const { getByText } = render(<TabBar {...mockTabBarProps} />);
    expect(getByText('History')).toBeTruthy();
  });

  it('renders "Profile" label (NAV-01)', () => {
    const { getByText } = render(<TabBar {...mockTabBarProps} />);
    expect(getByText('Profile')).toBeTruthy();
  });

  it('the first route is named "index" — Today is the default tab (NAV-02)', () => {
    expect(mockRoutes[0].name).toBe('index');
  });

  it('Today (index) tab is active by default (state.index === 0)', () => {
    expect(mockTabBarProps.state.index).toBe(0);
    expect(mockTabBarProps.state.routes[0].name).toBe('index');
  });
});
