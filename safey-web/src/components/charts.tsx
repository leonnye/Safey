import { useEffect, useId, useRef, useState } from 'react';
import { formatShortDate } from '@/domain/dates';
import type { CurrencyCode } from '@/domain/types';
import { money } from '@/lib/format';

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(320);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(120, Math.round(entry!.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

type Pt = [number, number];

/** Catmull-Rom spline through the points, as cubic Bézier segments. */
function smoothPath(pts: Pt[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0]![0]},${pts[0]![1]}`;
  let d = `M${pts[0]![0]},${pts[0]![1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function linePath(pts: Pt[]): string {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
}

export function BalanceChart({ values, height = 96 }: { values: number[]; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const gid = useId();
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const padY = 10;
  const pts: Pt[] = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * (width - 8) + 4, padY + (1 - (v - min) / span) * (height - padY * 2)]);
  const line = smoothPath(pts);
  const last = pts[pts.length - 1];
  return (
    <div ref={ref} aria-hidden>
      <svg className="chart" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={`${gid}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#B9A3FF" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#B9A3FF" stopOpacity="0" />
          </linearGradient>
          <filter id={`${gid}-glow`} x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {pts.length > 1 && <path d={`${line} L${last![0]},${height} L${pts[0]![0]},${height} Z`} fill={`url(#${gid}-fill)`} />}
        <path d={line} fill="none" stroke="#CDBBFF" strokeWidth={2.5} strokeLinecap="round" filter={`url(#${gid}-glow)`} />
        {last ? (
          <>
            <circle cx={last[0]} cy={last[1]} r={7} fill="#B9A3FF" opacity={0.3} />
            <circle cx={last[0]} cy={last[1]} r={3.5} fill="#fff" />
          </>
        ) : null}
      </svg>
    </div>
  );
}

export interface Series {
  label: string;
  color: string;
  dashed?: boolean;
  values: number[];
}

export function ProjectionChart({ dates, series, thresholdMinor, currency, height = 190 }: { dates: string[]; series: Series[]; thresholdMinor?: number; currency: CurrencyCode; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const left = 8;
  const right = 8;
  const top = 12;
  const bottom = 24;
  const all = series.flatMap((s) => s.values).concat(thresholdMinor !== undefined ? [thresholdMinor] : []);
  const min = Math.min(0, ...all);
  const max = Math.max(...all, 1);
  const span = max - min || 1;
  const n = dates.length;
  const x = (i: number) => left + (i / Math.max(1, n - 1)) * (width - left - right);
  const y = (v: number) => top + (1 - (v - min) / span) * (height - top - bottom);
  const ticks = n > 2 ? [0, Math.floor((n - 1) / 2), n - 1] : [0, n - 1];
  return (
    <div ref={ref} className="stack-sm">
      <svg className="chart" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Projected balance chart">
        {[0, 0.5, 1].map((f) => (
          <line key={f} x1={left} x2={width - right} y1={top + f * (height - top - bottom)} y2={top + f * (height - top - bottom)} stroke="rgba(185,163,255,0.08)" />
        ))}
        {min < 0 && <line x1={left} x2={width - right} y1={y(0)} y2={y(0)} stroke="rgba(255,75,92,0.5)" strokeWidth={1} />}
        {thresholdMinor !== undefined && thresholdMinor > 0 && (
          <line x1={left} x2={width - right} y1={y(thresholdMinor)} y2={y(thresholdMinor)} stroke="#F4C46B" strokeWidth={1.5} strokeDasharray="4 5" opacity={0.85} />
        )}
        {series.map((s) => (
          <path
            key={s.label}
            d={linePath(s.values.map((v, i) => [x(i), y(v)]))}
            fill="none"
            stroke={s.color}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={s.dashed ? '7 6' : undefined}
          />
        ))}
        {ticks.map((i) => (
          <text key={i} x={x(i)} y={height - 6} fill="#8E879F" fontSize={11} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
            {dates[i] ? formatShortDate(dates[i]!) : ''}
          </text>
        ))}
      </svg>
      <div className="legend">
        {series.map((s) => (
          <span key={s.label}>
            <i style={{ background: s.dashed ? `repeating-linear-gradient(90deg, ${s.color} 0 5px, transparent 5px 8px)` : s.color }} />
            {s.label}
          </span>
        ))}
        {thresholdMinor !== undefined && thresholdMinor > 0 && (
          <span>
            <i style={{ background: '#F4C46B' }} />
            Your buffer ({money(thresholdMinor, currency)})
          </span>
        )}
      </div>
    </div>
  );
}

export function Ring({ ratio, size = 120, stroke = 12 }: { ratio: number; size?: number; stroke?: number }) {
  const gid = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, ratio));
  const over = ratio >= 1;
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }} aria-hidden>
        <defs>
          <linearGradient id={`${gid}-g`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={over ? '#FF7A87' : '#D9CCFF'} />
            <stop offset="100%" stopColor={over ? '#E83A4C' : '#7B5FE0'} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(185,163,255,0.12)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid}-g)`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${pct * c} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: 'drop-shadow(0 0 8px rgba(185,163,255,0.55))', transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="center num">{Math.round(ratio * 100)}%</div>
    </div>
  );
}
