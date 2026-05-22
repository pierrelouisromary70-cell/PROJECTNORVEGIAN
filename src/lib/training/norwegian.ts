// Norwegian training model — core rules and helpers.
//
// References:
// - Casado, A. et al. (2022) on lactate-guided threshold training
// - Haugen, T. (2022) on world-class endurance training characteristics
// - Daniels, J. (2014) Running Formula 4th ed.

import type { ExperienceLevel, RunnerProfile, TrainingPhase } from './types';

// =====================================================================
// EXPERIENCE LEVEL
// =====================================================================

export function inferExperience(
  p: Pick<RunnerProfile, 'experienceYears' | 'currentWeeklyKm' | 'hasDoneIntervals'>,
): ExperienceLevel {
  if (p.currentWeeklyKm >= 110 && p.experienceYears >= 5 && p.hasDoneIntervals) return 'elite';
  if (p.currentWeeklyKm >= 70 && p.experienceYears >= 3 && p.hasDoneIntervals) return 'advanced';
  if (p.currentWeeklyKm >= 35 && p.experienceYears >= 1) return 'intermediate';
  return 'beginner';
}

// =====================================================================
// VOLUME PROGRESSION WITH PLATEAU
// =====================================================================

/**
 * Progressive volume rule with plateau.
 *
 * Phases of weekly volume progression:
 *   weeks 0-2 (build-up):   +8 % per week toward target
 *   weeks 3 (deload):       -25 % from previous week
 *   weeks 4-7 (build-up):   +6 % per week toward target
 *   weeks 8-11 (consolidation): ±5 % fluctuation around target
 *   weeks 12+ (plateau):    target ± 5 %, with deload every 4 weeks
 *
 * Once at target, you stay at target. Real life: 80 km/sem doesn't become
 * 200 km/sem if you keep adding 8 %. There's a ceiling determined by your
 * level, age, sleep, life — the body needs steady doses, not infinite ramp.
 */
export function suggestNextWeeklyKm(currentKm: number, target: number, weekIndex: number): number {
  const recoveryWeek = weekIndex > 0 && weekIndex % 4 === 3;
  if (recoveryWeek) {
    return Math.max(Math.round(currentKm * 0.75), Math.round(target * 0.55));
  }
  if (currentKm >= target * 0.95) {
    const fluctuation = (weekIndex % 2 === 0) ? 1.0 : 0.97;
    return Math.round(target * fluctuation);
  }
  const progressFactor = currentKm < target * 0.75 ? 1.08 : 1.05;
  return Math.min(Math.round(currentKm * progressFactor), target);
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

// =====================================================================
// RACE FAMILIES
// =====================================================================

export type RaceFamily = 'middle' | 'short' | 'medium' | 'long' | 'marathon';

export function raceFamily(distanceMeters: number): RaceFamily {
  if (distanceMeters <= 3000) return 'middle';
  if (distanceMeters <= 5000) return 'short';
  if (distanceMeters <= 10000) return 'medium';
  if (distanceMeters <= 21097.5) return 'long';
  return 'marathon';
}

export function raceVolumeFactor(family: RaceFamily): number {
  switch (family) {
    case 'middle': return 1.0;
    case 'short':  return 1.05;
    case 'medium': return 1.15;
    case 'long':   return 1.40;
    case 'marathon': return 1.75;
  }
}

export function targetWeeklyKmForRace(level: ExperienceLevel, raceDistanceMeters?: number): number {
  const base = targetWeeklyKmForLevel(level);
  if (raceDistanceMeters === undefined) return base;
  return Math.round(base * raceVolumeFactor(raceFamily(raceDistanceMeters)));
}

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

export type RacePriority = 'A' | 'B' | 'C';

export function taperFactor(priority: RacePriority): number {
  if (priority === 'A') return 0.60;
  if (priority === 'B') return 0.85;
  return 1.00;
}

export function fullTaper(priority: RacePriority): boolean {
  return priority === 'A';
}

// =====================================================================
// LONG RUN — distance + time cap (2h30 max)
// =====================================================================

/** Maximum acceptable long-run duration in seconds. Prevents injury. */
export const LONG_RUN_MAX_SECONDS = 2.5 * 3600; // 2h30

/** Cap a target distance by the 2h30 ceiling, given the runner's long-run pace. */
export function capLongRunByTime(targetKm: number, longPaceSecPerKm: number): number {
  const maxKm = Math.floor(LONG_RUN_MAX_SECONDS / longPaceSecPerKm);
  return Math.min(targetKm, maxKm);
}

/**
 * Long-run target distance for marathon prep.
 * Capped by 35 % of weekly volume AND 2h30 time ceiling if pace is provided.
 */
export function marathonLongRunKm(
  weeksToRace: number,
  weeklyKm: number,
  longPaceSecPerKm?: number,
): number {
  let target: number;
  if (weeksToRace <= 1) target = 18;
  else if (weeksToRace <= 2) target = 24;
  else if (weeksToRace <= 3) target = 30;
  else if (weeksToRace <= 5) target = 34;
  else if (weeksToRace <= 8) target = 30;
  else if (weeksToRace <= 12) target = 26;
  else if (weeksToRace <= 16) target = 22;
  else target = 20;
  let capped = Math.min(target, Math.round(weeklyKm * 0.35));
  if (longPaceSecPerKm) capped = capLongRunByTime(capped, longPaceSecPerKm);
  return capped;
}

export function midLongRunKm(
  family: RaceFamily,
  weeklyKm: number,
  longPaceSecPerKm?: number,
): number {
  const cap = family === 'middle' ? 16 : family === 'short' ? 18 : 22;
  let result = Math.min(cap, Math.round(weeklyKm * 0.25));
  if (longPaceSecPerKm) result = capLongRunByTime(result, longPaceSecPerKm);
  return result;
}

// =====================================================================
// COMEBACK PROTOCOL (return-to-run after injury / extended break)
// =====================================================================

export interface ComebackContext {
  startDate: Date;
  today: Date;
}

export function comebackDayIndex(ctx: ComebackContext): number {
  return Math.floor((ctx.today.getTime() - ctx.startDate.getTime()) / 86400000);
}

export interface ComebackPhase {
  index: 1 | 2 | 3 | 4;
  label: string;
  description: string;
  allowedSessions: ('walk_run' | 'easy' | 'strides' | 'lt1')[];
  daysRemaining: number;
  easyMaxMinutes: number;
  withStrides: boolean;
  withSubThreshold: boolean;
}

/**
 * 14-day return-to-run protocol.
 *
 * Days 1-3 : walk-run alternation, 20-30 min, no quality
 * Days 4-7 : easy continuous, 30-40 min, no quality
 * Days 8-10: easy + 4-6 strides
 * Days 11-14: easy + ONE light sub-threshold (5×600 LT1) on day 13
 */
export function comebackPhase(ctx: ComebackContext): ComebackPhase | null {
  const day = comebackDayIndex(ctx);
  if (day < 0 || day >= 14) return null;
  const daysRemaining = 14 - day;
  if (day < 3) {
    return {
      index: 1, label: 'Reprise — marche/course',
      description: "Alternance marche/course très progressive. Pas plus de 30 min total. L'erreur classique : aller trop vite parce qu'on se sent bien la première semaine.",
      allowedSessions: ['walk_run', 'easy'],
      daysRemaining, easyMaxMinutes: 30, withStrides: false, withSubThreshold: false,
    };
  }
  if (day < 7) {
    return {
      index: 2, label: 'Reprise — footing continu',
      description: "Footing facile en continu, 30 à 40 min. Aucun travail de qualité. La progression du volume doit être imperceptible.",
      allowedSessions: ['easy'],
      daysRemaining, easyMaxMinutes: 40, withStrides: false, withSubThreshold: false,
    };
  }
  if (day < 10) {
    return {
      index: 3, label: 'Reprise — strides',
      description: "Footing + lignes droites (strides) à la fin pour réveiller le neuromusculaire sans stress métabolique.",
      allowedSessions: ['easy', 'strides'],
      daysRemaining, easyMaxMinutes: 50, withStrides: true, withSubThreshold: false,
    };
  }
  return {
    index: 4, label: 'Reprise — sous-seuil léger',
    description: "Une séance légère au sous-seuil (5×600 m à allure LT1). C'est la dernière étape avant retour au plan normal.",
    allowedSessions: ['easy', 'strides', 'lt1'],
    daysRemaining, easyMaxMinutes: 60, withStrides: true, withSubThreshold: true,
  };
}

// =====================================================================
// VARIANT SELECTION — progressivity toward race
// =====================================================================

/**
 * Offset into a variant array, used to pick LONGER / more race-like variants
 * as the runner approaches the race.
 *   base    : 0  → shortest, foundation
 *   build   : 1  → medium
 *   specific: 3  → longer / race-like
 *   taper   : 0  → familiar, low-risk
 */
export function variantOffsetForPhase(phase: TrainingPhase): number {
  switch (phase) {
    case 'base':     return 0;
    case 'build':    return 1;
    case 'specific': return 3;
    case 'taper':    return 0;
    case 'recovery': return 0;
  }
}
