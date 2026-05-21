// Compute VDOT from a recent race performance using Daniels' formula.
export interface RaceInput {
  distanceMeters: number;
  timeSeconds: number;
}

export function computeVdot(race: RaceInput): number {
  const t = race.timeSeconds / 60;
  const v = race.distanceMeters / t;
  const numerator = -4.6 + 0.182258 * v + 0.000104 * v * v;
  const denominator =
    0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
  return Math.round((numerator / denominator) * 10) / 10;
}

export const RACE_PRESETS = {
  '1500m': 1500,
  '3k': 3000,
  '5k': 5000,
  '10k': 10000,
  hm: 21097.5,
  marathon: 42195,
} as const;

export const RACE_PRESET_LABELS: Record<keyof typeof RACE_PRESETS, string> = {
  '1500m': '1500 m',
  '3k': '3 km',
  '5k': '5 km',
  '10k': '10 km',
  hm: 'Semi-marathon',
  marathon: 'Marathon',
};
