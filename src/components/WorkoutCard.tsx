'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Workout, WorkoutStep } from '@/lib/training/types';
import { buildPaceZones, formatRange, type PaceZones } from '@/lib/vdot/paces';
import { formatDistance, formatDuration } from '@/lib/utils';
import { ChevronDown, Flame, Gauge, MapPin, Play } from 'lucide-react';
import { WorkoutLogControls, type WorkoutLogStatus } from './WorkoutLogControls';

// Map RPE (1-10) → tailwind border + chip tints. RPE is the most honest one-glance
// signal of how hard a session will feel; coloring the rail lets the runner scan
// a week of cards and instantly read the polarisation.
function intensityTint(rpe: number): { rail: string; chip: string; dot: string; seg: string } {
  if (rpe <= 0) return { rail: 'border-l-ink-200', chip: 'bg-ink-100 text-ink-700', dot: 'bg-ink-400', seg: 'bg-ink-400' };
  if (rpe <= 3) return { rail: 'border-l-aurora-500', chip: 'bg-aurora-50 text-aurora-800', dot: 'bg-aurora-500', seg: 'bg-aurora-500' };
  if (rpe <= 6) return { rail: 'border-l-amber-400', chip: 'bg-amber-50 text-amber-800', dot: 'bg-amber-400', seg: 'bg-amber-400' };
  return { rail: 'border-l-rose-500', chip: 'bg-rose-50 text-rose-800', dot: 'bg-rose-500', seg: 'bg-rose-500' };
}

/** Compact 5-segment intensity bar; each segment covers 2 RPE points. */
function RpeBar({ rpe, segCls }: { rpe: number; segCls: string }) {
  const filled = Math.max(0, Math.min(5, Math.ceil(rpe / 2)));
  return (
    <span className="inline-flex items-center gap-0.5 ml-1" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-sm ${i < filled ? segCls : 'bg-ink-200/60'}`} />
      ))}
    </span>
  );
}

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
}

export function WorkoutCard({ workout, vdot, compact = false, withLogControls = false, logStatus, runnerLocale }: WorkoutCardProps) {
  const t = useTranslations('workout');
  const zones = buildPaceZones(vdot);
  const tint = intensityTint(workout.rpe);
  const [open, setOpen] = useState(false);
  const hasDetail = workout.steps.length > 0 || workout.guidance.length > 0;

  if (compact) {
    return (
      <div className={`card border-l-4 ${tint.rail} !p-0 overflow-hidden`}>
        <button
          type="button"
          onClick={() => hasDetail && setOpen((v) => !v)}
          className="w-full flex items-start justify-between gap-4 p-5 text-left"
          aria-expanded={open}
        >
          <div>
            <div className="text-xs text-fjord-600 uppercase tracking-wide">{workout.date}{workout.amPm ? ` · ${workout.amPm}` : ''}</div>
            <div className="font-semibold text-fjord-900">{workout.title}</div>
            <div className="text-sm text-fjord-700">{formatDistance(workout.totalDistanceMeters)} · {formatDuration(workout.totalDurationSeconds)}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`chip ${tint.chip}`}><Gauge className="h-3 w-3" /> RPE {workout.rpe || '—'}<RpeBar rpe={workout.rpe} segCls={tint.seg} /></span>
            {hasDetail && (
              <ChevronDown className={`h-4 w-4 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            )}
          </div>
        </button>
        {open && hasDetail && (
          <div className="px-5 pb-5 -mt-1">
            <WorkoutDetail workout={workout} zones={zones} t={t} />
            {runnerLocale && workout.type !== 'rest' && (
              <Link
                href={`/${runnerLocale}/workout/${encodeURIComponent(workout.id)}`}
                className="btn-secondary inline-flex mt-4 text-sm"
              >
                <Play className="h-4 w-4" /> Dérouler la séance (chrono)
              </Link>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <article className={`card space-y-5 border-l-4 ${tint.rail}`}>
      <header>
        <div className="flex items-center gap-2 text-xs text-fjord-600 uppercase tracking-wide">
          <span className={`h-1.5 w-1.5 rounded-full ${tint.dot}`} />
          <span>{workout.date}</span>
          {workout.amPm && <span className="chip">{workout.amPm}</span>}
        </div>
        <h2 className="text-2xl font-bold text-fjord-950 mt-1">{workout.title}</h2>
        <div className="flex flex-wrap gap-3 mt-3 text-sm">
          <span className="chip"><MapPin className="h-3 w-3" /> {formatDistance(workout.totalDistanceMeters)}</span>
          <span className="chip">{formatDuration(workout.totalDurationSeconds)}</span>
          <span className={`chip ${tint.chip}`}><Flame className="h-3 w-3" /> RPE {workout.rpe}/10<RpeBar rpe={workout.rpe} segCls={tint.seg} /></span>
        </div>
      </header>

      <WorkoutDetail workout={workout} zones={zones} t={t} />

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

/** Shared session breakdown: purpose, feel, step-by-step (WU / reps + paces +
 *  recovery / CD), and coach cues. Used by both the full card and the
 *  expanded compact card so an upcoming session shows the exact same detail
 *  as today's. */
function WorkoutDetail({ workout, zones, t }: { workout: Workout; zones: PaceZones; t: ReturnType<typeof useTranslations<'workout'>> }) {
  return (
    <div className="space-y-5">
      {workout.purpose && (
        <Section title={t('purpose')}>
          <p className="text-fjord-800">{workout.purpose}</p>
        </Section>
      )}
      {workout.feel && (
        <Section title={t('feel')}>
          <p className="text-fjord-800">{workout.feel}</p>
        </Section>
      )}
      {workout.steps.length > 0 && (
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
      )}
      {workout.guidance.length > 0 && (
        <Section title={t('guidance')}>
          <ul className="list-disc pl-5 space-y-1 text-fjord-800">
            {workout.guidance.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </Section>
      )}
    </div>
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
