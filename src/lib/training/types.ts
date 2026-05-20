import type { PaceKey } from '@/lib/vdot/paces';

export type WorkoutType =
  | 'easy'
  | 'long'
  | 'recovery'
  | 'lt1_threshold' // Norwegian AM double-threshold (sub-threshold)
  | 'lt2_threshold' // PM threshold or single classical T session
  | 'double_threshold' // marker — actually 2 sessions same day
  | 'vo2max'
  | 'hills'
  | 'strides'
  | 'race_pace'
  | 'rest'
  | 'cross_training';

export interface WorkoutStep {
  reps?: number;
  distanceMeters?: number;
  durationSeconds?: number;
  pace?: PaceKey | 'long';
  recoverySeconds?: number;
  note?: string;
}

export interface Workout {
  id: string;
  date: string; // ISO yyyy-mm-dd
  type: WorkoutType;
  title: string;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  steps: WorkoutStep[];
  purpose: string; // why this workout exists
  feel: string; // how it should feel
  rpe: number; // 1-10
  guidance: string[]; // bullet coaching cues
  isDouble?: boolean; // double-threshold day (AM + PM)
  amPm?: 'AM' | 'PM';
}

export interface TrainingWeek {
  weekNumber: number; // 1-based within block
  startDate: string;
  totalKm: number;
  phase: TrainingPhase;
  workouts: Workout[];
  notes?: string;
}

export interface TrainingBlock {
  id: string;
  startDate: string;
  endDate: string;
  weeks: TrainingWeek[];
  targetRaceId?: string;
  vdotAtStart: number;
}

export type TrainingPhase = 'base' | 'build' | 'specific' | 'taper' | 'recovery';

export type Goal = 'progress' | 'perform';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite';

export interface RunnerProfile {
  experienceYears: number;
  currentWeeklyKm: number;
  daysPerWeek: number;
  hasDoneIntervals: boolean;
  goal: Goal;
  vdot: number;
  sex: 'male' | 'female' | 'other';
  trackCycle: boolean;
  timeConstraintsMinPerSession?: number; // max minutes available per session
}
