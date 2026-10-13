/**
 * Ein Kalender für die ganze Website: Monatsraster mit Tagesansicht und Filter
 * (src/components/Kalender.astro). Der Tanzkalender (/termine/) zeigt alle Termine
 * und die KEEP UP-Trainingstage, die Profitrainings-Seite nur das Training.
 */
import { badgeVariant, categoryLabel, getTermine, type Termin } from './content';
import { getKeepUp, todayKey } from './keep-up';
import { dateLocale, loc, tr, url, type Lang } from './i18n';

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

/** Uhrzeit eines Termins: „19:30–21:00“ bzw. die eigene Angabe (timeLabel) */
const terminZeit = (t: Termin, lang: Lang) => {
  const from = t.data.start.split(' ')[1];
  const to = t.data.end?.split(' ')[1];
  return loc(t.data, 'timeLabel', lang)?.replace(/\s*Uhr$/, '') ?? (to ? `${from}–${to}` : from);
};

/** Tanzkalender: alle Termine und die Trainingstage von KEEP UP */
export async function getTanzkalender(lang: Lang) {
  const t = tr(lang, {
    de: { toEvent: 'Zum Termin →', toTraining: 'Zum Profitraining →', training: 'Profitraining' },
    en: { toEvent: 'About the event →', toTraining: 'Professional training →', training: 'Professional training' },
  });
  const days: Tage = {};
  const add = (date: string, e: KalenderEintrag) => (days[date] ??= []).push(e);

  for (const termin of await getTermine()) {
    const cat = termin.data.category;
    const title = loc(termin.data, 'title', lang);
    add(termin.data.start.split(' ')[0], {
      time: terminZeit(termin, lang),
      title,
      sub: [termin.data.venue, loc(termin.data, 'teaser', lang)].join(' · '),
      badge: categoryLabel[lang][cat],
      color: badgeVariant[cat],
      short: title,
      keys: [cat],
      label: `${categoryLabel[lang][cat]}: ${title}`,
      links: [{ href: url(lang, 'termine', `${termin.id}/`), text: t.toEvent }],
    });
  }

  const { trainings } = await getKeepUp(lang);
  for (const e of trainings) {
    add(e.date, {
      time: e.time,
      title: `KEEP UP · ${e.dozentin.name}`,
      sub: [e.dozentin.stil, e.where].join(' · '),
      badge: categoryLabel[lang].Training,
      color: 'cyan',
      short: 'KEEP UP',
      keys: ['Training'],
      label: `${t.training}: ${e.dozentin.name}`,
      links: [{ href: url(lang, 'profitraining', '#kalender'), text: t.toTraining }],
      nebenbei: true,
    });
  }
  return monate(days, lang);
}
