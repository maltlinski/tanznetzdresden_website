/**
 * iCalendar (RFC 5545) für Termine: die abonnierbaren Kalender (/termine.ics, nur KEEP UP: /profitraining.ics)
 * und je Termin eine Datei zum Eintragen (/termine/<id>.ics). Google Kalender kann die Abos per Adresse
 * einbinden („Andere Kalender → Per URL“), siehe docs/keep-up.md.
 */
import type { Termin } from './content';
import type { Training } from './keep-up';
import { parseLocal } from './dates';
import { verein } from './settings';
import { escapeIcs as escape, foldIcs as fold, VTIMEZONE } from './ics-text';

const pad = (n: number) => String(n).padStart(2, '0');
const local = (s: string) => {
  const p = parseLocal(s);
  return `${p.y}${pad(p.m)}${pad(p.d)}T${pad(p.hh)}${pad(p.mm)}00`;
};

interface Options {
  site?: URL;
  /** Adresse der Terminseite je Termin (für URL im Kalendereintrag) */
  pageUrl?: (t: Termin) => string;
  /** true: abonnierbarer Kalender mit Namen und Aktualisierungsintervall */
  feed?: boolean;
  /** KEEP UP-Trainingstage (nur im abonnierbaren Kalender) */
  trainings?: Training[];
  /** Adresse der Profitrainings-Seite */
  trainingUrl?: string;
  /** Name des abonnierten Kalenders (Standard: Tanzkalender) */
  name?: string;
}

export function icsResponse(termine: Termin[], { site, pageUrl, feed = false, trainings = [], trainingUrl, name = 'Tanzkalender' }: Options): Response {
  const host = site ? new URL(site).host : 'tanznetzdresden.de';
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${verein.legalName}//Tanzkalender//DE`, 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    ...(feed ? [`X-WR-CALNAME:${escape(`${verein.name} · ${name}`)}`, 'X-WR-TIMEZONE:Europe/Berlin', 'REFRESH-INTERVAL;VALUE=DURATION:PT12H'] : []),
    ...VTIMEZONE,
  ];
  for (const t of termine) {
    const d = t.data;
    const page = pageUrl && site ? new URL(pageUrl(t), site).href : undefined;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${t.id}@${host}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Berlin:${local(d.start)}`,
      // Ohne Endzeit: 2 Stunden als Standarddauer
      d.end ? `DTEND;TZID=Europe/Berlin:${local(d.end)}` : 'DURATION:PT2H',
      `SUMMARY:${escape(d.title)}`,
      `LOCATION:${escape(d.venue)}`,
      `DESCRIPTION:${escape(d.teaser)}`,
      `CATEGORIES:${escape(d.category)}`,
      ...(page || d.link ? [`URL:${page ?? d.link}`] : []),
      'END:VEVENT',
    );
  }
  for (const e of trainings) {
    const [from, to] = e.time.split('–');
    const page = trainingUrl && site ? new URL(trainingUrl, site).href : undefined;
    lines.push(
      'BEGIN:VEVENT',
      `UID:keep-up-${e.date}-${from.replace(':', '')}@${host}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Berlin:${local(`${e.date} ${from}`)}`,
      `DTEND;TZID=Europe/Berlin:${local(`${e.date} ${to}`)}`,
      `SUMMARY:${escape(`KEEP UP · ${e.art === 'workshop' ? 'Workshop' : 'Profitraining'} mit ${e.dozentin.name}${e.titel ? `: ${e.titel}` : ''}`)}`,
      `LOCATION:${escape(e.where)}`,
      `DESCRIPTION:${escape(e.kurz ?? e.dozentin.stil)}`,
      'CATEGORIES:Training',
      ...(page ? [`URL:${page}`] : []),
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return new Response(lines.map(fold).join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
}
