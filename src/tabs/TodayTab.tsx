import { useMemo, useState } from 'react';
import { RefreshCw, ArrowRight, Heart, Check, ChevronRight, Plus } from 'lucide-react';
import { useStore, useCurrentWeek } from '../state/store';
import { SegmentBar } from '../components/SegmentBar';
import { WorkoutSheet } from '../components/WorkoutSheet';
import { RunSheet } from '../components/RunSheet';
import { ComplianceBadgePill } from '../components/Badge';
import { ProgressRing } from '../components/ProgressRing';
import { TypeChip } from '../components/TypeChip';
import { heroBackground, typeAccent, hexA } from '../components/ui';
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
import type { ComplianceBadge, PlannedWorkout, WeekPhase } from '../types';

const phaseColor = (p: WeekPhase): string =>
  p === 'Peak' ? '#22D3EE' : p === 'Taper' ? '#7B8CFF' : p === 'Deload' ? '#FBBF24' : p.startsWith('Build') ? '#A855F7' : '#3B82F6';

export function TodayTab() {
  const { workouts, synced, profile, totalWeeks, syncing, syncHealth, markComplete, reschedule, relink, addManualRun, logRunForWorkout, updateRun, deleteRun } =
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
  const runsDone = weekWorkouts.filter((w) => w.completed).length;
  const phaseLabel = weekWorkouts[0]?.phase ?? 'Base';
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekMon, i));

  const heroWorkout = (byDate.get(selDate) ?? [])[0] ?? null;
  const selRuns = synced.filter((r) => r.local_date === selDate);
  const recentRuns = [...synced].sort((a, b) => b.local_date.localeCompare(a.local_date)).slice(0, 3);

  const sheetWorkout = workouts.find((w) => w.id === sheetId) ?? null;
  const sheetWeekRuns = sheetWorkout
    ? synced.filter((r) => weekStartMonday(r.local_date) === weekStartMonday(sheetWorkout.date))
    : [];
  const sheetRun = synced.find((r) => r.external_id === runId) ?? null;
  const sheetRunMatched = sheetRun?.matched_workout_id
    ? workouts.find((w) => w.id === sheetRun.matched_workout_id) ?? null
    : null;

  function badgeFor(run: (typeof synced)[number]): ComplianceBadge {
    if (!run.matched_workout_id) return 'unplanned';
    const w = workouts.find((x) => x.id === run.matched_workout_id);
    return w ? evaluateCompliance(run, w).badge : 'unplanned';
  }

  const isSelToday = selDate === today;
  const accent = heroWorkout ? typeAccent[heroWorkout.type] : '#7B8CFF';
  const pc = phaseColor(phaseLabel);

  return (
    <div className="safe-top px-5 pb-nav">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wider text-dim">This week</div>
        <button
          onClick={() => void syncHealth()}
          className="press flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold"
          style={{ border: '1px solid #272734' }}
        >
          <RefreshCw size={13} className={syncing ? 'spin text-mint' : 'text-mint'} />
          {syncing ? 'Syncing' : 'Sync Health'}
        </button>
      </div>

      {/* Week calendar */}
      <div className="mt-3 grid grid-cols-7 gap-1.5">
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
              className="press flex flex-col items-center gap-1.5 rounded-2xl py-2.5"
              style={{
                background: isSel ? 'rgba(123,140,255,0.16)' : ws.length ? '#16161F' : 'transparent',
                border: isSel ? '1px solid #7B8CFF' : '1px solid #272734',
              }}
            >
              <span className="text-[9px] font-bold uppercase text-dim">{dayName(i)}</span>
              <span className="tabular text-base font-extrabold leading-none" style={{ color: isToday ? '#7B8CFF' : '#fff' }}>
                {Number(date.slice(8, 10))}
              </span>
              {done ? (
                <span className="grid h-3.5 w-3.5 place-items-center rounded-full" style={{ background: w0 ? typeAccent[w0.type] : '#7B8CFF' }}>
                  <Check size={9} strokeWidth={4} color="#0A0A12" />
                </span>
              ) : (
                <span className="h-2 w-2 rounded-full" style={{ background: w0 ? typeAccent[w0.type] : runs.length ? '#22D3EE' : 'transparent' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Current stage widget */}
      <div className="rise card mt-4 flex items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ color: pc, background: hexA(pc, 0.15) }}>
              {phaseLabel} Phase
            </span>
            {profile.raceType !== 'Road' && (
              <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ color: '#FB923C', background: 'rgba(251,146,60,0.15)' }}>
                {profile.raceType}
              </span>
            )}
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight">Week {displayWeek}</span>
            <span className="text-sm font-semibold text-dim">of {totalWeeks}</span>
          </div>
          <div className="mt-0.5 text-xs text-dim">
            {weeksToGoal} {weeksToGoal === 1 ? 'week' : 'weeks'} to race · {runsDone}/{weekWorkouts.length} done
          </div>
        </div>
        <ProgressRing value={plannedKm ? completedKm / plannedKm : 0} size={70} stroke={7}>
          <div className="text-center leading-none">
            <div className="tabular text-base font-extrabold">{completedKm.toFixed(0)}</div>
            <div className="text-[9px] text-dim">/{plannedKm.toFixed(0)} km</div>
          </div>
        </ProgressRing>
      </div>

      {/* Session hero */}
      <div className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-dim">
        {isSelToday ? "Today's session" : 'Session'} ·{' '}
        {parseISODate(selDate).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
      </div>

      {heroWorkout ? (
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-6 -z-10"
            style={{ background: `radial-gradient(55% 45% at 50% 25%, ${hexA(accent, 0.28)}, transparent 70%)`, filter: 'blur(28px)' }}
          />
          <button onClick={() => setSheetId(heroWorkout.id)} className="press card block w-full overflow-hidden p-5 text-left" style={heroBackground(heroWorkout.type)}>
            <div className="flex items-center justify-between">
              <TypeChip type={heroWorkout.type} solid />
              {heroWorkout.completed && (
                <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: accent, background: hexA(accent, 0.15) }}>
                  <Check size={12} strokeWidth={3} /> Done
                </span>
              )}
            </div>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight">{heroWorkout.title}</h2>
            <div className="mt-4 flex items-end gap-1">
              <span className="tabular text-7xl font-extrabold tracking-tighter">{metersToKm(heroWorkout.target_distance_meters)}</span>
              <span className="pb-2 text-xl font-bold text-dim">km</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/60">
              <span className="tabular">~{formatDuration(heroWorkout.estimated_duration_seconds)}</span>
              <span className="tabular">avg {formatPace(heroWorkout.target_avg_pace_sec)}</span>
              {heroWorkout.elevation_gain_m > 0 && <span className="tabular">↑{heroWorkout.elevation_gain_m} m</span>}
            </div>
            <div className="mt-4">
              <SegmentBar segments={heroWorkout.segments} height={12} />
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm font-semibold" style={{ color: accent }}>
              View workout details <ArrowRight size={15} />
            </div>
          </button>
        </div>
      ) : (
        <div className="card p-6 text-center text-white/50">
          Rest day — recover, stretch and refuel. 💤
          {selRuns.length > 0 && (
            <button onClick={() => setRunId(selRuns[0].external_id)} className="press mt-2 block w-full text-sm text-cyan">
              You logged {metersToKm(selRuns[0].distance_meters)} km — view it →
            </button>
          )}
        </div>
      )}

      {/* Recent runs (tap for detail) */}
      <div className="mb-2 mt-7 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-dim">Recent runs</span>
        <button onClick={() => setShowAdd((v) => !v)} className="press flex items-center gap-1 text-xs font-semibold text-mint">
          <Plus size={14} /> Log a run
        </button>
      </div>
      {showAdd && (
        <div className="card mb-3 p-4">
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-dim">
              Distance (km)
              <input value={addKm} onChange={(e) => setAddKm(e.target.value)} inputMode="decimal" placeholder="6.12" className="mt-1 w-full rounded-xl bg-bg px-3 py-2.5 text-sm" style={{ border: '1px solid #272734' }} />
            </label>
            <label className="text-xs text-dim">
              Minutes
              <input value={addMin} onChange={(e) => setAddMin(e.target.value)} inputMode="numeric" placeholder="34" className="mt-1 w-full rounded-xl bg-bg px-3 py-2.5 text-sm" style={{ border: '1px solid #272734' }} />
            </label>
            <label className="text-xs text-dim">
              Seconds
              <input value={addSec} onChange={(e) => setAddSec(e.target.value)} inputMode="numeric" placeholder="20" className="mt-1 w-full rounded-xl bg-bg px-3 py-2.5 text-sm" style={{ border: '1px solid #272734' }} />
            </label>
          </div>
          <label className="mt-3 block text-xs text-dim">
            Date
            <input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} className="mt-1 w-full rounded-xl bg-bg px-3 py-2.5 text-sm" style={{ border: '1px solid #272734' }} />
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
            className="press mt-3 w-full rounded-xl py-2.5 text-sm font-bold text-black"
            style={{ background: 'linear-gradient(135deg,#6366F1,#A855F7)' }}
          >
            Log run
          </button>
        </div>
      )}
      {recentRuns.length === 0 ? (
        <div className="card p-5 text-sm text-white/40">
          No runs synced yet. Record in Strava, or try “Simulate run” in Setup.
        </div>
      ) : (
        <div className="space-y-2">
          {recentRuns.map((r, i) => (
            <button
              key={r.external_id}
              onClick={() => setRunId(r.external_id)}
              className="press rise card flex w-full items-center justify-between p-4 text-left"
              style={{ animationDelay: `${i * 40}ms` }}
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
              <div className="flex items-center gap-2">
                <ComplianceBadgePill badge={badgeFor(r)} />
                <ChevronRight size={16} className="text-white/30" />
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
