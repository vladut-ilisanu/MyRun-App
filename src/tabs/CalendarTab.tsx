import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useStore } from '../state/store';
import { WorkoutSheet } from '../components/WorkoutSheet';
import { SegmentBar } from '../components/SegmentBar';
import { TypeChip } from '../components/TypeChip';
import { typeAccent } from '../components/ui';
import {
  toISODate,
  metersToKm,
  formatDuration,
  formatPace,
  weekStartMonday,
  mondayIndex,
} from '../lib/format';
import { movingPaceSecPerKm } from '../lib/workoutMatcher';
import type { PlannedWorkout, SyncedWorkout } from '../types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function CalendarTab() {
  const { workouts, synced, markComplete, relink, reschedule } = useStore();
  const today = toISODate(new Date());

  // Default the calendar to the month of the first workout (or today).
  const firstWorkoutDate = useMemo(
    () => [...workouts].sort((a, b) => a.date.localeCompare(b.date))[0]?.date ?? today,
    [workouts, today]
  );
  const init = new Date(firstWorkoutDate);
  const [year, setYear] = useState(init.getFullYear());
  const [month, setMonth] = useState(init.getMonth());
  const [selected, setSelected] = useState<string>(firstWorkoutDate);
  const [sheetId, setSheetId] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const m = new Map<string, PlannedWorkout[]>();
    for (const w of workouts) {
      const list = m.get(w.date) ?? [];
      list.push(w);
      m.set(w.date, list);
    }
    return m;
  }, [workouts]);

  const runsByDate = useMemo(() => {
    const m = new Map<string, SyncedWorkout[]>();
    for (const r of synced) {
      const list = m.get(r.local_date) ?? [];
      list.push(r);
      m.set(r.local_date, list);
    }
    return m;
  }, [synced]);

  // Build the month grid (Mon–Sun rows).
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const offset = mondayIndex(first);
    const start = new Date(year, month, 1 - offset);
    const out: { date: string; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      out.push({ date: toISODate(d), inMonth: d.getMonth() === month });
      if (i >= 34 && d.getMonth() !== month && mondayIndex(d) === 6) break;
    }
    return out;
  }, [year, month]);

  const prevMonth = () => {
    const d = new Date(year, month - 1, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };
  const nextMonth = () => {
    const d = new Date(year, month + 1, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const dayWorkouts = byDate.get(selected) ?? [];
  const dayRuns = runsByDate.get(selected) ?? [];

  const sheetWorkout = workouts.find((w) => w.id === sheetId) ?? null;
  const sheetWeekRuns = sheetWorkout
    ? synced.filter((r) => weekStartMonday(r.local_date) === weekStartMonday(sheetWorkout.date))
    : [];

  return (
    <div className="safe-top px-5 pb-nav">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Calendar</h1>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="press grid h-9 w-9 place-items-center rounded-full bg-card" style={{ border: '1px solid #272734' }}>
            <ChevronLeft size={18} />
          </button>
          <button onClick={nextMonth} className="press grid h-9 w-9 place-items-center rounded-full bg-card" style={{ border: '1px solid #272734' }}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="mt-1 text-sm font-semibold text-dim">
        {MONTHS[month]} {year}
      </div>

      {/* Grid */}
      <div className="mt-4 grid grid-cols-7 gap-1">
        {DOW.map((d, i) => (
          <div key={i} className="pb-1 text-center text-[10px] font-bold uppercase text-dim">
            {d}
          </div>
        ))}
        {cells.map(({ date, inMonth }) => {
          const ws = byDate.get(date) ?? [];
          const runs = runsByDate.get(date) ?? [];
          const isToday = date === today;
          const isSel = date === selected;
          const dayNum = Number(date.slice(8, 10));
          const hasRace = ws.some((w) => w.type === 'RACE');
          return (
            <button
              key={date}
              onClick={() => setSelected(date)}
              className="press relative flex aspect-square flex-col items-center justify-start rounded-xl pt-1.5"
              style={{
                background: isSel ? 'rgba(123,140,255,0.16)' : ws.length ? '#16161F' : 'transparent',
                border: isSel ? '1px solid #7B8CFF' : hasRace ? '1px solid #FFD166' : '1px solid transparent',
                opacity: inMonth ? 1 : 0.35,
              }}
            >
              <span
                className="tabular text-xs font-semibold"
                style={{ color: isToday ? '#7B8CFF' : '#fff' }}
              >
                {dayNum}
              </span>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-0.5 px-0.5">
                {ws.slice(0, 3).map((w) =>
                  w.completed ? (
                    <span
                      key={w.id}
                      className="grid h-2.5 w-2.5 place-items-center rounded-full"
                      style={{ background: typeAccent[w.type] }}
                    >
                      <Check size={7} strokeWidth={4} color="#0A0A12" />
                    </span>
                  ) : (
                    <span
                      key={w.id}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: typeAccent[w.type], opacity: 0.85 }}
                    />
                  )
                )}
                {runs.length > 0 && ws.length === 0 && (
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#22D3EE' }} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-dim">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-mint" /> Scheduled</span>
        <span className="flex items-center gap-1">
          <span className="grid h-3 w-3 place-items-center rounded-full bg-mint"><Check size={7} strokeWidth={4} color="#0A0A12" /></span> Completed
        </span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyan" /> Logged run</span>
      </div>

      {/* Selected day detail */}
      <div className="mt-6 text-xs font-bold uppercase tracking-wider text-dim">
        {new Date(selected).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>

      {dayWorkouts.length === 0 && dayRuns.length === 0 ? (
        <div className="card mt-2 p-5 text-sm text-white/40">Rest day — recover and refuel.</div>
      ) : (
        <div className="mt-2 space-y-3">
          {dayWorkouts.map((w) => (
            <button key={w.id} onClick={() => setSheetId(w.id)} className="press card block w-full p-4 text-left">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold">{w.title}</h3>
                <div className="flex items-center gap-2">
                  {w.completed && (
                    <span className="grid h-5 w-5 place-items-center rounded-full" style={{ background: typeAccent[w.type] }}>
                      <Check size={13} strokeWidth={3} color="#0A0A12" />
                    </span>
                  )}
                  <TypeChip type={w.type} />
                </div>
              </div>
              <div className="tabular mt-0.5 text-xs text-dim">
                {metersToKm(w.target_distance_meters)} km · ~{formatDuration(w.estimated_duration_seconds)} · avg {formatPace(w.target_avg_pace_sec)}
                {w.elevation_gain_m > 0 ? ` · ↑${w.elevation_gain_m} m` : ''}
              </div>
              <div className="mt-3">
                <SegmentBar segments={w.segments} />
              </div>
            </button>
          ))}
          {dayRuns.map((r) => (
            <div key={r.external_id} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-cyan">Logged run</span>
                <span className="tabular text-sm text-dim">
                  {metersToKm(r.distance_meters)} km · {formatPace(movingPaceSecPerKm(r.duration_seconds, r.distance_meters))}
                </span>
              </div>
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
          onReschedule={(dateISO) => {
            reschedule(sheetWorkout.id, dateISO);
            setSelected(dateISO);
          }}
        />
      )}
    </div>
  );
}
