/**
 * Direkt bearbeiten in der Vorschau des News-Editors (wie in einem Seiten-Editor):
 *  - Titel, Teaser, Zwischentitel und Absätze tippt man direkt auf der Seite (Strg+B / Strg+I, Enter = neuer Absatz)
 *  - ein einzelnes Foto zieht man an den Griffen links und rechts breiter oder schmaler; es rastet in den Stufen
 *    des Designs ein (Neben dem Text, Textbreite, Weit, Randlos), dieselben Stufen stehen als Knöpfe darüber
 *  - Foto und Titelbild tauschen öffnet die Mediathek im Editor
 *
 * Läuft im Rahmen (src/pages/intern/news/vorschau/) und schickt jede Änderung per postMessage an den Editor. Der
 * Editor bleibt die einzige Quelle: er speichert, sichert, prüft und schickt den neuen Stand zurück. Solange hier
 * getippt oder gezogen wird, wartet die Vorschau mit dem Neuzeichnen (sonst sprünge der Cursor).
 *
 * Sicherheit gegen Datenverlust: Ein Absatz wird nur direkt bearbeitbar, wenn der Rückweg nach Markdown dieselbe
 * Seite ergibt (Personenkarten, verschachtelte Listen u. Ä. nicht). Sonst springt ein Klick wie bisher zum Block.
 */
import { renderMarkdown } from '../../../lib/markdown';

export type Stufe = 'neben' | 'text' | 'weit' | 'randlos';
/** schmal → breit (Reihenfolge zählt beim Ziehen) */
export const STUFEN: [Stufe, string][] = [['neben', 'Neben dem Text'], ['text', 'Textbreite'], ['weit', 'Weit'], ['randlos', 'Randlos']];

type Sprache = 'de' | 'en';
type Inhalt =
  | { art: 'feld'; feld: 'titel' | 'kurztext'; wert: string }
  | { art: 'text'; i: number; wert: string }
  | { art: 'breite'; i: number; wert: Stufe }
  | { art: 'foto'; i: number }
  | { art: 'titelbild' };
export type DirektNachricht = { typ: 'news-direkt'; lang: Sprache } & Inhalt;

export interface DirektStand {
  an: boolean;
  lang: Sprache;
  /** Markdown je Block (wie in der Vorschau gezeigt) */
  abschnitte: string[];
  /** Art je Block: text, zwischentitel, zitat, hinweis, schritte oder bilder:<darstellung>:<anzahl> */
  arten: string[];
  /** Titelbild gesetzt? */
  titelbild: boolean;
}

const basis = import.meta.env.BASE_URL;
const prefix = basis.replace(/\/$/, '');
const FELD = '[data-direkt-feld]';

// ---------- Rückweg: bearbeitetes HTML → Markdown ----------
const esc = (s: string) => s.replace(/([\\`*_[\]<>])/g, '\\$1');
/** Leerraum am Rand aus Fett/Kursiv heraus (sonst gilt `**fett **` nicht als fett) */
const rahmen = (innen: string, z: string) => {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(innen)!;
  return m[2] ? `${m[1]}${z}${m[2]}${z}${m[3]}` : innen;
};
function inline(n: Node): string {
  return [...n.childNodes]
    .map((k) => {
      if (k.nodeType === Node.TEXT_NODE) return esc((k.textContent ?? '').replace(/ /g, ' ').replace(/\s*\n\s*/g, ' '));
      if (!(k instanceof HTMLElement)) return '';
      const innen = inline(k);
      switch (k.tagName) {
        case 'STRONG':
        case 'B':
          return rahmen(innen, '**');
        case 'EM':
        case 'I':
          return rahmen(innen, '*');
        case 'A': {
          const href = k.getAttribute('href') ?? '';
          const ziel = prefix && href.startsWith(`${prefix}/`) ? href.slice(prefix.length) : href;
          return innen.trim() ? `[${innen}](${ziel})` : innen;
        }
        case 'BR':
          return '\\\n';
        default:
          return innen;
      }
    })
    .join('');
}
/** Blöcke, die der Rückweg kennt */
const BLOECKE = new Set(['P', 'H3', 'UL', 'OL']);
export function zuMarkdown(teile: Element[]): string {
  return teile
    .map((el) => {
      const zeile = (s: string) => s.replace(/\\\n$/, '').trim();
      if (el.tagName === 'H3') return zeile(inline(el)) ? `### ${zeile(inline(el))}` : '';
      if (el.tagName === 'UL' || el.tagName === 'OL') {
        const start = Number(el.getAttribute('start') ?? 1);
        return [...el.children].map((li, j) => `${el.tagName === 'OL' ? `${start + j}.` : '-'} ${zeile(inline(li))}`).join('\n');
      }
      // Zeichen am Zeilenanfang, die sonst eine Liste, Überschrift oder ein Zitat beginnen
      return zeile(inline(el)).replace(/^([#>+-]|\d+[.)])/, '\\$1');
    })
    .filter((t) => t.trim())
    .join('\n\n');
}
const gleich = (a: string, b: string) => a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim();

// ---------- kleine Helfer ----------
function knopf(text: string, fn: () => void, gedrueckt?: boolean): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  if (gedrueckt !== undefined) b.setAttribute('aria-pressed', String(gedrueckt));
  b.addEventListener('click', (e) => {
    e.preventDefault();
    fn();
  });
  return b;
}
const ui = (cls: string, label: string) => Object.assign(document.createElement('div'), { className: `vs-ui ${cls}`, role: 'toolbar', ariaLabel: label });

/** Stufe eines Fotos an seinen Klassen (wie src/lib/markdown.ts sie setzt) */
const stufeVon = (fig: Element): Stufe => (fig.classList.contains('nb--neben') ? 'neben' : (STUFEN.find(([s]) => fig.classList.contains(`nb--${s}`))?.[0] ?? 'text'));
function stufeZeigen(fig: Element, s: Stufe) {
  fig.classList.remove('nb--neben', 'nb--einzel', ...STUFEN.map(([x]) => `nb--${x}`));
  fig.classList.add(...(s === 'neben' ? ['nb--neben'] : ['nb--einzel', `nb--${s}`]));
}

export interface Direkt {
  /** nach jedem Neuzeichnen der Vorschau: bearbeitbare Stellen einrichten */
  einrichten(stand: DirektStand): void;
  /** wird gerade getippt oder gezogen? (dann nicht neu zeichnen) */
  beschaeftigt(): boolean;
  /** Klick in der Vorschau: true = gehört zum Bearbeiten (nicht zum Editor springen) */
  klick(e: MouseEvent): boolean;
  /** Stelle des Cursors merken; die Rückgabe setzt ihn nach dem Neuzeichnen wieder dorthin */
  cursorMerken(): () => void;
}

/**
 * @param senden  Änderung an den Editor
 * @param fertig  Tippen/Ziehen beendet: wartenden Stand zeichnen
 */
export function direkt(article: HTMLElement, senden: (m: DirektNachricht) => void, fertig: () => void): Direkt {
  let stand: DirektStand = { an: false, lang: 'de', abschnitte: [], arten: [], titelbild: false };
  let ziehen = false;
  const beschaeftigt = () => ziehen || !!(document.activeElement as Element | null)?.closest(FELD);
  const schicken = (m: Inhalt) => senden({ typ: 'news-direkt', lang: stand.lang, ...m });
  const spaeter = () => window.setTimeout(() => !beschaeftigt() && fertig(), 0);

  function editierbar(el: HTMLElement, opt: { einfach: boolean; label: string; eingabe: () => void; enter?: (e: KeyboardEvent) => void }) {
    try {
      el.contentEditable = opt.einfach ? 'plaintext-only' : 'true';
    } catch {
      el.contentEditable = 'true'; // ältere Browser
    }
    el.setAttribute(FELD.slice(1, -1), '');
    el.title = `${opt.label}: zum Bearbeiten klicken`;
    el.addEventListener('input', opt.eingabe);
    el.addEventListener('blur', spaeter);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') el.blur();
      else if (e.key === 'Enter' && !e.shiftKey) {
        if (opt.enter) opt.enter(e);
        else e.preventDefault();
      }
    });
    // nur reiner Text, keine fremden Formatierungen
    el.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain') ?? '';
      document.execCommand('insertText', false, opt.einfach ? text.replace(/\s*\n\s*/g, ' ') : text);
    });
  }

  /** Titel und Teaser */
  function felder() {
    const text = (el: HTMLElement) => el.innerText.replace(/\s+/g, ' ').trim();
    for (const [sel, feld, label] of [['.ak__titel', 'titel', 'Titel'], ['.ak__teaser, .ab__stand', 'kurztext', 'Teaser']] as const) {
      article.querySelectorAll<HTMLElement>(sel).forEach((el) => {
        if (el.hidden) return;
        editierbar(el, { einfach: true, label, eingabe: () => schicken({ art: 'feld', feld, wert: text(el) }) });
      });
    }
  }

  /** Absätze und Zwischentitel */
  function texte(teil: HTMLElement, i: number) {
    const art = stand.arten[i];
    const md = stand.abschnitte[i] ?? '';
    if (!md.trim()) return;
    if (art === 'zwischentitel') {
      const h2 = teil.querySelector<HTMLElement>(':scope > h2');
      if (h2) editierbar(h2, { einfach: true, label: 'Zwischentitel', eingabe: () => schicken({ art: 'text', i, wert: h2.innerText.replace(/\s+/g, ' ').trim() }) });
      return;
    }
    if (art !== 'text') return;
    const kinder = [...teil.children];
    if (!kinder.length || kinder.some((k) => !BLOECKE.has(k.tagName))) return;
    // Rückweg prüfen: gleiche Seite wie vorher?
    if (!gleich(renderMarkdown(zuMarkdown(kinder), basis, { lang: stand.lang }), renderMarkdown(md, basis, { lang: stand.lang }))) return;
    const eingabe = () => schicken({ art: 'text', i, wert: zuMarkdown([...teil.children]) });
    const einrichten = (el: HTMLElement) =>
      editierbar(el, {
        einfach: false,
        label: 'Absatz',
        eingabe,
        // Enter in Absatz oder kleiner Überschrift: neuer Absatz dahinter (in Listen: neuer Punkt, wie gewohnt)
        enter: el.tagName === 'P' || el.tagName === 'H3' ? (e) => absatzTeilen(e, el, einrichten, eingabe) : undefined,
      });
    kinder.forEach((k) => einrichten(k as HTMLElement));
  }

  function absatzTeilen(e: KeyboardEvent, el: HTMLElement, einrichten: (el: HTMLElement) => void, eingabe: () => void) {
    e.preventDefault();
    const sel = getSelection();
    if (!sel?.rangeCount) return;
    const r = sel.getRangeAt(0);
    r.deleteContents();
    const rest = document.createRange();
    rest.setStart(r.endContainer, r.endOffset);
    rest.setEnd(el, el.childNodes.length);
    const neu = document.createElement('p');
    neu.append(rest.extractContents());
    if (!neu.textContent) neu.append(document.createElement('br'));
    if (!el.textContent) el.append(document.createElement('br'));
    el.after(neu);
    einrichten(neu);
    neu.focus();
    sel.collapse(neu, 0);
    eingabe();
  }

  /** ein einzelnes Foto: Breite ziehen oder wählen, Foto tauschen */
  function foto(teil: HTMLElement, i: number) {
    if (!/^bilder:(raster|neben):1$/.test(stand.arten[i] ?? '')) return;
    const fig = teil.querySelector<HTMLElement>(':scope > figure.nb');
    if (!fig) return;
    const start = stufeVon(fig);
    fig.classList.add('vs-bild');
    const leiste = ui('vs-leiste', `Foto in Block ${i + 1}`);
    const knoepfe = STUFEN.map(([s, l]) => knopf(l, () => s !== start && schicken({ art: 'breite', i, wert: s }), s === start));
    leiste.append(...knoepfe, knopf('Foto tauschen', () => schicken({ art: 'foto', i })));
    const masz = Object.assign(document.createElement('span'), { className: 'vs-ui vs-masz', hidden: true });
    fig.append(leiste, masz);

    for (const seite of ['l', 'r'] as const) {
      const griff = Object.assign(document.createElement('span'), { className: `vs-ui vs-griff vs-griff--${seite}`, title: 'Ziehen: breiter oder schmaler' });
      griff.setAttribute('aria-hidden', 'true');
      fig.append(griff);
      griff.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        ziehen = true;
        griff.setPointerCapture(e.pointerId);
        // Breite jeder Stufe messen, dann wieder die alte zeigen
        const breiten = STUFEN.map(([s]) => {
          stufeZeigen(fig, s);
          return fig.getBoundingClientRect().width;
        });
        stufeZeigen(fig, start);
        const w0 = fig.getBoundingClientRect().width;
        const x0 = e.clientX;
        let jetzt = start;
        fig.classList.add('is-ziehen');
        masz.hidden = false;
        masz.textContent = STUFEN.find(([s]) => s === start)![1];
        const bewegen = (m: PointerEvent) => {
          const w = w0 + (seite === 'r' ? 1 : -1) * (m.clientX - x0) * 2;
          const k = breiten.reduce((best, b, j) => (Math.abs(b - w) < Math.abs(breiten[best] - w) ? j : best), 0);
          if (STUFEN[k][0] === jetzt) return;
          jetzt = STUFEN[k][0];
          stufeZeigen(fig, jetzt);
          masz.textContent = STUFEN[k][1];
          knoepfe.forEach((b, j) => b.setAttribute('aria-pressed', String(j === k)));
        };
        const loslassen = () => {
          griff.removeEventListener('pointermove', bewegen);
          ziehen = false;
          fig.classList.remove('is-ziehen');
          masz.hidden = true;
          if (jetzt !== start) schicken({ art: 'breite', i, wert: jetzt });
          else spaeter();
        };
        griff.addEventListener('pointermove', bewegen);
        griff.addEventListener('pointerup', loslassen, { once: true });
        griff.addEventListener('pointercancel', loslassen, { once: true });
      });
    }
  }

  /** Titelbild tauschen (oben im Kopf) */
  function kopf() {
    const k = article.querySelector<HTMLElement>('[data-kopf]');
    if (!k) return;
    const leiste = ui('vs-kopfleiste', 'Titelbild');
    leiste.append(knopf(stand.titelbild ? 'Titelbild tauschen' : 'Titelbild wählen', () => schicken({ art: 'titelbild' })));
    k.append(leiste);
  }

  return {
    einrichten(s) {
      stand = s;
      document.documentElement.classList.toggle('vorschau-direkt', s.an);
      if (!s.an) return;
      felder();
      kopf();
      article.querySelectorAll<HTMLElement>('[data-abschnitt]').forEach((teil) => {
        const i = Number(teil.dataset.abschnitt);
        texte(teil, i);
        foto(teil, i);
      });
    },
    beschaeftigt,
    cursorMerken() {
      const el = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>(FELD);
      const sel = getSelection();
      if (!el || !sel?.rangeCount) return () => {};
      // welches Feld: Abschnitt + Position darin, sonst Titel bzw. Teaser
      const teil = el.closest<HTMLElement>('[data-abschnitt]');
      const finden = teil
        ? ((i: string, k: number) => () => article.querySelector(`[data-abschnitt="${i}"]`)?.children[k])(teil.dataset.abschnitt!, [...teil.children].indexOf(el))
        : ((cls: string) => () => article.querySelector(`.${cls}`))(el.classList.contains('ak__titel') ? 'ak__titel' : el.classList.contains('ab__stand') ? 'ab__stand' : 'ak__teaser');
      const vorher = document.createRange();
      vorher.setStart(el, 0);
      const r = sel.getRangeAt(0);
      vorher.setEnd(r.endContainer, r.endOffset);
      const pos = vorher.toString().length;
      return () => {
        const neu = finden() as HTMLElement | undefined | null;
        if (!neu?.matches(FELD)) return;
        neu.focus({ preventScroll: true });
        // Textstelle wiederfinden
        const w = document.createTreeWalker(neu, NodeFilter.SHOW_TEXT);
        let rest = pos;
        for (let n = w.nextNode() as Text | null; n; n = w.nextNode() as Text | null) {
          if (rest <= n.length) return sel.collapse(n, rest);
          rest -= n.length;
        }
        sel.selectAllChildren(neu);
        sel.collapseToEnd();
      };
    },
    klick(e) {
      if (!stand.an) return false;
      const t = e.target as Element;
      if (t.closest('.vs-ui')) return true;
      if (t.closest(FELD)) {
        if (t.closest('a')) e.preventDefault(); // Links im Text nicht öffnen
        return true;
      }
      const fig = t.closest<HTMLElement>('.vs-bild');
      if (fig) {
        e.preventDefault(); // keine Großansicht
        e.stopPropagation();
        article.querySelectorAll('.vs-gewaehlt').forEach((x) => x !== fig && x.classList.remove('vs-gewaehlt'));
        fig.classList.add('vs-gewaehlt');
        return true;
      }
      return false;
    },
  };
}
