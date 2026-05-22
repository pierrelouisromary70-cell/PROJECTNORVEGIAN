import type { SupabaseClient } from '@supabase/supabase-js';
import { matchActivityToWorkout } from './match';
import { refreshAccessToken, listRecentActivities, type StravaActivity } from './client';
import type { TrainingBlock, Workout } from '@/lib/training/types';

// Shared sync logic used by /api/strava/import (button) and
// /api/strava/webhook (push). Same upsert rules so the two paths can't
// drift. The matcher runs against the active training block on the
// activity's date.

export interface ConnectionRow {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

// HR-based RPE heuristic — see /api/strava/import for rationale.
export function inferRpe(a: StravaActivity): number | null {
  if (typeof a.perceived_exertion === 'number' && a.perceived_exertion > 0) {
    return Math.min(10, Math.max(1, Math.round(a.perceived_exertion)));
  }
  const hr = a.average_heartrate;
  if (!hr) return null;
  if (hr < 130) return 3;
  if (hr < 150) return 5;
  if (hr < 165) return 7;
  return 9;
}

/**
 * Refresh the user's Strava access token in place if it expires within the
 * next 5 minutes. Returns the (possibly-new) access token to use.
 */
export async function ensureFreshToken(
  supabase: SupabaseClient,
  conn: ConnectionRow,
): Promise<string> {
  const expiresAt = new Date(conn.expires_at).getTime();
  if (expiresAt - Date.now() >= 5 * 60 * 1000) return conn.access_token;

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('strava_not_configured');

  const fresh = await refreshAccessToken({
    clientId, clientSecret, refreshToken: conn.refresh_token,
  });
  await supabase.from('strava_connections').update({
    access_token: fresh.access_token,
    refresh_token: fresh.refresh_token,
    expires_at: new Date(fresh.expires_at * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('user_id', conn.user_id);
  return fresh.access_token;
}

/**
 * Fetch the active training block for the user. We only match against the
 * one currently in effect — older blocks are noise for matching.
 */
export async function fetchActiveBlock(
  supabase: SupabaseClient,
  userId: string,
): Promise<TrainingBlock | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('training_blocks')
    .select('payload')
    .eq('user_id', userId)
    .gte('end_date', today)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.payload as TrainingBlock | undefined) ?? null;
}

function plannedWorkoutsFrom(block: TrainingBlock | null): Workout[] {
  if (!block) return [];
  return block.weeks.flatMap((w) => w.workouts);
}

interface UpsertOutcome {
  matched: boolean;
  workoutLogId?: string;
  plannedWorkoutId?: string;
}

/**
 * Upsert a single Strava activity into workout_logs. Handles three cases:
 *
 *   1. We have an existing workout_log for this strava_activity_id ->
 *      update it (lets us reflect Strava-side edits on re-sync).
 *   2. We can match to a planned workout that already has a log row
 *      (user marked it 'done' manually) -> enrich that row with actual
 *      values + strava_activity_id.
 *   3. We can match to a planned workout with no existing log -> insert a
 *      new row keyed by the planned workout id.
 *   4. No planned match -> fall back to workout_id = `strava:<id>` so the
 *      activity is still visible in history.
 */
export async function upsertActivity(
  supabase: SupabaseClient,
  userId: string,
  activity: StravaActivity,
  planned: Workout[],
): Promise<UpsertOutcome> {
  const base = {
    user_id: userId,
    workout_date: activity.start_date_local.slice(0, 10),
    status: 'done' as const,
    actual_distance_meters: Math.round(activity.distance),
    actual_duration_seconds: Math.round(activity.moving_time),
    actual_rpe: inferRpe(activity),
    notes: activity.name,
    strava_activity_id: activity.id,
  };

  // (1) Already linked to this Strava activity? Update in place.
  const { data: existingByStrava } = await supabase
    .from('workout_logs')
    .select('id, workout_id')
    .eq('user_id', userId)
    .eq('strava_activity_id', activity.id)
    .maybeSingle();
  if (existingByStrava) {
    await supabase.from('workout_logs').update(base).eq('id', existingByStrava.id);
    return {
      matched: !existingByStrava.workout_id.startsWith('strava:'),
      workoutLogId: existingByStrava.id,
      plannedWorkoutId: existingByStrava.workout_id.startsWith('strava:') ? undefined : existingByStrava.workout_id,
    };
  }

  const match = matchActivityToWorkout(activity, planned);

  if (match) {
    // (2/3) Existing manual log for this planned workout?
    const { data: existingPlanned } = await supabase
      .from('workout_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('workout_id', match.workout.id)
      .maybeSingle();
    if (existingPlanned) {
      await supabase.from('workout_logs').update(base).eq('id', existingPlanned.id);
      return { matched: true, workoutLogId: existingPlanned.id, plannedWorkoutId: match.workout.id };
    }
    const { data: inserted } = await supabase
      .from('workout_logs')
      .insert({ ...base, workout_id: match.workout.id })
      .select('id')
      .single();
    return { matched: true, workoutLogId: inserted?.id, plannedWorkoutId: match.workout.id };
  }

  // (4) No match — store as a standalone Strava row.
  const { data: inserted } = await supabase
    .from('workout_logs')
    .upsert(
      { ...base, workout_id: `strava:${activity.id}` },
      { onConflict: 'user_id,workout_id' },
    )
    .select('id')
    .single();
  return { matched: false, workoutLogId: inserted?.id };
}

export interface SyncResult {
  imported: number;
  matched: number;
  total: number;
}

export async function syncRecentActivities(
  supabase: SupabaseClient,
  conn: ConnectionRow,
  opts: { perPage?: number } = {},
): Promise<SyncResult> {
  const accessToken = await ensureFreshToken(supabase, conn);
  const activities = await listRecentActivities(accessToken, opts.perPage ?? 30);
  if (activities.length === 0) return { imported: 0, matched: 0, total: 0 };

  const block = await fetchActiveBlock(supabase, conn.user_id);
  const planned = plannedWorkoutsFrom(block);

  let matched = 0;
  for (const a of activities) {
    const out = await upsertActivity(supabase, conn.user_id, a, planned);
    if (out.matched) matched += 1;
  }
  return { imported: activities.length, matched, total: activities.length };
}

export async function syncSingleActivity(
  supabase: SupabaseClient,
  conn: ConnectionRow,
  activityId: number,
): Promise<UpsertOutcome | null> {
  const accessToken = await ensureFreshToken(supabase, conn);
  const res = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const activity = (await res.json()) as StravaActivity;
  // Only handle runs; ignore swims, rides, etc.
  if (!['Run', 'TrailRun', 'VirtualRun'].includes(activity.type)) return null;
  const block = await fetchActiveBlock(supabase, conn.user_id);
  return upsertActivity(supabase, conn.user_id, activity, plannedWorkoutsFrom(block));
}

export async function deleteActivityLog(
  supabase: SupabaseClient,
  userId: string,
  stravaActivityId: number,
): Promise<void> {
  await supabase
    .from('workout_logs')
    .delete()
    .eq('user_id', userId)
    .eq('strava_activity_id', stravaActivityId);
}
