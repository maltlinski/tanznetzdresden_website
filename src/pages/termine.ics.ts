/**
 * Kalender-Feed (iCalendar, RFC 5545). Abonnierbar unter /termine.ics –
 * Kalender-Apps holen sich neue Termine dann automatisch.
 */
import type { APIRoute } from 'astro';
import { getTermine } from '../lib/content';
import { parseLocal } from '../lib/dates';
import { verein } from '../lib/settings';

const pad = (n: number) => String(n).padStart(2, '0');
const local = (s: string) => {
  const p = parseLocal(s);
  return `${p.y}${pad(p.m)}${pad(p.d)}T${pad(p.hh)}${pad(p.mm)}00`;
};
const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
/** Zeilen über 75 Oktette falten (RFC 5545 §3.1) */
const fold = (line: string) => {
  const out: string[] = [];
  let cur = '';
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch) > 74) {
      out.push(cur);
      cur = ' ';
    }
    cur += ch;
  }
  out.push(cur);
  return out.join('\r\n');
};

const VTIMEZONE = [
  'BEGIN:VTIMEZONE', 'TZID:Europe/Berlin',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE',
];

export const GET: APIRoute = async ({ site }) => {
  const host = site ? new URL(site).host : 'tanznetzdresden.de';
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const termine = await getTermine();
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${verein.legalName}//Tanzkalender//DE`, 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${escape(`${verein.name} · Tanzkalender`)}`, 'X-WR-TIMEZONE:Europe/Berlin', 'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    ...VTIMEZONE,
  ];
  for (const t of termine) {
    const d = t.data;
    // Ohne Endzeit: 2 Stunden als Standarddauer
    const end = d.end ? local(d.end) : null;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${t.id}@${host}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Berlin:${local(d.start)}`,
      end ? `DTEND;TZID=Europe/Berlin:${end}` : 'DURATION:PT2H',
      `SUMMARY:${escape(d.title)}`,
      `LOCATION:${escape(d.venue)}`,
      `DESCRIPTION:${escape(d.teaser)}`,
      `CATEGORIES:${escape(d.category)}`,
      ...(d.link ? [`URL:${d.link}`] : []),
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return new Response(lines.map(fold).join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
};
