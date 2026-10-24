import { useState, type ReactNode } from 'react';
import { ArrowRight, ArrowLeft, Activity, Check } from 'lucide-react';
import type { Profile, RaceDistance } from '../types';
import { DEFAULT_PROFILE } from '../lib/storage';
import { weeksUntilRace } from '../lib/planGenerator';
import { formatFinishTime } from '../lib/format';

const DISTANCES: RaceDistance[] = ['5K', '10K', 'Half Marathon', 'Marathon'];

function hms(total: number) {
  const t = Math.max(0, Math.round(total));
  return { h: Math.floor(t / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
}

export function Onboarding({ onComplete }: { onComplete: (p: Profile) => void }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Profile>({ ...DEFAULT_PROFILE, recentRaceTimeSeconds: 0 });

  const r = hms(draft.recentRaceTimeSeconds);
  const [rh, setRh] = useState(String(r.h));
  const [rm, setRm] = useState(String(r.m || ''));
  const [rs, setRs] = useState(String(r.s || ''));
  const g = hms(draft.goalFinishTimeSeconds ?? 0);
  const [gh, setGh] = useState(String(g.h || ''));
  const [gm, setGm] = useState(String(g.m || ''));
  const [gs, setGs] = useState(String(g.s || ''));

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const recentSecs = (Number(rh) || 0) * 3600 + (Number(rm) || 0) * 60 + (Number(rs) || 0);
  const goalSecs = (Number(gh) || 0) * 3600 + (Number(gm) || 0) * 60 + (Number(gs) || 0);

  const TOTAL = 5; // steps 1..5 (0 is welcome)
  const weeks = weeksUntilRace(draft.goalRaceDate);

  const canNext = (): boolean => {
    if (step === 2) return recentSecs > 0;
    if (step === 3) return draft.currentWeeklyMileageKm > 0;
    return true;
  };

  const finish = () => {
    onComplete({
      ...draft,
      recentRaceTimeSeconds: recentSecs,
      goalFinishTimeSeconds: goalSecs > 0 ? goalSecs : null,
    });
  };

  const input =
    'mt-2 w-full rounded-xl bg-card px-4 py-3 text-base outline-none focus:border-mint';
  const inputStyle = { border: '1px solid #242430' } as const;
  const timeBox = 'w-16 rounded-xl bg-card px-2 py-3 text-center text-lg tabular';

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      {/* progress */}
      {step > 0 && (
        <div className="safe-top flex gap-1.5 px-5">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{ background: i < step ? '#00F5A0' : '#242430' }}
            />
          ))}
        </div>
      )}

      <div className={`flex-1 overflow-y-auto px-6 ${step === 0 ? 'safe-top' : 'pt-8'} pb-32`}>
        {step === 0 && (
          <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
            <div
              className="grid h-20 w-20 place-items-center rounded-3xl"
              style={{ background: 'linear-gradient(135deg, #00F5A0, #22D3EE)' }}
            >
              <Activity size={40} color="#061012" strokeWidth={2.5} />
            </div>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight">RunnaPulse</h1>
            <p className="mt-3 max-w-xs text-base text-dim">
              A documented, science-based marathon plan built around your race date and your
              current fitness. Let’s set yours up.
            </p>
          </div>
        )}

        {step === 1 && (
          <Q title="What are you training for?" sub="Your goal race and its date.">
            <label className="block text-sm font-medium text-dim">
              Race name
              <input className={input} style={inputStyle} value={draft.goalRaceName} onChange={(e) => set('goalRaceName', e.target.value)} />
            </label>
            <label className="mt-4 block text-sm font-medium text-dim">
              Race date
              <input type="date" className={input} style={inputStyle} value={draft.goalRaceDate} onChange={(e) => set('goalRaceDate', e.target.value)} />
            </label>
            <div className="mt-4 rounded-xl bg-mint/10 px-4 py-3 text-sm text-mint">
              That’s a <b>{weeks}-week</b> training block.
            </div>
          </Q>
        )}

        {step === 2 && (
          <Q title="How fit are you right now?" sub="Your most recent race — this sets your exact training paces (VDOT).">
            <label className="block text-sm font-medium text-dim">
              Recent race distance
              <select className={input} style={inputStyle} value={draft.recentRaceDistance} onChange={(e) => set('recentRaceDistance', e.target.value as RaceDistance)}>
                {DISTANCES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <div className="mt-4 text-sm font-medium text-dim">Finish time</div>
            <div className="mt-2 flex items-center gap-2">
              <input className={timeBox} style={inputStyle} value={rh} onChange={(e) => setRh(e.target.value)} inputMode="numeric" placeholder="h" />
              <span className="text-dim">:</span>
              <input className={timeBox} style={inputStyle} value={rm} onChange={(e) => setRm(e.target.value)} inputMode="numeric" placeholder="m" />
              <span className="text-dim">:</span>
              <input className={timeBox} style={inputStyle} value={rs} onChange={(e) => setRs(e.target.value)} inputMode="numeric" placeholder="s" />
            </div>
            {recentSecs === 0 && <div className="mt-3 text-xs text-amber">Enter your finish time to continue.</div>}
          </Q>
        )}

        {step === 3 && (
          <Q title="Your current running" sub="So the plan starts where you actually are, then builds safely.">
            <label className="block text-sm font-medium text-dim">
              Current weekly distance (km)
              <input className={input} style={inputStyle} inputMode="numeric" value={draft.currentWeeklyMileageKm || ''} onChange={(e) => set('currentWeeklyMileageKm', Number(e.target.value) || 0)} />
            </label>
            <div className="mt-5 text-sm font-medium text-dim">Runs per week</div>
            <div className="mt-2 flex gap-2">
              {[3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  onClick={() => set('runsPerWeek', n as Profile['runsPerWeek'])}
                  className="press flex-1 rounded-xl py-3 text-lg font-bold"
                  style={{
                    background: draft.runsPerWeek === n ? 'rgba(0,245,160,0.14)' : '#15151B',
                    border: draft.runsPerWeek === n ? '1px solid #00F5A0' : '1px solid #242430',
                    color: draft.runsPerWeek === n ? '#00F5A0' : '#fff',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </Q>
        )}

        {step === 4 && (
          <Q title="A couple of preferences" sub="When you like to do your long run, and an optional goal time.">
            <div className="text-sm font-medium text-dim">Long run day</div>
            <div className="mt-2 flex gap-2">
              {(['Saturday', 'Sunday'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => set('longRunDay', d)}
                  className="press flex-1 rounded-xl py-3 font-semibold"
                  style={{
                    background: draft.longRunDay === d ? 'rgba(0,245,160,0.14)' : '#15151B',
                    border: draft.longRunDay === d ? '1px solid #00F5A0' : '1px solid #242430',
                    color: draft.longRunDay === d ? '#00F5A0' : '#fff',
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="mt-5 text-sm font-medium text-dim">
              Goal finish time <span className="text-white/30">(optional)</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input className={timeBox} style={inputStyle} value={gh} onChange={(e) => setGh(e.target.value)} inputMode="numeric" placeholder="h" />
              <span className="text-dim">:</span>
              <input className={timeBox} style={inputStyle} value={gm} onChange={(e) => setGm(e.target.value)} inputMode="numeric" placeholder="m" />
              <span className="text-dim">:</span>
              <input className={timeBox} style={inputStyle} value={gs} onChange={(e) => setGs(e.target.value)} inputMode="numeric" placeholder="s" />
            </div>
            <div className="mt-2 text-xs text-dim">Leave blank to use your predicted time.</div>
          </Q>
        )}

        {step === 5 && (
          <Q title="Ready to build your plan" sub="Review your details — you can change any of this later in Setup.">
            <div className="card divide-y divide-border">
              <Row k="Goal race" v={`${draft.goalRaceName} · ${draft.goalRaceDate}`} />
              <Row k="Block length" v={`${weeks} weeks`} />
              <Row k="Recent race" v={`${draft.recentRaceDistance} · ${formatFinishTime(recentSecs)}`} />
              <Row k="Current volume" v={`${draft.currentWeeklyMileageKm} km/week`} />
              <Row k="Runs / week" v={`${draft.runsPerWeek}`} />
              <Row k="Long run" v={draft.longRunDay} />
              <Row k="Goal time" v={goalSecs > 0 ? formatFinishTime(goalSecs) : 'Predicted'} />
            </div>
          </Q>
        )}
      </div>

      {/* bottom actions */}
      <div className="tabbar flex items-center gap-3 px-6 pt-3">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="press grid h-12 w-12 place-items-center rounded-2xl bg-card"
            style={{ border: '1px solid #242430' }}
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        {step < 5 ? (
          <button
            onClick={() => canNext() && setStep((s) => s + 1)}
            disabled={!canNext()}
            className="press flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-black disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #00F5A0, #22D3EE)' }}
          >
            {step === 0 ? 'Get started' : 'Continue'} <ArrowRight size={18} strokeWidth={2.6} />
          </button>
        ) : (
          <button
            onClick={finish}
            className="press flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-black"
            style={{ background: 'linear-gradient(135deg, #00F5A0, #22D3EE)' }}
          >
            <Check size={18} strokeWidth={2.6} /> Build my plan
          </button>
        )}
      </div>
    </div>
  );
}

function Q({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div>
      <h1 className="text-3xl font-extrabold leading-tight tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-dim">{sub}</p>
      <div className="mt-7">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-dim">{k}</span>
      <span className="text-sm font-semibold">{v}</span>
    </div>
  );
}
