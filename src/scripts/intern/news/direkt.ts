/**
 * Direkt bearbeiten in der Vorschau des News-Editors – wie in einem Seiten-Editor:
 *  - Titel, Teaser, Zwischentitel, Absätze und Bildunterschriften tippt man direkt auf der Seite
 *    (Strg+B fett, Strg+I kursiv, Strg+K Link, Enter = neuer Absatz, Esc beendet)
 *  - über dem gewählten Block schwebt eine Leiste: Formatieren (Fett, Kursiv, Link, Liste, Formatierung entfernen),
 *    Schriftgröße in festen Stufen, Foto (Breite, Format, tauschen, Ausschnitt), Zurücksetzen auf den Standard des
 *    Designs, Verschieben, Verdoppeln, Löschen und „+“ zum Einfügen eines neuen Blocks dahinter
 *  - ein einzelnes Foto zieht man an den Griffen breiter oder schmaler; es rastet in den Stufen des Designs ein
 *  - Strg+Z / Strg+Umschalt+Z: Rückgängig und Wiederholen (der Verlauf liegt im Editor)
 *
 * Läuft im Rahmen (src/pages/intern/news/vorschau/) und schickt jede Änderung per postMessage an den Editor
 * (`news-direkt`). Der Editor bleibt die einzige Quelle: er speichert, sichert, prüft und schickt den neuen Stand
 * zurück. Solange hier getippt oder gezogen wird, wartet die Vorschau mit dem Neuzeichnen (sonst sprünge der Cursor).
 *
 * Sicherheit gegen Datenverlust: Ein Absatz wird nur direkt beschreibbar, wenn der Rückweg nach Markdown dieselbe
 * Seite ergibt (Personenkarten, verschachtelte Listen u. Ä. nicht). Dann bleiben Leiste und „Im Formular“.
 */
import { renderMarkdown } from '../../../lib/markdown';
import type { Format, Groesse } from '../../../lib/news-bloecke';

export type Stufe = 'neben' | 'text' | 'weit' | 'randlos';
/** schmal → breit (Reihenfolge zählt beim Ziehen) */
export const STUFEN: [Stufe, string][] = [['neben', 'Neben dem Text'], ['text', 'Textbreite'], ['weit', 'Weit'], ['randlos', 'Randlos']];
const GROESSEN: [Groesse, string][] = [['klein', 'Klein'], ['standard', 'Standard'], ['gross', 'Groß'], ['sehr-gross', 'Sehr groß']];
const FORMATE: [Format, string][] = [['original', 'Original'], ['quer', '3 : 2'], ['hoch', '3 : 4'], ['quadrat', '1 : 1']];
export type NeuerBlock = 'text' | 'zwischentitel' | 'zitat' | 'bild' | 'hinweis';
const NEU: [NeuerBlock, string][] = [['text', 'Absatz'], ['zwischentitel', 'Zwischentitel'], ['bild', 'Bild'], ['zitat', 'Zitat'], ['hinweis', 'Hinweiskasten']];
const NAME: Record<string, string> = { text: 'Absatz', zwischentitel: 'Zwischentitel', zitat: 'Zitat', hinweis: 'Hinweiskasten', schritte: 'Bild & Text', raster: 'Bild', neben: 'Bild', paar: 'Bildpaar', strecke: 'Bildstrecke' };

type Sprache = 'de' | 'en';
type Inhalt =
  | { art: 'feld'; feld: 'titel' | 'kurztext'; wert: string }
  | { art: 'text' | 'unterschrift'; i: number; wert: string }
  | { art: 'breite'; i: number; wert: Stufe }
  | { art: 'groesse'; i: number; wert: Groesse }
  | { art: 'format'; i: number; wert: Format }
  | { art: 'foto' | 'ausschnitt' | 'verdoppeln' | 'loeschen' | 'zuruecksetzen' | 'formular'; i: number }
  | { art: 'schieben'; i: number; d: -1 | 1 }
  | { art: 'einfuegen'; i: number; neu: NeuerBlock }
  | { art: 'titelbild' | 'rueckgaengig' | 'wiederholen' }
  | { art: 'link'; id: number; text: string };
export type DirektNachricht = { typ: 'news-direkt'; lang: Sprache } & Inhalt;

export interface DirektStand {
  an: boolean;
  lang: Sprache;
  /** Markdown je Block (wie in der Vorschau gezeigt) */
  abschnitte: string[];
  /** Art je Block: text, zwischentitel, zitat, hinweis, schritte oder bilder:<darstellung>:<anzahl> */
  arten: string[];
  /** Schriftgröße je Block (nur Absatz, Zwischentitel; sonst leer) */
  groessen: string[];
  /** Format je Bilder-Block (sonst leer) */
  formate: string[];
  /** Titelbild gesetzt? */
  titelbild: boolean;
}

const basis = import.meta.env.BASE_URL;
const prefix = basis.replace(/\/$/, '');
const FELD = '[data-direkt-feld]';
const GR = /^::: ?(?:klein|gross|sehr-gross)[ \t]*\n([\s\S]*)\n:::[ \t]*$/;

// ---------- Rückweg: bearbeitetes HTML → Markdown ----------
const esc = (s: string) => s.replace(/([\\`*_[\]<>])/g, '\\$1');
/** Leerraum am Rand aus Fett/Kursiv heraus (sonst gilt `**fett **` nicht als fett) */
const umschliessen = (innen: string, z: string) => {
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
          return umschliessen(innen, '**');
        case 'EM':
        case 'I':
          return umschliessen(innen, '*');
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
      const zeile = (s: string) => s.replace(/(\\\n)+$/, '').trim();
      if (el.tagName === 'H3') return zeile(inline(el)) ? `### ${zeile(inline(el))}` : '';
      if (el.tagName === 'UL' || el.tagName === 'OL') {
        const start = Number(el.getAttribute('start') ?? 1);
        return [...el.children].map((li) => zeile(inline(li))).filter(Boolean).map((t, j) => `${el.tagName === 'OL' ? `${start + j}.` : '-'} ${t}`).join('\n');
      }
      // Zeichen am Zeilenanfang, die sonst eine Liste, Überschrift oder ein Zitat beginnen
      return zeile(inline(el)).replace(/^([#>+-]|\d+[.)])/, '\\$1');
    })
    .filter((t) => t.trim())
    .join('\n\n');
}
const gleich = (a: string, b: string) => a.replace(/ class="gr gr--[a-z-]+"/g, '').replace(/\s+/g, ' ').trim() === b.replace(/ class="gr gr--[a-z-]+"/g, '').replace(/\s+/g, ' ').trim();

// ---------- kleine Helfer ----------
function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  return e;
}
/** Knopf, der den Cursor im Text lässt (mousedown ohne Fokuswechsel) */
function knopf(text: string, label: string, fn: () => void, gedrueckt?: boolean): HTMLButtonElement {
  const b = el('button', '', text);
  b.type = 'button';
  b.title = label;
  b.setAttribute('aria-label', label);
  if (gedrueckt !== undefined) b.setAttribute('aria-pressed', String(gedrueckt));
  b.addEventListener('mousedown', (e) => e.preventDefault());
  b.addEventListener('click', (e) => {
    e.preventDefault();
    fn();
  });
  return b;
}
function gruppe(label: string, ...kinder: HTMLElement[]) {
  const g = el('div', 'vs-gruppe');
  g.setAttribute('role', 'group');
  g.setAttribute('aria-label', label);
  g.append(...kinder);
  return g;
}

/** Stufe eines Fotos an seinen Klassen (wie src/lib/markdown.ts sie setzt) */
const stufeVon = (fig: Element): Stufe => (fig.classList.contains('nb--neben') ? 'neben' : (STUFEN.find(([s]) => fig.classList.contains(`nb--${s}`))?.[0] ?? 'text'));
function stufeZeigen(fig: Element, s: Stufe) {
  fig.classList.remove('nb--neben', 'nb--einzel', ...STUFEN.map(([x]) => `nb--${x}`));
  fig.classList.add(...(s === 'neben' ? ['nb--neben'] : ['nb--einzel', `nb--${s}`]));
}

export interface Direkt {
  /** nach jedem Neuzeichnen der Vorschau: bearbeitbare Stellen und Leiste einrichten */
  einrichten(stand: DirektStand): void;
  /** wird gerade getippt, gezogen oder auf eine Antwort des Editors gewartet? (dann nicht neu zeichnen) */
  beschaeftigt(): boolean;
  /** Klick in der Vorschau: true = gehört zum Bearbeiten (nicht zum Editor springen) */
  klick(e: MouseEvent): boolean;
  /** Stelle des Cursors merken; die Rückgabe setzt ihn nach dem Neuzeichnen wieder dorthin */
  cursorMerken(): () => void;
  /** Antwort des Editors (z. B. gewählter Link) */
  antwort(id: number, daten: unknown): void;
}

/**
 * @param senden  Änderung an den Editor
 * @param fertig  Tippen/Ziehen beendet: wartenden Stand zeichnen
 */
export function direkt(article: HTMLElement, senden: (m: DirektNachricht) => void, fertig: () => void): Direkt {
  let stand: DirektStand = { an: false, lang: 'de', abschnitte: [], arten: [], groessen: [], formate: [], titelbild: false };
  let ziehen = false;
  let warten = 0;
  /** Block, zu dem die Leiste gehört; nach Einfügen: Block, der den Cursor bekommt */
  let aktiv: number | null = null;
  let fokusNach: number | null = null;
  const anfragen = new Map<number, (d: unknown) => void>();
  let anfrageNr = 0;

  const beschaeftigt = () => ziehen || warten > 0 || !!(document.activeElement as Element | null)?.closest(FELD);
  const schicken = (m: Inhalt) => senden({ typ: 'news-direkt', lang: stand.lang, ...m });
  const spaeter = () => window.setTimeout(() => !beschaeftigt() && fertig(), 0);
  const teilVon = (i: number) => article.querySelector<HTMLElement>(`[data-abschnitt="${i}"]`);
  /** Änderung am Aufbau: Cursor freigeben, damit der neue Stand sofort gezeichnet wird */
  const umbauen = (m: Inhalt) => {
    (document.activeElement as HTMLElement | null)?.blur();
    schicken(m);
  };

  // ---------- Leiste über dem gewählten Block ----------
  const leiste = el('div', 'vs-ui vs-block');
  leiste.setAttribute('role', 'toolbar');
  leiste.hidden = true;
  document.body.append(leiste);
  const menue = el('div', 'vs-ui vs-menue');
  menue.hidden = true;
  document.body.append(menue);

  function platzieren() {
    if (aktiv === null) return;
    const teil = teilVon(aktiv);
    const kinder = teil ? [...teil.children].filter((k) => !k.classList.contains('vs-ui')) : [];
    if (!kinder.length) return (leiste.hidden = true);
    const r = kinder.map((k) => k.getBoundingClientRect());
    const oben = Math.min(...r.map((x) => x.top));
    const links = Math.min(...r.map((x) => x.left));
    leiste.hidden = false;
    const top = oben + scrollY - leiste.offsetHeight - 10;
    leiste.style.top = `${Math.max(scrollY + 4, top)}px`;
    leiste.style.left = `${Math.max(8, Math.min(links + scrollX, innerWidth - leiste.offsetWidth - 8))}px`;
    menue.style.top = `${parseFloat(leiste.style.top) + leiste.offsetHeight + 2}px`;
    menue.style.left = leiste.style.left;
  }

  /** Text-Werkzeuge wirken im Feld mit dem Cursor */
  const feldMitCursor = () => (document.activeElement as HTMLElement | null)?.closest<HTMLElement>(FELD) ?? null;
  const eingabeMelden = (f: HTMLElement | null) => f?.dispatchEvent(new Event('input', { bubbles: true }));
  function befehl(cmd: 'bold' | 'italic' | 'removeFormat') {
    const f = feldMitCursor();
    if (!f || f.dataset.einfach !== undefined) return;
    document.execCommand(cmd);
    eingabeMelden(f);
  }
  async function link() {
    const f = feldMitCursor();
    const sel = getSelection();
    if (!f || f.dataset.einfach !== undefined || !sel?.rangeCount) return;
    const r = sel.getRangeAt(0).cloneRange();
    const id = ++anfrageNr;
    warten++;
    const antwort = new Promise<unknown>((fertigLink) => anfragen.set(id, fertigLink));
    schicken({ art: 'link', id, text: r.toString() });
    const l = (await antwort) as { href: string; text: string } | null;
    warten--;
    f.focus();
    sel.removeAllRanges();
    sel.addRange(r);
    if (l) {
      if (r.collapsed) {
        const a = el('a', '', l.text);
        a.href = l.href;
        r.insertNode(a);
        sel.collapse(a, 1);
      } else document.execCommand('createLink', false, l.href);
      eingabeMelden(f);
    }
    spaeter();
  }
  /** Absatz ↔ Aufzählung */
  function liste() {
    const f = feldMitCursor();
    const teil = f?.closest<HTMLElement>('[data-abschnitt]');
    if (!f || !teil || f.dataset.einfach !== undefined) return;
    const einrichten = (x: HTMLElement) => absatzEinrichten(x, Number(teil.dataset.abschnitt));
    let neu: HTMLElement;
    if (f.tagName === 'UL' || f.tagName === 'OL') {
      const absaetze = [...f.children].map((li) => {
        const p = el('p', f.className);
        p.append(...li.childNodes);
        return p;
      });
      f.replaceWith(...absaetze);
      absaetze.forEach(einrichten);
      neu = absaetze[0];
    } else {
      neu = el('ul', f.className);
      const li = el('li', '');
      li.append(...f.childNodes);
      neu.append(li);
      f.replaceWith(neu);
      einrichten(neu);
    }
    neu.focus();
    getSelection()?.selectAllChildren(neu);
    getSelection()?.collapseToEnd();
    eingabeMelden(neu);
  }

  function leisteBauen() {
    leiste.replaceChildren();
    menue.hidden = true;
    if (aktiv === null || !stand.an || !teilVon(aktiv)) return (leiste.hidden = true);
    const i = aktiv;
    const [typ, darstellung, anzahl] = (stand.arten[i] ?? '').split(':');
    const name = NAME[darstellung ?? typ] ?? NAME[typ] ?? 'Block';
    leiste.setAttribute('aria-label', `Block ${i + 1}: ${name}`);
    const teil = teilVon(i)!;
    const beschreibbar = !!teil.querySelector(FELD);
    leiste.append(el('span', 'vs-block__name', name));

    if (typ === 'text' && beschreibbar) {
      leiste.append(gruppe('Formatieren',
        knopf('B', 'Fett (Strg+B)', () => befehl('bold')),
        knopf('I', 'Kursiv (Strg+I)', () => befehl('italic')),
        knopf('↗', 'Link (Strg+K)', () => void link()),
        knopf('•', 'Aufzählung an/aus', liste),
        knopf('Tx', 'Formatierung entfernen', () => befehl('removeFormat'))));
    }
    if (typ === 'text' || typ === 'zwischentitel') {
      const jetzt = (stand.groessen[i] || 'standard') as Groesse;
      leiste.append(gruppe('Schriftgröße', ...GROESSEN.map(([g, l]) => knopf(l, `Schriftgröße: ${l}`, () => {
        if (g === jetzt) return;
        // sofort zeigen, der Editor zeichnet danach neu
        [...teil.children].forEach((k) => {
          k.classList.remove('gr', 'gr--klein', 'gr--gross', 'gr--sehr-gross');
          if (g !== 'standard') k.classList.add('gr', `gr--${g}`);
        });
        stand.groessen[i] = g;
        schicken({ art: 'groesse', i, wert: g });
        leisteBauen();
        platzieren();
      }, g === jetzt))));
    }
    if (typ === 'bilder') {
      const fig = teil.querySelector<HTMLElement>(':scope > figure.nb');
      if (fig && anzahl === '1' && (darstellung === 'raster' || darstellung === 'neben')) {
        const s = stufeVon(fig);
        leiste.append(gruppe('Breite', ...STUFEN.map(([x, l]) => knopf(l, `Breite: ${l}`, () => x !== s && umbauen({ art: 'breite', i, wert: x }), x === s))));
      }
      if (darstellung === 'raster' || darstellung === 'neben' || darstellung === 'paar' || darstellung === 'strecke') {
        const f = (stand.formate[i] || 'original') as Format;
        leiste.append(gruppe('Format', ...FORMATE.map(([x, l]) => knopf(l, `Format: ${x === 'original' ? 'Original' : l}`, () => x !== f && umbauen({ art: 'format', i, wert: x }), x === f))));
      }
      if (anzahl === '1' || anzahl === '0') {
        leiste.append(gruppe('Foto',
          knopf(anzahl === '0' ? 'Foto wählen' : 'Foto tauschen', 'Foto aus der Mediathek wählen', () => umbauen({ art: 'foto', i })),
          ...(anzahl === '1' ? [knopf('Ausschnitt', 'Ausschnitt des Fotos wählen', () => schicken({ art: 'ausschnitt', i }))] : [])));
      }
    }
    if (typ === 'text' || typ === 'zwischentitel' || typ === 'bilder') {
      leiste.append(knopf('↺', 'Zurücksetzen: Größe, Breite und Format wie im Design', () => umbauen({ art: 'zuruecksetzen', i })));
    }
    const n = stand.arten.length;
    const plus = knopf('+', 'Neuen Block dahinter einfügen', () => {
      menue.hidden = !menue.hidden;
      plus.setAttribute('aria-expanded', String(!menue.hidden));
      if (!menue.hidden) (menue.querySelector('button') as HTMLButtonElement | null)?.focus();
    });
    plus.setAttribute('aria-expanded', 'false');
    leiste.append(gruppe('Block',
      knopf('↑', 'Nach oben', () => i > 0 && (aktiv = i - 1, umbauen({ art: 'schieben', i, d: -1 }))),
      knopf('↓', 'Nach unten', () => i < n - 1 && (aktiv = i + 1, umbauen({ art: 'schieben', i, d: 1 }))),
      knopf('⧉', 'Verdoppeln', () => umbauen({ art: 'verdoppeln', i })),
      knopf('✕', 'Löschen', () => {
        aktiv = null;
        umbauen({ art: 'loeschen', i });
      }),
      plus,
      knopf('Formular', 'Im Formular bearbeiten', () => schicken({ art: 'formular', i }))));
    menue.replaceChildren(...NEU.map(([x, l]) => knopf(`+ ${l}`, `${l} einfügen`, () => {
      menue.hidden = true;
      aktiv = i + 1;
      fokusNach = x === 'text' || x === 'zwischentitel' ? i + 1 : null;
      umbauen({ art: 'einfuegen', i: i + 1, neu: x });
    })));
  }

  function waehlen(i: number | null) {
    if (i === aktiv && !leiste.hidden) return platzieren();
    article.querySelectorAll('.vs-aktiv').forEach((x) => x.classList.remove('vs-aktiv'));
    aktiv = i;
    if (i !== null) teilVon(i)?.classList.add('vs-aktiv');
    leisteBauen();
    platzieren();
  }

  // ---------- beschreibbare Stellen ----------
  function editierbar(e: HTMLElement, opt: { einfach: boolean; label: string; eingabe: () => void; enter?: (ev: KeyboardEvent) => void; platzhalter?: string }) {
    try {
      e.contentEditable = opt.einfach ? 'plaintext-only' : 'true';
    } catch {
      e.contentEditable = 'true'; // ältere Browser
    }
    e.setAttribute(FELD.slice(1, -1), '');
    if (opt.einfach) e.dataset.einfach = '';
    e.title = `${opt.label}: zum Bearbeiten klicken`;
    const leer = () => e.classList.toggle('is-leer', !e.textContent?.trim());
    if (opt.platzhalter) {
      e.dataset.platzhalter = opt.platzhalter;
      leer();
    }
    e.addEventListener('input', () => {
      if (opt.platzhalter) leer();
      opt.eingabe();
    });
    e.addEventListener('blur', spaeter);
    e.addEventListener('keydown', (ev) => {
      const strg = ev.ctrlKey || ev.metaKey;
      if (ev.key === 'Escape') e.blur();
      else if (strg && ev.key.toLowerCase() === 'k' && !opt.einfach) {
        ev.preventDefault();
        void link();
      } else if (ev.key === 'Enter' && !ev.shiftKey) {
        if (opt.enter) opt.enter(ev);
        else ev.preventDefault();
      }
    });
    // nur reiner Text, keine fremden Formatierungen
    e.addEventListener('paste', (ev) => {
      ev.preventDefault();
      const text = ev.clipboardData?.getData('text/plain') ?? '';
      document.execCommand('insertText', false, opt.einfach ? text.replace(/\s*\n\s*/g, ' ') : text);
    });
  }

  /** Titel und Teaser */
  function felder() {
    const text = (e: HTMLElement) => e.innerText.replace(/\s+/g, ' ').trim();
    for (const [sel, feld, label] of [['.ak__titel', 'titel', 'Titel'], ['.ak__teaser, .ab__stand', 'kurztext', 'Teaser']] as const) {
      article.querySelectorAll<HTMLElement>(sel).forEach((e) => {
        if (e.hidden) return;
        editierbar(e, { einfach: true, label, eingabe: () => schicken({ art: 'feld', feld, wert: text(e) }) });
      });
    }
  }

  /** ein Element eines Absatz-Blocks beschreibbar machen */
  function absatzEinrichten(e: HTMLElement, i: number) {
    const teil = teilVon(i)!;
    editierbar(e, {
      einfach: false,
      label: 'Absatz',
      platzhalter: e.classList.contains('vs-neu') ? 'Text schreiben …' : undefined,
      eingabe: () => schicken({ art: 'text', i, wert: zuMarkdown([...teil.children].filter((k) => !k.classList.contains('vs-ui'))) }),
      // Enter in Absatz oder kleiner Überschrift: neuer Absatz dahinter (in Listen: neuer Punkt, wie gewohnt)
      enter: e.tagName === 'P' || e.tagName === 'H3' ? (ev) => absatzTeilen(ev, e, i) : undefined,
    });
  }

  function absatzTeilen(ev: KeyboardEvent, e: HTMLElement, i: number) {
    ev.preventDefault();
    const sel = getSelection();
    if (!sel?.rangeCount) return;
    const r = sel.getRangeAt(0);
    r.deleteContents();
    const rest = document.createRange();
    rest.setStart(r.endContainer, r.endOffset);
    rest.setEnd(e, e.childNodes.length);
    const neu = el('p', [...e.classList].filter((c) => c.startsWith('gr')).join(' '));
    neu.append(rest.extractContents());
    if (!neu.textContent) neu.append(el('br', ''));
    if (!e.textContent) e.append(el('br', ''));
    e.after(neu);
    absatzEinrichten(neu, i);
    neu.focus();
    sel.collapse(neu, 0);
    neu.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /** Absätze und Zwischentitel (auch leere, frisch eingefügte) */
  function texte(teil: HTMLElement, i: number) {
    const art = stand.arten[i];
    if (art !== 'text' && art !== 'zwischentitel') return;
    const md = stand.abschnitte[i] ?? '';
    const gr = stand.groessen[i] && stand.groessen[i] !== 'standard' ? `gr gr--${stand.groessen[i]}` : '';
    if (!md.trim()) {
      // leerer Block: gleich beschreibbar
      const neu = el(art === 'zwischentitel' ? 'h2' : 'p', `vs-neu ${gr}`.trim());
      teil.replaceChildren(neu);
      if (art === 'zwischentitel') editierbar(neu, { einfach: true, label: 'Zwischentitel', platzhalter: 'Zwischentitel', eingabe: () => schicken({ art: 'text', i, wert: neu.innerText.replace(/\s+/g, ' ').trim() }) });
      else absatzEinrichten(neu, i);
      return;
    }
    if (art === 'zwischentitel') {
      const h2 = teil.querySelector<HTMLElement>(':scope > h2');
      if (h2) editierbar(h2, { einfach: true, label: 'Zwischentitel', eingabe: () => schicken({ art: 'text', i, wert: h2.innerText.replace(/\s+/g, ' ').trim() }) });
      return;
    }
    const kinder = [...teil.children];
    if (!kinder.length || kinder.some((k) => !BLOECKE.has(k.tagName))) return;
    // Rückweg prüfen: gleiche Seite wie vorher? (die Schriftgröße steht nicht im Text, sondern am Block)
    const innen = md.replace(GR, '$1');
    if (!gleich(renderMarkdown(zuMarkdown(kinder), basis, { lang: stand.lang }), renderMarkdown(innen, basis, { lang: stand.lang }))) return;
    kinder.forEach((k) => absatzEinrichten(k as HTMLElement, i));
  }

  /** Bildunterschrift eines Bild-Blocks (ein Foto oder Galerie) */
  function unterschrift(teil: HTMLElement, i: number) {
    if (!/^bilder:(raster|neben):[1-9]/.test(stand.arten[i] ?? '')) return;
    const cap = teil.querySelector<HTMLElement>(':scope > figure.nb > .nb__cap');
    if (!cap) return;
    let text = cap.querySelector<HTMLElement>(':scope > .nb__text');
    if (!text) {
      text = el('span', 'nb__text');
      const k = cap.querySelector(':scope > .nb__k');
      if (k) k.after(text);
      else cap.prepend(text);
    }
    const t = text;
    editierbar(t, { einfach: true, label: 'Bildunterschrift', platzhalter: 'Bildunterschrift …', eingabe: () => schicken({ art: 'unterschrift', i, wert: t.innerText.replace(/\s+/g, ' ').trim() }) });
  }

  /** ein einzelnes Foto: Breite an den Griffen ziehen */
  function griffe(teil: HTMLElement, i: number) {
    if (!/^bilder:(raster|neben):1$/.test(stand.arten[i] ?? '')) return;
    const fig = teil.querySelector<HTMLElement>(':scope > figure.nb');
    if (!fig) return;
    const start = stufeVon(fig);
    fig.classList.add('vs-bild');
    const masz = el('span', 'vs-ui vs-masz');
    masz.hidden = true;
    fig.append(masz);

    for (const seite of ['l', 'r'] as const) {
      const griff = el('span', `vs-ui vs-griff vs-griff--${seite}`);
      griff.title = 'Ziehen: breiter oder schmaler';
      griff.setAttribute('aria-hidden', 'true');
      fig.append(griff);
      griff.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        ziehen = true;
        griff.setPointerCapture(e.pointerId);
        waehlen(i);
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
          leiste.querySelectorAll('[aria-label^="Breite: "]').forEach((b, j) => b.setAttribute('aria-pressed', String(j === k)));
          platzieren();
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
    const l = el('div', 'vs-ui vs-kopfleiste');
    l.setAttribute('role', 'toolbar');
    l.setAttribute('aria-label', 'Titelbild');
    l.append(knopf(stand.titelbild ? 'Titelbild tauschen' : 'Titelbild wählen', 'Titelbild aus der Mediathek wählen', () => schicken({ art: 'titelbild' })));
    k.append(l);
  }

  // ---------- Ereignisse ----------
  // Block unter der Maus zeigt die Leiste (solange nirgends geschrieben wird)
  article.addEventListener('mouseover', (e) => {
    if (!stand.an || beschaeftigt()) return;
    const teil = (e.target as Element).closest<HTMLElement>('[data-abschnitt]');
    if (teil) waehlen(Number(teil.dataset.abschnitt));
  });
  article.addEventListener('focusin', (e) => {
    const teil = (e.target as Element).closest<HTMLElement>('[data-abschnitt]');
    if (stand.an && teil) waehlen(Number(teil.dataset.abschnitt));
  });
  addEventListener('resize', platzieren);
  // Einfüge-Menü schließt bei einem Klick daneben
  document.addEventListener('pointerdown', (e) => {
    if (!menue.hidden && !(e.target as Element).closest('.vs-menue, .vs-block')) menue.hidden = true;
  });
  // Rückgängig / Wiederholen: der Verlauf liegt im Editor
  addEventListener('keydown', (e) => {
    if (!stand.an || !(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k !== 'z' && k !== 'y') return;
    e.preventDefault();
    umbauen({ art: k === 'y' || e.shiftKey ? 'wiederholen' : 'rueckgaengig' });
  });
  menue.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      menue.hidden = true;
      leiste.querySelector<HTMLElement>('[aria-expanded]')?.focus();
    }
  });

  return {
    einrichten(s) {
      stand = s;
      document.documentElement.classList.toggle('vorschau-direkt', s.an);
      if (!s.an) {
        leiste.hidden = true;
        menue.hidden = true;
        return;
      }
      felder();
      kopf();
      article.querySelectorAll<HTMLElement>('[data-abschnitt]').forEach((teil) => {
        const i = Number(teil.dataset.abschnitt);
        texte(teil, i);
        unterschrift(teil, i);
        griffe(teil, i);
      });
      if (aktiv !== null && aktiv >= s.arten.length) aktiv = s.arten.length ? s.arten.length - 1 : null;
      const a = aktiv;
      aktiv = null;
      waehlen(a);
      // frisch eingefügter Absatz oder Zwischentitel: gleich schreiben
      if (fokusNach !== null) {
        const f = teilVon(fokusNach)?.querySelector<HTMLElement>(FELD);
        fokusNach = null;
        if (f) {
          f.focus();
          f.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
    },
    beschaeftigt,
    cursorMerken() {
      const f = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>(FELD);
      const sel = getSelection();
      if (!f || !sel?.rangeCount) return () => {};
      // welches Feld: Abschnitt + Position darin, sonst Titel bzw. Teaser
      const teil = f.closest<HTMLElement>('[data-abschnitt]');
      const finden = teil
        ? ((i: string, k: number) => () => article.querySelector(`[data-abschnitt="${i}"]`)?.children[k])(teil.dataset.abschnitt!, [...teil.children].indexOf(f))
        : ((cls: string) => () => article.querySelector(`.${cls}`))(f.classList.contains('ak__titel') ? 'ak__titel' : f.classList.contains('ab__stand') ? 'ab__stand' : 'ak__teaser');
      const vorher = document.createRange();
      vorher.setStart(f, 0);
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
    antwort(id, daten) {
      anfragen.get(id)?.(daten);
      anfragen.delete(id);
    },
    klick(e) {
      if (!stand.an) return false;
      const t = e.target as Element;
      if (t.closest('.vs-ui')) return true;
      if (t.closest(FELD)) {
        if (t.closest('a')) e.preventDefault(); // Links im Text nicht öffnen
        return true;
      }
      const teil = t.closest<HTMLElement>('[data-abschnitt]');
      if (teil) {
        // Block wählen statt springen (Großansicht und Links nicht öffnen); „Formular“ in der Leiste springt
        e.preventDefault();
        e.stopPropagation();
        waehlen(Number(teil.dataset.abschnitt));
        return true;
      }
      return false;
    },
  };
}
