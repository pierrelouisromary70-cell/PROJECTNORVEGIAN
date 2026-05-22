import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { format } from 'date-fns';
import { AlertTriangle, HeartHandshake, Coffee } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { generatePlan } from '@/lib/training/plan-generator';
import { generateComebackPlan } from '@/lib/training/comeback-plan';
import { POST_BREAK_RAMP_WEEKS, postBreakWeeklyKmCap } from '@/lib/training/norwegian';
import type { RunnerProfile, TrainingBlock, Workout } from '@/lib/training/types';
import { WorkoutCard } from '@/components/WorkoutCard';
import { RacePredictor } from '@/components/RacePredictor';
import { TodayFeedback } from './TodayFeedback';
import { TrialBanner } from './TrialBanner';
import { ComebackStartButton, ResumeNormalButton } from './InjuryStateControls';
import { EndBreakButton } from './BreakStateControls';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'common' });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const [{ data: profile }, { data: sub }, { data: blockRow }, { data: primaryRace }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('training_blocks').select('*').eq('user_id', user.id).order('start_date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('target_races').select('*').eq('user_id', user.id).eq('priority', 'A').gte('race_date', new Date().toISOString().slice(0, 10)).order('race_date', { ascending: true }).limit(1).maybeSingle(),
  ]);

  if (!profile || !profile.onboarded || !profile.vdot) redirect(`/${locale}/onboarding`);

  const trialDaysLeft = sub?.trial_end ? Math.max(0, Math.ceil((new Date(sub.trial_end).getTime() - Date.now()) / 86400000)) : 0;

  // === INJURY STATE: plan paused ===
  if (profile.injured_since) {
    return (
      <div className="space-y-6">
        {sub?.status === 'trialing' && <TrialBanner days={trialDaysLeft} locale={locale} />}
        <header>
          <p className="text-sm text-ink-600">{format(new Date(), 'EEEE dd MMMM')}</p>
          <h1 className="display text-4xl md:text-5xl text-ink-950">Plan en pause</h1>
        </header>
        <div className="card border-amber-200 ring-amber-100">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-8 w-8 text-amber-600 shrink-0 mt-1" />
            <div>
              <h2 className="font-semibold text-ink-900 text-lg">Vous êtes en arrêt depuis le {profile.injured_since}</h2>
              <p className="text-ink-700 mt-2">
                Votre plan d&apos;entraînement est mis en pause. Soignez-vous correctement — la blessure
                guérira mieux avec du repos qu&apos;avec de la course « pour voir ».
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-ink-700">
                <li>• Consultez un kinésithérapeute si la douleur persiste &gt; 5 jours</li>
                <li>• Vous pouvez maintenir votre cardio en vélo, natation, elliptique (sans douleur)</li>
                <li>• Quand vous pouvez courir 20 min sans douleur, démarrez la reprise progressive</li>
              </ul>
              <div className="mt-6">
                <ComebackStartButton />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === PLANNED BREAK STATE: voluntary off-period (post-race, holidays, etc.) ===
  if (profile.break_started_on && !profile.break_ended_on) {
    return (
      <div className="space-y-6">
        {sub?.status === 'trialing' && <TrialBanner days={trialDaysLeft} locale={locale} />}
        <header>
          <p className="text-sm text-ink-600">{format(new Date(), 'EEEE dd MMMM')}</p>
          <h1 className="display text-4xl md:text-5xl text-ink-950">Coupure en cours</h1>
        </header>
        <div className="card border-sky-200 ring-sky-100">
          <div className="flex items-start gap-4">
            <Coffee className="h-8 w-8 text-sky-600 shrink-0 mt-1" />
            <div>
              <h2 className="font-semibold text-ink-900 text-lg">En coupure depuis le {profile.break_started_on}</h2>
              <p className="text-ink-700 mt-2">
                Votre plan est volontairement mis en pause. Coupure post-course, vacances, vie pro
                intense — toutes les bonnes raisons de souffler. Pas de culpabilité : la coupure fait
                partie de la planification.
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-ink-700">
                <li>• Vous pouvez courir quand vous voulez, sans plan ni structure</li>
                <li>• Activité croisée bienvenue (vélo, natation, randonnée)</li>
                <li>• À la reprise, le plan augmentera progressivement sur {POST_BREAK_RAMP_WEEKS} semaines</li>
                {profile.pre_break_weekly_km && (
                  <li>• Vous reprendrez à ~{Math.round(Number(profile.pre_break_weekly_km) * 0.5)} km/sem (50 % de votre volume habituel), pour remonter à {Math.round(Number(profile.pre_break_weekly_km))} km/sem en 4 semaines</li>
                )}
              </ul>
              <div className="mt-6">
                <EndBreakButton />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === COMEBACK STATE: 14-day return-to-run protocol ===
  if (profile.comeback_started_on) {
    const comebackStart = new Date(profile.comeback_started_on);
    const today = new Date();
    const daysSinceStart = Math.floor((today.getTime() - comebackStart.getTime()) / 86400000);

    if (daysSinceStart >= 14) {
      await supabase.from('profiles').update({ comeback_started_on: null }).eq('id', user.id);
      redirect(`/${locale}/dashboard`);
    }

    const block = generateComebackPlan({ comebackStartDate: comebackStart, today });
    const todayStr = format(today, 'yyyy-MM-dd');
    const todayWorkouts = block.weeks.flatMap((w) => w.workouts).filter((w) => w.date === todayStr);
    const upcoming = block.weeks.flatMap((w) => w.workouts).filter((w) => w.date > todayStr).slice(0, 4);

    return (
      <div className="space-y-6">
        {sub?.status === 'trialing' && <TrialBanner days={trialDaysLeft} locale={locale} />}

        <div className="card-dark relative overflow-hidden">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-aurora-500/20 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <HeartHandshake className="h-8 w-8 text-aurora-400 shrink-0 mt-1" />
            <div>
              <h2 className="font-display text-2xl">Protocole de reprise — jour {daysSinceStart + 1} / 14</h2>
              <p className="text-ink-300 mt-2 text-sm">
                Reprise progressive sur 14 jours. À la fin de cette période, le plan normal reprendra
                automatiquement.
              </p>
              <div className="mt-4">
                <ResumeNormalButton label="Annuler le protocole — retour au plan normal" />
              </div>
            </div>
          </div>
        </div>

        <header>
          <p className="text-sm text-ink-600">{format(today, 'EEEE dd MMMM')}</p>
          <h1 className="display text-4xl md:text-5xl text-ink-950">Aujourd&apos;hui</h1>
        </header>

        {todayWorkouts.length === 0 ? (
          <div className="card"><p className="text-ink-700">Pas de séance prévue aujourd&apos;hui — récupérez.</p></div>
        ) : (
          <div className="space-y-4">
            {todayWorkouts.map((w) => <WorkoutCard key={w.id} workout={w} vdot={Number(profile.vdot)} />)}
          </div>
        )}

        <section>
          <h2 className="text-lg font-semibold text-ink-900 mb-3">Jours suivants</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {upcoming.map((w) => <WorkoutCard key={w.id} workout={w} vdot={Number(profile.vdot)} compact />)}
          </div>
        </section>
      </div>
    );
  }

  // === POST-BREAK RAMP-UP DETECTION ===
  // If a break ended recently, cap the current weekly km on a 4-week ramp
  // so we don't throw the runner back at 100 % from day one.
  let postBreakInfo: { weeksSinceEnd: number; cappedKm: number; preBreakKm: number } | null = null;
  if (profile.break_ended_on && profile.pre_break_weekly_km) {
    const weeksSinceEnd = Math.floor(
      (Date.now() - new Date(profile.break_ended_on).getTime()) / (7 * 86400000),
    );
    if (weeksSinceEnd < POST_BREAK_RAMP_WEEKS) {
      postBreakInfo = {
        weeksSinceEnd,
        preBreakKm: Number(profile.pre_break_weekly_km),
        cappedKm: postBreakWeeklyKmCap(Number(profile.pre_break_weekly_km), weeksSinceEnd),
      };
    } else {
      // Ramp complete — clear the flags so the runner returns to normal.
      await supabase.from('profiles').update({
        break_started_on: null,
        break_ended_on: null,
        pre_break_weekly_km: null,
      }).eq('id', user.id);
    }
  }

  // === NORMAL STATE ===
  let block: TrainingBlock;
  if (blockRow && new Date(blockRow.end_date) >= new Date() && !postBreakInfo) {
    block = blockRow.payload as TrainingBlock;
  } else {
    const runner: RunnerProfile = {
      experienceYears: Number(profile.experience_years),
      currentWeeklyKm: postBreakInfo ? postBreakInfo.cappedKm : Number(profile.current_weekly_km),
      daysPerWeek: profile.days_per_week,
      hasDoneIntervals: profile.has_done_intervals,
      goal: profile.goal,
      vdot: Number(profile.vdot),
      sex: profile.sex ?? 'other',
      trackCycle: profile.track_cycle,
      timeConstraintsMinPerSession: profile.time_constraints_min ?? undefined,
    };
    block = generatePlan({
      profile: runner,
      startDate: new Date(),
      weeks: 4,
      locale: locale as any,
      raceDate: primaryRace?.race_date ? new Date(primaryRace.race_date) : undefined,
      raceDistanceMeters: primaryRace?.distance_meters ?? undefined,
      racePriority: (primaryRace?.priority as 'A' | 'B' | 'C' | undefined) ?? 'A',
    });
    await supabase.from('training_blocks').insert({
      user_id: user.id,
      start_date: block.startDate,
      end_date: block.endDate,
      payload: block,
      target_race_id: primaryRace?.id ?? null,
    });
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayWorkouts: Workout[] = block.weeks.flatMap((w) => w.workouts).filter((w) => w.date === today);
  const upcoming: Workout[] = block.weeks.flatMap((w) => w.workouts).filter((w) => w.date > today).slice(0, 4);

  return (
    <div className="space-y-6">
      {sub?.status === 'trialing' && <TrialBanner days={trialDaysLeft} locale={locale} />}

      {postBreakInfo && (
        <div className="card border-sky-200 ring-sky-100">
          <div className="flex items-start gap-3">
            <Coffee className="h-6 w-6 text-sky-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-ink-900">
                Reprise après coupure — semaine {postBreakInfo.weeksSinceEnd + 1} / {POST_BREAK_RAMP_WEEKS}
              </p>
              <p className="text-ink-700 mt-1">
                Volume plafonné à {postBreakInfo.cappedKm} km/sem ({Math.round(100 * postBreakInfo.cappedKm / postBreakInfo.preBreakKm)} % de votre volume d&apos;avant coupure). Plein volume rétabli dans {POST_BREAK_RAMP_WEEKS - postBreakInfo.weeksSinceEnd} sem.
              </p>
            </div>
          </div>
        </div>
      )}

      <header>
        <p className="text-sm text-ink-600">{format(new Date(), 'EEEE dd MMMM')}</p>
        <h1 className="display text-4xl md:text-5xl text-ink-950">{t('today')}</h1>
      </header>

      <TodayFeedback locale={locale} userId={user.id} todayDate={today} trackCycle={profile.track_cycle} />

      <RacePredictor vdot={Number(profile.vdot)} />

      {todayWorkouts.length === 0 ? (
        <div className="card"><p className="text-ink-700">Pas de séance prévue aujourd&apos;hui.</p></div>
      ) : (
        <div className="space-y-4">
          {todayWorkouts.map((w) => <WorkoutCard key={w.id} workout={w} vdot={Number(profile.vdot)} />)}
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold text-ink-900 mb-3">À venir</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {upcoming.map((w) => <WorkoutCard key={w.id} workout={w} vdot={Number(profile.vdot)} compact />)}
        </div>
      </section>
    </div>
  );
}
