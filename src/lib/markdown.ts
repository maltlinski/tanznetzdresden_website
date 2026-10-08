/**
 * Markdown aus dem News-Editor (interner Bereich) in HTML umwandeln – beim Build
 * und für die Vorschau im Browser. Eigenes HTML ist nicht erlaubt (wird als Text
 * angezeigt), Links nur zu http(s), mailto und Seiten der Website.
 */
import { Marked } from 'marked';

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const safeHref = (href: string) => /^(https?:|mailto:|\/(?!\/)|#)/i.test(href.trim());

export function renderMarkdown(src: string, base = '/'): string {
  const prefix = base.replace(/\/$/, '');
  const md = new Marked({ gfm: true, breaks: false });
  md.use({
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
        // Bilder nur über das Fotofeld, nicht im Text
        return escape(text);
      },
    },
  });
  return md.parse(src ?? '', { async: false });
}
