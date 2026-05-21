// Norwegian training model: high volume + lots of (sub)threshold work,
// double-threshold days for advanced runners, strict polarization
// of intensity at the top end. Easy stays truly easy.
//
// References:
// - Casado, A. et al. (2022) on lactate-guided threshold training
// - Haugen, T. (2022) on world-class endurance training characteristics

import type { ExperienceLevel, RunnerProfile, TrainingPhase } from './types';

export function inferExperience(p: Pick<RunnerProfile, 'experienceYears' | 'currentWeeklyKm' | 'hasDoneIntervals'>): ExperienceLevel {
  if (p.currentWeeklyKm >= 110 && p.experienceYears >= 5 && p.hasDoneIntervals) return 'elite';
  if (p.currentWeeklyKm >= 70 && p.experienceYears >= 3 && p.hasDoneIntervals) return 'advanced';
  if (p.currentWeeklyKm >= 35 && p.experienceYears >= 1) return 'intermediate';
  return 'beginner';
}

/** Progressive volume rule: 8 % weekly increase, deload (-25 %) every 4th week. */
export function suggestNextWeeklyKm(currentKm: number, target: number, weekIndex: number): number {
  if (currentKm >= target) return target;
  const recoveryWeek = weekIndex > 0 && weekIndex % 4 === 3;
  if (recoveryWeek) return Math.round(currentKm * 0.75);
  const next = currentKm * 1.08;
  return Math.min(Math.round(next), target);
}

/** Base weekly volume target for a runner level, normalised on the 5K. */
export function targetWeeklyKmForLevel(level: ExperienceLevel): number {
  switch (level) {
    case 'beginner': return 50;
    case 'intermediate': return 80;
    case 'advanced': return 120;
    case 'elite': return 170;
  }
}

/** Race-distance family — different specific work per family. */
export type RaceFamily = 'middle' | 'short' | 'medium' | 'long' | 'marathon';

export function raceFamily(distanceMeters: number): RaceFamily {
  if (distanceMeters <= 3000) return 'middle';
  if (distanceMeters <= 5000) return 'short';
  if (distanceMeters <= 10000) return 'medium';
  if (distanceMeters <= 21097.5) return 'long';
  return 'marathon';
}

/**
 * Volume scaling factor relative to the 5K base.
 * Same intermediate runner: ~80 km/sem for 1500m, ~140 km/sem for marathon.
 */
export function raceVolumeFactor(family: RaceFamily): number {
  switch (family) {
    case 'middle': return 1.0;
    case 'short':  return 1.05;
    case 'medium': return 1.15;
    case 'long':   return 1.40;
    case 'marathon': return 1.75;
  }
}

/**
 * Weekly target volume adapted to the race objective.
 * E.g. intermediate × marathon = 80 × 1.75 = 140 km/sem.
 */
export function targetWeeklyKmForRace(level: ExperienceLevel, raceDistanceMeters?: number): number {
  const base = targetWeeklyKmForLevel(level);
  if (raceDistanceMeters === undefined) return base;
  return Math.round(base * raceVolumeFactor(raceFamily(raceDistanceMeters)));
}

/** Number of threshold sessions per week. Middle-distance trades threshold for speed. */
export function thresholdSessionsPerWeek(level: ExperienceLevel, phase: TrainingPhase, family?: RaceFamily): number {
  if (family === 'middle' && level !== 'beginner') {
    if (phase === 'specific') return 1;
    return 2;
  }
  if (phase === 'recovery' || phase === 'taper') {
    return level === 'beginner' ? 1 : 2;
  }
  switch (level) {
    case 'beginner': return 1;
    case 'intermediate': return 2;
    case 'advanced': return 3;
    case 'elite': return 4;
  }
}

/** Speed sessions per week (R-pace, VO2max, track). Skews toward middle-distance. */
export function speedSessionsPerWeek(family: RaceFamily, phase: TrainingPhase): number {
  if (phase === 'recovery') return 1;
  switch (family) {
    case 'middle':  return phase === 'specific' ? 2 : 1;
    case 'short':   return 1;
    case 'medium':  return 1;
    case 'long':    return phase === 'specific' ? 0 : 1;
    case 'marathon': return phase === 'specific' || phase === 'taper' ? 0 : 1;
  }
}

export function shouldDoubleThreshold(level: ExperienceLevel): boolean {
  return level === 'advanced' || level === 'elite';
}

/** Priority of a race in the calendar. A = main objective, B = prep race, C = race-as-workout. */
export type RacePriority = 'A' | 'B' | 'C';

export function taperFactor(priority: RacePriority): number {
  if (priority === 'A') return 0.60;
  if (priority === 'B') return 0.85;
  return 1.00;
}

export function fullTaper(priority: RacePriority): boolean {
  return priority === 'A';
}

/**
 * Long-run target distance for marathon prep, scaled by weeks-to-race.
 * Peaks around 3-5 weeks before the race, then tapers.
 */
export function marathonLongRunKm(weeksToRace: number, weeklyKm: number): number {
  let target: number;
  if (weeksToRace <= 1) target = 18;
  else if (weeksToRace <= 2) target = 24;
  else if (weeksToRace <= 3) target = 30;
  else if (weeksToRace <= 5) target = 34;
  else if (weeksToRace <= 8) target = 30;
  else if (weeksToRace <= 12) target = 26;
  else if (weeksToRace <= 16) target = 22;
  else target = 20;
  return Math.min(target, Math.round(weeklyKm * 0.35));
}

/** Mid-long run for middle-distance / 5K / 10K prep. Shorter ceiling. */
export function midLongRunKm(family: RaceFamily, weeklyKm: number): number {
  const cap = family === 'middle' ? 16 : family === 'short' ? 18 : 22;
  return Math.min(cap, Math.round(weeklyKm * 0.25));
}
