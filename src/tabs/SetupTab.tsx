import { useState } from 'react';
import { Copy, Check, Play, RefreshCw } from 'lucide-react';
import { useStore } from '../state/store';
import { storage } from '../lib/storage';
import { testConnection, type ConnectionResult } from '../lib/supabaseClient';
import { SCHEMA_SQL } from '../lib/schemaSql';
import { toISODate } from '../lib/format';
import type { Profile, RaceDistance } from '../types';

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
      /* clipboard blocked; user can still select text */
    }
    setDone(true);
    setTimeout(() => setDone(false), 1400);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 rounded-lg border border-border bg-bg px-2 py-1 text-xs text-mint"
    >
      {done ? <Check size={13} /> : <Copy size={13} />}
      {done ? 'Copied' : label}
    </button>
  );
}

const DISTANCES: RaceDistance[] = ['5K', '10K', 'Half Marathon', 'Marathon'];

export function SetupTab() {
  const { profile, regenerate, simulateRun, refreshSupabaseStatus } = useStore();

  // ---- plan form state ----
  const [form, setForm] = useState<Profile>(profile);
  const recent = secondsToHMS(form.recentRaceTimeSeconds);
  const goal = secondsToHMS(form.goalFinishTimeSeconds ?? 0);
  const [recentH, setRecentH] = useState(recent.h);
  const [recentM, setRecentM] = useState(recent.m);
  const [recentS, setRecentS] = useState(recent.s);
  const [goalH, setGoalH] = useState(goal.h);
  const [goalM, setGoalM] = useState(goal.m);
  const [goalS, setGoalS] = useState(goal.s);

  // ---- supabase form state ----
  const saved = storage.loadSupabase();
  const [supaUrl, setSupaUrl] = useState(saved.url);
  const [supaKey, setSupaKey] = useState(saved.key);
  const [conn, setConn] = useState<ConnectionResult | null>(null);
  const [testing, setTesting] = useState(false);

  // ---- simulate run state ----
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
    setSimMsg(`Simulated ${km} km run on ${simDate} — check the Today tab.`);
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
    'w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-mint';
  const timeBox = 'w-14 rounded-xl border border-border bg-bg px-2 py-2 text-center text-sm';

  return (
    <div className="safe-top px-5 pb-28">
      <h1 className="text-2xl font-bold">Setup &amp; Sync</h1>

      {/* Plan customizer */}
      <section className="mt-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/40">Plan</h2>
        <div className="mt-2 space-y-3 rounded-2xl border border-border bg-card p-4">
          <label className="block text-xs text-white/50">
            Goal race name
            <input
              className={input}
              value={form.goalRaceName}
              onChange={(e) => update('goalRaceName', e.target.value)}
            />
          </label>
          <label className="block text-xs text-white/50">
            Goal race date
            <input
              type="date"
              className={input}
              value={form.goalRaceDate}
              onChange={(e) => update('goalRaceDate', e.target.value)}
            />
          </label>

          <div className="text-xs text-white/50">
            Recent race
            <div className="mt-1 flex gap-2">
              <select
                className={input + ' flex-1'}
                value={form.recentRaceDistance}
                onChange={(e) => update('recentRaceDistance', e.target.value as RaceDistance)}
              >
                {DISTANCES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input className={timeBox} value={recentH} onChange={(e) => setRecentH(e.target.value)} inputMode="numeric" />
              <span>:</span>
              <input className={timeBox} value={recentM} onChange={(e) => setRecentM(e.target.value)} inputMode="numeric" />
              <span>:</span>
              <input className={timeBox} value={recentS} onChange={(e) => setRecentS(e.target.value)} inputMode="numeric" />
              <span className="text-[11px] text-white/35">h : m : s</span>
            </div>
          </div>

          <div className="text-xs text-white/50">
            Goal finish time (optional)
            <div className="mt-1 flex items-center gap-2">
              <input className={timeBox} value={goalH} onChange={(e) => setGoalH(e.target.value)} inputMode="numeric" />
              <span>:</span>
              <input className={timeBox} value={goalM} onChange={(e) => setGoalM(e.target.value)} inputMode="numeric" />
              <span>:</span>
              <input className={timeBox} value={goalS} onChange={(e) => setGoalS(e.target.value)} inputMode="numeric" />
              <span className="text-[11px] text-white/35">leave 0 to use prediction</span>
            </div>
          </div>

          <div className="flex gap-3">
            <label className="flex-1 text-xs text-white/50">
              Runs / week
              <select
                className={input}
                value={form.runsPerWeek}
                onChange={(e) => update('runsPerWeek', Number(e.target.value) as Profile['runsPerWeek'])}
              >
                {[3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex-1 text-xs text-white/50">
              Current km / week
              <input
                className={input}
                inputMode="numeric"
                value={form.currentWeeklyMileageKm}
                onChange={(e) => update('currentWeeklyMileageKm', Number(e.target.value) || 0)}
              />
            </label>
          </div>

          <label className="block text-xs text-white/50">
            Long run day
            <select
              className={input}
              value={form.longRunDay}
              onChange={(e) => update('longRunDay', e.target.value as Profile['longRunDay'])}
            >
              <option value="Saturday">Saturday</option>
              <option value="Sunday">Sunday</option>
            </select>
          </label>

          <button
            onClick={onRegenerate}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-mint py-3 font-semibold text-bg"
          >
            <RefreshCw size={16} /> Regenerate Plan
          </button>
        </div>
      </section>

      {/* Supabase */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/40">
          Supabase connection
        </h2>
        <div className="mt-2 space-y-3 rounded-2xl border border-border bg-card p-4">
          <label className="block text-xs text-white/50">
            Project URL
            <input
              className={input}
              placeholder="https://xxxx.supabase.co"
              value={supaUrl}
              onChange={(e) => setSupaUrl(e.target.value)}
            />
          </label>
          <label className="block text-xs text-white/50">
            Anon public key
            <input
              className={input}
              placeholder="eyJhbGciOi..."
              value={supaKey}
              onChange={(e) => setSupaKey(e.target.value)}
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={runTest}
              className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-sm"
            >
              <RefreshCw size={14} className={testing ? 'spin text-mint' : 'text-mint'} />
              Save &amp; test
            </button>
            {conn && (
              <span className={`text-xs ${conn.ok ? 'text-mint' : 'text-amber'}`}>
                {conn.ok ? '● ' : '○ '}
                {conn.message}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-bg p-3">
            <span className="text-xs text-white/50">Database schema SQL</span>
            <CopyButton text={SCHEMA_SQL} label="Copy SQL" />
          </div>
        </div>
      </section>

      {/* iOS Shortcut generator */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/40">
          iOS Shortcut — Get Contents of URL
        </h2>
        <div className="mt-2 space-y-3 rounded-2xl border border-border bg-card p-4 text-xs">
          <Field label="URL (POST)" value={postUrl} />
          <div className="rounded-xl border border-border bg-bg p-3">
            <div className="mb-2 font-semibold text-white/60">Headers</div>
            <HeaderRow k="apikey" v={keyShown} />
            <HeaderRow k="Authorization" v={`Bearer ${keyShown}`} />
            <HeaderRow k="Content-Type" v="application/json" />
            <HeaderRow k="Prefer" v="resolution=merge-duplicates" />
          </div>
          <div className="rounded-xl border border-border bg-bg p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-white/60">Request body (JSON)</span>
              <CopyButton text={payload} />
            </div>
            <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-white/70">
              {payload}
            </pre>
          </div>
        </div>
      </section>

      {/* Simulate */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/40">
          Test the pipeline
        </h2>
        <div className="mt-2 space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex gap-2">
            <label className="flex-1 text-xs text-white/50">
              Distance (km)
              <input className={input} value={simDist} onChange={(e) => setSimDist(e.target.value)} inputMode="decimal" />
            </label>
            <label className="flex-1 text-xs text-white/50">
              Duration (min)
              <input className={input} value={simMin} onChange={(e) => setSimMin(e.target.value)} inputMode="numeric" />
            </label>
          </div>
          <label className="block text-xs text-white/50">
            Date
            <input type="date" className={input} value={simDate} onChange={(e) => setSimDate(e.target.value)} />
          </label>
          <button
            onClick={() => void onSimulate()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-mint/40 bg-mint/10 py-3 font-semibold text-mint"
          >
            <Play size={16} /> Simulate Apple Health Run
          </button>
          {simMsg && <div className="text-xs text-mint">{simMsg}</div>}
        </div>
      </section>

      <p className="mt-6 text-center text-[11px] text-white/25">
        RunnaPulse · data stays on your device; Supabase is an optional cloud backup.
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-semibold text-white/60">{label}</span>
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
