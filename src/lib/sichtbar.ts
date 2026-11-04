/**
 * Ausblenden (Redaktion: Schalter „Auf der Website anzeigen“). Ausgeblendete Inhalte bleiben in der Datei und in
 * der Redaktion bearbeitbar, die Website liefert sie nicht aus – auch nicht im HTML. Deshalb filtern die Lader
 * (src/lib/content.ts, formate.ts, keep-up.ts, profiles.ts, settings.ts …) vor dem Rendern, nie erst die Ansicht.
 *
 *   Einträge und Listeneinträge: Feld `sichtbar` (Standard true – fehlt es, ist der Eintrag sichtbar).
 *   Termine und ältere News: `draft` (Entwurf = ausgeblendet), kein zweites Feld.
 *   Reine Wortlisten (z. B. wechselnde Wörter): Text oder { text, sichtbar: false }.
 *   Texte und Abschnitte in texte.json: `aus: true` (nur wo `ausblendbar`), siehe src/lib/texte.ts.
 *
 * Ohne Imports, damit Build, Redaktion (Browser) und Tests dieselben Regeln nutzen. docs/redaktion.md#ausblenden
 */

/** Ist der Eintrag auf der Website zu sehen? (fehlendes Feld = ja) */
export const istSichtbar = (x: unknown): boolean => {
  if (!x || typeof x !== 'object') return true;
  const o = (('data' in x ? (x as { data: unknown }).data : x) ?? {}) as { sichtbar?: unknown; draft?: unknown };
  return o.sichtbar !== false && o.draft !== true;
};

/** Nur die sichtbaren Einträge */
export const nurSichtbare = <T>(liste: readonly T[] | undefined | null): T[] => (liste ?? []).filter(istSichtbar);

/** Eintrag einer Wortliste: Text oder { text, sichtbar } */
export type Wort = string | { text: string; sichtbar?: boolean };

/** Wortliste → sichtbare Texte */
export const sichtbareWorte = (liste: readonly Wort[] | undefined | null): string[] =>
  (liste ?? []).flatMap((w) => (typeof w === 'string' ? [w] : w.sichtbar === false ? [] : [w.text]));
