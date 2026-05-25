import { describe, expect, it } from 'vitest';
import { generatePlan } from './plan-generator';
import {
  marathonLongRunKm,
  raceFamily,
  shouldDoubleThreshold,
  speedSessionsPerWeek,
  taperFactor,
  targetWeeklyKmForRace,
  weeklyVolumeGrowthFactor,
} from './norwegian';
import type { RunnerProfile } from './types';

const intermediate: RunnerProfile = {
  experienceYears: 3,
  currentWeeklyKm: 55,
  daysPerWeek: 6,
  hasDoneIntervals: true,
  goal: 'perform',
  vdot: 50,
  sex: 'male',
  trackCycle: false,
};

describe('Volume target is anchored on current volume', () => {
  it('target is a modest step up from current — never close to ×2', () => {
    for (const cur of [25, 35, 55, 80, 100, 130, 150]) {
      const t = targetWeeklyKmForRace(cur, 42195); // marathon = biggest emphasis
      expect(t).toBeGreaterThanOrEqual(cur);
      expect(t).toBeLessThanOrEqual(Math.round(cur * 1.3)); // hard +30% ceiling
    }
  });

  it('a 70 km and a 150 km runner are NOT given the same target', () => {
    expect(targetWeeklyKmForRace(70)).not.toBe(targetWeeklyKmForRace(150));
  });

  it('lower-mileage runners may grow proportionally more than high-mileage ones', () => {
    expect(weeklyVolumeGrowthFactor(35)).toBeGreaterThan(weeklyVolumeGrowthFactor(150));
  });

  it('marathon target ≥ 1500m target for the same runner (more aerobic emphasis)', () => {
    const cur = 80;
    expect(targetWeeklyKmForRace(cur, 42195)).toBeGreaterThanOrEqual(targetWeeklyKmForRace(cur, 1500));
  });
});

describe('Double-threshold gating', () => {
  it('requires at least 100 km/week', () => {
    expect(shouldDoubleThreshold('elite', 90)).toBe(false);
    expect(shouldDoubleThreshold('elite', 100)).toBe(true);
    expect(shouldDoubleThreshold('advanced', 120)).toBe(true);
  });

  it('high volume alone is not enough without training maturity', () => {
    expect(shouldDoubleThreshold('beginner', 120)).toBe(false);
    expect(shouldDoubleThreshold('intermediate', 120)).toBe(false);
  });
});

describe('Race family classification', () => {
  it('classifies distances into families', () => {
    expect(raceFamily(1500)).toBe('middle');
    expect(raceFamily(3000)).toBe('middle');
    expect(raceFamily(5000)).toBe('short');
    expect(raceFamily(10000)).toBe('medium');
    expect(raceFamily(21097)).toBe('long');
    expect(raceFamily(42195)).toBe('marathon');
  });
});

describe('Speed session frequency per family', () => {
  it('middle-distance gets more speed than marathon', () => {
    expect(speedSessionsPerWeek('middle', 'specific')).toBeGreaterThan(speedSessionsPerWeek('marathon', 'specific'));
  });
  it('marathon drops pure speed in taper and specific', () => {
    expect(speedSessionsPerWeek('marathon', 'taper')).toBe(0);
    expect(speedSessionsPerWeek('marathon', 'specific')).toBe(0);
  });
  it('middle-distance keeps speed even in specific phase', () => {
    expect(speedSessionsPerWeek('middle', 'specific')).toBeGreaterThanOrEqual(1);
  });
});

describe('Race priority taper depth', () => {
  it('A is the deepest taper, C is none', () => {
    expect(taperFactor('A')).toBeLessThan(taperFactor('B'));
    expect(taperFactor('B')).toBeLessThan(taperFactor('C'));
    expect(taperFactor('C')).toBe(1.0);
  });
});

describe('Marathon long-run progression', () => {
  const km = 100;
  it('grows from base to peak', () => {
    expect(marathonLongRunKm(16, km)).toBeLessThan(marathonLongRunKm(5, km));
  });
  it('peaks 4-5 weeks before the race', () => {
    const peak = marathonLongRunKm(5, km);
    expect(peak).toBeGreaterThanOrEqual(marathonLongRunKm(8, km));
    expect(peak).toBeGreaterThanOrEqual(marathonLongRunKm(2, km));
  });
  it('tapers in the final 3 weeks', () => {
    expect(marathonLongRunKm(1, km)).toBeLessThan(marathonLongRunKm(3, km));
  });
  it('never exceeds 35 % of weekly volume', () => {
    expect(marathonLongRunKm(5, 60)).toBeLessThanOrEqual(60 * 0.35);
  });
});

describe('Plan generator with race objective', () => {
  it('marathon plan in specific phase produces a long run > 25 km when volume allows', () => {
    const start = new Date('2026-06-01');
    const raceDate = new Date('2026-07-20');
    const profile = { ...intermediate, currentWeeklyKm: 100 };
    const block = generatePlan({
      profile, startDate: start, raceDate, raceDistanceMeters: 42195,
      racePriority: 'A', weeks: 4,
    });
    const longs = block.weeks.flatMap((w) => w.workouts).filter((w) => w.type === 'long');
    const maxLong = longs.reduce((m, w) => Math.max(m, w.totalDistanceMeters), 0);
    expect(maxLong).toBeGreaterThan(25000);
  });

  it('1500m plan does NOT push the long run beyond ~20 km', () => {
    const profile = { ...intermediate, currentWeeklyKm: 80 };
    const block = generatePlan({
      profile, startDate: new Date('2026-06-01'),
      raceDistanceMeters: 1500, raceDate: new Date('2026-06-22'),
      racePriority: 'A', weeks: 4,
    });
    const longs = block.weeks.flatMap((w) => w.workouts).filter((w) => w.type === 'long');
    const maxLong = longs.reduce((m, w) => Math.max(m, w.totalDistanceMeters), 0);
    expect(maxLong).toBeLessThanOrEqual(20000);
  });

  it('1500m plan in specific phase includes short reps OR track session OR race-pace', () => {
    const block = generatePlan({
      profile: intermediate, startDate: new Date('2026-06-01'),
      raceDistanceMeters: 1500, raceDate: new Date('2026-06-15'),
      racePriority: 'A', weeks: 3,
    });
    const titles = block.weeks.flatMap((w) => w.workouts).map((w) => w.title);
    const hasSpeedSpecific = titles.some((t) => t.includes('Rappels vitesse') || t.includes('Piste') || t.includes('Allure spécifique'));
    expect(hasSpeedSpecific).toBe(true);
  });

  it('priority C race does not taper', () => {
    const block = generatePlan({
      profile: intermediate, startDate: new Date('2026-06-01'),
      raceDistanceMeters: 10000, raceDate: new Date('2026-06-08'),
      racePriority: 'C', weeks: 2,
    });
    const phases = block.weeks.map((w) => w.phase);
    expect(phases.includes('taper')).toBe(false);
  });
});
