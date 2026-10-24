import { useState } from 'react';
import { Copy, Check, Play, RefreshCw, Database, Smartphone } from 'lucide-react';
import { useStore } from '../state/store';
import { storage } from '../lib/storage';
import { testConnection, type ConnectionResult } from '../lib/supabaseClient';
import { SCHEMA_SQL } from '../lib/schemaSql';
import { toISODate } from '../lib/format';
import { Slider } from '../components/Slider';
import type { Profile, RaceDistance, RaceType } from '../types';

function hmsToSeconds(h: string, m: string, s: string): number {
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
}
function secondsToHMS(total: number): { h: string; m: string; s: string } {
  const t = Math.max(0, Math.round(total));
  return {
    h: String(Math.floor(t / 3600)),
    m: String(Math.floor((t % 3600) / 60)),
    s: String(t % 60),
  };
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard blocked */
    }
    setDone(true);
    setTimeout(() => setDone(false), 1400);
  };
  return (
    <button
      onClick={copy}
      className="press flex items-center gap-1 rounded-lg bg-bg px-2.5 py-1.5 text-xs font-semibold text-mint"
      style={{ border: '1px solid #242430' }}
    >
      {done ? <Check size={13} /> : <Copy size={13} />}
      {label && (done ? 'Copied' : label)}
    </button>
  );
}

const DISTANCES: RaceDistance[] = ['5K', '10K', 'Half Marathon', 'Marathon'];

export function SetupTab() {
  const { profile, regenerate, simulateRun, refreshSupabaseStatus } = useStore();

  const [form, setForm] = useState<Profile>(profile);
  const recent = secondsToHMS(form.recentRaceTimeSeconds);
  const goal = secondsToHMS(form.goalFinishTimeSeconds ?? 0);
  const [recentH, setRecentH] = useState(recent.h);
  const [recentM, setRecentM] = useState(recent.m);
  const [recentS, setRecentS] = useState(recent.s);
  const [goalH, setGoalH] = useState(goal.h);
  const [goalM, setGoalM] = useState(goal.m);
  const [goalS, setGoalS] = useState(goal.s);

  const saved = storage.loadSupabase();
  const [supaUrl, setSupaUrl] = useState(saved.url);
  const [supaKey, setSupaKey] = useState(saved.key);
  const [conn, setConn] = useState<ConnectionResult | null>(null);
  const [testing, setTesting] = useState(false);

  const [simDist, setSimDist] = useState('21.1');
  const [simMin, setSimMin] = useState('110');
  const [simDate, setSimDate] = useState(toISODate(new Date()));
  const [simMsg, setSimMsg] = useState('');

  const update = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onRegenerate = () => {
    const next: Profile = {
      ...form,
      recentRaceTimeSeconds: hmsToSeconds(recentH, recentM, recentS),
      goalFinishTimeSeconds:
        hmsToSeconds(goalH, goalM, goalS) > 0 ? hmsToSeconds(goalH, goalM, goalS) : null,
    };
    setForm(next);
    regenerate(next);
  };

  const saveSupabase = () => {
    storage.saveSupabase(supaUrl.trim().replace(/\/+$/, ''), supaKey.trim());
    refreshSupabaseStatus();
    setConn(null);
  };

  const runTest = async () => {
    saveSupabase();
    setTesting(true);
    setConn(await testConnection());
    setTesting(false);
  };

  const onSimulate = async () => {
    const km = Number(simDist.replace(',', '.'));
    const sec = (Number(simMin) || 0) * 60;
    if (!km || !sec) {
      setSimMsg('Enter a distance and duration.');
      return;
    }
    await simulateRun(km, sec, simDate);
    setSimMsg(`Simulated ${km} km on ${simDate} — check the Today tab.`);
    setTimeout(() => setSimMsg(''), 3000);
  };

  const cleanUrl = supaUrl.trim().replace(/\/+$/, '');
  const postUrl = `${cleanUrl || 'https://YOUR_PROJECT.supabase.co'}/rest/v1/synced_workouts?on_conflict=external_id`;
  const keyShown = supaKey || 'YOUR_SUPABASE_ANON_KEY';
  const payload = `{
  "local_date": "[Workouts > Start Date, ISO 8601, time off]",
  "duration_seconds": "[Workouts > Duration in seconds]",
  "distance_meters": "[Workouts > Distance]",
  "external_id": "[Start Date]_[Distance]_[Duration]"
}`;

  const input =
    'mt-1 w-full rounded-xl bg-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-mint';
  const inputStyle = { border: '1px solid #242430' } as const;
  const timeBox = 'w-14 rounded-xl bg-bg px-2 py-2.5 text-center text-sm tabular';
  const sectionTitle = 'mb-2 text-xs font-bold uppercase tracking-wider text-dim';
  const label = 'block text-xs font-medium text-dim';

  return (
    <div className="safe-top px-5 pb-28">
      <h1 className="text-3xl font-extrabold tracking-tight">Setup</h1>

      {/* Plan */}
      <section className="mt-6">
        <h2 className={sectionTitle}>Your plan</h2>
        <div className="card space-y-3 p-4">
          <label className={label}>
            Goal race name
            <input className={input} style={inputStyle} value={form.goalRaceName} onChange={(e) => update('goalRaceName', e.target.value)} />
          </label>
          <label className={label}>
            Goal race date
            <input type="date" className={input} style={inputStyle} value={form.goalRaceDate} onChange={(e) => update('goalRaceDate', e.target.value)} />
          </label>

          <div className={label}>
            Terrain
            <div className="mt-2 flex gap-2">
              {(['Road', 'Semi-trail', 'Trail'] as RaceType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => update('raceType', t)}
                  className="press flex-1 rounded-xl py-2.5 text-sm font-semibold"
                  style={{
                    background: form.raceType === t ? 'rgba(0,245,160,0.14)' : '#0A0A12',
                    border: form.raceType === t ? '1px solid #00F5A0' : '1px solid #272734',
                    color: form.raceType === t ? '#00F5A0' : '#fff',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          {form.raceType !== 'Road' && (
            <div className={label}>
              <div className="flex items-baseline justify-between">
                <span>Total elevation gain</span>
                <span className="tabular text-base font-bold text-mint">{form.elevationGainM} m</span>
              </div>
              <div className="mt-2">
                <Slider value={form.elevationGainM} min={0} max={3000} step={50} onChange={(v) => update('elevationGainM', v)} />
              </div>
            </div>
          )}

          <div className={label}>
            Recent race
            <select
              className={input}
              style={inputStyle}
              value={form.recentRaceDistance}
              onChange={(e) => update('recentRaceDistance', e.target.value as RaceDistance)}
            >
              {DISTANCES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <div className="mt-2 flex items-center gap-2">
              <input className={timeBox} style={inputStyle} value={recentH} onChange={(e) => setRecentH(e.target.value)} inputMode="numeric" />
              <span className="text-dim">:</span>
              <input className={timeBox} style={inputStyle} value={recentM} onChange={(e) => setRecentM(e.target.value)} inputMode="numeric" />
              <span className="text-dim">:</span>
              <input className={timeBox} style={inputStyle} value={recentS} onChange={(e) => setRecentS(e.target.value)} inputMode="numeric" />
              <span className="text-[11px] text-dim">h : m : s</span>
            </div>
          </div>

          <div className={label}>
            Goal finish time (optional)
            <div className="mt-1 flex items-center gap-2">
              <input className={timeBox} style={inputStyle} value={goalH} onChange={(e) => setGoalH(e.target.value)} inputMode="numeric" />
              <span className="text-dim">:</span>
              <input className={timeBox} style={inputStyle} value={goalM} onChange={(e) => setGoalM(e.target.value)} inputMode="numeric" />
              <span className="text-dim">:</span>
              <input className={timeBox} style={inputStyle} value={goalS} onChange={(e) => setGoalS(e.target.value)} inputMode="numeric" />
              <span className="text-[11px] text-dim">0 = use prediction</span>
            </div>
          </div>

          <div className={label}>
            <div className="flex items-baseline justify-between">
              <span>Current weekly distance</span>
              <span className="tabular text-base font-bold text-mint">{form.currentWeeklyMileageKm} km</span>
            </div>
            <div className="mt-2">
              <Slider value={form.currentWeeklyMileageKm} min={10} max={120} step={1} onChange={(v) => update('currentWeeklyMileageKm', v)} />
            </div>
          </div>
          <div className={label}>
            Runs per week
            <div className="mt-2 flex gap-2">
              {[3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  onClick={() => update('runsPerWeek', n as Profile['runsPerWeek'])}
                  className="press flex-1 rounded-xl py-2.5 text-base font-bold"
                  style={{
                    background: form.runsPerWeek === n ? 'rgba(0,245,160,0.14)' : '#0A0A12',
                    border: form.runsPerWeek === n ? '1px solid #00F5A0' : '1px solid #272734',
                    color: form.runsPerWeek === n ? '#00F5A0' : '#fff',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <label className={label}>
            Long run day
            <select className={input} style={inputStyle} value={form.longRunDay} onChange={(e) => update('longRunDay', e.target.value as Profile['longRunDay'])}>
              <option value="Saturday">Saturday</option>
              <option value="Sunday">Sunday</option>
            </select>
          </label>

          <button
            onClick={onRegenerate}
            className="press flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-black"
            style={{ background: 'linear-gradient(135deg, #00F5A0, #22D3EE)' }}
          >
            <RefreshCw size={16} strokeWidth={2.6} /> Regenerate Plan
          </button>
        </div>
      </section>

      {/* Supabase */}
      <section className="mt-7">
        <h2 className={sectionTitle}>
          <span className="inline-flex items-center gap-1.5">
            <Database size={13} /> Cloud sync (Supabase)
          </span>
        </h2>
        <div className="card space-y-3 p-4">
          <label className={label}>
            Project URL
            <input className={input} style={inputStyle} placeholder="https://xxxx.supabase.co" value={supaUrl} onChange={(e) => setSupaUrl(e.target.value)} />
          </label>
          <label className={label}>
            Anon public key
            <input className={input} style={inputStyle} placeholder="eyJhbGciOi..." value={supaKey} onChange={(e) => setSupaKey(e.target.value)} />
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={runTest}
              className="press flex items-center gap-2 rounded-xl bg-bg px-3 py-2.5 text-sm font-semibold"
              style={inputStyle}
            >
              <RefreshCw size={14} className={testing ? 'spin text-mint' : 'text-mint'} />
              Save &amp; test
            </button>
            {conn && (
              <span className={`text-xs font-medium ${conn.ok ? 'text-mint' : 'text-amber'}`}>
                {conn.ok ? '● ' : '○ '}
                {conn.message}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between rounded-xl bg-bg p-3" style={inputStyle}>
            <span className="text-xs font-medium text-dim">Database schema SQL</span>
            <CopyButton text={SCHEMA_SQL} label="Copy SQL" />
          </div>
        </div>
      </section>

      {/* iOS Shortcut */}
      <section className="mt-7">
        <h2 className={sectionTitle}>
          <span className="inline-flex items-center gap-1.5">
            <Smartphone size={13} /> iOS Shortcut — Get Contents of URL
          </span>
        </h2>
        <div className="card space-y-3 p-4 text-xs">
          <Field label="URL (POST)" value={postUrl} />
          <div className="rounded-xl bg-bg p-3" style={inputStyle}>
            <div className="mb-2 font-bold text-white/70">Headers</div>
            <HeaderRow k="apikey" v={keyShown} />
            <HeaderRow k="Authorization" v={`Bearer ${keyShown}`} />
            <HeaderRow k="Content-Type" v="application/json" />
            <HeaderRow k="Prefer" v="resolution=merge-duplicates" />
          </div>
          <div className="rounded-xl bg-bg p-3" style={inputStyle}>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-bold text-white/70">Request body (JSON)</span>
              <CopyButton text={payload} />
            </div>
            <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-white/70">
              {payload}
            </pre>
          </div>
        </div>
      </section>

      {/* Simulate */}
      <section className="mt-7">
        <h2 className={sectionTitle}>Test the pipeline</h2>
        <div className="card space-y-3 p-4">
          <div className="flex gap-2">
            <label className={`${label} flex-1`}>
              Distance (km)
              <input className={input} style={inputStyle} value={simDist} onChange={(e) => setSimDist(e.target.value)} inputMode="decimal" />
            </label>
            <label className={`${label} flex-1`}>
              Duration (min)
              <input className={input} style={inputStyle} value={simMin} onChange={(e) => setSimMin(e.target.value)} inputMode="numeric" />
            </label>
          </div>
          <label className={label}>
            Date
            <input type="date" className={input} style={inputStyle} value={simDate} onChange={(e) => setSimDate(e.target.value)} />
          </label>
          <button
            onClick={() => void onSimulate()}
            className="press flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-mint"
            style={{ background: 'rgba(0,245,160,0.12)', border: '1px solid rgba(0,245,160,0.4)' }}
          >
            <Play size={16} /> Simulate Apple Health Run
          </button>
          {simMsg && <div className="text-xs font-medium text-mint">{simMsg}</div>}
        </div>
      </section>

      <p className="mt-7 text-center text-[11px] text-dim">
        MyRun · your data lives on this device; Supabase is an optional cloud backup.
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-bg p-3" style={{ border: '1px solid #242430' }}>
      <div className="mb-1 flex items-center justify-between">
        <span className="font-bold text-white/70">{label}</span>
        <CopyButton text={value} />
      </div>
      <div className="break-all font-mono text-[11px] text-white/70">{value}</div>
    </div>
  );
}

function HeaderRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1 break-all">
        <span className="text-mint">{k}</span>
        <span className="text-white/40"> : </span>
        <span className="font-mono text-white/70">{v}</span>
      </div>
      <CopyButton text={v} label="" />
    </div>
  );
}
