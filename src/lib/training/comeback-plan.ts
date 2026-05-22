// Comeback plan generator — return-to-run protocol.
//
// When a runner declares "I'm back from injury", we generate a comeback block
// instead of the normal Norwegian block. Length scales with how long the
// injury lasted (7/14/21/28 days). Protocol shape: see
// `norwegian.ts:comebackPhase`.

import { addDays, format } from 'date-fns';
import type { Locale } from '@/i18n/config';
import {
  comebackPhase,
  comebackSchedule,
  type ComebackContext,
  type ComebackSchedule,
} from './norwegian';
import type { TrainingBlock, TrainingWeek, Workout } from './types';

export interface ComebackPlanArgs {
  comebackStartDate: Date;
  today: Date;
  /** Total protocol length in days (7, 14, 21, or 28). Defaults to 14. */
  totalDays?: number;
  locale?: Locale;
}

/**
 * Generate a comeback block of the requested length (default 14 days).
 * Each day gets one prescribed session: rest, walk/run, easy, easy+strides,
 * or easy+light sub-threshold.
 */
export function generateComebackPlan(args: ComebackPlanArgs): TrainingBlock {
  const { comebackStartDate } = args;
  const totalDays = args.totalDays ?? 14;
  const schedule = comebackSchedule(totalDays);
  const workouts: Workout[] = [];

  for (let day = 0; day < schedule.totalDays; day++) {
    const date = format(addDays(comebackStartDate, day), 'yyyy-MM-dd');
    const ctx: ComebackContext = { startDate: comebackStartDate, today: addDays(comebackStartDate, day) };
    const phase = comebackPhase(ctx, schedule.totalDays);
    if (!phase) continue;
    workouts.push(buildComebackDay(date, day, phase, schedule));
  }

  const startStr = format(comebackStartDate, 'yyyy-MM-dd');
  const endStr = format(addDays(comebackStartDate, schedule.totalDays - 1), 'yyyy-MM-dd');

  const weeks: TrainingWeek[] = [];
  const weekCount = Math.ceil(schedule.totalDays / 7);
  for (let w = 0; w < weekCount; w++) {
    const slice = workouts.slice(w * 7, (w + 1) * 7);
    weeks.push({
      weekNumber: w + 1,
      startDate: format(addDays(comebackStartDate, w * 7), 'yyyy-MM-dd'),
      totalKm: slice.reduce((s, x) => s + x.totalDistanceMeters / 1000, 0),
      phase: 'recovery',
      workouts: slice,
      notes: comebackWeekNotes(w, weekCount),
    });
  }

  return {
    id: `comeback-${startStr}`,
    startDate: startStr,
    endDate: endStr,
    weeks,
    vdotAtStart: 0,
  };
}

function comebackWeekNotes(weekIndex: number, total: number): string {
  if (weekIndex === 0) return 'Semaine 1 — patience maximale. Aucune intensité.';
  if (weekIndex === total - 1) return 'Dernière semaine — strides puis première séance légère au sous-seuil.';
  return `Semaine ${weekIndex + 1} — progression imperceptible du volume, toujours sans qualité.`;
}

function buildComebackDay(
  date: string,
  dayIndex: number,
  phase: NonNullable<ReturnType<typeof comebackPhase>>,
  schedule: ComebackSchedule,
): Workout {
  if (schedule.restDays.includes(dayIndex)) {
    return {
      id: `comeback-${date}-rest`,
      date,
      type: 'rest',
      title: 'Repos',
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      rpe: 0,
      purpose: "Repos obligatoire pendant la reprise. C'est ici que vos tissus reconstruisent.",
      feel: "Reposé. Aucun effort.",
      guidance: ['Sommeil prioritaire', 'Mobilité douce facultative', "Ne sous-estimez pas l'importance du repos pendant une reprise"],
      steps: [],
    };
  }

  const dayLabel = `J${dayIndex + 1}/${schedule.totalDays}`;
  const remainingLine = `${phase.daysRemaining} jours avant retour au plan normal`;

  switch (phase.index) {
    case 1:
      return {
        id: `comeback-${date}-walkrun`, date, type: 'easy',
        title: `Reprise ${dayLabel} — marche/course`,
        totalDistanceMeters: 4000, totalDurationSeconds: 25 * 60, rpe: 2,
        purpose: phase.description,
        feel: 'Très facile. Aucune sensation d\'effort. Si vous transpirez beaucoup, vous allez trop vite.',
        guidance: ['Alternance : 2 min course / 1 min marche × 8 cycles', 'Allure très facile pendant les phases de course', 'Pas plus de 25-30 min total', remainingLine],
        steps: [
          { distanceMeters: 0, durationSeconds: 5 * 60, pace: 'easy', note: 'Marche d\'échauffement' },
          { reps: 8, durationSeconds: 120, pace: 'easy', recoverySeconds: 60, note: 'Alterner course (2 min) / marche (1 min)' },
          { distanceMeters: 0, durationSeconds: 4 * 60, pace: 'easy', note: 'Marche de récupération' },
        ],
      };

    case 2:
      return {
        id: `comeback-${date}-easy`, date, type: 'easy',
        title: `Reprise ${dayLabel} — footing facile`,
        totalDistanceMeters: 6000, totalDurationSeconds: 35 * 60, rpe: 3,
        purpose: phase.description,
        feel: 'Facile. Vous pouvez tenir une conversation complète.',
        guidance: ['30 à 40 min en footing facile, sans aucune accélération', 'Privilégier terrain plat et souple (sentier, piste)', 'Aucune séance de qualité cette semaine', remainingLine],
        steps: [{ distanceMeters: 6000, pace: 'easy', durationSeconds: 35 * 60 }],
      };

    case 3:
      return {
        id: `comeback-${date}-strides`, date, type: 'strides',
        title: `Reprise ${dayLabel} — footing + 4 strides`,
        totalDistanceMeters: 7000, totalDurationSeconds: 42 * 60, rpe: 4,
        purpose: phase.description,
        feel: 'Facile sur le footing, vif et contrôlé sur les strides. Pas de douleur.',
        guidance: ['40 min de footing facile', 'Puis 4 strides de 100 m à allure rapide mais contrôlée', 'Récupération marche entre chaque stride', remainingLine],
        steps: [
          { distanceMeters: 6500, pace: 'easy', note: 'Footing facile' },
          { reps: 4, distanceMeters: 100, pace: 'repetition', recoverySeconds: 60, note: 'Strides contrôlées' },
        ],
      };

    case 4: {
      if (dayIndex === schedule.lt1DayIndex) {
        return {
          id: `comeback-${date}-lt1`, date, type: 'lt1_threshold',
          title: `Reprise ${dayLabel} — première séance LT1 (5×600 m)`,
          totalDistanceMeters: 7000, totalDurationSeconds: 50 * 60, rpe: 6,
          purpose: phase.description,
          feel: 'Effort contrôlé sur les 600 m, vous pouvez parler par phrases courtes. Rester en sous-seuil bas.',
          guidance: ["Échauffement 15 min easy + 4 strides", "5×600 m à allure sous-seuil BAS, récupération 90 s en trot", "Si la moindre douleur apparaît, arrêter et marcher", "Retour au calme 10 min easy", remainingLine],
          steps: [
            { distanceMeters: 2000, pace: 'easy', note: 'WU' },
            { reps: 5, distanceMeters: 600, pace: 'lt1', recoverySeconds: 90, note: 'Sous-seuil bas' },
            { distanceMeters: 2000, pace: 'easy', note: 'CD' },
          ],
        };
      }
      return {
        id: `comeback-${date}-easystrides`, date, type: 'easy',
        title: `Reprise ${dayLabel} — footing + strides`,
        totalDistanceMeters: 8000, totalDurationSeconds: 48 * 60, rpe: 4,
        purpose: phase.description,
        feel: 'Facile mais on commence à se sentir bien. Pas de précipitation.',
        guidance: ['45-50 min de footing facile', '4 à 6 strides à la fin', "Dernière phase avant retour au plan normal — restez patient", remainingLine],
        steps: [
          { distanceMeters: 7000, pace: 'easy' },
          { reps: 4, distanceMeters: 100, pace: 'repetition', recoverySeconds: 60 },
        ],
      };
    }
  }

  // Unreachable: phase.index covers 1..4 exhaustively above.
  throw new Error(`Unhandled comeback phase index: ${(phase as { index: number }).index}`);
}
