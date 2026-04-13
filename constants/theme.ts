export const COLORS = {
  background: '#000000',
  backgroundAlt: '#0A0A0A',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  primary: '#87A878',
  primaryDark: '#123524',
  protein: '#FF6B6B',
  carbs: '#4ECDC4',
  fat: '#FFE66D',
  border: 'rgba(255,255,255,0.1)',
  overlay: 'rgba(0,0,0,0.5)',
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
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
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
