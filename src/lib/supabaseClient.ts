// Thin Supabase helper. Credentials come only from localStorage (never the repo).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PlannedWorkout, Profile, SyncedWorkout } from '../types';
import { storage } from './storage';

let cached: { url: string; key: string; client: SupabaseClient } | null = null;

export function getClient(): SupabaseClient | null {
  const { url, key } = storage.loadSupabase();
  if (!url || !key) return null;
  if (cached && cached.url === url && cached.key === key) return cached.client;
  try {
    const client = createClient(url, key, { auth: { persistSession: false } });
    cached = { url, key, client };
    return client;
  } catch {
    return null;
  }
}

export function isConfigured(): boolean {
  const { url, key } = storage.loadSupabase();
  return Boolean(url && key);
}

export interface ConnectionResult {
  ok: boolean;
  message: string;
}

export async function testConnection(): Promise<ConnectionResult> {
  const client = getClient();
  if (!client) return { ok: false, message: 'Enter your Supabase URL and anon key first.' };
  try {
    const { error } = await client.from('synced_workouts').select('external_id').limit(1);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: 'Connected — tables reachable.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Connection failed.' };
  }
}

/** Backup the plan + profile to the cloud (best-effort; local stays authoritative). */
export async function backupPlan(profile: Profile, workouts: PlannedWorkout[]): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.from('user_plans').upsert({
      id: 'default_user',
      profile,
      workouts,
      updated_at: new Date().toISOString(),
    });
  } catch {
    /* offline / paused project — ignore, local copy is intact */
  }
}

/** Pull synced runs that arrived from the iOS Shortcut. */
export async function fetchSyncedWorkouts(): Promise<SyncedWorkout[]> {
  const client = getClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('synced_workouts')
      .select('*')
      .order('local_date', { ascending: false })
      .limit(200);
    if (error || !data) return [];
    return data as SyncedWorkout[];
  } catch {
    return [];
  }
}

/** Insert one synced run (used by the "Simulate Apple Health Run" button). */
export async function insertSyncedWorkout(run: SyncedWorkout): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  try {
    const { error } = await client
      .from('synced_workouts')
      .upsert(run, { onConflict: 'external_id' });
    return !error;
  } catch {
    return false;
  }
}
