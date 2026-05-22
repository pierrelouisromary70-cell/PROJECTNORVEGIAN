// Thin Strava API wrapper. We rely on three endpoints only for the manual
// import: OAuth token exchange, OAuth token refresh, and listing the
// athlete's recent activities. No webhook, no write scope.
//
// Token lifetime is 6 hours. Refresh is cheap and we do it transparently in
// `withFreshToken` so the import route doesn't have to track expiry itself.

const STRAVA_BASE = 'https://www.strava.com';
const TOKEN_URL = `${STRAVA_BASE}/oauth/token`;
const ACTIVITIES_URL = `${STRAVA_BASE}/api/v3/athlete/activities`;

// Activity types we consider as running. `Run`/`TrailRun`/`VirtualRun` are
// what Strava emits for indoor and outdoor runs. We deliberately exclude
// `Walk`, `Hike`, `Workout`, etc. — they'd skew VDOT/load math.
export const RUNNING_ACTIVITY_TYPES = ['Run', 'TrailRun', 'VirtualRun'] as const;

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  athlete?: { id: number };
  scope?: string;
}

export interface StravaActivity {
  id: number;
  external_id: string | null;
  name: string;
  type: string;
  sport_type?: string;
  start_date_local: string; // ISO
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number;
  average_heartrate?: number;
  perceived_exertion?: number;
  total_elevation_gain?: number;
}

export function authorizeUrl(opts: { clientId: string; redirectUri: string; state: string }): string {
  const u = new URL(`${STRAVA_BASE}/oauth/authorize`);
  u.searchParams.set('client_id', opts.clientId);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('redirect_uri', opts.redirectUri);
  u.searchParams.set('approval_prompt', 'auto');
  u.searchParams.set('scope', 'read,activity:read');
  u.searchParams.set('state', opts.state);
  return u.toString();
}

export async function exchangeCode(opts: { clientId: string; clientSecret: string; code: string }): Promise<StravaTokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      code: opts.code,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`strava_token_exchange_failed:${res.status}`);
  return res.json();
}

export async function refreshAccessToken(opts: { clientId: string; clientSecret: string; refreshToken: string }): Promise<StravaTokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      refresh_token: opts.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`strava_token_refresh_failed:${res.status}`);
  return res.json();
}

export async function listRecentActivities(accessToken: string, perPage = 30): Promise<StravaActivity[]> {
  const u = new URL(ACTIVITIES_URL);
  u.searchParams.set('per_page', String(Math.min(perPage, 100)));
  const res = await fetch(u.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`strava_activities_failed:${res.status}`);
  const all = (await res.json()) as StravaActivity[];
  return all.filter((a) => RUNNING_ACTIVITY_TYPES.includes(a.type as (typeof RUNNING_ACTIVITY_TYPES)[number]));
}
