/**
 * Feste Texte der Website aus src/settings/texte.json (Redaktion → Texte, docs/texte.md).
 *
 *   const t = texte(lang, 'startseite', 'mitglied');
 *   t.lead                         → Text in der Sprache (Englisch leer = Deutsch)
 *   zeilen(t.titel)                → ['Werde Teil', 'des Netzes.']
 *   fuellen(t.alle, { zahl: 70 })  → 'Alle 70 Profile →'
 *   abschnittZeigen('startseite', 'netz') → false, wenn die Redaktion den Abschnitt ausgeblendet hat
 *
 * Ausgeblendete Texte (nur wo `ausblendbar`) kommen als '' zurück; die Ansicht lässt das Element dann weg.
 *
 * Seiten, Abschnitte und Schlüssel sind typisiert: Ein Tippfehler fällt beim Build auf.
 */
import daten from '../settings/texte.json';
import type { Lang } from './i18n';
import type { TextAbschnitt } from './texte-regeln';
import { testlauf } from './testlauf';

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
  // ausgeblendete Texte (Redaktion) sind leer: die Ansicht lässt sie samt Element weg; im Testlauf der ursprüngliche Text
  return Object.fromEntries(Object.entries(a.texte).map(([k, e]) => {
    if (testlauf) return [k, (lang === 'en' && (e.ursprung ?? e).en.trim()) || (e.ursprung ?? e).de];
    return [k, e.aus ? '' : (lang === 'en' && e.en.trim()) || e.de];
  })) as never;
}

/**
 * Zeigt die Website diesen Abschnitt? false, wenn die Redaktion ihn ausgeblendet hat (`aus` in texte.json).
 * Die Ansicht lässt ihn dann ganz weg (auch im HTML), samt Abständen und Sprungmarken.
 */
export function abschnittZeigen<S extends TextSeiteId>(seite: S, abschnitt: keyof Abschnitte<S> & string): boolean {
  const a = (daten[seite].abschnitte as Record<string, TextAbschnitt>)[abschnitt];
  if (!a) throw new Error(`texte.json: Abschnitt „${seite}.${abschnitt}“ fehlt.`);
  return testlauf || !a.aus;
}
