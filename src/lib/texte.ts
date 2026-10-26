/**
 * Feste Texte der Website aus src/settings/texte.json (Redaktion → Texte, docs/texte.md).
 *
 *   const t = texte(lang, 'startseite', 'mitglied');
 *   t.lead                         → Text in der Sprache (Englisch leer = Deutsch)
 *   zeilen(t.titel)                → ['Werde Teil', 'des Netzes.']
 *   fuellen(t.alle, { zahl: 70 })  → 'Alle 70 Profile →'
 *
 * Seiten, Abschnitte und Schlüssel sind typisiert: Ein Tippfehler fällt beim Build auf.
 */
import daten from '../settings/texte.json';
import type { Lang } from './i18n';
import type { TextAbschnitt } from './texte-regeln';

export { fuellen, zeilen } from './texte-regeln';

type Datei = typeof daten;
export type TextSeiteId = Exclude<keyof Datei, `_${string}`>;
type Abschnitte<S extends TextSeiteId> = Datei[S]['abschnitte'];
type Schluessel<T> = T extends { texte: infer X } ? keyof X & string : never;

export function texte<S extends TextSeiteId, A extends keyof Abschnitte<S> & string>(
  lang: Lang,
  seite: S,
  abschnitt: A,
): Record<Schluessel<Abschnitte<S>[A]>, string> {
  const a = (daten[seite].abschnitte as Record<string, TextAbschnitt>)[abschnitt];
  if (!a) throw new Error(`texte.json: Abschnitt „${seite}.${abschnitt}“ fehlt.`);
  return Object.fromEntries(Object.entries(a.texte).map(([k, e]) => [k, (lang === 'en' && e.en.trim()) || e.de])) as never;
}
