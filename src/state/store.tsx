import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { PlannedWorkout, Profile, SyncedWorkout } from '../types';
import { generatePlan } from '../lib/planGenerator';
import { computeTrainingPaces, raceDistanceMeters, vdotFromRace, type TrainingPaces } from '../lib/vdot';
import { matchRun } from '../lib/workoutMatcher';
import { DEFAULT_PROFILE, storage } from '../lib/storage';
import {
  backupPlan,
  fetchSyncedWorkouts,
  insertSyncedWorkout,
  isConfigured,
} from '../lib/supabaseClient';
import { normalizeHealthPayload } from '../lib/workoutMatcher';
import { toISODate } from '../lib/format';

interface StoreValue {
  profile: Profile;
  workouts: PlannedWorkout[];
  synced: SyncedWorkout[];
  paces: TrainingPaces;
  vdot: number;
  totalWeeks: number;
  syncing: boolean;
  lastSynced: string | null;
  supabaseConfigured: boolean;
  onboarded: boolean;
  completeOnboarding: (p: Profile) => void;
  regenerate: (p: Profile) => void;
  syncHealth: () => Promise<void>;
  simulateRun: (distanceKm: number, durationSeconds: number, dateISO: string) => Promise<void>;
  markComplete: (workoutId: string, completed: boolean) => void;
  relink: (externalId: string, workoutId: string | null) => void;
  refreshSupabaseStatus: () => void;
}

const Ctx = createContext<StoreValue | null>(null);

/** Re-run the matcher across all synced runs (oldest first) over a fresh plan copy. */
function applyMatching(
  workouts: PlannedWorkout[],
  synced: SyncedWorkout[]
): { workouts: PlannedWorkout[]; synced: SyncedWorkout[] } {
  const wk = workouts.map((w) => ({
    ...w,
    // preserve manual completions that are not tied to a synced run
    completed: w.completed && !w.matched_synced_id ? true : false,
    matched_synced_id: null as string | null,
  }));
  const runs = [...synced].sort((a, b) => a.local_date.localeCompare(b.local_date));
  const outRuns = runs.map((r) => ({ ...r, matched_workout_id: null as string | null }));

  for (const run of outRuns) {
    const pending = wk.filter((w) => !w.completed && w.type !== 'REST');
    const res = matchRun(run, pending);
    if (res.matched_workout_id) {
      run.matched_workout_id = res.matched_workout_id;
      const target = wk.find((w) => w.id === res.matched_workout_id);
      if (target) {
        target.completed = true;
        target.matched_synced_id = run.external_id;
      }
    }
  }
  return { workouts: wk, synced: outRuns };
}

function dedupeByExternalId(runs: SyncedWorkout[]): SyncedWorkout[] {
  const map = new Map<string, SyncedWorkout>();
  for (const r of runs) map.set(r.external_id, r); // later wins
  return [...map.values()];
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(() => ({
    ...DEFAULT_PROFILE,
    ...(storage.loadProfile() ?? {}),
  }));
  const [workouts, setWorkouts] = useState<PlannedWorkout[]>(() => storage.loadWorkouts());
  const [synced, setSynced] = useState<SyncedWorkout[]>(() => storage.loadSynced());
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [supabaseConfigured, setSupabaseConfigured] = useState<boolean>(() => isConfigured());
  const [onboarded, setOnboardedState] = useState<boolean>(() => storage.loadOnboarded());

  const didInit = useRef(false);

  // Rebuild the plan only for a returning (already-onboarded) user whose stored
  // workouts were lost (e.g. iOS cache eviction). New users see onboarding first.
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if (onboarded && workouts.length === 0) {
      const plan = generatePlan(profile);
      const matched = applyMatching(plan.workouts, synced);
      setWorkouts(matched.workouts);
      setSynced(matched.synced);
      storage.saveWorkouts(matched.workouts);
      storage.saveSynced(matched.synced);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paces = useMemo(() => {
    const vdot = vdotFromRace(
      raceDistanceMeters(profile.recentRaceDistance),
      profile.recentRaceTimeSeconds
    );
    return computeTrainingPaces(vdot);
  }, [profile.recentRaceDistance, profile.recentRaceTimeSeconds]);

  const totalWeeks = useMemo(
    () => (workouts.length ? Math.max(...workouts.map((w) => w.week)) : 0),
    [workouts]
  );

  const regenerate = useCallback(
    (p: Profile) => {
      const plan = generatePlan(p);
      const matched = applyMatching(plan.workouts, synced);
      setProfile(p);
      setWorkouts(matched.workouts);
      setSynced(matched.synced);
      storage.saveProfile(p);
      storage.saveWorkouts(matched.workouts);
      storage.saveSynced(matched.synced);
      void backupPlan(p, matched.workouts);
    },
    [synced]
  );

  const completeOnboarding = useCallback(
    (p: Profile) => {
      regenerate(p);
      storage.setOnboarded();
      setOnboardedState(true);
    },
    [regenerate]
  );

  const commit = useCallback(
    (nextWorkouts: PlannedWorkout[], nextSynced: SyncedWorkout[]) => {
      setWorkouts(nextWorkouts);
      setSynced(nextSynced);
      storage.saveWorkouts(nextWorkouts);
      storage.saveSynced(nextSynced);
      void backupPlan(profile, nextWorkouts);
    },
    [profile]
  );

  const ingest = useCallback(
    (incoming: SyncedWorkout[]) => {
      const merged = dedupeByExternalId([...synced, ...incoming]);
      const matched = applyMatching(workouts, merged);
      commit(matched.workouts, matched.synced);
    },
    [synced, workouts, commit]
  );

  const syncHealth = useCallback(async () => {
    setSyncing(true);
    try {
      const remote = await fetchSyncedWorkouts();
      if (remote.length > 0) ingest(remote.map((r) => ({ ...r })));
      setLastSynced(new Date().toISOString());
    } finally {
      setSyncing(false);
    }
  }, [ingest]);

  const simulateRun = useCallback(
    async (distanceKm: number, durationSeconds: number, dateISO: string) => {
      const run = normalizeHealthPayload({
        distance: distanceKm, // < 100 -> treated as km
        duration_seconds: durationSeconds,
        local_date: dateISO,
        start_time: `${dateISO}T08:00:00`,
        avg_heart_rate: 152,
        active_calories: Math.round(distanceKm * 62),
      });
      if (isConfigured()) await insertSyncedWorkout(run);
      ingest([run]);
      setLastSynced(new Date().toISOString());
    },
    [ingest]
  );

  const markComplete = useCallback(
    (workoutId: string, completed: boolean) => {
      const next = workouts.map((w) => (w.id === workoutId ? { ...w, completed } : w));
      commit(next, synced);
    },
    [workouts, synced, commit]
  );

  const relink = useCallback(
    (externalId: string, workoutId: string | null) => {
      const nextSynced = synced.map((r) =>
        r.external_id === externalId ? { ...r, matched_workout_id: workoutId } : r
      );
      // recompute workout completion from the manual links
      const nextWorkouts = workouts.map((w) => {
        const linked = nextSynced.find((r) => r.matched_workout_id === w.id);
        if (linked) return { ...w, completed: true, matched_synced_id: linked.external_id };
        if (w.matched_synced_id === externalId)
          return { ...w, completed: false, matched_synced_id: null };
        return w;
      });
      commit(nextWorkouts, nextSynced);
    },
    [workouts, synced, commit]
  );

  const refreshSupabaseStatus = useCallback(() => setSupabaseConfigured(isConfigured()), []);

  const value: StoreValue = {
    profile,
    workouts,
    synced,
    paces,
    vdot: paces.vdot,
    totalWeeks,
    syncing,
    lastSynced,
    supabaseConfigured,
    onboarded,
    completeOnboarding,
    regenerate,
    syncHealth,
    simulateRun,
    markComplete,
    relink,
    refreshSupabaseStatus,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used within StoreProvider');
  return v;
}

/** Index of the plan week that contains today (1-based), clamped to the plan. */
export function useCurrentWeek(workouts: PlannedWorkout[]): number {
  const today = toISODate(new Date());
  const current = workouts.find((w) => w.date >= today);
  if (current) return current.week;
  return workouts.length ? Math.max(...workouts.map((w) => w.week)) : 1;
}
