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
  fetchUserPlan,
  isConfigured,
  getCurrentUser,
  onAuthChange,
  signInEmail,
  signUpEmail,
  signInMagicLink,
  signOut as supaSignOut,
  type AuthUser,
  type ConnectionResult,
} from '../lib/supabaseClient';
import { normalizeHealthPayload } from '../lib/workoutMatcher';
import { toISODate, mondayIndex, parseISODate } from '../lib/format';

interface StoreValue {
  profile: Profile;
  workouts: PlannedWorkout[];
  synced: SyncedWorkout[];
  paces: TrainingPaces;
  vdot: number;
  totalWeeks: number;
  supabaseConfigured: boolean;
  onboarded: boolean;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<ConnectionResult>;
  signUp: (email: string, password: string) => Promise<ConnectionResult>;
  signInMagic: (email: string) => Promise<ConnectionResult>;
  signOut: () => Promise<void>;
  completeOnboarding: (p: Profile) => void;
  regenerate: (p: Profile) => void;
  addManualRun: (distanceKm: number, durationSeconds: number, dateISO: string) => void;
  logRunForWorkout: (workoutId: string, distanceKm: number, durationSeconds: number) => void;
  updateRun: (externalId: string, distanceKm: number, durationSeconds: number, dateISO: string) => void;
  deleteRun: (externalId: string) => void;
  markComplete: (workoutId: string, completed: boolean) => void;
  reschedule: (workoutId: string, dateISO: string) => void;
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
  const [synced, setSynced] = useState<SyncedWorkout[]>(() => storage.loadSynced());
  const [workouts, setWorkouts] = useState<PlannedWorkout[]>(() => {
    const w = storage.loadWorkouts();
    if (!w.length) return w;
    return applyMatching(w, storage.loadSynced()).workouts; // recompute completions from runs
  });
  const [supabaseConfigured, setSupabaseConfigured] = useState<boolean>(() => isConfigured());
  const [onboarded, setOnboardedState] = useState<boolean>(() => storage.loadOnboarded());
  const [user, setUser] = useState<AuthUser | null>(null);

  const userRef = useRef<string | null>(null);
  useEffect(() => {
    userRef.current = user?.id ?? null;
  }, [user]);

  // Backup under the signed-in account when present, else the shared row.
  const cloudBackup = useCallback((p: Profile, w: PlannedWorkout[]) => {
    void backupPlan(p, w, userRef.current ?? 'default_user');
  }, []);

  const didInit = useRef(false);

  // On load, rebuild the plan for a returning user when it's missing (e.g. iOS
  // cache eviction) OR stale vs the current settings — specifically, when hill
  // training is off but the stored plan still carries hill reps / vertical gain
  // (a plan generated before the flat-training change). Logged runs are preserved
  // by applyMatching, so this never deletes history. New users onboard first.
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if (!onboarded) return;

    const staleHills =
      !profile.trainWithHills &&
      workouts.some((w) => w.type === 'HILLS' || (w.type !== 'RACE' && w.elevation_gain_m > 0));

    if (workouts.length === 0 || staleHills) {
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
      cloudBackup(p, matched.workouts);
    },
    [synced, cloudBackup]
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
      cloudBackup(profile, nextWorkouts);
    },
    [profile, cloudBackup]
  );

  const ingest = useCallback(
    (incoming: SyncedWorkout[]) => {
      const merged = dedupeByExternalId([...synced, ...incoming]);
      const matched = applyMatching(workouts, merged);
      commit(matched.workouts, matched.synced);
    },
    [synced, workouts, commit]
  );

  // Manually log a real run (persists; matches to the plan).
  const addManualRun = useCallback(
    (distanceKm: number, durationSeconds: number, dateISO: string) => {
      const run: SyncedWorkout = {
        ...normalizeHealthPayload({
          distance: distanceKm,
          duration_seconds: durationSeconds,
          local_date: dateISO,
          start_time: `${dateISO}T08:00:00`,
        }),
        source: 'Manual',
      };
      ingest([run]); // persists + matches
    },
    [ingest]
  );

  // Log the actual result for a specific session (clears a prior manual tick so
  // the run links to it, then matches by its date).
  const logRunForWorkout = useCallback(
    (workoutId: string, distanceKm: number, durationSeconds: number) => {
      const w = workouts.find((x) => x.id === workoutId);
      if (!w) return;
      const run: SyncedWorkout = {
        ...normalizeHealthPayload({
          distance: distanceKm,
          duration_seconds: durationSeconds,
          local_date: w.date,
          start_time: `${w.date}T08:00:00`,
        }),
        source: 'Manual',
      };
      const clearedWorkouts = workouts.map((x) =>
        x.id === workoutId ? { ...x, completed: false, matched_synced_id: null } : x
      );
      const merged = dedupeByExternalId([...synced, run]);
      const matched = applyMatching(clearedWorkouts, merged);
      commit(matched.workouts, matched.synced);
    },
    [synced, workouts, commit]
  );

  // Edit a logged run's distance / duration / date, then re-match.
  const updateRun = useCallback(
    (externalId: string, distanceKm: number, durationSeconds: number, dateISO: string) => {
      const nextSynced = synced.map((r) =>
        r.external_id === externalId
          ? {
              ...r,
              distance_meters: Math.round(distanceKm * 1000),
              duration_seconds: Math.round(durationSeconds),
              local_date: dateISO,
            }
          : r
      );
      const matched = applyMatching(workouts, nextSynced);
      commit(matched.workouts, matched.synced);
    },
    [synced, workouts, commit]
  );

  const deleteRun = useCallback(
    (externalId: string) => {
      const nextSynced = synced.filter((r) => r.external_id !== externalId);
      const matched = applyMatching(workouts, nextSynced);
      commit(matched.workouts, matched.synced);
    },
    [synced, workouts, commit]
  );

  const markComplete = useCallback(
    (workoutId: string, completed: boolean) => {
      const next = workouts.map((w) => (w.id === workoutId ? { ...w, completed } : w));
      commit(next, synced);
    },
    [workouts, synced, commit]
  );

  const reschedule = useCallback(
    (workoutId: string, dateISO: string) => {
      const next = workouts.map((w) =>
        w.id === workoutId
          ? { ...w, date: dateISO, dayOfWeek: mondayIndex(parseISODate(dateISO)) }
          : w
      );
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

  // On sign-in, pull this account's saved plan (cross-device), else push local.
  const syncOnLogin = useCallback(async (u: AuthUser) => {
    const cloud = await fetchUserPlan(u.id);
    const localSynced = storage.loadSynced();
    if (cloud && cloud.workouts && cloud.workouts.length) {
      const matched = applyMatching(cloud.workouts, localSynced);
      const mergedProfile = { ...DEFAULT_PROFILE, ...cloud.profile };
      setProfile(mergedProfile);
      setWorkouts(matched.workouts);
      setSynced(matched.synced);
      storage.saveProfile(mergedProfile);
      storage.saveWorkouts(matched.workouts);
      storage.saveSynced(matched.synced);
      storage.setOnboarded();
      setOnboardedState(true);
    } else {
      const w = storage.loadWorkouts();
      const p = storage.loadProfile();
      if (w.length && p) void backupPlan(p, w, u.id);
    }
  }, []);

  // Auth session lifecycle.
  useEffect(() => {
    if (!isConfigured()) return;
    let active = true;
    void getCurrentUser().then((u) => {
      if (active) setUser(u);
    });
    const unsub = onAuthChange((u) => {
      setUser(u);
      if (u) void syncOnLogin(u);
    });
    return () => {
      active = false;
      unsub();
    };
  }, [syncOnLogin, supabaseConfigured]);

  const signIn = useCallback((email: string, password: string) => signInEmail(email, password), []);
  const signUp = useCallback((email: string, password: string) => signUpEmail(email, password), []);
  const signInMagic = useCallback((email: string) => signInMagicLink(email), []);
  const signOut = useCallback(async () => {
    await supaSignOut();
    setUser(null);
  }, []);

  const value: StoreValue = {
    profile,
    workouts,
    synced,
    paces,
    vdot: paces.vdot,
    totalWeeks,
    supabaseConfigured,
    onboarded,
    user,
    signIn,
    signUp,
    signInMagic,
    signOut,
    completeOnboarding,
    regenerate,
    addManualRun,
    logRunForWorkout,
    updateRun,
    deleteRun,
    markComplete,
    reschedule,
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
