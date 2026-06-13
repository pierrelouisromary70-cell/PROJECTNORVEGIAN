-- Migration 0007: web-push notification subscriptions + per-user preferences
-- Apply after 0006.
--
-- Powers the evening feedback reminder (the loop that feeds the adaptation
-- engine AND the virtual-lactate calibration: no validation → no calibration).
-- Each browser/device the runner opts in from stores one push subscription.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  -- the PushSubscription endpoint URL is globally unique per device+browser
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  -- best-effort label so the runner can recognise the device in settings
  user_agent text,
  created_at timestamptz default now(),
  last_used_at timestamptz,
  -- set when a push fails with 404/410 so the cron can prune dead endpoints
  failed_at timestamptz
);

create unique index if not exists push_subscriptions_endpoint_idx
  on public.push_subscriptions (endpoint);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update using (auth.uid() = user_id);
create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete using (auth.uid() = user_id);

-- =====================================================================
-- Per-user notification preferences (on profiles)
-- =====================================================================

-- master switch for the evening "how do you feel / validate your session" push
alter table public.profiles
  add column if not exists notify_evening_feedback boolean not null default true;

-- local hour (0-23) at which the runner wants the evening reminder
alter table public.profiles
  add column if not exists notify_hour smallint not null default 20;

-- IANA timezone (e.g. 'Europe/Paris') so the cron fires at the runner's local hour
alter table public.profiles
  add column if not exists timezone text not null default 'Europe/Paris';

-- guards against double-sending on a given local day (stores the last yyyy-mm-dd sent)
alter table public.profiles
  add column if not exists last_evening_notify_on date;
