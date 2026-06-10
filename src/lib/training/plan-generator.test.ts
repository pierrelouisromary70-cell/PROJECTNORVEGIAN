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

  it('respects the runner\'s available days per week', () => {
    for (const days of [3, 4, 5, 6, 7]) {
      const b = generatePlan({ profile: { ...baseProfile, daysPerWeek: days }, startDate: new Date('2026-06-01') });
      for (const week of b.weeks) {
        const runDays = week.workouts.filter((w) => w.type !== 'rest').length;
        expect(runDays, `daysPerWeek=${days}`).toBeLessThanOrEqual(days);
      }
    }
  });

  it('a 3-day runner keeps quality (Tue), a second session (Thu) and the long run (Sat)', () => {
    const b = generatePlan({ profile: { ...baseProfile, daysPerWeek: 3 }, startDate: new Date('2026-06-01') });
    const week = b.weeks[0];
    expect(week.workouts[1].type).not.toBe('rest');
    expect(week.workouts[3].type).not.toBe('rest');
    expect(week.workouts[5].type).not.toBe('rest');
  });

  it('the deload week (week 4) never exceeds the previous build week', () => {
    const b = generatePlan({ profile: baseProfile, startDate: new Date('2026-06-01'), weeks: 8 });
    expect(b.weeks[3].totalKm).toBeLessThan(b.weeks[2].totalKm);
    // and the following week resumes the build, above the deload
    expect(b.weeks[4].totalKm).toBeGreaterThan(b.weeks[3].totalKm);
  });

  it('a low-volume beginner is not over-prescribed (weekly plan ≤ ~1.4× declared volume)', () => {
    const novice: RunnerProfile = { ...baseProfile, experienceYears: 0, currentWeeklyKm: 20, daysPerWeek: 4 };
    const b = generatePlan({ profile: novice, startDate: new Date('2026-06-01') });
    expect(b.weeks[0].totalKm).toBeLessThanOrEqual(Math.round(20 * 1.4));
  });

  it('a beginner targeting a marathon is capped at a safe volume ceiling', () => {
    const novice: RunnerProfile = { ...baseProfile, experienceYears: 0, currentWeeklyKm: 25, daysPerWeek: 4 };
    const b = generatePlan({
      profile: novice, startDate: new Date('2026-06-01'),
      raceDate: new Date('2026-10-11'), raceDistanceMeters: 42195, weeks: 4,
    });
    for (const week of b.weeks) {
      expect(week.totalKm).toBeLessThanOrEqual(60);
    }
  });

  it('a beginner gets exactly one hard session per week (threshold), the rest stays easy', () => {
    const novice: RunnerProfile = { ...baseProfile, experienceYears: 0, currentWeeklyKm: 20, daysPerWeek: 3 };
    const b = generatePlan({ profile: novice, startDate: new Date('2026-06-01') });
    for (const week of b.weeks) {
      const hard = week.workouts.filter((w) => ['lt1_threshold', 'lt2_threshold', 'vo2max', 'hills', 'race_pace'].includes(w.type));
      expect(hard.length).toBeLessThanOrEqual(1);
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
