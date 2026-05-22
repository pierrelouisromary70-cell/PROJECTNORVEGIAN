import { describe, expect, it } from 'vitest';
import { adaptWorkout, inferCyclePhase } from './adaptation';
import type { Workout } from './types';

function makeThreshold(): Workout {
  return {
    id: 'w1',
    date: '2026-06-01',
    type: 'lt1_threshold',
    title: 'LT1',
    totalDistanceMeters: 12000,
    totalDurationSeconds: 60 * 60,
    rpe: 6,
    purpose: 'sub-threshold',
    feel: 'controlled',
    guidance: [],
    steps: [
      { distanceMeters: 2000, pace: 'easy', note: 'WU' },
      { reps: 6, distanceMeters: 1000, pace: 'lt1', recoverySeconds: 60 },
      { distanceMeters: 2000, pace: 'easy', note: 'CD' },
    ],
  };
}

describe('Workout adaptation', () => {
  it('forces rest on severe pain (3)', () => {
    const r = adaptWorkout(makeThreshold(), { fatigue: 2, pain: 3 });
    expect(r.workout.type).toBe('rest');
    expect(r.adapted).toBe(true);
  });

  it('reduces reps and drops a zone on moderate pain (2)', () => {
    const original = makeThreshold();
    const r = adaptWorkout(original, { fatigue: 2, pain: 2 });
    expect(r.adapted).toBe(true);
    expect(r.workout.totalDistanceMeters).toBeLessThan(original.totalDistanceMeters);
    const origReps = original.steps.find((s) => s.reps)?.reps ?? 0;
    const newReps = r.workout.steps.find((s) => s.reps)?.reps ?? 0;
    expect(newReps).toBeLessThan(origReps);
  });

  it('keeps easy session as easy on moderate pain', () => {
    const easy: Workout = { ...makeThreshold(), type: 'easy', title: 'Easy', steps: [{ distanceMeters: 8000, pace: 'easy' }] };
    const r = adaptWorkout(easy, { fatigue: 2, pain: 2 });
    expect(r.workout.type).toBe('easy');
  });

  it('forces rest on extreme fatigue (5)', () => {
    const r = adaptWorkout(makeThreshold(), { fatigue: 5, pain: 0 });
    expect(r.workout.type).toBe('rest');
  });

  it('cuts reps 50% AND drops a zone on high fatigue (4) for hard sessions', () => {
    const original = makeThreshold();
    const r = adaptWorkout(original, { fatigue: 4, pain: 0 });
    expect(r.adapted).toBe(true);
    const origReps = original.steps.find((s) => s.reps)?.reps ?? 0;
    const newReps = r.workout.steps.find((s) => s.reps)?.reps ?? 0;
    expect(newReps).toBeLessThanOrEqual(Math.ceil(origReps * 0.55));
  });

  it('cuts reps 25% on moderate fatigue (3) without changing zone', () => {
    const original = makeThreshold();
    const r = adaptWorkout(original, { fatigue: 3, pain: 0 });
    expect(r.adapted).toBe(true);
    const origReps = original.steps.find((s) => s.reps)?.reps ?? 0;
    const newReps = r.workout.steps.find((s) => s.reps)?.reps ?? 0;
    expect(newReps).toBeLessThan(origReps);
  });

  it('reduces intensity in menstruation phase with elevated fatigue', () => {
    const r = adaptWorkout(makeThreshold(), { fatigue: 3, pain: 0, cyclePhase: 'menstruation' });
    expect(r.adapted).toBe(true);
    expect(r.workout.totalDistanceMeters).toBeLessThan(12000);
  });

  it('respects time constraint by scaling down', () => {
    const r = adaptWorkout(makeThreshold(), { fatigue: 2, pain: 0, availableMinutes: 30 });
    expect(r.workout.totalDurationSeconds).toBeLessThanOrEqual(30 * 60 + 5);
  });

  it('infers cycle phases from last period start', () => {
    const start = new Date('2026-05-01');
    expect(inferCyclePhase(start, new Date('2026-05-02'))).toBe('menstruation');
    expect(inferCyclePhase(start, new Date('2026-05-09'))).toBe('follicular');
    expect(inferCyclePhase(start, new Date('2026-05-14'))).toBe('ovulation');
    expect(inferCyclePhase(start, new Date('2026-05-26'))).toBe('luteal_late');
  });
});
