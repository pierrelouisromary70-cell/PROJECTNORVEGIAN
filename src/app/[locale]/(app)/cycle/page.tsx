import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CycleClient } from './CycleClient';

export const dynamic = 'force-dynamic';

export default async function CyclePage({ params: { locale } }: { params: { locale: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);
  const { data: profile } = await supabase.from('profiles').select('track_cycle, sex').eq('id', user.id).maybeSingle();
  const { data: logs } = await supabase.from('cycle_logs').select('*').eq('user_id', user.id).order('period_start', { ascending: false }).limit(6);
  return <CycleClient userId={user.id} initial={logs ?? []} enabled={!!profile?.track_cycle} sex={profile?.sex} />;
}
