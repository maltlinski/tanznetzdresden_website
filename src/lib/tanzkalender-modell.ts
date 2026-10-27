/**
 * Tanzkalender (/termine/, Entwurf design/entwuerfe/2026-10-kalender/): Termine, KEEP UP-Trainings und Fristen
 * aus Ausschreibungen als eine Liste. Filter, Wochen-Bündel des Profitrainings, Monate und Kalenderdatei.
 * Gemeinsam für den Build (src/lib/tanzkalender.ts) und den Browser (src/scripts/tanzkalender.ts):
 * keine Astro-Importe.
 */
import { escapeIcs, foldIcs, VTIMEZONE } from './ics-text';

export const KATEGORIEN = ['Bühne', 'Training', 'Diskurs', 'Frist'] as const;
export type Kat = (typeof KATEGORIEN)[number];
/** Filter oben in der Leiste (Fristen stehen nur unter „Alle“) */
export const FILTER = ['Bühne', 'Training', 'Diskurs'] as const;

export interface KTermin {
  /** eindeutig; zugleich UID in der Kalenderdatei (wie im Abo /termine.ics) */
  id: string;
  /** JJJJ-MM-TT */
  datum: string;
  /** „19:30“, leer bei Fristen */
  von: string;
  bis: string;
  /** Anzeige der Uhrzeit: „19:30–21:30“ oder eigene Angabe; leer bei Fristen */
  zeit: string;
  titel: string;
  /** Dozent:in (KEEP UP) */
  wer: string;
  ort: string;
  adresse: string;
  /** Route zum Ort (Karten-Link), leer ohne bekannten Ort */
  route: string;
  kat: Kat;
  /** Anzeigename der Kategorie (Badge), z. B. „Bühne“, „Workshop“ */
  badge: string;
  text: string;
  eintritt: string;
  link: string;
  linkText: string;
  /** KEEP UP-Profitraining: unter „Alle“ zu einer Zeile je Woche gebündelt */
  training: boolean;
}

/** Zeile der Liste: ein Termin oder eine Trainingswoche (`sitzungen`) */
export type Zeile = KTermin & { sitzungen?: KTermin[] };

export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss');

/** passt zu Filter und Suche (Titel, Name, Ort, Text) */
export function passt(e: KTermin, kat: string, suche: string): boolean {
  if (kat && e.kat !== kat) return false;
  const q = norm(suche.trim());
  return !q || norm(`${e.titel} ${e.wer} ${e.ort} ${e.text}`).includes(q);
}

const sortKey = (e: KTermin) => `${e.datum} ${e.von || '99'}`;
export const nachZeit = (a: KTermin, b: KTermin) => sortKey(a).localeCompare(sortKey(b));

const utc = (d: string) => new Date(`${d}T00:00:00Z`);
export const plusTage = (d: string, n: number) => {
  const x = utc(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
export const montag = (d: string) => plusTage(d, -((utc(d).getUTCDay() + 6) % 7));

/** Profitraining einer Woche zu einer Zeile zusammenfassen (am ersten Trainingstag) */
export function buendeln(list: KTermin[]): Zeile[] {
  const wochen = new Map<string, KTermin[]>();
  const rest: Zeile[] = [];
  for (const e of list) {
    if (!e.training) rest.push(e);
    else {
      const w = montag(e.datum);
      wochen.set(w, [...(wochen.get(w) ?? []), e]);
    }
  }
  for (const [w, s] of wochen) {
    const wer = [...new Set(s.map((x) => x.wer).filter(Boolean))].join(', ');
    rest.push({ ...s[0], id: `woche-${w}`, wer, sitzungen: s });
  }
  return rest.sort(nachZeit);
}

export interface Tag {
  datum: string;
  zeilen: Zeile[];
}
export interface Monat {
  /** JJJJ-MM */
  key: string;
  tage: Tag[];
  anzahl: number;
}

/** Nach Monat und Tag gruppieren; `heute` bekommt einen eigenen (leeren) Tag, wenn dort nichts ist */
export function monate(zeilen: Zeile[], heute?: string): Monat[] {
  const list = heute && !zeilen.some((z) => z.datum === heute) ? [...zeilen, null] : zeilen;
  const tage = new Map<string, Zeile[]>();
  for (const z of list) {
    const d = z ? z.datum : heute!;
    if (!tage.has(d)) tage.set(d, []);
    if (z) tage.get(d)!.push(z);
  }
  const out: Monat[] = [];
  for (const d of [...tage.keys()].sort()) {
    const key = d.slice(0, 7);
    let m = out[out.length - 1];
    if (!m || m.key !== key) out.push((m = { key, tage: [], anzahl: 0 }));
    m.tage.push({ datum: d, zeilen: tage.get(d)! });
    m.anzahl += tage.get(d)!.length;
  }
  return out;
}

/** Felder eines Monatsrasters, Montag zuerst, volle Wochen (auch Tage der Nachbarmonate) */
export function raster(key: string): { datum: string; imMonat: boolean }[] {
  const erster = `${key}-01`;
  const [y, m] = key.split('-').map(Number);
  const letzter = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const out = [];
  for (let d = montag(erster); d <= letzter || out.length % 7; d = plusTage(d, 1)) out.push({ datum: d, imMonat: d.startsWith(key) });
  return out;
}

export const monatPlus = (key: string, n: number) => {
  const [y, m] = key.split('-').map(Number);
  const i = y * 12 + (m - 1) + n;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
};

const stempel = (datum: string, zeit: string) => `${datum.replace(/-/g, '')}T${zeit.replace(':', '')}00`;

/** Kalenderdatei (.ics) für einen oder mehrere Termine; `seite` macht relative Links absolut */
export function ics(termine: KTermin[], { seite, host = 'tanznetzdresden.de', jetzt = new Date() }: { seite: string; host?: string; jetzt?: Date }): string {
  const dtstamp = jetzt.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TanzNetzDresden e.V.//Tanzkalender//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...VTIMEZONE];
  for (const e of termine) {
    const zeit = e.von
      ? [`DTSTART;TZID=Europe/Berlin:${stempel(e.datum, e.von)}`, e.bis ? `DTEND;TZID=Europe/Berlin:${stempel(e.datum, e.bis)}` : 'DURATION:PT2H']
      : [`DTSTART;VALUE=DATE:${e.datum.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${plusTage(e.datum, 1).replace(/-/g, '')}`];
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@${host}`,
      `DTSTAMP:${dtstamp}`,
      ...zeit,
      `SUMMARY:${escapeIcs(e.wer ? `${e.titel} · ${e.wer}` : e.titel)}`,
      ...(e.ort ? [`LOCATION:${escapeIcs([e.ort, e.adresse].filter(Boolean).join(', '))}`] : []),
      `DESCRIPTION:${escapeIcs([e.text, e.eintritt].filter(Boolean).join('\n'))}`,
      `CATEGORIES:${escapeIcs(e.kat)}`,
      ...(e.link ? [`URL:${new URL(e.link, seite).href}`] : []),
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldIcs).join('\r\n') + '\r\n';
}
