/** "2026-10-08T21:30" -> "Oct 8, 9:30 PM"; a plain "2026-10-09" -> "Oct 9". Falls back to the raw string. */
export function fmtWhen(raw?: string): string {
  if (!raw) return '';
  const hasTime = raw.includes('T');
  const d = new Date(hasTime ? raw : `${raw}T00:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (!hasTime) return date;
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date}, ${time}`;
}
