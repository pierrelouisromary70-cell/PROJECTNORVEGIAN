-- Migration 0010: input-sanity constraints (defense in depth)
--
-- Several tables are written DIRECTLY from the browser via the anon client
-- (daily_logs, cycle_logs, target_races, profiles, workout_logs). Row Level
-- Security guarantees a user can only touch their OWN rows, but it does not
-- police the VALUES — a crafted request could store a 50 MB note, a negative
-- distance, days_per_week = 999, etc. These CHECK constraints enforce sane
-- ranges and length caps at the data layer, so they hold no matter which
-- client wrote the row. Idempotent: each constraint is added only if absent.

do $$
declare
  s text;
  stmts text[] := array[
    -- profiles
    'profiles|profiles_experience_years_chk|experience_years between 0 and 80',
    'profiles|profiles_weekly_km_chk|current_weekly_km between 0 and 400',
    'profiles|profiles_days_per_week_chk|days_per_week between 1 and 7',
    'profiles|profiles_vdot_chk|vdot is null or vdot between 20 and 90',
    'profiles|profiles_time_constraint_chk|time_constraints_min is null or time_constraints_min between 0 and 600',
    'profiles|profiles_birth_year_chk|birth_year is null or birth_year between 1900 and 2100',
    -- daily_logs
    'daily_logs|daily_logs_available_minutes_chk|available_minutes is null or available_minutes between 0 and 1440',
    'daily_logs|daily_logs_notes_len_chk|notes is null or char_length(notes) <= 2000',
    'daily_logs|daily_logs_pain_location_len_chk|pain_location is null or char_length(pain_location) <= 200',
    'daily_logs|daily_logs_distance_chk|actual_distance_meters is null or actual_distance_meters between 0 and 500000',
    'daily_logs|daily_logs_duration_chk|actual_duration_seconds is null or actual_duration_seconds between 0 and 86400',
    -- workout_logs
    'workout_logs|workout_logs_notes_len_chk|notes is null or char_length(notes) <= 2000',
    'workout_logs|workout_logs_distance_chk|actual_distance_meters is null or actual_distance_meters between 0 and 500000',
    'workout_logs|workout_logs_duration_chk|actual_duration_seconds is null or actual_duration_seconds between 0 and 86400',
    -- cycle_logs
    'cycle_logs|cycle_logs_length_chk|cycle_length_days is null or cycle_length_days between 15 and 90',
    'cycle_logs|cycle_logs_notes_len_chk|notes is null or char_length(notes) <= 2000',
    'cycle_logs|cycle_logs_symptoms_chk|symptoms is null or array_length(symptoms, 1) <= 50',
    -- target_races
    'target_races|target_races_distance_chk|distance_meters between 100 and 100000',
    'target_races|target_races_goal_time_chk|goal_time_seconds is null or goal_time_seconds between 0 and 86400',
    'target_races|target_races_name_len_chk|char_length(name) <= 120'
  ];
  parts text[];
begin
  foreach s in array stmts loop
    parts := string_to_array(s, '|');
    if not exists (select 1 from pg_constraint where conname = parts[2]) then
      execute format('alter table public.%I add constraint %I check (%s)', parts[1], parts[2], parts[3]);
    end if;
  end loop;
end $$;
