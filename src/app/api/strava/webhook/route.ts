import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import {
  syncSingleActivity,
  deleteActivityLog,
  type ConnectionRow,
} from '@/lib/strava/sync';

// Strava webhook endpoint.
//
// GET  — subscription handshake. Strava calls us once with hub.challenge
//        when we create the subscription via POST /api/v3/push_subscriptions.
//        We echo the challenge back (after verifying our verify_token).
//
// POST — activity events. Payload:
//        { aspect_type: "create"|"update"|"delete", object_type: "activity",
//          object_id: <activity id>, owner_id: <athlete id>, event_time, ... }
//
// We never trust the payload to contain activity details — we always fetch
// the activity from the Strava API with the athlete's token to make sure
// we have authoritative data.
//
// One subscription per app — global, not per user. See README for the
// curl command to create the subscription against
// https://www.strava.com/api/v3/push_subscriptions.

function admin() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const challenge = url.searchParams.get('hub.challenge');
  const verifyToken = url.searchParams.get('hub.verify_token');

  const expected = process.env.STRAVA_VERIFY_TOKEN;
  if (!expected) return NextResponse.json({ error: 'verify_token_not_configured' }, { status: 500 });

  if (mode !== 'subscribe' || verifyToken !== expected || !challenge) {
    return NextResponse.json({ error: 'invalid_verification' }, { status: 403 });
  }
  return NextResponse.json({ 'hub.challenge': challenge });
}

interface StravaEvent {
  object_type: 'activity' | 'athlete';
  object_id: number;
  aspect_type: 'create' | 'update' | 'delete';
  updates?: Record<string, string>;
  owner_id: number;
  subscription_id: number;
  event_time: number;
}

export async function POST(req: Request) {
  let event: StravaEvent;
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }

  // Acknowledge anything that's not an activity event so Strava marks the
  // delivery successful and moves on (athlete deauth events come on the
  // same channel; we don't handle them in V1).
  if (event.object_type !== 'activity') {
    return NextResponse.json({ received: true, skipped: 'non_activity' });
  }

  const supabase = admin();

  // Idempotency: Strava re-delivers on retries / lost ACKs. The composite
  // event id (object:event_time) is unique enough.
  const eventKey = `${event.object_type}:${event.object_id}:${event.event_time}:${event.aspect_type}`;
  const { error: dedupErr } = await supabase
    .from('strava_webhook_events')
    .insert({
      strava_event_id: eventKey,
      aspect_type: event.aspect_type,
      object_type: event.object_type,
      object_id: event.object_id,
      owner_id: event.owner_id,
    });
  if (dedupErr) {
    if ((dedupErr as { code?: string }).code === '23505') {
      return NextResponse.json({ received: true, replay: true });
    }
    // Don't 500 — Strava would retry forever. Log it (TODO: real logger)
    // and accept the event so the queue moves on.
    console.error('strava_webhook_dedup_failed', dedupErr);
  }

  // Look up the user by Strava athlete id.
  const { data: conn } = await supabase
    .from('strava_connections')
    .select('user_id, access_token, refresh_token, expires_at, auto_sync')
    .eq('strava_athlete_id', event.owner_id)
    .maybeSingle<ConnectionRow & { auto_sync: boolean }>();

  if (!conn) {
    // We received an event for an athlete we don't know — probably a
    // stale subscription from another deploy. Acknowledge and drop.
    return NextResponse.json({ received: true, skipped: 'unknown_athlete' });
  }

  // Respect the user's opt-out.
  if (!conn.auto_sync) {
    return NextResponse.json({ received: true, skipped: 'auto_sync_disabled' });
  }

  try {
    if (event.aspect_type === 'delete') {
      await deleteActivityLog(supabase, conn.user_id, event.object_id);
    } else {
      // create or update
      await syncSingleActivity(supabase, conn, event.object_id);
    }
  } catch (e) {
    console.error('strava_webhook_handler_failed', e);
    // Acknowledge anyway — retrying won't help if our DB is down.
    return NextResponse.json({ received: true, error: 'handler_failed' });
  }

  return NextResponse.json({ received: true });
}
