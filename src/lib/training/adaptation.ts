import type { TrainingBlock, Workout } from './types';

export type FatigueLevel = 1 | 2 | 3 | 4 | 5;
export type PainLevel = 0 | 1 | 2 | 3;
export type CyclePhase =
  | 'menstruation'
  | 'follicular'
  | 'ovulation'
  | 'luteal_early'
  | 'luteal_late'
  | 'unknown';

export interface AdaptationInput {
  fatigue: FatigueLevel;
  pain: PainLevel;
  cyclePhase?: CyclePhase;
  /**
   * User declared up front that cycle phase should not influence training.
   * McNulty 2020 / Elliott-Sale 2021: inter-individual variation dominates,
   * a one-size-fits-all dampening is unsound. Default is "respect the phase
   * dampening only if user fatigue confirms it" — see adaptWorkout.
   */
  ignoreCyclePhase?: boolean;
  availableMinutes?: number;
}

export interface AdaptationResult {
  workout: Workout;
  adapted: boolean;
  reason: string[];
}

/**
 * Adapt a single workout based on how the runner feels today.
 * Rules are intentionally conservative — better one easy day than an injury.
 *
 * Fatigue scale (1-5):
 *   1 fresh, 2 good → no change
 *   3 + hard session → reduce reps by 25 % (smart cut, keep intensity)
 *   4 + hard session → reduce reps by 50 % AND drop one zone (LT2→LT1)
 *   5 → forced rest
 *
 * Pain scale (0-3):
 *   1 niggle → keep session + add warning
 *   2 moderate → reduce intensity to sub-threshold + cut reps 30 %
 *   3 severe → forced rest
 */
export function adaptWorkout(original: Workout, input: AdaptationInput): AdaptationResult {
  const reasons: string[] = [];
  let w: Workout = structuredClone(original);
  let adapted = false;

  if (input.pain >= 3) {
    return {
      adapted: true,
      reason: ['Douleur sévère signalée : repos forcé. Si la douleur persiste 48 h, consultez un kiné.'],
      workout: {
        ...w, type: 'rest', title: 'Repos forcé',
        totalDistanceMeters: 0, totalDurationSeconds: 0, rpe: 0, steps: [],
        guidance: ['Glace si inflammation', "Pas de course aujourd'hui", "Si > 48 h : déclarer la blessure dans le profil"],
      },
    };
  }

  if (input.fatigue >= 5) {
    return {
      adapted: true,
      reason: ['Fatigue extrême signalée : repos. Le surentraînement coûte plus cher que 24 h off.'],
      workout: { ...w, type: 'rest', title: 'Repos (fatigue)', totalDistanceMeters: 0, totalDurationSeconds: 0, rpe: 0, steps: [], guidance: ['Sommeil', 'Hydratation', 'Nutrition'] },
    };
  }

  if (input.pain === 2 && isHardSession(w)) {
    w = reduceRepsAndDropZone(w, 0.7, "Douleur modérée : reps réduites de 30 %, intensité abaissée d'une zone. Restez en sous-seuil.");
    reasons.push('Douleur modérée prise en compte (séance allégée)');
    adapted = true;
  } else if (input.pain === 1 && isHardSession(w)) {
    w = {
      ...w,
      guidance: [
        "⚠️ Gêne légère signalée : restez à l'écoute. Si la douleur augmente pendant la séance, arrêtez immédiatement.",
        ...w.guidance,
      ],
    };
    reasons.push('Gêne légère signalée — surveillez');
    adapted = true;
  }

  if (input.fatigue === 4 && isHardSession(w)) {
    w = reduceRepsAndDropZone(w, 0.5, "Fatigue élevée : nombre de répétitions réduit de 50 %, intensité abaissée d'une zone.");
    reasons.push('Fatigue élevée — séance fortement allégée');
    adapted = true;
  } else if (input.fatigue === 3 && isHardSession(w)) {
    w = reduceReps(w, 0.75, 'Fatigue modérée : nombre de répétitions réduit de 25 %. Allure maintenue.');
    reasons.push('Fatigue modérée — reps réduites de 25 %');
    adapted = true;
  }

  // Cycle: trigger ONLY if the runner hasn't opted out AND fatigue confirms
  // a tough day. The literature (McNulty 2020 meta on 78 studies, Elliott-Sale
  // 2021 BJSM) reports inter-individual variation > systematic phase effect,
  // so we use the phase as a context for an *already-fatigued* day, not as a
  // unilateral reason to back off. A user who feels great in late luteal
  // still trains as planned.
  if (!input.ignoreCyclePhase && isHardSession(w) && input.fatigue >= 3) {
    if (input.cyclePhase === 'menstruation') {
      w = reduceIntensity(w, 'Phase menstruelle + fatigue ≥ 3 : intensité réduite de 20 %. Ajustez selon votre ressenti — chaque cycle est individuel.');
      reasons.push('Cycle pris en compte (menstruation)');
      adapted = true;
    } else if (input.cyclePhase === 'luteal_late') {
      w = reduceIntensity(w, 'Phase lutéale tardive + fatigue ≥ 3 : intensité réduite de 20 %. Ajustez selon votre ressenti — l\'effet du cycle est très individuel.');
      reasons.push('Cycle pris en compte (lutéale tardive)');
      adapted = true;
    }
  }

  if (input.availableMinutes && w.totalDurationSeconds > input.availableMinutes * 60) {
    const factor = (input.availableMinutes * 60) / w.totalDurationSeconds;
    w = scaleDown(w, factor);
    reasons.push(`Contrainte de temps : séance réduite à ${input.availableMinutes} min.`);
    adapted = true;
  }

  return { workout: w, adapted, reason: reasons };
}

function isHardSession(w: Workout): boolean {
  return ['lt1_threshold', 'lt2_threshold', 'vo2max', 'hills', 'race_pace'].includes(w.type);
}

/** Reduce only the rep count (factor 0.5-0.9), keep pace and recovery. */
function reduceReps(w: Workout, factor: number, note: string): Workout {
  return {
    ...w,
    totalDistanceMeters: Math.round(w.totalDistanceMeters * (0.5 + factor * 0.5)),
    totalDurationSeconds: Math.round(w.totalDurationSeconds * (0.6 + factor * 0.4)),
    steps: w.steps.map((s) => ({
      ...s,
      reps: s.reps ? Math.max(1, Math.round(s.reps * factor)) : s.reps,
    })),
    guidance: [note, ...w.guidance],
  };
}

/** Reduce reps AND drop the work zone (LT2→LT1, interval→lt2, etc.). */
function reduceRepsAndDropZone(w: Workout, factor: number, note: string): Workout {
  const dropMap: Record<string, string> = {
    interval: 'lt2',
    lt2: 'lt1',
    repetition: 'lt2',
  };
  return {
    ...w,
    totalDistanceMeters: Math.round(w.totalDistanceMeters * (0.5 + factor * 0.5)),
    totalDurationSeconds: Math.round(w.totalDurationSeconds * (0.6 + factor * 0.4)),
    rpe: Math.max(3, w.rpe - 2),
    steps: w.steps.map((s) => ({
      ...s,
      reps: s.reps ? Math.max(1, Math.round(s.reps * factor)) : s.reps,
      pace: (s.pace && dropMap[s.pace] ? dropMap[s.pace] : s.pace) as any,
    })),
    guidance: [note, ...w.guidance],
  };
}

function downgradeToEasy(w: Workout, note: string): Workout {
  const km = Math.max(6, Math.round(w.totalDistanceMeters / 1000 * 0.7));
  return {
    ...w, type: 'easy', title: 'Footing facile (adapté)',
    totalDistanceMeters: km * 1000, totalDurationSeconds: km * 360, rpe: 3,
    steps: [{ distanceMeters: km * 1000, pace: 'easy' }],
    guidance: [note, ...w.guidance],
  };
}

function reduceIntensity(w: Workout, note: string): Workout {
  return {
    ...w,
    totalDistanceMeters: Math.round(w.totalDistanceMeters * 0.8),
    totalDurationSeconds: Math.round(w.totalDurationSeconds * 0.8),
    rpe: Math.max(3, w.rpe - 1),
    steps: w.steps.map((s) => ({
      ...s,
      reps: s.reps ? Math.max(1, Math.round(s.reps * 0.8)) : s.reps,
    })),
    guidance: [note, ...w.guidance],
  };
}

function scaleDown(w: Workout, factor: number): Workout {
  return {
    ...w,
    totalDistanceMeters: Math.round(w.totalDistanceMeters * factor),
    totalDurationSeconds: Math.round(w.totalDurationSeconds * factor),
    steps: w.steps.map((s) => ({
      ...s,
      reps: s.reps ? Math.max(1, Math.round(s.reps * factor)) : s.reps,
      distanceMeters: s.distanceMeters ? Math.round(s.distanceMeters * factor) : s.distanceMeters,
    })),
  };
}

export function applyBlockAdaptation(block: TrainingBlock, recentFatigue: FatigueLevel[]): TrainingBlock {
  const highFatigueDays = recentFatigue.filter((f) => f >= 4).length;
  if (highFatigueDays < 3) return block;
  const adjusted: TrainingBlock = structuredClone(block);
  adjusted.weeks = adjusted.weeks.map((week, i) => {
    if (i === 0) return week;
    return {
      ...week,
      totalKm: Math.round(week.totalKm * 0.85),
      notes: 'Volume réduit de 15% suite à fatigue cumulée signalée.',
      workouts: week.workouts.map((w) => ({
        ...w,
        totalDistanceMeters: Math.round(w.totalDistanceMeters * 0.85),
      })),
    };
  });
  return adjusted;
}

/**
 * Map a date to the canonical 5-phase model for a cycle starting on
 * `lastPeriodStart`. The modulo handles repeated cycles when no fresh log
 * has been entered, but past `cycleLength + GRACE_DAYS` we return 'unknown'
 * to surface a possible RED-S / amenorrhea signal to the UI rather than
 * silently extrapolating a phase that may not exist.
 *
 * Phase boundaries (for a 28-day cycle, scaled proportionally for other
 * lengths via the late-luteal window):
 *   - menstruation : days 0-4
 *   - follicular   : days 5-12
 *   - ovulation    : days 13-15
 *   - luteal_early : days 16 → (cycleLength - 6)
 *   - luteal_late  : last 5 days before the next expected period
 */
export const CYCLE_GRACE_DAYS = 10;

export function inferCyclePhase(lastPeriodStart: Date, today: Date, cycleLength = 28): CyclePhase {
  const elapsed = Math.floor((today.getTime() - lastPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
  if (elapsed < 0) return 'unknown';
  // If the latest declared cycle is well past its expected length, surface
  // 'unknown' so the dashboard can prompt for a fresh entry or flag RED-S.
  if (elapsed >= cycleLength + CYCLE_GRACE_DAYS) return 'unknown';

  const days = elapsed % cycleLength;
  if (days < 5) return 'menstruation';
  if (days < 13) return 'follicular';
  if (days < 16) return 'ovulation';
  if (days < cycleLength - 5) return 'luteal_early';
  return 'luteal_late';
}

/**
 * RED-S / amenorrhea warning signal. Returns a reason string when the
 * runner's declared cycle pattern is consistent with low energy availability
 * red flags, otherwise null. Not a diagnosis — a prompt to consult a sports
 * medicine doctor. References: Mountjoy et al. 2018 (IOC consensus), Areta
 * 2021 ("The female athlete: training considerations and ...").
 */
export interface CycleLogRecord {
  period_start: string;
  cycle_length_days: number | null;
}
export function detectCycleAnomaly(
  logs: CycleLogRecord[],
  today: Date = new Date(),
): { kind: 'no_recent_log' | 'long_cycle' | 'short_cycle'; days: number } | null {
  if (logs.length === 0) return null;
  // Sort defensively in case the caller did not.
  const sorted = [...logs].sort((a, b) => b.period_start.localeCompare(a.period_start));
  const latest = sorted[0];
  const daysSinceLatest = Math.floor(
    (today.getTime() - new Date(latest.period_start).getTime()) / 86400000,
  );

  // No declared period in > 90 days = aménorrhée secondaire candidate.
  if (daysSinceLatest > 90) return { kind: 'no_recent_log', days: daysSinceLatest };

  // Recurring long cycles (> 45 d) = oligomenorrhea signal.
  if (sorted.length >= 2) {
    const gaps = sorted.slice(0, 3).map((l, i, arr) => {
      if (i === arr.length - 1) return null;
      return Math.floor(
        (new Date(l.period_start).getTime() - new Date(arr[i + 1].period_start).getTime()) / 86400000,
      );
    }).filter((g): g is number => g !== null);
    const avg = gaps.reduce((s, g) => s + g, 0) / Math.max(1, gaps.length);
    if (avg > 45) return { kind: 'long_cycle', days: Math.round(avg) };
    if (avg < 21) return { kind: 'short_cycle', days: Math.round(avg) };
  }

  return null;
}
