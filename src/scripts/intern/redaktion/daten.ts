/**
 * Inhalte lesen und zurückschreiben: Markdown mit Frontmatter, YAML-Listen und JSON-Einstellungen.
 * Kommentare und Schreibweise der Dateien bleiben erhalten – geändert wird nur, was sich geändert hat.
 */
import { Document, isMap, isScalar, isSeq, parseDocument, type Node, type YAMLMap, type YAMLSeq } from 'yaml';
import type { Aenderung, Api, DateiInfo } from './api';
import type { Bereich, Feld } from './bereiche';

export type Daten = Record<string, any>;

export interface Eintrag {
  id: string;
  data: Daten;
  body?: string;
  /** englische Fassung in eigener Datei (News, Textseiten) */
  en?: { data: Daten; body: string };
}

/** Geladener Bereich mit allem, was zum Zurückschreiben gebraucht wird */
export interface Geladen {
  bereich: Bereich;
  eintraege: Eintrag[];
  /** Pfad → Stand beim Lesen (Blob-SHA) und Inhalt */
  quellen: Map<string, { sha: string; text: string }>;
}

// ---------- Pfade ----------

export const holen = (o: unknown, p: string): any =>
  p ? p.split('.').reduce<any>((v, k) => (v == null ? undefined : v[k]), o) : o;

export function setzen(o: Daten, p: string, v: unknown) {
  const ks = p.split('.');
  let cur = o;
  for (const k of ks.slice(0, -1)) {
    if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k];
  }
  const last = ks[ks.length - 1];
  if (v === undefined) delete cur[last];
  else cur[last] = v;
}

export const leer = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

/** Pfad einer Datei relativ zu einer anderen: von src/content/formate/a.md zu src/assets/photos/b.jpg → ../../assets/photos/b.jpg */
export function relativ(von: string, zu: string): string {
  const a = von.split('/').slice(0, -1);
  const b = zu.split('/');
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return [...Array(a.length - i).fill('..'), ...b.slice(i)].join('/');
}

/** Umkehrung von relativ(): ../../assets/photos/b.jpg (in src/content/formate/a.md) → src/assets/photos/b.jpg */
export function aufloesen(von: string, rel: string): string {
  const teile = von.split('/').slice(0, -1);
  for (const t of rel.split('/')) {
    if (t === '..') teile.pop();
    else if (t !== '.') teile.push(t);
  }
  return teile.join('/');
}

// ---------- YAML ----------

/** Zeichenketten, die js-yaml (Astro) sonst als Datum, Zahl oder Wahrheitswert lesen würde */
const riskant = (s: string) => /^[\d.+-]|^(true|false|yes|no|on|off|null|y|n|~)$/i.test(s) || s.trim() !== s || s === '';

function knoten(doc: Document, v: unknown, flow?: boolean): Node {
  const n = doc.createNode(v) as Node;
  const stil = (x: Node | unknown) => {
    if (isScalar(x) && typeof x.value === 'string' && riskant(x.value)) x.type = 'QUOTE_DOUBLE';
    if (isSeq(x)) {
      // kurze Listen aus Wörtern einzeilig: [mo, di, mi]
      if (x.items.every((i) => isScalar(i))) x.flow = true;
      x.items.forEach(stil);
    }
    if (isMap(x)) {
      if (flow) x.flow = true;
      x.items.forEach((p) => stil(p.value));
    }
  };
  stil(n);
  return n;
}

/** Bringt eine YAML-Map auf den Stand von `ziel`, ohne unveränderte Werte anzufassen. */
function abgleichen(doc: Document, map: YAMLMap, ziel: Daten) {
  const alt = map.toJSON() as Daten;
  for (const k of Object.keys(alt)) if (!(k in ziel) || ziel[k] === undefined) map.delete(k);
  for (const [k, v] of Object.entries(ziel)) {
    if (v === undefined) continue;
    if (JSON.stringify(alt[k]) !== JSON.stringify(v)) map.set(k, knoten(doc, v, map.flow));
  }
}

const YAML_AUS = { lineWidth: 0 } as const;
/** Schreibweise wie in den Dateien: { id: a, tage: [mo, di] } – Maps mit, Listen ohne Innenabstand */
const yamlText = (doc: Document) => doc.toString(YAML_AUS).replace(/\[ ([^[\]\n]*?) \]/g, '[$1]');

/** Frontmatter + Text → Markdown-Datei (bestehende Datei als Vorlage, damit Kommentare bleiben) */
export function mdSchreiben(vorlage: string | null, data: Daten, body = ''): string {
  const m = vorlage?.match(/^---\r?\n([\s\S]*?)\r?\n?---\r?\n?/);
  const doc = m ? parseDocument(m[1]) : new Document({});
  if (!isMap(doc.contents)) doc.contents = doc.createNode({}) as YAMLMap;
  abgleichen(doc, doc.contents as YAMLMap, data);
  const fm = yamlText(doc);
  const text = body.trim();
  // Leerzeile nach dem Frontmatter wie in der Vorlage (neue Dateien: mit Leerzeile)
  const luecke = !m || /^\r?\n/.test(vorlage!.slice(m[0].length)) ? '\n' : '';
  return `---\n${fm}---\n${text ? `${luecke}${text}\n` : ''}`;
}

export function mdLesen(text: string): { data: Daten; body: string } {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n?---\r?\n?/);
  if (!m) return { data: {}, body: text };
  const data = (parseDocument(m[1]).toJSON() ?? {}) as Daten;
  return { data, body: text.slice(m[0].length).replace(/^\r?\n/, '') };
}

export function listeLesen(text: string): { id: string; data: Daten }[] {
  const arr = (parseDocument(text).toJSON() ?? []) as Daten[];
  return arr.map(({ id, ...data }) => ({ id: String(id), data }));
}

/** YAML-Liste mit Einträgen {id, …} neu schreiben – in der gegebenen Reihenfolge. */
export function listeSchreiben(vorlage: string, eintraege: { id: string; data: Daten }[]): string {
  const doc = parseDocument(vorlage || '[]');
  let seq = doc.contents as YAMLSeq<YAMLMap>;
  if (!isSeq(seq)) {
    seq = doc.createNode([]) as YAMLSeq<YAMLMap>;
    doc.contents = seq as never;
  }
  // Kopfkommentar gehört zur Datei, nicht zum ersten Eintrag (sonst wandert er beim Sortieren mit)
  const erster = seq.items[0];
  if (erster?.commentBefore && !doc.commentBefore) {
    doc.commentBefore = erster.commentBefore;
    erster.commentBefore = undefined;
  }
  const flow = seq.items.length > 0 && seq.items.filter((i) => isMap(i) && i.flow).length > seq.items.length / 2;
  const nachId = new Map(seq.items.filter(isMap).map((m) => [String(m.get('id')), m as YAMLMap]));
  seq.items = eintraege.map(({ id, data }) => {
    const ziel = { id, ...data };
    const m = nachId.get(id);
    if (m) {
      abgleichen(doc, m, ziel);
      return m;
    }
    return knoten(doc, ziel, flow) as YAMLMap;
  });
  seq.flow = false;
  let out = yamlText(doc);
  // Leerzeile zwischen Kopfkommentar und erstem Eintrag wie im Original vermeiden
  if (doc.commentBefore) out = out.replace(/^((?:#.*\n)+)\n/, '$1');
  return out;
}

export const jsonSchreiben = (data: unknown) => `${JSON.stringify(data, null, 2)}\n`;

// ---------- Bereiche laden ----------

export const enPfad = (b: Bereich, id: string) => (b.art === 'ordner' && b.uebersetzung ? b.uebersetzung(id) : null);

/** Liest alle Einträge eines Bereichs */
export async function laden(a: Api, b: Bereich, dateien: DateiInfo[], nur?: string): Promise<Geladen> {
  const quellen = new Map<string, { sha: string; text: string }>();
  const lies = async (pfade: string[]) => {
    for (let i = 0; i < pfade.length; i += 150) {
      const r = await a.lesen(pfade.slice(i, i + 150));
      for (const [p, d] of Object.entries(r.dateien)) if (d) quellen.set(p, d);
    }
  };
  if (b.art === 'ordner') {
    const prefix = `${b.ordner}/`;
    const ids = dateien
      .map((d) => d.pfad)
      .filter((p) => p.startsWith(prefix) && p.endsWith('.md') && !(b.ohne && b.ohne.test(p.slice(prefix.length))))
      .map((p) => p.slice(prefix.length, -3))
      .filter((id) => nur === undefined || id === nur);
    const pfade = ids.flatMap((id) => [`${prefix}${id}.md`, enPfad(b, id)].filter((p): p is string => !!p && dateien.some((d) => d.pfad === p)));
    await lies(pfade);
    const eintraege = ids.map((id): Eintrag => {
      const { data, body } = mdLesen(quellen.get(`${prefix}${id}.md`)!.text);
      const ep = enPfad(b, id);
      const en = ep && quellen.has(ep) ? mdLesen(quellen.get(ep)!.text) : undefined;
      return { id, data, body, en: b.uebersetzung ? (en ?? { data: {}, body: '' }) : undefined };
    });
    return { bereich: b, eintraege, quellen };
  }
  await lies([b.datei]);
  const text = quellen.get(b.datei)?.text ?? '';
  if (b.art === 'liste') return { bereich: b, eintraege: listeLesen(text), quellen };
  const json = JSON.parse(text || '{}');
  return { bereich: b, eintraege: [{ id: b.id, data: b.wurzel ? { [b.wurzel]: json } : json }], quellen };
}

// ---------- Speichern ----------

export const dateiPfad = (b: Bereich, id: string) => (b.art === 'ordner' ? `${b.ordner}/${id}.md` : b.datei);

/** Änderungen (Dateien) für einen geänderten oder neuen Eintrag */
export function aenderungenFuer(g: Geladen, e: Eintrag, neu: boolean): Aenderung[] {
  const b = g.bereich;
  if (b.art === 'ordner') {
    const pfad = dateiPfad(b, e.id);
    const alt = g.quellen.get(pfad);
    const out: Aenderung[] = [{ pfad, text: mdSchreiben(alt?.text ?? null, e.data, e.body ?? ''), alt: neu ? null : (alt?.sha ?? null) }];
    const ep = enPfad(b, e.id);
    if (ep && e.en) {
      const enAlt = g.quellen.get(ep);
      const hatEn = Object.values(e.en.data).some((v) => !leer(v)) || e.en.body.trim() !== '';
      if (hatEn) out.push({ pfad: ep, text: mdSchreiben(enAlt?.text ?? null, e.en.data, e.en.body), alt: enAlt?.sha ?? null });
      else if (enAlt) out.push({ pfad: ep, loeschen: true, alt: enAlt.sha });
    }
    return out;
  }
  if (b.art === 'liste') {
    const alt = g.quellen.get(b.datei);
    const liste = neu ? [...g.eintraege, e] : g.eintraege.map((x) => (x.id === e.id ? e : x));
    return [{ pfad: b.datei, text: listeSchreiben(alt?.text ?? '', sortiert(b, liste)), alt: alt?.sha ?? null }];
  }
  const alt = g.quellen.get(b.datei);
  return [{ pfad: b.datei, text: jsonSchreiben(b.wurzel ? e.data[b.wurzel] : e.data), alt: alt?.sha ?? null }];
}

/** Bereiche mit fester Sortierung (z. B. Trainingswochen nach Datum) */
export function sortiert(b: Bereich, liste: Eintrag[]): Eintrag[] {
  if (b.art === 'liste' && b.sortierung === 'id') return [...liste].sort((x, y) => x.id.localeCompare(y.id));
  return liste;
}

export function loeschAenderungen(g: Geladen, id: string): Aenderung[] {
  const b = g.bereich;
  if (b.art === 'ordner') {
    const pfad = dateiPfad(b, id);
    const out: Aenderung[] = [{ pfad, loeschen: true, alt: g.quellen.get(pfad)?.sha }];
    const ep = enPfad(b, id);
    if (ep && g.quellen.has(ep)) out.push({ pfad: ep, loeschen: true, alt: g.quellen.get(ep)!.sha });
    return out;
  }
  if (b.art === 'liste') {
    const alt = g.quellen.get(b.datei)!;
    return [{ pfad: b.datei, text: listeSchreiben(alt.text, g.eintraege.filter((x) => x.id !== id)), alt: alt.sha }];
  }
  return [];
}

/** Neue Reihenfolge speichern: Liste in der Datei umstellen bzw. Feld `order` neu nummerieren */
export function reihenfolgeAenderungen(g: Geladen, ids: string[]): Aenderung[] {
  const b = g.bereich;
  const nachId = new Map(g.eintraege.map((e) => [e.id, e]));
  const neu = ids.map((id) => nachId.get(id)!);
  if (b.art === 'liste') {
    const alt = g.quellen.get(b.datei)!;
    return [{ pfad: b.datei, text: listeSchreiben(alt.text, neu), alt: alt.sha }];
  }
  if (b.art === 'ordner' && b.sortierung === 'order') {
    return neu.flatMap((e, i) => {
      if (e.data.order === i + 1) return [];
      const pfad = dateiPfad(b, e.id);
      const alt = g.quellen.get(pfad)!;
      return [{ pfad, text: mdSchreiben(alt.text, { ...e.data, order: i + 1 }, e.body), alt: alt.sha }];
    });
  }
  return [];
}

/** Freie Kennung: „name“, sonst „name-2“, „name-3“ … */
export function freieId(wunsch: string, belegt: (id: string) => boolean): string {
  let id = wunsch || 'eintrag';
  for (let n = 2; belegt(id); n++) id = `${wunsch}-${n}`;
  return id;
}

/** Alle Verweis-Felder (auch in Listen), die auf `quelle` zeigen */
export function verweisFelder(felder: Feld[], quelle: string, pfad = ''): { key: string; mehrfach: boolean; inListe?: string }[] {
  const out: { key: string; mehrfach: boolean; inListe?: string }[] = [];
  for (const f of felder) {
    if (f.typ === 'verweis' && f.quelle === quelle) out.push({ key: f.key, mehrfach: !!f.mehrfach, inListe: pfad || undefined });
    if (f.typ === 'liste') out.push(...verweisFelder(f.felder, quelle, f.key));
  }
  return out;
}
