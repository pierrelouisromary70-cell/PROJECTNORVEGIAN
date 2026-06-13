import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPush } from '@/lib/push/server';

/**
 * Send a test notification to all of the current user's devices.
 * Lets the runner confirm the opt-in actually works end-to-end.
 */
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', user.id);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ error: 'no subscription' }, { status: 404 });
  }

  let sent = 0;
  const deadEndpoints: string[] = [];
  for (const s of subs) {
    const res = await sendPush(
      { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
      {
        title: 'Nordic Run',
        body: 'Notifications activées ✅ Vous recevrez votre rappel du soir ici.',
        url: '/fr/dashboard',
        tag: 'nordic-run-test',
      },
    );
    if (res.ok) sent++;
    else if (res.gone) deadEndpoints.push(s.endpoint);
  }

  if (deadEndpoints.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', deadEndpoints);
  }

  if (sent === 0) {
    return NextResponse.json({ error: 'no notification could be delivered' }, { status: 502 });
  }
  return NextResponse.json({ ok: true, sent });
}
