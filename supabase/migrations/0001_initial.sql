-- Nordic Run schema
-- Run this in your Supabase SQL editor or via the Supabase CLI.

create extension if not exists "uuid-ossp";

-- Profiles: 1-1 with auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  sex text check (sex in ('male', 'female', 'other')),
  birth_year int,
  experience_years numeric not null default 0,
  current_weekly_km numeric not null default 0,
  days_per_week int not null default 4,
  has_done_intervals boolean not null default false,
  goal text not null default 'progress' check (goal in ('progress', 'perform')),
  vdot numeric,
  onboarded boolean not null default false,
  track_cycle boolean not null default false,
  time_constraints_min int,
  locale text not null default 'fr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Recent race results (used to compute VDOT)
create table if not exists public.race_results (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
  distance_meters int not null,
  time_seconds int not null,
  raced_on date not null,
  computed_vdot numeric,
  created_at timestamptz not null default now()
);

-- Target races
create table if not exists public.target_races (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  distance_meters int not null,
  race_date date not null,
  goal_time_seconds int,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

-- Training block JSON (4-week plan, regenerated on changes)
create table if not exists public.training_blocks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
  start_date date not null,
  end_date date not null,
  target_race_id uuid references public.target_races on delete set null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- Daily feedback (fatigue, pain, time available, cycle)
create table if not exists public.daily_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
  log_date date not null,
  fatigue int check (fatigue between 1 and 5),
  pain int check (pain between 0 and 3),
  pain_location text,
  available_minutes int,
  notes text,
  workout_completed boolean,
  perceived_effort int check (perceived_effort between 1 and 10),
  actual_distance_meters int,
  actual_duration_seconds int,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

-- Menstrual cycle log (opt-in)
create table if not exists public.cycle_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
  period_start date not null,
  period_end date,
  cycle_length_days int default 28,
  symptoms text[],
  notes text,
  created_at timestamptz not null default now()
);

-- Subscription state (synced from Stripe)
create table if not exists public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references auth.users on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'trialing',
  trial_end timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.race_results enable row level security;
alter table public.target_races enable row level security;
alter table public.training_blocks enable row level security;
alter table public.daily_logs enable row level security;
alter table public.cycle_logs enable row level security;
alter table public.subscriptions enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own races" on public.race_results for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own targets" on public.target_races for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own blocks" on public.training_blocks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own logs" on public.daily_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own cycle" on public.cycle_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own sub" on public.subscriptions for select using (auth.uid() = user_id);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.subscriptions (user_id, status, trial_end)
  values (new.id, 'trialing', now() + interval '14 days');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();
