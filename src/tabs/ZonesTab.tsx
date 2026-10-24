import { useMemo } from 'react';
import { useStore } from '../state/store';
import { StatTile } from '../components/StatTile';
import { formatFinishTime, formatPaceRange, weekStartMonday } from '../lib/format';
import type { PaceZone } from '../types';

const zoneColor: Record<PaceZone['key'], string> = {
  recovery: '#5B5B67',
  easy: '#00C2A8',
  long_base: '#22D3EE',
  marathon_pace: '#00F5A0',
  tempo: '#FBBF24',
  interval: '#A855F7',
};

export function ZonesTab() {
  const { paces, vdot, workouts, synced } = useStore();

  const weekMondays = useMemo(() => {
    const m = new Map<number, string>();
    for (const w of workouts) if (!m.has(w.week)) m.set(w.week, weekStartMonday(w.date));
    return m;
  }, [workouts]);

  const totalWeeks = workouts.length ? Math.max(...workouts.map((w) => w.week)) : 0;

  const chart = useMemo(() => {
    const rows: { week: number; planned: number; actual: number }[] = [];
    for (let week = 1; week <= totalWeeks; week++) {
      const planned =
        workouts.filter((w) => w.week === week).reduce((s, w) => s + w.target_distance_meters, 0) /
        1000;
      const monday = weekMondays.get(week);
      const actual = monday
        ? synced
            .filter((r) => weekStartMonday(r.local_date) === monday)
            .reduce((s, r) => s + r.distance_meters, 0) / 1000
        : 0;
      rows.push({ week, planned, actual });
    }
    return rows;
  }, [workouts, synced, totalWeeks, weekMondays]);

  const maxKm = Math.max(1, ...chart.map((r) => Math.max(r.planned, r.actual)));

  const equivalents = [
    { label: '5K', time: paces.predicted['5K'] },
    { label: '10K', time: paces.predicted['10K'] },
    { label: 'Half', time: paces.predicted['Half Marathon'] },
  ];

  return (
    <div className="safe-top px-5 pb-28">
      <h1 className="text-3xl font-extrabold tracking-tight">Stats</h1>

      {/* VDOT + predicted */}
      <div className="rise mt-5 grid grid-cols-2 gap-3">
        <div className="card relative overflow-hidden p-5">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(120% 100% at 0% 0%, rgba(0,245,160,0.18), rgba(7,7,10,0) 70%)' }}
          />
          <div className="relative text-[11px] font-medium uppercase tracking-wider text-dim">VDOT</div>
          <div className="relative mt-1 tabular text-5xl font-extrabold gradient-text">
            {vdot.toFixed(1)}
          </div>
          <div className="relative mt-1 text-[11px] text-dim">Daniels fitness score</div>
        </div>
        <div className="card p-5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-dim">
            Predicted marathon
          </div>
          <div className="mt-1 tabular text-4xl font-extrabold">
            {formatFinishTime(paces.predicted.Marathon)}
          </div>
          <div className="mt-1 text-[11px] text-dim">at current fitness</div>
        </div>
      </div>

      {/* Equivalents */}
      <div className="rise mt-3 grid grid-cols-3 gap-3" style={{ animationDelay: '60ms' }}>
        {equivalents.map((e) => (
          <StatTile key={e.label} value={formatFinishTime(e.time)} label={e.label} />
        ))}
      </div>

      {/* Pace zones */}
      <h2 className="mb-2 mt-7 text-xs font-bold uppercase tracking-wider text-dim">
        Training pace zones
      </h2>
      <div className="card divide-y divide-border overflow-hidden">
        {paces.zones.map((z) => (
          <div key={z.key} className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: zoneColor[z.key], boxShadow: `0 0 10px -1px ${zoneColor[z.key]}` }}
              />
              <span className="text-sm font-semibold">{z.label}</span>
            </div>
            <span className="tabular rounded-lg bg-bg px-2.5 py-1 text-sm font-semibold" style={{ color: zoneColor[z.key] }}>
              {formatPaceRange(z.min_sec, z.max_sec)}
            </span>
          </div>
        ))}
      </div>

      {/* Mileage chart */}
      <div className="mb-2 mt-7 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-dim">Weekly mileage</h2>
        <div className="flex items-center gap-3 text-[10px] text-dim">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2.5 rounded-sm bg-mint" /> Planned
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2.5 rounded-sm bg-cyan" /> Actual
          </span>
        </div>
      </div>
      <div className="card no-scrollbar flex items-end gap-1.5 overflow-x-auto p-4">
        {chart.map((r) => (
          <div key={r.week} className="flex min-w-[18px] flex-col items-center gap-1.5">
            <div className="flex h-32 items-end gap-0.5">
              <div
                className="w-2 rounded-t-sm bg-mint"
                style={{ height: `${Math.max(2, (r.planned / maxKm) * 100)}%` }}
                title={`W${r.week} planned ${r.planned.toFixed(0)}km`}
              />
              <div
                className="w-2 rounded-t-sm"
                style={{ height: `${Math.max(2, (r.actual / maxKm) * 100)}%`, background: '#22D3EE' }}
                title={`W${r.week} actual ${r.actual.toFixed(0)}km`}
              />
            </div>
            <span className="tabular text-[9px] text-dim">{r.week}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-dim">
        Peak ~{Math.round(maxKm)} km/week. Prescribed volume vs. what you logged from Apple Health.
      </p>
    </div>
  );
}
