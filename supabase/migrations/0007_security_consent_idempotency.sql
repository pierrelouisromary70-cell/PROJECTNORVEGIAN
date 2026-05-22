-- Migration 0007: Stripe webhook idempotency + RGPD consent audit trail
-- Apply after 0006.
--
-- Two unrelated but adjacent concerns, grouped to avoid migration sprawl:
--
-- 1. webhook_events: Stripe retries on 5xx and on lost ACKs. Without an
--    idempotency record, a retry of customer.subscription.updated can
--    overwrite a more recent state, and checkout.session.completed could
--    flip a status twice. Storing event.id + first-seen timestamp lets the
--    webhook handler short-circuit on replay.
--
-- 2. consent_logs: track_cycle is a single boolean on profiles. For an
--    Article 9 RGPD audit (santé) we need a timestamp and proof for each
--    grant/revoke. Boolean alone gives the CNIL nothing to verify against.

create table if not exists public.webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

-- Service-role only — no RLS exposure to clients. Defense-in-depth: enable
-- RLS with no policies so even an anon key with the wrong assumption hits a
-- closed door.
alter table public.webhook_events enable row level security;

create table if not exists public.consent_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null check (consent_type in ('cycle_tracking', 'terms', 'privacy')),
  granted boolean not null,
  version text not null default 'v1',
  user_agent text,
  ip_hash text, -- sha256 of IP, not the IP itself
  created_at timestamptz not null default now()
);

create index if not exists consent_logs_user_idx
  on public.consent_logs (user_id, consent_type, created_at desc);

alter table public.consent_logs enable row level security;

-- User can read their own consent history (right of access). They cannot
-- forge or delete entries — those flow only through the server.
create policy "consent_select_own"
  on public.consent_logs for select using (auth.uid() = user_id);

-- Lock down subscription writes from any non-service-role caller. The
-- service-role key bypasses RLS, so the webhook keeps working; an attacker
-- with the anon key cannot mutate billing state.
drop policy if exists "block_client_sub_writes" on public.subscriptions;
create policy "block_client_sub_writes"
  on public.subscriptions for insert with check (false);
drop policy if exists "block_client_sub_updates" on public.subscriptions;
create policy "block_client_sub_updates"
  on public.subscriptions for update using (false) with check (false);
drop policy if exists "block_client_sub_deletes" on public.subscriptions;
create policy "block_client_sub_deletes"
  on public.subscriptions for delete using (false);
