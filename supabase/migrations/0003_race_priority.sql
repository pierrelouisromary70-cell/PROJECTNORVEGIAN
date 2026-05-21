-- Migration 0003: race priority + VDOT history tracking
-- Apply after 0001 and 0002.

-- Race priority: A = main objective (full taper), B = prep race (light taper), C = race-as-workout.
alter table public.target_races
  add column if not exists priority text not null default 'A'
  check (priority in ('A', 'B', 'C'));

-- Convert legacy `is_primary` flag: rows with is_primary=false become priority B.
update public.target_races set priority = 'B'
where is_primary = false and priority = 'A';

-- Mark race results that have been used to update the runner's VDOT.
-- We only bump the profile VDOT when the new race produces a HIGHER value
-- than the current one (single bad race doesn't tank the plan).
alter table public.race_results
  add column if not exists improved_vdot boolean not null default false;
