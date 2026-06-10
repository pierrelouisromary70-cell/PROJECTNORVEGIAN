import type { TrainingBlock, Workout } from './types';

export type FatigueLevel = 1 | 2 | 3 | 4 | 5;
export type PainLevel = 0 | 1 | 2 | 3;
export type CyclePhase = 'menstruation' | 'follicular' | 'ovulation' | 'luteal' | 'luteal_late' | 'unknown';

export interface AdaptationInput {
  fatigue: FatigueLevel;
  pain: PainLevel;
  cyclePhase?: CyclePhase;
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

  if (input.cyclePhase === 'menstruation' || input.cyclePhase === 'luteal_late') {
    if (isHardSession(w) && input.fatigue >= 3) {
      w = reduceIntensity(w, 'Phase ' + (input.cyclePhase === 'menstruation' ? 'menstruelle' : 'lutéale tardive') + ' : intensité réduite (-20 %).');
      reasons.push('Cycle pris en compte');
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

export function inferCyclePhase(lastPeriodStart: Date, today: Date, cycleLength = 28): CyclePhase {
  const days = Math.floor((today.getTime() - lastPeriodStart.getTime()) / (1000 * 60 * 60 * 24)) % cycleLength;
  if (days < 5) return 'menstruation';
  if (days < 12) return 'follicular';
  if (days < 16) return 'ovulation';
  // Mid-luteal is a normal training window — only the last ~5 days
  // (premenstrual) warrant easing intensity when fatigue is reported.
  if (days < cycleLength - 5) return 'luteal';
  return 'luteal_late';
}
