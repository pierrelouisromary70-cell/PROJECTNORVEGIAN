import { addDays, format, startOfWeek } from 'date-fns';
import type { Locale } from '@/i18n/config';
import {
  inferExperience,
  isRecoveryWeekIndex,
  marathonLongRunKm,
  midLongRunKm,
  postRaceRecoveryFactor,
  raceFamily,
  safeTargetWeeklyKm,
  shouldDoubleThreshold,
  speedSessionsPerWeek,
  suggestNextWeeklyKm,
  taperFactor,
  thresholdSessionsPerWeek,
  type RaceFamily,
  type RacePriority,
} from './norwegian';
import type { RunnerProfile, TrainingBlock, TrainingPhase, TrainingWeek, Workout } from './types';
import {
  buildEasy,
  buildHills,
  buildLong,
  buildLt1AM,
  buildLt1PM,
  buildMarathonLongRun,
  buildMixed,
  buildPreRace,
  buildProgressive,
  buildRaceDay,
  buildRacePace,
  buildRest,
  buildShortReps,
  buildSingleThreshold,
  buildStrides,
  buildTrackSpecific,
  buildVo2Max,
  buildVolumeThreshold,
} from './workouts';

export interface GeneratePlanArgs {
  profile: RunnerProfile;
  startDate: Date;
  weeks?: number;
  raceDate?: Date;
  raceDistanceMeters?: number;
  racePriority?: RacePriority;
  locale?: Locale;
}

export function generatePlan(args: GeneratePlanArgs): TrainingBlock {
  const { profile, startDate, locale, raceDistanceMeters, racePriority = 'A' } = args;
  const weeksCount = args.weeks ?? 4;
  const level = inferExperience(profile);
  const family: RaceFamily | undefined = raceDistanceMeters !== undefined ? raceFamily(raceDistanceMeters) : undefined;
  const target = safeTargetWeeklyKm(level, profile.currentWeeklyKm, raceDistanceMeters);
  const start = startOfWeek(startDate, { weekStartsOn: 1 });
  const restDays = restDayIndicesFor(profile.daysPerWeek);

  const weeks: TrainingWeek[] = [];
  // Progression baseline: deload weeks lower the prescribed volume but must
  // NOT lower the baseline the next build week resumes from.
  let progressKm = profile.currentWeeklyKm;
  let currentKm = profile.currentWeeklyKm;

  for (let w = 0; w < weeksCount; w++) {
    const weekStart = addDays(start, w * 7);
    const phase: TrainingPhase = computePhase(w, weeksCount, args.raceDate, weekStart, racePriority);
    currentKm = suggestNextWeeklyKm(progressKm, target, w);
    if (!isRecoveryWeekIndex(w)) progressKm = currentKm;
    const tSessions = thresholdSessionsPerWeek(level, phase, family);
    const sSessions = family ? speedSessionsPerWeek(family, phase) : (phase === 'build' ? 1 : 0);
    const doubles = shouldDoubleThreshold(level) && phase !== 'taper' && phase !== 'recovery' && family !== 'middle';

    let weekScale = 1.0;
    if (phase === 'taper') weekScale = taperFactor(racePriority);
    if (args.raceDate) {
      const weeksSinceRace = Math.floor((weekStart.getTime() - args.raceDate.getTime()) / (7 * 86400000));
      if (weeksSinceRace >= 0) weekScale = postRaceRecoveryFactor(weeksSinceRace, racePriority);
    }
    const phaseKm = Math.round(currentKm * weekScale);

    const daysToRace = args.raceDate ? Math.max(0, (args.raceDate.getTime() - weekStart.getTime()) / 86400000) : 999;
    const weeksToRace = Math.ceil(daysToRace / 7);
    const raceDayStr = args.raceDate ? format(args.raceDate, 'yyyy-MM-dd') : undefined;
    const preRaceDayStr = args.raceDate ? format(addDays(args.raceDate, -1), 'yyyy-MM-dd') : undefined;

    const workouts: Workout[] = [];
    for (let d = 0; d < 7; d++) {
      const date = format(addDays(weekStart, d), 'yyyy-MM-dd');
      const base = { date, weeklyKm: phaseKm, daysPerWeek: profile.daysPerWeek, index: d, weekIndex: w, locale, level } as const;
      const mixedWeek = w > 0 && w % 5 === 4 && phase === 'build';

      // The goal race overrides everything on its actual date; the day
      // before becomes openers; every day after it (in this block) is
      // recovery — no quality session right after the goal race.
      if (raceDayStr && raceDistanceMeters && date === raceDayStr) {
        workouts.push(buildRaceDay(base, raceDistanceMeters));
        continue;
      }
      if (preRaceDayStr && date === preRaceDayStr && racePriority !== 'C' && !restDays.has(d)) {
        workouts.push(buildPreRace(base));
        continue;
      }
      if (raceDayStr && date > raceDayStr) {
        workouts.push(restDays.has(d) ? buildRest(base) : buildEasy({ ...base, weeklyKm: Math.round(phaseKm * 0.8) }));
        continue;
      }

      if (restDays.has(d)) {
        workouts.push(buildRest(base));
        continue;
      }

      switch (d) {
        case 0:
          workouts.push(buildEasy(base));
          break;

        case 1:
          if (phase === 'specific' && raceDistanceMeters) {
            workouts.push(buildRacePace(base, raceDistanceMeters));
          } else if (mixedWeek && tSessions >= 1 && level !== 'beginner') {
            workouts.push(buildMixed(base));
          } else if (family === 'middle' && phase === 'build' && sSessions >= 1) {
            workouts.push(buildTrackSpecific(base));
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
            if (racePriority === 'A' && raceDistanceMeters) workouts.push(buildRacePace(base, raceDistanceMeters));
            else workouts.push(buildSingleThreshold(base));
          } else if (family === 'middle' && phase === 'specific') {
            workouts.push(buildShortReps(base));
          } else if (doubles && tSessions >= 4) {
            workouts.push(buildLt1AM(base));
            workouts.push(buildLt1PM(base));
          } else if (tSessions >= 2) {
            const wantVo2 = (phase === 'build') && (family !== 'marathon');
            workouts.push(wantVo2 ? buildVo2Max(base) : buildSingleThreshold(base));
          } else if (sSessions >= 1 && family === 'middle') {
            workouts.push(buildShortReps(base));
          } else {
            workouts.push(buildHills(base));
          }
          break;

        case 4:
          workouts.push(buildEasy(base));
          break;

        case 5:
          workouts.push(buildSaturdayLongRun({ base, family, phase, phaseKm, weeksToRace }));
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

/**
 * Which weekday indices (0 = Monday) are full rest, given how many days the
 * runner can train. Quality days (Tue d1, Thu d3) and the Saturday long run
 * (d5) are protected; easy days are dropped first.
 */
function restDayIndicesFor(daysPerWeek: number): Set<number> {
  const d = Math.max(3, Math.min(7, daysPerWeek));
  switch (d) {
    case 7: return new Set();
    case 6: return new Set([4]);
    case 5: return new Set([0, 4]);
    case 4: return new Set([0, 2, 4]);
    default: return new Set([0, 2, 4, 6]); // 3 days: Tue quality, Thu quality, Sat long
  }
}

interface LongRunArgs {
  base: { date: string; weeklyKm: number; daysPerWeek: number; index: number; weekIndex?: number; locale?: Locale };
  family?: RaceFamily;
  phase: TrainingPhase;
  phaseKm: number;
  weeksToRace: number;
}

function buildSaturdayLongRun({ base, family, phase, phaseKm, weeksToRace }: LongRunArgs): Workout {
  if (phase === 'taper') {
    return buildEasy({ ...base, weeklyKm: Math.round(phaseKm * 0.5) });
  }
  const wi = base.weekIndex;
  // Marathon prep: rotate between classical long, volume+threshold, and progressive.
  if (family === 'marathon' && phase !== 'recovery') {
    if (wi !== undefined && wi % 3 === 1) return buildVolumeThreshold(base);
    const km = marathonLongRunKm(weeksToRace, phaseKm);
    const includeRacePace = weeksToRace >= 4 && weeksToRace <= 10;
    return buildMarathonLongRun(base, km, includeRacePace);
  }
  if (family === 'middle' || family === 'short') {
    const km = midLongRunKm(family, phaseKm);
    return buildLong({ ...base, weeklyKm: km * (1 / 0.28) });
  }
  // Long-distance (semi) build: rotate progressive (every 3rd week) and volume+threshold (every 4th).
  if (family === 'long' && phase === 'build' && wi !== undefined) {
    if (wi % 4 === 3) return buildVolumeThreshold(base);
    if (wi % 3 === 2) return buildProgressive(base);
  }
  return buildLong(base);
}

function computePhase(weekIndex: number, total: number, raceDate?: Date, weekStart?: Date, priority: RacePriority = 'A'): TrainingPhase {
  if (raceDate && weekStart) {
    const daysToRace = (raceDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24);
    // The whole week is after the race → post-race recovery, not taper.
    if (daysToRace < 0) return 'recovery';
    if (priority === 'C') {
      if (daysToRace <= 28) return 'specific';
      if (daysToRace <= 56) return 'build';
      return 'base';
    }
    if (daysToRace <= 10 && priority === 'A') return 'taper';
    if (daysToRace <= 7 && priority === 'B') return 'taper';
    if (daysToRace <= 28) return 'specific';
    if (daysToRace <= 56) return 'build';
    return 'base';
  }
  if (weekIndex === total - 1) return 'recovery';
  return weekIndex < 2 ? 'base' : 'build';
}
