-- Nordic Run — démo seed
-- ---------------------------------------------------------------------------
-- Avant de lancer :
--   1. Créer 5 utilisateurs dans Auth → Users → Add user (Auto Confirm coché)
--      avec ces emails et le mot de passe `DemoNorvegian2026!` :
--        - demo@nordic-run.test
--        - demo-female@nordic-run.test
--        - demo-injury@nordic-run.test
--        - demo-break@nordic-run.test
--        - demo-elite@nordic-run.test
--        - demo-expired@nordic-run.test
--   2. Remplacer les __XXX_USER_ID__ ci-dessous par les UUID des utilisateurs.
--      Ouvrez Auth → Users, copiez l'ID de chaque user.
--   3. Lancer ce script entier dans le SQL Editor Supabase.
--
-- Le script est ré-entrant : il delete/upsert. Vous pouvez le rejouer.

-- ============================================================================
-- USER IDS — REMPLACER AVANT EXÉCUTION
-- ============================================================================
do $$
declare
  demo_id uuid := '__DEMO_USER_ID__';                  -- demo@nordic-run.test
  female_id uuid := '__FEMALE_USER_ID__';              -- demo-female@nordic-run.test
  injury_id uuid := '__INJURY_USER_ID__';              -- demo-injury@nordic-run.test
  break_id uuid := '__BREAK_USER_ID__';                -- demo-break@nordic-run.test
  elite_id uuid := '__ELITE_USER_ID__';                -- demo-elite@nordic-run.test
  expired_id uuid := '__EXPIRED_USER_ID__';            -- demo-expired@nordic-run.test
  today date := current_date;
begin

-- ============================================================================
-- 1. DEMO STANDARD — coureur confirmé, intermédiaire, plan en cours
-- ============================================================================
insert into public.profiles (id, sex, experience_years, current_weekly_km,
  days_per_week, has_done_intervals, goal, vdot, onboarded, track_cycle, locale)
values (demo_id, 'male', 4, 55, 5, true, 'perform', 48, true, false, 'fr')
on conflict (id) do update set
  sex = excluded.sex, experience_years = excluded.experience_years,
  current_weekly_km = excluded.current_weekly_km, days_per_week = excluded.days_per_week,
  has_done_intervals = excluded.has_done_intervals, goal = excluded.goal,
  vdot = excluded.vdot, onboarded = excluded.onboarded,
  track_cycle = excluded.track_cycle, locale = excluded.locale,
  injured_since = null, comeback_started_on = null,
  break_started_on = null, break_ended_on = null, pre_break_weekly_km = null;

insert into public.subscriptions (user_id, status, trial_end)
values (demo_id, 'trialing', now() + interval '11 days')
on conflict (user_id) do update set
  status = 'trialing', trial_end = now() + interval '11 days',
  stripe_subscription_id = null, current_period_end = null;

insert into public.race_results (user_id, distance_meters, time_seconds, raced_on, computed_vdot)
values (demo_id, 10000, 2580, today - 30, 48)
on conflict do nothing;

-- Quelques daily_logs récents pour rendre le dashboard "vivant"
delete from public.daily_logs where user_id = demo_id;
insert into public.daily_logs (user_id, log_date, fatigue, pain, available_minutes)
values
  (demo_id, today - 1, 3, 0, 75),
  (demo_id, today - 2, 2, 0, 90),
  (demo_id, today - 3, 4, 1, 60),
  (demo_id, today - 4, 2, 0, 90),
  (demo_id, today - 5, 3, 0, 75);

-- ============================================================================
-- 2. DEMO FEMALE — suivi cycle activé, phase lutéale tardive
-- ============================================================================
insert into public.profiles (id, sex, experience_years, current_weekly_km,
  days_per_week, has_done_intervals, goal, vdot, onboarded, track_cycle, locale)
values (female_id, 'female', 3, 45, 5, true, 'progress', 46, true, true, 'fr')
on conflict (id) do update set
  sex = 'female', track_cycle = true, vdot = 46,
  current_weekly_km = 45, days_per_week = 5,
  experience_years = 3, has_done_intervals = true,
  goal = 'progress', onboarded = true, locale = 'fr',
  injured_since = null, comeback_started_on = null,
  break_started_on = null, break_ended_on = null, pre_break_weekly_km = null;

insert into public.subscriptions (user_id, status, trial_end)
values (female_id, 'trialing', now() + interval '8 days')
on conflict (user_id) do update set status = 'trialing', trial_end = now() + interval '8 days';

-- Cycle : début des règles il y a 23 jours → phase lutéale tardive (cycleLength=28)
delete from public.cycle_logs where user_id = female_id;
insert into public.cycle_logs (user_id, period_start, cycle_length_days)
values
  (female_id, today - 23, 28),
  (female_id, today - 51, 28),
  (female_id, today - 79, 28);

insert into public.consent_logs (user_id, consent_type, granted, version)
values (female_id, 'cycle_tracking', true, 'v1')
on conflict do nothing;

-- Quelques daily_logs avec fatigue élevée pour déclencher l'adaptation cycle
delete from public.daily_logs where user_id = female_id;
insert into public.daily_logs (user_id, log_date, fatigue, pain, available_minutes)
values
  (female_id, today, 4, 0, 75),
  (female_id, today - 1, 3, 0, 75),
  (female_id, today - 2, 3, 0, 90);

-- ============================================================================
-- 3. DEMO INJURY — reprise post-blessure, jour 5/14
-- ============================================================================
insert into public.profiles (id, sex, experience_years, current_weekly_km,
  days_per_week, has_done_intervals, goal, vdot, onboarded, track_cycle, locale,
  injured_since, comeback_started_on)
values (injury_id, 'male', 3, 50, 5, true, 'progress', 45, true, false, 'fr',
  today - 16, today - 5)
on conflict (id) do update set
  vdot = 45, onboarded = true,
  injured_since = today - 16, comeback_started_on = today - 5,
  break_started_on = null, break_ended_on = null;

insert into public.subscriptions (user_id, status, trial_end)
values (injury_id, 'trialing', now() + interval '10 days')
on conflict (user_id) do update set status = 'trialing', trial_end = now() + interval '10 days';

-- ============================================================================
-- 4. DEMO BREAK — coupure volontaire post-marathon, 8 jours
-- ============================================================================
insert into public.profiles (id, sex, experience_years, current_weekly_km,
  days_per_week, has_done_intervals, goal, vdot, onboarded, track_cycle, locale,
  break_started_on, pre_break_weekly_km)
values (break_id, 'male', 5, 70, 6, true, 'perform', 52, true, false, 'fr',
  today - 8, 70)
on conflict (id) do update set
  vdot = 52, onboarded = true,
  break_started_on = today - 8, pre_break_weekly_km = 70,
  break_ended_on = null,
  injured_since = null, comeback_started_on = null;

insert into public.subscriptions (user_id, status, trial_end)
values (break_id, 'trialing', now() + interval '7 days')
on conflict (user_id) do update set status = 'trialing', trial_end = now() + interval '7 days';

-- ============================================================================
-- 5. DEMO ELITE — VDOT 65, 170 km/sem, double-seuil
-- ============================================================================
insert into public.profiles (id, sex, experience_years, current_weekly_km,
  days_per_week, has_done_intervals, goal, vdot, onboarded, track_cycle, locale)
values (elite_id, 'male', 8, 170, 7, true, 'perform', 65, true, false, 'fr')
on conflict (id) do update set
  vdot = 65, current_weekly_km = 170, days_per_week = 7,
  experience_years = 8, has_done_intervals = true, goal = 'perform',
  onboarded = true, locale = 'fr',
  injured_since = null, comeback_started_on = null,
  break_started_on = null, break_ended_on = null, pre_break_weekly_km = null;

insert into public.subscriptions (user_id, status, trial_end)
values (elite_id, 'active', null)
on conflict (user_id) do update set
  status = 'active', trial_end = null,
  current_period_end = now() + interval '23 days';

-- Course objectif dans 8 semaines (semi-marathon) pour déclencher la phase Spécifique
delete from public.target_races where user_id = elite_id;
insert into public.target_races (user_id, name, distance_meters, race_date, priority)
values (elite_id, 'Semi de Paris', 21097, today + 56, 'A');

insert into public.race_results (user_id, distance_meters, time_seconds, raced_on, computed_vdot)
values (elite_id, 5000, 905, today - 60, 65)
on conflict do nothing;

-- ============================================================================
-- 6. DEMO EXPIRED — essai gratuit terminé, doit upgrader
-- ============================================================================
insert into public.profiles (id, sex, experience_years, current_weekly_km,
  days_per_week, has_done_intervals, goal, vdot, onboarded, track_cycle, locale)
values (expired_id, 'male', 2, 40, 4, false, 'progress', 42, true, false, 'fr')
on conflict (id) do update set
  vdot = 42, onboarded = true,
  injured_since = null, comeback_started_on = null,
  break_started_on = null, break_ended_on = null, pre_break_weekly_km = null;

insert into public.subscriptions (user_id, status, trial_end)
values (expired_id, 'canceled', now() - interval '2 days')
on conflict (user_id) do update set
  status = 'canceled', trial_end = now() - interval '2 days';

-- Une simulation de connexion Strava (pas réelle, juste pour voir l'UI "connecté")
-- On utilise un access_token bidon — l'import échouera mais l'UI montrera "connecté"
insert into public.strava_connections (user_id, strava_athlete_id, access_token, refresh_token, expires_at, scope, auto_sync)
values (demo_id, 99999999, 'fake_access_for_demo_only', 'fake_refresh_for_demo_only', now() + interval '5 hours', 'read,activity:read', true)
on conflict (user_id) do update set
  access_token = 'fake_access_for_demo_only',
  refresh_token = 'fake_refresh_for_demo_only',
  expires_at = now() + interval '5 hours',
  auto_sync = true;

end $$;

-- ============================================================================
-- Confirmation
-- ============================================================================
select 'Seed appliqué ✓ — ' || count(*) || ' profils démo prêts.' as status
from public.profiles
where id in (
  '__DEMO_USER_ID__'::uuid,
  '__FEMALE_USER_ID__'::uuid,
  '__INJURY_USER_ID__'::uuid,
  '__BREAK_USER_ID__'::uuid,
  '__ELITE_USER_ID__'::uuid,
  '__EXPIRED_USER_ID__'::uuid
);
