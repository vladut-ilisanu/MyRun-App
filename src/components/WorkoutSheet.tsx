import { X, Check, Link2, Unlink } from 'lucide-react';
import type { PlannedWorkout, SyncedWorkout } from '../types';
import { formatDuration, formatPaceRange, metersToKm, formatPace } from '../lib/format';
import { segmentColor, workoutTypeColor } from './ui';
import { movingPaceSecPerKm } from '../lib/workoutMatcher';

interface Props {
  workout: PlannedWorkout;
  weekRuns: SyncedWorkout[];
  onClose: () => void;
  onToggleComplete: (completed: boolean) => void;
  onRelink: (externalId: string, workoutId: string | null) => void;
}

export function WorkoutSheet({
  workout,
  weekRuns,
  onClose,
  onToggleComplete,
  onRelink,
}: Props) {
  const linked = weekRuns.find((r) => r.external_id === workout.matched_synced_id);
  const color = workoutTypeColor[workout.type];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg">
      <div className="safe-top flex items-center justify-between px-5 pb-3">
        <span
          className="rounded-md px-2 py-1 text-xs font-bold tracking-wide"
          style={{ color, backgroundColor: `${color}22` }}
        >
          {workout.type}
        </span>
        <button
          onClick={onClose}
          className="rounded-full bg-card p-2 text-white/70"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28">
        <h1 className="mt-1 text-2xl font-bold">{workout.title}</h1>
        <div className="mt-1 text-sm text-white/50">
          {metersToKm(workout.target_distance_meters)} km · ~
          {formatDuration(workout.estimated_duration_seconds)} · avg{' '}
          {formatPace(workout.target_avg_pace_sec)}
        </div>

        <div className="mt-4 rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-white/75">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-mint">
            Why this workout
          </div>
          {workout.rationale}
        </div>

        <div className="mt-5 space-y-2">
          {workout.segments.map((seg) => (
            <div
              key={seg.id}
              className="rounded-xl border border-border bg-card p-3"
              style={{ borderLeft: `4px solid ${segmentColor[seg.type]}` }}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{seg.title}</span>
                <span className="text-sm text-white/60">
                  {metersToKm(seg.distance_meters)} km
                </span>
              </div>
              <div className="mt-1 text-sm text-white/55">
                Target {formatPaceRange(seg.target_pace_min_sec, seg.target_pace_max_sec)}
                {seg.reps && seg.rep_distance_meters
                  ? ` · ${seg.reps} × ${seg.rep_distance_meters}m`
                  : ''}
                {seg.rest_seconds ? ` · ${seg.rest_seconds}s recovery` : ''}
              </div>
              {seg.notes && <div className="mt-1 text-xs text-white/40">{seg.notes}</div>}
            </div>
          ))}
        </div>

        {/* Linked run + compliance */}
        <div className="mt-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">
            Synced run link
          </div>
          {linked ? (
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  {metersToKm(linked.distance_meters)} km ·{' '}
                  {formatPace(movingPaceSecPerKm(linked.duration_seconds, linked.distance_meters))}{' '}
                  · {linked.local_date}
                </span>
                <button
                  onClick={() => onRelink(linked.external_id, null)}
                  className="flex items-center gap-1 text-xs text-amber"
                >
                  <Unlink size={14} /> Unlink
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {weekRuns.filter((r) => !r.matched_workout_id).length === 0 && (
                <div className="text-sm text-white/40">
                  No unlinked synced runs in this week.
                </div>
              )}
              {weekRuns
                .filter((r) => !r.matched_workout_id)
                .map((r) => (
                  <button
                    key={r.external_id}
                    onClick={() => onRelink(r.external_id, workout.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-3 text-left"
                  >
                    <span className="text-sm">
                      {metersToKm(r.distance_meters)} km ·{' '}
                      {formatPace(
                        movingPaceSecPerKm(r.duration_seconds, r.distance_meters)
                      )}{' '}
                      · {r.local_date}
                    </span>
                    <Link2 size={16} className="text-mint" />
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="tabbar flex gap-3 px-5 pt-3">
        <button
          onClick={() => onToggleComplete(!workout.completed)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-semibold"
          style={{
            backgroundColor: workout.completed ? '#141418' : '#00F5A0',
            color: workout.completed ? '#00F5A0' : '#0A0A0C',
            border: workout.completed ? '1px solid #26262E' : 'none',
          }}
        >
          <Check size={18} />
          {workout.completed ? 'Completed — tap to undo' : 'Mark complete'}
        </button>
      </div>
    </div>
  );
}
