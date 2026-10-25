import type { ReactNode } from 'react';
import { X, Heart, Flame, Clock, TrendingUp } from 'lucide-react';
import type { PlannedWorkout, SyncedWorkout } from '../types';
import { formatDuration, formatPace, metersToKm } from '../lib/format';
import { evaluateCompliance, movingPaceSecPerKm } from '../lib/workoutMatcher';
import { ComplianceBadgePill } from './Badge';
import { TypeChip } from './TypeChip';
import { hexA } from './ui';

/** Full-screen detail for a single logged run. */
export function RunSheet({
  run,
  matched,
  onClose,
}: {
  run: SyncedWorkout;
  matched: PlannedWorkout | null;
  onClose: () => void;
}) {
  const pace = movingPaceSecPerKm(run.duration_seconds, run.distance_meters);
  const comp = matched ? evaluateCompliance(run, matched) : null;
  const g1 = '#22D3EE';
  const g2 = '#3B82F6';
  const isSim = run.source && run.source.includes('Simulated');

  return (
    <div className="fixed inset-0 z-[60] flex justify-center">
      <div className="absolute inset-0 overlay-in bg-black/60" onClick={onClose} />
      <div className="sheet-in relative flex w-full max-w-md flex-col bg-bg">
        {/* Header */}
        <div className="safe-top relative overflow-hidden px-5 pb-6">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: `radial-gradient(120% 90% at 100% 0%, ${hexA(g1, 0.28)} 0%, ${hexA(g2, 0.1)} 45%, rgba(7,7,10,0) 72%)` }}
          />
          <div className="relative flex items-center justify-between">
            <span className="rounded-full px-3 py-1 text-xs font-bold tracking-wide text-black" style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
              {isSim ? 'Test run' : 'Logged run'}
            </span>
            <button onClick={onClose} className="press grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/80" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className="relative mt-4 flex items-end gap-1">
            <span className="tabular text-6xl font-extrabold tracking-tighter">{metersToKm(run.distance_meters)}</span>
            <span className="pb-2 text-xl font-bold text-dim">km</span>
          </div>
          <div className="relative mt-1 text-sm text-white/55">{run.local_date}{run.source ? ` · ${run.source}` : ''}</div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-nav">
          {/* Metric tiles */}
          <div className="grid grid-cols-2 gap-3">
            <Metric icon={<TrendingUp size={15} />} label="Moving pace" value={formatPace(pace)} />
            <Metric icon={<Clock size={15} />} label="Duration" value={formatDuration(run.duration_seconds)} />
            {run.avg_heart_rate ? (
              <Metric icon={<Heart size={15} className="text-pink" />} label="Avg heart rate" value={`${Math.round(run.avg_heart_rate)} bpm`} />
            ) : null}
            {run.active_calories ? (
              <Metric icon={<Flame size={15} className="text-orange" />} label="Active calories" value={`${Math.round(run.active_calories)} kcal`} />
            ) : null}
          </div>

          {/* Matched workout */}
          <div className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-dim">
            {matched ? 'Matched session' : 'Session'}
          </div>
          {matched && comp ? (
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{matched.title}</h3>
                <TypeChip type={matched.type} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <ComplianceBadgePill badge={comp.badge} />
                <span className="tabular text-xs text-dim">
                  {comp.distance_compliance_pct}% of target ·{' '}
                  {comp.pace_delta_sec === 0
                    ? 'on target pace'
                    : comp.pace_delta_sec < 0
                      ? `${Math.abs(comp.pace_delta_sec)}s/km faster`
                      : `${comp.pace_delta_sec}s/km slower`}
                </span>
              </div>
              <div className="tabular mt-3 text-xs text-dim">
                Target {metersToKm(matched.target_distance_meters)} km · avg {formatPace(matched.target_avg_pace_sec)}
              </div>
            </div>
          ) : (
            <div className="card p-4 text-sm text-white/45">
              Not linked to a scheduled session — logged as a bonus run. Its mileage still counts
              toward your week.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-dim">
        {icon} {label}
      </div>
      <div className="tabular mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}
