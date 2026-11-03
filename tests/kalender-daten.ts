/**
 * Erwartungen für die Kalender-Tests aus der gebauten Website lesen (wie tests/news-daten.ts für die News).
 *
 * Der Profitraining-Kalender zeigt nur Monate ab dem Monat des Builds; Termine, die beim Build schon vorbei
 * sind, fallen weg. Tests mit festem Datum schlagen deshalb fehl, sobald später gebaut wird. Diese Helfer
 * lesen die Trainingstage und Profile mit Terminen aus `dist/`, die Tests stellen die Uhr auf einen dieser Tage.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';

export interface KcalTag {
  datum: string;
  keys: string[];
  label: string;
}

const entities = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/** Tage mit Einträgen im Kalender einer gebauten Seite (Standard: Profitraining) */
export function kcalTage(datei = 'dist/profitraining/index.html'): KcalTag[] {
  if (!existsSync(datei)) return [];
  const html = readFileSync(datei, 'utf8');
  return [...html.matchAll(/<button[^>]*class="kcal__cell kcal__day"[^>]*>/g)].map((m) => {
    const attr = (n: string) => entities(m[0].match(new RegExp(`${n}="([^"]*)"`))?.[1] ?? '');
    return { datum: attr('data-date'), keys: attr('data-keys').split(' ').filter(Boolean), label: attr('aria-label') };
  });
}

/** Trainingstage (KEEP UP mit Dozent:in), aufsteigend */
export const trainingstage = (datei?: string) => kcalTage(datei).filter((t) => /: (Training mit|Training with) /.test(t.label) && t.keys.length);

/** Name der Dozent:in aus der Beschriftung eines Trainingstags */
export const dozentin = (t: KcalTag) => t.label.match(/(?:Training mit|Training with) ([^:;]+)/)?.[1].trim() ?? '';

export const plusTage = (datum: string, n: number) => new Date(Date.parse(`${datum}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

const fmt = (locale: string, o: Intl.DateTimeFormatOptions) => (datum: string) => new Intl.DateTimeFormat(locale, { ...o, timeZone: 'UTC' }).format(new Date(`${datum}T00:00:00Z`));
/** „November 2026“ bzw. „November 2026“ (en) */
export const monatLabel = (datum: string, locale = 'de-DE') => fmt(locale, { month: 'long', year: 'numeric' })(datum);
/** „19. Oktober“, wie im Kopf der Tagesansicht */
export const tagLabel = (datum: string) => `${Number(datum.slice(8))}. ${fmt('de-DE', { month: 'long' })(datum)}`;

/** Profile, die beim Build kommende Termine haben (Abschnitt „Nächste Termine“) */
export function profileMitTerminen(): string[] {
  const ordner = 'dist/netzwerk';
  if (!existsSync(ordner)) return [];
  return readdirSync(ordner).filter((slug) => {
    const datei = `${ordner}/${slug}/index.html`;
    return existsSync(datei) && /class="event[ "]/.test(readFileSync(datei, 'utf8'));
  });
}
