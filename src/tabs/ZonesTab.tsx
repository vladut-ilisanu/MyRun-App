import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { RunCharts } from '../components/RunCharts';
import { formatFinishTime, formatPaceRange, weekStartMonday } from '../lib/format';
import type { PaceZone } from '../types';

const zoneColor: Record<PaceZone['key'], string> = {
  recovery: '#5B5B67',
  easy: '#3B82F6',
  long_base: '#22D3EE',
  marathon_pace: '#7B8CFF',
  tempo: '#FBBF24',
  interval: '#A855F7',
};

const HARD_SEGMENTS = new Set(['tempo', 'interval', 'hill', 'mp_block']);

export function ZonesTab() {
  const { paces, vdot, workouts, synced, profile } = useStore();
  const [selWeek, setSelWeek] = useState<number | null>(null);
  const [selElevWeek, setSelElevWeek] = useState<number | null>(null);

  const weekMondays = useMemo(() => {
    const m = new Map<number, string>();
    for (const w of workouts) if (!m.has(w.week)) m.set(w.week, weekStartMonday(w.date));
    return m;
  }, [workouts]);

  const totalWeeks = workouts.length ? Math.max(...workouts.map((w) => w.week)) : 0;
  const isTrail = profile.raceType !== 'Road';

  const chart = useMemo(() => {
    const rows: { week: number; planned: number; actual: number; elevation: number }[] = [];
    for (let week = 1; week <= totalWeeks; week++) {
      const wk = workouts.filter((w) => w.week === week);
      const planned = wk.reduce((s, w) => s + w.target_distance_meters, 0) / 1000;
      const elevation = wk.reduce((s, w) => s + w.elevation_gain_m, 0);
      const monday = weekMondays.get(week);
      const actual = monday
        ? synced.filter((r) => weekStartMonday(r.local_date) === monday).reduce((s, r) => s + r.distance_meters, 0) / 1000
        : 0;
      rows.push({ week, planned, actual, elevation });
    }
    return rows;
  }, [workouts, synced, totalWeeks, weekMondays]);

  const maxKm = Math.max(1, ...chart.map((r) => Math.max(r.planned, r.actual)));
  const maxElev = Math.max(1, ...chart.map((r) => r.elevation));

  // 80/20 intensity split from segment distances.
  const intensity = useMemo(() => {
    let easy = 0;
    let hard = 0;
    for (const w of workouts)
      for (const s of w.segments) {
        if (HARD_SEGMENTS.has(s.type)) hard += s.distance_meters;
        else easy += s.distance_meters;
      }
    const total = easy + hard || 1;
    return { easyPct: Math.round((easy / total) * 100), hardPct: Math.round((hard / total) * 100) };
  }, [workouts]);

  const equivalents = [
    { label: '5K', time: paces.predicted['5K'] },
    { label: '10K', time: paces.predicted['10K'] },
    { label: 'Half', time: paces.predicted['Half Marathon'] },
  ];

  const sel = selWeek ? chart.find((r) => r.week === selWeek) : null;
  const selElev = selElevWeek ? chart.find((r) => r.week === selElevWeek) : null;

  // Live progress vs plan (uses actually-logged runs).
  const progress = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const firstDate = workouts.length
      ? [...workouts].sort((a, b) => a.date.localeCompare(b.date))[0].date
      : today;
    const notStarted = today < firstDate;
    const due = workouts.filter((w) => w.date <= today && w.type !== 'RACE');
    const plannedToDate = due.reduce((s, w) => s + w.target_distance_meters, 0) / 1000;
    const completed = due.filter((w) => w.completed).length;
    const actualTotal = synced.reduce((s, r) => s + r.distance_meters, 0) / 1000;
    const onTrack = plannedToDate > 0 ? Math.round((actualTotal / plannedToDate) * 100) : 0;
    return { plannedToDate, actualTotal, completed, due: due.length, onTrack, notStarted, firstDate };
  }, [workouts, synced]);

  return (
    <div className="safe-top px-5 pb-nav">
      <h1 className="text-3xl font-extrabold tracking-tight">Stats</h1>

      {/* Live progress vs plan */}
      <div className="rise card mt-4 p-4">
        {progress.notStarted ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Progress vs plan</span>
              <span className="rounded-full bg-mint/10 px-2.5 py-0.5 text-xs font-bold text-mint">
                Starts soon
              </span>
            </div>
            <div className="mt-2 text-sm text-dim">
              Your plan begins{' '}
              <b className="text-white">
                {new Date(progress.firstDate).toLocaleDateString(undefined, {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </b>
              . Logged runs and on-track progress will appear here as you train.
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Progress vs plan</span>
              <span
                className="tabular rounded-full px-2.5 py-0.5 text-xs font-bold"
                style={{
                  color: progress.onTrack >= 90 ? '#7B8CFF' : progress.onTrack >= 60 ? '#FBBF24' : '#8C8C9E',
                  background: progress.onTrack >= 90 ? 'rgba(123,140,255,0.14)' : progress.onTrack >= 60 ? 'rgba(251,191,36,0.14)' : 'rgba(140,140,158,0.14)',
                }}
              >
                {progress.onTrack}% on track
              </span>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, progress.onTrack)}%`, background: 'linear-gradient(90deg,#6366F1,#A855F7)' }} />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-dim">
              <span className="tabular">{progress.actualTotal.toFixed(0)} km logged</span>
              <span className="tabular">{progress.completed}/{progress.due} sessions done</span>
              <span className="tabular">{progress.plannedToDate.toFixed(0)} km planned</span>
            </div>
          </>
        )}
      </div>

      {/* VDOT + predicted */}
      <div className="rise mt-5 grid grid-cols-2 gap-3">
        <div className="card relative overflow-hidden p-5">
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 100% at 0% 0%, rgba(123,140,255,0.18), rgba(10,10,18,0) 70%)' }} />
          <div className="relative text-[11px] font-medium uppercase tracking-wider text-dim">VDOT</div>
          <div className="relative mt-1 tabular text-5xl font-extrabold gradient-text">{vdot.toFixed(1)}</div>
          <div className="relative mt-1 text-[11px] text-dim">Daniels fitness score</div>
        </div>
        <div className="card p-5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-dim">Marathon</div>
          <div className="mt-1 tabular text-4xl font-extrabold">{formatFinishTime(paces.predicted.Marathon)}</div>
          <div className="mt-1 text-[11px] text-dim">predicted · current fitness</div>
        </div>
      </div>

      {/* Equivalent race times */}
      <div className="rise mt-3 grid grid-cols-3 gap-3" style={{ animationDelay: '60ms' }}>
        {equivalents.map((e) => (
          <div key={e.label} className="card p-3 text-center">
            <div className="tabular text-lg font-extrabold leading-tight">{formatFinishTime(e.time)}</div>
            <div className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-dim">{e.label}</div>
          </div>
        ))}
      </div>

      {/* Your logged runs */}
      <h2 className="mb-2 mt-7 text-xs font-bold uppercase tracking-wider text-dim">Your runs</h2>
      <RunCharts synced={synced} />

      {/* Intensity distribution (80/20) */}
      <h2 className="mb-2 mt-7 text-xs font-bold uppercase tracking-wider text-dim">Training intensity · 80/20</h2>
      <div className="card p-4">
        <div className="flex h-5 w-full overflow-hidden rounded-full" style={{ background: '#0c0c14', gap: 2, padding: 2 }}>
          <div className="rounded-l-full" style={{ width: `${intensity.easyPct}%`, background: '#3B82F6' }} />
          <div className="rounded-r-full" style={{ width: `${intensity.hardPct}%`, background: '#FBBF24' }} />
        </div>
        <div className="mt-3 flex justify-between text-sm">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#3B82F6' }} />
            <span className="font-bold">{intensity.easyPct}%</span>
            <span className="text-dim">easy</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#FBBF24' }} />
            <span className="font-bold">{intensity.hardPct}%</span>
            <span className="text-dim">quality</span>
          </span>
        </div>
        <p className="mt-2 text-[11px] text-dim">
          Polarized training: most volume easy, a focused slice hard — the 80/20 split proven to build endurance with low injury risk.
        </p>
      </div>

      {/* Pace zones */}
      <h2 className="mb-2 mt-7 text-xs font-bold uppercase tracking-wider text-dim">Training pace zones</h2>
      <div className="card divide-y divide-border overflow-hidden">
        {paces.zones.map((z) => (
          <div key={z.key} className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ background: zoneColor[z.key], boxShadow: `0 0 10px -1px ${zoneColor[z.key]}` }} />
              <span className="text-sm font-semibold">{z.label}</span>
            </div>
            <span className="tabular rounded-lg bg-bg px-2.5 py-1 text-sm font-semibold" style={{ color: zoneColor[z.key] }}>
              {formatPaceRange(z.min_sec, z.max_sec)}
            </span>
          </div>
        ))}
      </div>
      {(() => {
        const easy = paces.zones.find((z) => z.key === 'easy');
        if (easy && profile.currentEasyPaceSec > 0 && profile.currentEasyPaceSec < easy.min_sec - 3) {
          return (
            <div className="mt-2 rounded-xl bg-amber/10 p-3 text-xs leading-relaxed text-amber">
              Heads up: your current easy pace is faster than your optimal Easy zone. Easy runs
              are <i>meant</i> to feel almost too slow — holding back builds more aerobic fitness
              with less fatigue (the 80/20 principle). If your recent race time in Setup is off,
              update it to recalibrate these zones.
            </div>
          );
        }
        return null;
      })()}

      {/* Weekly mileage chart (tap a week) */}
      <div className="mb-2 mt-7 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-dim">Weekly mileage</h2>
        <div className="flex items-center gap-3 text-[10px] text-dim">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2.5 rounded-sm bg-mint" /> Planned</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2.5 rounded-sm bg-cyan" /> Actual</span>
        </div>
      </div>
      <div className="card p-4">
        {sel ? (
          <div className="mb-3 flex items-center justify-between rounded-xl bg-bg px-3 py-2 text-sm">
            <span className="font-bold">Week {sel.week}</span>
            <span className="tabular text-dim">
              <span className="text-mint">{sel.planned.toFixed(0)}</span> planned ·{' '}
              <span className="text-cyan">{sel.actual.toFixed(0)}</span> actual km
              {isTrail ? ` · ${sel.elevation} m` : ''}
            </span>
          </div>
        ) : (
          <div className="mb-3 text-[11px] text-dim">Tap a week for details.</div>
        )}
        <div className="no-scrollbar flex items-end gap-1.5 overflow-x-auto">
          {chart.map((r) => (
            <button
              key={r.week}
              onClick={() => setSelWeek(selWeek === r.week ? null : r.week)}
              className="flex min-w-[18px] flex-col items-center gap-1.5"
            >
              <div className="flex h-32 items-end gap-0.5" style={{ opacity: selWeek && selWeek !== r.week ? 0.4 : 1 }}>
                <div className="w-2 rounded-t-sm bg-mint" style={{ height: `${Math.max(2, (r.planned / maxKm) * 100)}%` }} />
                <div className="w-2 rounded-t-sm" style={{ height: `${Math.max(2, (r.actual / maxKm) * 100)}%`, background: '#22D3EE' }} />
              </div>
              <span className="tabular text-[9px] text-dim">{r.week}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-dim">Peak ~{Math.round(maxKm)} km/week. Prescribed vs. logged from Apple Health.</p>
      </div>

      {/* Elevation chart (trail / semi-trail) */}
      {isTrail && (
        <>
          <h2 className="mb-2 mt-7 text-xs font-bold uppercase tracking-wider text-dim">
            Weekly elevation · {profile.raceType}
          </h2>
          <div className="card p-4">
            {selElev ? (
              <div className="mb-3 flex items-center justify-between rounded-xl bg-bg px-3 py-2 text-sm">
                <span className="font-bold">Week {selElev.week}</span>
                <span className="tabular" style={{ color: '#FB923C' }}>{selElev.elevation} m climbing</span>
              </div>
            ) : (
              <div className="mb-3 text-[11px] text-dim">Tap a week for its vertical gain.</div>
            )}
            <div className="no-scrollbar flex items-end gap-1.5 overflow-x-auto">
              {chart.map((r) => (
                <button
                  key={r.week}
                  onClick={() => setSelElevWeek(selElevWeek === r.week ? null : r.week)}
                  className="flex min-w-[18px] flex-1 flex-col items-center gap-1.5"
                >
                  <div className="flex h-24 items-end" style={{ opacity: selElevWeek && selElevWeek !== r.week ? 0.4 : 1 }}>
                    <div className="w-3 rounded-t-sm" style={{ height: `${Math.max(2, (r.elevation / maxElev) * 100)}%`, background: '#FB923C' }} />
                  </div>
                  <span className="tabular text-[9px] text-dim">{r.week}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-dim">
              Prescribed vertical gain per week, building toward your race’s {profile.elevationGainM} m of climbing.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
