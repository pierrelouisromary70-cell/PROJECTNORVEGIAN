import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Log a workout completion (or replace an existing log).
 *
 * POST body: {
 *   workoutId: string,
 *   workoutDate: 'YYYY-MM-DD',
 *   status: 'done' | 'skipped' | 'partial' | 'replaced',
 *   actualDistanceMeters?: number,
 *   actualDurationSeconds?: number,
 *   actualRpe?: number (0-10),
 *   notes?: string,
 * }
 *
 * Upserts on (user_id, workout_id) so re-submitting overwrites.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.workoutId !== 'string' || typeof body.workoutDate !== 'string' || typeof body.status !== 'string') {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  if (!['done', 'skipped', 'partial', 'replaced'].includes(body.status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }

  const { error } = await supabase
    .from('workout_logs')
    .upsert({
      user_id: user.id,
      workout_id: body.workoutId,
      workout_date: body.workoutDate,
      status: body.status,
      actual_distance_meters: body.actualDistanceMeters ?? null,
      actual_duration_seconds: body.actualDurationSeconds ?? null,
      actual_rpe: body.actualRpe ?? null,
      notes: body.notes ?? null,
      logged_at: new Date().toISOString(),
    }, { onConflict: 'user_id,workout_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/**
 * Delete a previously-logged workout.
 *
 * DELETE body: { workoutId: string }
 */
export async function DELETE(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.workoutId !== 'string') {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const { error } = await supabase
    .from('workout_logs')
    .delete()
    .eq('user_id', user.id)
    .eq('workout_id', body.workoutId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
