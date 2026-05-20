// Jack Daniels VDOT table - condensed (paces in seconds/km).
// Source: Daniels' Running Formula, 4th ed.
// We interpolate between rows for any VDOT in [30, 85].

export interface VdotRow {
  vdot: number;
  race5k: number;
  race10k: number;
  raceHM: number;
  raceM: number;
  easy: number;
  marathon: number;
  threshold: number;
  interval: number;
  repetition: number;
}

// Paces from Daniels' Running Formula (4th ed.), sec/km, rounded.
// Invariant: easy > marathon > threshold > interval > repetition (slower → faster).
export const VDOT_TABLE: VdotRow[] = [
  { vdot: 30, race5k: 1840, race10k: 3819, raceHM: 8493, raceM: 17688, easy: 447, marathon: 384, threshold: 360, interval: 333, repetition: 313 },
  { vdot: 35, race5k: 1624, race10k: 3375, raceHM: 7505, raceM: 15633, easy: 395, marathon: 343, threshold: 318, interval: 296, repetition: 277 },
  { vdot: 40, race5k: 1448, race10k: 3011, raceHM: 6701, raceM: 13965, easy: 355, marathon: 308, threshold: 286, interval: 267, repetition: 250 },
  { vdot: 45, race5k: 1303, race10k: 2710, raceHM: 6033, raceM: 12579, easy: 324, marathon: 279, threshold: 260, interval: 243, repetition: 228 },
  { vdot: 50, race5k: 1183, race10k: 2462, raceHM: 5479, raceM: 11424, easy: 298, marathon: 257, threshold: 240, interval: 224, repetition: 211 },
  { vdot: 55, race5k: 1080, race10k: 2249, raceHM: 5007, raceM: 10440, easy: 276, marathon: 238, threshold: 223, interval: 208, repetition: 195 },
  { vdot: 60, race5k: 994, race10k: 2070, raceHM: 4607, raceM: 9602, easy: 258, marathon: 222, threshold: 208, interval: 194, repetition: 182 },
  { vdot: 65, race5k: 918, race10k: 1913, raceHM: 4258, raceM: 8874, easy: 241, marathon: 208, threshold: 195, interval: 182, repetition: 170 },
  { vdot: 70, race5k: 853, race10k: 1778, raceHM: 3957, raceM: 8247, easy: 226, marathon: 196, threshold: 184, interval: 171, repetition: 161 },
  { vdot: 75, race5k: 796, race10k: 1658, raceHM: 3691, raceM: 7693, easy: 213, marathon: 185, threshold: 175, interval: 162, repetition: 152 },
  { vdot: 80, race5k: 745, race10k: 1552, raceHM: 3456, raceM: 7203, easy: 202, marathon: 175, threshold: 166, interval: 154, repetition: 144 },
  { vdot: 85, race5k: 700, race10k: 1458, raceHM: 3247, raceM: 6768, easy: 192, marathon: 167, threshold: 158, interval: 147, repetition: 138 },
];

export function interpolateVdot(vdot: number): VdotRow {
  const v = Math.max(30, Math.min(85, vdot));
  for (let i = 0; i < VDOT_TABLE.length - 1; i++) {
    const lo = VDOT_TABLE[i];
    const hi = VDOT_TABLE[i + 1];
    if (v >= lo.vdot && v <= hi.vdot) {
      const t = (v - lo.vdot) / (hi.vdot - lo.vdot);
      const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
      return {
        vdot: v,
        race5k: lerp(lo.race5k, hi.race5k),
        race10k: lerp(lo.race10k, hi.race10k),
        raceHM: lerp(lo.raceHM, hi.raceHM),
        raceM: lerp(lo.raceM, hi.raceM),
        easy: lerp(lo.easy, hi.easy),
        marathon: lerp(lo.marathon, hi.marathon),
        threshold: lerp(lo.threshold, hi.threshold),
        interval: lerp(lo.interval, hi.interval),
        repetition: lerp(lo.repetition, hi.repetition),
      };
    }
  }
  return VDOT_TABLE[VDOT_TABLE.length - 1];
}
