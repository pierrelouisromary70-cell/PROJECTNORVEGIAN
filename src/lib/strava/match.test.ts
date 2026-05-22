import { describe, expect, it } from 'vitest';
import { matchActivityToWorkout } from './match';
import type { Workout } from '@/lib/training/types';
import type { StravaActivity } from './client';

function workout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: 'planned-1',
    date: '2026-06-10',
    type: 'easy',
    title: 'Easy 8 km',
    totalDistanceMeters: 8000,
    totalDurationSeconds: 2400,
    rpe: 3,
    purpose: 'easy aerobic',
    feel: 'conversational',
    guidance: [],
    steps: [],
    ...overrides,
  };
}

function activity(overrides: Partial<StravaActivity> = {}): StravaActivity {
  return {
    id: 12345,
    external_id: null,
    name: 'Morning Run',
    type: 'Run',
    start_date_local: '2026-06-10T08:00:00Z',
    distance: 8200,
    moving_time: 2500,
    elapsed_time: 2600,
    ...overrides,
  };
}

describe('matchActivityToWorkout', () => {
  it('matches when distance is within tolerance on the same date', () => {
    const r = matchActivityToWorkout(activity(), [workout()]);
    expect(r?.workout.id).toBe('planned-1');
    expect(r!.score).toBeGreaterThan(0.8);
  });

  it('rejects when date differs', () => {
    const r = matchActivityToWorkout(
      activity({ start_date_local: '2026-06-11T08:00:00Z' }),
      [workout()],
    );
    expect(r).toBeNull();
  });

  it('rejects when distance is > 30 % off', () => {
    // Planned 8 km, ran 12 km → 50 % over.
    const r = matchActivityToWorkout(activity({ distance: 12000 }), [workout()]);
    expect(r).toBeNull();
  });

  it('skips rest days', () => {
    const r = matchActivityToWorkout(activity(), [workout({ type: 'rest', totalDistanceMeters: 0 })]);
    expect(r).toBeNull();
  });

  it('picks AM workout for a morning activity on a double-threshold day', () => {
    const am = workout({ id: 'am', amPm: 'AM', type: 'lt1_threshold', totalDistanceMeters: 8000 });
    const pm = workout({ id: 'pm', amPm: 'PM', type: 'lt1_threshold', totalDistanceMeters: 8000 });
    const r = matchActivityToWorkout(activity({ start_date_local: '2026-06-10T07:30:00Z' }), [am, pm]);
    expect(r?.workout.id).toBe('am');
  });

  it('picks PM workout for an evening activity on a double-threshold day', () => {
    const am = workout({ id: 'am', amPm: 'AM', type: 'lt1_threshold', totalDistanceMeters: 8000 });
    const pm = workout({ id: 'pm', amPm: 'PM', type: 'lt1_threshold', totalDistanceMeters: 8000 });
    const r = matchActivityToWorkout(activity({ start_date_local: '2026-06-10T18:30:00Z' }), [am, pm]);
    expect(r?.workout.id).toBe('pm');
  });

  it('picks the closer-distance workout when both are on the same date', () => {
    const close = workout({ id: 'close', totalDistanceMeters: 8000 });
    const far = workout({ id: 'far', totalDistanceMeters: 6500 });
    const r = matchActivityToWorkout(activity({ distance: 8100 }), [close, far]);
    expect(r?.workout.id).toBe('close');
  });
});
