import { describe, expect, it } from 'vitest';
import { eveningReminderDecision, localMoment, type NotifyPrefs } from './schedule';

const base: NotifyPrefs = {
  notifyEveningFeedback: true,
  notifyHour: 20,
  timezone: 'Europe/Paris',
  lastEveningNotifyOn: null,
};

describe('localMoment', () => {
  it('converts a UTC instant to local wall-clock hour and date', () => {
    // 2026-06-13 18:30 UTC → Europe/Paris is UTC+2 in summer → 20:30 local
    const m = localMoment(new Date('2026-06-13T18:30:00Z'), 'Europe/Paris');
    expect(m.hour).toBe(20);
    expect(m.date).toBe('2026-06-13');
  });

  it('rolls the local date over at midnight in the target zone', () => {
    // 2026-06-13 23:30 UTC → Tokyo (UTC+9) is already 08:30 next day
    const m = localMoment(new Date('2026-06-13T23:30:00Z'), 'Asia/Tokyo');
    expect(m.date).toBe('2026-06-14');
    expect(m.hour).toBe(8);
  });

  it('falls back to UTC for an invalid timezone instead of throwing', () => {
    const m = localMoment(new Date('2026-06-13T18:30:00Z'), 'Not/AZone');
    expect(m.hour).toBe(18);
    expect(m.date).toBe('2026-06-13');
  });
});

describe('eveningReminderDecision', () => {
  it('sends at the runner local hour when enabled and not yet sent today', () => {
    const d = eveningReminderDecision(base, new Date('2026-06-13T18:00:00Z')); // 20:00 Paris
    expect(d.send).toBe(true);
    expect(d.localDate).toBe('2026-06-13');
  });

  it('does not send outside the chosen hour', () => {
    const d = eveningReminderDecision(base, new Date('2026-06-13T17:00:00Z')); // 19:00 Paris
    expect(d.send).toBe(false);
  });

  it('does not send when the runner disabled evening feedback', () => {
    const d = eveningReminderDecision({ ...base, notifyEveningFeedback: false }, new Date('2026-06-13T18:00:00Z'));
    expect(d.send).toBe(false);
  });

  it('does not double-send within the same local day', () => {
    const d = eveningReminderDecision({ ...base, lastEveningNotifyOn: '2026-06-13' }, new Date('2026-06-13T18:00:00Z'));
    expect(d.send).toBe(false);
  });

  it('sends again the next local day', () => {
    const d = eveningReminderDecision({ ...base, lastEveningNotifyOn: '2026-06-12' }, new Date('2026-06-13T18:00:00Z'));
    expect(d.send).toBe(true);
  });

  it('respects a custom local hour and timezone', () => {
    const prefs: NotifyPrefs = { ...base, notifyHour: 7, timezone: 'America/New_York' };
    // 11:00 UTC → 07:00 New York (EDT, UTC-4)
    expect(eveningReminderDecision(prefs, new Date('2026-06-13T11:00:00Z')).send).toBe(true);
    expect(eveningReminderDecision(prefs, new Date('2026-06-13T12:00:00Z')).send).toBe(false);
  });

  it('clamps an out-of-range notifyHour to a safe value (defaults to 20)', () => {
    const prefs: NotifyPrefs = { ...base, notifyHour: 99 };
    // clamped to 23 → 21:00 UTC is 23:00 Paris
    expect(eveningReminderDecision(prefs, new Date('2026-06-13T21:00:00Z')).send).toBe(true);
  });
});
