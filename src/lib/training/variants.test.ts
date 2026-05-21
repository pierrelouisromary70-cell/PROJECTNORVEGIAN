import { describe, expect, it } from 'vitest';
import { generatePlan } from './plan-generator';
import {
  HILL_VARIANTS,
  LT1_AM_VARIANTS,
  LT1_PM_VARIANTS,
  LT2_VARIANTS,
  SPEED_VARIANTS,
  VO2_VARIANTS,
} from './variants';
import { buildSingleThreshold, buildVo2Max, buildHills, buildLt1AM, buildLt1PM } from './workouts';
import type { RunnerProfile } from './types';

const intermediate: RunnerProfile = {
  experienceYears: 3,
  currentWeeklyKm: 80,
  daysPerWeek: 6,
  hasDoneIntervals: true,
  goal: 'perform',
  vdot: 50,
  sex: 'male',
  trackCycle: false,
};

describe('Session variants — diversity', () => {
  it('LT2 has at least 5 distinct structures', () => {
    const labels = new Set(LT2_VARIANTS.map((v) => v.label));
    expect(labels.size).toBeGreaterThanOrEqual(5);
  });
  it('LT2 variants include pyramid AND continuous tempo', () => {
    const labels = LT2_VARIANTS.map((v) => v.label.toLowerCase()).join(' ');
    expect(labels).toContain('pyramide');
    expect(labels).toContain('tempo continu');
  });
  it('LT2 and VO2max each have at least 4 distinct structures', () => {
    expect(LT2_VARIANTS.length).toBeGreaterThanOrEqual(4);
    expect(VO2_VARIANTS.length).toBeGreaterThanOrEqual(4);
  });
  it('Hills include short, long AND fartlek variants', () => {
    const labels = HILL_VARIANTS.map((v) => v.label.toLowerCase()).join(' ');
    expect(labels).toContain('courtes');
    expect(labels).toContain('longues');
    expect(labels).toContain('fartlek');
  });
  it('Every variant carries feel hint AND approach tips', () => {
    const all = [
      ...LT2_VARIANTS,
      ...LT1_AM_VARIANTS,
      ...LT1_PM_VARIANTS,
      ...VO2_VARIANTS,
      ...HILL_VARIANTS,
      ...SPEED_VARIANTS,
    ];
    for (const v of all) {
      expect(v.feelHint.length).toBeGreaterThan(10);
      expect(v.approachTips.length).toBeGreaterThan(0);
      expect(v.approachTips.every((t) => t.length > 5)).toBe(true);
    }
  });
});

describe('Session variants — volume scaling', () => {
  it('LT2 reps scale up with weekly volume', () => {
    const variant = LT2_VARIANTS[0];
    const low = variant.workKm(40);
    const high = variant.workKm(120);
    expect(high).toBeGreaterThan(low);
  });
  it('VO2max reps scale up with weekly volume', () => {
    const variant = VO2_VARIANTS[0];
    const low = variant.workKm(40);
    const high = variant.workKm(120);
    expect(high).toBeGreaterThanOrEqual(low);
  });
  it('Hills reps scale up with weekly volume', () => {
    const variant = HILL_VARIANTS[0];
    const low = variant.workKm(40);
    const high = variant.workKm(120);
    expect(high).toBeGreaterThan(low);
  });
});

describe('Variant rotation in workout builders', () => {
  const base = { date: '2026-06-01', weeklyKm: 80, daysPerWeek: 6, index: 1, locale: 'fr' as const };

  it('buildSingleThreshold returns different titles across week indexes', () => {
    const titles = [0, 1, 2, 3, 4].map((w) => buildSingleThreshold({ ...base, weekIndex: w }).title);
    expect(new Set(titles).size).toBeGreaterThanOrEqual(4);
  });

  it('buildVo2Max returns different titles across week indexes', () => {
    const titles = [0, 1, 2, 3].map((w) => buildVo2Max({ ...base, weekIndex: w }).title);
    expect(new Set(titles).size).toBeGreaterThanOrEqual(3);
  });

  it('buildLt1AM returns different titles across week indexes', () => {
    const titles = [0, 1, 2].map((w) => buildLt1AM({ ...base, weekIndex: w }).title);
    expect(new Set(titles).size).toBeGreaterThanOrEqual(2);
  });

  it('buildLt1PM rotates through 3 structures', () => {
    const titles = [0, 1, 2].map((w) => buildLt1PM({ ...base, weekIndex: w }).title);
    expect(new Set(titles).size).toBe(3);
  });

  it('buildHills rotates through short / long / fartlek / ladder', () => {
    const titles = [0, 1, 2, 3].map((w) => buildHills({ ...base, weekIndex: w }).title);
    expect(new Set(titles).size).toBeGreaterThanOrEqual(3);
  });

  it('Every quality session embeds approach tips in its guidance', () => {
    const sessions = [
      buildSingleThreshold({ ...base, weekIndex: 0 }),
      buildSingleThreshold({ ...base, weekIndex: 1 }),
      buildVo2Max({ ...base, weekIndex: 0 }),
      buildLt1AM({ ...base, weekIndex: 0 }),
      buildLt1PM({ ...base, weekIndex: 2 }),
      buildHills({ ...base, weekIndex: 2 }),
    ];
    for (const s of sessions) {
      expect(s.guidance.length).toBeGreaterThanOrEqual(3);
      expect(s.feel.length).toBeGreaterThan(10);
    }
  });

  it('Higher weekly volume → more total threshold work', () => {
    const small = buildSingleThreshold({ ...base, weeklyKm: 40, weekIndex: 0 });
    const big = buildSingleThreshold({ ...base, weeklyKm: 120, weekIndex: 0 });
    expect(big.totalDistanceMeters).toBeGreaterThan(small.totalDistanceMeters);
  });
});

describe('Plan generator — variant rotation across weeks', () => {
  it('A 4-week semi-marathon block uses at least 3 different LT1 AM structures', () => {
    const block = generatePlan({
      profile: intermediate,
      startDate: new Date('2026-06-01'),
      raceDate: new Date('2026-08-01'),
      raceDistanceMeters: 21097,
      racePriority: 'A',
      weeks: 4,
    });
    const titles = block.weeks
      .flatMap((w) => w.workouts)
      .filter((w) => w.type === 'lt1_threshold' && w.amPm === 'AM')
      .map((w) => w.title);
    expect(new Set(titles).size).toBeGreaterThanOrEqual(3);
  });

  it('Across 4 weeks, the plan mixes quality session structures (not 4× the same)', () => {
    const block = generatePlan({
      profile: intermediate,
      startDate: new Date('2026-06-01'),
      raceDate: new Date('2026-08-01'),
      raceDistanceMeters: 21097,
      racePriority: 'A',
      weeks: 4,
    });
    const qualityTitles = block.weeks
      .flatMap((w) => w.workouts)
      .filter((w) => ['lt2_threshold', 'lt1_threshold', 'vo2max', 'hills'].includes(w.type))
      .map((w) => w.title);
    expect(new Set(qualityTitles).size).toBeGreaterThanOrEqual(5);
  });

  it('A long-distance build block occasionally schedules a progressive long run', () => {
    const block = generatePlan({
      profile: intermediate,
      startDate: new Date('2026-06-01'),
      raceDate: new Date('2026-08-01'),
      raceDistanceMeters: 21097,
      racePriority: 'A',
      weeks: 4,
    });
    const longs = block.weeks.flatMap((w) => w.workouts).filter((w) => w.type === 'long');
    const hasProgressive = longs.some((w) => w.title.toLowerCase().includes('progressif'));
    expect(hasProgressive).toBe(true);
  });
});
