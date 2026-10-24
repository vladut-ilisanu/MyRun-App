// The Supabase schema, embedded so the Setup tab can offer a one-click "Copy SQL".
export const SCHEMA_SQL = `create extension if not exists "uuid-ossp";

-- 1. Active plan & profile backup (localStorage stays the source of truth).
create table if not exists public.user_plans (
  id text primary key default 'default_user',
  profile jsonb not null,
  workouts jsonb not null,
  updated_at timestamptz default now()
);

-- 2. Apple Health runs posted by the iOS Shortcut.
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
  on public.synced_workouts for all to anon using (true) with check (true);`;
