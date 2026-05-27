// Real-database journey verification — run from a session/environment whose
// network policy allows your Supabase host.
//
//   node scripts/verify-journey.mjs
//
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the env.
// Probes the schema (incl. migrations 0007-0009 columns), creates a throwaway
// test user, runs the onboarding → profile → race → training-block → workout-log
// → progression pipeline against the real DB, then DELETES the test user and all
// its rows so your database is left exactly as it was.
//
// Plan *content* (VDOT, paces, sessions, progression) is already covered by the
// offline unit tests; this script verifies only the live DB plumbing.

import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!rawUrl || !service) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}
const url = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
const admin = createClient(url, service, { auth: { persistSession: false } });

const ok = (b) => (b ? 'ok' : 'FAIL');
let failures = 0;
const mark = (label, error) => {
  if (error) { failures++; console.log(`  ✗ ${label}: ${error.message ?? error}`); }
  else console.log(`  ✓ ${label}`);
};

console.log('\n=== 1. Schema probe ===');
const tables = ['profiles', 'race_results', 'training_blocks', 'workout_logs', 'daily_logs', 'cycle_logs', 'subscriptions', 'target_races', 'consent_logs', 'strava_connections', 'webhook_events'];
for (const t of tables) {
  const { error } = await admin.from(t).select('*').limit(1);
  mark(`table ${t}`, error);
}
const { error: colErr } = await admin.from('profiles')
  .select('injured_since,comeback_started_on,break_started_on,break_ended_on,pre_break_weekly_km,track_cycle')
  .limit(1);
mark('profiles break/injury columns (migrations 0007-0009)', colErr);

console.log('\n=== 2. Journey with a throwaway test user ===');
const email = `nordic-test-${Date.now()}@example.com`;
const { data: created, error: cErr } = await admin.auth.admin.createUser({ email, password: 'Test1234!x', email_confirm: true });
if (cErr) { mark('create test user', cErr); console.log(`\nResult: ${failures} failure(s).`); process.exit(failures ? 1 : 0); }
const uid = created.user.id;
console.log(`  test user: ${email}`);

// A minimal-but-valid training-block payload (jsonb) — the generator's real
// output is covered by unit tests; here we only need a well-formed write.
const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const block = {
  id: `block-${iso(today)}`, startDate: iso(today),
  endDate: iso(new Date(today.getTime() + 27 * 864e5)), vdotAtStart: 59.6,
  weeks: [{ weekNumber: 1, startDate: iso(today), totalKm: 55, phase: 'base', workouts: [
    { id: `${iso(today)}-1`, date: iso(today), type: 'lt1_threshold', title: 'Seuil bas (LT1) — 7×600 m',
      totalDistanceMeters: 10200, totalDurationSeconds: 3600, rpe: 6, purpose: 'x', feel: 'x', guidance: [],
      steps: [{ distanceMeters: 4000, pace: 'easy' }, { reps: 7, distanceMeters: 600, pace: 'lt1', recoverySeconds: 60 }] },
  ] }],
};

try {
  const { error: pErr } = await admin.from('profiles').upsert({
    id: uid, sex: 'male', experience_years: 4, current_weekly_km: 55, days_per_week: 6,
    has_done_intervals: true, goal: 'perform', vdot: 59.6, track_cycle: false,
    time_constraints_min: null, onboarded: true, locale: 'fr', updated_at: new Date().toISOString(),
  });
  mark('profile upsert (onboarding write)', pErr);

  const { error: rErr } = await admin.from('race_results').insert({ user_id: uid, distance_meters: 10000, time_seconds: 2084, raced_on: iso(today), computed_vdot: 59.6 });
  mark('race_results insert', rErr);

  const { error: bErr } = await admin.from('training_blocks').insert({ user_id: uid, start_date: block.startDate, end_date: block.endDate, payload: block, target_race_id: null });
  mark('training_block insert', bErr);

  const { data: br, error: brErr } = await admin.from('training_blocks').select('payload').eq('user_id', uid).maybeSingle();
  mark('training_block read-back', brErr || (br?.payload?.weeks?.length ? null : { message: 'payload empty' }));

  const wid = block.weeks[0].workouts[0].id;
  const { error: lErr } = await admin.from('workout_logs').upsert({ user_id: uid, workout_id: wid, workout_date: block.startDate, status: 'done', logged_at: new Date().toISOString() }, { onConflict: 'user_id,workout_id' });
  mark('workout_log upsert', lErr);

  const { count, error: qErr } = await admin.from('workout_logs').select('*', { count: 'exact', head: true }).eq('user_id', uid).gte('workout_date', block.startDate).lte('workout_date', block.endDate).neq('status', 'skipped');
  mark(`adherence query (counted ${count ?? 0})`, qErr);
} finally {
  console.log('\n=== 3. Cleanup ===');
  await admin.from('workout_logs').delete().eq('user_id', uid);
  await admin.from('training_blocks').delete().eq('user_id', uid);
  await admin.from('race_results').delete().eq('user_id', uid);
  await admin.from('profiles').delete().eq('id', uid);
  const { error: dErr } = await admin.auth.admin.deleteUser(uid);
  mark('test user + rows deleted', dErr);
}

console.log(`\n${failures === 0 ? '✅ ALL CHECKS PASSED' : `❌ ${failures} failure(s)`}`);
process.exit(failures ? 1 : 0);
