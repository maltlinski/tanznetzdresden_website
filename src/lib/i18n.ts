/**
 * Zweisprachigkeit (Deutsch / Englisch).
 *
 * - Deutsch ist Standard und hat kein Präfix: /termine/
 * - Englisch liegt unter /en/ mit englischen Adressen: /en/events/
 * - Texte in Komponenten: tr(lang, { de: {...}, en: {...} }) – beide Sprachen stehen
 *   direkt nebeneinander, fehlende englische Texte fallen auf Deutsch zurück.
 * - Inhalte (Termine, Formate …): Felder mit Endung _en, z. B. teaser_en → loc(data, 'teaser', lang)
 *
 * Neue Seite? Route hier in `routes` eintragen und unter src/pages/ + src/pages/en/ anlegen.
 */
import { href } from './url';

export const locales = ['de', 'en'] as const;
export type Lang = (typeof locales)[number];
export const defaultLang: Lang = 'de';

export const langNames: Record<Lang, string> = { de: 'Deutsch', en: 'English' };
export const htmlLang: Record<Lang, string> = { de: 'de', en: 'en' };
export const dateLocale: Record<Lang, string> = { de: 'de-DE', en: 'en-GB' };

export function getLang(astro: { currentLocale?: string }): Lang {
  return astro.currentLocale === 'en' ? 'en' : 'de';
}

/** Seitenadressen je Sprache (ohne Basis-Pfad). */
export const routes = {
  home: { de: '', en: '' },
  termine: { de: 'termine/', en: 'events/' },
  news: { de: 'news/', en: 'news/' },
  netzwerk: { de: 'netzwerk/', en: 'network/' },
  kooperationen: { de: 'kooperationen/', en: 'partners/' },
  verein: { de: 'verein/', en: 'about/' },
  mitglied: { de: 'mitglied-werden/', en: 'membership/' },
  kontakt: { de: 'kontakt/', en: 'contact/' },
  transparenz: { de: 'transparenz/', en: 'transparency/' },
  spenden: { de: 'spenden/', en: 'donate/' },
  // Steuerbeleg nach § 50 Abs. 4 EStDV – nur deutsch
  spendenNachweis: { de: 'spenden/nachweis/', en: null },
  barrierefreiheit: { de: 'barrierefreiheit/', en: 'accessibility/' },
  leichteSprache: { de: 'leichte-sprache/', en: null },
  impressum: { de: 'impressum/', en: 'legal-notice/' },
  datenschutz: { de: 'datenschutz/', en: 'privacy/' },
  // interner Bereich bleibt vorerst deutsch
  intern: { de: 'intern/', en: null },
} as const satisfies Record<string, Record<Lang, string | null>>;
export type RouteKey = keyof typeof routes;

/**
 * Link zu einer Seite in einer Sprache.
 *   url('en', 'termine')                 → /en/events/
 *   url('de', 'netzwerk', 'alba-t-alvarez/') → /netzwerk/alba-t-alvarez/
 *   url('de', 'home', '#termine')        → /#termine
 * Gibt es die Seite in der Sprache nicht, wird auf die deutsche verlinkt.
 */
export function url(lang: Lang, key: RouteKey, rest = ''): string {
  const r: string | null = routes[key][lang];
  const useLang = r === null ? 'de' : lang;
  const path = (r ?? routes[key].de) + rest;
  return href((useLang === 'de' ? '' : `${useLang}/`) + path);
}

/** Wählt den Text-Block der Sprache (mit deutschem Fallback je Schlüssel). */
export function tr<T extends Record<string, unknown>>(lang: Lang, texts: { de: T; en: Partial<T> }): T {
  return lang === 'de' ? texts.de : ({ ...texts.de, ...texts.en } as T);
}

/** Lokalisiertes Inhaltsfeld: loc(data, 'teaser', 'en') → data.teaser_en ?? data.teaser */
export function loc<D extends Record<string, unknown>, K extends keyof D & string>(data: D, field: K, lang: Lang): D[K] {
  if (lang === 'de') return data[field];
  const v = data[`${field}_${lang}` as keyof D];
  return (v === undefined || v === null || v === '' ? data[field] : v) as D[K];
}
