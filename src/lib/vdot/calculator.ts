import { VDOT_TABLE, type VdotRow } from './table';

// Compute VDOT from a recent race performance.
//
// IMPORTANT: we invert the VDOT_TABLE rather than use Daniels' raw velocity
// formula. The raw formula lives on a slightly different VDOT scale than our
// condensed table, so feeding its output back into the table over-estimated
// fitness by ~1.5-2 points: a 34:44 10K came out as VDOT ~61 and the table
// then "predicted" a 33:49 10K (faster than the actual race) and handed out
// paces that were too fast across the board. Inverting the table makes the
// round-trip exact — enter 34:44 over 10K, get the VDOT whose predicted 10K
// IS 34:44 — so every derived pace (easy/LT1/LT2/I/R) is correct.

export interface RaceInput {
  distanceMeters: number;
  timeSeconds: number;
}

// Riegel exponent — used only to normalise sub-5K efforts (1500 m, 3 km) to an
// equivalent 5 km time, since the condensed table has no sub-5K column.
const RIEGEL_EXPONENT = 1.06;

type RaceColumn = 'race5k' | 'race10k' | 'raceHM' | 'raceM';

function columnForDistance(distanceMeters: number): RaceColumn {
  if (distanceMeters <= 7500) return 'race5k';
  if (distanceMeters <= 15000) return 'race10k';
  if (distanceMeters <= 30000) return 'raceHM';
  return 'raceM';
}

export function computeVdot(race: RaceInput): number {
  let distance = race.distanceMeters;
  let time = race.timeSeconds;

  // Normalise short efforts to an equivalent 5K time (table has no sub-5K col).
  if (distance < 5000) {
    time = time * Math.pow(5000 / distance, RIEGEL_EXPONENT);
    distance = 5000;
  }

  const col = columnForDistance(distance);

  // Table race times DECREASE as VDOT increases — find the bracketing rows and
  // interpolate the VDOT whose predicted time equals the input time.
  for (let i = 0; i < VDOT_TABLE.length - 1; i++) {
    const lo: VdotRow = VDOT_TABLE[i];
    const hi: VdotRow = VDOT_TABLE[i + 1];
    const loTime = lo[col];
    const hiTime = hi[col];
    if (time <= loTime && time >= hiTime) {
      const frac = (loTime - time) / (loTime - hiTime);
      return Math.round((lo.vdot + frac * (hi.vdot - lo.vdot)) * 10) / 10;
    }
  }

  // Outside the table range → clamp to the table bounds.
  if (time > VDOT_TABLE[0][col]) return 30;
  return 85;
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
