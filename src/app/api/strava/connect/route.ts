import { NextResponse } from 'next/server';
import { createHmac, randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { authorizeUrl } from '@/lib/strava/client';

// Initiates the OAuth flow. The state parameter is a signed token that
// embeds the user id, so the callback can verify the round-trip wasn't
// forged (CSRF) and identify the user without a separate session lookup
// (Strava strips cookies on the redirect-back to a different origin).

const STATE_COOKIE = 'strava_oauth_state';
const STATE_TTL_SECONDS = 10 * 60;

function signState(payload: string, secret: string): string {
  const mac = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${mac}`;
}

export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const clientId = process.env.STRAVA_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const secret = process.env.STRAVA_OAUTH_STATE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!clientId || !secret) {
    return NextResponse.json({ error: 'strava_not_configured' }, { status: 500 });
  }

  const nonce = randomBytes(16).toString('base64url');
  const payload = `${user.id}:${nonce}:${Date.now()}`;
  const state = signState(payload, secret);

  // Pin the signed state into an HttpOnly cookie too — defense in depth
  // against an attacker who steals the URL in flight.
  cookies().set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: appUrl.startsWith('https://'),
    sameSite: 'lax',
    maxAge: STATE_TTL_SECONDS,
    path: '/',
  });

  const url = authorizeUrl({
    clientId,
    redirectUri: `${appUrl}/api/strava/callback`,
    state,
  });

  return NextResponse.redirect(url);
}
