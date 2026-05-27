import { describe, expect, it } from 'vitest';
import { baselineAdvanceFactor, blockAdherenceRatio, nextTrainingBaseline } from './progression';

describe('Long-term volume progression', () => {
  it('a consistent 30 km runner climbs to a healthy ~70-80 km over ~3 years', () => {
    let km = 30;
    const blocksPerYear = 13; // 4-week mesocycles
    for (let i = 0; i < blocksPerYear * 3; i++) {
      km = nextTrainingBaseline(km, 0.8); // good adherence every block
    }
    expect(km).toBeGreaterThan(60); // real, visible multi-year progression
    expect(km).toBeLessThan(95); // sustainable, not a runaway ramp
  });

  it('never caps volume — sustained training keeps it growing even at high mileage', () => {
    expect(nextTrainingBaseline(150, 0.9)).toBeGreaterThan(150);
    expect(nextTrainingBaseline(200, 0.9)).toBeGreaterThan(200);
  });

  it('the growth rate slows as mileage rises but never reaches zero', () => {
    expect(baselineAdvanceFactor(35)).toBeGreaterThan(baselineAdvanceFactor(95));
    expect(baselineAdvanceFactor(95)).toBeGreaterThan(baselineAdvanceFactor(200));
    expect(baselineAdvanceFactor(200)).toBeGreaterThan(1);
  });

  it('holds steady on mediocre adherence, gently backs off on poor', () => {
    expect(nextTrainingBaseline(60, 0.55)).toBe(60);
    expect(nextTrainingBaseline(60, 0.2)).toBeLessThan(60);
  });

  it('a single block advances the baseline only modestly (no monthly doubling)', () => {
    const next = nextTrainingBaseline(50, 1);
    expect(next).toBeGreaterThan(50);
    expect(next).toBeLessThanOrEqual(Math.round(50 * 1.05));
  });

  it('adherence ratio is bounded to [0,1] and safe when nothing was planned', () => {
    expect(blockAdherenceRatio(20, 25)).toBe(1);
    expect(blockAdherenceRatio(20, 10)).toBe(0.5);
    expect(blockAdherenceRatio(0, 0)).toBe(1);
  });
});
