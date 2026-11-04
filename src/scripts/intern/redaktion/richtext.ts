/**
 * Text-Editor der Redaktion (TipTap): man sieht fett, kursiv, Listen und Links direkt, statt Markdown-Zeichen
 * zu tippen. Gespeichert wird weiter Markdown (wie bisher), damit sich an Dateien, Website und Prüfungen nichts
 * ändert; die Funktion „inhalte“ lehnt eigenes HTML weiterhin ab.
 *
 * Werkzeugleiste bewusst klein: Zwischenüberschrift, Fett, Kursiv, Liste, Link (dazu „Bild aus Medien“, wo die
 * Seite Bilder-Abschnitte zeigt). Zitate, nummerierte Listen und Bilder-Abschnitte aus vorhandenen Texten bleiben
 * erhalten; Bilder-Abschnitte stehen als Kasten im Text und werden unverändert zurückgeschrieben.
 *
 * Sicherheit gegen Datenverlust: Bevor der Editor ein Feld übernimmt, wird der Text einmal umgewandelt und wieder
 * zurück. Sieht das Ergebnis auf der Website anders aus als vorher (etwas, das der Editor nicht kennt), bleibt das
 * Feld im Textmodus mit den bisherigen Knöpfen.
 */
import { Editor, Node, mergeAttributes, type JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Marked } from 'marked';
import { DIREKTIVE } from '../../../lib/news-bloecke';
import { renderMarkdown } from '../../../lib/markdown';

const kodieren = (s: string) => encodeURIComponent(s);
const dekodieren = (s: string | null) => {
  try {
    return decodeURIComponent(s ?? '');
  } catch {
    return '';
  }
};

/** Bilder-, Schritte- oder Hinweis-Abschnitt: bleibt als Kasten im Text, wird unverändert gespeichert */
const Roh = Node.create({
  name: 'roh',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return { md: { default: '', parseHTML: (el) => dekodieren(el.getAttribute('data-roh')), renderHTML: (a) => ({ 'data-roh': kodieren(String(a.md)) }) } };
  },
  parseHTML() {
    return [{ tag: 'div[data-roh]' }];
  },
  renderHTML({ HTMLAttributes, node }) {
    const md = String(node.attrs.md);
    const art = /^::: ?(\w+)/.exec(md)?.[1] ?? '';
    const n = (md.match(/^\s*- datei:/gm) ?? []).length;
    const text =
      art === 'bilder' ? `Bilder-Abschnitt · ${n === 1 ? '1 Foto' : `${n} Fotos`}`
      : art === 'schritte' ? 'Schritte mit Fotos'
      : art === 'hinweis' ? 'Hinweis-Kasten'
      : md.startsWith('<!--') ? 'Notiz für die Redaktion (erscheint nicht auf der Website)'
      : md.trimStart().startsWith('|') ? 'Tabelle (im Textmodus bearbeiten)'
      : 'Besonderer Abschnitt (im Textmodus bearbeiten)';
    return ['div', mergeAttributes(HTMLAttributes, { class: 'rt-roh', contenteditable: 'false' }), text];
  },
});

// ---------- Markdown → Editor ----------

const marked = new Marked({ gfm: true, breaks: false });
/** geschützter Kasten: wird nicht bearbeitet und unverändert zurückgeschrieben */
const roh = (md: string) => `<div data-roh="${kodieren(md.trim())}"></div>`;
function zuHtml(md: string): string {
  // Abschnitte (::: bilder …), Tabellen, Notizen und Code als Kasten, alles andere über marked
  const ohne = md.replace(DIREKTIVE, (ganz) => `\n\n${roh(ganz)}\n\n`);
  return marked
    .lexer(ohne)
    .map((t) => (t.type === 'table' || t.type === 'code' || (t.type === 'html' && !t.raw.trimStart().startsWith('<div data-roh=')) ? roh(t.raw) : (marked.parser([t]) as string)))
    .join('\n');
}

// ---------- Editor → Markdown ----------

/**
 * Zeichen schützen, die Markdown sonst als Formatierung liest – aber nur, wo es nötig ist, damit gespeicherte
 * Texte nicht voller Backslashes stehen: [ ] nur vor „(“, * und _ nur, wenn sie paarweise vorkommen.
 */
const escapeText = (t: string) => {
  let x = t.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
  if (/\[[^\]]*\]\(/.test(x)) x = x.replace(/([[\]])/g, '\\$1');
  if ((x.match(/\*/g) ?? []).length > 1) x = x.replace(/\*/g, '\\*');
  if ((x.match(/(^|\W)_|_(\W|$)/g) ?? []).length > 1) x = x.replace(/_/g, '\\_');
  return x;
};
/** Zeilenanfänge, die Markdown sonst als Überschrift, Liste oder Zitat liest */
const escapeAnfang = (z: string) => z.replace(/^(\s*)(#{1,6}\s|[-+*]\s|\d+[.)]\s|>)/, '$1\\$2');

type Marke = { type: string; attrs?: Record<string, unknown> };
function inline(nodes: JSONContent[] = []): string {
  let out = '';
  let i = 0;
  while (i < nodes.length) {
    const n = nodes[i];
    if (n.type === 'hardBreak') {
      out += '  \n';
      i++;
      continue;
    }
    const link = (n.marks as Marke[] | undefined)?.find((m) => m.type === 'link');
    if (link) {
      // aufeinanderfolgende Stücke mit demselben Link zusammenfassen
      const href = String(link.attrs?.href ?? '');
      const gruppe: JSONContent[] = [];
      while (i < nodes.length && (nodes[i].marks as Marke[] | undefined)?.some((m) => m.type === 'link' && m.attrs?.href === href)) {
        gruppe.push({ ...nodes[i], marks: (nodes[i].marks as Marke[]).filter((m) => m.type !== 'link') });
        i++;
      }
      out += `[${inline(gruppe)}](${href.replace(/\s/g, '%20').replace(/\)/g, '%29')})`;
      continue;
    }
    let t = escapeText(n.text ?? '');
    const marks = (n.marks as Marke[] | undefined) ?? [];
    // Leerzeichen gehören nicht in ** und *
    const [, vor, kern, nach] = /^(\s*)([\s\S]*?)(\s*)$/.exec(t)!;
    t = kern;
    if (t && marks.some((m) => m.type === 'italic')) t = `*${t}*`;
    if (t && marks.some((m) => m.type === 'bold')) t = `**${t}**`;
    out += vor + t + nach;
    i++;
  }
  return out;
}

function bloecke(nodes: JSONContent[] = [], einzug = ''): string {
  return nodes.map((n) => block(n, einzug)).filter((x) => x !== null).join(`\n\n${einzug}`);
}

function block(n: JSONContent, einzug: string): string {
  switch (n.type) {
    case 'paragraph':
      return inline(n.content).split('\n').map((z, i) => (i === 0 ? escapeAnfang(z) : z)).join(`\n${einzug}`);
    case 'heading':
      return `${'#'.repeat(Number(n.attrs?.level ?? 2))} ${inline(n.content)}`;
    case 'bulletList':
    case 'orderedList':
      return (n.content ?? [])
        .map((li, i) => {
          const zeichen = n.type === 'orderedList' ? `${Number(n.attrs?.start ?? 1) + i}. ` : '- ';
          const innen = ' '.repeat(zeichen.length);
          return zeichen + (li.content ?? []).map((b) => block(b, einzug + innen)).join(`\n${einzug}${innen}`);
        })
        .join(`\n${einzug}`);
    case 'blockquote':
      return bloecke(n.content, '')
        .split('\n')
        .map((z) => (z ? `> ${z}` : '>'))
        .join(`\n${einzug}`);
    case 'horizontalRule':
      return '---';
    case 'roh':
      return String(n.attrs?.md ?? '');
    default:
      return inline(n.content);
  }
}

export const zuMarkdown = (doc: JSONContent) => bloecke(doc.content).replace(/\n{3,}/g, '\n\n').trim();

/** Sieht der Text nach Hin- und Rückweg auf der Website gleich aus? */
const gleich = (a: string, b: string) => {
  // Notizen (<!-- … -->) zählen mit: sie müssen erhalten bleiben
  const notizen = (md: string) => (md.match(/<!--[\s\S]*?-->/g) ?? []).join('|');
  const norm = (md: string) => renderMarkdown(md.replace(/<!--[\s\S]*?-->/g, ''), '/').replace(/\s+/g, ' ').replace(/> </g, '><').trim();
  return norm(a) === norm(b) && notizen(a) === notizen(b);
};

const EXTENSIONS = () => [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    code: false,
    codeBlock: false,
    strike: false,
    underline: false,
    link: { openOnClick: false, autolink: false, linkOnPaste: true, HTMLAttributes: { rel: null, target: null } },
  }),
  Roh,
];

/** Kann der Editor diesen Text ohne Verlust bearbeiten? */
export function passt(md: string): boolean {
  const ed = new Editor({ extensions: EXTENSIONS(), content: zuHtml(md) });
  const zurueck = zuMarkdown(ed.getJSON());
  ed.destroy();
  return gleich(md, zurueck);
}

export interface RichText {
  el: HTMLElement;
  fokus(): void;
  /** Bilder-Abschnitt (Markdown) an der Schreibmarke einfügen */
  einfuegen(md: string): void;
}

/**
 * Editor statt des Textfelds `ta`. Schreibt bei jeder Änderung Markdown in `ta` und löst dort „input“ aus.
 * Gibt null zurück, wenn der Text Dinge enthält, die der Editor nicht verlustfrei kann (dann bleibt das Textfeld).
 */
export function richtext(ta: HTMLTextAreaElement, opt: { label: string; bild?: () => Promise<string | null>; gesperrt?: boolean }): RichText | null {
  if (!passt(ta.value)) return null;
  const box = document.createElement('div');
  box.className = 'rt';
  const leiste = document.createElement('div');
  leiste.className = 'rt__tools';
  leiste.setAttribute('role', 'toolbar');
  leiste.setAttribute('aria-label', `${opt.label}: Formatierung`);
  const flaeche = document.createElement('div');
  flaeche.className = 'rt__text';
  box.append(leiste, flaeche);

  const editor = new Editor({
    element: flaeche,
    extensions: EXTENSIONS(),
    content: zuHtml(ta.value),
    editable: !opt.gesperrt,
    editorProps: {
      attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': opt.label, class: 'rt__eingabe', spellcheck: 'true', lang: ta.lang || 'de' },
    },
    onUpdate: () => {
      ta.value = zuMarkdown(editor.getJSON());
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    },
    onSelectionUpdate: () => zustand(),
    onTransaction: () => zustand(),
  });

  const knoepfe: { b: HTMLButtonElement; aktiv: () => boolean }[] = [];
  const knopf = (zeichen: string, label: string, tun: () => void, aktiv: () => boolean = () => false, klasse = '') => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = klasse;
    b.title = label;
    b.setAttribute('aria-label', label);
    b.setAttribute('aria-pressed', 'false');
    b.disabled = !!opt.gesperrt;
    b.innerHTML = `<span aria-hidden="true">${zeichen}</span>`;
    // Fokus bleibt im Text (sonst geht der erste Buchstabe nach dem Klick verloren)
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => tun());
    leiste.append(b);
    knoepfe.push({ b, aktiv });
  };
  const zustand = () => knoepfe.forEach(({ b, aktiv }) => b.setAttribute('aria-pressed', String(aktiv())));
  knopf('H', 'Zwischenüberschrift', () => editor.chain().focus().toggleHeading({ level: 2 }).run(), () => editor.isActive('heading'));
  knopf('B', 'Fett', () => editor.chain().focus().toggleBold().run(), () => editor.isActive('bold'));
  knopf('<em>I</em>', 'Kursiv', () => editor.chain().focus().toggleItalic().run(), () => editor.isActive('italic'));
  knopf('•', 'Liste', () => editor.chain().focus().toggleBulletList().run(), () => editor.isActive('bulletList'));
  knopf('↗', 'Link', () => {
    const vorher = String(editor.getAttributes('link').href ?? '');
    const url = prompt('Adresse des Links (https://… oder /kontakt/ für eine Seite der Website). Leer lassen entfernt den Link:', vorher || 'https://');
    if (url === null) return;
    const u = url.trim();
    if (!u || u === 'https://') return void editor.chain().focus().extendMarkRange('link').unsetLink().run();
    if (!/^(https?:\/\/|mailto:|\/)/i.test(u)) return alert('Bitte eine Adresse mit https://, mailto: oder / am Anfang.');
    editor.chain().focus().extendMarkRange('link').setLink({ href: u }).run();
  }, () => editor.isActive('link'));
  if (opt.bild) {
    knopf('Bild', 'Bild aus Medien einfügen', async () => {
      const md = await opt.bild!();
      if (md) einfuegen(md);
    }, () => false, 'rt__text-knopf');
  }

  function einfuegen(md: string) {
    editor.chain().focus().insertContent({ type: 'roh', attrs: { md } }).run();
  }

  // Textfeld (bisheriger Weg) ausblenden, Editor an seine Stelle
  ta.hidden = true;
  ta.insertAdjacentElement('afterend', box);
  zustand();
  return { el: box, fokus: () => editor.commands.focus(), einfuegen };
}
