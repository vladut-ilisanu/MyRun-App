import { useMemo, useState } from 'react';
import { RefreshCw, ChevronRight } from 'lucide-react';
import { useStore, useCurrentWeek } from '../state/store';
import { SegmentBar } from '../components/SegmentBar';
import { WorkoutSheet } from '../components/WorkoutSheet';
import { ComplianceBadgePill } from '../components/Badge';
import {
  formatDuration,
  formatPace,
  metersToKm,
  toISODate,
  weekStartMonday,
  daysBetween,
} from '../lib/format';
import { evaluateCompliance, movingPaceSecPerKm } from '../lib/workoutMatcher';
import type { ComplianceBadge, PlannedWorkout } from '../types';

export function TodayTab() {
  const { workouts, synced, profile, syncing, lastSynced, syncHealth, markComplete, relink } =
    useStore();
  const [sheetId, setSheetId] = useState<string | null>(null);

  const today = toISODate(new Date());
  const currentWeek = useCurrentWeek(workouts);

  const todaysWorkout = useMemo(() => {
    const exact = workouts.find((w) => w.date === today);
    if (exact) return exact;
    return workouts.find((w) => w.date >= today) ?? null;
  }, [workouts, today]);

  const weeksToGoal = Math.max(0, Math.ceil(daysBetween(today, profile.goalRaceDate) / 7));

  const weekWorkouts = workouts.filter((w) => w.week === currentWeek);
  const plannedKm = weekWorkouts.reduce((s, w) => s + w.target_distance_meters, 0) / 1000;
  const completedKm =
    weekWorkouts.filter((w) => w.completed).reduce((s, w) => s + w.target_distance_meters, 0) /
    1000;
  const runsDone = weekWorkouts.filter((w) => w.completed).length;
  const phaseLabel = weekWorkouts[0]?.phase ?? 'Base';

  const recentRuns = [...synced]
    .sort((a, b) => b.local_date.localeCompare(a.local_date))
    .slice(0, 5);

  const sheetWorkout = workouts.find((w) => w.id === sheetId) ?? null;
  const sheetWeekRuns = sheetWorkout
    ? synced.filter(
        (r) => weekStartMonday(r.local_date) === weekStartMonday(sheetWorkout.date)
      )
    : [];

  function badgeFor(run: (typeof synced)[number]): ComplianceBadge {
    if (!run.matched_workout_id) return 'unplanned';
    const w = workouts.find((x) => x.id === run.matched_workout_id);
    return w ? evaluateCompliance(run, w).badge : 'unplanned';
  }

  return (
    <div className="safe-top px-5 pb-28">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="inline-flex items-center rounded-full bg-mint/10 px-3 py-1 text-sm font-semibold text-mint">
            {weeksToGoal} {weeksToGoal === 1 ? 'week' : 'weeks'} to goal
          </div>
          <div className="mt-2 text-xs font-medium uppercase tracking-wide text-white/40">
            {phaseLabel} Phase · Week {currentWeek}
          </div>
        </div>
        <button
          onClick={() => void syncHealth()}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm"
        >
          <RefreshCw size={16} className={syncing ? 'spin text-mint' : 'text-mint'} />
          {syncing ? 'Syncing' : 'Sync Health'}
        </button>
      </div>
      {lastSynced && (
        <div className="mt-1 text-right text-[11px] text-white/30">
          Last synced {new Date(lastSynced).toLocaleTimeString()}
        </div>
      )}

      {/* Today hero card */}
      <h2 className="mt-5 text-sm font-semibold uppercase tracking-wide text-white/40">
        {todaysWorkout?.date === today ? "Today's session" : 'Next session'}
      </h2>
      {todaysWorkout ? (
        <HeroCard workout={todaysWorkout} onOpen={() => setSheetId(todaysWorkout.id)} />
      ) : (
        <div className="mt-2 rounded-2xl border border-border bg-card p-5 text-white/50">
          No upcoming sessions — your plan is complete. 🎉
        </div>
      )}

      {/* Weekly volume & compliance */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Week {currentWeek} volume</span>
          <span className="text-white/50">
            {completedKm.toFixed(1)} / {plannedKm.toFixed(1)} km
          </span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-mint"
            style={{ width: `${plannedKm ? Math.min(100, (completedKm / plannedKm) * 100) : 0}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-white/50">
          {runsDone} / {weekWorkouts.length} runs completed · {phaseLabel} phase
        </div>
      </div>

      {/* Recent synced runs */}
      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-white/40">
        Recent Apple Health runs
      </h2>
      {recentRuns.length === 0 ? (
        <div className="mt-2 rounded-2xl border border-border bg-card p-4 text-sm text-white/40">
          No synced runs yet. Record a run in Strava, or use “Simulate Apple Health Run” in Setup.
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          {recentRuns.map((r) => (
            <div
              key={r.external_id}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
            >
              <div>
                <div className="font-semibold">
                  {metersToKm(r.distance_meters)} km ·{' '}
                  {formatPace(movingPaceSecPerKm(r.duration_seconds, r.distance_meters))}
                </div>
                <div className="mt-0.5 text-xs text-white/45">
                  {r.local_date}
                  {r.avg_heart_rate ? ` · ${Math.round(r.avg_heart_rate)} bpm` : ''} ·{' '}
                  {formatDuration(r.duration_seconds)}
                </div>
              </div>
              <ComplianceBadgePill badge={badgeFor(r)} />
            </div>
          ))}
        </div>
      )}

      {sheetWorkout && (
        <WorkoutSheet
          workout={sheetWorkout}
          weekRuns={sheetWeekRuns}
          onClose={() => setSheetId(null)}
          onToggleComplete={(c) => markComplete(sheetWorkout.id, c)}
          onRelink={relink}
        />
      )}
    </div>
  );
}

function HeroCard({ workout, onOpen }: { workout: PlannedWorkout; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="mt-2 w-full rounded-2xl border border-border bg-card p-5 text-left"
    >
      <div className="flex items-center justify-between">
        <span className="rounded-md bg-mint/15 px-2 py-1 text-xs font-bold tracking-wide text-mint">
          {workout.type}
        </span>
        <ChevronRight size={18} className="text-white/40" />
      </div>
      <h3 className="mt-3 text-xl font-bold">{workout.title}</h3>
      <div className="mt-1 text-sm text-white/55">
        {metersToKm(workout.target_distance_meters)} km · ~
        {formatDuration(workout.estimated_duration_seconds)} · avg{' '}
        {formatPace(workout.target_avg_pace_sec)}
      </div>
      <div className="mt-4">
        <SegmentBar segments={workout.segments} />
      </div>
    </button>
  );
}
