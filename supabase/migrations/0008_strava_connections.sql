-- Migration 0008: Strava OAuth connection storage (read-only scope)
-- Apply after 0007.
--
-- Stores the OAuth tokens we obtain when the runner authorises Nordic Run
-- against their Strava account. Tokens are sensitive — Supabase encrypts at
-- rest (database level), and the table is locked down so only the
-- service-role can write. Clients can read their own row to know whether
-- they are connected, but never see the underlying tokens (the select
-- policy is row-scoped and the import API is the only place tokens are
-- ever dereferenced server-side).

create table if not exists public.strava_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  strava_athlete_id bigint not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists strava_connections_athlete_idx
  on public.strava_connections (strava_athlete_id);

alter table public.strava_connections enable row level security;

-- Users see their own connection row (so the UI knows "connected / not
-- connected"). They cannot mutate it — only the server (callback, refresh,
-- disconnect) writes via the service-role key.
create policy "strava_select_own"
  on public.strava_connections for select using (auth.uid() = user_id);

create policy "strava_block_writes"
  on public.strava_connections for insert with check (false);
create policy "strava_block_updates"
  on public.strava_connections for update using (false) with check (false);
create policy "strava_block_deletes"
  on public.strava_connections for delete using (false);
