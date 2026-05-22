import { describe, expect, it } from 'vitest';
import {
  capLongRunByTime,
  comebackDayIndex,
  comebackPhase,
  comebackProtocolDays,
  comebackSchedule,
  marathonLongRunKm,
  midLongRunKm,
  postBreakRampWeeks,
  postBreakWeeklyKmCap,
  suggestNextWeeklyKm,
  variantOffsetForPhase,
  LONG_RUN_MAX_SECONDS,
  type ComebackContext,
} from './norwegian';
import { generateComebackPlan } from './comeback-plan';

describe('Volume plateau', () => {
  it('grows progressively when below target', () => {
    const next = suggestNextWeeklyKm(40, 80, 0);
    expect(next).toBeGreaterThan(40);
    expect(next).toBeLessThanOrEqual(80);
  });

  it('plateaus around target — does not grow indefinitely', () => {
    let km = 40;
    for (let week = 0; week < 50; week++) {
      km = suggestNextWeeklyKm(km, 80, week);
    }
    expect(km).toBeLessThanOrEqual(80 * 1.05);
    expect(km).toBeGreaterThan(80 * 0.5);
  });

  it('applies a deload every 4th week', () => {
    const week3Recovery = suggestNextWeeklyKm(80, 80, 3);
    expect(week3Recovery).toBeLessThan(80 * 0.85);
  });

  it('slows the climb to 5% once past 75% of target', () => {
    const justBelow = suggestNextWeeklyKm(63, 80, 0);
    expect(justBelow).toBeLessThanOrEqual(Math.round(63 * 1.06));
    expect(justBelow).toBeGreaterThanOrEqual(Math.round(63 * 1.04));
  });

  it('fluctuates around target', () => {
    const a = suggestNextWeeklyKm(80, 80, 0);
    const b = suggestNextWeeklyKm(80, 80, 1);
    expect(a).toBeGreaterThan(80 * 0.9);
    expect(a).toBeLessThanOrEqual(80);
    expect(b).toBeGreaterThan(80 * 0.9);
    expect(b).toBeLessThanOrEqual(80);
  });
});

describe('Long run time cap (2h30)', () => {
  it('caps long run at 2h30 of running time', () => {
    const km = capLongRunByTime(34, 360);
    expect(km).toBeLessThanOrEqual(25);
  });
  it('allows longer distance for faster runners', () => {
    const km = capLongRunByTime(34, 240);
    expect(km).toBe(34);
  });
  it('marathonLongRunKm respects time cap', () => {
    const km = marathonLongRunKm(5, 100, 360);
    const seconds = km * 360;
    expect(seconds).toBeLessThanOrEqual(LONG_RUN_MAX_SECONDS);
  });
  it('midLongRunKm respects time cap', () => {
    const km = midLongRunKm('long', 80, 360);
    const seconds = km * 360;
    expect(seconds).toBeLessThanOrEqual(LONG_RUN_MAX_SECONDS);
  });
});

describe('Comeback protocol', () => {
  it('returns null after 14 days', () => {
    const ctx: ComebackContext = { startDate: new Date('2026-01-01'), today: new Date('2026-01-20') };
    expect(comebackPhase(ctx)).toBeNull();
  });
  it('starts with walk/run on day 1', () => {
    const ctx: ComebackContext = { startDate: new Date('2026-01-01'), today: new Date('2026-01-01') };
    const phase = comebackPhase(ctx);
    expect(phase?.index).toBe(1);
    expect(phase?.allowedSessions).toContain('walk_run');
  });
  it('phase 4 introduces light LT1 by day 11', () => {
    const ctx: ComebackContext = { startDate: new Date('2026-01-01'), today: new Date('2026-01-11') };
    const phase = comebackPhase(ctx);
    expect(phase?.index).toBe(4);
    expect(phase?.withSubThreshold).toBe(true);
  });
  it('progresses through all 4 phases over 14 days', () => {
    const startDate = new Date('2026-01-01');
    const phases = new Set<number>();
    for (let d = 0; d < 14; d++) {
      const today = new Date('2026-01-01');
      today.setDate(today.getDate() + d);
      const p = comebackPhase({ startDate, today });
      if (p) phases.add(p.index);
    }
    expect(phases.size).toBe(4);
  });
  it('day index computation is correct', () => {
    expect(comebackDayIndex({ startDate: new Date('2026-01-01'), today: new Date('2026-01-01') })).toBe(0);
    expect(comebackDayIndex({ startDate: new Date('2026-01-01'), today: new Date('2026-01-08') })).toBe(7);
  });
});

describe('Comeback plan generator', () => {
  it('produces a 14-day plan structured into 2 weeks', () => {
    const block = generateComebackPlan({ comebackStartDate: new Date('2026-01-01'), today: new Date('2026-01-01') });
    expect(block.weeks).toHaveLength(2);
    expect(block.weeks[0].workouts.length).toBe(7);
    expect(block.weeks[1].workouts.length).toBe(7);
  });
  it('includes 3 rest days over the 14 days', () => {
    const block = generateComebackPlan({ comebackStartDate: new Date('2026-01-01'), today: new Date('2026-01-01') });
    const restDays = block.weeks.flatMap((w) => w.workouts).filter((w) => w.type === 'rest');
    expect(restDays.length).toBe(3);
  });
  it('introduces an LT1 session in the second week', () => {
    const block = generateComebackPlan({ comebackStartDate: new Date('2026-01-01'), today: new Date('2026-01-01') });
    const lt1 = block.weeks[1].workouts.find((w) => w.type === 'lt1_threshold');
    expect(lt1).toBeDefined();
    expect(lt1?.title).toContain('5×600');
  });
  it('first day is walk/run alternation, not full running', () => {
    const block = generateComebackPlan({ comebackStartDate: new Date('2026-01-01'), today: new Date('2026-01-01') });
    const first = block.weeks[0].workouts[0];
    expect(first.title.toLowerCase()).toContain('marche/course');
    expect(first.totalDurationSeconds).toBeLessThanOrEqual(30 * 60);
  });
});

describe('Comeback protocol length scales with injury duration', () => {
  it('< 1 week injury → 7-day protocol', () => {
    expect(comebackProtocolDays(3)).toBe(7);
    expect(comebackProtocolDays(6)).toBe(7);
  });
  it('1-3 week injury → 14-day protocol', () => {
    expect(comebackProtocolDays(7)).toBe(14);
    expect(comebackProtocolDays(20)).toBe(14);
  });
  it('3-8 week injury → 21-day protocol', () => {
    expect(comebackProtocolDays(21)).toBe(21);
    expect(comebackProtocolDays(45)).toBe(21);
  });
  it('> 2 month injury → 28-day protocol', () => {
    expect(comebackProtocolDays(60)).toBe(28);
    expect(comebackProtocolDays(120)).toBe(28);
  });
  it('comebackSchedule has 4 distinct phase boundaries for each length', () => {
    for (const total of [7, 14, 21, 28]) {
      const s = comebackSchedule(total);
      expect(s.totalDays).toBe(total);
      expect(s.phase1End).toBeLessThan(s.phase2End);
      expect(s.phase2End).toBeLessThan(s.phase3End);
      expect(s.phase3End).toBeLessThan(s.totalDays);
      expect(s.lt1DayIndex).toBeGreaterThanOrEqual(s.phase3End);
      expect(s.lt1DayIndex).toBeLessThan(s.totalDays);
    }
  });
  it('21-day protocol exposes all 4 phases', () => {
    const startDate = new Date('2026-01-01');
    const phases = new Set<number>();
    for (let d = 0; d < 21; d++) {
      const today = new Date('2026-01-01');
      today.setDate(today.getDate() + d);
      const p = comebackPhase({ startDate, today }, 21);
      if (p) phases.add(p.index);
    }
    expect(phases.size).toBe(4);
  });
  it('generateComebackPlan emits the requested number of days', () => {
    const block7 = generateComebackPlan({ comebackStartDate: new Date('2026-01-01'), today: new Date('2026-01-01'), totalDays: 7 });
    const block28 = generateComebackPlan({ comebackStartDate: new Date('2026-01-01'), today: new Date('2026-01-01'), totalDays: 28 });
    const total7 = block7.weeks.reduce((s, w) => s + w.workouts.length, 0);
    const total28 = block28.weeks.reduce((s, w) => s + w.workouts.length, 0);
    expect(total7).toBe(7);
    expect(total28).toBe(28);
  });
  it('long protocols still include exactly one LT1 session at the end', () => {
    const block = generateComebackPlan({ comebackStartDate: new Date('2026-01-01'), today: new Date('2026-01-01'), totalDays: 28 });
    const lt1Sessions = block.weeks.flatMap((w) => w.workouts).filter((w) => w.type === 'lt1_threshold');
    expect(lt1Sessions).toHaveLength(1);
    expect(lt1Sessions[0].title).toContain('5×600');
  });
});

describe('Post-break ramp scales with break duration', () => {
  it('< 1 week break → 2-week ramp', () => {
    expect(postBreakRampWeeks(3)).toBe(2);
    expect(postBreakRampWeeks(6)).toBe(2);
  });
  it('1-3 week break → 4-week ramp', () => {
    expect(postBreakRampWeeks(7)).toBe(4);
    expect(postBreakRampWeeks(20)).toBe(4);
  });
  it('3-6 week break → 6-week ramp', () => {
    expect(postBreakRampWeeks(21)).toBe(6);
    expect(postBreakRampWeeks(40)).toBe(6);
  });
  it('> 6 week break → 8-week ramp', () => {
    expect(postBreakRampWeeks(42)).toBe(8);
    expect(postBreakRampWeeks(90)).toBe(8);
  });
  it('short break restarts higher than a long break', () => {
    const shortStart = postBreakWeeklyKmCap(100, 0, 5);   // 5-day break
    const longStart = postBreakWeeklyKmCap(100, 0, 60);   // 2-month break
    expect(shortStart).toBeGreaterThan(longStart);
    expect(shortStart).toBeGreaterThanOrEqual(70);
    expect(longStart).toBeLessThanOrEqual(40);
  });
  it('volume monotonically climbs back toward pre-break', () => {
    for (const breakDays of [5, 14, 30, 60]) {
      const rampWeeks = postBreakRampWeeks(breakDays);
      let prev = -1;
      for (let w = 0; w < rampWeeks; w++) {
        const km = postBreakWeeklyKmCap(100, w, breakDays);
        expect(km).toBeGreaterThan(prev);
        prev = km;
      }
      expect(postBreakWeeklyKmCap(100, rampWeeks, breakDays)).toBe(100);
    }
  });
});

describe('Variant progressivity by phase', () => {
  it('base phase picks earliest variants', () => {
    expect(variantOffsetForPhase('base')).toBe(0);
  });
  it('specific phase picks longer / more race-like variants', () => {
    expect(variantOffsetForPhase('specific')).toBeGreaterThan(variantOffsetForPhase('base'));
  });
  it('taper picks light familiar variants', () => {
    expect(variantOffsetForPhase('taper')).toBe(0);
  });
});
