import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { exchangeCode } from '@/lib/strava/client';

// Callback for the Strava OAuth flow. Verifies the signed state against the
// HttpOnly cookie set in /api/strava/connect, exchanges the code for tokens,
// stores them via the service role (the table has RLS write-deny on
// clients), and redirects back to /profile.

const STATE_COOKIE = 'strava_oauth_state';
const STATE_TTL_MS = 10 * 60 * 1000;

function admin() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

function verifyState(state: string, secret: string): { userId: string } | null {
  const dot = state.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const parts = payload.split(':');
  if (parts.length !== 3) return null;
  const [userId, , issuedAt] = parts;
  if (Date.now() - Number(issuedAt) > STATE_TTL_MS) return null;
  return { userId };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;

  if (error) {
    return NextResponse.redirect(`${appUrl}/fr/profile?strava=denied`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/fr/profile?strava=invalid`);
  }

  const cookieState = cookies().get(STATE_COOKIE)?.value;
  const secret = process.env.STRAVA_OAUTH_STATE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!secret || !clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/fr/profile?strava=server_misconfig`);
  }

  // Both the URL state AND the cookie state must match the signature: this
  // closes the gap where an attacker who learned the state somehow can't
  // also have set the user's cookie.
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(`${appUrl}/fr/profile?strava=state_mismatch`);
  }
  const verified = verifyState(state, secret);
  if (!verified) {
    return NextResponse.redirect(`${appUrl}/fr/profile?strava=state_invalid`);
  }

  let tokens;
  try {
    tokens = await exchangeCode({ clientId, clientSecret, code });
  } catch {
    return NextResponse.redirect(`${appUrl}/fr/profile?strava=token_failed`);
  }

  if (!tokens.athlete?.id) {
    return NextResponse.redirect(`${appUrl}/fr/profile?strava=no_athlete`);
  }

  const supabase = admin();
  const { error: upsertErr } = await supabase.from('strava_connections').upsert({
    user_id: verified.userId,
    strava_athlete_id: tokens.athlete.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(tokens.expires_at * 1000).toISOString(),
    scope: tokens.scope ?? null,
    updated_at: new Date().toISOString(),
  });
  if (upsertErr) {
    return NextResponse.redirect(`${appUrl}/fr/profile?strava=db_failed`);
  }

  cookies().delete(STATE_COOKIE);
  return NextResponse.redirect(`${appUrl}/fr/profile?strava=connected`);
}
