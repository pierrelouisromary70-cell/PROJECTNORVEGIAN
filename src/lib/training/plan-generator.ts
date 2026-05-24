import { addDays, format, startOfWeek } from 'date-fns';
import type { Locale } from '@/i18n/config';
import {
  inferExperience,
  marathonLongRunKm,
  midLongRunKm,
  raceFamily,
  shouldDoubleThreshold,
  speedSessionsPerWeek,
  suggestNextWeeklyKm,
  targetWeeklyKmForRace,
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
  buildProgressive,
  buildRacePace,
  buildRest,
  buildShortReps,
  buildSingleThreshold,
  buildSubThreshold,
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
  const target = targetWeeklyKmForRace(level, raceDistanceMeters);
  const start = startOfWeek(startDate, { weekStartsOn: 1 });

  const weeks: TrainingWeek[] = [];
  let currentKm = profile.currentWeeklyKm;

  // Absolute week number since epoch — used to seed variant rotation so that
  // sessions keep advancing through the WHOLE variant pool across consecutive
  // 4-week blocks. Using the in-block index (0-3) made week 0 always pick
  // variant[0] and never reach variants beyond the 4th — the root cause of
  // the "same sessions every block" repetitiveness.
  const rotationSeed = Math.floor(start.getTime() / (7 * 86400000));

  for (let w = 0; w < weeksCount; w++) {
    const weekStart = addDays(start, w * 7);
    const phase: TrainingPhase = computePhase(w, weeksCount, args.raceDate, weekStart, racePriority);
    currentKm = suggestNextWeeklyKm(currentKm, target, w);
    const tSessions = thresholdSessionsPerWeek(level, phase, family);
    const sSessions = family ? speedSessionsPerWeek(family, phase) : (phase === 'build' ? 1 : 0);
    const doubles = shouldDoubleThreshold(level) && phase !== 'taper' && phase !== 'recovery' && family !== 'middle';

    let weekScale = 1.0;
    if (phase === 'taper') weekScale = taperFactor(racePriority);
    const phaseKm = Math.round(currentKm * weekScale);

    const daysToRace = args.raceDate ? Math.max(0, (args.raceDate.getTime() - weekStart.getTime()) / 86400000) : 999;
    const weeksToRace = Math.ceil(daysToRace / 7);

    const workouts: Workout[] = [];
    for (let d = 0; d < 7; d++) {
      const date = format(addDays(weekStart, d), 'yyyy-MM-dd');
      // weekIndex drives variant rotation in the workout builders — feed it
      // the absolute week so the pool keeps cycling across blocks. Local-week
      // logic (deload, mixed week, phase) uses the loop variable `w` directly.
      const base = { date, weeklyKm: phaseKm, daysPerWeek: profile.daysPerWeek, index: d, weekIndex: rotationSeed + w, locale, level } as const;
      const mixedWeek = w > 0 && w % 5 === 4 && phase === 'build';

      switch (d) {
        case 0:
          workouts.push(profile.daysPerWeek >= 6 ? buildEasy(base) : buildRest(base));
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
            // Primary quality day for beginner/intermediate. The Norwegian
            // signature is sub-threshold (LT1), NOT classical LT2 — so the
            // main weekly threshold session is LT1. The harder LT2/VO2 work
            // (intermediate only) lands on day 3.
            workouts.push(buildSubThreshold(base));
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
            // Beginner second session: mostly easy aerobic volume (what a
            // beginner needs most), with hills every 3rd week for strength
            // and economy. Previously this fell to hills EVERY week, which
            // was monotonous and crowded out aerobic base-building.
            workouts.push(w % 3 === 2 ? buildHills(base) : buildEasy(base));
          }
          break;

        case 4:
          workouts.push(profile.daysPerWeek >= 7 ? buildEasy(base) : buildRest(base));
          break;

        case 5:
          workouts.push(buildSaturdayLongRun({ base, family, phase, phaseKm, weeksToRace }));
          break;

        case 6:
          workouts.push(buildEasy(base));
          break;
      }
    }

    // Make easy runs the volume buffer: scale them so the week sums to the
    // target phaseKm regardless of which quality variant was drawn. Without
    // this, picking a high-volume threshold variant (e.g. 12×1000) vs a short
    // one (tempo 20 min) made the weekly total swing wildly and drift off the
    // progressive target — the root of the "volume feels low / inconsistent"
    // complaint.
    const easyRuns = workouts.filter((wk) => wk.type === 'easy');
    const nonEasyKm = workouts
      .filter((wk) => wk.type !== 'easy')
      .reduce((sum, wk) => sum + wk.totalDistanceMeters / 1000, 0);
    const currentEasyKm = easyRuns.reduce((sum, wk) => sum + wk.totalDistanceMeters / 1000, 0);
    const targetEasyKm = phaseKm - nonEasyKm;
    if (easyRuns.length > 0 && currentEasyKm > 0 && targetEasyKm > 0) {
      const scale = targetEasyKm / currentEasyKm;
      for (const wk of easyRuns) {
        const km = Math.max(4, Math.round((wk.totalDistanceMeters / 1000) * scale));
        wk.totalDistanceMeters = km * 1000;
        wk.totalDurationSeconds = km * 330;
        wk.steps = [{ distanceMeters: km * 1000, pace: 'easy' }];
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
