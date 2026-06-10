import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { Gauge, TrendingUp, CheckCircle2, Activity } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { calibrationMessage, computeCalibration, feedbackFromLogs } from '@/lib/training/calibration';
import type { TrainingBlock, Workout } from '@/lib/training/types';

export const dynamic = 'force-dynamic';

interface WeekSummary {
  startDate: string;
  plannedKm: number;
  doneKm: number;
  qualityPlanned: number;
  qualityDone: number;
}

const QUALITY_TYPES = ['lt1_threshold', 'lt2_threshold', 'vo2max', 'hills', 'race_pace'];

export default async function ProgressPage({ params: { locale } }: { params: { locale: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const twelveWeeksAgo = new Date(Date.now() - 12 * 7 * 86400000).toISOString().slice(0, 10);
  const [{ data: profile }, { data: blocks }, { data: logs }] = await Promise.all([
    supabase.from('profiles').select('vdot, current_weekly_km').eq('id', user.id).maybeSingle(),
    supabase.from('training_blocks').select('payload, start_date').eq('user_id', user.id).gte('end_date', twelveWeeksAgo).order('start_date', { ascending: true }),
    supabase.from('workout_logs').select('workout_id, workout_date, status, actual_distance_meters, actual_rpe').eq('user_id', user.id).gte('workout_date', twelveWeeksAgo),
  ]);
  if (!profile?.vdot) redirect(`/${locale}/onboarding`);

  const logByWorkoutId = new Map((logs ?? []).map((l) => [l.workout_id, l]));
  const today = format(new Date(), 'yyyy-MM-dd');

  // Most recent block wins for overlapping weeks (blocks get regenerated).
  const weekMap = new Map<string, WeekSummary>();
  const allWorkouts: Workout[] = [];
  for (const row of blocks ?? []) {
    const block = row.payload as TrainingBlock;
    for (const week of block.weeks) {
      if (week.startDate > today) continue;
      const workouts = week.workouts.filter((w) => w.type !== 'rest');
      allWorkouts.push(...workouts);
      const pastWorkouts = workouts.filter((w) => w.date <= today);
      let doneKm = 0;
      let qualityDone = 0;
      for (const w of pastWorkouts) {
        const log = logByWorkoutId.get(w.id);
        if (!log || log.status === 'skipped') continue;
        const km = (log.actual_distance_meters ?? w.totalDistanceMeters) / 1000;
        doneKm += log.status === 'partial' && !log.actual_distance_meters ? km * 0.5 : km;
        if (QUALITY_TYPES.includes(w.type)) qualityDone++;
      }
      weekMap.set(week.startDate, {
        startDate: week.startDate,
        plannedKm: week.totalKm,
        doneKm: Math.round(doneKm),
        qualityPlanned: pastWorkouts.filter((w) => QUALITY_TYPES.includes(w.type)).length,
        qualityDone,
      });
    }
  }
  const weeks = [...weekMap.values()].sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(-8);
  const maxKm = Math.max(1, ...weeks.map((w) => Math.max(w.plannedKm, w.doneKm)));

  const last4 = weeks.slice(-4);
  const qualityPlanned = last4.reduce((s, w) => s + w.qualityPlanned, 0);
  const qualityDone = last4.reduce((s, w) => s + w.qualityDone, 0);
  const adherence = qualityPlanned > 0 ? Math.round((100 * qualityDone) / qualityPlanned) : null;

  const calibration = computeCalibration(feedbackFromLogs(logs ?? [], allWorkouts));
  const calMessage = calibrationMessage(calibration);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="display text-4xl md:text-5xl text-ink-950">Progrès</h1>
        <p className="text-sm text-ink-600 mt-2">Volume réalisé, assiduité sur la qualité et calibration de vos allures.</p>
      </header>

      <div className="grid sm:grid-cols-3 gap-3">
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="VDOT actuel" value={String(profile.vdot)} note="Mis à jour à chaque nouvelle perf" />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Assiduité qualité (4 sem)"
          value={adherence !== null ? `${adherence} %` : '—'}
          note={adherence !== null ? `${qualityDone} / ${qualityPlanned} séances clés validées` : 'Validez vos séances pour suivre votre assiduité'}
        />
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          label="Volume semaine dernière"
          value={weeks.length >= 2 ? `${weeks[weeks.length - 2].doneKm} km` : '—'}
          note={weeks.length >= 2 ? `${weeks[weeks.length - 2].plannedKm} km planifiés` : ''}
        />
      </div>

      <section className="card">
        <h2 className="font-semibold text-ink-900 mb-1">Volume hebdomadaire — planifié vs réalisé</h2>
        <p className="text-xs text-ink-500 mb-4">Le réalisé ne compte que les séances validées. Une barre vide = séances non validées, pas forcément non courues.</p>
        {weeks.length === 0 ? (
          <p className="text-sm text-ink-600">Pas encore de données — votre premier bloc vient de démarrer.</p>
        ) : (
          <div className="space-y-3">
            {weeks.map((w) => (
              <div key={w.startDate}>
                <div className="flex justify-between text-xs text-ink-600 mb-1">
                  <span>Semaine du {w.startDate}</span>
                  <span>{w.doneKm} / {w.plannedKm} km</span>
                </div>
                <div className="relative h-3 rounded-full bg-ink-100 overflow-hidden">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-ink-300" style={{ width: `${(100 * w.plannedKm) / maxKm}%` }} />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-aurora-500" style={{ width: `${(100 * w.doneKm) / maxKm}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div className="flex items-start gap-3">
          <Gauge className="h-6 w-6 text-aurora-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <h2 className="font-semibold text-ink-900">Calibration des allures (lactate virtuel)</h2>
            {calMessage ? (
              <p className="text-ink-700 mt-1">{calMessage}</p>
            ) : calibration.lt1Samples + calibration.lt2Samples >= 3 ? (
              <p className="text-ink-700 mt-1">Vos allures seuil sont bien calibrées — vos retours d&apos;effort collent aux prescriptions. Continuez comme ça.</p>
            ) : (
              <p className="text-ink-700 mt-1">
                Pas encore assez de retours pour calibrer ({calibration.lt1Samples + calibration.lt2Samples} / 3 minimum par zone).
                Validez vos séances seuil avec un RPE honnête : c&apos;est votre lactate-mètre.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 text-ink-600 text-xs uppercase tracking-wide font-semibold">
        <span className="text-aurora-600">{icon}</span> {label}
      </div>
      <div className="font-display text-3xl font-bold text-ink-950 mt-2">{value}</div>
      {note && <div className="text-xs text-ink-500 mt-1">{note}</div>}
    </div>
  );
}
