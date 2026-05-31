import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { inferExperience } from '@/lib/training/norwegian';
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
  const [{ data: profile }, { data: sub }, { data: strava }, { count: sessionsDone }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('strava_connections').select('user_id, created_at, auto_sync').eq('user_id', user.id).maybeSingle(),
    supabase.from('workout_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['done', 'replaced', 'partial']),
  ]);

  const level = profile ? inferExperience({
    experienceYears: Number(profile.experience_years ?? 0),
    currentWeeklyKm: Number(profile.current_weekly_km ?? 0),
    hasDoneIntervals: !!profile.has_done_intervals,
  }) : null;
  const levelLabel: Record<string, string> = { beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé', elite: 'Élite' };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-ink-950">Profil</h1>

      {profile && (
        <section className="card relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-aurora-300/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-display text-xl text-ink-950">Ton profil sportif</h2>
              {level && <span className="chip-accent">{levelLabel[level] ?? level}</span>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="rounded-xl bg-ink-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-ink-600">VDOT</p>
                <p className="font-display text-2xl font-bold text-ink-950 mt-1 tabular-nums">{Number(profile.vdot ?? 0)}</p>
                <p className="text-[11px] text-ink-500 mt-0.5">actualisé à chaque course</p>
              </div>
              <div className="rounded-xl bg-ink-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-ink-600">Volume hebdo</p>
                <p className="font-display text-2xl font-bold text-ink-950 mt-1 tabular-nums">{Number(profile.current_weekly_km ?? 0)} <span className="text-sm font-normal text-ink-500">km</span></p>
                <p className="text-[11px] text-ink-500 mt-0.5">progressivement ajusté</p>
              </div>
              <div className="rounded-xl bg-ink-50 px-4 py-3 col-span-2 md:col-span-1">
                <p className="text-xs uppercase tracking-wider text-ink-600">Séances faites</p>
                <p className="font-display text-2xl font-bold text-ink-950 mt-1 tabular-nums">{sessionsDone ?? 0}</p>
                <p className="text-[11px] text-ink-500 mt-0.5">depuis ton inscription</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="card">
        <h2 className="font-semibold text-ink-900 mb-3">Abonnement</h2>
        <p className="text-sm text-ink-700">Statut : <strong>{sub?.status ?? '—'}</strong></p>
        {sub?.status === 'trialing' && sub.trial_end && (
          <p className="text-sm text-ink-700">Essai jusqu&apos;au {new Date(sub.trial_end).toLocaleDateString()}</p>
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
