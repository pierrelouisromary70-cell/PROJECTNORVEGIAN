import { interpolateVdot, type VdotRow } from './table';

export type PaceKey = 'easy' | 'marathon' | 'threshold' | 'interval' | 'repetition';

// Norwegian-style subthreshold zones — sit slightly under classical T.
// LT1 (~2.0 mmol/L) is roughly between M and T; LT2 (~3.5 mmol/L) ~= T.
export interface PaceZones {
  easy: PaceRange; // E - jogging, conversational
  long: PaceRange; // long-run pace, between E and M
  marathon: PaceRange; // M
  lt1: PaceRange; // sub-threshold lower (Norwegian double-threshold AM)
  lt2: PaceRange; // sub-threshold upper (classical T, Norwegian PM threshold)
  interval: PaceRange; // I - VO2max
  repetition: PaceRange; // R - neuromuscular
}

export interface PaceRange {
  minSecPerKm: number;
  maxSecPerKm: number;
}

export function buildPaceZones(vdot: number): PaceZones {
  const r: VdotRow = interpolateVdot(vdot);
  return {
    easy: { minSecPerKm: r.easy - 5, maxSecPerKm: r.easy + 25 },
    long: { minSecPerKm: Math.round((r.easy + r.marathon) / 2) - 5, maxSecPerKm: r.easy + 10 },
    marathon: { minSecPerKm: r.marathon - 3, maxSecPerKm: r.marathon + 3 },
    // Norwegian LT1 ~ between M and T, but closer to T (sustainable ~60 min)
    lt1: { minSecPerKm: r.threshold + 6, maxSecPerKm: r.threshold + 14 },
    lt2: { minSecPerKm: r.threshold - 3, maxSecPerKm: r.threshold + 3 },
    interval: { minSecPerKm: r.interval - 3, maxSecPerKm: r.interval + 3 },
    repetition: { minSecPerKm: r.repetition - 3, maxSecPerKm: r.repetition + 3 },
  };
}

export function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatRange(r: PaceRange): string {
  return `${formatPace(r.minSecPerKm)}–${formatPace(r.maxSecPerKm)}/km`;
}
