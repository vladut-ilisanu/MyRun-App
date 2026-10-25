import { useMemo, useState, type ReactNode } from 'react';
import {
  ChevronDown, BookOpen, Activity, Gauge, Apple, Zap, FlaskConical,
  Utensils, Moon, RefreshCw,
} from 'lucide-react';
import { useStore } from '../state/store';
import { formatFinishTime, metersToKm } from '../lib/format';

interface Section {
  id: string;
  icon: typeof BookOpen;
  title: string;
  body: ReactNode;
}

const H = ({ children }: { children: ReactNode }) => (
  <div className="mb-1.5 mt-4 text-sm font-bold text-mint first:mt-0">{children}</div>
);
const P = ({ children }: { children: ReactNode }) => (
  <p className="mb-2 text-sm leading-relaxed text-white/75">{children}</p>
);
const UL = ({ children }: { children: ReactNode }) => (
  <ul className="mb-2 ml-4 list-disc space-y-1 text-sm leading-relaxed text-white/75 marker:text-mint">
    {children}
  </ul>
);

export function KnowledgeTab() {
  const { workouts, profile, paces, vdot } = useStore();
  const [open, setOpen] = useState<string | null>(null);

  const stats = useMemo(() => {
    const totalWeeks = workouts.length ? Math.max(...workouts.map((w) => w.week)) : 0;
    const peakLong = workouts.length
      ? Math.max(...workouts.filter((w) => w.type === 'LONG RUN').map((w) => w.target_distance_meters))
      : 0;
    const deloads = [...new Set(workouts.filter((w) => w.isDeload).map((w) => w.week))];
    const peakWeek = workouts.find((w) => w.phase === 'Peak')?.week ?? 0;
    return { totalWeeks, peakLong, deloads, peakWeek };
  }, [workouts]);

  const isTrail = profile.raceType !== 'Road';

  const sections: Section[] = [
    {
      id: 'overview',
      icon: Activity,
      title: 'Your plan at a glance',
      body: (
        <>
          <P>
            A <b>{stats.totalWeeks}-week</b> plan for your {profile.raceType.toLowerCase()}{' '}
            {profile.goalRaceName} on {profile.goalRaceDate}
            {isTrail ? `, with ${profile.elevationGainM} m of climbing` : ''}. It’s built from your
            current fitness (<b>VDOT {vdot.toFixed(1)}</b>, predicted marathon{' '}
            {formatFinishTime(paces.predicted.Marathon)}) and progresses safely from where you are
            today.
          </P>
          <UL>
            <li><b>Base</b> — build aerobic volume and running economy.</li>
            <li><b>Build I & II</b> — add threshold, VO2 work{isTrail ? ', hill strength' : ''} and race-specific pace.</li>
            <li><b>Peak (week {stats.peakWeek})</b> — highest volume and your longest run (~{metersToKm(stats.peakLong)} km).</li>
            <li><b>Taper (final 3 weeks)</b> — volume drops hard so you arrive fresh; the last 2 weeks are easy recovery running.</li>
            <li><b>Deload weeks</b> ({stats.deloads.join(', ') || '—'}) cut ~22% to let tissue adapt (3:1 rhythm).</li>
          </UL>
        </>
      ),
    },
    {
      id: 'method',
      icon: FlaskConical,
      title: 'The science behind it',
      body: (
        <>
          <H>Jack Daniels’ VDOT</H>
          <P>
            Your paces aren’t guesses. VDOT estimates your aerobic power from a recent race, then
            each training pace (Easy, Marathon, Threshold, Interval) is derived from the oxygen cost
            of running — the method elite coaches use.
          </P>
          <H>80/20 polarization</H>
          <P>
            Roughly 80% of your running is easy and ~20% is quality. This builds a huge aerobic base
            with low injury risk — the single most consistent finding in endurance science.
          </P>
          <H>3:1 periodization</H>
          <P>
            Three weeks of progressive load then one easier “deload” week. You adapt during the easy
            weeks, not the hard ones — stacking hard weeks endlessly leads to injury and burnout.
          </P>
          {isTrail && (
            <>
              <H>Trail specificity</H>
              <P>
                Because your race climbs {profile.elevationGainM} m, the plan adds weekly hill
                repeats for leg strength and prescribes vertical gain on your runs, so race-day
                climbs and descents feel familiar.
              </P>
            </>
          )}
        </>
      ),
    },
    {
      id: 'zones',
      icon: Gauge,
      title: 'Your pace zones',
      body: (
        <>
          <UL>
            {paces.zones.map((z) => (
              <li key={z.key}>
                <b>{z.label}</b> — {Math.floor(z.min_sec / 60)}:{String(Math.round(z.min_sec % 60)).padStart(2, '0')}–
                {Math.floor(z.max_sec / 60)}:{String(Math.round(z.max_sec % 60)).padStart(2, '0')}/km
              </li>
            ))}
          </UL>
          <P>
            Easy means conversational — if you can’t chat, slow down. Threshold is “comfortably
            hard”. Intervals are hard but short. On hills, run by <i>effort</i>, not pace.
          </P>
        </>
      ),
    },
    {
      id: 'daily',
      icon: Apple,
      title: 'Nutrition · everyday fuelling',
      body: (
        <>
          <P>
            Marathon training runs on carbohydrate. Think of food as part of the session, not an
            afterthought.
          </P>
          <H>Daily targets (per kg body weight)</H>
          <UL>
            <li><b>Carbs 5–7 g/kg</b> on easy days, <b>7–10 g/kg</b> on hard/long days.</li>
            <li><b>Protein 1.6–2.0 g/kg</b>, spread across meals (~20–40 g each).</li>
            <li><b>Fats</b> fill the rest — mostly unsaturated (olive oil, nuts, fish, avocado).</li>
          </UL>
          <H>Build meals around</H>
          <UL>
            <li>Quality carbs: oats, rice, potatoes, pasta, wholegrain bread, fruit.</li>
            <li>Lean protein: eggs, chicken, fish, dairy, legumes, tofu.</li>
            <li>Colour: vegetables and fruit for micronutrients and recovery.</li>
          </UL>
          <P>Iron, vitamin D and calcium matter for runners — get bloods checked if you feel flat.</P>
        </>
      ),
    },
    {
      id: 'longrun',
      icon: Zap,
      title: 'Nutrition · long run & quality days',
      body: (
        <>
          <H>Before (1–3 h prior)</H>
          <UL>
            <li>1–3 g/kg of easy carbs: toast + honey, banana, oats, a bagel.</li>
            <li>Low fat/fibre to avoid stomach trouble. Coffee is fine if you’re used to it.</li>
          </UL>
          <H>During (runs over ~75–90 min)</H>
          <UL>
            <li><b>30–60 g carbs/hour</b> — gels, chews, sports drink or real food.</li>
            <li>Start fuelling by 45 min; don’t wait until you’re empty.</li>
            <li>Sip fluids to thirst; add electrolytes when it’s hot or you’re sweaty.</li>
          </UL>
          <H>After (the 30–60 min window)</H>
          <UL>
            <li><b>1.0–1.2 g/kg carbs + 0.3 g/kg protein</b> — chocolate milk, yoghurt + fruit, rice + chicken.</li>
            <li>Rehydrate with ~1.25–1.5 L per kg of body weight lost.</li>
          </UL>
          <P><b>Rule #1:</b> practise your exact race fuel on long runs. Never try anything new on race day.</P>
        </>
      ),
    },
    {
      id: 'raceweek',
      icon: Utensils,
      title: 'Nutrition · race week & carb-loading',
      body: (
        <>
          <P>
            During the taper you train less, so slightly reduce total calories — but <i>keep carbs
            high</i>. Then top up glycogen in the final days.
          </P>
          <H>Carb-load (2–3 days out)</H>
          <UL>
            <li><b>8–12 g/kg carbs per day</b> — rice, pasta, potatoes, bread, fruit, juice.</li>
            <li>Lower fat and fibre so you’re not heavy or bloated.</li>
            <li>Expect to gain 1–2 kg of water with stored glycogen — that’s fuel, not fat.</li>
          </UL>
          <H>Avoid in the last 2 days</H>
          <UL>
            <li>New foods, big salads/high-fibre, alcohol, very fatty or spicy meals.</li>
            <li>Stay well hydrated; include some sodium.</li>
          </UL>
        </>
      ),
    },
    {
      id: 'racemorning',
      icon: Apple,
      title: 'Nutrition · race morning & during',
      body: (
        <>
          <H>Breakfast (3 h before)</H>
          <UL>
            <li><b>1–4 g/kg carbs</b>, low fat/fibre: porridge, white toast + jam/honey, banana.</li>
            <li>Sip 5–10 ml/kg fluid up to ~2 h before, then small sips.</li>
            <li>Caffeine (3–6 mg/kg) ~45–60 min before helps — only if you’ve trained with it.</li>
          </UL>
          <H>During the marathon</H>
          <UL>
            <li><b>30–60 g carbs/hour</b>; trained guts can take up to <b>90 g/h</b> using mixed glucose+fructose.</li>
            <li>Plan it: e.g. a gel every ~30–40 min, from ~45 min in.</li>
            <li>Fluids <b>400–800 ml/h</b> to thirst; sodium <b>300–600 mg/h</b> when hot.</li>
            <li>Take the same products you rehearsed in training.</li>
          </UL>
        </>
      ),
    },
    {
      id: 'recovery',
      icon: Moon,
      title: 'Recovery & sleep',
      body: (
        <>
          <UL>
            <li>Refuel within an hour: carbs + protein + fluids.</li>
            <li><b>Sleep 7–9 h</b> — it’s where adaptation happens. Prioritise it over extra mileage.</li>
            <li>Easy days truly easy; take rest days fully off.</li>
            <li>Niggle for 3+ days or altering your gait? Back off and get it checked.</li>
          </UL>
        </>
      ),
    },
    {
      id: 'sync',
      icon: RefreshCw,
      title: 'How tracking works',
      body: (
        <>
          <P>
            Record a run in Strava → it writes to Apple Health → an iOS Shortcut posts it to your
            database → this app pulls it and matches it to the right session, even if you swapped
            days. Hit <b>Sync Health</b> on Today, or edit/move sessions in the Calendar anytime.
          </P>
          <P>Your plan and runs are stored on your device; the cloud copy is just a backup.</P>
        </>
      ),
    },
  ];

  return (
    <div className="safe-top px-5 pb-nav">
      <div className="flex items-center gap-2">
        <BookOpen size={24} className="text-mint" />
        <h1 className="text-3xl font-extrabold tracking-tight">Guide</h1>
      </div>
      <p className="mt-1 text-sm text-dim">Your plan, the science, and how to fuel it — documented.</p>

      <div className="mt-5 space-y-2.5">
        {sections.map(({ id, icon: Icon, title, body }) => {
          const isOpen = open === id;
          return (
            <div key={id} className="card overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : id)}
                className="press flex w-full items-center gap-3 p-4 text-left"
              >
                <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl" style={{ background: 'rgba(123,140,255,0.14)' }}>
                  <Icon size={18} className="text-mint" />
                </span>
                <span className="flex-1 font-bold">{title}</span>
                <ChevronDown
                  size={18}
                  className="flex-shrink-0 text-dim transition-transform"
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
                />
              </button>
              {isOpen && <div className="border-t border-border px-4 pb-4 pt-3">{body}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
