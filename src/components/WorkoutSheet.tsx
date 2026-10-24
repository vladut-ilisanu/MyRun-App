import { X, Check, Link2, Unlink, Sparkles, CalendarClock } from 'lucide-react';
import type { PlannedWorkout, SyncedWorkout } from '../types';
import { formatDuration, formatPaceRange, metersToKm, formatPace } from '../lib/format';
import { segmentColor, typeGradient, typeLabel, hexA } from './ui';
import { movingPaceSecPerKm } from '../lib/workoutMatcher';

interface Props {
  workout: PlannedWorkout;
  weekRuns: SyncedWorkout[];
  onClose: () => void;
  onToggleComplete: (completed: boolean) => void;
  onRelink: (externalId: string, workoutId: string | null) => void;
  onReschedule?: (dateISO: string) => void;
}

export function WorkoutSheet({
  workout,
  weekRuns,
  onClose,
  onToggleComplete,
  onRelink,
  onReschedule,
}: Props) {
  const linked = weekRuns.find((r) => r.external_id === workout.matched_synced_id);
  const [g1, g2] = typeGradient[workout.type];

  return (
    <div className="fixed inset-0 z-[60] flex justify-center">
      <div className="absolute inset-0 overlay-in bg-black/60" onClick={onClose} />
      <div className="sheet-in relative flex w-full max-w-md flex-col bg-bg">
        {/* Gradient header */}
        <div className="safe-top relative overflow-hidden px-5 pb-6">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(120% 90% at 100% 0%, ${hexA(g1, 0.3)} 0%, ${hexA(
                g2,
                0.1
              )} 45%, rgba(7,7,10,0) 72%)`,
            }}
          />
          <div className="relative flex items-center justify-between">
            <span
              className="rounded-full px-3 py-1 text-xs font-bold tracking-wide text-black"
              style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
            >
              {typeLabel[workout.type]}
            </span>
            <button
              onClick={onClose}
              className="press grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/80"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <h1 className="relative mt-4 text-3xl font-extrabold tracking-tight">{workout.title}</h1>
          <div className="relative mt-3 flex flex-wrap gap-x-5 gap-y-2">
            <HeaderStat value={metersToKm(workout.target_distance_meters)} unit="km" label="Distance" />
            <HeaderStat
              value={formatDuration(workout.estimated_duration_seconds)}
              label="Est. time"
            />
            <HeaderStat value={formatPace(workout.target_avg_pace_sec).replace('/km', '')} unit="/km" label="Avg pace" />
            {workout.elevation_gain_m > 0 && (
              <HeaderStat value={String(workout.elevation_gain_m)} unit="m" label="Climb" />
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-nav">
          {/* Why */}
          <div className="card mt-1 p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mint">
              <Sparkles size={13} /> Why this session
            </div>
            <p className="text-sm leading-relaxed text-white/75">{workout.rationale}</p>
          </div>

          {/* Segments */}
          <div className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-dim">
            The session
          </div>
          <div className="space-y-2">
            {workout.segments.map((seg) => (
              <div
                key={seg.id}
                className="card overflow-hidden p-3.5"
                style={{ borderLeft: `3px solid ${segmentColor[seg.type]}` }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{seg.title}</span>
                  <span className="tabular text-sm text-white/55">
                    {metersToKm(seg.distance_meters)} km
                  </span>
                </div>
                <div className="mt-1 text-sm text-white/55">
                  <span style={{ color: segmentColor[seg.type] }}>
                    {formatPaceRange(seg.target_pace_min_sec, seg.target_pace_max_sec)}
                  </span>
                  {seg.reps && seg.rep_distance_meters ? ` · ${seg.reps} × ${seg.rep_distance_meters}m` : ''}
                  {seg.rest_seconds ? ` · ${seg.rest_seconds}s recovery` : ''}
                </div>
                {seg.notes && <div className="mt-1 text-xs text-white/35">{seg.notes}</div>}
              </div>
            ))}
          </div>

          {/* Linked run */}
          <div className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-dim">
            Logged run
          </div>
          {linked ? (
            <div className="card flex items-center justify-between p-4">
              <span className="tabular text-sm">
                {metersToKm(linked.distance_meters)} km ·{' '}
                {formatPace(movingPaceSecPerKm(linked.duration_seconds, linked.distance_meters))} ·{' '}
                {linked.local_date}
              </span>
              <button
                onClick={() => onRelink(linked.external_id, null)}
                className="press flex items-center gap-1 text-xs font-semibold text-amber"
              >
                <Unlink size={14} /> Unlink
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {weekRuns.filter((r) => !r.matched_workout_id).length === 0 ? (
                <div className="card p-4 text-sm text-white/40">
                  No unlinked runs in this week yet.
                </div>
              ) : (
                weekRuns
                  .filter((r) => !r.matched_workout_id)
                  .map((r) => (
                    <button
                      key={r.external_id}
                      onClick={() => onRelink(r.external_id, workout.id)}
                      className="press card flex w-full items-center justify-between p-4 text-left"
                    >
                      <span className="tabular text-sm">
                        {metersToKm(r.distance_meters)} km ·{' '}
                        {formatPace(movingPaceSecPerKm(r.duration_seconds, r.distance_meters))} ·{' '}
                        {r.local_date}
                      </span>
                      <Link2 size={16} className="text-mint" />
                    </button>
                  ))
              )}
            </div>
          )}

          {/* Reschedule */}
          {onReschedule && workout.type !== 'RACE' && (
            <>
              <div className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-dim">
                Reschedule
              </div>
              <label className="card flex items-center justify-between p-4">
                <span className="flex items-center gap-2 text-sm">
                  <CalendarClock size={16} className="text-mint" /> Move to
                </span>
                <input
                  type="date"
                  value={workout.date}
                  onChange={(e) => e.target.value && onReschedule(e.target.value)}
                  className="rounded-lg bg-bg px-2 py-1.5 text-sm"
                  style={{ border: '1px solid #272734' }}
                />
              </label>
            </>
          )}
        </div>

        {/* Sticky action */}
        <div className="tabbar px-5 pt-3">
          <button
            onClick={() => onToggleComplete(!workout.completed)}
            className="press flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-bold"
            style={{
              background: workout.completed ? '#15151B' : `linear-gradient(135deg, ${g1}, ${g2})`,
              color: workout.completed ? '#7B8CFF' : '#061012',
              border: workout.completed ? '1px solid #242430' : 'none',
            }}
          >
            <Check size={18} strokeWidth={2.6} />
            {workout.completed ? 'Completed — tap to undo' : 'Mark complete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function HeaderStat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div>
      <div className="flex items-baseline gap-0.5">
        <span className="tabular text-xl font-extrabold">{value}</span>
        {unit && <span className="text-xs font-semibold text-white/50">{unit}</span>}
      </div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-white/40">{label}</div>
    </div>
  );
}
