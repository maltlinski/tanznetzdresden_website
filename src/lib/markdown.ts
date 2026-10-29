/**
 * Markdown aus dem News-Editor (interner Bereich) in HTML umwandeln – beim Build
 * und für die Vorschau im Browser. Eigenes HTML ist nicht erlaubt (wird als Text
 * angezeigt), Links nur zu http(s), mailto und Seiten der Website.
 *
 * Zusätzlich Abschnitte aus dem Editor (src/lib/news-bloecke.ts):
 *   ::: bilder … :::   ein Foto oder eine Galerie (Großansicht per Klick, src/scripts/lightbox.ts)
 *   ::: hinweis … :::  abgesetzter Kasten, z. B. Förderhinweis
 * Bilder zeigen beim Build zunächst auf Supabase; src/lib/news.ts ersetzt sie durch optimierte Dateien.
 */
import { Marked, type Tokens } from 'marked';
import { bilderLesen } from './news-bloecke';
import { SUPABASE_URL } from './supabase-config';

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const safeHref = (href: string) => /^(https?:|mailto:|\/(?!\/)|#)/i.test(href.trim());

export interface MarkdownOptionen {
  /** Sprache für „Foto:“/„Photo:“ */
  lang?: 'de' | 'en';
  /** Adresse einer Bilddatei (Standard: Bucket „newsbilder“ in Supabase) */
  bildUrl?: (datei: string) => string;
}

/** Adresse eines Bildes aus einem Bilder-Abschnitt */
export function newsBildUrl(datei: string, base = '/'): string {
  // Foto aus src/assets/photos/: löst src/lib/news.ts beim Build auf
  if (/^https:\/\//i.test(datei) || datei.startsWith('../')) return datei;
  if (datei.startsWith('/')) return base.replace(/\/$/, '') + datei;
  return `${SUPABASE_URL}/storage/v1/object/public/newsbilder/${datei.split('/').map(encodeURIComponent).join('/')}`;
}

interface Direktive extends Tokens.Generic {
  type: 'direktive';
  art: 'bilder' | 'hinweis';
  inhalt: string;
}

export function renderMarkdown(src: string, base = '/', opt: MarkdownOptionen = {}): string {
  const prefix = base.replace(/\/$/, '');
  const bildUrl = opt.bildUrl ?? ((d: string) => newsBildUrl(d, base));
  const fotoWort = (n: number) => (opt.lang === 'en' ? (n > 1 ? 'Photos' : 'Photo') : n > 1 ? 'Fotos' : 'Foto');
  // Link zur Großansicht braucht einen Namen, wenn das Foto keine Bildbeschreibung hat
  const vergroessern = opt.lang === 'en' ? 'Enlarge photo' : 'Foto vergrößern';
  const md = new Marked({ gfm: true, breaks: false });
  md.use({
    extensions: [
      {
        name: 'direktive',
        level: 'block',
        start: (s: string) => s.match(/^::: ?(bilder|hinweis)[ \t]*$/m)?.index,
        tokenizer(s: string) {
          const m = /^::: ?(bilder|hinweis)[ \t]*\n([\s\S]*?)\n:::[ \t]*(?:\n+|$)/.exec(s);
          if (!m) return undefined;
          const token: Direktive = { type: 'direktive', raw: m[0], art: m[1] as Direktive['art'], inhalt: m[2], tokens: [] };
          if (token.art === 'hinweis') this.lexer.blockTokens(m[2], token.tokens);
          return token;
        },
        renderer(token) {
          const t = token as Direktive;
          if (t.art === 'hinweis') return `<div class="nh" role="note">${this.parser.parse(t.tokens ?? [])}</div>\n`;
          const b = bilderLesen(t.inhalt);
          if (!b.bilder.length) return '';
          const n = b.bilder.length;
          const neben = n === 1 && b.darstellung === 'neben';
          const sizes = neben
            ? '(min-width: 800px) 340px, 100vw'
            : n === 1
              ? '(min-width: 800px) 720px, 100vw'
              : `(min-width: 800px) ${Math.round(720 / b.spalten)}px, 50vw`;
          const cls = ['nb', `nb--${b.format}`, neben && 'nb--neben', n > 1 && `nb--galerie nb--sp${b.spalten}`].filter(Boolean).join(' ');
          const items = b.bilder
            .map((x) => {
              const url = escape(bildUrl(x.datei));
              const pos = x.fokus ? ` style="object-position:${x.fokus}"` : '';
              const name = x.alt.trim() ? '' : ` aria-label="${vergroessern}"`;
              return `<a class="nb__item" href="${url}" data-lightbox data-bild="${escape(x.datei)}"${name}><img src="${url}" alt="${escape(x.alt)}" loading="lazy" decoding="async" sizes="${sizes}"${pos}></a>`;
            })
            .join('');
          const cap = [
            b.text && `<span class="nb__text">${escape(b.text)}</span>`,
            b.foto && `<span class="nb__credit">${fotoWort(n)}: ${escape(b.foto)}</span>`,
          ].filter(Boolean).join(' ');
          return `<figure class="${cls}"><div class="nb__grid">${items}</div>${cap ? `<figcaption class="nb__cap">${cap}</figcaption>` : ''}</figure>\n`;
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
