// Manage the (single, app-wide) Strava push-subscription used for auto-sync.
//
//   node scripts/strava-webhook.mjs view        # list current subscription(s)
//   node scripts/strava-webhook.mjs subscribe   # create it (one per app)
//   node scripts/strava-webhook.mjs delete       # remove it
//
// Needs network access to www.strava.com and these env vars:
//   STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_VERIFY_TOKEN, NEXT_PUBLIC_APP_URL
//
// On `subscribe`, Strava synchronously GETs <APP_URL>/api/strava/webhook with a
// hub.challenge — so your app must already be DEPLOYED and publicly reachable
// (localhost won't work without a tunnel). The GET route echoes the challenge
// automatically when hub.verify_token matches STRAVA_VERIFY_TOKEN.

const BASE = 'https://www.strava.com/api/v3/push_subscriptions';
const clientId = process.env.STRAVA_CLIENT_ID;
const clientSecret = process.env.STRAVA_CLIENT_SECRET;
const verifyToken = process.env.STRAVA_VERIFY_TOKEN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!clientId || !clientSecret) {
  console.error('Missing STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET in the environment.');
  process.exit(1);
}
const action = process.argv[2] ?? 'view';

async function view() {
  const u = new URL(BASE);
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('client_secret', clientSecret);
  const res = await fetch(u);
  const body = await res.json().catch(() => []);
  console.log(`HTTP ${res.status}`);
  console.log(JSON.stringify(body, null, 2));
  return Array.isArray(body) ? body : [];
}

async function subscribe() {
  if (!verifyToken || !appUrl) {
    console.error('subscribe needs STRAVA_VERIFY_TOKEN and NEXT_PUBLIC_APP_URL.');
    process.exit(1);
  }
  const callback = `${appUrl.replace(/\/$/, '')}/api/strava/webhook`;
  console.log(`Subscribing callback: ${callback}`);
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, callback_url: callback, verify_token: verifyToken }),
  });
  const body = await res.json().catch(() => ({}));
  console.log(`HTTP ${res.status}`);
  console.log(JSON.stringify(body, null, 2));
  if (!res.ok) {
    console.log('\nCommon causes: app not reachable at the callback URL, verify_token mismatch, or a subscription already exists (run `delete` first).');
    process.exit(1);
  }
  console.log('\n✅ Subscription created. New running activities will auto-import within seconds.');
}

async function remove() {
  const subs = await view();
  if (subs.length === 0) { console.log('Nothing to delete.'); return; }
  for (const s of subs) {
    const u = new URL(`${BASE}/${s.id}`);
    u.searchParams.set('client_id', clientId);
    u.searchParams.set('client_secret', clientSecret);
    const res = await fetch(u, { method: 'DELETE' });
    console.log(`DELETE subscription ${s.id} -> HTTP ${res.status}`);
  }
}

if (action === 'view') await view();
else if (action === 'subscribe') await subscribe();
else if (action === 'delete') await remove();
else { console.error(`Unknown action "${action}". Use: view | subscribe | delete`); process.exit(1); }
