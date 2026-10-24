// Formatting + date helpers. Pace formatting is covered by QA check #5.

/** Format a pace in seconds/km as "m:ss/km" with a leading zero on seconds. */
export function formatPace(secPerKm: number): string {
  if (!isFinite(secPerKm) || secPerKm <= 0) return '--:--/km';
  const total = Math.round(secPerKm);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

/** Format a pace range as "m:ss–m:ss/km". */
export function formatPaceRange(minSec: number, maxSec: number): string {
  const f = (sec: number) => {
    const t = Math.round(sec);
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  };
  return `${f(minSec)}–${f(maxSec)}/km`;
}

/** Format a duration in seconds as "H:MM:SS" or "M:SS". */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Format a race finish time as "H:MM:SS". */
export function formatFinishTime(seconds: number): string {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function metersToKm(m: number, digits = 1): string {
  return (m / 1000).toFixed(digits);
}

// ---- Date helpers (all local-date, ISO YYYY-MM-DD) -----------------------

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** 0 = Monday ... 6 = Sunday */
export function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** Monday (YYYY-MM-DD) of the ISO week containing `iso`. */
export function weekStartMonday(iso: string): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() - mondayIndex(d));
  return toISODate(d);
}

/** The Monday on or after `iso` (so a plan never starts in the past). */
export function nextMonday(iso: string): string {
  const d = parseISODate(iso);
  const idx = mondayIndex(d); // 0 = Monday
  if (idx !== 0) d.setDate(d.getDate() + (7 - idx));
  return toISODate(d);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = parseISODate(fromISO).getTime();
  const b = parseISODate(toISO).getTime();
  return Math.round((b - a) / 86400000);
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export function dayName(mondayIdx: number): string {
  return DAY_NAMES[mondayIdx] ?? '';
}

const DAY_FULL = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
export function dayFull(mondayIdx: number): string {
  return DAY_FULL[mondayIdx] ?? '';
}
