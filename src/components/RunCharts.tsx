import type { SyncedWorkout } from '../types';
import { movingPaceSecPerKm } from '../lib/workoutMatcher';
import { formatPace, metersToKm } from '../lib/format';

/** Strava-style analytics over the user's actually-logged runs. */
export function RunCharts({ synced }: { synced: SyncedWorkout[] }) {
  const runs = [...synced]
    .sort((a, b) =>
      (a.local_date + (a.start_time || '')).localeCompare(b.local_date + (b.start_time || ''))
    )
    .slice(-12);

  if (runs.length === 0) {
    return (
      <div className="card p-5 text-sm text-dim">
        Log runs — via Strava sync or “Simulate run” in Setup — to see your pace trend, distance
        and heart-rate graphs here.
      </div>
    );
  }

  const paces = runs.map((r) => movingPaceSecPerKm(r.duration_seconds, r.distance_meters));
  const minP = Math.min(...paces);
  const maxP = Math.max(...paces);
  const spanP = Math.max(1, maxP - minP);
  const dists = runs.map((r) => r.distance_meters / 1000);
  const maxD = Math.max(1, ...dists);
  const hrRuns = runs.filter((r) => r.avg_heart_rate);
  const hrs = runs.map((r) => r.avg_heart_rate || 0);
  const minHR = Math.min(...hrs.filter((h) => h > 0), 999);
  const maxHR = Math.max(...hrs, 1);

  const n = runs.length;
  const x = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const yPace = (p: number) => 12 + ((p - minP) / spanP) * 76; // faster(min) near top

  const paceLine = paces.map((p, i) => `${x(i)},${yPace(p)}`).join(' ');
  const paceArea = `0,100 ${paceLine} 100,100`;
  const latestPace = paces[paces.length - 1];

  return (
    <div className="space-y-5">
      {/* Pace trend */}
      <div className="card p-4">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-sm font-bold">Pace trend</span>
          <span className="tabular text-sm font-semibold text-mint">
            {formatPace(latestPace)}
          </span>
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-24 w-full">
          <defs>
            <linearGradient id="paceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7B8CFF" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#7B8CFF" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={paceArea} fill="url(#paceFill)" />
          <polyline
            points={paceLine}
            fill="none"
            stroke="#7B8CFF"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="mt-1 flex justify-between text-[11px] text-dim">
          <span>Fastest {formatPace(minP)}</span>
          <span>Slowest {formatPace(maxP)}</span>
        </div>
      </div>

      {/* Distance per run */}
      <div className="card p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-sm font-bold">Distance per run</span>
          <span className="tabular text-sm font-semibold text-cyan">
            {metersToKm(runs[runs.length - 1].distance_meters)} km
          </span>
        </div>
        <div className="flex h-24 items-end gap-1.5">
          {runs.map((r, i) => (
            <div
              key={r.external_id}
              className="flex-1 rounded-t-sm"
              style={{
                height: `${Math.max(3, (dists[i] / maxD) * 100)}%`,
                background: '#22D3EE',
              }}
              title={`${metersToKm(r.distance_meters)} km · ${r.local_date}`}
            />
          ))}
        </div>
      </div>

      {/* Heart rate */}
      {hrRuns.length >= 2 && (
        <div className="card p-4">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-sm font-bold">Avg heart rate</span>
            <span className="tabular text-sm font-semibold text-pink">
              {Math.round(runs[runs.length - 1].avg_heart_rate || 0)} bpm
            </span>
          </div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-20 w-full">
            <polyline
              points={runs
                .map((r, i) => {
                  const h = r.avg_heart_rate || minHR;
                  const y = 90 - ((h - minHR) / Math.max(1, maxHR - minHR)) * 76;
                  return `${x(i)},${y}`;
                })
                .join(' ')}
              fill="none"
              stroke="#FF4D8D"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="mt-1 flex justify-between text-[11px] text-dim">
            <span>{minHR === 999 ? '—' : minHR} bpm</span>
            <span>{maxHR} bpm</span>
          </div>
        </div>
      )}
    </div>
  );
}
