import { interpolateVdot } from './table';

export interface RacePrediction {
  distanceLabel: string;
  distanceMeters: number;
  timeSeconds: number;
  pacePerKmSeconds: number;
}

/**
 * Predict race times for standard distances from current VDOT.
 */
export function predictRaceTimes(vdot: number): RacePrediction[] {
  const r = interpolateVdot(vdot);
  return [
    { distanceLabel: '5 km', distanceMeters: 5000, timeSeconds: r.race5k, pacePerKmSeconds: r.race5k / 5 },
    { distanceLabel: '10 km', distanceMeters: 10000, timeSeconds: r.race10k, pacePerKmSeconds: r.race10k / 10 },
    { distanceLabel: 'Semi', distanceMeters: 21097, timeSeconds: r.raceHM, pacePerKmSeconds: r.raceHM / 21.0975 },
    { distanceLabel: 'Marathon', distanceMeters: 42195, timeSeconds: r.raceM, pacePerKmSeconds: r.raceM / 42.195 },
  ];
}

export function formatRaceTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
