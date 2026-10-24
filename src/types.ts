// Shared domain types for RunnaPulse.

export type RaceDistance = '5K' | '10K' | 'Half Marathon' | 'Marathon';

export type RaceType = 'Road' | 'Semi-trail' | 'Trail';

export type SegmentType =
  | 'warmup'
  | 'interval'
  | 'tempo'
  | 'mp_block'
  | 'easy'
  | 'recovery'
  | 'hill'
  | 'cooldown';

export interface WorkoutSegment {
  id: string;
  type: SegmentType;
  title: string; // e.g. "6 x 1km @ VO2 Max" or "Marathon Pace Block"
  distance_meters: number;
  reps?: number;
  rep_distance_meters?: number;
  rest_seconds?: number;
  target_pace_min_sec: number; // fastest target pace in sec/km
  target_pace_max_sec: number; // slowest target pace in sec/km
  notes?: string;
}

export type WorkoutType =
  | 'EASY'
  | 'LONG RUN'
  | 'TEMPO'
  | 'INTERVALS'
  | 'HILLS'
  | 'MP'
  | 'RACE'
  | 'REST';

export type WeekPhase = 'Base' | 'Build I' | 'Build II' | 'Peak' | 'Taper' | 'Deload';

export interface PlannedWorkout {
  id: string;
  week: number; // 1-based
  phase: WeekPhase;
  isDeload: boolean;
  dayOfWeek: number; // 0 = Monday ... 6 = Sunday
  date: string; // YYYY-MM-DD
  type: WorkoutType;
  title: string;
  target_distance_meters: number;
  target_avg_pace_sec: number; // representative avg pace sec/km
  estimated_duration_seconds: number;
  elevation_gain_m: number; // prescribed vertical gain (trail/semi-trail plans)
  segments: WorkoutSegment[];
  rationale: string; // "why this workout" — documented coaching note
  completed: boolean;
  matched_synced_id?: string | null;
}

export interface WeekSummary {
  week: number;
  phase: WeekPhase;
  isDeload: boolean;
  isPeak: boolean;
  startDate: string; // Monday YYYY-MM-DD
  planned_distance_meters: number;
}

export interface Profile {
  goalRaceName: string;
  goalRaceDate: string; // YYYY-MM-DD
  raceType: RaceType;
  elevationGainM: number; // total ascent of the goal race
  recentRaceDistance: RaceDistance;
  recentRaceTimeSeconds: number;
  goalFinishTimeSeconds: number | null;
  runsPerWeek: 3 | 4 | 5 | 6;
  currentWeeklyMileageKm: number;
  longRunDay: 'Saturday' | 'Sunday';
}

export interface SyncedWorkout {
  id?: string;
  external_id: string;
  local_date: string; // YYYY-MM-DD
  start_time?: string;
  duration_seconds: number;
  distance_meters: number;
  avg_heart_rate?: number | null;
  active_calories?: number | null;
  source?: string;
  matched_workout_id?: string | null;
  raw_payload?: Record<string, unknown>;
}

export type ComplianceBadge = 'on_target' | 'crushed_it' | 'completed_modified' | 'unplanned';

export interface PaceZone {
  key: 'recovery' | 'easy' | 'long_base' | 'marathon_pace' | 'tempo' | 'interval';
  label: string;
  min_sec: number; // fastest end of range (sec/km)
  max_sec: number; // slowest end of range (sec/km)
}
