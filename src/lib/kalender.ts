/**
 * Monatsraster mit Tagesansicht und Filter (src/components/Kalender.astro) für die Profitrainings-Seite.
 * Der Tanzkalender (/termine/) hat eine eigene Darstellung: src/lib/tanzkalender.ts.
 */
import { todayKey } from './keep-up';
import { dateLocale, type Lang } from './i18n';

export type Farbe = 'cyan' | 'magenta' | 'purple';

export interface KalenderEintrag {
  /** „10:00–11:30“ */
  time: string;
  /** groß in der Tagesansicht: Name bzw. Titel */
  title: string;
  /** darunter: Stil, Ort, Kurztext */
  sub: string;
  badge: string;
  color: Farbe;
  /** kurz in der Zelle des Rasters */
  short: string;
  /** Schlüssel für die Filter-Chips (Kategorie bzw. Dozent:in) */
  keys: string[];
  /** für Screenreader in der Zelle */
  label: string;
  links: { href: string; text: string }[];
  /** läuft nebenher (Training im Tanzkalender): in der Zelle steht dann der andere Eintrag */
  nebenbei?: boolean;
  /** KEEP UP: Ort (oben neben der Uhrzeit) */
  ort?: string;
  /** KEEP UP: „Name · Stil“ über dem Titel */
  wer?: string;
  /** KEEP UP: Beschreibung der Dozent:in (Intern → KEEP UP); ohne Titel steht der Name da, ggf. mit Hinweis `folgt` */
  beschreibung?: Beschreibung;
}

export interface Beschreibung {
  titel: string;
  kurz: string;
  absaetze: string[];
  schwerpunkte: string[];
  mitbringen: string;
  bild?: { src: string; alt: string };
  /** „Die Beschreibung zu diesem Training folgt.“ (leer = kein Hinweis) */
  folgt: string;
  /** Beschriftung „Mitbringen“ */
  bringLabel: string;
}

export type Tage = Record<string, KalenderEintrag[]>;

export interface KalenderTag {
  date: string;
  day: number;
  items: KalenderEintrag[];
}

export interface Monat {
  key: string;
  label: string;
  /** Montag zuerst; null = Feld vor dem 1. bzw. nach dem Monatsende */
  cells: (KalenderTag | null)[];
}

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** Monatsraster vom Monat des Builds (bzw. dem ersten Eintrag danach) bis zum letzten Eintrag */
export function monate(days: Tage, lang: Lang): { days: Tage; months: Monat[] } {
  const ab = `${todayKey().slice(0, 7)}-01`;
  const keys = Object.keys(days).filter((k) => k >= ab).sort();
  const months: Monat[] = [];
  if (keys.length) {
    const monthFmt = new Intl.DateTimeFormat(dateLocale[lang], { month: 'long', year: 'numeric', timeZone: 'UTC' });
    let [y, m] = keys[0].split('-').map(Number);
    const [ly, lm] = keys[keys.length - 1].split('-').map(Number);
    while (y < ly || (y === ly && m <= lm)) {
      const key = `${y}-${String(m).padStart(2, '0')}`;
      const first = utc(`${key}-01`);
      const cells: (KalenderTag | null)[] = Array((first.getUTCDay() + 6) % 7).fill(null);
      const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
      for (let d = 1; d <= count; d++) {
        const date = `${key}-${String(d).padStart(2, '0')}`;
        cells.push({ date, day: d, items: days[date] ?? [] });
      }
      while (cells.length % 7) cells.push(null);
      months.push({ key, label: monthFmt.format(first), cells });
      if (++m > 12) { m = 1; y++; }
    }
  }
  for (const list of Object.values(days)) list.sort((a, b) => a.time.localeCompare(b.time));
  return { days: Object.fromEntries(keys.map((k) => [k, days[k]])), months };
}
