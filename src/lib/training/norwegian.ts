// Norwegian training model: high volume + lots of (sub)threshold work,
// double-threshold days for advanced runners, strict polarization
// of intensity at the top end. Easy stays truly easy.
//
// References:
// - Casado, A. et al. (2022) on lactate-guided threshold training
// - Ingebrigtsen brothers (M. Ingebrigtsen Sr.)'s public talks

import type { ExperienceLevel, RunnerProfile, TrainingPhase } from './types';

export function inferExperience(p: Pick<RunnerProfile, 'experienceYears' | 'currentWeeklyKm' | 'hasDoneIntervals'>): ExperienceLevel {
  if (p.currentWeeklyKm >= 110 && p.experienceYears >= 5 && p.hasDoneIntervals) return 'elite';
  if (p.currentWeeklyKm >= 70 && p.experienceYears >= 3 && p.hasDoneIntervals) return 'advanced';
  if (p.currentWeeklyKm >= 35 && p.experienceYears >= 1) return 'intermediate';
  return 'beginner';
}

// 10% rule, capped — Norwegian volume must be built patiently.
export function suggestNextWeeklyKm(currentKm: number, target: number, weekIndex: number): number {
  if (currentKm >= target) return target;
  // Recovery weeks every 4th week: -25% from previous load.
  const recoveryWeek = weekIndex > 0 && weekIndex % 4 === 3;
  if (recoveryWeek) return Math.round(currentKm * 0.75);
  const next = currentKm * 1.08; // 8% increase, slightly conservative
  return Math.min(Math.round(next), target);
}

export function targetWeeklyKmForLevel(level: ExperienceLevel): number {
  switch (level) {
    case 'beginner': return 50;
    case 'intermediate': return 80;
    case 'advanced': return 120;
    case 'elite': return 170;
  }
}

// How many threshold sessions per week (Norwegian hallmark).
export function thresholdSessionsPerWeek(level: ExperienceLevel, phase: TrainingPhase): number {
  if (phase === 'recovery' || phase === 'taper') {
    return level === 'beginner' ? 1 : 2;
  }
  switch (level) {
    case 'beginner': return 1; // 1 single threshold
    case 'intermediate': return 2; // 2 separate days
    case 'advanced': return 3; // begin double-threshold (Tue or Thu)
    case 'elite': return 4; // classic Ingebrigtsen: Tue AM/PM + Thu AM/PM
  }
}

export function shouldDoubleThreshold(level: ExperienceLevel): boolean {
  return level === 'advanced' || level === 'elite';
}
