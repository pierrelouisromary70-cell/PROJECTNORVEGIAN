import { redirect } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { WorkoutCard } from '@/components/WorkoutCard';
import type { TrainingBlock } from '@/lib/training/types';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function PlanPage({ params: { locale } }: { params: { locale: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const [{ data: profile }, { data: blockRow }] = await Promise.all([
    supabase.from('profiles').select('vdot').eq('id', user.id).maybeSingle(),
    supabase.from('training_blocks').select('*').eq('user_id', user.id).order('start_date', { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (!blockRow) {
    return <div className="card">Aucun bloc actif. Retournez au tableau de bord pour en générer un.</div>;
  }

  const block = blockRow.payload as TrainingBlock;
  const tPhases = await getTranslations({ locale, namespace: 'phases' });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-fjord-950">Plan d'entraînement</h1>
        <p className="text-fjord-700">Bloc de {block.weeks.length} semaines · du {block.startDate} au {block.endDate}</p>
      </header>

      {block.weeks.map((w) => (
        <section key={w.weekNumber} className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold text-fjord-900">Semaine {w.weekNumber}</h2>
            <div className="text-sm text-fjord-600 flex gap-3">
              <span className="chip">{tPhases(w.phase)}</span>
              <span>{w.totalKm} km</span>
            </div>
          </div>
          {w.notes && <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{w.notes}</p>}
          <div className="grid sm:grid-cols-2 gap-3">
            {w.workouts.map((wk) => <WorkoutCard key={wk.id} workout={wk} vdot={Number(profile?.vdot ?? 40)} compact />)}
          </div>
        </section>
      ))}
    </div>
  );
}
