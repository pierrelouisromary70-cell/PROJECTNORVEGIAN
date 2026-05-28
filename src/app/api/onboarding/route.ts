import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createHash } from 'crypto';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { RACE_PRESETS, computeVdot } from '@/lib/vdot/calculator';

// Server-side validation. Client-side validation is for UX only — never trust
// it. A misformatted POST (curl, browser console, replay) must be rejected
// before it touches the database, otherwise garbage profile data leaks into
// the plan generator (VDOT 0, weeklyKm -1, etc.).
const onboardingSchema = z.object({
  sex: z.enum(['male', 'female', 'other']),
  experienceYears: z.number().min(0).max(80),
  weeklyKm: z.number().min(0).max(300),
  daysPerWeek: z.number().int().min(2).max(7),
  hasDoneIntervals: z.boolean(),
  goal: z.enum(['progress', 'perform']),
  raceDistance: z.enum(['1500m', '3k', '5k', '10k', 'hm', 'marathon']),
  raceTimeSeconds: z.number().int().min(180).max(8 * 3600), // 3 min .. 8 h
  timeConstraintMin: z.number().int().min(15).max(240).nullable(),
  trackCycle: z.boolean(),
  locale: z.enum(['fr', 'en']),
}).refine(
  // Catch obvious profile self-contradictions before they generate dangerous
  // plans (e.g. a beginner claiming 7 sessions/week at 45 km).
  (d) => !(d.weeklyKm / d.daysPerWeek > 25),
  { message: 'Volume / days incohérent (>25 km par séance)', path: ['weeklyKm'] },
);

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = onboardingSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const vdot = computeVdot({
    distanceMeters: RACE_PRESETS[d.raceDistance],
    timeSeconds: d.raceTimeSeconds,
  });
  if (!vdot || vdot < 25 || vdot > 90) {
    return NextResponse.json(
      { error: 'race_time_implausible', vdot },
      { status: 400 },
    );
  }

  const { error: profileErr } = await supabase.from('profiles').upsert({
    id: user.id,
    sex: d.sex,
    experience_years: d.experienceYears,
    current_weekly_km: d.weeklyKm,
    days_per_week: d.daysPerWeek,
    has_done_intervals: d.hasDoneIntervals,
    goal: d.goal,
    vdot,
    track_cycle: d.trackCycle,
    time_constraints_min: d.timeConstraintMin,
    onboarded: true,
    locale: d.locale,
    updated_at: new Date().toISOString(),
  });
  if (profileErr) {
    console.error('onboarding_profile_save_failed', { uid: user.id, message: profileErr.message });
    return NextResponse.json({ error: 'profile_save_failed' }, { status: 500 });
  }

  await supabase.from('race_results').insert({
    user_id: user.id,
    distance_meters: RACE_PRESETS[d.raceDistance],
    time_seconds: d.raceTimeSeconds,
    raced_on: new Date().toISOString().slice(0, 10),
    computed_vdot: vdot,
  });

  // Article 9 RGPD: if the runner activates cycle tracking we record an
  // audit-grade consent row (timestamp + user-agent + hashed IP). Without
  // this we can't prove informed consent on a CNIL request.
  if (d.trackCycle) {
    const h = await headers();
    const ua = h.get('user-agent');
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip');
    await supabase.from('consent_logs').insert({
      user_id: user.id,
      consent_type: 'cycle_tracking',
      granted: true,
      version: 'v1',
      user_agent: ua,
      ip_hash: hashIp(ip ?? null),
    });
  }

  return NextResponse.json({ ok: true, vdot });
}
