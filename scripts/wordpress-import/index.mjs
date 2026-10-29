#!/usr/bin/env node
/**
 * Beiträge der alten WordPress-Website als News übernehmen (einmalige Migration, docs/wordpress-import.md).
 *
 *   node scripts/wordpress-import/index.mjs <export.xml> [--medien <medien.csv>] [--uploads <ordner>] [--ohne-laden] [--cache <ordner>]
 *
 * - export.xml: WordPress → Werkzeuge → Daten exportieren → Beiträge
 * - medien.csv: Medienliste (Export-Plugin) mit Alternativtexten und Bildunterschriften (optional)
 * - --uploads: entpackter Ordner wp-content/uploads der alten Website (statt Download)
 * - --ohne-laden: keine Downloads, nur --uploads und der Zwischenspeicher (Standard .cache/wordpress/)
 *
 * Schreibt (und ersetzt dabei alle bisherigen Datei-Beiträge):
 *   src/content/news/de|en/*.md, src/assets/news/, public/news/archiv/,
 *   src/content/news/weiterleitungen.json (alte Adressen → neue), src/content/news/archiv-bilder.json (Bildmaße),
 *   docs/wordpress-import.md (Bericht zum Durchsehen)
 * Kann beliebig oft laufen; das Ergebnis ist jedes Mal dasselbe.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { stringify } from 'yaml';
import { wxrLesen, csvLesen, medienSammeln, originalUrl } from './lesen.mjs';
import { vorbereiten, wpautop, zuMarkdown, foerderhinweis } from './html.mjs';
import { adresse, rubrik, frist, faktenAus, teaser, titelSauber, paareFinden } from './zuordnen.mjs';
import { Medien } from './medien.mjs';

const WURZEL = resolve(new URL('../..', import.meta.url).pathname);
const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const exportDatei = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!exportDatei) {
  console.error('Aufruf: node scripts/wordpress-import/index.mjs <export.xml> [--medien <medien.csv>] [--ohne-laden]');
  process.exit(1);
}

/** Seiten der alten Website → Seiten der neuen (für Links im Text und Weiterleitungen) */
const SEITEN = {
  '': '', news: 'news/', blog: 'news/', category: 'news/', tag: 'news/',
  tanzkalender: 'termine/', termine: 'termine/', kalender: 'termine/',
  'keep-up-profi-training-dresden': 'profitraining/', 'keep-up': 'profitraining/', profitraining: 'profitraining/', 'profi-training': 'profitraining/',
  'studio-round': '#formate', 'pop-up': '#formate', 'pop-up-exchange': '#formate', 'vision-danceable': '#formate', formate: '#formate',
  'working-communities': 'verein/', 'staff-member': 'verein/', about: 'verein/', 'ueber-uns': 'verein/', team: 'verein/', verein: 'verein/', vorstand: 'verein/',
  'elternschaft-und-kunstbetrieb': 'verein/', 'tanzpakt-in-residence': 'verein/', tanzpakt: 'verein/',
  kontakt: 'kontakt/', contact: 'kontakt/', impressum: 'impressum/', datenschutz: 'datenschutz/', datenschutzerklaerung: 'datenschutz/',
  'mitglied-werden': 'mitglied-werden/', mitgliedschaft: 'mitglied-werden/', mitglieder: 'netzwerk/', netzwerk: 'netzwerk/',
  kooperationen: 'kooperationen/', partner: 'kooperationen/', spenden: 'spenden/',
};

const DE_WORT = /\b(und|der|die|das|mit|für|nicht|eine?n?|wir|sich|auf|ist|im|zum|zur|von|bei|euch)\b/gi;
const EN_WORT = /\b(and|the|with|for|not|an?|we|is|are|this|our|you|of|at|will|from)\b/gi;
const sprache = (txt) => {
  const de = (txt.match(DE_WORT) ?? []).length, en = (txt.match(EN_WORT) ?? []).length;
  return en > 10 && en > de * 2.5 ? 'en' : 'de';
};
const autorName = (a) => (/^presse$/i.test(a) || !a ? 'TanzNetzDresden' : a.charAt(0).toUpperCase() + a.slice(1));

async function parallel(liste, n, f) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < liste.length) { const k = i++; await f(liste[k], k); } }));
}

// ---------- Einlesen ----------
const { items, basis } = wxrLesen(exportDatei);
const csv = opt('--medien') ? csvLesen(opt('--medien')) : [];
const medien = medienSammeln(items, csv);
const host = new URL(basis).hostname.replace(/^www\./, '');
const eigen = (u) => { try { return new URL(u, basis).hostname.replace(/^www\./, '') === host; } catch { return false; } };

const roh = items.filter((i) => i.typ === 'post' && (i.status === 'publish' || i.status === 'draft'));
const beitraege = roh.map((p) => {
  const datum = (p.datum.startsWith('0000') ? p.geaendert : p.datum).slice(0, 10);
  const text = p.inhalt.replace(/<[^>]+>/g, ' ');
  const tags = p.kategorien.filter((k) => k.art === 'post_tag').map((k) => k.slug);
  return {
    p, id: p.id, titel: titelSauber(p.titel), datum, tags,
    englisch: tags.includes('english') && sprache(`${p.titel} ${text}`) === 'en',
    titelbild: p.meta._thumbnail_id?.[0] ?? '',
    entwurf: p.status === 'draft',
  };
}).sort((a, b) => a.datum.localeCompare(b.datum) || Number(a.id) - Number(b.id));

const paare = paareFinden(beitraege); // englische id → deutsche id
const istEn = new Set(paare.keys());
const vergeben = new Set();
for (const b of beitraege) {
  if (istEn.has(b.id)) continue;
  let a = adresse(b.p.slug, b.titel);
  for (let i = 2; vergeben.has(a); i++) a = `${adresse(b.p.slug, b.titel)}-${i}`;
  vergeben.add(a);
  b.adresse = a;
}
const nachId = new Map(beitraege.map((b) => [b.id, b]));
for (const [en, de] of paare) nachId.get(en).adresse = nachId.get(de).adresse;

// alte Adressen → neue (aktuelle Slugs; frühere nur, wenn eindeutig)
const ziel = (b) => (istEn.has(b.id) ? `en/news/${b.adresse}/` : `news/${b.adresse}/`);
const weiter = new Map();
for (const b of beitraege) if (b.p.slug && !b.entwurf) weiter.set(b.p.slug, ziel(b));
const alteZaehlen = new Map();
for (const b of beitraege) for (const s of new Set(b.p.meta._wp_old_slug ?? [])) alteZaehlen.set(s, (alteZaehlen.get(s) ?? 0) + 1);
for (const b of beitraege) for (const s of new Set(b.p.meta._wp_old_slug ?? [])) if (!b.entwurf && alteZaehlen.get(s) === 1 && !weiter.has(s)) weiter.set(s, ziel(b));
const nachSlug = new Map(weiter);

// ---------- Medien ----------
const laden = !args.includes('--ohne-laden');
const m = new Medien({ wurzel: WURZEL, cache: resolve(opt('--cache') ?? join(WURZEL, '.cache/wordpress')), laden, uploads: opt('--uploads') ? resolve(opt('--uploads')) : null });
const quelleVon = (src) => {
  if (!src) return null;
  let abs;
  try { abs = new URL(src.replace(/&amp;/g, '&'), basis).href; } catch { return null; }
  if (!eigen(abs) || !/wp-content\/uploads\//.test(abs)) return null;
  const o = originalUrl(abs);
  return { url: o, medium: medien.nachUrl.get(o), abs };
};
const gebraucht = { titel: new Set(), text: new Set(), datei: new Set() };
// Ersatzadressen, falls das Original fehlt (z. B. als BMP hochgeladen): Fassung im Text, „Große URL“ der Medienliste
const ersatz = new Map();
const ersatzDazu = (url, ...u) => { const s = ersatz.get(url) ?? new Set(); for (const x of u) if (x) s.add(x.replace(/^http:\/\//, 'https://')); ersatz.set(url, s); };
for (const b of beitraege) {
  const t = medien.nachId.get(b.titelbild);
  if (t && !istEn.has(b.id)) { gebraucht.titel.add(t.url); ersatzDazu(t.url, t.gross); }
  for (const [, src] of b.p.inhalt.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gi)) { const q = quelleVon(src); if (q) { gebraucht.text.add(q.url); ersatzDazu(q.url, q.medium?.gross, q.abs); } }
  for (const [, ids] of b.p.inhalt.matchAll(/\[gallery\b[^\]]*ids="([^"]+)"/gi)) for (const id of ids.split(',')) { const x = medien.nachId.get(id.trim()); if (x) { gebraucht.text.add(x.url); ersatzDazu(x.url, x.gross); } }
  for (const [, h] of b.p.inhalt.matchAll(/href="([^"]+)"/gi)) { const q = quelleVon(h); if (q && !/\.(jpe?g|png|gif|webp|svg)$/i.test(q.url)) gebraucht.datei.add(q.url); }
}
const aufgabe = [...[...gebraucht.titel].map((u) => [u, 'titel']), ...[...gebraucht.text].map((u) => [u, 'text']), ...[...gebraucht.datei].map((u) => [u, 'datei'])];
console.log(`Medien: ${gebraucht.titel.size} Titelbilder, ${gebraucht.text.size} Bilder im Text, ${gebraucht.datei.size} Dateien${laden ? '' : ' (ohne Laden)'}`);
for (const d of ['src/assets/news', 'public/news/archiv']) rmSync(join(WURZEL, d), { recursive: true, force: true });
const fertig = new Map();
let n = 0;
await parallel(aufgabe, 6, async ([u, art]) => {
  fertig.set(`${art}:${u}`, await m.aufbereiten(u, art, [...(ersatz.get(u) ?? [])]));
  if (++n % 50 === 0) console.log(`  … ${n}/${aufgabe.length}`);
});
const bildmasse = {};
for (const [k, v] of fertig) if (v && k.startsWith('text:')) bildmasse[v.pfad] = [v.breite, v.hoehe];

// ---------- Umwandeln ----------
const bericht = [];
const ausgabe = [];
for (const b of beitraege) {
  const hinweise = new Set();
  const en = istEn.has(b.id);
  const lang = en || b.englisch ? 'en' : 'de';
  const cover = medien.nachId.get(b.titelbild);
  const coverBild = cover && !en ? fertig.get(`titel:${cover.url}`) : null;
  if (cover && !en && !coverBild) hinweise.add(`Titelbild fehlt: ${m.fehler.get(cover.url) ?? cover.url}`);
  let coverImText = false;
  const textBild = (url, medium) => {
    const f = fertig.get(`text:${url}`);
    if (!f) return null;
    return { datei: f.pfad, alt: medium?.alt ?? '', beschriftung: medium?.beschriftung ?? '' };
  };
  const bild = (src) => {
    const q = quelleVon(src);
    if (!q) { hinweise.add(`Bild von außerhalb nicht übernommen: ${src}`); return null; }
    // Titelbild steht schon oben im Beitrag
    if (cover && q.url === cover.url && !coverImText) { coverImText = true; return null; }
    return textBild(q.url, q.medium) ?? (hinweise.add(`Bild fehlt: ${m.fehler.get(q.url) ?? q.url}`), null);
  };
  const galerie = (ids) => ids.map((id) => medien.nachId.get(id)).filter(Boolean).map((x) => textBild(x.url, x) ?? (hinweise.add(`Galeriebild fehlt: ${m.fehler.get(x.url) ?? x.url}`), null)).filter(Boolean);
  const link = (href) => {
    if (/^mailto:/i.test(href)) return href.replace(/\?.*$/, '');
    if (/^#/.test(href)) return null;
    let u;
    try { u = new URL(href.replace(/&amp;/g, '&'), basis); } catch { hinweise.add(`Link unlesbar: ${href}`); return null; }
    if (!/^https?:$/.test(u.protocol)) return null;
    if (!eigen(u.href)) return u.href;
    if (/wp-content\/uploads\//.test(u.pathname)) {
      if (/\.(jpe?g|png|gif|webp|svg)$/i.test(u.pathname)) return null;
      const f = fertig.get(`datei:${originalUrl(u.href)}`);
      if (f) return f.pfad;
      hinweise.add(`Datei fehlt: ${u.pathname}`);
      return null;
    }
    const teile = decodeURIComponent(u.pathname).replace(/^\/|\/$/g, '').split('/');
    if (teile.length === 1 && nachSlug.has(teile[0])) return `/${nachSlug.get(teile[0])}`;
    if (u.searchParams.get('p') && nachId.get(u.searchParams.get('p'))) return `/${ziel(nachId.get(u.searchParams.get('p')))}`;
    if (teile[0] in SEITEN) return `/${SEITEN[teile[0]]}`;
    hinweise.add(`Link auf alte Seite entfernt: ${u.pathname}`);
    return null;
  };
  const umwandeln = (html) => zuMarkdown(wpautop(vorbereiten(html, hinweise)), { bild, galerie, link, hinweise, sprache: lang });

  const { html, hinweis } = foerderhinweis(b.p.inhalt);
  let md = umwandeln(html);
  const hinweisMd = hinweis ? umwandeln(hinweis).replace(/^::: bilder[\s\S]*?\n:::$/gm, '').trim() : '';
  const fa = faktenAus(md);
  md = fa.md;
  const te = teaser(b.p.auszug, md);
  md = te.md;
  if (hinweisMd) md += `\n\n::: hinweis\n${hinweisMd}\n:::`;
  const r = rubrik(b.titel, b.tags);
  const fr = r.rubrik === 'Ausschreibung' ? frist(b.titel, fa.fakten, b.datum) : { frist: null, grund: '' };
  if (!te.teaser) hinweise.add('Kein Teaser gefunden');
  if (r.rubrik === 'Ausschreibung' && !fr.frist) hinweise.add('Ausschreibung ohne erkennbare Frist');

  const front = en
    ? { title: b.titel, teaser: te.teaser || b.titel, ...(fa.fakten.length ? { facts: fa.fakten } : {}) }
    : {
        title: b.titel,
        date: b.datum,
        category: r.rubrik,
        author: autorName(b.p.autor),
        ...(coverBild ? { image: `../../../assets/news/${coverBild.pfad}`, alt: cover.alt || '' } : {}),
        ...(fr.frist ? { deadline: fr.frist } : {}),
        ...(b.entwurf ? { draft: true } : {}),
        teaser: te.teaser || b.titel,
        ...(fa.fakten.length ? { facts: fa.fakten } : {}),
      };
  if (front.alt === '') delete front.alt;
  ausgabe.push({ ordner: en ? 'en' : 'de', datei: `${b.adresse}.md`, inhalt: `---\n${stringify(front, { lineWidth: 0 }).trim()}\n---\n\n${md.trim()}\n` });
  bericht.push({ b, en, rubrik: r, frist: fr, hinweise: [...hinweise], lang, fakten: fa.fakten.length, bild: Boolean(coverBild) });
}

// ---------- Schreiben ----------
for (const o of ['de', 'en']) {
  const dir = join(WURZEL, 'src/content/news', o);
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) if (f.endsWith('.md')) rmSync(join(dir, f));
}
for (const a of ausgabe) writeFileSync(join(WURZEL, 'src/content/news', a.ordner, a.datei), a.inhalt);

// Adressen, die es auf der neuen Website gibt, bleiben unangetastet
const vorhanden = new Set(readdirSync(join(WURZEL, 'src/pages')).map((f) => f.replace(/\.(astro|ts)$/, '')));
const weiterleitungen = Object.fromEntries(
  [...Object.entries(SEITEN).filter(([k, v]) => k && v), ['category/news', 'news/'], ['feed', 'news/'], ...[...weiter].sort()]
    .filter(([k]) => !vorhanden.has(k.split('/')[0]) && !k.startsWith('[')),
);
writeFileSync(join(WURZEL, 'src/content/news/weiterleitungen.json'), JSON.stringify(weiterleitungen, null, 1) + '\n');
writeFileSync(join(WURZEL, 'src/content/news/archiv-bilder.json'), JSON.stringify(Object.fromEntries(Object.entries(bildmasse).sort()), null, 1) + '\n');

// ---------- Bericht ----------
const zahl = (f) => bericht.filter(f).length;
const rubriken = {};
for (const x of bericht.filter((x) => !x.en)) rubriken[x.rubrik.rubrik] = (rubriken[x.rubrik.rubrik] ?? 0) + 1;
const zeilen = bericht.filter((x) => !x.en).map((x) => {
  const enId = [...paare].find(([, d]) => d === x.b.id)?.[0];
  return `| ${x.b.datum} | [${x.b.titel.replace(/\|/g, '/')}](../src/content/news/de/${x.b.adresse}.md)${x.b.entwurf ? ' *(Entwurf)*' : ''} | ${x.rubrik.rubrik} | ${x.frist.frist ?? ''} | ${enId ? 'ja' : x.lang === 'en' ? 'Text englisch' : ''} | ${x.hinweise.length ? x.hinweise.map((h) => h.replace(/\|/g, '/')).join('<br>') : ''} |`;
});
const fehlend = [...m.fehler].map(([u, e]) => `- ${u.replace(basis, '')}: ${e}`);
const text = `# WordPress-Import: Bericht

Erzeugt von \`scripts/wordpress-import/\` aus dem Export der alten Website (${basis}). Diese Datei entsteht bei jedem
Lauf neu. Anleitung und Regeln: [news.md](news.md#alte-beiträge-aus-wordpress).

## Überblick

- **${zahl((x) => !x.en)} Beiträge** übernommen (${zahl((x) => !x.en && x.b.entwurf)} davon als Entwurf), **${paare.size} mit englischer Fassung**, ${zahl((x) => !x.en && x.lang === 'en')} nur auf Englisch geschrieben.
- Rubriken: ${Object.entries(rubriken).map(([k, v]) => `${k} ${v}`).join(', ')}. Erkannt am Titel, sonst „Netzwerk“; bitte stichprobenartig prüfen.
- Fristen erkannt: ${zahl((x) => x.frist.frist)}. Titelbild: ${zahl((x) => !x.en && x.bild)} von ${zahl((x) => !x.en)}.
- „Auf einen Blick“ aus beschrifteten Zeilen (Datum, Ort, Eintritt …): ${zahl((x) => !x.en && x.fakten)} Beiträge.
- Weiterleitungen von alten Adressen: ${Object.keys(weiterleitungen).length}.
- Medien: ${fertig.size - m.fehler.size} übernommen, ${m.fehler.size} fehlen.

## Beiträge

| Datum | Titel | Rubrik | Frist | Englisch | Hinweise |
|---|---|---|---|---|---|
${zeilen.reverse().join('\n')}
${fehlend.length ? `\n## Fehlende Medien\n\n${fehlend.join('\n')}\n` : ''}`;
writeFileSync(join(WURZEL, 'docs/wordpress-import.md'), text);
console.log(`Fertig: ${ausgabe.length} Dateien, ${paare.size} englische Fassungen, ${m.fehler.size} Medien fehlen. Bericht: docs/wordpress-import.md`);
if (!existsSync(join(WURZEL, '.gitignore'))) console.warn('Hinweis: .cache/ gehört in .gitignore');
