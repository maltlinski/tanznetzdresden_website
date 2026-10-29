/**
 * Inhalt eines WordPress-Beitrags (Classic-Editor, WPBakery-Reste, Shortcodes) in Markdown der Website umwandeln.
 *
 * Ergebnis ist das Format aus src/lib/news-bloecke.ts: Absätze, Zwischentitel (##, ###), Zitate, Listen,
 * Bilder und Galerien als `::: bilder`, Förderhinweise am Ende als `::: hinweis`. Eigenes HTML bleibt nicht übrig
 * (die Website zeigt es nicht an). Videos werden Links (eingebettet würde YouTube/Vimeo ohne Einwilligung laden).
 */
import TurndownService from 'turndown';
import { tables } from 'turndown-plugin-gfm';
import { stringify } from 'yaml';
import { entitaeten, originalUrl } from './lesen.mjs';

const BLOECKE = '(?:table|thead|tfoot|caption|col|colgroup|tbody|tr|td|th|div|dl|dd|dt|ul|ol|li|pre|form|blockquote|address|style|p|h[1-6]|hr|fieldset|legend|section|article|aside|header|footer|nav|figure|figcaption|details|summary|iframe)';

/** Absätze wie WordPress (wpautop): Leerzeile = neuer Absatz, einfacher Zeilenumbruch = <br> */
export function wpautop(html) {
  if (!html.trim()) return '';
  let s = html.replace(/\r\n?/g, '\n') + '\n';
  s = s.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n');
  s = s.replace(new RegExp(`(<${BLOECKE}[\\s/>])`, 'gi'), '\n\n$1');
  s = s.replace(new RegExp(`(</${BLOECKE}>)`, 'gi'), '$1\n\n');
  s = s.replace(/\n\s*\n+/g, '\n\n');
  s = s.split(/\n\s*\n/).filter((t) => t.trim()).map((t) => `<p>${t.trim()}</p>\n`).join('');
  s = s.replace(/<p>\s*<\/p>/g, '');
  s = s.replace(new RegExp(`<p>\\s*(</?${BLOECKE}[^>]*>)\\s*</p>`, 'gi'), '$1');
  s = s.replace(new RegExp(`<p>\\s*(</?${BLOECKE}[^>]*>)`, 'gi'), '$1');
  s = s.replace(new RegExp(`(</?${BLOECKE}[^>]*>)\\s*</p>`, 'gi'), '$1');
  s = s.replace(/\n(?!<\/?(?:p|li|div|ul|ol|h\d|blockquote|figure|dl|dt|dd|table|tr|td|hr|section|iframe)\b)/gi, '<br />\n');
  s = s.replace(new RegExp(`(</?${BLOECKE}[^>]*>)\\s*<br />`, 'gi'), '$1');
  s = s.replace(/<br \/>(\s*<\/?(?:p|li|div|dl|dd|dt|th|pre|td|ul|ol|h\d|blockquote|figure)[^>]*>)/gi, '$1');
  return s;
}

const rot13 = (s) => s.replace(/[a-z]/gi, (c) => String.fromCharCode(((c.toLowerCase().charCodeAt(0) - 97 + 13) % 26) + (c === c.toLowerCase() ? 97 : 65)));
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const VIDEO = /^(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com)\/\S+)$/i;

/**
 * Shortcodes und Plugin-Reste vor dem Umwandeln ersetzen.
 * [gallery ids] → <figure data-galerie>, [caption]…[/caption] → <figure data-caption>,
 * verschlüsselte E-Mail-Links (Email Encoder) → mailto, Video-Adressen in eigener Zeile → <p data-video>.
 */
export function vorbereiten(html, hinweise) {
  let s = html;
  // Email Encoder: <a class="mail-link" data-enc-email="name[at]domain">…</a>
  s = s.replace(/<a\b[^>]*data-enc-email="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, enc, inner) => {
    const klar = inner.replace(/<[^>]+>/g, '').trim();
    const adr = EMAIL.test(klar) ? klar.match(EMAIL)[0] : rot13(enc.replace('[at]', '@'));
    return `<a href="mailto:${adr}">${EMAIL.test(klar) ? adr : klar || adr}</a>`;
  });
  s = s.replace(/\[caption\b[^\]]*\]([\s\S]*?)\[\/caption\]/gi, (_, inner) => {
    const img = inner.match(/<img\b[^>]*>/i)?.[0] ?? '';
    const text = inner.replace(/<a\b[^>]*>\s*(<img\b[^>]*>)\s*<\/a>/gi, '').replace(/<img\b[^>]*>/gi, '').replace(/<[^>]+>/g, '').trim();
    return img ? `\n\n<figure data-caption="${attr(text)}">${img}</figure>\n\n` : text;
  });
  s = s.replace(/\[gallery\b([^\]]*)\]/gi, (_, a) => {
    const ids = a.match(/ids="([^"]+)"/)?.[1] ?? '';
    const spalten = a.match(/columns="(\d)"/)?.[1] ?? '';
    return ids ? `\n\n<figure data-galerie="${ids}" data-spalten="${spalten}">Galerie</figure>\n\n` : '';
  });
  s = s.replace(/^[ \t]*(?:&nbsp;)?[ \t]*(https?:\/\/\S+?)[ \t]*$/gim, (_, roh) => {
    const u = entitaeten(roh);
    return VIDEO.test(u) ? `\n\n<p data-video="${attr(u)}">Video</p>\n\n` : `\n\n<p><a href="${attr(u)}">${attr(u)}</a></p>\n\n`;
  });
  s = s.replace(/\[embed\]([\s\S]*?)\[\/embed\]/gi, (_, u) => `\n\n<p data-video="${attr(u.trim())}">Video</p>\n\n`);
  // übrige Shortcodes entfernen (Inhalt bleibt)
  s = s.replace(/\[\/?([a-z_][a-z0-9_-]*)(?:\s[^\]]*)?\]/gi, (m, name) => {
    if (/^(at|x|i|\d+)$/i.test(name)) return m;
    hinweise.add(`Shortcode [${name}] entfernt`);
    return '';
  });
  return s;
}
const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Förderhinweis am Ende (nach der letzten Trennlinie) erkennen */
const FOERDER = /gefördert|gefoerdert|förderung durch|mit freundlicher unterstützung|funded by|supported by|kulturstiftung|landeshauptstadt dresden|fonds darstellende|neustart kultur|tanzpakt/i;
export function foerderhinweis(html) {
  const teile = html.split(/<hr\b[^>]*>/i);
  if (teile.length < 2) return { html, hinweis: '' };
  const letzter = teile[teile.length - 1];
  const reinText = letzter.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
  if (!FOERDER.test(reinText) || reinText.length > 1400) return { html, hinweis: '' };
  return { html: teile.slice(0, -1).join('<hr />'), hinweis: letzter };
}

/**
 * Umwandeln. `medien.bild(url | id)` liefert { datei, alt, beschriftung, breite, hoehe } oder null,
 * `link(href)` die neue Adresse eines Links (oder null = Link entfernen, Text bleibt).
 */
export function zuMarkdown(html, { bild, galerie, link, hinweise, sprache = 'de' }) {
  const td = new TurndownService({ headingStyle: 'atx', hr: '', bulletListMarker: '-', strongDelimiter: '**', emDelimiter: '*', br: '  ' });
  td.use(tables);
  const marken = [];
  // block: eigener Absatz (Galerie, Bild mit Unterschrift); sonst im Fließtext, bloeckeEinsetzen stellt es vor den Absatz
  const marke = (block, imText = false) => {
    marken.push(block);
    return imText ? `§§B${marken.length - 1}§§` : `\n\n§§B${marken.length - 1}§§\n\n`;
  };
  const bildAus = (img) => {
    const src = img.getAttribute('src') || '';
    const b = bild(src);
    if (!b) {
      if (src) hinweise.add(`Bild fehlt: ${src}`);
      return null;
    }
    const cls = img.getAttribute('class') || '';
    return { ...b, alt: (img.getAttribute('alt') || '').trim() || b.alt, neben: /align(left|right)/.test(cls) && !/size-(large|full)/.test(cls) };
  };
  td.addRule('galerie', {
    filter: (n) => n.nodeName === 'FIGURE' && n.hasAttribute('data-galerie'),
    replacement: (_, n) => {
      const bilder = galerie(n.getAttribute('data-galerie').split(',').map((x) => x.trim()));
      return bilder.length ? marke({ bilder, spalten: Number(n.getAttribute('data-spalten')) || 0 }) : '';
    },
  });
  td.addRule('caption', {
    filter: (n) => n.nodeName === 'FIGURE' && n.hasAttribute('data-caption'),
    replacement: (_, n) => {
      const img = n.querySelector('img');
      const b = img && bildAus(img);
      return b ? marke({ bilder: [b], text: entitaeten(n.getAttribute('data-caption')) }) : '';
    },
  });
  td.addRule('bild', {
    filter: 'img',
    replacement: (_, n) => {
      const b = bildAus(n);
      return b ? marke({ bilder: [b] }, true) : '';
    },
  });
  td.addRule('video', {
    filter: (n) => n.nodeName === 'P' && n.hasAttribute('data-video'),
    replacement: (_, n) => {
      const u = n.getAttribute('data-video');
      const wo = /vimeo/i.test(u) ? 'Vimeo' : 'YouTube';
      return `\n\n[${sprache === 'en' ? `Watch the video on ${wo}` : `Video auf ${wo} ansehen`} ↗](${u.replace(/\)/g, '%29')})\n\n`;
    },
  });
  td.addRule('iframe', {
    filter: 'iframe',
    replacement: (_, n) => {
      const u = n.getAttribute('src') || '';
      return /^https?:/.test(u) ? `\n\n[${sprache === 'en' ? 'Open the embedded content' : 'Eingebetteten Inhalt öffnen'} ↗](${u.replace(/\)/g, '%29')})\n\n` : '';
    },
  });
  td.addRule('link', {
    filter: (n) => n.nodeName === 'A' && n.getAttribute('href'),
    replacement: (inhalt, n) => {
      const text = inhalt.trim();
      if (!text) return '';
      if (/§§B\d+§§/.test(text)) return inhalt; // Bild mit Link: nur das Bild
      const ziel = link(n.getAttribute('href').trim().replace(/^([^()]*)\)+$/, '$1'));
      if (!ziel) return inhalt;
      return `[${text}](${ziel.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/ /g, '%20')})`;
    },
  });
  td.addRule('ueberschrift', {
    filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    replacement: (inhalt, n) => {
      let t = inhalt.replace(/\s*\n+\s*/g, ' ').replace(/\*\*/g, '').replace(/^\*(.*)\*$/, '$1').trim();
      // Bild in der Überschrift: Überschrift bleibt, Bild danach
      const bilder = (t.match(/§§B\d+§§/g) ?? []).map((b) => `\n\n${b}`).join('');
      t = t.replace(/\s*§§B\d+§§\s*/g, ' ').trim();
      if (!t || /^[\s*_+–—-]*$/.test(t)) return bilder ? `${bilder}\n\n` : '';
      const ebene = n.nodeName === 'H1' || n.nodeName === 'H2' ? '##' : '###';
      return `\n\n${ebene} ${t}${bilder}\n\n`;
    },
  });
  td.addRule('dl', { filter: 'dt', replacement: (inhalt) => `\n\n**${inhalt.trim()}**  \n` });
  td.addRule('dd', { filter: 'dd', replacement: (inhalt) => `${inhalt.trim()}\n\n` });
  td.addRule('hr', { filter: 'hr', replacement: () => '\n\n' });
  td.addRule('stil', { filter: ['style', 'script', 'noscript'], replacement: () => '' });

  let md = td.turndown(html);
  md = aufraeumen(md);
  return bloeckeEinsetzen(md, marken);
}

function aufraeumen(md) {
  return md
    .replace(/ /g, ' ')
    // Zeilenumbruch am Ende von Fett/Kursiv („**Text:<br>**“)
    .replace(/([^\s*])  \n(\*{1,3})(?=\n|$)/g, '$1$2')
    .replace(/\*\*\s*\*\*/g, '')
    .replace(/(^|[^*])\*[ \t]+\*(?!\*)/g, '$1 ')
    .replace(/^\s*(\/{3,}|\+{3,}|\*{3,}|•+)\s*$/gm, '')
    .replace(/^[ \t]+$/gm, '')
    .replace(/^(\s*)-\s{2,}/gm, '$1- ')
    .replace(/[ \t]+$/gm, (m) => (m === '  ' ? m : ''))
    .replace(/^\\?[-–—_*+]{3,}\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Bild-Marken durch `::: bilder`-Blöcke ersetzen; aufeinanderfolgende Einzelbilder werden eine Galerie */
function bloeckeEinsetzen(md, marken) {
  // Marke mitten im Absatz → vor den Absatz
  const absaetze = md.split(/\n\n/);
  const out = [];
  for (const a of absaetze) {
    const ms = [...a.matchAll(/§§B(\d+)§§/g)].map((m) => Number(m[1]));
    if (!ms.length) { out.push(a); continue; }
    // Leerzeichen um das Bild bleiben, wie sie sind (sonst „** Name**“); Zeilenumbrüche („  \n“) auch
    const rest = a.replace(/§§B\d+§§/g, '').replace(/(\S)[ \t]{2,}(?=\S)/g, '$1 ').replace(/^[ \t]+/gm, '').trim();
    for (const i of ms) out.push(`§§B${i}§§`);
    if (rest && !/^(\*\*|\*)?\s*(\*\*|\*)?$/.test(rest)) out.push(rest);
  }
  // Folgen von Marken zusammenfassen
  const zus = [];
  for (const a of out) {
    const m = /^§§B(\d+)§§$/.exec(a);
    const vorher = zus[zus.length - 1];
    if (m && Array.isArray(vorher)) vorher.push(marken[Number(m[1])]);
    else zus.push(m ? [marken[Number(m[1])]] : a);
  }
  return zus
    .map((x) => (Array.isArray(x) ? bilderBlock(x) : x))
    .filter((x) => x.trim())
    .join('\n\n');
}

/** Bildunterschrift → Text und Fotonachweis („Foto: Name“, „© Name“) */
export function nachweisTrennen(text) {
  const m = /(?:^|[\s(|•·–-])(?:Fotos?|Photos?|Bild|Credits?|Fotografie|©)\s*[:©]?\s*(?:©\s*)?([^|•·()]+?)\)?\s*$/i.exec(text ?? '');
  if (!m) return { text: (text ?? '').trim(), foto: '' };
  return { text: text.slice(0, m.index).replace(/[\s|•·–(-]+$/, '').trim(), foto: m[1].trim() };
}

function bilderBlock(gruppe) {
  const bilder = gruppe.flatMap((g) => g.bilder);
  const seen = new Set();
  const eindeutig = bilder.filter((b) => !seen.has(b.datei) && seen.add(b.datei));
  if (!eindeutig.length) return '';
  const texte = gruppe.map((g) => g.text).filter(Boolean);
  const beschriftungen = eindeutig.length === 1 ? [eindeutig[0].beschriftung].filter(Boolean) : [];
  const { text, foto } = nachweisTrennen(texte[0] ?? beschriftungen[0] ?? '');
  const d = {};
  if (eindeutig.length === 1 && eindeutig[0].neben) d.darstellung = 'neben';
  if (eindeutig.length > 1) {
    d.format = 'quer';
    const sp = gruppe.find((g) => g.spalten)?.spalten || Math.min(4, eindeutig.length === 4 ? 2 : eindeutig.length);
    d.spalten = Math.min(4, Math.max(2, sp));
  }
  if (text) d.text = text;
  if (foto) d.foto = foto;
  d.bilder = eindeutig.map((b) => ({ datei: b.datei, alt: b.alt || '' }));
  return `::: bilder\n${stringify(d, { lineWidth: 0 }).trim()}\n:::`;
}

export { originalUrl, EMAIL };
