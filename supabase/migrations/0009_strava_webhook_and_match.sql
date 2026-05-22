-- Migration 0009: Strava webhook auto-sync + planned-workout matcher
-- Apply after 0008.
--
-- Three concerns grouped here:
--
-- 1. strava_activity_id on workout_logs: a stable Strava id we can use to
--    re-find a row on re-import or on a webhook update event. Distinct
--    from workout_id (which holds either a planned-workout id when we
--    matched, or `strava:<id>` when we couldn't). Without this column,
--    re-importing after we've linked a Strava activity to a planned
--    workout would create a duplicate row.
--
-- 2. strava_webhook_events: idempotency store, same shape as the Stripe
--    one. Strava can replay webhook deliveries on 5xx or lost ACKs.
--
-- 3. auto_sync flag on strava_connections: opt-out for webhook-driven
--    auto-import. Default ON when the runner connects; togglable from the
--    profile page.

alter table public.workout_logs
  add column if not exists strava_activity_id bigint;

-- Partial unique index: a given Strava activity maps to at most one log
-- row per user. Partial so we don't conflict with old rows that have NULL.
create unique index if not exists workout_logs_strava_activity_idx
  on public.workout_logs (user_id, strava_activity_id)
  where strava_activity_id is not null;

create table if not exists public.strava_webhook_events (
  strava_event_id text primary key, -- composite: object_type:object_id:event_time
  aspect_type text not null,
  object_type text not null,
  object_id bigint not null,
  owner_id bigint not null,
  processed_at timestamptz not null default now()
);

alter table public.strava_webhook_events enable row level security;
-- No policies: only the service role (webhook handler) ever touches this.

alter table public.strava_connections
  add column if not exists auto_sync boolean not null default true;

-- We deliberately do NOT add an RLS UPDATE policy here. A row-scoped
-- update policy would let a client mutate access_token / refresh_token
-- alongside auto_sync (Postgres RLS is row-level, not column-level).
-- Instead, the auto_sync toggle goes through /api/strava/auto-sync which
-- uses the service-role and writes only the auto_sync column.
