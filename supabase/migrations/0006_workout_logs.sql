-- Migration 0006: workout completion logs
-- Apply after 0005.
--
-- Lets the runner mark each scheduled session as done / skipped / partial /
-- replaced, with the actual distance, duration and post-session RPE. Feeds
-- the adaptation engine and the upcoming progress views.

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  workout_id text not null,
  workout_date date not null,
  status text not null check (status in ('done', 'skipped', 'partial', 'replaced')),
  actual_distance_meters int,
  actual_duration_seconds int,
  actual_rpe int check (actual_rpe between 0 and 10),
  notes text,
  logged_at timestamptz default now()
);

create unique index if not exists workout_logs_user_workout_idx
  on public.workout_logs (user_id, workout_id);

create index if not exists workout_logs_user_date_idx
  on public.workout_logs (user_id, workout_date desc);

alter table public.workout_logs enable row level security;

create policy "workout_logs_select_own"
  on public.workout_logs for select using (auth.uid() = user_id);

create policy "workout_logs_insert_own"
  on public.workout_logs for insert with check (auth.uid() = user_id);

create policy "workout_logs_update_own"
  on public.workout_logs for update using (auth.uid() = user_id);

create policy "workout_logs_delete_own"
  on public.workout_logs for delete using (auth.uid() = user_id);
