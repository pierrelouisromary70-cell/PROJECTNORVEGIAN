-- Migration 0004: injury state + comeback protocol
-- Apply after 0001, 0002, 0003.

-- "Plan paused" : when the runner declares an injury or extended break.
alter table public.profiles
  add column if not exists injured_since date;

-- "Comeback in progress" : when the runner clicks "I'm back" after an injury.
alter table public.profiles
  add column if not exists comeback_started_on date;

create index if not exists profiles_injured_idx on public.profiles (id) where injured_since is not null;
create index if not exists profiles_comeback_idx on public.profiles (id) where comeback_started_on is not null;
