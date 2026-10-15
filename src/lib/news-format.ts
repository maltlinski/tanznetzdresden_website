/**
 * Anzeige-Helfer für News (Kategorien, Datum, Fristen) – ohne Build-Abhängigkeiten,
 * damit auch die Vorschau im Browser (src/pages/intern/news/vorschau/) sie nutzen kann.
 */
import type { Lang } from './i18n';
import type { newsCategories } from '../content.config';

export type NewsCategory = (typeof newsCategories)[number];

export const newsCategoryLabel: Record<Lang, Record<NewsCategory | 'Alle', string>> = {
  de: { Alle: 'Alle', Netzwerk: 'Netzwerk', Ausschreibung: 'Ausschreibung', Training: 'Training', Verein: 'Verein', Rückblick: 'Rückblick', Stimme: 'Stimme' },
  en: { Alle: 'All', Netzwerk: 'Network', Ausschreibung: 'Open call', Training: 'Training', Verein: 'Association', Rückblick: 'Review', Stimme: 'Voices' },
};

export const newsBadge: Record<NewsCategory, 'purple' | 'magenta' | 'cyan'> = {
  Netzwerk: 'purple', Ausschreibung: 'magenta', Training: 'cyan', Verein: 'purple', Rückblick: 'cyan', Stimme: 'magenta',
};
/** Auf Lila ist ein lila Badge unsichtbar – dort Cyan. */
export const newsBadgeOnDark = (c: NewsCategory) => (newsBadge[c] === 'purple' ? 'cyan' : newsBadge[c]);

const MONTHS: Record<Lang, string[]> = {
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const MON: Record<Lang, string[]> = {
  de: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
const ymd = (iso: string) => iso.split('-').map(Number) as [number, number, number];
const pad = (n: number) => String(n).padStart(2, '0');

/** 01. Oktober 2026 / 1 October 2026 */
export function dateLong(iso: string, lang: Lang) {
  const [y, m, d] = ymd(iso);
  return lang === 'de' ? `${pad(d)}. ${MONTHS.de[m - 1]} ${y}` : `${d} ${MONTHS.en[m - 1]} ${y}`;
}
/** 01. Okt 2026 / 1 Oct 2026 */
export function dateShort(iso: string, lang: Lang) {
  const [y, m, d] = ymd(iso);
  return lang === 'de' ? `${pad(d)}. ${MON.de[m - 1]} ${y}` : `${d} ${MON.en[m - 1]} ${y}`;
}
export const monthShort = (iso: string, lang: Lang) => MON[lang][ymd(iso)[1] - 1];
export const monthLong = (iso: string, lang: Lang) => `${MONTHS[lang][ymd(iso)[1] - 1]} ${ymd(iso)[0]}`;

/** Ganze Tage bis zum Ende des Fristtages (Ortszeit); negativ = abgelaufen. */
export function daysLeft(deadline: string, now = new Date()) {
  const [y, m, d] = ymd(deadline);
  return Math.ceil((new Date(y, m - 1, d, 23, 59, 59).getTime() - now.getTime()) / 864e5);
}

export { deadlineText } from './deadline-text';

export const nrLabel = (n: number) => `Nº ${pad(n)}`;
