import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileForm } from './ProfileForm';
import { StravaSection } from './StravaSection';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ProfilePage(
  props: {
    params: Promise<{ locale: string }>;
    searchParams?: Promise<{ strava?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale
  } = params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);
  const [{ data: profile }, { data: sub }, { data: strava }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('strava_connections').select('user_id, created_at, auto_sync').eq('user_id', user.id).maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-fjord-950">Profil</h1>
      <div className="card">
        <h2 className="font-semibold text-fjord-900 mb-3">Abonnement</h2>
        <p className="text-sm text-fjord-700">Statut : <strong>{sub?.status ?? '—'}</strong></p>
        {sub?.status === 'trialing' && sub.trial_end && (
          <p className="text-sm text-fjord-700">Essai jusqu'au {new Date(sub.trial_end).toLocaleDateString()}</p>
        )}
      </div>
      <StravaSection
        connected={!!strava}
        connectedAt={strava?.created_at ?? null}
        autoSync={strava?.auto_sync ?? true}
        statusFlash={searchParams?.strava}
      />
      {profile && <ProfileForm profile={profile} locale={locale} />}
      {profile?.sex === 'female' && (
        <Link href={`/${locale}/cycle`} className="card block hover:bg-fjord-50">
          <h2 className="font-semibold text-fjord-900">Suivi du cycle menstruel</h2>
          <p className="text-sm text-fjord-700">{profile.track_cycle ? 'Activé — gérer mes données' : 'Non activé — activer maintenant'}</p>
        </Link>
      )}
    </div>
  );
}
