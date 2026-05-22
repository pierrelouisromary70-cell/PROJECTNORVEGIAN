import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';

function admin() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

// Deauthorise locally (we drop the row). We do NOT call Strava's deauth
// endpoint — the user can revoke the app from their Strava settings if
// they want a full disconnect. This way a user who just wants to stop the
// import temporarily can reconnect later without re-approving.
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { error } = await admin().from('strava_connections').delete().eq('user_id', user.id);
  if (error) return NextResponse.json({ error: 'db_failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
