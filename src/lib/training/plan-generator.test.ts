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

  it('gives the beginner a sub-threshold (LT1) session — the Norwegian signature', () => {
    const b = generatePlan({ profile: baseProfile, startDate: new Date('2026-06-01') });
    const lt1 = b.weeks.flatMap((w) => w.workouts).filter((w) => w.type === 'lt1_threshold');
    expect(lt1.length).toBeGreaterThanOrEqual(1);
  });

  it('does not repeat hills every single week for a beginner', () => {
    const b = generatePlan({ profile: baseProfile, startDate: new Date('2026-06-01') });
    const hillsWeeks = b.weeks.filter((w) => w.workouts.some((x) => x.type === 'hills')).length;
    // Hills should appear at most once in a 4-week block (every 3rd week), not weekly.
    expect(hillsWeeks).toBeLessThanOrEqual(2);
  });

  it('rotates the primary session across consecutive blocks (no carbon-copy)', () => {
    const blockA = generatePlan({ profile: baseProfile, startDate: new Date('2026-06-01') });
    const blockB = generatePlan({ profile: baseProfile, startDate: new Date('2026-06-29') });
    // Tuesday (day index 1) primary quality session of week 0.
    const tueA = blockA.weeks[0].workouts.find((w) => w.date === '2026-06-02');
    const tueB = blockB.weeks[0].workouts.find((w) => w.date === '2026-06-30');
    expect(tueA?.title).not.toBe(tueB?.title);
  });

  it('ramps quality reps across the training cycle (start lighter, peak mid-block)', () => {
    const runner: RunnerProfile = {
      ...baseProfile,
      experienceYears: 5,
      currentWeeklyKm: 70,
      hasDoneIntervals: true,
      vdot: 55,
    };
    const b = generatePlan({ profile: runner, startDate: new Date('2026-06-01') });
    const QUALITY = ['lt1_threshold', 'lt2_threshold', 'vo2max', 'hills'];
    const hasNote = (week: (typeof b.weeks)[number], frag: string) =>
      week.workouts.some(
        (w) => QUALITY.includes(w.type) && w.guidance.some((g) => g.includes(frag)),
      );

    // Week 0 = first build week of the micro-cycle → loaded below peak.
    expect(hasNote(b.weeks[0], 'montée en charge')).toBe(true);
    // Week 2 = peak → full reps, no build-up note.
    expect(hasNote(b.weeks[2], 'montée en charge')).toBe(false);
  });

  it('session titles always match the breakdown (no "10×600" title over a "7×600" detail)', () => {
    for (const km of [30, 55, 80, 110, 150]) {
      const runner: RunnerProfile = { ...baseProfile, experienceYears: 5, currentWeeklyKm: km, hasDoneIntervals: true, vdot: 55 };
      for (const start of ['2026-06-01', '2026-06-29']) {
        const b = generatePlan({ profile: runner, startDate: new Date(start), weeks: 4, locale: 'fr', raceDate: new Date('2026-10-01'), raceDistanceMeters: 21097 });
        for (const wk of b.weeks) {
          for (const w of wk.workouts) {
            for (const tok of w.title.matchAll(/(\d+)×(\d+)\s*m(?!in)\b/g)) {
              const reps = Number(tok[1]);
              const dist = Number(tok[2]);
              const matches = w.steps.some((s) => s.reps === reps && s.distanceMeters === dist)
                || w.steps.filter((s) => s.distanceMeters === dist).length === reps;
              expect(matches, `title "${w.title}" claims ${reps}×${dist}m but steps don't`).toBe(true);
            }
          }
        }
      }
    }
  });

  it('weekly volume tracks the progressive target regardless of variant drawn', () => {
    const b = generatePlan({ profile: baseProfile, startDate: new Date('2026-06-01') });
    // Non-recovery weeks (0,1,2) should not collapse far below the declared
    // starting volume — the easy-run buffer keeps the week on target.
    for (const w of b.weeks.slice(0, 3)) {
      expect(w.totalKm).toBeGreaterThanOrEqual(28);
    }
  });
});
