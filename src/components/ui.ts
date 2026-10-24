import type { CSSProperties } from 'react';
import type { ComplianceBadge, SegmentType, WorkoutType } from '../types';

/** Solid accent per workout type (for chips, rings, borders). */
export const typeAccent: Record<WorkoutType, string> = {
  EASY: '#00F5A0',
  'LONG RUN': '#22D3EE',
  TEMPO: '#FBBF24',
  INTERVALS: '#A855F7',
  HILLS: '#FB923C',
  MP: '#00F5A0',
  RACE: '#FFD166',
  REST: '#8A8A98',
};

/** Two-stop gradient per workout type (for hero/header backgrounds). */
export const typeGradient: Record<WorkoutType, [string, string]> = {
  EASY: ['#00F5A0', '#00C2A8'],
  'LONG RUN': ['#22D3EE', '#3B82F6'],
  TEMPO: ['#FBBF24', '#FB923C'],
  INTERVALS: ['#A855F7', '#FF4D8D'],
  HILLS: ['#FB923C', '#F97316'],
  MP: ['#00F5A0', '#22D3EE'],
  RACE: ['#FFD166', '#FF7A45'],
  REST: ['#3A3A44', '#26262E'],
};

/** Short label shown on the type chip. */
export const typeLabel: Record<WorkoutType, string> = {
  EASY: 'Easy',
  'LONG RUN': 'Long Run',
  TEMPO: 'Tempo',
  INTERVALS: 'Intervals',
  HILLS: 'Hills',
  MP: 'Marathon Pace',
  RACE: 'Race Day',
  REST: 'Rest',
};

export const segmentColor: Record<SegmentType, string> = {
  warmup: '#4B4B57',
  cooldown: '#4B4B57',
  easy: '#00C2A8',
  recovery: '#5B5B67',
  tempo: '#FBBF24',
  interval: '#A855F7',
  hill: '#FB923C',
  mp_block: '#00F5A0',
};

export const badgeMeta: Record<
  ComplianceBadge,
  { label: string; color: string; bg: string }
> = {
  on_target: { label: 'On Target', color: '#00F5A0', bg: 'rgba(0,245,160,0.14)' },
  crushed_it: { label: 'Crushed It', color: '#22D3EE', bg: 'rgba(34,211,238,0.14)' },
  completed_modified: { label: 'Modified', color: '#FBBF24', bg: 'rgba(251,191,36,0.14)' },
  unplanned: { label: 'Bonus Run', color: '#A1A1AA', bg: 'rgba(161,161,170,0.12)' },
};

/** Inline style for a soft type-tinted hero background. */
export function heroBackground(type: WorkoutType): CSSProperties {
  const [a, b] = typeGradient[type];
  return {
    background: `radial-gradient(120% 120% at 0% 0%, ${hexA(a, 0.22)} 0%, ${hexA(
      b,
      0.08
    )} 42%, rgba(21,21,27,0) 72%), linear-gradient(180deg, #17171e 0%, #131319 100%)`,
  };
}

/** Hex + alpha -> rgba() string. */
export function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
