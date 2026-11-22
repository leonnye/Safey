import { useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';
import { formatDate } from '@/domain/dates';
import type { Projection } from '@/domain/engine/projection';
import { useCurrency } from '@/components/finance';
import { color, font, space } from '@/theme/tokens';
import { AppText } from './ui';

interface Props {
  baseline: Projection;
  scenario?: Projection;
  thresholdMinor?: number;
  height?: number;
}

function LegendItem({ label, stroke, dashed }: { label: string; stroke: string; dashed?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Svg width={22} height={8}>
        <Line x1={0} y1={4} x2={22} y2={4} stroke={stroke} strokeWidth={3} strokeDasharray={dashed ? '5,3' : undefined} />
      </Svg>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
    </View>
  );
}

/**
 * Estimated balance over time. Solid lavender = baseline estimate, dashed blue-violet = scenario,
 * shaded band = range, amber line = buffer. Includes a text summary for screen readers.
 */
export function ProjectionChart({ baseline, scenario, thresholdMinor, height = 180 }: Props) {
  const { format } = useCurrency();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 22;

  const all = [...baseline.points, ...(scenario?.points ?? [])];
  const values = all.flatMap((p) => [p.lowMinor, p.highMinor]);
  if (thresholdMinor !== undefined) values.push(thresholdMinor);
  values.push(0);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 100;
    max += 100;
  }
  const n = baseline.points.length - 1 || 1;
  const x = (i: number) => padL + (i / n) * (width - padL - padR);
  const y = (v: number) => padT + ((max - v) / (max - min)) * (height - padT - padB);
  const line = (pts: Projection['points'], pick: (p: Projection['points'][number]) => number) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(pick(p)).toFixed(1)}`).join(' ');
  const band = (pts: Projection['points']) =>
    `${line(pts, (p) => p.highMinor)} ${[...pts]
      .map((p, i) => ({ p, i }))
      .reverse()
      .map(({ p, i }) => `L${x(i).toFixed(1)},${y(p.lowMinor).toFixed(1)}`)
      .join(' ')} Z`;

  const summary = [
    `Estimated balance from ${formatDate(baseline.startDate)} over ${baseline.horizonDays} days.`,
    `Baseline ends near ${format(baseline.end.centralMinor)}, range ${format(baseline.end.lowMinor)} to ${format(baseline.end.highMinor)}.`,
    `Lowest baseline estimate ${format(baseline.lowestCentral.valueMinor)} on ${formatDate(baseline.lowestCentral.date)}.`,
    scenario ? `Scenario ends near ${format(scenario.end.centralMinor)}; lowest ${format(scenario.lowestCentral.valueMinor)} on ${formatDate(scenario.lowestCentral.date)}.` : '',
    thresholdMinor !== undefined ? `Your buffer is ${format(thresholdMinor)}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View style={{ gap: space[2] }}>
      <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={summary} style={{ height }}>
        {width > 0 && (
          <Svg width={width} height={height}>
            <Path d={band(baseline.points)} fill={color.brandLavender} opacity={0.12} />
            {min < 0 && max > 0 && <Line x1={padL} x2={width - padR} y1={y(0)} y2={y(0)} stroke={color.borderSubtle} strokeWidth={1} />}
            {thresholdMinor !== undefined && thresholdMinor > 0 && (
              <Line x1={padL} x2={width - padR} y1={y(thresholdMinor)} y2={y(thresholdMinor)} stroke={color.chartThreshold} strokeWidth={1.5} strokeDasharray="2,4" />
            )}
            <Path d={line(baseline.points, (p) => p.centralMinor)} stroke={color.chartRecorded} strokeWidth={2.5} fill="none" />
            {scenario && <Path d={line(scenario.points, (p) => p.centralMinor)} stroke={color.chartScenario} strokeWidth={2.5} strokeDasharray="7,5" fill="none" />}
            <SvgText x={padL} y={height - 6} fill={color.textMuted} fontSize={11} fontFamily={font.medium}>
              {formatDate(baseline.startDate)}
            </SvgText>
            <SvgText x={width - padR} y={height - 6} fill={color.textMuted} fontSize={11} fontFamily={font.medium} textAnchor="end">
              {formatDate(baseline.end.date)}
            </SvgText>
            <SvgText x={width - padR} y={padT} fill={color.textMuted} fontSize={11} fontFamily={font.medium} textAnchor="end">
              {format(max)}
            </SvgText>
          </Svg>
        )}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }}>
        <LegendItem label={scenario ? 'Baseline estimate' : 'Estimate'} stroke={color.chartRecorded} />
        {scenario ? <LegendItem label="Scenario" stroke={color.chartScenario} dashed /> : null}
        {thresholdMinor ? <LegendItem label="Your buffer" stroke={color.chartThreshold} dashed /> : null}
        <AppText variant="caption" tone="muted">
          Shaded area: estimated range
        </AppText>
      </View>
      <AppText variant="bodySmall" tone="secondary">
        {summary}
      </AppText>
    </View>
  );
}
