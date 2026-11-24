#!/usr/bin/env node
/**
 * Typografie und Schreibweisen der übernommenen Beiträge bereinigen (src/content/news/de|en/*.md).
 * Ändert nur Zeichen und Schreibweisen, nie den Wortlaut:
 *
 * - Anführungszeichen je Sprache des Absatzes: deutsch „…“, englisch “…”; gemischte („…" / „…”) werden gerade gezogen
 * - Apostroph ’ statt ', Auslassungspunkte … statt ...
 * - Gedankenstrich – statt „ - “, Halbgeviertstrich in Spannen (10:00–16:00 Uhr, 2023–2024, 11.–15.03.)
 * - Uhrzeiten mit Doppelpunkt (10.30 Uhr → 10:30 Uhr), Abkürzungen mit Leerzeichen (z.B. → z. B.)
 * - kein Leerzeichen vor Komma/Punkt, eines nach dem Komma zwischen zwei Wörtern
 * - Gendern mit Doppelpunkt (Künstler*innen, KünstlerInnen, Künstler_innen → Künstler:innen)
 * - Vereinsname immer „TanzNetzDresden“ (nicht „Tanznetz Dresden“, „TanznetzDresden“ …)
 * - Zwischenüberschriften ohne Sprung: die erste ist Ebene 2 (der Titel ist Ebene 1), keine Ebene wird übersprungen
 *
 * Geschützt bleiben Adressen (Links, Dateien, E-Mail), HTML-Tags, Code und die Schlüssel der Bilder-Abschnitte.
 * Texte in Bilder-Abschnitten (text, foto, alt) und im Kopf (title, teaser, alt) werden mit bereinigt.
 *
 *   node scripts/wordpress-import/typografie.mjs [--schreiben] [--bericht <datei.md>]
 *
 * Ohne --schreiben nur der Bericht. Kann beliebig oft laufen (ein zweiter Lauf ändert nichts mehr).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';

const WURZEL = 'src/content/news';
const args = process.argv.slice(2);
const schreiben = args.includes('--schreiben');
const berichtDatei = args.includes('--bericht') ? args[args.indexOf('--bericht') + 1] : '';

const DE = new Set('und der die das mit für nicht ist wir sie ein eine einen den dem des auch von zu im bei auf oder wie sich werden wird unsere unser hier mehr alle uns euch ihr am zum zur über nach'.split(' '));
const EN = new Set('the and of with for you your our we are is this that to from in on at be will can more all an by it as'.split(' '));

/** Sprache eines Absatzes: Wörter zählen, bei Gleichstand die Sprache der Datei */
function sprache(text, standard) {
  let de = 0;
  let en = 0;
  for (const w of text.toLowerCase().match(/[a-zäöüß]+/g) ?? []) {
    if (DE.has(w)) de++;
    if (EN.has(w)) en++;
  }
  // nur eindeutige Absätze wechseln die Sprache (kurze Zeilen mit einem englischen Titel bleiben deutsch)
  if (standard === 'de') return en >= 3 && en > 2 * de ? 'en' : 'de';
  return de >= 3 && de > 2 * en ? 'de' : 'en';
}

// Teile, die nie verändert werden: Link-Ziele, Adressen, HTML-Tags, Code, E-Mail
const GESCHUETZT = /(\]\([^)\s]*(?:\s+"[^"]*")?\)|<[^>\n]+>|`[^`\n]*`|https?:\/\/[^\s)\]>]+|www\.[^\s)\]>]+|[\w.+-]+@[\w-]+\.[\w.]+|\b[\w-]+\.(?:webp|jpe?g|png|pdf|gif|svg|html?)\b)/g;

const zaehler = {};
const zaehle = (regel, n = 1) => (zaehler[regel] = (zaehler[regel] ?? 0) + n);
function ersetze(text, regel, rx, ersatz) {
  const neu = text.replace(rx, ersatz);
  if (neu !== text) zaehle(regel, [...text.matchAll(rx)].length);
  return neu;
}

/** Gerade Anführungszeichen in typografische umwandeln: öffnend nach Leerraum oder Klammer, sonst schließend */
function anfuehrung(text, lang, davor) {
  const [auf, zu] = lang === 'de' ? ['„', '“'] : ['“', '”'];
  let n = 0;
  const neu = text.replace(/"/g, (_, i) => {
    n++;
    const vor = i === 0 ? davor : text[i - 1];
    const nach = text[i + 1] ?? ' ';
    return /[\s([{\/–—\-»«*_]/.test(vor) && !/\s/.test(nach) ? auf : zu;
  });
  if (n) zaehle('Anführungszeichen', n);
  return neu;
}

/** Einen ungeschützten Textteil bereinigen (davor: Zeichen vor dem Teil, für die Anführungszeichen) */
function teil(t, lang, davor = ' ') {
  t = ersetze(t, 'Auslassungspunkte', /\.\.\./g, '…');
  // gerades Zeichen zusammen mit einem Guillemet: »…« daraus machen
  t = ersetze(t, 'Anführungszeichen', /"([^"«»\n]{1,120})«/g, '»$1«');
  t = ersetze(t, 'Anführungszeichen', /»([^"«»\n]{1,120})"/g, '»$1«');
  t = anfuehrung(t, lang, davor);
  if (lang === 'de') {
    // gemischt oder englisch in deutschem Text: „…” / “…” → „…“
    t = ersetze(t, 'Anführungszeichen', /„([^“”„"]*)”/g, '„$1“');
    t = ersetze(t, 'Anführungszeichen', /(^|[\s(\[])“([^“”„]+)”/g, '$1„$2“');
    t = ersetze(t, 'Anführungszeichen', /(^|[\s(\[])“([^“”„\n]+)“/g, '$1„$2“');
    t = ersetze(t, 'Anführungszeichen', /(^|[\s(\[])”([^“”„\n]+)«/g, '$1»$2«');
  } else {
    // englischer Absatz: “…”
    t = ersetze(t, 'Anführungszeichen', /„([^“”„\n]*)[“”]/g, '“$1”');
    t = ersetze(t, 'Anführungszeichen', /(^|[\s(\[])“([^“”„\n]+)“/g, '$1“$2”');
  }
  t = ersetze(t, 'Apostroph', /([A-Za-zÄÖÜäöüß])'([A-Za-zÄÖÜäöüß])/g, '$1’$2');
  // Spannen (vor dem Gedankenstrich, damit „10:00 - 16:00“ ohne Leerzeichen zusammenrückt)
  t = ersetze(t, 'Uhrzeit mit Doppelpunkt', /\b(\d{1,2})\.(\d{2})(\s?(?:[–-]|bis)\s?)(\d{1,2})[.:](\d{2})(\s?Uhr)/g, '$1:$2$3$4:$5$6');
  t = ersetze(t, 'Uhrzeit mit Doppelpunkt', /\b(\d{1,2})\.(\d{2})(?=\s?Uhr\b)/g, '$1:$2');
  t = ersetze(t, 'Strich in Spannen', /\b(\d{1,2}:\d{2})\s?[-–]\s?(\d{1,2}:\d{2})\b/g, '$1–$2');
  t = ersetze(t, 'Strich in Spannen', /\b(\d{1,2}(?::\d{2})?)\s?[-–]\s?(\d{1,2}(?::\d{2})?)(?=\s?Uhr\b)/g, '$1–$2');
  t = ersetze(t, 'Strich in Spannen', /\b(Mo|Di|Mi|Do|Fr|Sa|So)\s?-\s?(Mo|Di|Mi|Do|Fr|Sa|So)\b/g, '$1–$2');
  t = ersetze(t, 'Leerzeichen vor Uhr und Monat', /(\d)Uhr\b/g, '$1 Uhr');
  t = ersetze(t, 'Leerzeichen vor Uhr und Monat', /\b(\d{1,2})\.(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\b/g, '$1. $2');
  t = ersetze(t, 'Strich in Spannen', /(?<![\d.\-\/])((?:19|20)\d{2})\s?-\s?((?:19|20)\d{2}|\d{2})(?![\d\-.\/])/g, '$1–$2');
  t = ersetze(t, 'Strich in Spannen', /\b(\d{1,2}\.\d{1,2}\.)\s?\\?-\s?(\d{1,2}\.\d{1,2}\.)/g, '$1–$2');
  t = ersetze(t, 'Strich in Spannen', /(?<![\d.])(\d{1,2}\.)\s?-\s?(\d{1,2}\.)/g, '$1–$2');
  // im Markdown steht der Strich manchmal maskiert („\-“)
  t = ersetze(t, 'Gedankenstrich', /(?<=\S) \\?-{1,2} (?=\S)/g, ' – ');
  t = ersetze(t, 'Abkürzung mit Leerzeichen', /\b(z|u|d|o|v|s)\.(B|a|h|T|U|ä|o|u|v)\.(?:(m)\.)?/g, (m, a, b, c) =>
    `${a}. ${b}.${c ? ` ${c}.` : ''}`);
  t = ersetze(t, 'Leerzeichen vor Satzzeichen', /([A-Za-zÄÖÜäöüß0-9)»“”]) +([,;])(?=\s|$)/g, '$1$2');
  t = ersetze(t, 'Leerzeichen vor Satzzeichen', /([a-zäöüß]) +\.(?=\s*$|\s+[^a-zäöüß\s])/g, '$1.');
  t = ersetze(t, 'Leerzeichen nach Komma', /([A-Za-zÄÖÜäöüß][a-zäöüß]),([A-Za-zÄÖÜäöü]{2})/g, '$1, $2');
  // im Markdown steht das Sternchen maskiert (Künstler\*innen)
  t = ersetze(t, 'Gendern mit Doppelpunkt', /([a-zäöüß])(?:\\?\*|\\?_|\/-?)innen\b/g, '$1:innen');
  t = ersetze(t, 'Gendern mit Doppelpunkt', /([a-zäöüß])\\?\*in\b/g, '$1:in');
  t = ersetze(t, 'Gendern mit Doppelpunkt', /([a-zäöüß])Innen\b/g, '$1:innen');
  t = ersetze(t, 'Vereinsname', /\bTanz(?:Netz Dresden| [Nn]etz ?Dresden|netz ?Dresden|netzdresden)\b(?![.@])/g, 'TanzNetzDresden');
  return t;
}

/** Text einer Zeile bereinigen, geschützte Teile auslassen */
function text(zeile, lang) {
  let davor = ' ';
  return zeile
    .split(GESCHUETZT)
    .map((s, i) => {
      const neu = i % 2 ? s : teil(s, lang, davor);
      if (s) davor = s[s.length - 1];
      return neu;
    })
    .join('');
}

/** YAML-Wert einer Zeile („  alt: …“) bereinigen und sauber neu schreiben */
function yamlZeile(zeile, lang) {
  const m = /^(\s*(?:- )?)([a-z_]+):\s(.*)$/.exec(zeile);
  if (!m || !m[3].trim()) return zeile;
  let wert;
  try {
    wert = parse(m[3]);
  } catch {
    return zeile;
  }
  if (typeof wert !== 'string' || !wert) return zeile;
  const neu = text(wert, sprache(wert, lang));
  if (neu === wert) return zeile;
  return `${m[1]}${m[2]}: ${stringify(neu, { lineWidth: 0 }).trimEnd()}`;
}

/** Zwischenüberschriften: erste Ebene 2, keine übersprungene Ebene */
function ebenen(zeilen) {
  const idx = [];
  let block = false;
  zeilen.forEach((z, i) => {
    if (/^::: ?(bilder|schritte)\s*$/.test(z)) block = true;
    else if (block && /^:::\s*$/.test(z)) block = false;
    else if (!block && /^#{1,6} /.test(z)) idx.push(i);
  });
  if (!idx.length) return;
  const stufen = idx.map((i) => /^#+/.exec(zeilen[i])[0].length);
  const min = Math.min(...stufen);
  const versatz = min >= 3 ? min - 2 : min === 1 ? -1 : 0;
  let vorher = 1;
  idx.forEach((i, k) => {
    const soll = Math.min(stufen[k] - versatz, vorher + 1);
    if (soll !== stufen[k]) {
      zeilen[i] = '#'.repeat(soll) + zeilen[i].slice(stufen[k]);
      zaehle('Überschriften-Ebene');
    }
    vorher = soll;
  });
}

function bereinigen(inhalt, standard) {
  const [, kopf, body] = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(inhalt);
  const kopfNeu = kopf
    .split('\n')
    .map((z) => (/^(title|teaser|alt|title_en|teaser_en):\s/.test(z) ? yamlZeile(z, standard) : z))
    .join('\n');
  const zeilen = body.split('\n').map((z) => {
    // „**### 10:00 Uhr**“ (fett gesetzte Überschrift aus dem Import) → echte Überschrift
    const m = /^\*\*(#{1,6} [^*]+?)\*\*(\s*)$/.exec(z);
    if (!m) return z;
    zaehle('Überschrift statt fettem Text');
    return m[1] + m[2];
  });
  ebenen(zeilen);
  // Absätze (durch Leerzeilen getrennt) bekommen eine gemeinsame Sprache
  let block = '';
  let code = false;
  let absatzLang = standard;
  const neu = zeilen.map((z, i) => {
    if (/^```/.test(z)) {
      code = !code;
      return z;
    }
    if (code) return z;
    const bm = /^::: ?([a-z-]+)\s*$/.exec(z);
    if (bm) {
      block = bm[1];
      return z;
    }
    if (block && /^:::\s*$/.test(z)) {
      block = '';
      return z;
    }
    if (block === 'bilder' || block === 'schritte') return /^\s*(?:- )?(text|foto|alt|titel|beschreibung):\s/.test(z) ? yamlZeile(z, standard) : z;
    if (!z.trim()) return z;
    if (i === 0 || !zeilen[i - 1].trim()) {
      // neuer Absatz: Sprache aus dem ganzen Absatz
      let ende = i;
      while (ende < zeilen.length && zeilen[ende].trim()) ende++;
      absatzLang = sprache(zeilen.slice(i, ende).join(' '), standard);
    }
    // Zeilenanfang (Überschrift, Liste, Zitat, Tabelle) unverändert lassen
    const [, anfang, rest] = /^(\s*(?:#{1,6} |[-*+] |\d+\. |> )*)([\s\S]*)$/.exec(z);
    return anfang + text(rest, absatzLang);
  });
  return `---\n${kopfNeu}\n---\n${neu.join('\n')}`;
}

const bericht = [];
let geaendert = 0;
for (const lang of ['de', 'en']) {
  const dir = join(WURZEL, lang);
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.md')).sort()) {
    const pfad = join(dir, f);
    const alt = readFileSync(pfad, 'utf8');
    const neu = bereinigen(alt, lang);
    if (neu === alt) continue;
    geaendert++;
    const a = alt.split('\n');
    const b = neu.split('\n');
    bericht.push(`\n## ${lang}/${f}\n`);
    a.forEach((z, i) => {
      if (z !== b[i]) bericht.push(`- vorher: ${z.trim().slice(0, 300)}\n  nachher: ${b[i].trim().slice(0, 300)}`);
    });
    if (schreiben) writeFileSync(pfad, neu);
  }
}
const summe = Object.entries(zaehler).filter(([, n]) => n > 0).map(([k, n]) => `- ${k}: ${n}`).join('\n');
const kopfzeilen = `# Typografie der übernommenen Beiträge\n\n${geaendert} Dateien geändert${schreiben ? '' : ' (nur Bericht, nichts geschrieben)'}.\n\n${summe}\n`;
if (berichtDatei) writeFileSync(berichtDatei, kopfzeilen + bericht.join('\n') + '\n');
console.log(kopfzeilen);
