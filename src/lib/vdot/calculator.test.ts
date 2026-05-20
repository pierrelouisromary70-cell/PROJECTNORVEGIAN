import { describe, expect, it } from 'vitest';
import { computeVdot, RACE_PRESETS } from './calculator';
import { interpolateVdot } from './table';
import { buildPaceZones, formatPace } from './paces';

describe('VDOT calculator', () => {
  it('returns ~50 for a 20:00 5K (textbook reference)', () => {
    const v = computeVdot({ distanceMeters: 5000, timeSeconds: 20 * 60 });
    expect(v).toBeGreaterThan(48);
    expect(v).toBeLessThan(52);
  });

  it('returns ~38-40 for a 50:00 10K', () => {
    const v = computeVdot({ distanceMeters: 10000, timeSeconds: 50 * 60 });
    expect(v).toBeGreaterThan(37);
    expect(v).toBeLessThan(41);
  });

  it('returns ~53 for a 3:00 marathon (Daniels reference)', () => {
    const v = computeVdot({ distanceMeters: RACE_PRESETS.marathon, timeSeconds: 3 * 3600 });
    expect(v).toBeGreaterThan(50);
    expect(v).toBeLessThan(57);
  });

  it('higher VDOT for faster runner', () => {
    const slow = computeVdot({ distanceMeters: 10000, timeSeconds: 60 * 60 });
    const fast = computeVdot({ distanceMeters: 10000, timeSeconds: 35 * 60 });
    expect(fast).toBeGreaterThan(slow);
  });
});

describe('VDOT table interpolation', () => {
  it('interpolates between rows monotonically', () => {
    const a = interpolateVdot(42);
    const b = interpolateVdot(47);
    expect(b.threshold).toBeLessThan(a.threshold);
  });

  it('clamps below 30 and above 85', () => {
    const low = interpolateVdot(20);
    const high = interpolateVdot(100);
    expect(low.vdot).toBe(30);
    expect(high.vdot).toBe(85);
  });
});

describe('Pace zones (Norwegian)', () => {
  it('LT1 is slower than LT2 (sub-threshold property)', () => {
    const z = buildPaceZones(55);
    expect(z.lt1.minSecPerKm).toBeGreaterThan(z.lt2.maxSecPerKm);
  });

  it('easy is slower than marathon, marathon slower than LT2', () => {
    const z = buildPaceZones(50);
    expect(z.easy.maxSecPerKm).toBeGreaterThan(z.marathon.maxSecPerKm);
    expect(z.marathon.minSecPerKm).toBeGreaterThan(z.lt2.minSecPerKm);
  });

  it('formats pace as M:SS', () => {
    expect(formatPace(300)).toBe('5:00');
    expect(formatPace(245)).toBe('4:05');
  });
});
