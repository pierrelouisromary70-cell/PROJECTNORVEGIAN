'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Pause, Play, SkipForward } from 'lucide-react';
import type { Workout, WorkoutStep } from '@/lib/training/types';
import type { PaceZones } from '@/lib/vdot/paces';
import { formatRange } from '@/lib/vdot/paces';
import { formatDistance } from '@/lib/utils';

/**
 * Flattened step list — repeats are expanded so that "5 × 1000 m + récup 60 s"
 * becomes 10 entries (5 work intervals + 5 recoveries). Keeps the timer logic
 * trivial and matches what the runner actually does on the road.
 */
interface RunnerStep {
  label: string;
  detail: string;
  targetSeconds: number | null; // null = no target (manual advance only)
  paceLabel: string;
  kind: 'work' | 'recovery' | 'transition';
}

function flattenSteps(steps: WorkoutStep[], zones: PaceZones): RunnerStep[] {
  const out: RunnerStep[] = [];
  steps.forEach((s, i) => {
    const reps = s.reps ?? 1;
    const paceLabel = s.pace && (zones as any)[s.pace] ? formatRange((zones as any)[s.pace]) : '';
    const baseLabel =
      s.distanceMeters && s.distanceMeters > 0
        ? formatDistance(s.distanceMeters)
        : s.durationSeconds
          ? `${Math.round(s.durationSeconds / 60)} min`
          : '—';
    const kind: 'work' | 'recovery' =
      s.pace === 'easy' && (s.note?.toLowerCase().includes('récup') || s.note?.toLowerCase().includes('recovery'))
        ? 'recovery'
        : 'work';

    // Estimated target seconds: prefer explicit duration, else estimate from distance + pace midpoint.
    function estimatedSeconds(): number | null {
      if (s.durationSeconds) return s.durationSeconds;
      if (s.distanceMeters && s.pace && (zones as any)[s.pace]) {
        const zone = (zones as any)[s.pace] as { lowSecPerKm: number; highSecPerKm: number };
        const mid = (zone.lowSecPerKm + zone.highSecPerKm) / 2;
        return Math.round((s.distanceMeters / 1000) * mid);
      }
      return null;
    }

    for (let r = 0; r < reps; r++) {
      out.push({
        label: reps > 1 ? `${baseLabel} (rep ${r + 1}/${reps})` : baseLabel,
        detail: s.note ?? '',
        targetSeconds: estimatedSeconds(),
        paceLabel,
        kind,
      });
      if (s.recoverySeconds && s.recoverySeconds > 0 && r < reps - 1) {
        out.push({
          label: `Récup ${s.recoverySeconds}s`,
          detail: '',
          targetSeconds: s.recoverySeconds,
          paceLabel: '',
          kind: 'recovery',
        });
      }
    }
    if (i < steps.length - 1) {
      out.push({ label: '— transition —', detail: '', targetSeconds: null, paceLabel: '', kind: 'transition' });
    }
  });
  return out;
}

function fmt(secs: number): string {
  if (secs < 0) secs = 0;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function WorkoutRunner({
  workout,
  zones,
  locale,
}: {
  workout: Workout;
  zones: PaceZones;
  locale: string;
}) {
  const router = useRouter();
  const steps = useMemo(() => flattenSteps(workout.steps, zones), [workout, zones]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      tickRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      return () => {
        if (tickRef.current) clearInterval(tickRef.current);
      };
    }
  }, [running]);

  function nextStep() {
    if (currentIdx >= steps.length - 1) {
      setRunning(false);
      setDone(true);
      return;
    }
    setCurrentIdx((i) => i + 1);
    setElapsed(0);
  }

  async function validateAndQuit() {
    try {
      await fetch('/api/workouts/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutId: workout.id,
          workoutDate: workout.date,
          status: 'done',
        }),
      });
    } catch {
      // best-effort
    }
    router.push(`/${locale}/dashboard`);
    router.refresh();
  }

  const step = steps[currentIdx] ?? steps[steps.length - 1];
  const target = step?.targetSeconds ?? null;
  const remaining = target !== null ? Math.max(0, target - elapsed) : null;
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? Math.round(((currentIdx + (target && elapsed >= target ? 1 : 0)) / totalSteps) * 100) : 0;

  if (done) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Link href={`/${locale}/dashboard`} className="text-sm text-ink-600 hover:text-ink-900 inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Retour au tableau de bord
        </Link>
        <div className="card-dark space-y-4">
          <h1 className="font-display text-3xl">Séance terminée 🏁</h1>
          <p className="text-ink-300">Bravo. Confirmez pour enregistrer la séance comme validée et nourrir l&apos;adaptation du plan.</p>
          <div className="flex flex-wrap gap-3">
            <button onClick={validateAndQuit} className="btn-accent">
              <Check className="h-4 w-4" /> Valider la séance
            </button>
            <Link href={`/${locale}/dashboard`} className="btn-ghost text-white">
              Plus tard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="card">
        <p className="text-ink-700">Cette séance n&apos;est pas dérouleable avec le chrono (par exemple, jour de repos).</p>
        <Link href={`/${locale}/dashboard`} className="btn-primary mt-4 inline-flex">Retour</Link>
      </div>
    );
  }

  const tone =
    step.kind === 'work' ? 'bg-aurora-50 border-aurora-200'
    : step.kind === 'recovery' ? 'bg-sky-50 border-sky-200'
    : 'bg-ink-50 border-ink-200';

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href={`/${locale}/dashboard`} className="text-sm text-ink-600 hover:text-ink-900 inline-flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Quitter (la progression est perdue)
      </Link>

      <header>
        <h1 className="display text-3xl text-ink-950">{workout.title}</h1>
        <p className="text-sm text-ink-600 mt-1">
          Étape {currentIdx + 1} / {totalSteps} — {progress}% du plan de la séance
        </p>
        <div className="mt-3 h-2 rounded-full bg-ink-100 overflow-hidden">
          <div className="h-full bg-aurora-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <div className={`card border-2 ${tone}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">
          {step.kind === 'work' ? 'Effort' : step.kind === 'recovery' ? 'Récupération' : 'Transition'}
        </p>
        <h2 className="text-3xl font-bold text-ink-950 mt-2">{step.label}</h2>
        {step.paceLabel && <p className="text-ink-700 mt-1">Allure : {step.paceLabel}</p>}
        {step.detail && <p className="text-sm text-ink-600 mt-1">{step.detail}</p>}

        <div className="mt-6 flex items-baseline gap-4">
          {target !== null ? (
            <>
              <span className="text-5xl font-mono font-bold text-ink-950">{fmt(remaining ?? 0)}</span>
              <span className="text-sm text-ink-600">restant sur {fmt(target)}</span>
            </>
          ) : (
            <>
              <span className="text-5xl font-mono font-bold text-ink-950">{fmt(elapsed)}</span>
              <span className="text-sm text-ink-600">temps écoulé</span>
            </>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {!running ? (
            <button onClick={() => setRunning(true)} className="btn-primary">
              <Play className="h-4 w-4" /> {elapsed === 0 ? 'Démarrer' : 'Reprendre'}
            </button>
          ) : (
            <button onClick={() => setRunning(false)} className="btn-ghost">
              <Pause className="h-4 w-4" /> Pause
            </button>
          )}
          <button onClick={nextStep} className="btn bg-ink-100 text-ink-800 hover:bg-ink-200">
            <SkipForward className="h-4 w-4" /> {currentIdx >= steps.length - 1 ? 'Terminer' : 'Étape suivante'}
          </button>
        </div>
      </div>

      {currentIdx + 1 < steps.length && (
        <div className="card text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-600 mb-2">Et après…</p>
          <ul className="space-y-1">
            {steps.slice(currentIdx + 1, currentIdx + 4).map((s, i) => (
              <li key={i} className="text-ink-700">
                <span className="text-ink-500">{currentIdx + 2 + i}.</span> {s.label}
                {s.paceLabel && <span className="text-ink-500"> · {s.paceLabel}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
