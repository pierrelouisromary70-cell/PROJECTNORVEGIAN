import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { listRecentActivities, refreshAccessToken, type StravaActivity } from '@/lib/strava/client';

// Pulls the runner's recent Strava runs and writes them into workout_logs.
// On-demand only (no webhook, no cron). Idempotent: re-importing the same
// activity upserts on (user_id, workout_id), so the user can hit the
// button repeatedly without creating duplicates.

function admin() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

interface ConnectionRow {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

// Heuristic RPE from average heart-rate. Strava users rarely fill the
// perceived_exertion field, so HR is the only signal we have. Mapping is
// deliberately rough — the goal is to colour the WorkoutCard rail and let
// the runner refine if they care, not to fake a precise RPE.
function inferRpe(a: StravaActivity): number | null {
  if (typeof a.perceived_exertion === 'number' && a.perceived_exertion > 0) {
    return Math.min(10, Math.max(1, Math.round(a.perceived_exertion)));
  }
  const hr = a.average_heartrate;
  if (!hr) return null;
  // Coarse mapping by average HR. Personalised zones would need the user's
  // max HR which we don't collect (yet).
  if (hr < 130) return 3;
  if (hr < 150) return 5;
  if (hr < 165) return 7;
  return 9;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admSupabase = admin();
  const { data: conn } = await admSupabase
    .from('strava_connections')
    .select('user_id, access_token, refresh_token, expires_at')
    .eq('user_id', user.id)
    .maybeSingle<ConnectionRow>();

  if (!conn) {
    return NextResponse.json({ error: 'not_connected' }, { status: 404 });
  }

  let accessToken = conn.access_token;
  // Strava tokens last 6h. Refresh proactively if we're within 5 minutes
  // of expiry to avoid the activities call returning 401 mid-import.
  const expiresAt = new Date(conn.expires_at).getTime();
  if (expiresAt - Date.now() < 5 * 60 * 1000) {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'strava_not_configured' }, { status: 500 });
    }
    try {
      const fresh = await refreshAccessToken({
        clientId, clientSecret, refreshToken: conn.refresh_token,
      });
      accessToken = fresh.access_token;
      await admSupabase.from('strava_connections').update({
        access_token: fresh.access_token,
        refresh_token: fresh.refresh_token,
        expires_at: new Date(fresh.expires_at * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id);
    } catch {
      return NextResponse.json({ error: 'refresh_failed' }, { status: 502 });
    }
  }

  let activities: StravaActivity[];
  try {
    activities = await listRecentActivities(accessToken, 30);
  } catch (e) {
    return NextResponse.json(
      { error: 'fetch_failed', detail: (e as Error).message },
      { status: 502 },
    );
  }

  if (activities.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0 });
  }

  const rows = activities.map((a) => ({
    user_id: user.id,
    workout_id: `strava:${a.id}`,
    workout_date: a.start_date_local.slice(0, 10),
    status: 'done' as const,
    actual_distance_meters: Math.round(a.distance),
    actual_duration_seconds: Math.round(a.moving_time),
    actual_rpe: inferRpe(a),
    notes: a.name,
  }));

  const { error: upsertErr, count } = await admSupabase
    .from('workout_logs')
    .upsert(rows, { onConflict: 'user_id,workout_id', count: 'exact' });

  if (upsertErr) {
    return NextResponse.json({ error: 'db_failed', detail: upsertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    imported: count ?? rows.length,
    activities: rows.length,
  });
}
