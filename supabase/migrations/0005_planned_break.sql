-- Migration 0005: voluntary "coupure" / planned break with progressive ramp-up
-- Apply after 0004.
--
-- Unlike `injured_since`, a planned break is intentional (post-race rest,
-- holidays, life). When the runner ends the break, we ramp the weekly volume
-- back up over 4 weeks instead of throwing them at their previous mileage.

alter table public.profiles
  add column if not exists break_started_on date;

alter table public.profiles
  add column if not exists break_ended_on date;

-- snapshot of the runner's weekly volume at the moment they declared the break
-- so the post-break ramp knows where to climb back to.
alter table public.profiles
  add column if not exists pre_break_weekly_km numeric;

create index if not exists profiles_break_active_idx on public.profiles (id)
  where break_started_on is not null and break_ended_on is null;
