/**
 * Markdown aus dem News-Editor (interner Bereich) in HTML umwandeln – beim Build
 * und für die Vorschau im Browser. Eigenes HTML ist nicht erlaubt (wird als Text
 * angezeigt), Links nur zu http(s), mailto und Seiten der Website.
 *
 * Zusätzlich Abschnitte aus dem Editor (src/lib/news-bloecke.ts):
 *   ::: bilder … :::    ein Foto, Galerie, Bildpaar oder Bildstrecke (Großansicht per Klick, src/scripts/lightbox.ts)
 *   ::: schritte … :::  Bild & Text: das Bild bleibt stehen, die Texte laufen daneben (src/scripts/news-artikel.ts)
 *   ::: hinweis … :::   abgesetzter Kasten, z. B. Förderhinweis
 * Bilder zeigen beim Build zunächst auf Supabase; src/lib/news.ts ersetzt sie durch optimierte Dateien.
 * Jedes Bild bekommt eine Nummer („Abb. 03“, data-k) und seinen Nachweis (data-credit) – daraus entstehen
 * Bildunterschriften, Großansicht und die Bildnachweise am Ende des Beitrags (src/lib/news-artikel.ts).
 */
import { Marked, type Tokens } from 'marked';
import { bilderLesen, schritteLesen, type Bild, type Schritt } from './news-bloecke';
import { SUPABASE_URL } from './supabase-config';
import { texte } from './texte';

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const safeHref = (href: string) => /^(https?:|mailto:|\/(?!\/)|#)/i.test(href.trim());

export interface MarkdownOptionen {
  /** Sprache für „Foto“/„Photo“, „Abb.“/„Fig.“ */
  lang?: 'de' | 'en';
  /** Adresse einer Bilddatei (Standard: Bucket „newsbilder“ in Supabase) */
  bildUrl?: (datei: string) => string;
  /** Zähler für die Bildnummern – teilen, wenn ein Text in Teilen umgewandelt wird (Vorschau) */
  abb?: { n: number };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Adresse eines Bildes aus einem Bilder-Abschnitt */
export function newsBildUrl(datei: string, base = '/'): string {
  // Foto aus src/assets/photos/: löst src/lib/news.ts beim Build auf
  if (/^https:\/\//i.test(datei) || datei.startsWith('../')) return datei;
  if (datei.startsWith('/')) return base.replace(/\/$/, '') + datei;
  return `${SUPABASE_URL}/storage/v1/object/public/newsbilder/${datei.split('/').map(encodeURIComponent).join('/')}`;
}

interface Direktive extends Tokens.Generic {
  type: 'direktive';
  art: 'bilder' | 'hinweis' | 'schritte';
  inhalt: string;
}

export function renderMarkdown(src: string, base = '/', opt: MarkdownOptionen = {}): string {
  const prefix = base.replace(/\/$/, '');
  const bildUrl = opt.bildUrl ?? ((d: string) => newsBildUrl(d, base));
  const t = texte(opt.lang ?? 'de', 'news', 'beitrag');
  const abb = opt.abb ?? { n: 0 };
  const nummer = () => `${t.fig} ${pad(++abb.n)}`;
  const nachweis = (n: number, wer: string) => (wer ? `<span class="nb__credit">${n > 1 ? t.photos : t.credit} · ${escape(wer)}</span>` : '');
  const anzahl = (n: number) => `${n} ${n === 1 ? t.image : t.images}`;

  // Link zur Großansicht braucht einen Namen, wenn das Foto keine Bildbeschreibung hat
  const vergroessern = opt.lang === 'en' ? 'Enlarge photo' : 'Foto vergrößern';

  /** Foto als Link zur Großansicht; data-k, data-cap und data-credit lesen Großansicht und Bildnachweise */
  const foto = (x: Bild, k: string, cap: string, wer: string, sizes: string) => {
    const url = escape(bildUrl(x.datei));
    const pos = x.fokus ? ` style="object-position:${x.fokus}"` : '';
    const name = x.alt.trim() ? '' : ` aria-label="${vergroessern}"`;
    return `<a class="nb__item" href="${url}" data-lightbox data-bild="${escape(x.datei)}" data-k="${escape(k)}" data-cap="${escape(cap)}" data-credit="${escape(wer)}"${name}><img src="${url}" alt="${escape(x.alt)}" loading="lazy" decoding="async" sizes="${sizes}"${pos}></a>`;
  };

  function bilder(inhalt: string) {
    const b = bilderLesen(inhalt);
    const n = b.bilder.length;
    if (!n) return '';
    const wer = (x: Bild) => x.foto || b.foto;
    const darstellung = n === 1 && (b.darstellung === 'paar' || b.darstellung === 'strecke') ? 'raster' : b.darstellung;

    if (darstellung === 'paar') {
      const ks = b.bilder.map(nummer);
      const items = b.bilder.map((x, j) => foto(x, ks[j], x.text || b.text, wer(x), '(min-width: 1060px) 520px, 100vw')).join('');
      const caps = b.bilder.map((x, j) => `<span class="nb__einzel"><span class="nb__k">${ks[j]}</span>${escape(x.text ?? '')}</span>`).join('');
      const namen = [...new Set(b.bilder.map(wer).filter(Boolean))].join(', ');
      const text = b.text && !b.bilder.some((x) => x.text) ? `<span class="nb__text">${escape(b.text)}</span>` : '';
      return `<figure class="nb nb--paar"><div class="nb__reihe">${items}</div><figcaption class="nb__cap">${caps}${text}${nachweis(2, namen)}</figcaption></figure>\n`;
    }

    if (darstellung === 'strecke') {
      const titel = b.titel || t.strip;
      const items = b.bilder
        .map((x) => {
          const k = nummer();
          const cap = x.text || '';
          return `<div class="nb__bild">${foto(x, k, cap || b.text, wer(x), '(min-width: 800px) 780px, 90vw')}<p class="nb__cap"><span class="nb__k">${k}</span>${escape(cap)}</p></div>`;
        })
        .join('');
      const namen = [...new Set(b.bilder.map(wer).filter(Boolean))].join(', ');
      return (
        `<figure class="nb nb--strecke" data-strecke><figcaption class="nb__kopf"><div class="nb__kopf-text">` +
        `<span class="tag" style="--tag-color: var(--cyan)">${t.strip} · ${anzahl(n)}</span><span class="nb__titel">${escape(titel)}</span>` +
        `${b.text ? `<span class="nb__text">${escape(b.text)}</span>` : ''}${nachweis(n, namen)}</div>` +
        `<div class="nb__steuer" data-strecke-steuer hidden><button type="button" data-strecke-zurueck aria-label="${opt.lang === 'en' ? 'Back' : 'Zurück'}">←</button>` +
        `<button type="button" data-strecke-weiter aria-label="${opt.lang === 'en' ? 'Next' : 'Weiter'}">→</button>` +
        `<button type="button" class="nb__voll" data-strecke-voll>${t.fullscreen}</button></div></figcaption>` +
        `<div class="nb__spur" data-spur tabindex="0" role="region" aria-label="${escape(`${t.strip}: ${titel}`)}">${items}</div></figure>\n`
      );
    }

    const neben = n === 1 && darstellung === 'neben';
    const sizes = neben
      ? '(min-width: 800px) 340px, 100vw'
      : n === 1
        ? b.breite === 'randlos' ? '100vw' : b.breite === 'weit' ? '(min-width: 1060px) 1040px, 100vw' : '(min-width: 800px) 720px, 100vw'
        : `(min-width: 1060px) ${Math.round(1040 / b.spalten)}px, 50vw`;
    const cls = ['nb', `nb--${b.format}`, neben && 'nb--neben', n === 1 && !neben && `nb--einzel nb--${b.breite}`, n > 1 && `nb--galerie nb--sp${b.spalten}`].filter(Boolean).join(' ');
    const ks = b.bilder.map(nummer);
    const items = b.bilder.map((x, j) => foto(x, ks[j], x.text || b.text, wer(x), sizes)).join('');
    const k = n === 1 ? ks[0] : `${ks[0]}–${ks[n - 1].replace(/^\D+/, '')}`;
    const cap = [
      `<span class="nb__k">${k}</span>`,
      b.text && `<span class="nb__text">${escape(b.text)}</span>`,
      nachweis(n, b.foto || [...new Set(b.bilder.map(wer).filter(Boolean))].join(', ')),
    ].filter(Boolean).join('');
    return `<figure class="${cls}"><div class="nb__grid">${items}</div><figcaption class="nb__cap">${cap}</figcaption></figure>\n`;
  }

  /** Bild & Text: Bilder übereinander (das passende wird sichtbar), daneben die Schritte */
  function schritte(inhalt: string) {
    const b = schritteLesen(inhalt);
    const n = b.schritte.length;
    if (!n) return '';
    const titel = b.titel || t.steps;
    const mitBild = b.schritte.filter((x) => x.datei);
    const zahl = (i: number) => `${pad(i + 1)} / ${pad(n)}`;
    const bilderHtml = b.schritte
      .map((x: Schritt, i) => {
        if (!x.datei) return '';
        const url = escape(bildUrl(x.datei));
        const pos = x.fokus ? ` style="object-position:${x.fokus}"` : '';
        return `<img class="ns__bild" src="${url}" alt="${escape(x.alt)}" loading="lazy" decoding="async" sizes="(min-width: 900px) 760px, 100vw" data-schritt-bild="${i}" data-k="${escape(nummer())}" data-credit="${escape(x.foto || b.foto)}"${pos}>`;
      })
      .join('');
    const teile = b.schritte
      .map((x, i) => {
        const wer = x.foto || b.foto;
        return `<div class="ns__schritt" data-schritt="${i}"><span class="ns__k">${zahl(i)}</span>${x.titel ? `<h4 class="ns__h">${escape(x.titel)}</h4>` : ''}` +
          `${x.text ? `<p class="ns__p">${escape(x.text).replace(/\n/g, '<br>')}</p>` : ''}${wer ? `<span class="ns__credit">${t.credit} · ${escape(wer)}</span>` : ''}</div>`;
      })
      .join('');
    return (
      `<section class="ns" data-schritte aria-label="${escape(`${t.steps}: ${titel}`)}"><div class="ns__innen">` +
      `<div class="ns__medien"><div class="ns__rahmen">${bilderHtml}<span class="ns__zahl" data-schritt-zahl aria-hidden="true">${zahl(0)}</span></div></div>` +
      `<div class="ns__texte"><div class="ns__kopf"><span class="tag">${t.steps} · ${anzahl(mitBild.length)}</span><h3 class="ns__titel">${escape(titel)}</h3></div>${teile}</div>` +
      `</div></section>\n`
    );
  }

  const md = new Marked({ gfm: true, breaks: false });
  md.use({
    extensions: [
      {
        name: 'direktive',
        level: 'block',
        start: (s: string) => s.match(/^::: ?(bilder|hinweis|schritte)[ \t]*$/m)?.index,
        tokenizer(s: string) {
          const m = /^::: ?(bilder|hinweis|schritte)[ \t]*\n([\s\S]*?)\n:::[ \t]*(?:\n+|$)/.exec(s);
          if (!m) return undefined;
          const token: Direktive = { type: 'direktive', raw: m[0], art: m[1] as Direktive['art'], inhalt: m[2], tokens: [] };
          if (token.art === 'hinweis') this.lexer.blockTokens(m[2], token.tokens);
          return token;
        },
        renderer(token) {
          const d = token as Direktive;
          if (d.art === 'hinweis') return `<div class="nh" role="note">${this.parser.parse(d.tokens ?? [])}</div>\n`;
          return d.art === 'schritte' ? schritte(d.inhalt) : bilder(d.inhalt);
        },
      },
    ],
    renderer: {
      html({ text }) {
        return escape(text);
      },
      link({ href, tokens }) {
        const text = this.parser.parseInline(tokens);
        if (!safeHref(href)) return text;
        const url = href.startsWith('/') ? prefix + href : href;
        const external = /^https?:/i.test(url);
        return `<a href="${escape(url)}"${external ? ' rel="noopener" target="_blank"' : ''}>${text}</a>`;
      },
      image({ text }) {
        // Bilder nur über Bilder-Abschnitte, nicht als Markdown-Bild im Text
        return escape(text);
      },
    },
  });
  return md.parse(src ?? '', { async: false });
}
