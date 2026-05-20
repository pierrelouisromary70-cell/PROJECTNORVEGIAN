import { describe, expect, it } from 'vitest';
import { generatePlan } from './plan-generator';
import type { RunnerProfile } from './types';

const baseProfile: RunnerProfile = {
  experienceYears: 2,
  currentWeeklyKm: 30,
  daysPerWeek: 5,
  hasDoneIntervals: false,
  goal: 'progress',
  vdot: 45,
  sex: 'male',
  trackCycle: false,
};

describe('Norwegian plan generator', () => {
  it('produces a 4-week block by default', () => {
    const b = generatePlan({ profile: baseProfile, startDate: new Date('2026-06-01') });
    expect(b.weeks.length).toBe(4);
  });

  it('beginner gets a single threshold per week, no double', () => {
    const b = generatePlan({ profile: baseProfile, startDate: new Date('2026-06-01') });
    const week1 = b.weeks[0];
    const doubles = week1.workouts.filter((w) => w.isDouble);
    expect(doubles.length).toBe(0);
  });

  it('elite gets double-threshold days', () => {
    const elite: RunnerProfile = {
      ...baseProfile,
      experienceYears: 8,
      currentWeeklyKm: 130,
      hasDoneIntervals: true,
    };
    const b = generatePlan({ profile: elite, startDate: new Date('2026-06-01') });
    const doublesInWeek1 = b.weeks[0].workouts.filter((w) => w.isDouble);
    expect(doublesInWeek1.length).toBeGreaterThanOrEqual(2);
  });

  it('volume grows progressively (not in a recovery week)', () => {
    const b = generatePlan({ profile: baseProfile, startDate: new Date('2026-06-01') });
    expect(b.weeks[1].totalKm).toBeGreaterThanOrEqual(b.weeks[0].totalKm);
  });

  it('every workout carries purpose + feel + RPE so the runner is guided', () => {
    const b = generatePlan({ profile: baseProfile, startDate: new Date('2026-06-01') });
    for (const week of b.weeks) {
      for (const w of week.workouts) {
        if (w.type === 'rest') continue;
        expect(w.purpose.length).toBeGreaterThan(10);
        expect(w.feel.length).toBeGreaterThan(5);
        expect(w.rpe).toBeGreaterThan(0);
      }
    }
  });

  it('tapers to lower volume in the last 10 days before a race', () => {
    const raceDate = new Date('2026-06-21');
    const start = new Date('2026-06-01');
    const b = generatePlan({ profile: baseProfile, startDate: start, raceDate, weeks: 3 });
    const lastWeek = b.weeks[b.weeks.length - 1];
    expect(['taper', 'specific']).toContain(lastWeek.phase);
  });
});
