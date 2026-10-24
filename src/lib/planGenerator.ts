// ---------------------------------------------------------------------------
// Periodized marathon plan generator  (improvements #1 and #8)
//
//  * DYNAMIC LENGTH: the plan spans however many weeks separate today from the
//    chosen race date (clamped 8–24). Phases scale; the 3:1 load/deload rhythm
//    and a 1–3 week taper are preserved for any length.
//  * SEEDED VOLUME: long runs, quality sessions and easy runs are sized from the
//    athlete's current weekly mileage and progress ~8–10%/week, so the plan
//    starts where the runner actually is — not from a fixed template.
//  * DOCUMENTED: every workout carries a `rationale` citing the method, and a
//    structured `segments[]` array so the UI can render Runna-style blocks.
//
// Determinism: identical Profile input always yields an identical plan.
// ---------------------------------------------------------------------------

import type {
  PlannedWorkout,
  Profile,
  WeekPhase,
  WorkoutSegment,
  WorkoutType,
} from '../types';
import { addDays, toISODate, weekStartMonday, daysBetween } from './format';
import {
  computeTrainingPaces,
  raceDistanceMeters,
  vdotFromRace,
  type TrainingPaces,
} from './vdot';

const MARATHON_M = 42195;

export interface GeneratedPlan {
  workouts: PlannedWorkout[];
  totalWeeks: number;
  paces: TrainingPaces;
  vdot: number;
}

interface WeekClass {
  week: number;
  phase: WeekPhase;
  isDeload: boolean;
  isPeak: boolean;
  isTaper: boolean;
  isRace: boolean;
}

function classifyWeeks(totalWeeks: number): WeekClass[] {
  const taperWeeks = totalWeeks >= 14 ? 3 : totalWeeks >= 11 ? 2 : 1;
  const peakWeek = totalWeeks - taperWeeks; // 1-based
  const out: WeekClass[] = [];
  for (let week = 1; week <= totalWeeks; week++) {
    const isRace = week === totalWeeks;
    const isTaper = week > peakWeek;
    const isPeak = week === peakWeek;
    const isDeload = !isTaper && !isPeak && week % 4 === 0;
    let phase: WeekPhase;
    if (isTaper) phase = 'Taper';
    else if (isPeak) phase = 'Peak';
    else if (isDeload) phase = 'Deload';
    else {
      const third = peakWeek / 3;
      phase = week <= third ? 'Base' : week <= 2 * third ? 'Build I' : 'Build II';
    }
    out.push({ week, phase, isDeload, isPeak, isTaper, isRace });
  }
  return out;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Compute the number of training weeks between today and the race week. */
export function weeksUntilRace(goalRaceDate: string, today = toISODate(new Date())): number {
  const raceMon = weekStartMonday(goalRaceDate);
  const todayMon = weekStartMonday(today);
  const weeks = Math.round(daysBetween(todayMon, raceMon) / 7) + 1; // inclusive of race week
  return clamp(weeks, 8, 24);
}

// ---- segment helpers -------------------------------------------------------

function seg(
  partial: Omit<WorkoutSegment, 'id'>,
  key: string
): WorkoutSegment {
  return { id: key, ...partial };
}

function summarize(segments: WorkoutSegment[]): {
  distance: number;
  avgPace: number;
  duration: number;
} {
  let distance = 0;
  let movingSec = 0;
  let restSec = 0;
  for (const s of segments) {
    const mid = (s.target_pace_min_sec + s.target_pace_max_sec) / 2;
    distance += s.distance_meters;
    movingSec += (s.distance_meters / 1000) * mid;
    if (s.rest_seconds && s.reps && s.reps > 1) restSec += s.rest_seconds * (s.reps - 1);
  }
  return {
    distance,
    avgPace: distance > 0 ? movingSec / (distance / 1000) : 0,
    duration: movingSec + restSec,
  };
}

// ---- main generator --------------------------------------------------------

export function generatePlan(profile: Profile): GeneratedPlan {
  const vdot = vdotFromRace(
    raceDistanceMeters(profile.recentRaceDistance),
    profile.recentRaceTimeSeconds
  );
  const paces = computeTrainingPaces(vdot);

  const z = (key: Parameters<typeof keyZone>[1]) => keyZone(paces, key);

  // Marathon goal pace: use the user's goal time if provided, else predicted.
  const goalMpSec =
    profile.goalFinishTimeSeconds && profile.goalFinishTimeSeconds > 0
      ? profile.goalFinishTimeSeconds / (MARATHON_M / 1000)
      : paces.marathonPaceSec;
  const mpBand = { min: Math.round(goalMpSec - 5), max: Math.round(goalMpSec + 5) };

  const totalWeeks = weeksUntilRace(profile.goalRaceDate);
  const weeks = classifyWeeks(totalWeeks);
  const peakWeek = weeks.find((w) => w.isPeak)!.week;

  // Terrain: trail / semi-trail plans add hill work and prescribe vertical gain.
  const isTrail = profile.raceType !== 'Road';
  const elevPerKm = profile.elevationGainM > 0 ? profile.elevationGainM / 42.195 : 0;

  // Seeded distances (km).
  const startKm = clamp(profile.currentWeeklyMileageKm, 15, 120);
  const lrStart = clamp(Math.round(startKm * 0.42), 12, 20);
  const lrPeak = clamp(Math.round(startKm * 0.5 + 14), 26, 32);
  const easyKm = clamp(Math.round(startKm / profile.runsPerWeek), 6, 12);
  const DELOAD = 0.74; // ~22-26% weekly volume reduction on deload weeks

  // Monday of week 1 so that the final week contains the race date.
  const raceWeekMon = weekStartMonday(profile.goalRaceDate);
  const firstMon = addDays(raceWeekMon, -(totalWeeks - 1) * 7);
  const longRunIdx = profile.longRunDay === 'Saturday' ? 5 : 6;

  const workouts: PlannedWorkout[] = [];

  for (const wc of weeks) {
    const weekMon = addDays(firstMon, (wc.week - 1) * 7);

    // ----- race week: special sequence -----
    if (wc.isRace) {
      pushEasy(workouts, wc, weekMon, 1, 4000, z('easy'), 'Pre-race shakeout to stay loose.');
      pushActivation(workouts, wc, weekMon, 3, z('easy'), mpBand);
      pushRace(workouts, wc, weekMon, longRunIdx, mpBand, profile.goalRaceName);
      continue;
    }

    // ----- week volume scale (deload & taper reduce volume) -----
    const taperOrder = wc.isTaper ? wc.week - peakWeek : 0; // 1 = first taper week
    let weekScale = 1;
    if (wc.isDeload) weekScale = DELOAD;
    else if (wc.isTaper) weekScale = taperOrder === 1 ? 0.6 : 0.45; // final 2 weeks: very light

    // ----- long run distance for this week -----
    const rampWeeks = Math.max(1, peakWeek - 1);
    const p = clamp((wc.week - 1) / rampWeeks, 0, 1); // 0..1 up to peak
    let lrKm = Math.round(lrStart + (lrPeak - lrStart) * p);
    if (wc.isDeload) lrKm = Math.round(lrKm * DELOAD);
    if (wc.isTaper) lrKm = Math.round(lrPeak * (taperOrder === 1 ? 0.55 : 0.35));
    if (wc.isPeak) lrKm = lrPeak;
    lrKm = clamp(lrKm, 8, 34);

    // MP block inside the long run (none during taper — keep it easy).
    let mpBlockKm = 0;
    if (wc.isPeak) mpBlockKm = 13;
    else if (wc.phase === 'Build II') mpBlockKm = 9;
    else if (wc.phase === 'Build I') mpBlockKm = wc.week >= peakWeek - 4 ? 5 : 0;

    // ----- session allocation (taper = easy recovery running only) -----
    const qualityCount = wc.isTaper ? 0 : decideQualityCount(wc, profile.runsPerWeek);
    const easyCount = Math.max(0, profile.runsPerWeek - 1 - qualityCount);
    const days = allocateDays(longRunIdx, qualityCount, easyCount);

    // Long run.
    pushLongRun(workouts, wc, weekMon, longRunIdx, lrKm, mpBlockKm, z, mpBand);

    // Quality sessions (never during the taper).
    for (let qi = 0; qi < qualityCount; qi++) {
      pushQuality(workouts, wc, weekMon, days.quality[qi], qi, weekScale, z, mpBand, isTrail);
    }

    // Easy runs.
    const easyRationale = wc.isTaper
      ? 'Taper — very light, easy recovery running only. Volume is cut hard so you arrive on race day fresh; your fitness is already banked.'
      : '80/20 aerobic base volume — easy, conversational effort to build aerobic fitness without fatigue.';
    for (let ei = 0; ei < easyCount; ei++) {
      const dist = Math.round(easyKm * weekScale) * 1000;
      pushEasy(workouts, wc, weekMon, days.easy[ei], Math.max(4000, dist), z('easy'), easyRationale);
    }
  }

  // ---- prescribe vertical gain per workout (trail / semi-trail only) ----
  if (isTrail && elevPerKm > 0) {
    for (const w of workouts) {
      const km = w.target_distance_meters / 1000;
      if (w.type === 'RACE') w.elevation_gain_m = Math.round(profile.elevationGainM);
      else if (w.type === 'HILLS') w.elevation_gain_m = Math.round(km * elevPerKm * 2.2);
      else if (w.type === 'LONG RUN') w.elevation_gain_m = Math.round(km * elevPerKm * 1.1);
      else if (w.type === 'MP') w.elevation_gain_m = Math.round(km * elevPerKm * 0.9);
      else w.elevation_gain_m = Math.round(km * elevPerKm * 0.7);
    }
  }

  return { workouts, totalWeeks, paces, vdot };
}

// ---- allocation helpers ----------------------------------------------------

function decideQualityCount(wc: WeekClass, runsPerWeek: number): number {
  if (wc.isTaper) return runsPerWeek >= 4 ? 1 : 0;
  if (wc.isDeload) return 1;
  if (wc.phase === 'Base') return 1;
  return runsPerWeek >= 5 ? 2 : 1; // Build/Peak get two quality sessions at higher volume
}

function allocateDays(
  longRunIdx: number,
  qualityCount: number,
  easyCount: number
): { quality: number[]; easy: number[] } {
  // Mon=0 ... Sun=6. Quality on Tue/Thu; easy fills the rest, skipping the LR day.
  const qPool = [1, 3];
  const quality = qPool.slice(0, qualityCount);
  const used = new Set<number>([longRunIdx, ...quality]);
  const ePool = [0, 2, 4, 5, 6].filter((d) => !used.has(d));
  const easy = ePool.slice(0, easyCount);
  return { quality, easy };
}

// ---- workout builders ------------------------------------------------------

type ZoneFn = (key: Parameters<typeof keyZone>[1]) => ReturnType<typeof keyZone>;

function keyZone(paces: TrainingPaces, key: TrainingPaces['zones'][number]['key']) {
  return paces.zones.find((z) => z.key === key)!;
}

function finalize(
  workouts: PlannedWorkout[],
  wc: WeekClass,
  weekMon: string,
  dayIdx: number,
  type: WorkoutType,
  title: string,
  segments: WorkoutSegment[],
  rationale: string
) {
  const s = summarize(segments);
  workouts.push({
    id: `w${wc.week}-d${dayIdx}-${type}`,
    week: wc.week,
    phase: wc.phase,
    isDeload: wc.isDeload,
    dayOfWeek: dayIdx,
    date: addDays(weekMon, dayIdx),
    type,
    title,
    target_distance_meters: Math.round(s.distance),
    target_avg_pace_sec: Math.round(s.avgPace),
    estimated_duration_seconds: Math.round(s.duration),
    elevation_gain_m: 0, // assigned in the post-process pass below
    segments,
    rationale,
    completed: false,
    matched_synced_id: null,
  });
}

function pushEasy(
  workouts: PlannedWorkout[],
  wc: WeekClass,
  weekMon: string,
  dayIdx: number,
  distanceM: number,
  easyZone: ReturnType<typeof keyZone>,
  rationale: string
) {
  const segments = [
    seg(
      {
        type: 'easy',
        title: 'Easy Run',
        distance_meters: distanceM,
        target_pace_min_sec: easyZone.min_sec,
        target_pace_max_sec: easyZone.max_sec,
        notes: 'Conversational effort.',
      },
      `w${wc.week}-d${dayIdx}-easy-0`
    ),
  ];
  finalize(workouts, wc, weekMon, dayIdx, 'EASY', 'Easy Run', segments, rationale);
}

function pushLongRun(
  workouts: PlannedWorkout[],
  wc: WeekClass,
  weekMon: string,
  dayIdx: number,
  lrKm: number,
  mpBlockKm: number,
  z: ZoneFn,
  mpBand: { min: number; max: number }
) {
  const base = z('long_base');
  const segments: WorkoutSegment[] = [];
  const aerobicM = Math.max(0, (lrKm - mpBlockKm) * 1000);
  segments.push(
    seg(
      {
        type: 'easy',
        title: 'Aerobic Base',
        distance_meters: aerobicM,
        target_pace_min_sec: base.min_sec,
        target_pace_max_sec: base.max_sec,
        notes: 'Relaxed long-run effort.',
      },
      `w${wc.week}-d${dayIdx}-lb-0`
    )
  );
  if (mpBlockKm > 0) {
    segments.push(
      seg(
        {
          type: 'mp_block',
          title: `${mpBlockKm}km @ Marathon Pace`,
          distance_meters: mpBlockKm * 1000,
          target_pace_min_sec: mpBand.min,
          target_pace_max_sec: mpBand.max,
          notes: 'Finish at goal race pace on tired legs — teaches race-specific fuel use.',
        },
        `w${wc.week}-d${dayIdx}-mp-1`
      )
    );
  }
  const rationale =
    mpBlockKm > 0
      ? `Race-specific long run: ${lrKm - mpBlockKm}km aerobic then ${mpBlockKm}km at marathon goal pace. Builds glycogen economy and rehearses race effort (Pfitzinger specificity).`
      : `Aerobic long run (${lrKm}km) at long-base pace to grow capillary density, mitochondria and fat oxidation — the foundation of the marathon (Daniels E/L intensity).`;
  finalize(
    workouts,
    wc,
    weekMon,
    dayIdx,
    'LONG RUN',
    `Long Run · ${lrKm}km`,
    segments,
    wc.isTaper
      ? `Taper long run (${lrKm}km) — kept short and fully easy so your legs are fresh and rested for race day.`
      : wc.isDeload
        ? `Deload long run (${lrKm}km) — reduced distance lets connective tissue adapt before the next load block.`
        : rationale
  );
}

function pushQuality(
  workouts: PlannedWorkout[],
  wc: WeekClass,
  weekMon: string,
  dayIdx: number,
  qi: number,
  deloadScale: number,
  z: ZoneFn,
  mpBand: { min: number; max: number },
  isTrail: boolean
) {
  const easy = z('easy');
  const warm = (n: number) =>
    seg(
      {
        type: 'warmup',
        title: 'Warm-up',
        distance_meters: 2000,
        target_pace_min_sec: easy.min_sec,
        target_pace_max_sec: easy.max_sec,
      },
      `w${wc.week}-d${dayIdx}-wu-${n}`
    );
  const cool = (n: number) =>
    seg(
      {
        type: 'cooldown',
        title: 'Cool-down',
        distance_meters: 1500,
        target_pace_min_sec: easy.min_sec,
        target_pace_max_sec: easy.max_sec,
      },
      `w${wc.week}-d${dayIdx}-cd-${n}`
    );

  // Choose the session based on phase + which quality slot it is.
  let type: WorkoutType = 'TEMPO';
  let title = '';
  let work: WorkoutSegment;
  let rationale = '';

  const interval = z('interval');
  const tempo = z('tempo');

  const trailHillSlot =
    isTrail &&
    qi === 0 &&
    (wc.phase === 'Build I' || wc.phase === 'Build II' || wc.phase === 'Peak');
  const isIntervalSlot = wc.phase === 'Base' || qi === 1 || wc.phase === 'Peak';

  if (trailHillSlot) {
    type = 'HILLS';
    const reps = wc.phase === 'Peak' ? 10 : 8;
    const repM = 400;
    title = `${reps} x 400m hill repeats`;
    work = seg(
      {
        type: 'hill',
        title,
        distance_meters: reps * repM,
        reps,
        rep_distance_meters: repM,
        rest_seconds: 120,
        target_pace_min_sec: interval.min_sec,
        target_pace_max_sec: interval.max_sec,
        notes: 'Uphill at ~5K effort (pace is a guide — effort matters on hills). Jog down to recover.',
      },
      `w${wc.week}-d${dayIdx}-hill-0`
    );
    rationale =
      'Hill repeats build leg strength, power and running economy, and prepare your legs for the sustained climbs and descents of a trail / semi-trail race. Drive the uphill at hard (~5K) effort and jog the downhill to recover.';
  } else if (isIntervalSlot) {
    type = 'INTERVALS';
    const reps = wc.phase === 'Base' ? 6 : 6;
    const repM = wc.phase === 'Base' ? 800 : 1000;
    title = `${reps} x ${repM === 1000 ? '1km' : repM + 'm'} @ VO2 Max`;
    work = seg(
      {
        type: 'interval',
        title,
        distance_meters: reps * repM,
        reps,
        rep_distance_meters: repM,
        rest_seconds: 90,
        target_pace_min_sec: interval.min_sec,
        target_pace_max_sec: interval.max_sec,
        notes: '90s easy jog recovery between reps.',
      },
      `w${wc.week}-d${dayIdx}-int-0`
    );
    rationale = `VO2 Max intervals at ${repM}m repetition distance develop maximal aerobic power and running economy (Daniels I-pace). Hard but short, with jog recovery.`;
  } else {
    type = 'TEMPO';
    const reps = wc.phase === 'Build II' ? 2 : 3;
    const repM = wc.phase === 'Build II' ? 4000 : 2000;
    title = `${reps} x ${repM / 1000}km @ Threshold`;
    work = seg(
      {
        type: 'tempo',
        title,
        distance_meters: reps * repM,
        reps,
        rep_distance_meters: repM,
        rest_seconds: 60,
        target_pace_min_sec: tempo.min_sec,
        target_pace_max_sec: tempo.max_sec,
        notes: '60s float recovery between cruise intervals.',
      },
      `w${wc.week}-d${dayIdx}-tmp-0`
    );
    rationale = `Lactate-threshold cruise intervals at T-pace raise the pace you can hold before lactate accumulates — the single biggest driver of marathon performance (Daniels T-pace).`;
  }

  // Deload: shrink the work volume.
  if (deloadScale < 1 && work.reps) {
    work.reps = Math.max(2, Math.round(work.reps * 0.5));
    work.distance_meters = work.reps * (work.rep_distance_meters || 0);
    rationale = 'Deload quality session — same intensity, reduced volume to absorb training.';
  }

  const segments = [warm(0), work, cool(0)];
  // Reference mpBand so a future MP-specific slot can reuse it (keeps signature stable).
  void mpBand;
  finalize(workouts, wc, weekMon, dayIdx, type, title, segments, rationale);
}

function pushActivation(
  workouts: PlannedWorkout[],
  wc: WeekClass,
  weekMon: string,
  dayIdx: number,
  easyZone: ReturnType<typeof keyZone>,
  mpBand: { min: number; max: number }
) {
  const segments: WorkoutSegment[] = [
    seg(
      {
        type: 'easy',
        title: 'Easy',
        distance_meters: 2500,
        target_pace_min_sec: easyZone.min_sec,
        target_pace_max_sec: easyZone.max_sec,
      },
      `w${wc.week}-d${dayIdx}-act-0`
    ),
    seg(
      {
        type: 'mp_block',
        title: '4 x 100m strides @ race effort',
        distance_meters: 500,
        reps: 4,
        rep_distance_meters: 100,
        rest_seconds: 60,
        target_pace_min_sec: Math.max(120, mpBand.min - 40),
        target_pace_max_sec: mpBand.min - 20,
        notes: 'Short strides to prime the nervous system — not a workout.',
      },
      `w${wc.week}-d${dayIdx}-act-1`
    ),
  ];
  finalize(
    workouts,
    wc,
    weekMon,
    dayIdx,
    'MP',
    'Pre-race activation + strides',
    segments,
    'Two days out: short run with race-pace strides keeps the legs sharp and the nervous system primed without adding fatigue.'
  );
}

function pushRace(
  workouts: PlannedWorkout[],
  wc: WeekClass,
  weekMon: string,
  dayIdx: number,
  mpBand: { min: number; max: number },
  goalRaceName: string
) {
  const segments: WorkoutSegment[] = [
    seg(
      {
        type: 'mp_block',
        title: 'Marathon — 42.2km @ goal pace',
        distance_meters: MARATHON_M,
        target_pace_min_sec: mpBand.min,
        target_pace_max_sec: mpBand.max,
        notes: 'Execute your goal pace. Trust the training.',
      },
      `w${wc.week}-d${dayIdx}-race-0`
    ),
  ];
  finalize(
    workouts,
    wc,
    weekMon,
    dayIdx,
    'RACE',
    `${goalRaceName} — Race Day`,
    segments,
    'Race day. 16 weeks of periodized aerobic development, threshold work and race-specific pacing come together over 42.195 km.'
  );
}
