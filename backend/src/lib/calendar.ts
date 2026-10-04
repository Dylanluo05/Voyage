import { TripDoc, ItineraryItemData } from '../models/Trip';

function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0');
}

// Escape text per RFC 5545 §3.3.11 — backslash, semicolon, comma, and newline.
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// Floating local time (no trailing Z, no TZID) — deliberate: a 9am activity
// should read as 9am regardless of the viewer's own timezone.
function formatIcsDateTime(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00`
  );
}

function formatIcsDate(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
}

// DTSTAMP is a real instant (when this file was generated) — genuinely UTC.
function formatIcsTimestamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function dayToDate(startDate: Date, day: number): Date {
  const d = new Date(startDate);
  d.setUTCDate(d.getUTCDate() + (day - 1));
  return d;
}

function applyTime(date: Date, time: string): Date {
  const [hh, mm] = time.split(':').map(Number);
  const d = new Date(date);
  d.setUTCHours(hh, mm, 0, 0);
  return d;
}

export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[^a-zA-Z0-9 \-_]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return cleaned || 'trip';
}

export function buildTripIcs(trip: TripDoc): string {
  const now = new Date();
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Voyage//Trip Export//EN',
    'CALSCALE:GREGORIAN',
  ];

  const items = (trip.items as ItineraryItemData[])
    .slice()
    .sort((a, b) => a.day - b.day || a.position - b.position);

  for (const item of items) {
    const dayDate = dayToDate(trip.startDate, item.day);
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${(item._id ?? now.getTime()).toString()}@voyage.app`);
    lines.push(`DTSTAMP:${formatIcsTimestamp(now)}`);

    if (item.startTime) {
      const start = applyTime(dayDate, item.startTime);
      const end = item.endTime ? applyTime(dayDate, item.endTime) : new Date(start.getTime() + 60 * 60 * 1000);
      lines.push(`DTSTART:${formatIcsDateTime(start)}`);
      lines.push(`DTEND:${formatIcsDateTime(end)}`);
    } else {
      const nextDay = new Date(dayDate);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(dayDate)}`);
      lines.push(`DTEND;VALUE=DATE:${formatIcsDate(nextDay)}`);
    }

    lines.push(`SUMMARY:${escapeIcsText(item.title)}`);
    if (item.notes) lines.push(`DESCRIPTION:${escapeIcsText(item.notes)}`);
    const locationText = [item.location?.name, item.location?.address].filter(Boolean).join(', ');
    if (locationText) lines.push(`LOCATION:${escapeIcsText(locationText)}`);

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
