import type { Workout } from '@/lib/training/types';
import type { StravaActivity } from './client';

// Match a Strava activity to a planned workout on the same date.
//
// Heuristic, deliberately simple — the cost of a false positive (linking
// an "easy 8 km" Strava log to the wrong planned workout on a day with
// two sessions) is low: the user still sees both, and the match is
// reversible from the UI. The cost of a missed match (planned workout
// stays "not logged" even though the runner did it) is also low.
//
// Rules:
//   - Same calendar date (start_date_local).
//   - Workout type is not rest / cross_training.
//   - Distance within 30% of the planned distance.
//   - When the day has multiple workouts (AM/PM double-threshold), prefer
//     the one whose amPm matches the Strava start hour.
//   - Among remaining candidates, pick the smallest distance delta.

export interface MatchResult {
  workout: Workout;
  score: number; // 0..1, higher = better
}

const NON_MATCHABLE_TYPES = new Set(['rest', 'cross_training']);
const DISTANCE_TOLERANCE = 0.30;

export function matchActivityToWorkout(
  activity: StravaActivity,
  planned: Workout[],
): MatchResult | null {
  const activityDate = activity.start_date_local.slice(0, 10);
  const candidates = planned.filter(
    (w) => w.date === activityDate && !NON_MATCHABLE_TYPES.has(w.type) && w.totalDistanceMeters > 0,
  );
  if (candidates.length === 0) return null;

  const startHour = new Date(activity.start_date_local).getUTCHours();
  const isAm = startHour < 12;

  const scored = candidates
    .map((w) => {
      const ratio = activity.distance / w.totalDistanceMeters;
      const delta = Math.abs(1 - ratio);
      if (delta > DISTANCE_TOLERANCE) return null;
      // Score: 1 when perfect ratio, drops linearly to 0 at the tolerance bound.
      let score = 1 - delta / DISTANCE_TOLERANCE;
      // AM/PM tie-breaker for double-threshold days.
      if (w.amPm === 'AM' && isAm) score += 0.05;
      if (w.amPm === 'PM' && !isAm) score += 0.05;
      return { workout: w, score };
    })
    .filter((m): m is MatchResult => m !== null)
    .sort((a, b) => b.score - a.score);

  return scored[0] ?? null;
}
