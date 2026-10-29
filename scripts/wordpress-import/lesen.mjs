/**
 * WordPress-Export (WXR, „Werkzeuge → Daten exportieren“) und Medienliste (CSV) einlesen.
 * Liefert Beiträge und Anhänge als einfache Objekte; E-Mail-Adressen der Autor:innen werden nicht übernommen.
 */
import { readFileSync } from 'node:fs';
import { XMLParser } from 'fast-xml-parser';

const text = (v) => (v == null ? '' : typeof v === 'object' ? String(v['#text'] ?? '') : String(v));
const liste = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

/** HTML-Entitäten in Titeln und Bildangaben auflösen */
export function entitaeten(s) {
  const benannt = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»', bdquo: '„', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', sbquo: '‚', bull: '•', middot: '·', euro: '€', auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', eacute: 'é', egrave: 'è', copy: '©' };
  return String(s ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => benannt[n] ?? m);
}

export function wxrLesen(datei) {
  const p = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', cdataPropName: false, processEntities: false, parseTagValue: false, trimValues: false });
  const xml = p.parse(readFileSync(datei, 'utf8'));
  const kanal = xml.rss.channel;
  const autor = new Map(liste(kanal['wp:author']).map((a) => [text(a['wp:author_login']).trim(), text(a['wp:author_display_name']).trim()]));
  const items = liste(kanal.item).map((i) => {
    const meta = {};
    for (const m of liste(i['wp:postmeta'])) {
      const k = text(m['wp:meta_key']);
      (meta[k] ??= []).push(text(m['wp:meta_value']));
    }
    return {
      id: text(i['wp:post_id']).trim(),
      typ: text(i['wp:post_type']).trim(),
      status: text(i['wp:status']).trim(),
      titel: entitaeten(text(i.title)).trim(),
      link: text(i.link).trim(),
      slug: decodeURIComponent(text(i['wp:post_name']).trim()),
      datum: text(i['wp:post_date']).trim(),
      geaendert: text(i['wp:post_modified']).trim(),
      autor: autor.get(text(i['dc:creator']).trim()) || text(i['dc:creator']).trim(),
      inhalt: text(i['content:encoded']),
      auszug: text(i['excerpt:encoded']),
      eltern: text(i['wp:post_parent']).trim(),
      anhangUrl: text(i['wp:attachment_url']).trim(),
      kategorien: liste(i.category).map((c) => ({ art: c.domain, slug: c.nicename, name: entitaeten(text(c)) })),
      meta,
    };
  });
  return { items, basis: text(kanal['wp:base_site_url']).trim().replace(/\/$/, '') };
}

/** Einfacher CSV-Leser (Felder in Anführungszeichen, "" als Anführungszeichen) */
export function csvLesen(datei) {
  const s = readFileSync(datei, 'utf8').replace(/^﻿/, '');
  const zeilen = [];
  let feld = '', zeile = [], inQ = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"' && s[i + 1] === '"') { feld += '"'; i++; }
      else if (c === '"') inQ = false;
      else feld += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { zeile.push(feld); feld = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      zeile.push(feld); feld = '';
      if (zeile.some((f) => f !== '')) zeilen.push(zeile);
      zeile = [];
    } else feld += c;
  }
  if (feld || zeile.length) { zeile.push(feld); zeilen.push(zeile); }
  const [kopf, ...rest] = zeilen;
  return rest.map((z) => Object.fromEntries(kopf.map((k, i) => [k, z[i] ?? ''])));
}

/** Originaladresse eines Bildes: ohne Größenzusatz (-300x200) und ohne -scaled */
export const originalUrl = (u) =>
  u.replace(/^http:\/\//, 'https://').replace(/\?.*$/, '').replace(/-\d{2,5}x\d{2,5}(?=\.[a-z0-9]+$)/i, '').replace(/-scaled(?=\.[a-z0-9]+$)/i, '');

/**
 * Medien aus WXR-Anhängen und CSV zusammenführen.
 * @returns {{ nachId: Map<string, Medium>, nachUrl: Map<string, Medium> }}
 * Medium: { id, url, alt, beschriftung, titel, jahr, mime }
 */
export function medienSammeln(items, csv = []) {
  const nachId = new Map();
  for (const a of items.filter((i) => i.typ === 'attachment')) {
    nachId.set(a.id, {
      id: a.id,
      url: originalUrl(a.anhangUrl),
      alt: entitaeten(a.meta._wp_attachment_image_alt?.[0] ?? '').trim(),
      beschriftung: entitaeten(a.auszug).trim(),
      titel: a.titel,
      jahr: (a.anhangUrl.match(/uploads\/(\d{4})\//) ?? [])[1] ?? a.datum.slice(0, 4),
    });
  }
  for (const r of csv) {
    const alt = nachId.get(r.ID);
    const m = alt ?? { id: r.ID, url: originalUrl(r.URL), alt: '', beschriftung: '', titel: r.Titel, jahr: (r.URL.match(/uploads\/(\d{4})\//) ?? [])[1] ?? '' };
    m.alt ||= entitaeten(r.Alternativtext).trim();
    m.beschriftung ||= entitaeten(r.Beschriftung).trim();
    m.mime = r['MIME-Typ'];
    m.gross = r['Große URL'] || r.URL;
    nachId.set(r.ID, m);
  }
  const nachUrl = new Map([...nachId.values()].map((m) => [m.url, m]));
  return { nachId, nachUrl };
}
