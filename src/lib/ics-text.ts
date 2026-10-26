/**
 * Bausteine für iCalendar-Dateien (RFC 5545), gemeinsam für die Kalender-Abos (src/lib/ics.ts) und die
 * Fristen der Open Calls im Browser (src/lib/open-calls.ts). Ohne Imports, läuft im Build und im Browser.
 */

export const escapeIcs = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

const bytes = new TextEncoder();
/** Zeilen über 75 Oktette falten (RFC 5545 §3.1) */
export const foldIcs = (line: string) => {
  const out: string[] = [];
  let cur = '';
  for (const ch of line) {
    if (bytes.encode(cur + ch).length > 74) {
      out.push(cur);
      cur = ' ';
    }
    cur += ch;
  }
  out.push(cur);
  return out.join('\r\n');
};

export const VTIMEZONE = [
  'BEGIN:VTIMEZONE', 'TZID:Europe/Berlin',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE',
];
