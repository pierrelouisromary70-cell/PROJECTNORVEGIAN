import { setRequestLocale } from 'next-intl/server';
import { format } from 'date-fns';
import { generatePlan } from '@/lib/training/plan-generator';
import type { RunnerProfile } from '@/lib/training/types';
import { WorkoutCard } from '@/components/WorkoutCard';
import { RacePredictor } from '@/components/RacePredictor';

export default async function DemoPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const profile: RunnerProfile = {
    experienceYears: 3,
    currentWeeklyKm: 45,
    daysPerWeek: 5,
    hasDoneIntervals: true,
    goal: 'perform',
    vdot: 45,
    sex: 'female',
    trackCycle: true,
    timeConstraintsMinPerSession: 75,
  };

  const block = generatePlan({ profile, startDate: new Date(), weeks: 4, locale: locale as any });
  const all = block.weeks.flatMap((w) => w.workouts);
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayWorkouts = all.filter((w) => w.date === today);
  const upcoming = all.filter((w) => w.date > today).slice(0, 4);
  const hardSession = all.find((w) => w.type === 'lt2_threshold' || w.type === 'lt1_threshold') ?? all[1];

  return (
    <main className="min-h-screen bg-white p-6 md:p-10 max-w-3xl mx-auto space-y-10">
      <div className="rounded-2xl bg-gradient-to-r from-aurora-600 to-ink-950 text-white p-4 flex items-center justify-between gap-4">
        <p className="font-medium">Essai gratuit — 13 jours restants</p>
        <button className="btn bg-white text-ink-950 font-semibold">Activer (14,99 €/mois)</button>
      </div>

      <header>
        <p className="text-sm text-ink-600">{format(new Date(), 'EEEE dd MMMM')}</p>
        <h1 className="display text-4xl md:text-5xl text-ink-950">Aujourd&apos;hui</h1>
      </header>

      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink-900">Comment vous sentez-vous ?</h2>
          <button className="btn-secondary">Renseigner</button>
        </div>
        <p className="text-xs text-ink-600 mt-3">Le suivi du cycle est activé — les phases lutéales et menstruelles allègent automatiquement les séances dures si vous êtes fatiguée.</p>
      </div>

      <RacePredictor vdot={profile.vdot} />

      <section>
        <h2 className="text-lg font-semibold text-ink-900 mb-3">Séance du jour</h2>
        <div className="space-y-4">
          {(todayWorkouts.length > 0 ? todayWorkouts : [hardSession]).map((w) => (
            <WorkoutCard key={w.id} workout={w} vdot={profile.vdot} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink-900 mb-3">À venir cette semaine</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {upcoming.map((w) => <WorkoutCard key={w.id} workout={w} vdot={profile.vdot} compact />)}
        </div>
      </section>
    </main>
  );
}
