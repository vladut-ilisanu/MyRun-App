import type { CSSProperties } from 'react';
import type { ComplianceBadge, SegmentType, WorkoutType } from '../types';

/** Solid accent per workout type — a calm, lower-saturation set so no single
 *  element shouts. Indigo (#7B8CFF) is the app's one true accent; the others are
 *  muted data hues used only as small dots/bars for scannability. */
export const typeAccent: Record<WorkoutType, string> = {
  EASY: '#7B8CFF',
  'LONG RUN': '#5BC2D8',
  TEMPO: '#D9A441',
  INTERVALS: '#9B7BE0',
  HILLS: '#D98A4E',
  MP: '#7B8CFF',
  RACE: '#E0C05A',
  REST: '#6A6A78',
};

/** Near-monochrome two-stop gradient per type (for sheet headers / rings).
 *  Stops stay close in hue so headers read calm, not rainbow. */
export const typeGradient: Record<WorkoutType, [string, string]> = {
  EASY: ['#7B8CFF', '#5B67CC'],
  'LONG RUN': ['#5BC2D8', '#3E8FA0'],
  TEMPO: ['#D9A441', '#B07E2E'],
  INTERVALS: ['#9B7BE0', '#6E55A8'],
  HILLS: ['#D98A4E', '#A86438'],
  MP: ['#7B8CFF', '#5BC2D8'],
  RACE: ['#E0C05A', '#C8923E'],
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
  easy: '#7B8CFF',
  recovery: '#5B5B67',
  tempo: '#D9A441',
  interval: '#9B7BE0',
  hill: '#D98A4E',
  mp_block: '#5BC2D8',
};

export const badgeMeta: Record<
  ComplianceBadge,
  { label: string; color: string; bg: string }
> = {
  on_target: { label: 'On Target', color: '#7B8CFF', bg: 'rgba(123,140,255,0.14)' },
  crushed_it: { label: 'Crushed It', color: '#5BC2D8', bg: 'rgba(91,194,216,0.14)' },
  completed_modified: { label: 'Modified', color: '#D9A441', bg: 'rgba(217,164,65,0.14)' },
  unplanned: { label: 'Bonus Run', color: '#A1A1AA', bg: 'rgba(161,161,170,0.12)' },
};

/** Soft single-hue glow over a flat base — a calm hero backdrop (no rainbow). */
export function heroBackground(type: WorkoutType): CSSProperties {
  const a = typeAccent[type];
  return {
    background: `radial-gradient(130% 110% at 100% 0%, ${hexA(a, 0.16)} 0%, rgba(20,20,28,0) 58%), #14141c`,
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
