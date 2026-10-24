import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { useStore, useCurrentWeek } from '../state/store';
import { SegmentBar } from '../components/SegmentBar';
import { WorkoutSheet } from '../components/WorkoutSheet';
import { TypeChip } from '../components/TypeChip';
import { typeAccent } from '../components/ui';
import { formatDuration, formatPace, metersToKm, dayFull, weekStartMonday } from '../lib/format';

export function PlanTab() {
  const { workouts, synced, totalWeeks, markComplete, relink } = useStore();
  const current = useCurrentWeek(workouts);
  const [selectedWeek, setSelectedWeek] = useState(current);
  const [sheetId, setSheetId] = useState<string | null>(null);

  const weekNumbers = useMemo(
    () => Array.from({ length: totalWeeks }, (_, i) => i + 1),
    [totalWeeks]
  );

  const tagForWeek = (week: number): { text: string; color: string } | null => {
    const w = workouts.find((x) => x.week === week);
    if (!w) return null;
    if (w.phase === 'Peak') return { text: 'PEAK', color: '#22D3EE' };
    if (w.phase === 'Taper') return { text: 'TAPER', color: '#00F5A0' };
    if (w.isDeload) return { text: 'DELOAD', color: '#FBBF24' };
    return null;
  };

  const weekWorkouts = workouts
    .filter((w) => w.week === selectedWeek)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const weekKm = weekWorkouts.reduce((s, w) => s + w.target_distance_meters, 0) / 1000;
  const weekPhase = weekWorkouts[0]?.phase ?? '';

  const sheetWorkout = workouts.find((w) => w.id === sheetId) ?? null;
  const sheetWeekRuns = sheetWorkout
    ? synced.filter((r) => weekStartMonday(r.local_date) === weekStartMonday(sheetWorkout.date))
    : [];

  return (
    <div className="safe-top px-5 pb-28">
      <h1 className="text-3xl font-extrabold tracking-tight">Plan</h1>
      <p className="mt-1 text-sm text-dim">{totalWeeks}-week periodized build to race day</p>

      {/* Week selector */}
      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
        {weekNumbers.map((n) => {
          const tag = tagForWeek(n);
          const active = n === selectedWeek;
          const isCurrent = n === current;
          return (
            <button
              key={n}
              onClick={() => setSelectedWeek(n)}
              className="press flex min-w-[58px] flex-col items-center rounded-2xl px-2 py-2.5"
              style={{
                border: active ? '1px solid #00F5A0' : '1px solid #242430',
                background: active ? 'rgba(0,245,160,0.12)' : '#15151B',
              }}
            >
              <span className="text-[10px] font-semibold text-dim">W</span>
              <span
                className="tabular text-lg font-extrabold leading-none"
                style={{ color: active ? '#00F5A0' : '#fff' }}
              >
                {n}
              </span>
              {tag ? (
                <span className="mt-1 text-[8px] font-extrabold" style={{ color: tag.color }}>
                  {tag.text}
                </span>
              ) : (
                <span className="mt-1 text-[8px] font-bold text-transparent">
                  {isCurrent ? 'NOW' : '·'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Week summary */}
      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-extrabold">Week {selectedWeek}</span>
          <span className="text-sm font-semibold text-dim">{weekPhase}</span>
        </div>
        <span className="tabular text-sm font-semibold text-dim">{weekKm.toFixed(0)} km total</span>
      </div>

      {/* Day cards */}
      <div className="mt-3 space-y-3">
        {weekWorkouts.map((w, i) => (
          <button
            key={w.id}
            onClick={() => setSheetId(w.id)}
            className="press rise card block w-full p-4 text-left"
            style={{ animationDelay: `${i * 45}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-dim">
                {dayFull(w.dayOfWeek)}
              </span>
              <div className="flex items-center gap-2">
                {w.completed && (
                  <span
                    className="grid h-5 w-5 place-items-center rounded-full"
                    style={{ background: typeAccent[w.type] }}
                  >
                    <Check size={13} strokeWidth={3} color="#061012" />
                  </span>
                )}
                <TypeChip type={w.type} />
              </div>
            </div>
            <h3 className="mt-2 text-lg font-bold leading-tight">{w.title}</h3>
            <div className="tabular mt-0.5 text-xs text-dim">
              {metersToKm(w.target_distance_meters)} km · ~{formatDuration(w.estimated_duration_seconds)} ·
              avg {formatPace(w.target_avg_pace_sec)}
              {w.elevation_gain_m > 0 ? ` · ↑${w.elevation_gain_m} m` : ''}
            </div>
            <div className="mt-3">
              <SegmentBar segments={w.segments} />
            </div>
          </button>
        ))}
      </div>

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
