// ---------------------------------------------------------------------------
// Jack Daniels / Jimmy Gilbert VDOT engine  (improvement #7)
//
// All training paces are derived DIRECTLY from VDOT using Daniels' oxygen-cost
// and %VO2max equations — not as arbitrary offsets from marathon pace. The two
// published equations are:
//
//   Oxygen cost of running at velocity v (metres/min):
//     VO2(v) = -4.60 + 0.182258 * v + 0.000104 * v^2         [ml/kg/min]
//
//   Fraction of VO2max sustainable for a race of duration t (minutes):
//     %max(t) = 0.8 + 0.1894393 * e^(-0.012778 t)
//                   + 0.2989558 * e^(-0.1932605 t)
//
//   VDOT of a race = VO2(race velocity) / %max(race duration)
//
// Training zones are then "run at fraction f of VDOT": target VO2 = f * VDOT,
// invert VO2(v) to get velocity, convert to pace. Fractions below follow
// Daniels' Running Formula intensity bands (E/M/T/I/R).
// ---------------------------------------------------------------------------

import type { PaceZone, RaceDistance } from '../types';

const RACE_METERS: Record<RaceDistance, number> = {
  '5K': 5000,
  '10K': 10000,
  'Half Marathon': 21097.5,
  Marathon: 42195,
};

export function raceDistanceMeters(d: RaceDistance): number {
  return RACE_METERS[d];
}

/** Oxygen cost (ml/kg/min) of running at velocity v in metres/minute. */
function vo2FromVelocity(v: number): number {
  return -4.6 + 0.182258 * v + 0.000104 * v * v;
}

/** Invert the oxygen-cost quadratic: velocity (m/min) that costs `vo2`. */
function velocityFromVo2(vo2: number): number {
  // 0.000104 v^2 + 0.182258 v + (-4.6 - vo2) = 0
  const a = 0.000104;
  const b = 0.182258;
  const c = -4.6 - vo2;
  const disc = b * b - 4 * a * c;
  return (-b + Math.sqrt(disc)) / (2 * a);
}

/** Fraction of VO2max sustainable for a race lasting t minutes. */
function pctMax(tMinutes: number): number {
  return (
    0.8 +
    0.1894393 * Math.exp(-0.012778 * tMinutes) +
    0.2989558 * Math.exp(-0.1932605 * tMinutes)
  );
}

/** Compute VDOT from a recent race distance (m) and time (seconds). */
export function vdotFromRace(distanceMeters: number, timeSeconds: number): number {
  const tMin = timeSeconds / 60;
  const v = distanceMeters / tMin; // m/min
  const vdot = vo2FromVelocity(v) / pctMax(tMin);
  return Math.round(vdot * 10) / 10;
}

/**
 * Predict the race time (seconds) for a given distance at a given VDOT.
 * Solved numerically: find the duration t where VO2(dist/t)/%max(t) === VDOT.
 */
export function predictRaceTimeSeconds(vdot: number, distanceMeters: number): number {
  let lo = 1; // minutes
  let hi = 1000;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const v = distanceMeters / mid;
    const impliedVdot = vo2FromVelocity(v) / pctMax(mid);
    // Longer time => slower velocity => lower implied VDOT.
    if (impliedVdot > vdot) lo = mid;
    else hi = mid;
  }
  return ((lo + hi) / 2) * 60;
}

/** Pace (sec/km) to run at fraction `f` of VDOT. */
function paceForFraction(vdot: number, f: number): number {
  const v = velocityFromVo2(f * vdot); // m/min
  return 60000 / v; // sec per km
}

export interface TrainingPaces {
  vdot: number;
  zones: PaceZone[];
  marathonPaceSec: number;
  predicted: Record<RaceDistance, number>; // seconds
}

/**
 * Full set of Daniels training zones from a VDOT.
 * Fractions follow Daniels' bands (fastest end first):
 *   Recovery 0.60–0.66 · Easy 0.66–0.74 · Long base 0.72–0.79
 *   Threshold/Tempo 0.85–0.89 · VO2max Interval 0.95–1.00
 * Marathon pace is taken from the predicted marathon race pace (±5 s/km),
 * which is the most race-specific anchor for the plan.
 */
export function computeTrainingPaces(vdot: number): TrainingPaces {
  const predicted: Record<RaceDistance, number> = {
    '5K': predictRaceTimeSeconds(vdot, RACE_METERS['5K']),
    '10K': predictRaceTimeSeconds(vdot, RACE_METERS['10K']),
    'Half Marathon': predictRaceTimeSeconds(vdot, RACE_METERS['Half Marathon']),
    Marathon: predictRaceTimeSeconds(vdot, RACE_METERS.Marathon),
  };
  const marathonPaceSec = predicted.Marathon / (RACE_METERS.Marathon / 1000);

  // paceForFraction: higher fraction => faster => smaller sec/km.
  const zone = (
    key: PaceZone['key'],
    label: string,
    fastF: number,
    slowF: number
  ): PaceZone => ({
    key,
    label,
    min_sec: Math.round(paceForFraction(vdot, fastF)),
    max_sec: Math.round(paceForFraction(vdot, slowF)),
  });

  const zones: PaceZone[] = [
    zone('recovery', 'Recovery Jog', 0.66, 0.6),
    zone('easy', 'Easy / Conversational', 0.74, 0.66),
    zone('long_base', 'Long Run Aerobic Base', 0.79, 0.72),
    {
      key: 'marathon_pace',
      label: 'Marathon Goal Pace',
      min_sec: Math.round(marathonPaceSec - 5),
      max_sec: Math.round(marathonPaceSec + 5),
    },
    zone('tempo', 'Threshold / Tempo', 0.89, 0.85),
    zone('interval', 'VO2 Max Intervals', 1.0, 0.95),
  ];

  return { vdot, zones, marathonPaceSec, predicted };
}

export function zoneByKey(paces: TrainingPaces, key: PaceZone['key']): PaceZone {
  return paces.zones.find((z) => z.key === key)!;
}
