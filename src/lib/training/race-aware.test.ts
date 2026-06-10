import { describe, expect, it } from 'vitest';
import { generatePlan } from './plan-generator';
import {
  marathonLongRunKm,
  raceFamily,
  raceVolumeFactor,
  speedSessionsPerWeek,
  taperFactor,
  targetWeeklyKmForRace,
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

describe('Race-aware volume scaling', () => {
  it('marathon target volume is ~1.75x the 1500m target for the same level', () => {
    const v1500 = targetWeeklyKmForRace('intermediate', 1500);
    const vMarathon = targetWeeklyKmForRace('intermediate', 42195);
    expect(vMarathon / v1500).toBeCloseTo(1.75, 1);
  });

  it('intermediate × marathon ≈ 140 km/sem (user reference number)', () => {
    expect(targetWeeklyKmForRace('intermediate', 42195)).toBe(140);
  });

  it('intermediate × 1500m ≈ 80 km/sem (user reference number)', () => {
    expect(targetWeeklyKmForRace('intermediate', 1500)).toBe(80);
  });

  it('beginner × marathon < advanced × 5K', () => {
    const begM = targetWeeklyKmForRace('beginner', 42195);
    const adv5 = targetWeeklyKmForRace('advanced', 5000);
    expect(begM).toBeLessThan(adv5);
  });

  it('raceVolumeFactor is monotonically increasing', () => {
    const families = ['middle', 'short', 'medium', 'long', 'marathon'] as const;
    for (let i = 1; i < families.length; i++) {
      expect(raceVolumeFactor(families[i])).toBeGreaterThanOrEqual(raceVolumeFactor(families[i - 1]));
    }
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

  it('places the race itself on race day, openers the day before, recovery after', () => {
    const raceDate = new Date('2026-06-21'); // Sunday of week 3
    const block = generatePlan({
      profile: intermediate, startDate: new Date('2026-06-01'),
      raceDistanceMeters: 10000, raceDate, racePriority: 'A', weeks: 4,
    });
    const all = block.weeks.flatMap((w) => w.workouts);
    const raceDay = all.find((w) => w.date === '2026-06-21');
    expect(raceDay?.title).toContain('10 km');
    expect(raceDay?.rpe).toBe(10);
    const dayBefore = all.find((w) => w.date === '2026-06-20');
    expect(dayBefore?.type).toBe('strides');
    // No quality session after the race in the same block
    const after = all.filter((w) => w.date > '2026-06-21');
    expect(after.length).toBeGreaterThan(0);
    for (const w of after) {
      expect(['easy', 'rest']).toContain(w.type);
    }
  });

  it('the week after the race carries much less volume than the build weeks', () => {
    const block = generatePlan({
      profile: intermediate, startDate: new Date('2026-06-01'),
      raceDistanceMeters: 10000, raceDate: new Date('2026-06-14'), racePriority: 'A', weeks: 4,
    });
    const buildWeek = block.weeks[0];
    const postRaceWeek = block.weeks[2]; // first full week after the race
    expect(postRaceWeek.phase).toBe('recovery');
    expect(postRaceWeek.totalKm).toBeLessThan(buildWeek.totalKm * 0.7);
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
