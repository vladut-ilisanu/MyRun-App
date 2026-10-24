// Supabase helper: cloud backup, run ingestion, and account auth.
// Credentials come only from localStorage (never the repo).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PlannedWorkout, Profile, SyncedWorkout } from '../types';
import { storage } from './storage';

let cached: { url: string; key: string; client: SupabaseClient } | null = null;

export function getClient(): SupabaseClient | null {
  const { url, key } = storage.loadSupabase();
  if (!url || !key) return null;
  if (cached && cached.url === url && cached.key === key) return cached.client;
  try {
    const client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
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

// ---- Auth -----------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
}

function appRedirect(): string {
  return window.location.origin + import.meta.env.BASE_URL;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const { data } = await client.auth.getSession();
    const u = data.session?.user;
    return u ? { id: u.id, email: u.email ?? '' } : null;
  } catch {
    return null;
  }
}

export function onAuthChange(cb: (user: AuthUser | null) => void): () => void {
  const client = getClient();
  if (!client) return () => {};
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    const u = session?.user;
    cb(u ? { id: u.id, email: u.email ?? '' } : null);
  });
  return () => data.subscription.unsubscribe();
}

export async function signUpEmail(email: string, password: string): Promise<ConnectionResult> {
  const client = getClient();
  if (!client) return { ok: false, message: 'Connect Supabase first.' };
  try {
    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: appRedirect() },
    });
    if (error) return { ok: false, message: error.message };
    if (data.user && !data.session)
      return { ok: true, message: 'Account created — check your email to confirm, then sign in.' };
    return { ok: true, message: 'Account created and signed in.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Sign-up failed.' };
  }
}

export async function signInEmail(email: string, password: string): Promise<ConnectionResult> {
  const client = getClient();
  if (!client) return { ok: false, message: 'Connect Supabase first.' };
  try {
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: 'Signed in.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Sign-in failed.' };
  }
}

export async function signInMagicLink(email: string): Promise<ConnectionResult> {
  const client = getClient();
  if (!client) return { ok: false, message: 'Connect Supabase first.' };
  try {
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: appRedirect() },
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: 'Magic link sent — open it on this device to sign in.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Could not send link.' };
  }
}

export async function signOut(): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.auth.signOut();
  } catch {
    /* ignore */
  }
}

// ---- Per-account plan backup ----------------------------------------------

/** Backup the plan + profile to the cloud, keyed by account (or the shared row). */
export async function backupPlan(
  profile: Profile,
  workouts: PlannedWorkout[],
  userId = 'default_user'
): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.from('user_plans').upsert({
      id: userId,
      profile,
      workouts,
      updated_at: new Date().toISOString(),
    });
  } catch {
    /* offline / paused project — ignore, local copy is intact */
  }
}

/** Pull a saved plan for this account (null if none yet). */
export async function fetchUserPlan(
  userId: string
): Promise<{ profile: Profile; workouts: PlannedWorkout[] } | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('user_plans')
      .select('profile, workouts')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data || !data.profile || !data.workouts) return null;
    return { profile: data.profile as Profile, workouts: data.workouts as PlannedWorkout[] };
  } catch {
    return null;
  }
}

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
