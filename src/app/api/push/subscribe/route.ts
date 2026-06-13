import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Save (or refresh) a push subscription for the current user.
 *
 * POST body: { endpoint, p256dh, auth, userAgent? }
 * Upserts on endpoint so re-subscribing from the same device is idempotent.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.endpoint !== 'string' || typeof body.p256dh !== 'string' || typeof body.auth !== 'string') {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: user.id,
      endpoint: body.endpoint,
      p256dh: body.p256dh,
      auth: body.auth,
      user_agent: typeof body.userAgent === 'string' ? body.userAgent.slice(0, 400) : null,
      last_used_at: new Date().toISOString(),
      failed_at: null,
    }, { onConflict: 'endpoint' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/**
 * Remove a push subscription (runner disabled notifications on this device).
 * DELETE body: { endpoint }
 */
export async function DELETE(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.endpoint !== 'string') {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', body.endpoint);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
