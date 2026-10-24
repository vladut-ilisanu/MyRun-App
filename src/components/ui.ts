import type { ComplianceBadge, SegmentType, WorkoutType } from '../types';

export const segmentColor: Record<SegmentType, string> = {
  warmup: '#3A3A44',
  cooldown: '#3A3A44',
  easy: '#1F9D73',
  recovery: '#4B5563',
  tempo: '#F59E0B',
  interval: '#00D2FF',
  mp_block: '#00F5A0',
};

export const workoutTypeColor: Record<WorkoutType, string> = {
  INTERVALS: '#00D2FF',
  TEMPO: '#F59E0B',
  'LONG RUN': '#00F5A0',
  EASY: '#1F9D73',
  MP: '#00F5A0',
  RACE: '#00F5A0',
  REST: '#4B5563',
};

export const badgeMeta: Record<
  ComplianceBadge,
  { label: string; color: string; bg: string }
> = {
  on_target: { label: 'On Target', color: '#00F5A0', bg: 'rgba(0,245,160,0.12)' },
  crushed_it: { label: 'Crushed It', color: '#00D2FF', bg: 'rgba(0,210,255,0.12)' },
  completed_modified: { label: 'Modified', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  unplanned: { label: 'Bonus Run', color: '#A1A1AA', bg: 'rgba(161,161,170,0.12)' },
};
