import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { generatePlan } from '@/lib/training/plan-generator';
import type { RunnerProfile, TrainingBlock, Workout } from '@/lib/training/types';
import { WorkoutCard } from '@/components/WorkoutCard';
import { RacePredictor } from '@/components/RacePredictor';
import { TodayFeedback } from './TodayFeedback';
import { TrialBanner } from './TrialBanner';

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

  let block: TrainingBlock;
  if (blockRow && new Date(blockRow.end_date) >= new Date()) {
    block = blockRow.payload as TrainingBlock;
  } else {
    const runner: RunnerProfile = {
      experienceYears: Number(profile.experience_years),
      currentWeeklyKm: Number(profile.current_weekly_km),
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

  const trialDaysLeft = sub?.trial_end ? Math.max(0, Math.ceil((new Date(sub.trial_end).getTime() - Date.now()) / 86400000)) : 0;

  return (
    <div className="space-y-6">
      {sub?.status === 'trialing' && <TrialBanner days={trialDaysLeft} locale={locale} />}

      <header>
        <p className="text-sm text-ink-600">{format(new Date(), 'EEEE dd MMMM')}</p>
        <h1 className="display text-4xl md:text-5xl text-ink-950">{t('today')}</h1>
      </header>

      <TodayFeedback locale={locale} userId={user.id} todayDate={today} trackCycle={profile.track_cycle} />

      <RacePredictor vdot={Number(profile.vdot)} />

      {todayWorkouts.length === 0 ? (
        <div className="card">
          <p className="text-ink-700">Pas de séance prévue aujourd'hui.</p>
        </div>
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
