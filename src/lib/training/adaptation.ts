import type { TrainingBlock, Workout } from './types';

export type FatigueLevel = 1 | 2 | 3 | 4 | 5; // 1=fresh, 5=exhausted
export type PainLevel = 0 | 1 | 2 | 3; // 0=none, 1=niggle, 2=moderate, 3=stop
export type CyclePhase = 'menstruation' | 'follicular' | 'ovulation' | 'luteal_late' | 'unknown';

export interface AdaptationInput {
  fatigue: FatigueLevel;
  pain: PainLevel;
  cyclePhase?: CyclePhase;
  availableMinutes?: number; // user said they only have N min today
}

export interface AdaptationResult {
  workout: Workout;
  adapted: boolean;
  reason: string[];
}

/**
 * Adapt a single workout based on how the runner feels today.
 * Rules are intentionally conservative — better one easy day than an injury.
 */
export function adaptWorkout(original: Workout, input: AdaptationInput): AdaptationResult {
  const reasons: string[] = [];
  let w: Workout = structuredClone(original);
  let adapted = false;

  // Hard stop on serious pain
  if (input.pain >= 3) {
    return {
      adapted: true,
      reason: ['Douleur signalée: repos forcé. Consultez un kiné si la douleur persiste 48h.'],
      workout: {
        ...w,
        type: 'rest',
        title: 'Repos forcé',
        totalDistanceMeters: 0,
        totalDurationSeconds: 0,
        rpe: 0,
        steps: [],
        guidance: ['Glace si inflammation', 'Pas de course aujourd\'hui'],
      },
    };
  }

  if (input.pain === 2 && isHardSession(w)) {
    w = downgradeToEasy(w, 'Douleur modérée: séance de qualité transformée en footing facile.');
    reasons.push('Douleur légère prise en compte');
    adapted = true;
  }

  // Severe fatigue
  if (input.fatigue >= 5) {
    return {
      adapted: true,
      reason: ['Fatigue extrême signalée: repos. Le surentraînement coûte plus cher que 24h off.'],
      workout: { ...w, type: 'rest', title: 'Repos (fatigue)', totalDistanceMeters: 0, totalDurationSeconds: 0, rpe: 0, steps: [], guidance: ['Sommeil', 'Hydratation', 'Nutrition'] },
    };
  }
  if (input.fatigue === 4 && isHardSession(w)) {
    w = downgradeToEasy(w, 'Fatigue élevée: séance de qualité reportée, footing facile aujourd\'hui.');
    reasons.push('Fatigue élevée prise en compte');
    adapted = true;
  }

  // Menstrual cycle: late luteal + menstruation phases — reduce intensity, keep volume optional.
  if (input.cyclePhase === 'menstruation' || input.cyclePhase === 'luteal_late') {
    if (isHardSession(w) && input.fatigue >= 3) {
      w = reduceIntensity(w, 'Phase ' + (input.cyclePhase === 'menstruation' ? 'menstruelle' : 'lutéale tardive') + ': intensité réduite (qualité conservée mais volume à -20%).');
      reasons.push('Cycle pris en compte');
      adapted = true;
    }
  }

  // Time constraint
  if (input.availableMinutes && w.totalDurationSeconds > input.availableMinutes * 60) {
    const factor = (input.availableMinutes * 60) / w.totalDurationSeconds;
    w = scaleDown(w, factor);
    reasons.push(`Contrainte de temps: séance réduite à ${input.availableMinutes} min.`);
    adapted = true;
  }

  return { workout: w, adapted, reason: reasons };
}

function isHardSession(w: Workout): boolean {
  return ['lt1_threshold', 'lt2_threshold', 'vo2max', 'hills', 'race_pace'].includes(w.type);
}

function downgradeToEasy(w: Workout, note: string): Workout {
  const km = Math.max(6, Math.round(w.totalDistanceMeters / 1000 * 0.7));
  return {
    ...w,
    type: 'easy',
    title: 'Footing facile (adapté)',
    totalDistanceMeters: km * 1000,
    totalDurationSeconds: km * 360,
    rpe: 3,
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

/**
 * Apply a 7-day rolling adaptation to an entire block based on completed sessions and feedback.
 * If the runner reports high fatigue 3+ days in a row, drop next week's volume by 15%.
 */
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

export function inferCyclePhase(lastPeriodStart: Date, today: Date, cycleLength = 28): CyclePhase {
  const days = Math.floor((today.getTime() - lastPeriodStart.getTime()) / (1000 * 60 * 60 * 24)) % cycleLength;
  if (days < 5) return 'menstruation';
  if (days < 12) return 'follicular';
  if (days < 16) return 'ovulation';
  if (days < cycleLength - 3) return 'luteal_late';
  return 'luteal_late';
}
