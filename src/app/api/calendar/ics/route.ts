import { createClient } from '@/lib/supabase/server';
import type { TrainingBlock, Workout } from '@/lib/training/types';

/**
 * Export the runner's current training block as an .ics file.
 *
 * GET /api/calendar/ics
 * Returns text/calendar so the browser can save the file and Apple Calendar /
 * Google Calendar / Outlook can import it. Each workout becomes an all-day
 * event on its scheduled date.
 */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('unauthorized', { status: 401 });

  const { data: blockRow } = await supabase
    .from('training_blocks')
    .select('*')
    .eq('user_id', user.id)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!blockRow) return new Response('no plan', { status: 404 });
  const block = blockRow.payload as TrainingBlock;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nordic Run//Plan d\'entraînement//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Nordic Run — plan',
    'X-WR-TIMEZONE:Europe/Paris',
  ];

  const stamp = nowStamp();
  for (const week of block.weeks) {
    for (const w of week.workouts) {
      if (w.type === 'rest') continue;
      lines.push(...icsEvent(w, stamp));
    }
  }

  lines.push('END:VCALENDAR');

  return new Response(lines.join('\r\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="nordic-run-${block.startDate}.ics"`,
      'Cache-Control': 'private, no-cache',
    },
  });
}

function icsEvent(w: Workout, stamp: string): string[] {
  const dtstart = w.date.replace(/-/g, '');
  const dtend = addOneDay(dtstart);
  const summary = escapeIcs(w.title);
  const description = escapeIcs(buildDescription(w));
  return [
    'BEGIN:VEVENT',
    `UID:${w.id}@nordic-run`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${dtstart}`,
    `DTEND;VALUE=DATE:${dtend}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
  ];
}

function buildDescription(w: Workout): string {
  const parts = [
    `${(w.totalDistanceMeters / 1000).toFixed(1)} km · ${Math.round(w.totalDurationSeconds / 60)} min · RPE ${w.rpe}/10`,
    '',
    w.purpose,
    '',
    'Ressenti : ' + w.feel,
  ];
  if (w.guidance.length) {
    parts.push('', 'Conseils :');
    for (const g of w.guidance) parts.push(`• ${g}`);
  }
  return parts.join('\n');
}

function escapeIcs(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function nowStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function addOneDay(yyyymmdd: string): string {
  const y = parseInt(yyyymmdd.slice(0, 4), 10);
  const m = parseInt(yyyymmdd.slice(4, 6), 10) - 1;
  const d = parseInt(yyyymmdd.slice(6, 8), 10);
  const dt = new Date(Date.UTC(y, m, d + 1));
  const ny = dt.getUTCFullYear();
  const nm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(dt.getUTCDate()).padStart(2, '0');
  return `${ny}${nm}${nd}`;
}
