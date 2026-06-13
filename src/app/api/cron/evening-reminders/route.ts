import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPush, ensureVapidConfigured } from '@/lib/push/server';
import { eveningReminderDecision } from '@/lib/push/schedule';

export const dynamic = 'force-dynamic';
// Cap the runtime so a large user base doesn't hang the function.
export const maxDuration = 60;

/**
 * Hourly cron: send the evening "validate your session / how do you feel"
 * reminder to every runner whose chosen local hour is now. This loop is what
 * keeps the adaptation engine AND the virtual-lactate calibration fed —
 * without a validated session there is no RPE to calibrate from.
 *
 * Protected by CRON_SECRET (Authorization: Bearer <secret>) so only the
 * scheduler can trigger it. Vercel Cron sends this header automatically when
 * configured with the project's CRON_SECRET.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  if (!ensureVapidConfigured()) {
    return NextResponse.json({ error: 'VAPID not configured' }, { status: 503 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  // Only fetch runners who opted in. Trial/active gating is intentionally
  // loose here — re-engaging lapsed runners is the whole point.
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, notify_evening_feedback, notify_hour, timezone, last_evening_notify_on')
    .eq('notify_evening_feedback', true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let processed = 0;
  let notified = 0;
  let devices = 0;
  let pruned = 0;

  for (const p of profiles ?? []) {
    const decision = eveningReminderDecision(
      {
        notifyEveningFeedback: p.notify_evening_feedback,
        notifyHour: p.notify_hour ?? 20,
        timezone: p.timezone ?? 'Europe/Paris',
        lastEveningNotifyOn: p.last_evening_notify_on ?? null,
      },
      now,
    );
    if (!decision.send) continue;
    processed++;

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', p.id);
    if (!subs || subs.length === 0) continue;

    const dead: string[] = [];
    let anyDelivered = false;
    for (const s of subs) {
      const res = await sendPush(
        { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
        {
          title: 'Nordic Run — bilan du soir',
          body: 'Comment s\'est passée votre journée ? Validez votre séance et notez votre ressenti.',
          url: '/fr/dashboard',
          tag: 'nordic-run-evening',
        },
      );
      devices++;
      if (res.ok) anyDelivered = true;
      else if (res.gone) dead.push(s.endpoint);
    }

    if (dead.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', dead);
      pruned += dead.length;
    }

    if (anyDelivered) {
      notified++;
      // Record the local date so we don't notify this runner twice today.
      await supabase
        .from('profiles')
        .update({ last_evening_notify_on: decision.localDate })
        .eq('id', p.id);
    }
  }

  return NextResponse.json({ ok: true, processed, notified, devices, pruned });
}
