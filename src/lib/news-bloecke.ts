/**
 * Abschnitte eines News-Textes: Text, Zwischentitel, Zitat, Bilder (ein Foto oder eine Galerie) und Hinweiskasten.
 *
 * Gespeichert wird weiter Markdown (Spalten body / body_en bzw. die Datei). Bilder und Hinweise stehen
 * darin als Block zwischen `::: bilder` bzw. `::: hinweis` und `:::`; die Angaben der Bilder als YAML:
 *
 *   ::: bilder
 *   format: quer          # original | quer | hoch | quadrat
 *   spalten: 4            # 2–4, nur bei mehreren Bildern
 *   text: Bildunterschrift
 *   foto: André Wirsig     # Fotonachweis
 *   bilder:
 *     - datei: 2025/re-preview-1.jpg   # Pfad im Supabase-Bucket „newsbilder“; in Dateien auch
 *                                      # ../../../assets/photos/foto.jpg (wie das Titelfoto)
 *       alt: Was zu sehen ist
 *       fokus: 50% 30%                  # Bildausschnitt, wenn zugeschnitten wird
 *   :::
 *
 * Zwischentitel sind Markdown-Überschriften (`## Titel`), Zitate Markdown-Zitate (`> Text`, darunter
 * `> — Name`). Beim Einlesen wird Text an diesen Stellen in eigene Abschnitte geteilt.
 *
 * Der Editor (Intern → News) zeigt die Abschnitte als Karten; niemand muss das Format kennen.
 * Die englische Fassung (body_en) hat dieselben Abschnitte mit englischen Texten.
 */
import { parse, stringify } from 'yaml';
import { Lexer } from 'marked';

export const FORMATE = ['original', 'quer', 'hoch', 'quadrat'] as const;
export type Format = (typeof FORMATE)[number];

export interface Bild {
  datei: string;
  alt: string;
  alt_en?: string;
  /** „50% 30%“ = Bildmitte für den Zuschnitt */
  fokus?: string;
}

export interface BilderBlock {
  typ: 'bilder';
  /** neben = ein Foto halb breit, der Text fließt daneben */
  darstellung: 'raster' | 'neben';
  format: Format;
  spalten: 2 | 3 | 4;
  text: string;
  text_en: string;
  foto: string;
  bilder: Bild[];
}
export interface TextBlock {
  typ: 'text' | 'hinweis' | 'zwischentitel' | 'zitat';
  de: string;
  en: string;
  /** nur Zitat: wer das sagt („Name · Rolle“) */
  wer?: string;
}
export type Block = TextBlock | BilderBlock;

export const DIREKTIVE = /^::: ?(bilder|hinweis)[ \t]*\n([\s\S]*?)\n:::[ \t]*(?=\n|$)/gm;
/** Bucket-Pfad (Editor), Foto aus src/assets/photos/ (Dateien, relativ wie beim Titelfoto), /… oder https://… */
export const DATEI = /^(?:[a-z0-9][a-z0-9_.-]*(?:\/[a-z0-9][a-z0-9_.-]*)*|(?:\.\.\/)+assets\/photos\/[a-z0-9][a-z0-9_.-]*|\/(?!\/)[^\s"<>]*|https:\/\/[^\s"<>]+)$/i;
export const ASSET = /^(?:\.\.\/)+assets\/photos\/([a-z0-9][a-z0-9_.-]*)$/i;
export const FOKUS = /^\d{1,3}% \d{1,3}%$/;

const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));

/** Angaben eines Bilder-Blocks (YAML) prüfen und vervollständigen; ungültige Bilder fallen weg */
export function bilderLesen(yaml: string): Omit<BilderBlock, 'text_en'> & { text_en?: string } {
  let d: Record<string, unknown> = {};
  try {
    const x = parse(yaml);
    if (x && typeof x === 'object' && !Array.isArray(x)) d = x as Record<string, unknown>;
  } catch {
    /* kaputter Block → leere Galerie */
  }
  const bilder = (Array.isArray(d.bilder) ? d.bilder : [])
    .map((b) => (b && typeof b === 'object' ? (b as Record<string, unknown>) : {}))
    .map((b) => ({ datei: str(b.datei).trim(), alt: str(b.alt).trim(), fokus: FOKUS.test(str(b.fokus)) ? str(b.fokus) : undefined }))
    .filter((b) => DATEI.test(b.datei) && (!b.datei.includes('..') || ASSET.test(b.datei)));
  const sp = Number(d.spalten);
  return {
    typ: 'bilder',
    darstellung: d.darstellung === 'neben' ? 'neben' : 'raster',
    format: (FORMATE as readonly string[]).includes(str(d.format)) ? (str(d.format) as Format) : bilder.length > 1 ? 'quer' : 'original',
    spalten: sp === 2 || sp === 3 || sp === 4 ? sp : (Math.min(4, Math.max(2, bilder.length)) as 2 | 3 | 4),
    text: str(d.text).trim(),
    foto: str(d.foto).trim(),
    bilder,
  };
}

const STRICH = /^[—–]\s*|^--\s*/;

/** Zitat aus einem Markdown-Zitat: letzter Absatz mit Gedankenstrich = wer */
function zitatLesen(raw: string): TextBlock {
  const absaetze = raw.replace(/^ {0,3}> ?/gm, '').trim().split(/\n\s*\n/).map((a) => a.trim()).filter(Boolean);
  const letzter = absaetze.length > 1 ? absaetze[absaetze.length - 1] : '';
  const wer = STRICH.test(letzter) ? letzter.replace(STRICH, '') : '';
  return { typ: 'zitat', de: (wer ? absaetze.slice(0, -1) : absaetze).join('\n\n'), en: '', wer };
}

/** Text in Abschnitte teilen: Zwischentitel (##) und Zitate (>) werden eigene Abschnitte */
function textTeilen(src: string, out: Block[]) {
  let puffer = '';
  const weg = () => {
    const t = puffer.trim();
    if (t) out.push({ typ: 'text', de: t, en: '' });
    puffer = '';
  };
  for (const tok of new Lexer().lex(src)) {
    if (tok.type === 'heading' && tok.depth === 2) {
      weg();
      out.push({ typ: 'zwischentitel', de: (tok.text as string).trim(), en: '' });
    } else if (tok.type === 'blockquote') {
      weg();
      out.push(zitatLesen(tok.raw));
    } else puffer += tok.raw;
  }
  weg();
}

/** Markdown → Abschnitte (eine Sprache) */
function zerlegen(md: string): Block[] {
  const out: Block[] = [];
  const text = (s: string) => {
    if (s.trim()) textTeilen(s, out);
  };
  const src = (md ?? '').replace(/\r\n?/g, '\n');
  let last = 0;
  for (const m of src.matchAll(DIREKTIVE)) {
    text(src.slice(last, m.index));
    if (m[1] === 'hinweis') out.push({ typ: 'hinweis', de: m[2].trim(), en: '' });
    else out.push({ ...bilderLesen(m[2]), text_en: '' });
    last = m.index! + m[0].length;
  }
  text(src.slice(last));
  return out;
}

/**
 * body + body_en → Abschnitte mit beiden Sprachen. Passen die Abschnitte nicht zusammen (z. B. ein alter,
 * von Hand geschriebener englischer Text), landet der englische Text im ersten Textabschnitt (`passend: false`).
 */
export function abschnitte(body: string, bodyEn?: string | null): { bloecke: Block[]; passend: boolean } {
  const de = zerlegen(body ?? '');
  const en = bodyEn?.trim() ? zerlegen(bodyEn) : [];
  if (!en.length) return { bloecke: de, passend: true };
  const passend = en.length === de.length && en.every((b, i) => b.typ === de[i].typ);
  if (passend) {
    de.forEach((b, i) => {
      const e = en[i];
      if (b.typ === 'bilder' && e.typ === 'bilder') {
        b.text_en = e.text !== b.text ? e.text : '';
        b.bilder.forEach((x, j) => {
          const y = e.bilder[j];
          if (y && y.datei === x.datei && y.alt !== x.alt) x.alt_en = y.alt;
        });
      } else if (b.typ !== 'bilder' && e.typ !== 'bilder') {
        b.en = e.de !== b.de ? e.de : '';
      }
    });
    return { bloecke: de, passend: true };
  }
  const erster = de.find((b): b is TextBlock => b.typ === 'text');
  if (erster) erster.en = bodyEn!.trim();
  else de.unshift({ typ: 'text', de: '', en: bodyEn!.trim() });
  return { bloecke: de, passend: false };
}

/** Ist irgendwo ein englischer Text eingetragen? */
export const hatEnglisch = (bloecke: Block[]) =>
  bloecke.some((b) => (b.typ === 'bilder' ? b.text_en || b.bilder.some((x) => x.alt_en) : b.en.trim()));

/** Abschnitte → Markdown einer Sprache (Englisch: fehlende Texte auf Deutsch) */
export function zuMarkdown(bloecke: Block[], lang: 'de' | 'en' = 'de'): string {
  const en = lang === 'en';
  return bloecke
    .map((b) => {
      if (b.typ !== 'bilder') {
        const t = ((en && b.en.trim()) || b.de).trim();
        if (!t) return '';
        if (b.typ === 'zwischentitel') return `## ${t.replace(/\s*\n\s*/g, ' ')}`;
        if (b.typ === 'zitat') {
          const teile = t.split(/\n\s*\n/).map((a) => a.trim().replace(/\n/g, '\n> '));
          if (b.wer?.trim()) teile.push(`— ${b.wer.trim()}`);
          return teile.map((a) => `> ${a}`).join('\n>\n');
        }
        return b.typ === 'text' ? t : `::: hinweis\n${t}\n:::`;
      }
      if (!b.bilder.length) return '';
      const daten: Record<string, unknown> = {};
      if (b.darstellung === 'neben' && b.bilder.length === 1) daten.darstellung = 'neben';
      daten.format = b.format;
      if (b.bilder.length > 1) daten.spalten = b.spalten;
      const text = ((en && b.text_en) || b.text).trim();
      if (text) daten.text = text;
      if (b.foto.trim()) daten.foto = b.foto.trim();
      daten.bilder = b.bilder.map((x) => ({
        datei: x.datei,
        alt: ((en && x.alt_en?.trim()) || x.alt).trim(),
        ...(x.fokus && x.fokus !== '50% 50%' ? { fokus: x.fokus } : {}),
      }));
      return `::: bilder\n${stringify(daten, { lineWidth: 0 }).trimEnd()}\n:::`;
    })
    .filter(Boolean)
    .join('\n\n');
}

/** Alle Bilddateien im Bucket, auf die ein Text verweist (zum Aufräumen nach dem Speichern) */
export function bilddateien(...texte: (string | null | undefined)[]): Set<string> {
  const out = new Set<string>();
  for (const t of texte) {
    for (const b of zerlegen(t ?? '')) {
      if (b.typ === 'bilder') for (const x of b.bilder) if (!/^(\/|https:|\.\.)/.test(x.datei)) out.add(x.datei);
    }
  }
  return out;
}

/** Angaben zu einem Foto aus der Mediathek (Supabase-Tabelle news_medien) */
export interface MedienAngaben {
  alt: string;
  alt_en: string;
  credit: string;
  focus: string | null;
}

/**
 * Angaben aus der Mediathek in die Bilder eines Textes übernehmen: Sie gelten überall, wo das Foto steht
 * (Bildbeschreibung, Ausschnitt; Fotonachweis, wenn der Abschnitt keinen eigenen hat).
 */
export function medienAnwenden(md: string, medien: Map<string, MedienAngaben>, lang: 'de' | 'en' = 'de'): string {
  if (!medien.size || !md) return md;
  return md.replace(DIREKTIVE, (ganz, art: string, yaml: string) => {
    if (art !== 'bilder') return ganz;
    const b = bilderLesen(yaml);
    let anders = false;
    for (const x of b.bilder) {
      const m = medien.get(x.datei);
      if (!m) continue;
      const alt = (lang === 'en' ? m.alt_en : m.alt).trim();
      if (alt && alt !== x.alt) (x.alt = alt), (anders = true);
      if (m.focus && FOKUS.test(m.focus) && m.focus !== x.fokus) (x.fokus = m.focus), (anders = true);
    }
    if (!b.foto) {
      const namen = [...new Set(b.bilder.map((x) => medien.get(x.datei)?.credit.trim()).filter((c): c is string => !!c))];
      if (namen.length) (b.foto = namen.join(', ')), (anders = true);
    }
    return anders ? zuMarkdown([{ ...b, text_en: '' }], 'de') : ganz;
  });
}
