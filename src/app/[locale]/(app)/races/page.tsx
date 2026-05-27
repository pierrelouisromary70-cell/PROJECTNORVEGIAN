import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RacesClient } from './RacesClient';

export const dynamic = 'force-dynamic';

export default async function RacesPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);
  const [{ data: races }, { data: profile }] = await Promise.all([
    supabase.from('target_races').select('*').eq('user_id', user.id).order('race_date', { ascending: true }),
    supabase.from('profiles').select('vdot').eq('id', user.id).maybeSingle(),
  ]);
  return <RacesClient userId={user.id} currentVdot={Number(profile?.vdot ?? 40)} initial={races ?? []} />;
}
