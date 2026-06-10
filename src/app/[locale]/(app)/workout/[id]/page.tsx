import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { buildPaceZones } from '@/lib/vdot/paces';
import { applyCalibration, computeCalibration, feedbackFromLogs } from '@/lib/training/calibration';
import type { TrainingBlock, Workout } from '@/lib/training/types';
import { WorkoutRunner } from './WorkoutRunner';

export const dynamic = 'force-dynamic';

export default async function WorkoutRunnerPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const sixWeeksAgo = new Date(Date.now() - 42 * 86400000).toISOString().slice(0, 10);
  const [{ data: profile }, { data: blockRow }, { data: logs }] = await Promise.all([
    supabase.from('profiles').select('vdot').eq('id', user.id).maybeSingle(),
    supabase.from('training_blocks').select('*').eq('user_id', user.id).order('start_date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('workout_logs').select('workout_id, status, actual_rpe').eq('user_id', user.id).gte('workout_date', sixWeeksAgo),
  ]);

  if (!profile?.vdot || !blockRow) redirect(`/${locale}/dashboard`);

  const block = blockRow.payload as TrainingBlock;
  const allWorkouts = block.weeks.flatMap((w) => w.workouts);
  const workout = allWorkouts.find((w) => w.id === decodeURIComponent(id));
  if (!workout) redirect(`/${locale}/dashboard`);

  // "Virtual lactate": recalibrate the LT1/LT2 ranges from the runner's
  // recent post-session feedback before showing target paces.
  const calibration = computeCalibration(feedbackFromLogs(logs ?? [], allWorkouts));
  const zones = applyCalibration(buildPaceZones(Number(profile.vdot)), calibration);

  return <WorkoutRunner workout={workout} zones={zones} locale={locale} />;
}
