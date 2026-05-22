import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Planned-break ("coupure") API.
 *
 * POST { action: 'start' } → marks break_started_on=today, snapshots current
 *                            weekly volume so the post-break ramp knows where
 *                            to climb back to. Plan is paused.
 * POST { action: 'end' }   → marks break_ended_on=today. Plan resumes with a
 *                            4-week progressive ramp (see
 *                            `norwegian.ts:postBreakWeeklyKmCap`).
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = body.action as 'start' | 'end' | undefined;
  if (!action) return NextResponse.json({ error: 'missing action' }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);

  if (action === 'start') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_weekly_km')
      .eq('id', user.id)
      .maybeSingle();

    await supabase.from('profiles').update({
      break_started_on: today,
      break_ended_on: null,
      pre_break_weekly_km: profile?.current_weekly_km ?? null,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);

    await supabase.from('training_blocks').delete().eq('user_id', user.id);
    return NextResponse.json({ ok: true, state: 'break' });
  }

  if (action === 'end') {
    await supabase.from('profiles').update({
      break_ended_on: today,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);

    await supabase.from('training_blocks').delete().eq('user_id', user.id);
    return NextResponse.json({ ok: true, state: 'post_break' });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
