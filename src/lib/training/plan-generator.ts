import { addDays, format, startOfWeek } from 'date-fns';
import type { Locale } from '@/i18n/config';
import {
  inferExperience,
  shouldDoubleThreshold,
  suggestNextWeeklyKm,
  targetWeeklyKmForLevel,
  thresholdSessionsPerWeek,
} from './norwegian';
import type { RunnerProfile, TrainingBlock, TrainingPhase, TrainingWeek, Workout } from './types';
import {
  buildEasy,
  buildHills,
  buildLong,
  buildLt1AM,
  buildLt1PM,
  buildRest,
  buildSingleThreshold,
  buildStrides,
  buildVo2Max,
} from './workouts';

export interface GeneratePlanArgs {
  profile: RunnerProfile;
  startDate: Date;
  weeks?: number; // default 4
  raceDate?: Date;
  raceDistanceMeters?: number;
  locale?: Locale;
}

/**
 * Generate a 3-4 week Norwegian-style training block.
 * Architecture:
 *   - Mon: rest or easy
 *   - Tue: threshold (double for advanced/elite)
 *   - Wed: easy + strides
 *   - Thu: threshold (double for elite, single for advanced)
 *   - Fri: easy or rest
 *   - Sat: long run (or hills/race-pace as race approaches)
 *   - Sun: easy
 */
export function generatePlan(args: GeneratePlanArgs): TrainingBlock {
  const { profile, startDate, locale } = args;
  const weeksCount = args.weeks ?? 4;
  const level = inferExperience(profile);
  const target = targetWeeklyKmForLevel(level);
  const start = startOfWeek(startDate, { weekStartsOn: 1 });

  const weeks: TrainingWeek[] = [];
  let currentKm = profile.currentWeeklyKm;

  for (let w = 0; w < weeksCount; w++) {
    const weekStart = addDays(start, w * 7);
    const phase: TrainingPhase = computePhase(w, weeksCount, args.raceDate, weekStart);
    currentKm = suggestNextWeeklyKm(currentKm, target, w);
    const tSessions = thresholdSessionsPerWeek(level, phase);
    const doubles = shouldDoubleThreshold(level) && phase !== 'taper' && phase !== 'recovery';

    const workouts: Workout[] = [];
    for (let d = 0; d < 7; d++) {
      const date = format(addDays(weekStart, d), 'yyyy-MM-dd');
      const base = {
        date,
        weeklyKm: currentKm,
        daysPerWeek: profile.daysPerWeek,
        index: d,
        locale,
      } as const;

      switch (d) {
        case 0: // Mon
          workouts.push(profile.daysPerWeek >= 6 ? buildEasy(base) : buildRest(base));
          break;
        case 1: // Tue threshold
          if (doubles && tSessions >= 3) {
            workouts.push(buildLt1AM(base));
            workouts.push(buildLt1PM(base));
          } else if (tSessions >= 1) {
            workouts.push(buildSingleThreshold(base));
          } else {
            workouts.push(buildEasy(base));
          }
          break;
        case 2: // Wed strides
          workouts.push(buildStrides(base));
          break;
        case 3: // Thu threshold or hills
          if (doubles && tSessions >= 4) {
            workouts.push(buildLt1AM(base));
            workouts.push(buildLt1PM(base));
          } else if (tSessions >= 2) {
            workouts.push(phase === 'specific' ? buildVo2Max(base) : buildSingleThreshold(base));
          } else {
            workouts.push(buildHills(base));
          }
          break;
        case 4: // Fri
          workouts.push(profile.daysPerWeek >= 7 ? buildEasy(base) : buildRest(base));
          break;
        case 5: // Sat long
          workouts.push(buildLong(base));
          break;
        case 6: // Sun easy
          workouts.push(buildEasy(base));
          break;
      }
    }

    const totalKm = workouts.reduce((sum, w) => sum + w.totalDistanceMeters / 1000, 0);
    weeks.push({
      weekNumber: w + 1,
      startDate: format(weekStart, 'yyyy-MM-dd'),
      totalKm: Math.round(totalKm),
      phase,
      workouts,
    });
  }

  return {
    id: `block-${format(start, 'yyyy-MM-dd')}`,
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(addDays(start, weeksCount * 7 - 1), 'yyyy-MM-dd'),
    weeks,
    vdotAtStart: profile.vdot,
  };
}

function computePhase(weekIndex: number, total: number, raceDate?: Date, weekStart?: Date): TrainingPhase {
  if (raceDate && weekStart) {
    const daysToRace = (raceDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24);
    if (daysToRace <= 10) return 'taper';
    if (daysToRace <= 28) return 'specific';
    if (daysToRace <= 56) return 'build';
    return 'base';
  }
  if (weekIndex === total - 1) return 'recovery';
  return weekIndex < 2 ? 'base' : 'build';
}
