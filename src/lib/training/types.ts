export type PaceZoneKey = 'easy' | 'long' | 'marathon' | 'lt1' | 'lt2' | 'interval' | 'repetition';

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
  pace?: PaceZoneKey;
  recoverySeconds?: number;
  note?: string;
}

export interface Workout {
  id: string;
  date: string;
  type: WorkoutType;
  title: string;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  steps: WorkoutStep[];
  purpose: string;
  feel: string;
  rpe: number;
  guidance: string[];
  isDouble?: boolean;
  amPm?: 'AM' | 'PM';
}

export interface TrainingWeek {
  weekNumber: number;
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
  timeConstraintsMinPerSession?: number;
}
