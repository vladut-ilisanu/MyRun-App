import { useMemo, useState } from 'react';
import { useStore, useCurrentWeek } from '../state/store';
import { SegmentBar } from '../components/SegmentBar';
import { WorkoutSheet } from '../components/WorkoutSheet';
import { formatDuration, formatPace, metersToKm, dayFull, weekStartMonday } from '../lib/format';
import { workoutTypeColor } from '../components/ui';

export function PlanTab() {
  const { workouts, synced, totalWeeks, markComplete, relink } = useStore();
  const current = useCurrentWeek(workouts);
  const [selectedWeek, setSelectedWeek] = useState(current);
  const [sheetId, setSheetId] = useState<string | null>(null);

  const weekNumbers = useMemo(
    () => Array.from({ length: totalWeeks }, (_, i) => i + 1),
    [totalWeeks]
  );

  const tagForWeek = (week: number): string | null => {
    const w = workouts.find((x) => x.week === week);
    if (!w) return null;
    if (w.phase === 'Peak') return 'PEAK';
    if (w.isDeload) return 'DELOAD';
    if (w.phase === 'Taper') return 'TAPER';
    return null;
  };

  const weekWorkouts = workouts
    .filter((w) => w.week === selectedWeek)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  const sheetWorkout = workouts.find((w) => w.id === sheetId) ?? null;
  const sheetWeekRuns = sheetWorkout
    ? synced.filter((r) => weekStartMonday(r.local_date) === weekStartMonday(sheetWorkout.date))
    : [];

  return (
    <div className="safe-top px-5 pb-28">
      <h1 className="text-2xl font-bold">Training Plan</h1>
      <p className="mt-1 text-sm text-white/45">
        {totalWeeks}-week periodized build to race day.
      </p>

      {/* Week selector */}
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {weekNumbers.map((n) => {
          const tag = tagForWeek(n);
          const active = n === selectedWeek;
          return (
            <button
              key={n}
              onClick={() => setSelectedWeek(n)}
              className="flex min-w-[56px] flex-col items-center rounded-xl border px-2 py-2"
              style={{
                borderColor: active ? '#00F5A0' : '#26262E',
                backgroundColor: active ? 'rgba(0,245,160,0.1)' : '#141418',
              }}
            >
              <span className="text-sm font-bold" style={{ color: active ? '#00F5A0' : '#fff' }}>
                W{n}
              </span>
              {tag && (
                <span
                  className="mt-1 text-[9px] font-bold"
                  style={{ color: tag === 'PEAK' ? '#00D2FF' : tag === 'TAPER' ? '#00F5A0' : '#F59E0B' }}
                >
                  {tag}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Day cards */}
      <div className="mt-5 space-y-3">
        {weekWorkouts.map((w) => {
          const color = workoutTypeColor[w.type];
          return (
            <button
              key={w.id}
              onClick={() => setSheetId(w.id)}
              className="w-full rounded-2xl border bg-card p-4 text-left"
              style={{ borderColor: w.completed ? '#00F5A033' : '#26262E' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-white/40">
                  {dayFull(w.dayOfWeek)}
                </span>
                <span
                  className="rounded-md px-2 py-0.5 text-[11px] font-bold"
                  style={{ color, backgroundColor: `${color}22` }}
                >
                  {w.type}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <h3 className="font-semibold">{w.title}</h3>
                {w.completed && <span className="text-xs font-semibold text-mint">✓ done</span>}
              </div>
              <div className="mt-0.5 text-xs text-white/50">
                {metersToKm(w.target_distance_meters)} km · ~
                {formatDuration(w.estimated_duration_seconds)} · avg{' '}
                {formatPace(w.target_avg_pace_sec)}
              </div>
              <div className="mt-3">
                <SegmentBar segments={w.segments} />
              </div>
            </button>
          );
        })}
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
