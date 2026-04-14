import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { COPY } from '@/lib/copy';
import type { WeightEntry } from '@/types';

interface WeightChartProps {
  entries: readonly WeightEntry[];
  width: number;
  height?: number;
  testID?: string;
}

const DEFAULT_HEIGHT = 160;
const H_PADDING = 16;
const V_PADDING = 16;

/**
 * Minimal trend chart for body weight.
 *
 * - 0 entries  → empty prompt
 * - 1 entry    → single dot + value
 * - 2+ entries → auto-ranged line + dots
 */
export function WeightChart({
  entries,
  width,
  height = DEFAULT_HEIGHT,
  testID,
}: WeightChartProps) {
  if (entries.length === 0) {
    return (
      <View style={[styles.empty, { width, height }]} testID={testID}>
        <Text style={styles.emptyText}>{COPY.profile.weight.chartEmptyTitle}</Text>
        <Text style={styles.emptyHint}>{COPY.profile.weight.chartEmptyHint}</Text>
      </View>
    );
  }

  // Sort by loggedAt ascending (oldest → newest) for rendering left-to-right.
  const sorted = [...entries].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));

  const innerWidth = Math.max(0, width - H_PADDING * 2);
  const innerHeight = Math.max(0, height - V_PADDING * 2);

  const weights = sorted.map((e) => e.weightKg);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  // Pad Y range by at least 1kg to avoid degenerate flat lines.
  const range = Math.max(maxWeight - minWeight, 1);
  const yMin = minWeight - range * 0.15;
  const yMax = maxWeight + range * 0.15;
  const ySpan = yMax - yMin || 1;

  const toX = (index: number): number => {
    if (sorted.length === 1) return H_PADDING + innerWidth / 2;
    return H_PADDING + (index / (sorted.length - 1)) * innerWidth;
  };
  const toY = (weight: number): number =>
    V_PADDING + innerHeight - ((weight - yMin) / ySpan) * innerHeight;

  const points = sorted.map((e, i) => ({ x: toX(i), y: toY(e.weightKg), entry: e }));
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  const latest = sorted[sorted.length - 1];
  const first = sorted[0];
  const delta = latest.weightKg - first.weightKg;
  const deltaLabel =
    sorted.length < 2
      ? null
      : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} kg`;

  return (
    <View style={{ width }} testID={testID}>
      <Svg width={width} height={height}>
        {/* Baseline */}
        <Line
          x1={H_PADDING}
          x2={width - H_PADDING}
          y1={height - V_PADDING}
          y2={height - V_PADDING}
          stroke={COLORS.border}
          strokeWidth={1}
        />

        {sorted.length >= 2 ? (
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke={COLORS.primary}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}

        {points.map((p) => (
          <Circle
            key={p.entry.id}
            cx={p.x}
            cy={p.y}
            r={3.5}
            fill={COLORS.primary}
          />
        ))}
      </Svg>

      <View style={styles.legend}>
        <Text style={styles.legendLabel}>
          {latest.weightKg.toFixed(1)} kg
          {latest.bodyFatPct != null ? ` · ${latest.bodyFatPct.toFixed(1)}% bf` : ''}
        </Text>
        {deltaLabel ? (
          <Text
            style={[
              styles.legendDelta,
              delta > 0 ? styles.deltaUp : delta < 0 ? styles.deltaDown : null,
            ]}
          >
            {deltaLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  emptyHint: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    marginTop: SPACING.xs,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: H_PADDING,
    marginTop: SPACING.xs,
  },
  legendLabel: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  legendDelta: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  deltaUp: {
    color: COLORS.protein,
  },
  deltaDown: {
    color: COLORS.primary,
  },
});
