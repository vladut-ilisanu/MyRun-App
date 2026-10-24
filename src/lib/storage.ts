// localStorage is the SOURCE OF TRUTH (improvement #2). Supabase is a backup /
// ingestion channel only, so the free-tier 7-day pause never loses data.
// Every access is wrapped in try/catch so a private window or blocked storage
// never crashes the app.

import type { PlannedWorkout, Profile, SyncedWorkout } from '../types';

const K = {
  profile: 'runnapulse.profile',
  workouts: 'runnapulse.workouts',
  synced: 'runnapulse.synced',
  supaUrl: 'runnapulse.supabase.url',
  supaKey: 'runnapulse.supabase.key',
  onboarded: 'runnapulse.onboarded',
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked / full — app still works in-memory */
  }
}

function readString(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function writeString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export const storage = {
  loadProfile: (): Profile | null => read<Profile | null>(K.profile, null),
  saveProfile: (p: Profile) => write(K.profile, p),

  loadWorkouts: (): PlannedWorkout[] => read<PlannedWorkout[]>(K.workouts, []),
  saveWorkouts: (w: PlannedWorkout[]) => write(K.workouts, w),

  loadSynced: (): SyncedWorkout[] => read<SyncedWorkout[]>(K.synced, []),
  saveSynced: (s: SyncedWorkout[]) => write(K.synced, s),

  loadSupabase: (): { url: string; key: string } => ({
    url: readString(K.supaUrl),
    key: readString(K.supaKey),
  }),
  saveSupabase: (url: string, key: string) => {
    writeString(K.supaUrl, url);
    writeString(K.supaKey, key);
  },

  loadOnboarded: (): boolean => readString(K.onboarded) === '1',
  setOnboarded: () => writeString(K.onboarded, '1'),
};

export const DEFAULT_PROFILE: Profile = {
  goalRaceName: 'Marathon',
  goalRaceDate: '2027-02-06',
  recentRaceDistance: 'Half Marathon',
  recentRaceTimeSeconds: 1 * 3600 + 50 * 60, // 1:50:00 — editable in Setup
  goalFinishTimeSeconds: null,
  runsPerWeek: 4,
  currentWeeklyMileageKm: 35,
  longRunDay: 'Sunday',
};
