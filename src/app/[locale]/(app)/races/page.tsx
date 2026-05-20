import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RacesClient } from './RacesClient';

export const dynamic = 'force-dynamic';

export default async function RacesPage({ params: { locale } }: { params: { locale: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);
  const { data: races } = await supabase.from('target_races').select('*').eq('user_id', user.id).order('race_date', { ascending: true });
  return <RacesClient userId={user.id} initial={races ?? []} />;
}
