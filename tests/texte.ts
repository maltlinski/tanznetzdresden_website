/**
 * Texte aus src/settings/texte.json für Erwartungen in Tests – nach derselben Regel wie die Website (src/lib/texte.ts):
 * im Testlauf auf GitHub die ursprünglichen Texte, sonst die aktuellen. So bleiben Tests grün, wenn die Redaktion
 * Texte ändert. (texte.ts selbst lässt sich hier nicht laden: JSON-Import.)
 */
import { readFileSync } from 'node:fs';
import { testlauf } from '../src/lib/testlauf';

type Eintrag = { de: string; en: string; ursprung?: { de: string; en: string } };
const daten = JSON.parse(readFileSync('src/settings/texte.json', 'utf8')) as Record<string, { abschnitte: Record<string, { texte: Record<string, Eintrag> }> }>;

export function text(seite: string, abschnitt: string, schluessel: string, lang: 'de' | 'en' = 'de'): string {
  const e = daten[seite].abschnitte[abschnitt].texte[schluessel];
  const w = testlauf ? (e.ursprung ?? e) : e;
  return (lang === 'en' && w.en.trim()) || w.de;
}
