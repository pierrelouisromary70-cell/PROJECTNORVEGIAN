import { describe, expect, it } from 'vitest';
import {
  capLongRunByTime,
  comebackDayIndex,
  comebackPhase,
  marathonLongRunKm,
  midLongRunKm,
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
