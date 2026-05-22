import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Toggle injury state on the user profile.
 *
 * POST { action: 'declare' }                 → marks injured_since = today, pauses plan
 * POST { action: 'start_comeback' }          → starts 14-day return-to-run protocol
 * POST { action: 'resume_normal' }           → clears both flags, back to normal
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = body.action as 'declare' | 'start_comeback' | 'resume_normal' | undefined;

  if (!action) return NextResponse.json({ error: 'missing action' }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);

  if (action === 'declare') {
    await supabase.from('profiles').update({
      injured_since: today,
      comeback_started_on: null,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);
    await supabase.from('training_blocks').delete().eq('user_id', user.id);
    return NextResponse.json({ ok: true, state: 'injured' });
  }

  if (action === 'start_comeback') {
    await supabase.from('profiles').update({
      injured_since: null,
      comeback_started_on: today,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);
    await supabase.from('training_blocks').delete().eq('user_id', user.id);
    return NextResponse.json({ ok: true, state: 'comeback' });
  }

  if (action === 'resume_normal') {
    await supabase.from('profiles').update({
      injured_since: null,
      comeback_started_on: null,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);
    await supabase.from('training_blocks').delete().eq('user_id', user.id);
    return NextResponse.json({ ok: true, state: 'normal' });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
