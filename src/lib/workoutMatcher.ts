// ---------------------------------------------------------------------------
// Apple Health -> Supabase ingestion safety + the multi-pass smart matcher.
//
//  normalizeHealthPayload  — QA #4/#5: tolerant parsing of the messy values an
//    iOS Shortcut sends from Apple Health (km vs metres, European comma decimals,
//    seconds vs HH:MM:SS), plus a deterministic external_id for de-duplication.
//
//  matchRun  — QA #7: Pass 1 exact date, Pass 2 same-week swap (±30%, closest
//    distance), Pass 3 compliance scoring, Pass 4 unplanned bonus run.
// ---------------------------------------------------------------------------

import type { ComplianceBadge, PlannedWorkout, SyncedWorkout } from '../types';
import { weekStartMonday, toISODate } from './format';

/** Parse a number that may be a string with comma decimals or unit suffixes. */
export function parseLooseNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value == null) return NaN;
  let s = String(value).trim().toLowerCase();
  s = s.replace(/\s*(km|kilometers?|m|meters?|metres?)\s*$/i, ''); // strip unit suffix
  s = s.replace(',', '.'); // European decimal -> dot
  s = s.replace(/[^0-9.\-]/g, ''); // keep digits, dot, minus
  const n = parseFloat(s);
  return isNaN(n) ? NaN : n;
}

/**
 * Parse a duration that may be seconds ("1980"), a clock ("33:00", "1:33:00"),
 * or a unit string ("33 min", "1 hr 33 min", "33 minutes") — the various ways an
 * iOS Shortcut can render Apple Health's workout Duration.
 */
export function parseDurationSeconds(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value == null) return NaN;
  const s = String(value).trim().toLowerCase();

  if (s.includes(':')) {
    const parts = s.split(':').map((p) => parseFloat(p.replace(',', '.')));
    if (parts.some((p) => isNaN(p))) return NaN;
    return parts.reduce((acc, p) => acc * 60 + p, 0);
  }

  // Unit form: hours / minutes / seconds in any combination.
  const num = (m: RegExpExecArray | null) => (m ? parseFloat(m[1].replace(',', '.')) : 0);
  const h = /([\d.,]+)\s*(?:h|hr|hrs|hour|hours)\b/.exec(s);
  const min = /([\d.,]+)\s*(?:min|mins|minute|minutes)\b/.exec(s);
  const sec = /([\d.,]+)\s*(?:sec|secs|second|seconds)\b/.exec(s);
  if (h || min || sec) return num(h) * 3600 + num(min) * 60 + num(sec);

  // Plain number = seconds.
  return parseLooseNumber(s);
}

export interface RawHealthPayload {
  distance?: unknown;
  distance_meters?: unknown;
  duration?: unknown;
  duration_seconds?: unknown;
  local_date?: unknown;
  start_time?: unknown;
  avg_heart_rate?: unknown;
  active_calories?: unknown;
  external_id?: unknown;
  [k: string]: unknown;
}

/**
 * Normalize a raw Apple Health payload into a SyncedWorkout.
 * Distance: values < 100 are treated as KILOMETRES (no training run is < 100m),
 * so "15,4" -> 15400 m, 15.4 -> 15400 m, 15400 -> 15400 m.
 */
export function normalizeHealthPayload(raw: RawHealthPayload): SyncedWorkout {
  const rawDistance = raw.distance_meters ?? raw.distance;
  let distance_meters = parseLooseNumber(rawDistance);
  if (!isNaN(distance_meters) && distance_meters > 0 && distance_meters < 100) {
    distance_meters = distance_meters * 1000; // kilometres -> metres
  }
  distance_meters = Math.round(distance_meters);

  const duration_seconds = Math.round(
    parseDurationSeconds(raw.duration_seconds ?? raw.duration)
  );

  const local_date =
    (typeof raw.local_date === 'string' && raw.local_date.slice(0, 10)) ||
    (typeof raw.start_time === 'string' && raw.start_time.slice(0, 10)) ||
    toISODate(new Date());

  const avg_heart_rate =
    raw.avg_heart_rate != null && !isNaN(parseLooseNumber(raw.avg_heart_rate))
      ? parseLooseNumber(raw.avg_heart_rate)
      : null;
  const active_calories =
    raw.active_calories != null && !isNaN(parseLooseNumber(raw.active_calories))
      ? parseLooseNumber(raw.active_calories)
      : null;

  const external_id =
    (typeof raw.external_id === 'string' && raw.external_id.length > 0
      ? raw.external_id
      : `${local_date}_${distance_meters}_${duration_seconds}`);

  return {
    external_id,
    local_date,
    start_time: typeof raw.start_time === 'string' ? raw.start_time : undefined,
    duration_seconds,
    distance_meters,
    avg_heart_rate,
    active_calories,
    source: 'Strava -> Apple Health',
    raw_payload: { ...raw },
  };
}

/** Moving pace (sec/km) from active duration and distance. Never from timestamps. */
export function movingPaceSecPerKm(durationSeconds: number, distanceMeters: number): number {
  if (distanceMeters <= 0) return 0;
  return durationSeconds / (distanceMeters / 1000);
}

export interface MatchResult {
  matched_workout_id: string | null;
  badge: ComplianceBadge;
  distance_compliance_pct: number;
  pace_delta_sec: number;
  unplanned: boolean;
}

/** Public: grade a run against a specific workout (for UI display of linked runs). */
export function evaluateCompliance(run: SyncedWorkout, workout: PlannedWorkout): MatchResult {
  return scoreCompliance(run, workout);
}

function scoreCompliance(run: SyncedWorkout, workout: PlannedWorkout): MatchResult {
  const distance_compliance_pct = Math.round(
    (run.distance_meters / workout.target_distance_meters) * 100
  );
  const actualPace = movingPaceSecPerKm(run.duration_seconds, run.distance_meters);
  const pace_delta_sec = Math.round(actualPace - workout.target_avg_pace_sec);

  const distOk = Math.abs(distance_compliance_pct - 100) <= 12;
  const paceFaster = pace_delta_sec < -10; // more than 10s/km faster than target
  const paceInWindow = pace_delta_sec <= 15 && pace_delta_sec >= -10;

  let badge: ComplianceBadge;
  if (distance_compliance_pct >= 95 && paceFaster) badge = 'crushed_it';
  else if (distOk && paceInWindow) badge = 'on_target';
  else badge = 'completed_modified';

  return {
    matched_workout_id: workout.id,
    badge,
    distance_compliance_pct,
    pace_delta_sec,
    unplanned: false,
  };
}

/**
 * Match a synced run to a pending (uncompleted) scheduled workout.
 * `pending` should be the not-yet-completed workouts of the plan.
 */
export function matchRun(run: SyncedWorkout, pending: PlannedWorkout[]): MatchResult {
  const runWeek = weekStartMonday(run.local_date);

  // Pass 1 — exact calendar date.
  const sameDay = pending.filter((w) => w.date === run.local_date);
  if (sameDay.length > 0) {
    const best = closestByDistance(run, sameDay);
    return scoreCompliance(run, best);
  }

  // Pass 2 — flexible same-week swap, closest distance within ±30%.
  const sameWeek = pending.filter((w) => weekStartMonday(w.date) === runWeek);
  const withinTolerance = sameWeek.filter((w) => {
    const ratio = run.distance_meters / w.target_distance_meters;
    return ratio >= 0.7 && ratio <= 1.3;
  });
  if (withinTolerance.length > 0) {
    const best = closestByDistance(run, withinTolerance);
    return scoreCompliance(run, best);
  }

  // Pass 4 — unplanned bonus run (mileage still counts for the week).
  return {
    matched_workout_id: null,
    badge: 'unplanned',
    distance_compliance_pct: 100,
    pace_delta_sec: 0,
    unplanned: true,
  };
}

function closestByDistance(run: SyncedWorkout, pool: PlannedWorkout[]): PlannedWorkout {
  return pool.reduce((best, w) =>
    Math.abs(w.target_distance_meters - run.distance_meters) <
    Math.abs(best.target_distance_meters - run.distance_meters)
      ? w
      : best
  );
}
