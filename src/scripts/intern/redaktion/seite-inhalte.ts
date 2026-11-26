/**
 * „Website bearbeiten“ (seite-bearbeiten.ts): Inhalte aus den Bereichen der Redaktion – Formate, Personen, Partner,
 * Vereinsdaten, Fotos … – direkt auf der Seite. Ein Klick öffnet das Formular des Eintrags in einer Seitenleiste
 * (Eintrag-Seite mit ?eingebettet=1). Was man dort tippt, ausblendet oder an Fotos wählt, zeigt die Seite sofort
 * (vorschau.ts → anwender); gespeichert wird im Formular. Gespeichertes bleibt sichtbar, bis die Website neu gebaut ist.
 *
 * Gefunden wird ein Eintrag 1. über seinen Anker (bereiche.ts → anker, z. B. #pop-up), 2. über die Texte seiner Felder
 * (ein Element mit genau diesem Text; ein Text, den mehrere Einträge haben, zählt nur innerhalb des Ankers) und 3. über
 * seine Fotos (Dateiname im Bild). Ist die ganze Seite ein Eintrag (Textseite, Profil, Termin), gilt die ganze Seite.
 * Welche Bereiche zu einer Seite gehören, steht in src/settings/texte.json (Abschnitt → auch: redaktion:<bereich>).
 */
import type { TextSeite } from '../../../lib/texte-regeln';
import { bereich as bereichNach, type Bereich } from './bereiche';
import { pfadIn } from '../../../lib/i18n';
import { internUrl } from '../session';
import { laden, type Eintrag, type Geladen } from './daten';
import { redaktionUrl, type Redaktion } from './seite';
import { anwender, bildPasst, type Zustand } from './vorschau';

interface Inhalt {
  b: Bereich;
  e: Eintrag;
  /** gehört zu „Auf jeder Seite“ (Vereinsdaten im Fuß) bzw. zur Seite selbst (beides möglich) */
  allgemein?: boolean;
  eigen?: boolean;
}
/** Zustand, wie ihn das Formular schickt: neue Fotos als Datei (eintrag/index.astro → zustandFuerSeite) */
type FachZustand = Zustand & { fotos?: [string, Blob][] };

const BILD = /\.(jpe?g|png|webp|avif)$/i;
const LINK = /^(https?:\/\/|mailto:|tel:)/i;
const ADRESSE = /^(https?:|mailto:|\/|\.\.?\/|#)|\.(md|pdf)$/i;
/** zum Vergleichen: ohne Leerraum, Anführungszeichen und Pfeile („Zitat“, „POP UP →“) */
const norm = (s: string) => s.replace(/[\s„“”"«»‚‘’→↗]+/g, '');
const linkNorm = (h: string) => h.trim().replace(/^https?:\/\/(www\.)?/i, '').replace(/\/+$/, '').toLowerCase();
const schluessel = (x: Inhalt) => `${x.b.id}|${x.e.id}`;
const BUCHSTABE = /[\p{L}\p{N}]/u;
/** hier nichts markieren: Leisten des Editors, feste Texte (die haben Vorrang) */
const FREMD = 'svg, script, style, template, noscript, .sb-leiste, .sb-chip, .sb-werkzeug, [data-sb-text]';
/** Karten: der Block um die Felder eines Eintrags (Klick auf Datum, Nummer, Initialen öffnet ihn) */
const KARTE = 'li, article, figure, details, blockquote, a, tr, [class*="card"], [class*="karte"], [class*="kachel"], [class*="venue"]';
/** darüber hinaus keine Karte (Abschnitte, Listen, Seite) */
const GRENZE = /^(BODY|MAIN|SECTION|UL|OL|NAV|HEADER|FOOTER|FORM|ASIDE)$/;
const BASIS = import.meta.env.BASE_URL.replace(/\/?$/, '/');

/** Texte eines Eintrags (beide Sprachen, Zeile für Zeile), Fotos (Dateiname) und Adressen (Website, Instagram) */
function werte(e: Eintrag): { texte: string[]; fotos: string[]; links: string[] } {
  const texte: string[] = [];
  const fotos: string[] = [];
  const links: string[] = [];
  const gehen = (v: unknown) => {
    if (typeof v === 'string') {
      const t = v.trim();
      if (BILD.test(t)) fotos.push(t.split('/').pop()!);
      else if (LINK.test(t)) links.push(t);
      else if (!ADRESSE.test(t) && !/^\d{4}-\d{2}-\d{2}/.test(t)) texte.push(...t.split('\n').map((z) => z.trim()).filter((z) => z.length >= 3));
    } else if (Array.isArray(v)) v.forEach(gehen);
    else if (v && typeof v === 'object') Object.values(v).forEach(gehen);
  };
  gehen(e.data);
  gehen(e.en?.data);
  return { texte, fotos, links };
}

/** Titel eines Eintrags (Name, Überschrift) */
const titelVon = (x: Inhalt) => (x.b.art === 'einstellung' ? x.b.label : x.b.titel(x.e, { name: (_q, id) => id }) || x.e.id);

/** Name im Knopf über dem Inhalt: „Format „POP UP“ bearbeiten“ */
function name(x: Inhalt): string {
  if (x.b.art === 'einstellung') return `${x.b.label} bearbeiten`;
  const titel = titelVon(x);
  return `${x.b.einzahl} „${titel.length > 40 ? `${titel.slice(0, 38)}…` : titel}“ bearbeiten`;
}

/** Seite einer Adresse wie im Seitenplan (ohne Basis-Pfad, englische Seiten unter der deutschen Adresse, mit #Sprungmarke) */
function linkSeite(a: HTMLAnchorElement): string | null {
  const u = new URL(a.href, a.ownerDocument.baseURI);
  if (u.origin !== location.origin || !u.pathname.startsWith(BASIS)) return null;
  const p = decodeURIComponent(u.pathname.slice(BASIS.length));
  return (/^en(\/|$)/.test(p) ? pfadIn(p.replace(/^en\/?/, ''), 'de') : p) + u.hash;
}
const finde1 = (d: Document, sel: string) => {
  try {
    return d.querySelector<HTMLElement>(sel);
  } catch {
    return null;
  }
};

/**
 * Markiert die Inhalte auf der Seite: data-sb-inhalt="<bereich>|<id>" (Anker, Karte, Feld, Foto), dazu data-sb-feld
 * (Text des Felds) bzw. data-sb-foto (Dateiname). Feste Texte (data-sb-text) haben Vorrang. Der Reihe nach:
 * ausdrücklich in der Seite (data-sb-eintrag), Anker und ganze Seiten, Elemente mit genau dem Text eines Felds, Texte
 * als Teil eines Textknotens („© 2026 TanzNetzDresden e.V.“, zwei Felder mit <br>), Links mit der Adresse eines Felds
 * (Instagram, Website), Fotos, Links zur Seite eines Eintrags und Sprungmarken (#pop-up, Inhaltsverzeichnis), die
 * Karte um die Felder eines Eintrags (Datum, Nummer, Initialen gehören dazu) und Kopien davon (Mosaik).
 * Gibt die Zahl der Einträge zurück.
 */
export function markieren(d: Document, inhalte: Inhalt[], pfad: string): number {
  const alle = inhalte.map((x) => ({ x, key: schluessel(x), titel: norm(titelVon(x)), ...werte(x.e) }));
  type A = (typeof alle)[number];
  const nach = new Map(alle.map((a) => [a.key, a]));
  const gefunden = new Set<string>();
  const setzen = (el: Element, a: A, feld?: { text?: string; foto?: string }) => {
    el.setAttribute('data-sb-inhalt', a.key);
    if (feld?.text) el.setAttribute('data-sb-feld', feld.text);
    if (feld?.foto) el.setAttribute('data-sb-foto', feld.foto);
    gefunden.add(a.key);
  };
  const frei = (el: Element) => !el.closest(FREMD);
  /** enthält Felder oder Anker eines anderen Eintrags (Fotos zählen nicht: die Demo-Ansicht leiht sich welche) */
  const fremdInnen = (el: Element, key: string) =>
    [...el.querySelectorAll('[data-sb-inhalt]:not([data-sb-foto])')].some((o) => o.getAttribute('data-sb-inhalt') !== key);

  // 0. ausdrücklich in der Seite (Ausgaben im Tanzkalender-Archiv …)
  for (const el of d.querySelectorAll<HTMLElement>('[data-sb-eintrag]')) {
    const a = nach.get(el.dataset.sbEintrag ?? '');
    if (a && !el.hasAttribute('data-sb-inhalt')) setzen(el, a);
  }

  // 1. Anker und ganze Seiten (Termin, Profil, Textseite: eigene Seite je Eintrag, nicht die Seite einer ganzen Liste)
  const proSeite = new Map<string, number>();
  for (const a of alle) {
    const s = a.x.b.seite?.(a.x.e);
    if (s) proSeite.set(`${a.x.b.id}|${s}`, (proSeite.get(`${a.x.b.id}|${s}`) ?? 0) + 1);
  }
  const eigeneSeite = (a: A) => {
    const s = a.x.b.seite?.(a.x.e);
    return s && proSeite.get(`${a.x.b.id}|${s}`) === 1 ? s : null;
  };
  const anker = new Map<string, HTMLElement>();
  const ganz = new Set<string>();
  for (const a of alle) {
    const { b, e } = a.x;
    const ganzeSeite = !b.anker && eigeneSeite(a) === pfad;
    let el = b.anker ? finde1(d, b.anker(e)) : ganzeSeite && b.textSelektor ? finde1(d, b.textSelektor) : null;
    // Anker an einer Überschrift (Sprungziel der Vorschau): der Block darum gehört dazu, bis zum nächsten Abschnitt
    if (el && /^H[1-6]$/.test(el.tagName)) {
      const andere = alle.filter((o) => o.x.b === b && o !== a && b.anker).map((o) => b.anker!(o.x.e));
      el = el.parentElement;
      for (let i = 0; el && i < 4 && !/^(SECTION|ARTICLE|LI|DETAILS)$/.test(el.tagName); i++) {
        const hoeher: HTMLElement | null = el.parentElement;
        if (!hoeher || hoeher === d.body || andere.some((sel) => { try { return hoeher.querySelector(sel); } catch { return false; } })) break;
        el = hoeher;
      }
    }
    if (el) {
      anker.set(a.key, el);
      if (!el.hasAttribute('data-sb-inhalt')) setzen(el, a);
    }
    if (ganzeSeite) {
      ganz.add(a.key);
      const main = d.querySelector('main');
      if (main && !main.hasAttribute('data-sb-inhalt')) setzen(main, a);
    }
  }

  // wem gehört ein Text an dieser Stelle? Dem Eintrag, in dessen Anker er steht, sonst dem einzigen mit diesem Text,
  // der ganzen Seite, dem mit diesem Titel (Name des Formats im Netz, auch wenn die Chronik ihn nennt) oder – zwei
  // Bereiche mit demselben Text (Vereinsdaten, Bausteine) – nach Lage: im Inhalt die Seite, außerhalb „Auf jeder Seite“
  const wer = new Map<string, A[]>();
  const roh = new Map<string, string>();
  for (const a of alle) {
    for (const t of a.texte) {
      const k = norm(t);
      if (!roh.has(k)) roh.set(k, t);
      const ks = wer.get(k) ?? wer.set(k, []).get(k)!;
      if (!ks.includes(a)) ks.push(a);
    }
  }
  const besitzer = (k: string, el: Element): A | undefined => {
    const ks = wer.get(k) ?? [];
    if (!ks.length) return undefined;
    const imAnker = ks.filter((x) => anker.get(x.key)?.contains(el)).sort((x, y) => (anker.get(x.key)!.contains(anker.get(y.key)!) ? 1 : -1))[0];
    if (imAnker) return imAnker;
    if (ks.length === 1) return ks[0];
    for (const passt of [(x: A) => ganz.has(x.key), (x: A) => x.titel === k]) {
      const hier = ks.filter(passt);
      if (hier.length === 1) return hier[0];
    }
    // außerhalb des Inhalts (Fuß) gilt „Auf jeder Seite“, auch wenn Einträge der Seite denselben Text haben („Dresden“)
    const aussen = !el.closest('main');
    const hier = ks.filter((x) => (aussen ? x.x.allgemein : x.x.eigen));
    if (hier.length === 1 && (aussen || new Set(ks.map((x) => x.x.b.id)).size === ks.length)) return hier[0];
    return undefined;
  };

  // 2. Elemente mit genau dem Text eines Felds (das innerste)
  const index = new Map<string, HTMLElement[]>();
  for (const el of d.body.querySelectorAll<HTMLElement>('*')) {
    if (/^(SCRIPT|STYLE|SVG|CANVAS|NOSCRIPT|TEMPLATE|IFRAME|IMG|TEXTAREA|BUTTON|SELECT|INPUT)$/i.test(el.tagName)) continue;
    if (!frei(el) || el.querySelector('[data-sb-text]')) continue;
    const k = norm(el.textContent ?? '');
    if (k && k.length <= 300 && wer.has(k)) (index.get(k) ?? index.set(k, []).get(k)!).push(el);
  }
  for (const [k, els] of index) {
    for (const el of els.filter((el) => !els.some((o) => o !== el && el.contains(o)))) {
      const a = el.hasAttribute('data-sb-feld') ? undefined : besitzer(k, el);
      if (a) setzen(el, a, { text: roh.get(k) });
    }
  }

  // 3. als Teil eines Textknotens: ein ganzer Knoten neben anderen (zwei Felder mit <br>) oder ein Feld mitten im Text
  // eines kurzen Knotens („© 2026 TanzNetzDresden e.V.“, „70+ Tanzschaffende“)
  // (ab 6 Zeichen, Zahlen ab 5: Postleitzahl)
  const teile = [...roh.values()].map((t) => t.replace(/\s+/g, ' ')).filter((t) => (t.length >= 6 || /^\d{5}$/.test(t)) && t.length <= 160);
  const knoten: Text[] = [];
  const w = d.createTreeWalker(d.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode() as Text | null; n; n = w.nextNode() as Text | null) {
    const p = n.parentElement;
    if (p && n.data.trim() && frei(p) && !p.closest('[data-sb-feld], [data-sb-foto], button, textarea, select')) knoten.push(n);
  }
  const huelle = (n: Text, von: number, bis: number) => {
    const r = d.createRange();
    r.setStart(n, von);
    r.setEnd(n, bis);
    const span = d.createElement('span');
    r.surroundContents(span);
    return span;
  };
  for (const n of knoten) {
    const p = n.parentElement!;
    const k = norm(n.data);
    if (wer.has(k)) {
      const a = besitzer(k, p);
      if (!a) continue;
      const anfang = n.data.length - n.data.trimStart().length;
      setzen(huelle(n, anfang, anfang + n.data.trim().length), a, { text: roh.get(k) });
      continue;
    }
    if (n.data.length > 200) continue;
    const s = n.data.replace(/\s+/g, ' ');
    let best = '';
    for (const t of teile) {
      if (t.length <= best.length || s.length > t.length + 40) continue;
      const i = s.indexOf(t);
      if (i >= 0 && !BUCHSTABE.test(s[i - 1] ?? '') && !BUCHSTABE.test(s[i + t.length] ?? '')) best = t;
    }
    const a = best ? besitzer(norm(best), p) : undefined;
    if (!a) continue;
    if (norm(p.textContent ?? '') === k && !GRENZE.test(p.tagName) && !p.hasAttribute('data-sb-inhalt')) setzen(p, a, { text: best });
    else {
      const m = new RegExp(best.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')).exec(n.data);
      if (!m) continue;
      // Rest ohne Wörter (Postleitzahl, Jahr): der ganze Knoten
      const ganzerKnoten = !/\p{L}{2,}/u.test(n.data.replace(m[0], ''));
      const anfang = n.data.length - n.data.trimStart().length;
      setzen(ganzerKnoten ? huelle(n, anfang, anfang + n.data.trim().length) : huelle(n, m.index, m.index + m[0].length), a, { text: best });
    }
  }

  // 4. Links mit der Adresse eines Felds (Instagram, Website, Förderer)
  const linkWer = new Map<string, A[]>();
  for (const a of alle) for (const l of a.links) (linkWer.get(linkNorm(l)) ?? linkWer.set(linkNorm(l), []).get(linkNorm(l))!).push(a);
  for (const el of d.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    if (!frei(el) || el.hasAttribute('data-sb-inhalt') || el.closest('[data-sb-feld]') || !LINK.test(el.getAttribute('href') ?? '')) continue;
    const ks = [...new Set(linkWer.get(linkNorm(el.href)) ?? [])];
    const a = ks.find((x) => anker.get(x.key)?.contains(el)) ?? (ks.length === 1 ? ks[0] : undefined);
    if (a) setzen(el, a, { text: a.links.find((l) => linkNorm(l) === linkNorm(el.href)) });
  }

  // 5. Fotos (Dateiname im Bild); mit Anker nur darin
  const bilder = [...d.querySelectorAll<HTMLImageElement>('img')];
  for (const a of alle) {
    const an = anker.get(a.key);
    for (const f of a.fotos) {
      for (const img of bilder) {
        if (img.hasAttribute('data-sb-foto') || (an && !ganz.has(a.key) && !an.contains(img))) continue;
        if (bildPasst(`${img.getAttribute('src') ?? ''} ${img.getAttribute('srcset') ?? ''}`, f.replace(/\.[^.]+$/, ''))) setzen(img, a, { foto: f });
      }
    }
  }

  // 6. Links zur Seite eines Eintrags (Profil, Termin, Format) und Sprungmarken zu einem markierten Block
  const zuSeite = new Map<string, A>();
  for (const a of alle) {
    const s = eigeneSeite(a);
    if (s && s !== pfad) zuSeite.set(s, a);
  }
  for (const el of d.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    if (!frei(el) || el.hasAttribute('data-sb-inhalt') || el.closest('[data-sb-feld], .site-header, .site-footer, .skip-link')) continue;
    let a = (() => {
      const s = linkSeite(el);
      return s === null ? undefined : zuSeite.get(s);
    })();
    const href = el.getAttribute('href') ?? '';
    if (!a && href.startsWith('#') && href.length > 1) {
      const ziel = d.getElementById(decodeURIComponent(href.slice(1)));
      if (ziel && !el.contains(ziel)) a = nach.get(ziel.closest('[data-sb-inhalt]')?.getAttribute('data-sb-inhalt') ?? '');
    }
    if (a && !fremdInnen(el, a.key)) setzen(el, a);
  }

  // 7. Karten: der äußerste Block um ein Feld (bis 5 Ebenen), der nichts von einem anderen Eintrag enthält
  for (const el of [...d.querySelectorAll<HTMLElement>('[data-sb-feld]')]) {
    const key = el.getAttribute('data-sb-inhalt')!;
    let karte: HTMLElement | null = null;
    let k = el.parentElement;
    for (let i = 0; k && i < 5 && !GRENZE.test(k.tagName) && !k.hasAttribute('data-sb-inhalt') && !fremdInnen(k, key) && frei(k); i++, k = k.parentElement) {
      if (k.matches(KARTE) && !k.closest('.site-header')) karte = k;
    }
    if (karte) setzen(karte, nach.get(key)!);
  }

  // 8. Kopien eines markierten Blocks (Mosaik, Laufband): gleiche Klasse, gleicher Text
  for (const el of [...d.querySelectorAll<HTMLElement>('[data-sb-inhalt]:not([data-sb-feld]):not([data-sb-foto])')]) {
    const cls = el.classList[0];
    const t = norm(el.textContent ?? '');
    if (!cls || !t || el.tagName === 'MAIN') continue;
    const key = el.getAttribute('data-sb-inhalt')!;
    for (const o of d.querySelectorAll<HTMLElement>(`${el.tagName}.${CSS.escape(cls)}`)) {
      if (o !== el && !o.hasAttribute('data-sb-inhalt') && frei(o) && norm(o.textContent ?? '') === t && !fremdInnen(o, key)) setzen(o, nach.get(key)!);
    }
  }
  return gefunden.size;
}

/**
 * Beiträge und Termine aus dem internen Bereich (News-Editor, Kalender): Links zu ihnen bekommen den Knopf mit dem
 * Weg zum Bearbeiten (data-sb-extern = Adresse, data-sb-name = Beschriftung; neuer Tab). Ältere Termine aus Dateien
 * öffnen ihr Formular in der Seitenleiste (data-sb-daneben). Blöcke mit data-sb-quelle (Kalender, Beiträge) zeigen,
 * wo ihr Inhalt gepflegt wird; ein Beitrag aus dem News-Editor gilt als ganze Seite.
 */
function externMarkieren(d: Document, termineDateien: Set<string>, pfad: string) {
  const beitrag = (p: string) => `${redaktionUrl('bearbeiten/')}?seite=${encodeURIComponent(p)}`;
  for (const a of d.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    if (a.hasAttribute('data-sb-inhalt') || a.closest('[data-sb-feld], [data-sb-text], .site-header, .site-footer')) continue;
    const p = linkSeite(a)?.replace(/#.*$/, '');
    const news = p && /^news\/([^/]+)\/$/.exec(p);
    const termin = p && /^termine\/([^/]+)\/$/.exec(p);
    if (news) {
      a.dataset.sbExtern = beitrag(p);
      a.dataset.sbName = 'Beitrag bearbeiten ↗';
    } else if (termin && termineDateien.has(termin[1])) {
      a.dataset.sbExtern = redaktionUrl('eintrag/', { b: 'termine', id: termin[1], eingebettet: '1' });
      a.dataset.sbName = 'Termin bearbeiten';
      a.dataset.sbDaneben = '';
    } else if (termin) {
      a.dataset.sbExtern = internUrl('kalender/');
      a.dataset.sbName = 'Im Kalender bearbeiten ↗';
    }
  }
  const quellen: Record<string, [string, string]> = {
    kalender: [internUrl('kalender/'), 'Im Kalender bearbeiten ↗'],
    news: [internUrl('news/'), 'Beiträge im News-Editor ↗'],
  };
  for (const el of d.querySelectorAll<HTMLElement>('[data-sb-quelle]')) {
    const q = quellen[el.dataset.sbQuelle ?? ''];
    if (q && !el.hasAttribute('data-sb-inhalt') && !el.dataset.sbExtern) [el.dataset.sbExtern, el.dataset.sbName] = q;
  }
  const main = d.querySelector<HTMLElement>('main');
  if (main && /^news\/[^/]+\/$/.test(pfad) && !main.hasAttribute('data-sb-inhalt')) {
    main.dataset.sbExtern = beitrag(pfad);
    main.dataset.sbName = 'Beitrag bearbeiten ↗';
  }
}

/** Zustände zusammenlegen (Gespeichertes und das offene Formular) */
const zusammen = (zs: Zustand[]): Zustand => ({
  ersetzen: zs.flatMap((z) => z.ersetzen ?? []),
  html: zs.flatMap((z) => z.html ?? []),
  aus: zs.flatMap((z) => z.aus ?? []),
  bilder: zs.flatMap((z) => z.bilder ?? []),
});

export interface Inhalte {
  /** nach dem Laden einer Seite im Rahmen: Inhalte finden, Knopf und Klicks einrichten; gibt die Zahl der Einträge zurück */
  seite(d: Document, seiten: (TextSeite | undefined)[], pfad: string): Promise<number>;
  /** Formular zu einem markierten Element öffnen (Klick auf Feld oder Foto) */
  oeffnen(el: HTMLElement): void;
  /** Liste der Redaktion in der Seitenleiste öffnen („Listen“ oben) */
  liste(href: string): void;
  /** Formular hat ungespeicherte Änderungen */
  offen(): boolean;
}

export function inhalte(r: Redaktion, meldung: (text: string, art?: 'error' | 'ok') => void): Inhalte {
  const fach = document.querySelector<HTMLElement>('[data-sb-fach]')!;
  const rahmen = fach.querySelector<HTMLIFrameElement>('iframe')!;
  const geladen = new Map<string, Promise<Geladen | null>>();
  let liste: Inhalt[] = [];
  let seiteJetzt: ReturnType<typeof anwender> | null = null;
  /** gespeichert, aber noch nicht auf der Website (sie baut 2–3 Minuten) */
  const gespeichert: Zustand[] = [];
  let entwurf: Zustand = {};
  let ungespeichert = false;

  const anwenden = () => seiteJetzt?.anwenden(zusammen([...gespeichert, entwurf]));
  // shortcut: Adressen der Fotos werden nie freigegeben, reicht für eine Sitzung im Editor
  const umwandeln = (z: FachZustand): Zustand => ({ ...z, bilder: (z.fotos ?? []).map(([stamm, blob]) => [stamm, URL.createObjectURL(blob)]) });

  function auf(href: string, titel: string) {
    if (ungespeichert && !confirm('Im Formular gibt es ungespeicherte Änderungen. Verwerfen?')) return;
    ungespeichert = false;
    entwurf = {};
    anwenden();
    fach.querySelector('[data-sb-fach-titel]')!.textContent = titel;
    rahmen.src = href;
    fach.hidden = false;
  }
  function zu() {
    if (ungespeichert && !confirm('Im Formular gibt es ungespeicherte Änderungen. Verwerfen?')) return;
    ungespeichert = false;
    entwurf = {};
    anwenden();
    fach.hidden = true;
    rahmen.src = 'about:blank';
  }
  fach.querySelector('[data-sb-fach-zu]')!.addEventListener('click', zu);
  addEventListener('keydown', (ev) => ev.key === 'Escape' && !fach.hidden && document.activeElement === document.body && zu());

  addEventListener('message', (ev) => {
    if (ev.origin !== location.origin || ev.source !== rahmen.contentWindow || ev.data?.quelle !== 'sb-fach') return;
    const m = ev.data as { sb: string; ja?: boolean; titel?: string; zustand?: FachZustand };
    if (m.sb === 'offen') ungespeichert = !!m.ja;
    else if (m.sb === 'schliessen') zu();
    else if (m.sb === 'zustand' && m.zustand) {
      entwurf = umwandeln(m.zustand);
      anwenden();
    } else if (m.sb === 'gespeichert' && m.zustand) {
      gespeichert.push(umwandeln(m.zustand));
      entwurf = {};
      ungespeichert = false;
      anwenden();
      meldung(`Gespeichert: ${m.titel ?? 'Eintrag'}. Die Website zeigt das in 2–3 Minuten.`, 'ok');
    }
  });

  const finde = (key: string) => liste.find((x) => schluessel(x) === key);
  function oeffnen(el: HTMLElement) {
    const x = finde(el.dataset.sbInhalt ?? '');
    if (!x) return;
    const feld = el.dataset.sbFoto ?? el.dataset.sbFeld;
    auf(redaktionUrl('eintrag/', { b: x.b.id, id: x.b.art === 'einstellung' ? undefined : x.e.id, feld, eingebettet: '1' }), name(x).replace(/ bearbeiten$/, ''));
    // die Seite wird schmaler: angeklickte Stelle im Blick behalten
    window.setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }), 150);
  }

  /** Knopf über dem Inhalt unter der Maus (Name des Eintrags) */
  function knopf(d: Document) {
    const chip = d.createElement('button');
    chip.type = 'button';
    chip.className = 'sb-chip';
    chip.hidden = true;
    d.body.append(chip);
    let ziel: HTMLElement | null = null;
    let timer = 0;
    const weg = () => {
      ziel?.classList.remove('sb-ueber');
      ziel = null;
      chip.hidden = true;
    };
    d.addEventListener('mouseover', (ev) => {
      const t = ev.target as Element;
      if (chip.contains(t)) return window.clearTimeout(timer);
      const el = t.closest('[data-sb-text]') ? null : t.closest<HTMLElement>('[data-sb-inhalt], [data-sb-extern]');
      if (el === ziel) return window.clearTimeout(timer);
      window.clearTimeout(timer);
      if (!el) {
        timer = window.setTimeout(weg, 350);
        return;
      }
      const x = finde(el.dataset.sbInhalt ?? '');
      if (!x && !el.dataset.sbExtern) return;
      ziel?.classList.remove('sb-ueber');
      ziel = el;
      el.classList.add('sb-ueber');
      chip.textContent = `✎ ${x ? name(x) : el.dataset.sbName}`;
      chip.hidden = false;
      const rect = el.getBoundingClientRect();
      const win = d.defaultView!;
      chip.style.top = `${win.scrollY + Math.max(4, rect.top - chip.offsetHeight)}px`;
      chip.style.left = `${win.scrollX + Math.max(4, Math.min(rect.left, win.innerWidth - chip.offsetWidth - 8))}px`;
    });
    // Maus verlässt die Seite (zur Leiste, ins Formular) oder die Seite scrollt: Knopf weg
    d.documentElement.addEventListener('mouseleave', () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(weg, 350);
    });
    d.addEventListener('scroll', weg, { passive: true });
    chip.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (!ziel) return;
      if (ziel.dataset.sbExtern === undefined) oeffnen(ziel);
      else if (ziel.dataset.sbDaneben !== undefined) auf(ziel.dataset.sbExtern, ziel.dataset.sbName ?? '');
      else window.open(ziel.dataset.sbExtern, '_blank', 'noopener');
    });
  }

  return {
    async seite(d, seiten, pfad) {
      seiteJetzt = anwender(d);
      const bereicheVon = (s: TextSeite | undefined) =>
        Object.values(s?.abschnitte ?? {}).flatMap((a) => (a.auch ?? []).map((z) => z.ziel)).filter((z) => z.startsWith('redaktion:')).map((z) => z.slice(10));
      const eigen = new Set(bereicheVon(seiten[0]));
      // Links zu Profilen (Termin, Startseite): Personen gehören dazu
      if (d.querySelector('main a[href*="/netzwerk/"], main a[href*="/network/"]')) eigen.add('personen');
      const ueberall = new Set(seiten.slice(1).flatMap(bereicheVon));
      const ids = new Set([...eigen, ...ueberall]);
      const bs = [...ids].map((id) => bereichNach(id)).filter((b): b is Bereich => !!b);
      const gs = await Promise.all(bs.map((b) => {
        // große Ordner (ältere Beiträge): nur Einträge, die hier verlinkt sind oder deren Seite das ist – jede Datei ist
        // eine Abfrage bei GitHub
        let dateien = r.stand.dateien;
        let key = b.id;
        if (b.art === 'ordner') {
          const ids = dateien.map((x) => (x.pfad.startsWith(`${b.ordner}/`) ? x.pfad.slice(b.ordner.length + 1, -3) : '')).filter((id) => id && !id.includes('/'));
          if (ids.length > 20) {
            const hier = ids.filter((id) => pfad.includes(`${id}/`) || d.querySelector(`a[href*="/${CSS.escape(id)}/"]`));
            dateien = dateien.filter((x) => hier.some((id) => x.pfad.endsWith(`/${id}.md`)));
            key = `${b.id}:${hier.join()}`;
          }
        }
        if (!geladen.has(key)) geladen.set(key, laden(r.a, b, dateien).catch(() => null));
        return geladen.get(key)!;
      }));
      // Rahmen ist inzwischen woanders (schnell weiternavigiert)
      if (!d.defaultView) return 0;
      liste = gs.flatMap((g, i) => (g ? g.eintraege.map((e) => ({ b: bs[i], e, eigen: eigen.has(bs[i].id), allgemein: ueberall.has(bs[i].id) })) : []));
      const n = markieren(d, liste, pfad);
      externMarkieren(d, new Set(r.stand.dateien.map((x) => /^src\/content\/termine\/(.+)\.md$/.exec(x.pfad)?.[1]).filter((x): x is string => !!x)), pfad);
      knopf(d);
      anwenden();
      return n;
    },
    oeffnen,
    liste(href) {
      auf(href, 'Listen und Inhalte');
    },
    offen: () => ungespeichert,
  };
}
