/**
 * Abschnitte eines News-Textes: Text, Zwischentitel, Zitat, Bilder (ein Foto, Galerie, Bildpaar, Bildstrecke),
 * Bild & Text (Schritte) und Hinweiskasten.
 *
 * Gespeichert wird weiter Markdown (Spalten body / body_en bzw. die Datei). Bilder, Schritte und Hinweise stehen
 * darin als Block zwischen `::: bilder`, `::: schritte` bzw. `::: hinweis` und `:::`; die Angaben als YAML:
 *
 *   ::: bilder
 *   darstellung: raster   # raster (ein Foto oder Galerie) | neben | paar (2 Fotos) | strecke (3–12, seitlich)
 *   breite: weit          # nur ein Foto: text | weit | randlos
 *   format: quer          # original | quer | hoch | quadrat (raster)
 *   spalten: 4            # 2–4, nur Galerie
 *   titel: Der Tag in Bildern   # nur Bildstrecke
 *   text: Bildunterschrift
 *   foto: André Wirsig     # Fotonachweis
 *   bilder:
 *     - datei: 2025/re-preview-1.jpg   # Pfad im Supabase-Bucket „newsbilder“; in Dateien auch
 *                                      # ../../../assets/photos/foto.jpg (wie das Titelfoto)
 *       alt: Was zu sehen ist
 *       fokus: 50% 30%                  # Bildausschnitt, wenn zugeschnitten wird
 *       text: Unterschrift nur für dieses Foto (Bildpaar, Bildstrecke)
 *   :::
 *
 *   ::: schritte          # Bild & Text: das Bild bleibt stehen, die Texte laufen daneben vorbei
 *   titel: Ein Tag in der Stadt
 *   schritte:
 *     - datei: 2026/sprung.jpg
 *       alt: Tänzerin im Sprung
 *       titel: Raus aus dem Studio
 *       text: Zum Welttanztag verlassen wir die Probenräume.
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
/** Breite eines einzelnen Fotos: Textspalte, etwas breiter (Keil-Ecke) oder über die ganze Seite */
export const BREITEN = ['text', 'weit', 'randlos'] as const;
export type Breite = (typeof BREITEN)[number];
export const DARSTELLUNGEN = ['raster', 'neben', 'paar', 'strecke'] as const;
export type Darstellung = (typeof DARSTELLUNGEN)[number];

export interface Bild {
  datei: string;
  alt: string;
  alt_en?: string;
  /** „50% 30%“ = Bildmitte für den Zuschnitt */
  fokus?: string;
  /** Unterschrift nur für dieses Foto (Bildpaar, Bildstrecke) */
  text?: string;
  text_en?: string;
  /** Fotonachweis nur für dieses Foto (kommt beim Build aus der Mediathek) */
  foto?: string;
}

export interface BilderBlock {
  typ: 'bilder';
  /** raster = ein Foto oder Galerie, neben = ein Foto halb breit (Text fließt daneben),
   *  paar = zwei Fotos gleich hoch, strecke = Bildstrecke zum seitlichen Blättern */
  darstellung: Darstellung;
  /** nur ein Foto (raster) */
  breite: Breite;
  format: Format;
  spalten: 2 | 3 | 4;
  /** nur Bildstrecke */
  titel: string;
  titel_en: string;
  text: string;
  text_en: string;
  foto: string;
  bilder: Bild[];
}

export interface Schritt {
  /** leer, solange noch kein Bild gewählt ist */
  datei: string;
  alt: string;
  alt_en?: string;
  fokus?: string;
  titel: string;
  titel_en?: string;
  text: string;
  text_en?: string;
  foto?: string;
}
/** Bild & Text: 2–6 Schritte, das Bild bleibt stehen, die Texte laufen daneben vorbei */
export interface SchritteBlock {
  typ: 'schritte';
  titel: string;
  titel_en: string;
  foto: string;
  schritte: Schritt[];
}
export interface TextBlock {
  typ: 'text' | 'hinweis' | 'zwischentitel' | 'zitat';
  de: string;
  en: string;
  /** nur Zitat: wer das sagt („Name · Rolle“) */
  wer?: string;
}
export type Block = TextBlock | BilderBlock | SchritteBlock;

export const DIREKTIVE = /^::: ?(bilder|hinweis|schritte)[ \t]*\n([\s\S]*?)\n:::[ \t]*(?=\n|$)/gm;
/** Bucket-Pfad (Editor), Foto aus src/assets/photos/ (Dateien, relativ wie beim Titelfoto), /… oder https://… */
export const DATEI = /^(?:[a-z0-9][a-z0-9_.-]*(?:\/[a-z0-9][a-z0-9_.-]*)*|(?:\.\.\/)+assets\/photos\/[a-z0-9][a-z0-9_.-]*|\/(?!\/)[^\s"<>]*|https:\/\/[^\s"<>]+)$/i;
export const ASSET = /^(?:\.\.\/)+assets\/photos\/([a-z0-9][a-z0-9_.-]*)$/i;
export const FOKUS = /^\d{1,3}% \d{1,3}%$/;

const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));

const yamlObjekt = (yaml: string): Record<string, unknown> => {
  try {
    const x = parse(yaml);
    if (x && typeof x === 'object' && !Array.isArray(x)) return x as Record<string, unknown>;
  } catch {
    /* kaputter Block → leer */
  }
  return {};
};
const liste = (v: unknown) => (Array.isArray(v) ? v : []).map((b) => (b && typeof b === 'object' ? (b as Record<string, unknown>) : {}));
const dateiOk = (d: string) => DATEI.test(d) && (!d.includes('..') || ASSET.test(d));
const fokusVon = (v: unknown) => (FOKUS.test(str(v)) ? str(v) : undefined);
const optional = <K extends string>(k: K, v: string) => (v ? { [k]: v } : {}) as Partial<Record<K, string>>;

/** Angaben eines Bilder-Blocks (YAML) prüfen und vervollständigen; ungültige Bilder fallen weg */
export function bilderLesen(yaml: string): Omit<BilderBlock, 'text_en' | 'titel_en'> & { text_en?: string; titel_en?: string } {
  const d = yamlObjekt(yaml);
  const bilder: Bild[] = liste(d.bilder)
    .map((b) => ({ datei: str(b.datei).trim(), alt: str(b.alt).trim(), fokus: fokusVon(b.fokus), ...optional('text', str(b.text).trim()), ...optional('foto', str(b.foto).trim()) }))
    .filter((b) => dateiOk(b.datei));
  const sp = Number(d.spalten);
  const darstellung = (DARSTELLUNGEN as readonly string[]).includes(str(d.darstellung)) ? (str(d.darstellung) as Darstellung) : 'raster';
  return {
    typ: 'bilder',
    darstellung,
    breite: (BREITEN as readonly string[]).includes(str(d.breite)) ? (str(d.breite) as Breite) : 'text',
    format: (FORMATE as readonly string[]).includes(str(d.format)) ? (str(d.format) as Format) : bilder.length > 1 ? 'quer' : 'original',
    spalten: sp === 2 || sp === 3 || sp === 4 ? sp : (Math.min(4, Math.max(2, bilder.length)) as 2 | 3 | 4),
    titel: str(d.titel).trim(),
    text: str(d.text).trim(),
    foto: str(d.foto).trim(),
    bilder,
  };
}

/** Angaben eines Schritte-Blocks (Bild & Text); Schritte ohne Bild bleiben, solange sie Text haben */
export function schritteLesen(yaml: string): Omit<SchritteBlock, 'titel_en'> & { titel_en?: string } {
  const d = yamlObjekt(yaml);
  const schritte: Schritt[] = liste(d.schritte)
    .map((b) => {
      const datei = str(b.datei).trim();
      return { datei: dateiOk(datei) ? datei : '', alt: str(b.alt).trim(), fokus: fokusVon(b.fokus), titel: str(b.titel).trim(), text: str(b.text).trim(), ...optional('foto', str(b.foto).trim()) };
    })
    .filter((b) => b.datei || b.titel || b.text);
  return { typ: 'schritte', titel: str(d.titel).trim(), foto: str(d.foto).trim(), schritte };
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
    else if (m[1] === 'schritte') out.push({ ...schritteLesen(m[2]), titel_en: '' });
    else out.push({ ...bilderLesen(m[2]), text_en: '', titel_en: '' });
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
      const anders = (de?: string, en?: string) => (en && en !== de ? en : '');
      if (b.typ === 'bilder' && e.typ === 'bilder') {
        b.text_en = anders(b.text, e.text);
        b.titel_en = anders(b.titel, e.titel);
        b.bilder.forEach((x, j) => {
          const y = e.bilder[j];
          if (!y || y.datei !== x.datei) return;
          if (anders(x.alt, y.alt)) x.alt_en = y.alt;
          if (anders(x.text, y.text)) x.text_en = y.text;
        });
      } else if (b.typ === 'schritte' && e.typ === 'schritte') {
        b.titel_en = anders(b.titel, e.titel);
        b.schritte.forEach((x, j) => {
          const y = e.schritte[j];
          if (!y || y.datei !== x.datei) return;
          if (anders(x.alt, y.alt)) x.alt_en = y.alt;
          if (anders(x.titel, y.titel)) x.titel_en = y.titel;
          if (anders(x.text, y.text)) x.text_en = y.text;
        });
      } else if (b.typ !== 'bilder' && b.typ !== 'schritte' && e.typ !== 'bilder' && e.typ !== 'schritte') {
        b.en = anders(b.de, e.de);
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
  bloecke.some((b) =>
    b.typ === 'bilder'
      ? b.text_en || b.titel_en || b.bilder.some((x) => x.alt_en || x.text_en)
      : b.typ === 'schritte'
        ? b.titel_en || b.schritte.some((x) => x.alt_en || x.titel_en || x.text_en)
        : b.en.trim());

/** Abschnitte → Markdown einer Sprache (Englisch: fehlende Texte auf Deutsch) */
export function zuMarkdown(bloecke: Block[], lang: 'de' | 'en' = 'de'): string {
  const en = lang === 'en';
  const w = (de: string | undefined, e: string | undefined) => ((en && e?.trim()) || de || '').trim();
  const yaml = (art: string, daten: Record<string, unknown>) => `::: ${art}\n${stringify(daten, { lineWidth: 0 }).trimEnd()}\n:::`;
  return bloecke
    .map((b) => {
      if (b.typ === 'schritte') {
        if (!b.schritte.length) return '';
        const daten: Record<string, unknown> = {};
        if (w(b.titel, b.titel_en)) daten.titel = w(b.titel, b.titel_en);
        if (b.foto.trim()) daten.foto = b.foto.trim();
        daten.schritte = b.schritte.map((x) => ({
          datei: x.datei,
          ...optional('alt', w(x.alt, x.alt_en)),
          ...(x.fokus && x.fokus !== '50% 50%' ? { fokus: x.fokus } : {}),
          ...optional('titel', w(x.titel, x.titel_en)),
          ...optional('text', w(x.text, x.text_en)),
          ...optional('foto', x.foto?.trim() ?? ''),
        }));
        return yaml('schritte', daten);
      }
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
      const n = b.bilder.length;
      const daten: Record<string, unknown> = {};
      const darstellung = b.darstellung === 'neben' && n !== 1 ? 'raster' : b.darstellung;
      if (darstellung !== 'raster') daten.darstellung = darstellung;
      if (darstellung === 'raster' && n === 1 && b.breite && b.breite !== 'text') daten.breite = b.breite;
      if (darstellung === 'raster' || darstellung === 'neben') daten.format = b.format;
      if (darstellung === 'raster' && n > 1) daten.spalten = b.spalten;
      if (darstellung === 'strecke' && w(b.titel, b.titel_en)) daten.titel = w(b.titel, b.titel_en);
      const text = w(b.text, b.text_en);
      if (text) daten.text = text;
      if (b.foto.trim()) daten.foto = b.foto.trim();
      daten.bilder = b.bilder.map((x) => ({
        datei: x.datei,
        alt: w(x.alt, x.alt_en),
        ...(x.fokus && x.fokus !== '50% 50%' ? { fokus: x.fokus } : {}),
        ...optional('text', w(x.text, x.text_en)),
        ...optional('foto', x.foto?.trim() ?? ''),
      }));
      return yaml('bilder', daten);
    })
    .filter(Boolean)
    .join('\n\n');
}

/** Alle Bilddateien im Bucket, auf die ein Text verweist (zum Aufräumen nach dem Speichern) */
export function bilddateien(...texte: (string | null | undefined)[]): Set<string> {
  const out = new Set<string>();
  for (const t of texte) {
    for (const b of zerlegen(t ?? '')) {
      const dateien = b.typ === 'bilder' ? b.bilder : b.typ === 'schritte' ? b.schritte : [];
      for (const x of dateien) if (x.datei && !/^(\/|https:|\.\.)/.test(x.datei)) out.add(x.datei);
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
    if (art === 'hinweis') return ganz;
    const b = art === 'schritte' ? { ...schritteLesen(yaml), titel_en: '' } : { ...bilderLesen(yaml), text_en: '', titel_en: '' };
    const bilder: (Bild | Schritt)[] = b.typ === 'schritte' ? b.schritte : b.bilder;
    let anders = false;
    for (const x of bilder) {
      const m = medien.get(x.datei);
      if (!m) continue;
      const alt = (lang === 'en' ? m.alt_en : m.alt).trim();
      if (alt && alt !== x.alt) (x.alt = alt), (anders = true);
      if (m.focus && FOKUS.test(m.focus) && m.focus !== x.fokus) (x.fokus = m.focus), (anders = true);
      // Nachweis je Foto (Bildnachweise am Ende des Beitrags), wenn der Abschnitt keinen eigenen hat
      if (!b.foto && !x.foto && m.credit.trim()) (x.foto = m.credit.trim()), (anders = true);
    }
    if (!b.foto && b.typ === 'bilder') {
      const namen = [...new Set(b.bilder.map((x) => x.foto).filter((c): c is string => !!c))];
      if (namen.length) (b.foto = namen.join(', ')), (anders = true);
      // alle von derselben Person: dann reicht der Nachweis am Abschnitt
      if (namen.length === 1) b.bilder.forEach((x) => delete x.foto);
    }
    return anders ? zuMarkdown([b], 'de') : ganz;
  });
}
