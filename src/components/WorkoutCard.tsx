'use client';
import { useTranslations } from 'next-intl';
import type { Workout } from '@/lib/training/types';
import { buildPaceZones, formatRange, type PaceZones } from '@/lib/vdot/paces';
import { formatDistance, formatDuration } from '@/lib/utils';
import { Flame, Gauge, MapPin } from 'lucide-react';

export function WorkoutCard({ workout, vdot, compact = false }: { workout: Workout; vdot: number; compact?: boolean }) {
  const t = useTranslations('workout');
  const zones = buildPaceZones(vdot);

  if (compact) {
    return (
      <div className="card flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-fjord-600 uppercase tracking-wide">{workout.date}{workout.amPm ? ` · ${workout.amPm}` : ''}</div>
          <div className="font-semibold text-fjord-900">{workout.title}</div>
          <div className="text-sm text-fjord-700">{formatDistance(workout.totalDistanceMeters)} · {formatDuration(workout.totalDurationSeconds)}</div>
        </div>
        <span className="chip"><Gauge className="h-3 w-3" /> RPE {workout.rpe || '—'}</span>
      </div>
    );
  }

  return (
    <article className="card space-y-5">
      <header>
        <div className="flex items-center gap-2 text-xs text-fjord-600 uppercase tracking-wide">
          <span>{workout.date}</span>
          {workout.amPm && <span className="chip">{workout.amPm}</span>}
        </div>
        <h2 className="text-2xl font-bold text-fjord-950 mt-1">{workout.title}</h2>
        <div className="flex flex-wrap gap-3 mt-3 text-sm">
          <span className="chip"><MapPin className="h-3 w-3" /> {formatDistance(workout.totalDistanceMeters)}</span>
          <span className="chip">{formatDuration(workout.totalDurationSeconds)}</span>
          <span className="chip"><Flame className="h-3 w-3" /> RPE {workout.rpe}/10</span>
        </div>
      </header>

      <Section title={t('purpose')}>
        <p className="text-fjord-800">{workout.purpose}</p>
      </Section>
      <Section title={t('feel')}>
        <p className="text-fjord-800">{workout.feel}</p>
      </Section>

      <Section title={t('detail')}>
        <ol className="space-y-2">
          {workout.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-1 h-6 w-6 shrink-0 rounded-full bg-fjord-100 text-fjord-700 text-xs grid place-items-center font-semibold">{i + 1}</span>
              <div>
                <div className="font-medium text-fjord-900">{renderStep(s, zones, t)}</div>
                {s.note && <div className="text-sm text-fjord-600">{s.note}</div>}
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {workout.guidance.length > 0 && (
        <Section title={t('guidance')}>
          <ul className="list-disc pl-5 space-y-1 text-fjord-800">
            {workout.guidance.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </Section>
      )}
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-fjord-600 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function renderStep(s: { reps?: number; distanceMeters?: number; durationSeconds?: number; pace?: string; recoverySeconds?: number }, zones: PaceZones, t: ReturnType<typeof useTranslations<'workout'>>) {
  const paceLabel = s.pace && (zones as any)[s.pace] ? formatRange((zones as any)[s.pace]) : '';
  const dist = s.distanceMeters ? formatDistance(s.distanceMeters) : '';
  const dur = s.durationSeconds ? `${s.durationSeconds}s` : '';
  const body = `${dist}${dur ? ` ${dur}` : ''}${paceLabel ? ` @ ${paceLabel}` : ''}`;
  if (s.reps) {
    return `${s.reps} × ${body}${s.recoverySeconds ? ` — ${t('recovery')} ${s.recoverySeconds}s` : ''}`;
  }
  return body;
}
