import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS, TYPOGRAPHY } from '@/constants/theme';

interface CalorieRingProps {
  consumed: number;
  goal: number;
  diameter?: number;
  strokeWidth?: number;
  testID?: string;
}

/**
 * Clamp `consumed / goal` into [0, 1].
 *  - goal ≤ 0    → 0
 *  - consumed < 0 → 0
 *  - consumed > goal → 1
 */
export function ringProgress(consumed: number, goal: number): number {
  if (goal <= 0) return 0;
  const ratio = consumed / goal;
  if (!Number.isFinite(ratio)) return 0;
  if (ratio < 0) return 0;
  if (ratio > 1) return 1;
  return ratio;
}

export function CalorieRing({
  consumed,
  goal,
  diameter = 200,
  strokeWidth = 14,
  testID = 'calorie-ring',
}: CalorieRingProps) {
  const radius = (diameter - strokeWidth) / 2;
  const center = diameter / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = ringProgress(consumed, goal);
  const dashOffset = circumference * (1 - progress);
  const overGoal = goal > 0 && consumed > goal;
  const remaining = Math.max(0, goal - consumed);
  const overBy = Math.max(0, consumed - goal);

  const arcColor = overGoal ? COLORS.protein : COLORS.primary;
  const gradientId = `calorie-ring-grad-${diameter}`;

  return (
    <View style={[styles.wrap, { width: diameter, height: diameter }]} testID={testID}>
      <Svg width={diameter} height={diameter}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={arcColor} stopOpacity="1" />
            <Stop offset="100%" stopColor={arcColor} stopOpacity="0.65" />
          </LinearGradient>
        </Defs>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={COLORS.surfaceElevated}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          rotation={-90}
          originX={center}
          originY={center}
          testID={`${testID}-arc`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.consumed} testID={`${testID}-consumed`}>
          {Math.round(consumed)}
        </Text>
        <Text style={styles.unit}>of {Math.round(goal)} kcal</Text>
        <Text
          style={[styles.delta, overGoal && styles.deltaOver]}
          testID={`${testID}-delta`}
        >
          {overGoal ? `${Math.round(overBy)} over` : `${Math.round(remaining)} left`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  consumed: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.display,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  unit: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    marginTop: 2,
  },
  delta: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    marginTop: 6,
  },
  deltaOver: {
    color: COLORS.protein,
  },
});
