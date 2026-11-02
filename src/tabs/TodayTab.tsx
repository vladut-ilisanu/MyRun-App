import { useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronRight, Plus } from 'lucide-react';
import { useStore, useCurrentWeek } from '../state/store';
import { SegmentBar } from '../components/SegmentBar';
import { WorkoutSheet } from '../components/WorkoutSheet';
import { RunSheet } from '../components/RunSheet';
import { ComplianceBadgePill } from '../components/Badge';
import { TypeChip } from '../components/TypeChip';
import { heroBackground, typeAccent } from '../components/ui';
import {
  formatDuration,
  formatPace,
  metersToKm,
  toISODate,
  weekStartMonday,
  daysBetween,
  addDays,
  dayName,
  parseISODate,
} from '../lib/format';
import { evaluateCompliance, movingPaceSecPerKm } from '../lib/workoutMatcher';
import type { ComplianceBadge, PlannedWorkout, SyncedWorkout, WorkoutSegment } from '../types';

/** Reps-or-time stat shown as the third metric on the focus card. */
function thirdStat(w: PlannedWorkout): { value: string; label: string } {
  const rep = w.segments.find((s: WorkoutSegment) => (s.reps ?? 0) > 1);
  if (rep?.reps) {
    const d = rep.rep_distance_meters ?? 0;
    const dist = d >= 1000 ? `${d / 1000}k` : `${d}m`;
    return { value: String(rep.reps), label: `× ${dist}` };
  }
  return { value: formatDuration(w.estimated_duration_seconds), label: 'time' };
}

export function TodayTab() {
  const { workouts, synced, profile, totalWeeks, markComplete, reschedule, relink, addManualRun, logRunForWorkout, updateRun, deleteRun } =
    useStore();
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addKm, setAddKm] = useState('');
  const [addMin, setAddMin] = useState('');
  const [addSec, setAddSec] = useState('');
  const [addDate, setAddDate] = useState(toISODate(new Date()));

  const today = toISODate(new Date());
  const currentWeek = useCurrentWeek(workouts);

  const byDate = useMemo(() => {
    const m = new Map<string, PlannedWorkout[]>();
    for (const w of workouts) (m.get(w.date) ?? m.set(w.date, []).get(w.date)!).push(w);
    return m;
  }, [workouts]);

  const defaultDay = useMemo(() => {
    if (byDate.get(today)?.length) return today;
    const next = [...workouts].sort((a, b) => a.date.localeCompare(b.date)).find((w) => w.date >= today);
    return next?.date ?? today;
  }, [byDate, workouts, today]);
  const [selDate, setSelDate] = useState<string>(defaultDay);

  const weekMon = weekStartMonday(selDate);
  const weekWorkouts = workouts.filter((w) => weekStartMonday(w.date) === weekMon);
  const displayWeek = weekWorkouts[0]?.week ?? currentWeek;
  const weeksToGoal = Math.max(0, Math.ceil(daysBetween(today, profile.goalRaceDate) / 7));

  const plannedKm = weekWorkouts.reduce((s, w) => s + w.target_distance_meters, 0) / 1000;
  const completedKm =
    weekWorkouts.filter((w) => w.completed).reduce((s, w) => s + w.target_distance_meters, 0) / 1000;
  const sessions = weekWorkouts.filter((w) => w.type !== 'REST');
  const runsDone = sessions.filter((w) => w.completed).length;
  const phaseLabel = weekWorkouts[0]?.phase ?? 'Base';
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekMon, i));
  const weekPct = plannedKm ? Math.min(100, Math.round((completedKm / plannedKm) * 100)) : 0;

  const heroWorkout = (byDate.get(selDate) ?? [])[0] ?? null;
  const recentRuns = [...synced].sort((a, b) => b.local_date.localeCompare(a.local_date)).slice(0, 4);

  const sheetWorkout = workouts.find((w) => w.id === sheetId) ?? null;
  const sheetWeekRuns = sheetWorkout
    ? synced.filter((r) => weekStartMonday(r.local_date) === weekStartMonday(sheetWorkout.date))
    : [];
  const sheetRun = synced.find((r) => r.external_id === runId) ?? null;
  const sheetRunMatched = sheetRun?.matched_workout_id
    ? workouts.find((w) => w.id === sheetRun.matched_workout_id) ?? null
    : null;

  function badgeFor(run: SyncedWorkout): ComplianceBadge {
    if (!run.matched_workout_id) return 'unplanned';
    const w = workouts.find((x) => x.id === run.matched_workout_id);
    return w ? evaluateCompliance(run, w).badge : 'unplanned';
  }

  const isSelToday = selDate === today;
  const accent = heroWorkout ? typeAccent[heroWorkout.type] : '#7B8CFF';
  const heroRun = heroWorkout?.matched_synced_id
    ? synced.find((r) => r.external_id === heroWorkout.matched_synced_id) ?? null
    : null;
  const dayTitle = isSelToday
    ? 'Today'
    : parseISODate(selDate).toLocaleDateString(undefined, { weekday: 'long' });

  return (
    <div className="safe-top px-5 pb-nav">
      {/* Header — week context + day */}
      <div className="rise">
        <div className="overline">
          Week {displayWeek} of {totalWeeks} · {phaseLabel}
        </div>
        <div className="mt-1 flex items-end justify-between">
          <h1 className="text-[2rem] font-extrabold leading-none tracking-tight">{dayTitle}</h1>
          <span className="pb-0.5 text-sm font-medium text-dim">
            {parseISODate(selDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
          </span>
        </div>
      </div>

      {/* Week strip */}
      <div className="rise mt-5 grid grid-cols-7 gap-1.5" style={{ animationDelay: '40ms' }}>
        {weekDays.map((date, i) => {
          const ws = byDate.get(date) ?? [];
          const runs = synced.filter((r) => r.local_date === date);
          const w0 = ws[0];
          const isToday = date === today;
          const isSel = date === selDate;
          const done = ws.length > 0 && ws.every((w) => w.completed);
          return (
            <button
              key={date}
              onClick={() => setSelDate(date)}
              className="press flex flex-col items-center gap-1.5 rounded-2xl py-2.5 transition-colors"
              style={{
                background: isSel ? 'rgba(123,140,255,0.14)' : 'transparent',
                border: isSel ? '1px solid rgba(123,140,255,0.55)' : '1px solid transparent',
              }}
            >
              <span className="text-[9px] font-bold uppercase tracking-wide text-dim">{dayName(i)}</span>
              <span
                className="tabular text-base font-bold leading-none"
                style={{ color: isToday ? '#7B8CFF' : isSel ? '#fff' : '#C9C9D2' }}
              >
                {Number(date.slice(8, 10))}
              </span>
              {done ? (
                <span className="grid h-3.5 w-3.5 place-items-center rounded-full" style={{ background: w0 ? typeAccent[w0.type] : '#7B8CFF' }}>
                  <Check size={9} strokeWidth={4} color="#0A0A12" />
                </span>
              ) : (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: w0 ? typeAccent[w0.type] : runs.length ? '#5BC2D8' : 'rgba(255,255,255,0.12)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Week progress — one slim, honest bar */}
      <div className="rise mt-5" style={{ animationDelay: '80ms' }}>
        <div className="flex items-baseline justify-between text-xs">
          <span className="overline">This week</span>
          <span className="tabular text-dim">
            {runsDone}/{sessions.length} sessions · {completedKm.toFixed(0)}/{plannedKm.toFixed(0)} km
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${weekPct}%`, background: '#7B8CFF' }} />
        </div>
        <div className="mt-1.5 text-[11px] text-dim">
          {weeksToGoal} {weeksToGoal === 1 ? 'week' : 'weeks'} to {profile.goalRaceName}
        </div>
      </div>

      {/* Focus card — the one thing that matters for the selected day */}
      <div className="rise mt-6" style={{ animationDelay: '120ms' }}>
        {heroWorkout ? (
          heroWorkout.type === 'REST' ? (
            <div className="card p-6 text-center">
              <div className="text-sm font-semibold text-white/80">Rest day</div>
              <div className="mt-1 text-sm text-dim">Recover, stretch and refuel. Adaptation happens on rest.</div>
            </div>
          ) : (
            <>
              <button
                onClick={() => setSheetId(heroWorkout.id)}
                className="press block w-full overflow-hidden rounded-[1.25rem] p-5 text-left"
                style={{ ...heroBackground(heroWorkout.type), border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center justify-between">
                  <TypeChip type={heroWorkout.type} solid />
                  {heroWorkout.completed && (
                    <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: accent, background: 'rgba(255,255,255,0.08)' }}>
                      <Check size={12} strokeWidth={3} /> Done
                    </span>
                  )}
                </div>

                <h2 className="mt-4 text-2xl font-extrabold leading-tight">{heroWorkout.title}</h2>

                {/* Big metrics */}
                {heroWorkout.completed && heroRun ? (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Stat value={metersToKm(heroRun.distance_meters)} unit="km" label="logged" />
                    <Stat value={formatPace(movingPaceSecPerKm(heroRun.duration_seconds, heroRun.distance_meters)).replace('/km', '')} unit="/km" label="avg pace" />
                    <Stat value={formatDuration(heroRun.duration_seconds)} label="time" />
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Stat value={metersToKm(heroWorkout.target_distance_meters)} unit="km" label="distance" />
                    <Stat value={formatPace(heroWorkout.target_avg_pace_sec).replace('/km', '')} unit="/km" label="target pace" />
                    <Stat value={thirdStat(heroWorkout).value} label={thirdStat(heroWorkout).label} />
                  </div>
                )}

                <div className="mt-4">
                  <SegmentBar segments={heroWorkout.segments} height={10} />
                </div>

                <div className="mt-4 flex items-center justify-between text-sm text-dim">
                  <span className="tabular">~{formatDuration(heroWorkout.estimated_duration_seconds)}</span>
                  <span className="flex items-center gap-1 font-semibold" style={{ color: accent }}>
                    Details <ArrowRight size={15} />
                  </span>
                </div>
              </button>

              <button
                onClick={() => setSheetId(heroWorkout.id)}
                className="btn-primary press mt-3 flex w-full items-center justify-center gap-2 py-3.5 text-sm"
              >
                {heroWorkout.completed ? 'Edit logged run' : 'Log this run'}
              </button>
            </>
          )
        ) : (
          <div className="card p-6 text-center text-sm text-dim">No session scheduled for this day.</div>
        )}
      </div>

      {/* Recent runs */}
      <div className="mb-3 mt-8 flex items-center justify-between">
        <span className="overline">Recent runs</span>
        <button onClick={() => setShowAdd((v) => !v)} className="press flex items-center gap-1 text-xs font-semibold" style={{ color: '#7B8CFF' }}>
          <Plus size={14} /> Log a run
        </button>
      </div>

      {showAdd && (
        <div className="card mb-3 p-4">
          <div className="grid grid-cols-3 gap-2">
            <label className="overline font-medium normal-case tracking-normal text-dim">
              Distance (km)
              <input value={addKm} onChange={(e) => setAddKm(e.target.value)} inputMode="decimal" placeholder="6.24" className="mt-1 w-full rounded-xl bg-bg px-3 py-2.5 text-sm text-white" style={{ border: '1px solid #272734' }} />
            </label>
            <label className="overline font-medium normal-case tracking-normal text-dim">
              Minutes
              <input value={addMin} onChange={(e) => setAddMin(e.target.value)} inputMode="numeric" placeholder="34" className="mt-1 w-full rounded-xl bg-bg px-3 py-2.5 text-sm text-white" style={{ border: '1px solid #272734' }} />
            </label>
            <label className="overline font-medium normal-case tracking-normal text-dim">
              Seconds
              <input value={addSec} onChange={(e) => setAddSec(e.target.value)} inputMode="numeric" placeholder="20" className="mt-1 w-full rounded-xl bg-bg px-3 py-2.5 text-sm text-white" style={{ border: '1px solid #272734' }} />
            </label>
          </div>
          <label className="overline mt-3 block font-medium normal-case tracking-normal text-dim">
            Date
            <input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} className="mt-1 w-full rounded-xl bg-bg px-3 py-2.5 text-sm text-white" style={{ border: '1px solid #272734' }} />
          </label>
          <button
            onClick={() => {
              const km = Number(String(addKm).replace(',', '.'));
              const sec = Math.round((Number(addMin) || 0) * 60 + (Number(addSec) || 0));
              if (km > 0 && sec > 0) {
                addManualRun(km, sec, addDate);
                setShowAdd(false);
                setAddKm('');
                setAddMin('');
                setAddSec('');
              }
            }}
            className="btn-primary press mt-3 w-full py-3 text-sm"
          >
            Log run
          </button>
        </div>
      )}

      {recentRuns.length === 0 ? (
        <div className="card p-6 text-center text-sm text-dim">
          No runs logged yet. Tap <span className="font-semibold text-white/80">Log a run</span> after your next run.
        </div>
      ) : (
        <div className="space-y-2">
          {recentRuns.map((r, i) => (
            <button
              key={r.external_id}
              onClick={() => setRunId(r.external_id)}
              className="press card flex w-full items-center justify-between p-4 text-left"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="tabular text-lg font-extrabold">{metersToKm(r.distance_meters)}</span>
                  <span className="text-xs font-semibold text-dim">km</span>
                  <span className="tabular ml-1.5 text-sm text-white/55">
                    {formatPace(movingPaceSecPerKm(r.duration_seconds, r.distance_meters))}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-dim">
                  <span className="tabular">{r.local_date}</span>
                  <span className="tabular">{formatDuration(r.duration_seconds)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ComplianceBadgePill badge={badgeFor(r)} />
                <ChevronRight size={16} className="text-white/25" />
              </div>
            </button>
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
          onReschedule={(dateISO) => reschedule(sheetWorkout.id, dateISO)}
          onLogRun={(km, sec) => {
            logRunForWorkout(sheetWorkout.id, km, sec);
            setSheetId(null);
          }}
        />
      )}
      {sheetRun && (
        <RunSheet
          run={sheetRun}
          matched={sheetRunMatched}
          onClose={() => setRunId(null)}
          onUpdate={(km, sec, d) => updateRun(sheetRun.external_id, km, sec, d)}
          onDelete={() => {
            deleteRun(sheetRun.external_id);
            setRunId(null);
          }}
        />
      )}
    </div>
  );
}

/** A big metric cell for the focus card: value (+unit) over a small label. */
function Stat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div className="rounded-2xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div className="flex items-baseline gap-0.5">
        <span className="display text-2xl">{value}</span>
        {unit && <span className="text-xs font-semibold text-dim">{unit}</span>}
      </div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-dim">{label}</div>
    </div>
  );
}
