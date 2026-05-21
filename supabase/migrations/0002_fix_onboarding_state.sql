-- Migration 0002: fix onboarding skip bug
-- Run this if you already applied 0001. New installs already have the fix.

alter table public.profiles add column if not exists onboarded boolean not null default false;
alter table public.profiles alter column vdot drop not null;
alter table public.profiles alter column vdot drop default;

-- Clear the artificial default-VDOT 40 so the dashboard correctly
-- redirects existing test users to the onboarding flow.
update public.profiles set vdot = null where onboarded = false and vdot = 40;
