import { useMemo, useState } from 'react';
import { RefreshCw, ArrowRight, Heart } from 'lucide-react';
import { useStore, useCurrentWeek } from '../state/store';
import { SegmentBar } from '../components/SegmentBar';
import { WorkoutSheet } from '../components/WorkoutSheet';
import { ComplianceBadgePill } from '../components/Badge';
import { ProgressRing } from '../components/ProgressRing';
import { TypeChip } from '../components/TypeChip';
import { heroBackground, typeAccent } from '../components/ui';
import {
  formatDuration,
  formatPace,
  metersToKm,
  toISODate,
  weekStartMonday,
  daysBetween,
} from '../lib/format';
import { evaluateCompliance, movingPaceSecPerKm } from '../lib/workoutMatcher';
import type { ComplianceBadge } from '../types';

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
    weekWorkouts.filter((w) => w.completed).reduce((s, w) => s + w.target_distance_meters, 0) / 1000;
  const runsDone = weekWorkouts.filter((w) => w.completed).length;
  const phaseLabel = weekWorkouts[0]?.phase ?? 'Base';

  const recentRuns = [...synced]
    .sort((a, b) => b.local_date.localeCompare(a.local_date))
    .slice(0, 4);

  const sheetWorkout = workouts.find((w) => w.id === sheetId) ?? null;
  const sheetWeekRuns = sheetWorkout
    ? synced.filter((r) => weekStartMonday(r.local_date) === weekStartMonday(sheetWorkout.date))
    : [];

  function badgeFor(run: (typeof synced)[number]): ComplianceBadge {
    if (!run.matched_workout_id) return 'unplanned';
    const w = workouts.find((x) => x.id === run.matched_workout_id);
    return w ? evaluateCompliance(run, w).badge : 'unplanned';
  }

  const isToday = todaysWorkout?.date === today;

  return (
    <div className="safe-top px-5 pb-28">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="rise" style={{ animationDelay: '0ms' }}>
          <div className="text-sm font-medium text-dim">{phaseLabel} phase · Week {currentWeek}</div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="tabular text-5xl font-extrabold tracking-tight">{weeksToGoal}</span>
            <span className="pb-1 text-base font-semibold text-dim">
              {weeksToGoal === 1 ? 'week to go' : 'weeks to go'}
            </span>
          </div>
        </div>
        <button
          onClick={() => void syncHealth()}
          className="press mt-1 grid h-11 w-11 place-items-center rounded-full bg-card"
          style={{ border: '1px solid #242430' }}
          aria-label="Sync Health"
        >
          <RefreshCw size={18} className={syncing ? 'spin text-mint' : 'text-mint'} />
        </button>
      </div>
      {lastSynced && (
        <div className="mt-1 text-[11px] text-dim">
          Synced {new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      {/* Hero card */}
      <div className="rise mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-dim" style={{ animationDelay: '40ms' }}>
        {isToday ? "Today's session" : 'Next up'}
      </div>
      {todaysWorkout ? (
        <button
          onClick={() => setSheetId(todaysWorkout.id)}
          className="press rise card block w-full overflow-hidden p-5 text-left"
          style={{ ...heroBackground(todaysWorkout.type), animationDelay: '60ms' }}
        >
          <TypeChip type={todaysWorkout.type} solid />
          <h2 className="mt-3 text-2xl font-extrabold leading-tight">{todaysWorkout.title}</h2>
          <div className="mt-4 flex items-end gap-1">
            <span className="tabular text-7xl font-extrabold tracking-tighter">
              {metersToKm(todaysWorkout.target_distance_meters)}
            </span>
            <span className="pb-2 text-xl font-bold text-dim">km</span>
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm text-white/60">
            <span className="tabular">~{formatDuration(todaysWorkout.estimated_duration_seconds)}</span>
            <span className="tabular">
              avg {formatPace(todaysWorkout.target_avg_pace_sec)}
            </span>
          </div>
          <div className="mt-4">
            <SegmentBar segments={todaysWorkout.segments} height={12} />
          </div>
          <div className="mt-4 flex items-center gap-1 text-sm font-semibold" style={{ color: typeAccent[todaysWorkout.type] }}>
            View full session <ArrowRight size={15} />
          </div>
        </button>
      ) : (
        <div className="card p-6 text-center text-white/50">
          Plan complete — enjoy race day. 🎉
        </div>
      )}

      {/* Weekly progress */}
      <div className="rise card mt-5 flex items-center gap-5 p-5" style={{ animationDelay: '120ms' }}>
        <ProgressRing value={plannedKm ? completedKm / plannedKm : 0} size={92} stroke={9}>
          <div className="text-center">
            <div className="tabular text-xl font-extrabold leading-none">{completedKm.toFixed(0)}</div>
            <div className="text-[10px] text-dim">of {plannedKm.toFixed(0)}km</div>
          </div>
        </ProgressRing>
        <div className="flex-1">
          <div className="text-sm font-bold">This week</div>
          <div className="mt-1 text-sm text-dim">
            {runsDone} of {weekWorkouts.length} runs done
          </div>
          <div className="mt-3 flex gap-2">
            {weekWorkouts.map((w) => (
              <div
                key={w.id}
                className="h-1.5 flex-1 rounded-full"
                style={{ background: w.completed ? typeAccent[w.type] : '#242430' }}
                title={w.title}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Recent runs */}
      <div className="rise mb-2 mt-7 flex items-center justify-between" style={{ animationDelay: '160ms' }}>
        <span className="text-xs font-bold uppercase tracking-wider text-dim">Recent runs</span>
      </div>
      {recentRuns.length === 0 ? (
        <div className="card p-5 text-sm text-white/40">
          No runs synced yet. Record in Strava, or try “Simulate run” in Setup.
        </div>
      ) : (
        <div className="space-y-2">
          {recentRuns.map((r, i) => (
            <div
              key={r.external_id}
              className="rise card flex items-center justify-between p-4"
              style={{ animationDelay: `${180 + i * 40}ms` }}
            >
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="tabular text-lg font-extrabold">{metersToKm(r.distance_meters)}</span>
                  <span className="text-xs font-semibold text-dim">km</span>
                  <span className="tabular ml-2 text-sm text-white/55">
                    {formatPace(movingPaceSecPerKm(r.duration_seconds, r.distance_meters))}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-dim">
                  <span className="tabular">{r.local_date}</span>
                  {r.avg_heart_rate ? (
                    <span className="flex items-center gap-0.5">
                      <Heart size={10} className="text-pink" /> {Math.round(r.avg_heart_rate)}
                    </span>
                  ) : null}
                  <span className="tabular">{formatDuration(r.duration_seconds)}</span>
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
