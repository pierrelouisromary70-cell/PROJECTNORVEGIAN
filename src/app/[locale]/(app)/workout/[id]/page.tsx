import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { buildPaceZones } from '@/lib/vdot/paces';
import type { TrainingBlock, Workout } from '@/lib/training/types';
import { WorkoutRunner } from './WorkoutRunner';

export const dynamic = 'force-dynamic';

export default async function WorkoutRunnerPage(
  props: {
    params: Promise<{ locale: string; id: string }>;
  }
) {
  const params = await props.params;

  const {
    locale,
    id
  } = params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const [{ data: profile }, { data: blockRow }] = await Promise.all([
    supabase.from('profiles').select('vdot').eq('id', user.id).maybeSingle(),
    supabase.from('training_blocks').select('*').eq('user_id', user.id).order('start_date', { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (!profile?.vdot || !blockRow) redirect(`/${locale}/dashboard`);

  const block = blockRow.payload as TrainingBlock;
  const workout = block.weeks.flatMap((w) => w.workouts).find((w) => w.id === decodeURIComponent(id));
  if (!workout) redirect(`/${locale}/dashboard`);

  const zones = buildPaceZones(Number(profile.vdot));

  return <WorkoutRunner workout={workout} zones={zones} locale={locale} />;
}
