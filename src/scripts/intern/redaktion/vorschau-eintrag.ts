/**
 * Vorschau eines Eintrags (Formular der Redaktion): welche Seite, welche Stelle, und was sich gegenüber dem
 * veröffentlichten Stand geändert hat (Texte, langer Text, Ausgeblendetes). Logik der Vorschau: vorschau.ts.
 */
import { renderMarkdown } from '../../../lib/markdown';
import { istSichtbar } from '../../../lib/sichtbar';
import type { Bereich } from './bereiche';
import type { Daten, Eintrag } from './daten';
import type { Ort } from './seitenplan';
import type { Zustand } from './vorschau';

/** Seite (ohne Basis-Pfad und ohne #…) und Stelle auf der Seite */
export function eintragZiel(b: Bereich, vorlage: Eintrag | undefined, ort: Ort | null): { pfad: string; anker: string | null } | null {
  const seite = vorlage && istSichtbar(vorlage) ? (b.seite?.(vorlage) ?? null) : null;
  // ausgeblendete Einträge haben oft keine eigene Seite: dann die Seite, auf der der Bereich erscheint
  const einstellung = b.art === 'einstellung' ? (b.seite?.({ id: b.id, data: {}, body: '' }) ?? null) : null;
  const roh = seite ?? einstellung ?? ort?.seite.pfad ?? null;
  if (roh === null) return null;
  const [pfad, hash] = roh.split('#');
  const anker = vorlage && b.anker ? b.anker(vorlage) : hash ? `#${hash}` : null;
  return { pfad, anker };
}

/** Texte, die sich geändert haben: [veröffentlicht, jetzt], auch in Listen und verschachtelt */
function vergleichen(alt: unknown, neu: unknown, out: [string, string][]) {
  if (typeof alt === 'string' && typeof neu === 'string') {
    if (alt !== neu && alt.trim().length >= 2) out.push([alt, neu]);
    return;
  }
  if (alt && neu && typeof alt === 'object' && typeof neu === 'object') {
    for (const k of Object.keys(alt as Daten)) vergleichen((alt as Daten)[k], (neu as Daten)[k], out);
  }
}

/** frisch ausgeblendete Listeneinträge und Wörter: ihr erster Text (die Vorschau blendet den Block aus) */
function ausgeblendet(alt: unknown, neu: unknown, out: string[]) {
  if (Array.isArray(alt) && Array.isArray(neu)) {
    neu.forEach((x, i) => {
      const vorher = alt[i];
      if (x && typeof x === 'object' && !istSichtbar(x) && (vorher === undefined || typeof vorher === 'string' || istSichtbar(vorher))) {
        const text = typeof (x as Daten).text === 'string' ? (x as Daten).text : Object.values(x as Daten).find((v) => typeof v === 'string' && v.length > 2);
        if (text) out.push(String(text));
      } else ausgeblendet(vorher, x, out);
    });
    return;
  }
  if (alt && neu && typeof alt === 'object' && typeof neu === 'object') for (const k of Object.keys(neu as Daten)) ausgeblendet((alt as Daten)[k], (neu as Daten)[k], out);
}

export function eintragZustand(b: Bereich, vorlage: Eintrag | undefined, e: Eintrag, neu: boolean, anker: string | null): Zustand {
  const ersetzen: [string, string][] = [];
  const html: [string, string][] = [];
  const aus: string[] = [];
  const hinweise: string[] = [];
  if (neu || !vorlage) {
    hinweise.push('Neue Einträge erscheinen in der Vorschau erst nach dem Speichern.');
    return { hinweise };
  }
  vergleichen(vorlage.data, e.data, ersetzen);
  if (vorlage.en && e.en) vergleichen(vorlage.en.data, e.en.data, ersetzen);
  if (b.textSelektor && e.body !== vorlage.body) html.push([b.textSelektor, renderMarkdown(e.body ?? '', import.meta.env.BASE_URL)]);
  ausgeblendet(vorlage.data, e.data, aus);
  if (!istSichtbar(vorlage)) hinweise.push('Dieser Eintrag ist ausgeblendet und steht deshalb nicht auf der Website.');
  else if (!istSichtbar(e)) aus.push(anker ?? String(vorlage.data.title ?? vorlage.data.titel ?? vorlage.data.name ?? ''));
  return { ersetzen, html, aus: aus.filter(Boolean), hinweise };
}
