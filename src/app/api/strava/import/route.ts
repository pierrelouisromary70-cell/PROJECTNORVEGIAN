import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { syncRecentActivities, type ConnectionRow } from '@/lib/strava/sync';

// Manual import button. Pulls the last 30 runs from Strava and pushes them
// through the shared sync pipeline (which also matches to planned
// workouts via the active training block).

function admin() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admSupabase = admin();
  const { data: conn } = await admSupabase
    .from('strava_connections')
    .select('user_id, access_token, refresh_token, expires_at')
    .eq('user_id', user.id)
    .maybeSingle<ConnectionRow>();

  if (!conn) return NextResponse.json({ error: 'not_connected' }, { status: 404 });

  try {
    const result = await syncRecentActivities(admSupabase, conn, { perPage: 30 });
    return NextResponse.json(result);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'strava_not_configured') {
      return NextResponse.json({ error: 'strava_not_configured' }, { status: 500 });
    }
    if (msg.startsWith('strava_token_refresh_failed')) {
      return NextResponse.json({ error: 'refresh_failed' }, { status: 502 });
    }
    if (msg.startsWith('strava_activities_failed')) {
      return NextResponse.json({ error: 'fetch_failed' }, { status: 502 });
    }
    return NextResponse.json({ error: 'sync_failed', detail: msg }, { status: 500 });
  }
}
