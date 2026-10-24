import { useMemo } from 'react';
import { useStore } from '../state/store';
import { formatFinishTime, formatPaceRange, weekStartMonday } from '../lib/format';

export function ZonesTab() {
  const { paces, vdot, workouts, synced } = useStore();

  // Map each plan week to its Monday, for bucketing synced runs by week.
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
        workouts
          .filter((w) => w.week === week)
          .reduce((s, w) => s + w.target_distance_meters, 0) / 1000;
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

  const equivalents: { label: string; time: number }[] = [
    { label: '5K', time: paces.predicted['5K'] },
    { label: '10K', time: paces.predicted['10K'] },
    { label: 'Half', time: paces.predicted['Half Marathon'] },
    { label: 'Marathon', time: paces.predicted.Marathon },
  ];

  return (
    <div className="safe-top px-5 pb-28">
      <h1 className="text-2xl font-bold">Zones &amp; Stats</h1>

      {/* VDOT + predicted marathon */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-wide text-white/40">VDOT</div>
          <div className="mt-1 text-3xl font-bold text-mint">{vdot.toFixed(1)}</div>
          <div className="mt-1 text-[11px] text-white/40">Jack Daniels fitness score</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-wide text-white/40">Predicted Marathon</div>
          <div className="mt-1 text-3xl font-bold">{formatFinishTime(paces.predicted.Marathon)}</div>
          <div className="mt-1 text-[11px] text-white/40">at current fitness</div>
        </div>
      </div>

      {/* Equivalent race times */}
      <div className="mt-3 rounded-2xl border border-border bg-card p-4">
        <div className="mb-2 text-xs uppercase tracking-wide text-white/40">
          Equivalent race times
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {equivalents.map((e) => (
            <div key={e.label}>
              <div className="text-[11px] text-white/45">{e.label}</div>
              <div className="text-sm font-semibold">{formatFinishTime(e.time)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pace zones table */}
      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-white/40">
        Training pace zones (min/km)
      </h2>
      <div className="mt-2 space-y-2">
        {paces.zones.map((z) => (
          <div
            key={z.key}
            className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
          >
            <span className="text-sm font-medium">{z.label}</span>
            <span className="font-mono text-sm text-mint">
              {formatPaceRange(z.min_sec, z.max_sec)}
            </span>
          </div>
        ))}
      </div>

      {/* Mileage chart */}
      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-white/40">
        Weekly mileage — planned vs actual
      </h2>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-white/50">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm bg-mint" /> Planned
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm bg-cyan" /> Actual
        </span>
      </div>
      <div className="no-scrollbar mt-2 flex items-end gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-3">
        {chart.map((r) => (
          <div key={r.week} className="flex min-w-[20px] flex-col items-center gap-1">
            <div className="flex h-28 items-end gap-0.5">
              <div
                className="w-2 rounded-t bg-mint"
                style={{ height: `${(r.planned / maxKm) * 100}%` }}
                title={`Week ${r.week} planned ${r.planned.toFixed(0)}km`}
              />
              <div
                className="w-2 rounded-t bg-cyan"
                style={{ height: `${(r.actual / maxKm) * 100}%` }}
                title={`Week ${r.week} actual ${r.actual.toFixed(0)}km`}
              />
            </div>
            <span className="text-[9px] text-white/35">{r.week}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-white/30">
        Peak at ~{Math.round(maxKm)} km/week. Bars show prescribed volume vs. what you actually
        logged from Apple Health.
      </p>
    </div>
  );
}
