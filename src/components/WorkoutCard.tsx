'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Workout, WorkoutStep } from '@/lib/training/types';
import { buildPaceZones, formatRange, type PaceZones } from '@/lib/vdot/paces';
import { formatDistance, formatDuration } from '@/lib/utils';
import { Flame, Gauge, MapPin, Play } from 'lucide-react';
import { WorkoutLogControls, type WorkoutLogStatus } from './WorkoutLogControls';

export interface WorkoutCardProps {
  workout: Workout;
  vdot: number;
  compact?: boolean;
  /** When true, show the validation/log controls under the card. */
  withLogControls?: boolean;
  /** Existing log status if the runner already validated this workout. */
  logStatus?: WorkoutLogStatus;
  /** Locale prefix for the in-app workout runner link (e.g. 'fr'). */
  runnerLocale?: string;
  /** "Virtual lactate" calibration: sec/km to add to the LT1/LT2 ranges (positive = slower). */
  zoneOffsets?: { lt1: number; lt2: number };
}

export function WorkoutCard({ workout, vdot, compact = false, withLogControls = false, logStatus, runnerLocale, zoneOffsets }: WorkoutCardProps) {
  const t = useTranslations('workout');
  const base = buildPaceZones(vdot);
  const zones: PaceZones = zoneOffsets
    ? {
        ...base,
        lt1: { minSecPerKm: base.lt1.minSecPerKm + zoneOffsets.lt1, maxSecPerKm: base.lt1.maxSecPerKm + zoneOffsets.lt1 },
        lt2: { minSecPerKm: base.lt2.minSecPerKm + zoneOffsets.lt2, maxSecPerKm: base.lt2.maxSecPerKm + zoneOffsets.lt2 },
      }
    : base;

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
                <div className="font-medium text-fjord-900">{renderStep(s, zones, t('recovery'))}</div>
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

      {(withLogControls || runnerLocale) && (
        <div className="border-t border-ink-100 pt-4 space-y-3">
          {runnerLocale && workout.type !== 'rest' && (
            <Link
              href={`/${runnerLocale}/workout/${encodeURIComponent(workout.id)}`}
              className="btn-primary inline-flex"
            >
              <Play className="h-4 w-4" /> Dérouler la séance (chrono)
            </Link>
          )}
          {withLogControls && (
            <WorkoutLogControls
              workoutId={workout.id}
              workoutDate={workout.date}
              initialStatus={logStatus}
            />
          )}
        </div>
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

function renderStep(s: WorkoutStep, zones: PaceZones, recoveryLabel: string) {
  const paceLabel = s.pace && (zones as any)[s.pace] ? formatRange((zones as any)[s.pace]) : '';
  const dist = s.distanceMeters ? formatDistance(s.distanceMeters) : '';
  const dur = s.durationSeconds ? `${s.durationSeconds}s` : '';
  const body = `${dist}${dur ? ` ${dur}` : ''}${paceLabel ? ` @ ${paceLabel}` : ''}`;
  if (s.reps) {
    return `${s.reps} × ${body}${s.recoverySeconds ? ` — ${recoveryLabel} ${s.recoverySeconds}s` : ''}`;
  }
  return body;
}
