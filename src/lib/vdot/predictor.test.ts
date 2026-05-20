import { describe, expect, it } from 'vitest';
import { predictRaceTimes, formatRaceTime } from './predictor';

describe('Race time predictor', () => {
  it('returns 4 distances', () => {
    const p = predictRaceTimes(50);
    expect(p).toHaveLength(4);
    expect(p.map((r) => r.distanceLabel)).toEqual(['5 km', '10 km', 'Semi', 'Marathon']);
  });

  it('5K time < 10K time < HM time < Marathon time', () => {
    const p = predictRaceTimes(50);
    expect(p[0].timeSeconds).toBeLessThan(p[1].timeSeconds);
    expect(p[1].timeSeconds).toBeLessThan(p[2].timeSeconds);
    expect(p[2].timeSeconds).toBeLessThan(p[3].timeSeconds);
  });

  it('higher VDOT predicts faster times', () => {
    const slow = predictRaceTimes(40);
    const fast = predictRaceTimes(60);
    expect(fast[0].timeSeconds).toBeLessThan(slow[0].timeSeconds);
    expect(fast[3].timeSeconds).toBeLessThan(slow[3].timeSeconds);
  });

  it('formats race time as H:MM:SS or M:SS', () => {
    expect(formatRaceTime(20 * 60)).toBe('20:00');
    expect(formatRaceTime(3 * 3600 + 30 * 60)).toBe('3:30:00');
  });
});
