import type { ReactNode } from 'react';

/** A large number with a small label — Strava-style stat. */
export function StatTile({
  value,
  unit,
  label,
  accent = '#FFFFFF',
}: {
  value: ReactNode;
  unit?: string;
  label: string;
  accent?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-baseline gap-1">
        <span className="tabular text-2xl font-extrabold tracking-tight" style={{ color: accent }}>
          {value}
        </span>
        {unit && <span className="text-sm font-semibold text-dim">{unit}</span>}
      </div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-dim">{label}</div>
    </div>
  );
}
