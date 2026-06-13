// Pure scheduling logic for the evening reminder cron.
//
// The cron runs hourly (UTC). For each opted-in runner it must decide:
//   - is it currently their chosen local hour?
//   - have we already pushed today (in their local day)?
// Keeping this pure makes it unit-testable without a database or clock.

export interface NotifyPrefs {
  notifyEveningFeedback: boolean;
  notifyHour: number; // 0-23, runner's local hour
  timezone: string; // IANA, e.g. 'Europe/Paris'
  lastEveningNotifyOn: string | null; // 'yyyy-mm-dd' in local time, or null
}

export interface LocalMoment {
  hour: number; // 0-23
  date: string; // 'yyyy-mm-dd'
}

/**
 * Convert a UTC instant to the wall-clock hour + calendar date in an IANA
 * timezone. Falls back to UTC if the timezone string is invalid so a bad
 * profile value can never throw inside the cron loop.
 */
export function localMoment(nowUtc: Date, timezone: string): LocalMoment {
  let tz = timezone;
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = formatParts(nowUtc, tz);
  } catch {
    tz = 'UTC';
    parts = formatParts(nowUtc, tz);
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    hour: Number(get('hour')),
    date: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

function formatParts(d: Date, timeZone: string): Intl.DateTimeFormatPart[] {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
  }).formatToParts(d);
}

/**
 * Decide whether to send the evening reminder right now.
 * Returns the local date to record on success, or null to skip.
 */
export function eveningReminderDecision(prefs: NotifyPrefs, nowUtc: Date): { send: boolean; localDate: string } {
  const { hour, date } = localMoment(nowUtc, prefs.timezone);
  if (!prefs.notifyEveningFeedback) return { send: false, localDate: date };
  // hour-windowed: the cron is hourly, so fire when the local hour matches.
  if (hour !== clampHour(prefs.notifyHour)) return { send: false, localDate: date };
  // already sent in this local day → skip (prevents duplicates if the cron
  // is retried or runs slightly off the hour boundary).
  if (prefs.lastEveningNotifyOn === date) return { send: false, localDate: date };
  return { send: true, localDate: date };
}

function clampHour(h: number): number {
  if (!Number.isFinite(h)) return 20;
  return Math.min(23, Math.max(0, Math.round(h)));
}
