import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';

// Toggle webhook-driven auto-sync. We can't expose this via RLS UPDATE
// without also letting the client touch access_token / refresh_token in
// the same row (Postgres RLS is row-level, not column-level), so the
// toggle is done server-side via the service role.

function admin() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

const bodySchema = z.object({ enabled: z.boolean() });

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  const { error } = await admin()
    .from('strava_connections')
    .update({ auto_sync: parsed.data.enabled, updated_at: new Date().toISOString() })
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ error: 'db_failed' }, { status: 500 });
  return NextResponse.json({ ok: true, enabled: parsed.data.enabled });
}
