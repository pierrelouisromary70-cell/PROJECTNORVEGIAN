import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { WorkoutCard } from '@/components/WorkoutCard';
import type { TrainingBlock, Workout } from '@/lib/training/types';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

// Color a day cell by the most-significant workout that day. Quality stands out,
// long is medium-intensity, easy is light, rest is neutral.
function dayCell(workouts: Workout[]): { kind: string; cls: string; title: string } {
  const QUALITY = ['lt1_threshold', 'lt2_threshold', 'vo2max', 'hills', 'race_pace'];
  if (workouts.length === 0) return { kind: '·', cls: 'bg-ink-50 text-ink-400', title: 'Rien de prévu' };
  if (workouts.every((w) => w.type === 'rest')) return { kind: '·', cls: 'bg-ink-100 text-ink-500', title: 'Repos' };
  const labels = workouts.map((w) => {
    if (QUALITY.includes(w.type)) return { k: 'Q', cls: 'bg-aurora-500 text-white', t: w.title };
    if (w.type === 'long') return { k: 'L', cls: 'bg-aurora-300 text-ink-950', t: w.title };
    if (w.type === 'strides') return { k: 'S', cls: 'bg-aurora-200 text-aurora-900', t: w.title };
    if (w.type === 'easy') return { k: 'E', cls: 'bg-aurora-100 text-aurora-800', t: w.title };
    return { k: '–', cls: 'bg-ink-50 text-ink-500', t: w.title };
  });
  // Rank: Q > L > S > E
  const order = ['Q', 'L', 'S', 'E', '–'];
  const picked = labels.sort((a, b) => order.indexOf(a.k) - order.indexOf(b.k))[0];
  return { kind: picked.k, cls: picked.cls, title: workouts.map((w) => w.title).join(' + ') };
}

export default async function PlanPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  const supabase = await createClient();
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
  const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-ink-950">Plan d&apos;entraînement</h1>
        <p className="text-ink-700">Bloc de {block.weeks.length} semaines · du {block.startDate} au {block.endDate}</p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-aurora-500" /> Qualité (seuil/VO2/côtes)</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-aurora-300" /> Sortie longue</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-aurora-100" /> Easy</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-ink-100" /> Repos</span>
        </div>
      </header>

      {block.weeks.map((w) => {
        const weekStart = new Date(w.startDate).getTime();
        const days = Array.from({ length: 7 }, (_, i) => {
          const date = format(new Date(weekStart + i * 86400000), 'yyyy-MM-dd');
          const workouts = w.workouts.filter((wk) => wk.date === date);
          return { date, label: dayLabels[i], ...dayCell(workouts) };
        });
        return (
          <section key={w.weekNumber} className="card space-y-4">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <h2 className="font-display text-xl text-ink-950">Semaine {w.weekNumber}</h2>
              <div className="text-sm text-ink-600 flex items-center gap-3">
                <span className="chip-accent">{tPhases(w.phase)}</span>
                <span className="font-semibold text-ink-950 tabular-nums">{w.totalKm} km</span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((d, i) => (
                <div key={i} className={`h-14 rounded-lg ${d.cls} flex flex-col items-center justify-center text-xs font-bold leading-tight`} title={d.title}>
                  <span className="opacity-80">{d.label}</span>
                  <span className="text-base mt-0.5">{d.kind}</span>
                </div>
              ))}
            </div>
            {w.notes && <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{w.notes}</p>}
            <details className="group">
              <summary className="cursor-pointer text-sm font-semibold text-ink-700 hover:text-ink-950 list-none flex items-center gap-1">
                <span className="group-open:rotate-90 transition inline-block">▸</span> Détail des séances
              </summary>
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                {w.workouts.map((wk) => <WorkoutCard key={wk.id} workout={wk} vdot={Number(profile?.vdot ?? 40)} compact />)}
              </div>
            </details>
          </section>
        );
      })}
    </div>
  );
}
