-- RunnaPulse — Supabase schema. Paste into Supabase SQL Editor and Run.
create extension if not exists "uuid-ossp";

-- 1. Stores the active generated training plan & profile so iOS cache eviction
--    (or the free-tier 7-day pause) never loses user data. localStorage remains
--    the source of truth; this is the cloud backup.
create table if not exists public.user_plans (
  id text primary key default 'default_user',
  profile jsonb not null,
  workouts jsonb not null,
  updated_at timestamptz default now()
);

-- 2. Receives Apple Health runs directly from the iOS Shortcut POST request.
create table if not exists public.synced_workouts (
  id uuid primary key default uuid_generate_v4(),
  external_id text unique not null,
  local_date date not null,
  start_time timestamptz default now(),
  duration_seconds numeric not null,
  distance_meters numeric not null,
  avg_heart_rate numeric,
  active_calories numeric,
  source text default 'Strava -> Apple Health',
  matched_workout_id text,
  raw_payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.user_plans enable row level security;
alter table public.synced_workouts enable row level security;

create policy "Allow anon access for personal user_plans"
  on public.user_plans for all to anon using (true) with check (true);

create policy "Allow anon access for personal synced_workouts"
  on public.synced_workouts for all to anon using (true) with check (true);

-- OPTIONAL hardening (improvement #4): because the anon key + permissive policy
-- make this endpoint world-writable, you may add a shared secret column and only
-- accept rows whose secret matches one you keep private in the iOS Shortcut.
-- Uncomment to enable:
--
-- alter table public.synced_workouts add column if not exists ingest_secret text;
-- drop policy "Allow anon access for personal synced_workouts" on public.synced_workouts;
-- create policy "anon read" on public.synced_workouts for select to anon using (true);
-- create policy "anon insert with secret" on public.synced_workouts for insert to anon
--   with check (ingest_secret = 'PUT-YOUR-OWN-LONG-RANDOM-STRING-HERE');
