export const COLORS = {
  background: '#000000',
  backgroundAlt: '#0A0A0A',
  surface: '#121214',
  surfaceElevated: '#18181B',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#6B6B72',
  primary: '#87A878',
  primaryMuted: 'rgba(135,168,120,0.18)',
  primaryDark: '#2E4A2A',
  protein: '#FF8A7A',
  carbs: '#5EEAE0',
  fat: '#FFD56B',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  overlay: 'rgba(0,0,0,0.72)',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

export const TYPOGRAPHY = {
  fontFamily: {
    regular: '-apple-system',
  },
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 28,
    display: 34,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;
