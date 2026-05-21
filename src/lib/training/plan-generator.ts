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
  buildProgressionLong,
  buildRacePace,
  buildRest,
  buildSingleThreshold,
  buildStrides,
  buildVo2Max,
} from './workouts';

export interface GeneratePlanArgs {
  profile: RunnerProfile;
  startDate: Date;
  weeks?: number;
  raceDate?: Date;
  raceDistanceMeters?: number;
  locale?: Locale;
}

/**
 * Generate a Norwegian-style training block (3-4 weeks).
 *
 * Weekly architecture (adaptive):
 *   - Mon : rest (or easy for 6-7 day runners)
 *   - Tue : threshold session (double for advanced/elite)
 *   - Wed : easy + strides (technique, neuromuscular)
 *   - Thu : threshold OR VO2max OR hills, depending on phase + level
 *   - Fri : rest (or easy for 7-day runners)
 *   - Sat : long run (with race-pace finish in marathon specific phase)
 *   - Sun : easy
 *
 * Phase logic (when a race date is set):
 *   - Base    (race > 8w) : aerobic + sub-threshold introduction
 *   - Build   (race 4-8w) : full threshold work + hills/VO2max
 *   - Specific (race 1-4w): race-pace inserts, less hills
 *   - Taper   (race < 10d): volume down 30-50%, intensity preserved
 */
export function generatePlan(args: GeneratePlanArgs): TrainingBlock {
  const { profile, startDate, locale, raceDistanceMeters } = args;
  const weeksCount = args.weeks ?? 4;
  const level = inferExperience(profile);
  const target = targetWeeklyKmForLevel(level);
  const start = startOfWeek(startDate, { weekStartsOn: 1 });
  const isMarathon = raceDistanceMeters !== undefined && raceDistanceMeters >= 30000;

  const weeks: TrainingWeek[] = [];
  let currentKm = profile.currentWeeklyKm;

  for (let w = 0; w < weeksCount; w++) {
    const weekStart = addDays(start, w * 7);
    const phase: TrainingPhase = computePhase(w, weeksCount, args.raceDate, weekStart);
    currentKm = suggestNextWeeklyKm(currentKm, target, w);
    const tSessions = thresholdSessionsPerWeek(level, phase);
    const doubles = shouldDoubleThreshold(level) && phase !== 'taper' && phase !== 'recovery';

    // Taper: scale down volume by 35%, keep intensity.
    const phaseKm = phase === 'taper' ? Math.round(currentKm * 0.65) : currentKm;

    const workouts: Workout[] = [];
    for (let d = 0; d < 7; d++) {
      const date = format(addDays(weekStart, d), 'yyyy-MM-dd');
      const base = {
        date,
        weeklyKm: phaseKm,
        daysPerWeek: profile.daysPerWeek,
        index: d,
        locale,
      } as const;

      switch (d) {
        case 0:
          workouts.push(profile.daysPerWeek >= 6 ? buildEasy(base) : buildRest(base));
          break;

        case 1:
          if (phase === 'specific' && raceDistanceMeters) {
            workouts.push(buildRacePace(base, raceDistanceMeters));
          } else if (doubles && tSessions >= 3) {
            workouts.push(buildLt1AM(base));
            workouts.push(buildLt1PM(base));
          } else if (tSessions >= 1) {
            workouts.push(buildSingleThreshold(base));
          } else {
            workouts.push(buildEasy(base));
          }
          break;

        case 2:
          workouts.push(buildStrides(base));
          break;

        case 3:
          if (phase === 'taper') {
            if (raceDistanceMeters) workouts.push(buildRacePace(base, raceDistanceMeters));
            else workouts.push(buildSingleThreshold(base));
          } else if (doubles && tSessions >= 4) {
            workouts.push(buildLt1AM(base));
            workouts.push(buildLt1PM(base));
          } else if (tSessions >= 2) {
            workouts.push(phase === 'build' ? buildVo2Max(base) : buildSingleThreshold(base));
          } else {
            workouts.push(buildHills(base));
          }
          break;

        case 4:
          workouts.push(profile.daysPerWeek >= 7 ? buildEasy(base) : buildRest(base));
          break;

        case 5:
          if (isMarathon && (phase === 'specific' || phase === 'build')) {
            workouts.push(buildProgressionLong(base));
          } else if (phase === 'taper') {
            workouts.push(buildEasy({ ...base, weeklyKm: Math.round(phaseKm * 0.5) }));
          } else {
            workouts.push(buildLong(base));
          }
          break;

        case 6:
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
    targetRaceId: undefined,
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
