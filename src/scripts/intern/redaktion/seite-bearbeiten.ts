/**
 * Website-Inhalte → Seiten → „Auf der Seite bearbeiten“: die echte Seite der Website im Vollbild, ihre festen
 * Texte (src/settings/texte.json: Überschriften, Einleitungen, Knöpfe, Fuß) tippt man direkt auf der Seite.
 *
 * So funktioniert es: Die Seite wird in einem Rahmen geladen (gleiche Adresse). Danach sucht dieses Skript zu jedem
 * Text der Seite (und „Auf jeder Seite“) das Element, das genau diesen Text zeigt, und macht es beschreibbar.
 * Gefunden wird auch ein Text innerhalb eines längeren („Gestaltung: Name“), ein gleicher Text an mehreren Stellen
 * nach Teil der Seite (Kopfleiste, Fuß, Inhalt) und ein mehrzeiliger Text Zeile für Zeile. Was nicht sichtbar auf der
 * Seite steht (Platzhalter in Feldern, Betreff von E-Mails, Meldungen, Texte mit {zahl}, Titel für Suchmaschinen,
 * Ausgeblendetes), steht oben unter „Weitere Texte“ – so ist jeder Text der Seite hier bearbeitbar. Über dem Text mit dem Cursor steht eine
 * kleine Leiste: wo der Text steht, Zeichen, Zurücksetzen, Ausblenden (wo erlaubt).
 *
 * Navigieren geht wie auf der Website (Menü, Links, Sprache): Die Leiste stellt sich auf die neue Seite um, und
 * ungespeicherte Änderungen bleiben erhalten – gespeichert wird alles zusammen. Texte in Links (Menü, Knöpfe als
 * Link): Klick folgt dem Link, Doppelklick bearbeitet den Text (wie in gängigen Website-Editoren). Externe Links
 * öffnen in einem neuen Tab.
 *
 * Gespeichert wird wie unter Texte (src/lib/texte-regeln.ts: prüfen, übernehmen, Datei schreiben) über die Funktion
 * „inhalte“; die Website zeigt die Änderung nach 2–3 Minuten. Listen und Inhalte (Partner, Personen, Formate …)
 * öffnet „Listen und Inhalte“ in der Leiste im Formular.
 */
import { alleTexte, dateiText, platzhalter, textId, textPruefen, uebernehmen, type TextEintrag, type TextSeite } from '../../../lib/texte-regeln';
import type { Redaktion } from './seite';
import { meldung, websiteUrl, zielName, zielUrl } from './seite';

const PFAD = 'src/settings/texte.json';
type Sprache = 'de' | 'en';
interface Wert {
  de: string;
  en: string;
  aus?: boolean;
}
interface Treffer {
  id: string;
  e: TextEintrag;
  els: HTMLElement[];
  /** nur eine Zeile eines mehrzeiligen Texts (Zeilen in getrennten Elementen, z. B. Karten, Fragen und Antworten) */
  zeile?: number;
}
/**
 * Wo ein Text gesucht wird: zuerst im bevorzugten Teil der Seite, sonst wo erlaubt. So gehört ein gleicher Text an
 * mehreren Stellen zum passenden Eintrag (Menü oder Fuß, Einwilligung oder Newsletter, Seite oder „Auf jeder Seite“).
 */
interface Ort {
  bevorzugt: (el: Element) => boolean;
  erlaubt: (el: Element) => boolean;
}
const KOPF = '.site-header, .login-blende';
const FUSS = '.site-footer';
const EINWILLIGUNG = '[data-consent-banner]';
const ueberall = () => true;
function ortFuer(seite: string, abschnitt: string): Ort {
  const in_ = (sel: string) => (el: Element) => !!el.closest(sel);
  const nicht = (sel: string) => (el: Element) => !el.closest(sel);
  if (seite !== 'allgemein') return { bevorzugt: nicht(`${KOPF}, ${FUSS}, ${EINWILLIGUNG}`), erlaubt: nicht(`${KOPF}, ${FUSS}`) };
  if (abschnitt === 'kopf') return { bevorzugt: in_('.site-header'), erlaubt: nicht(`${FUSS}, ${EINWILLIGUNG}`) };
  if (abschnitt === 'fuss') return { bevorzugt: in_(FUSS), erlaubt: nicht(`${KOPF}, ${EINWILLIGUNG}`) };
  if (abschnitt === 'einwilligung') return { bevorzugt: in_(EINWILLIGUNG), erlaubt: in_(EINWILLIGUNG) };
  if (abschnitt === 'newsletter') return { bevorzugt: in_('.newsletter, #newsletter'), erlaubt: nicht(EINWILLIGUNG) };
  return { bevorzugt: ueberall, erlaubt: ueberall };
}
/** Texte hierin sind nicht sichtbar oder gehören nicht zur Seite */
const UNSICHTBAR = 'script, style, template, noscript, textarea, svg, .sb-leiste';

const norm = (s: string) => s.replace(/\s+/g, '');
/**
 * Text eines beschreibbaren Elements, wie er gespeichert wird: aus dem Inhalt (nicht innerText, das die
 * Großschreibung aus dem CSS übernähme); Zeilen an <br> und Blöcken (zweizeilige Überschriften).
 */
function lesen(el: HTMLElement, mehrzeilig: boolean): string {
  const teile: string[] = [];
  const gehen = (n: Node) => {
    for (const k of n.childNodes) {
      if (k.nodeType === Node.TEXT_NODE) teile.push(k.textContent ?? '');
      else if (k.nodeType === Node.ELEMENT_NODE) {
        // Element aus dem Rahmen: eigene Klassen und eigenes Fenster (kein instanceof, kein getComputedStyle von hier)
        const e = k as Element;
        if (e.tagName === 'BR') teile.push('\n');
        else {
          const block = /^(block|flex|grid|list-item|table)/.test(e.ownerDocument.defaultView?.getComputedStyle(e).display ?? 'inline');
          if (block) teile.push('\n');
          gehen(e);
          if (block) teile.push('\n');
        }
      }
    }
  };
  gehen(el);
  const text = teile.join('');
  return mehrzeilig
    ? text.split('\n').map((z) => z.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n')
    : text.replace(/\s+/g, ' ').trim();
}

const STIL = `
  [data-sb-text] { cursor: text; outline-offset: 4px; }
  [data-sb-text]:hover { outline: 1.5px dashed var(--cyan) !important; }
  [data-sb-text]:focus { outline: 2px solid var(--magenta) !important; }
  [data-sb-text].sb-geaendert:not(:focus) { outline: 2px dotted var(--magenta) !important; }
  [data-sb-aus] { opacity: 0.4; outline: 2px dashed var(--magenta) !important; }
  .sb-leiste { position: absolute; z-index: 2147483000; display: flex; flex-wrap: wrap; align-items: center; gap: 2px 8px; max-width: calc(100vw - 16px);
    padding: 4px 6px; background: var(--purple); color: #fff; font: 600 11px/1.4 var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; }
  .sb-leiste[hidden] { display: none; }
  .sb-leiste__wo { color: var(--cyan); }
  .sb-leiste__zahl[data-zu-lang] { color: var(--magenta); }
  .sb-leiste button { padding: 5px 8px; border: 0; background: transparent; color: #fff; font: inherit; letter-spacing: inherit; text-transform: inherit; cursor: pointer; }
  .sb-leiste button:hover { background: rgba(255, 255, 255, 0.14); }
  .sb-leiste button:focus-visible { outline: 2px solid var(--cyan); outline-offset: -2px; }
`;

export function seiteBearbeiten(r: Redaktion) {
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel);
  const root = $('[data-sb]')!;
  const frame = root.querySelector<HTMLIFrameElement>('iframe')!;
  const buehne = frame.parentElement as HTMLElement;
  const params = new URLSearchParams(location.search);
  let seite = params.get('s') ?? 'startseite';
  let pfad = params.get('pfad');
  let lang: Sprache = 'de';
  let geraet: 'computer' | 'handy' = 'computer';
  let datei: Record<string, unknown> = {};
  let sha: string | null = null;
  /** ungespeicherte Änderungen: id → beide Sprachen (und Ausblenden) */
  let neu = new Map<string, Wert>();
  let treffer: Treffer[] = [];
  const zurueckL: string[] = [];
  const vorL: string[] = [];
  let tippTimer = 0;
  let letzter = '[]';

  const seiteVon = (id: string) => datei[id] as TextSeite | undefined;
  const wahl = $<HTMLSelectElement>('[data-sb-seite]')!;
  const eintraege = () => alleTexte(datei).filter((x) => x.seite === seite || x.seite === 'allgemein');
  const wert = (id: string, e: TextEintrag): Wert => neu.get(id) ?? { de: e.de, en: e.en, aus: !!e.aus };
  const geaendert = (id: string, e: TextEintrag) => {
    const w = neu.get(id);
    return !!w && (w.de !== e.de || w.en !== e.en || !!w.aus !== !!e.aus);
  };
  /** alle ungespeicherten Änderungen, auch auf Seiten, die man inzwischen verlassen hat */
  const offen = () => alleTexte(datei).filter((x) => geaendert(textId(x.seite, x.abschnitt, x.key), x.e));
  const basis = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  /** Seite im Seitenplan zu einer Adresse: genau diese, sonst die mit dem längsten passenden Anfang (Profil unter netzwerk/) */
  const seiteFuer = (p: string): string | null => {
    const liste = (Object.entries(datei) as [string, TextSeite][]).filter(([k, s]) => !k.startsWith('_') && k !== 'allgemein' && s?.pfad !== undefined && s.pfad !== '404.html');
    const genau = liste.find(([, s]) => s.pfad === p);
    if (genau) return genau[0];
    const teil = liste.filter(([, s]) => s.pfad && p.startsWith(s.pfad)).sort((a, b) => b[1].pfad.length - a[1].pfad.length)[0];
    return teil ? (liste.filter(([, s]) => s.pfad === teil[1].pfad).at(-1)?.[0] ?? null) : liste.find(([, s]) => s.pfad === '')?.[0] ?? null;
  };
  let linkTimer = 0;
  /** Link folgen: Seite der Website im Rahmen, alles andere in einem neuen Tab */
  const folgen = (url: URL, imRahmen: boolean) => {
    if (imRahmen) frame.contentWindow!.location.href = url.href;
    else if (/^https?:$/.test(url.protocol)) window.open(url.href, '_blank', 'noopener');
  };
  /** führt ein Link auf eine Seite der Website (dann im Rahmen öffnen)? */
  const websiteLink = (url: URL) =>
    url.origin === location.origin && url.pathname.startsWith(basis) && !/^(en\/)?intern\//.test(url.pathname.slice(basis.length)) && !/\.[a-z0-9]{2,4}$/i.test(url.pathname);

  // ---------- Leiste oben ----------
  function stand() {
    const n = offen().length;
    const seiten = new Set(offen().map((x) => x.seite)).size;
    $('[data-sb-stand]')!.textContent = n
      ? `${n} ${n === 1 ? 'Änderung' : 'Änderungen'}${seiten > 1 ? ` auf ${seiten} Seiten` : ''}, nicht gespeichert`
      : 'Alles gespeichert';
    $<HTMLButtonElement>('[data-sb-speichern]')!.disabled = !n;
    $<HTMLButtonElement>('[data-sb-verwerfen]')!.disabled = !n;
    $<HTMLButtonElement>('[data-sb-zurueck]')!.disabled = !zurueckL.length;
    $<HTMLButtonElement>('[data-sb-vor]')!.disabled = !vorL.length;
  }
  const schnappschuss = () => JSON.stringify([...neu]);
  /** Verlauf: Tippen kurz sammeln, dann ein Schritt */
  function merken(sofort = false) {
    window.clearTimeout(tippTimer);
    const tun = () => {
      const s = schnappschuss();
      if (s === letzter) return;
      zurueckL.push(letzter);
      letzter = s;
      vorL.length = 0;
      stand();
    };
    if (sofort) tun();
    else tippTimer = window.setTimeout(tun, 600);
  }
  function wiederherstellen(s: string) {
    neu = new Map(JSON.parse(s) as [string, Wert][]);
    letzter = s;
    for (const t of treffer) zeigen(t);
    weitere();
    stand();
  }

  // ---------- Weitere Texte: was nicht sichtbar auf der Seite steht ----------
  let zuletztGefunden = new Set<string>();
  function weitere(gefunden = zuletztGefunden) {
    zuletztGefunden = gefunden;
    const box = $('[data-sb-weitere]');
    if (!box) return;
    const liste = eintraege().filter((x) => !gefunden.has(textId(x.seite, x.abschnitt, x.key)));
    $('[data-sb-weitere-zahl]')!.textContent = String(liste.length);
    const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => {
      const x = document.createElement(tag);
      if (cls) x.className = cls;
      if (text) x.textContent = text;
      return x;
    };
    const gesperrt = root.dataset.gesperrt === 'true';
    const eintrag = (x: (typeof liste)[number]) => {
      const id = textId(x.seite, x.abschnitt, x.key);
      const w = wert(id, x.e);
      const wertJetzt = lang === 'en' ? w.en : w.de;
      const zeile = el('div', 'sb-w');
      zeile.classList.toggle('is-geaendert', geaendert(id, x.e));
      const fid = `sb-w-${id.replace(/\W/g, '-')}`;
      const label = el('label', 'sb-w__wo', `${x.e.wo}${lang === 'en' ? ' · Englisch' : ''}`);
      label.htmlFor = fid;
      const hinweise = [platzhalter(x.e.de).length ? `${platzhalter(x.e.de).map((p) => `{${p}}`).join(', ')} bleibt stehen (wird auf der Website ersetzt)` : '', w.aus ? 'ausgeblendet' : ''].filter(Boolean);
      const lang_ = wertJetzt.includes('\n') || wertJetzt.length > 70 || (x.e.zeilen ?? 1) > 1;
      const feld = lang_ ? el('textarea') : el('input');
      feld.id = fid;
      feld.value = wertJetzt;
      feld.disabled = gesperrt;
      if (feld instanceof HTMLTextAreaElement) feld.rows = Math.min(6, Math.max(2, wertJetzt.split('\n').length, Math.ceil(wertJetzt.length / 60)));
      if (lang === 'en') feld.placeholder = x.e.de;
      const zahl = el('span', 'sb-w__zahl', x.e.max ? `${wertJetzt.length} / ${x.e.max}` : '');
      feld.addEventListener('input', () => {
        const w2 = wert(id, x.e);
        neu.set(id, lang === 'en' ? { ...w2, en: feld.value } : { ...w2, de: feld.value });
        if (x.e.max) zahl.textContent = `${feld.value.length} / ${x.e.max}`;
        zeile.classList.toggle('is-geaendert', geaendert(id, x.e));
        merken();
        stand();
      });
      zeile.append(label, feld);
      if (hinweise.length || x.e.max) zeile.append(el('span', 'sb-w__hinweis', hinweise.join(' · ')), zahl);
      if (x.e.ausblendbar) {
        const box2 = el('input');
        box2.type = 'checkbox';
        box2.checked = !w.aus;
        box2.disabled = gesperrt;
        box2.addEventListener('change', () => {
          neu.set(id, { ...wert(id, x.e), aus: !box2.checked });
          merken(true);
          stand();
          weitere();
        });
        const l = el('label', 'sb-w__an');
        l.append(box2, document.createTextNode(' Auf der Website anzeigen'));
        zeile.append(l);
      }
      return zeile;
    };
    const gruppen: [string, typeof liste][] = [
      ['Diese Seite', liste.filter((x) => x.seite === seite)],
      ['Auf jeder Seite (Menü, Fuß, Hinweise)', liste.filter((x) => x.seite !== seite)],
    ];
    box.replaceChildren(
      el('p', 'sb-w__info', 'Texte, die nicht sichtbar auf der Seite stehen: Platzhalter in Feldern, Betreff von E-Mails, Meldungen, Texte mit Zahlen, Titel für Suchmaschinen, Ausgeblendetes.'),
      ...gruppen.filter(([, xs]) => xs.length).flatMap(([titel, xs]) => [el('h3', 'sb-w__h', titel), ...xs.map(eintrag)]),
    );
  }

  function inhalteListe() {
    const ul = $('[data-sb-inhalte]')!;
    const s = seiteVon(seite);
    const ziele = s ? Object.entries(s.abschnitte).flatMap(([aid, a]) => (a.auch ?? []).map((z) => ({ ...z, von: `${seite}.${aid}` }))) : [];
    const li = (text: string, href: string) => {
      const a = Object.assign(document.createElement('a'), { href, target: '_blank', rel: 'noopener', textContent: text });
      const l = document.createElement('li');
      l.append(a);
      return l;
    };
    ul.replaceChildren(
      ...ziele.map((z) => li(`${z.text} · ${zielName(z.ziel)} ↗`, zielUrl(z.ziel, z.von))),
      li('Alle Texte dieser Seite (auch Platzhalter, Ausgeblendetes) ↗', `${location.pathname.replace(/seite-bearbeiten\/?$/, 'texte/')}?seite=${seite}`),
    );
  }

  // ---------- Rahmen ----------
  function groesse() {
    const platz = buehne.clientWidth - (geraet === 'handy' ? 24 : 0);
    const breite = geraet === 'handy' ? 390 : Math.max(1280, platz);
    const s = Math.min(1, platz / breite);
    frame.style.width = `${breite}px`;
    frame.style.height = `${Math.max(200, (buehne.clientHeight - (geraet === 'handy' ? 24 : 0)) / s)}px`;
    frame.style.transform = s < 1 ? `scale(${s})` : '';
    buehne.dataset.geraet = geraet;
  }
  new ResizeObserver(groesse).observe(buehne);

  function laden() {
    const s = seiteVon(seite);
    const p = pfad ?? s?.pfad ?? '';
    treffer = [];
    frame.src = websiteUrl(`${lang === 'en' ? 'en/' : ''}${p}`);
    $('[data-sb-titel]')!.textContent = s?.titel ?? 'Seite';
    const nurVorstand = !!s?.nurVorstand && !r.vorstand;
    meldung(nurVorstand ? 'Diese Seite ändert nur der Vorstand.' : '', 'error', $('[data-sb-meldung]'));
    root.dataset.gesperrt = String(nurVorstand);
    inhalteListe();
    groesse();
  }

  // ---------- Texte auf der Seite finden und beschreibbar machen ----------
  /** Text im Element zeigen (aus den Änderungen oder dem gespeicherten Stand) */
  /** aktueller Text eines Treffers (bei einer Zeile nur diese) */
  const textVon = (t: Treffer) => {
    const w = wert(t.id, t.e);
    const ganz = (lang === 'en' && w.en) || w.de;
    return t.zeile === undefined ? ganz : (ganz.split('\n')[t.zeile] ?? '');
  };
  function zeigen(t: Treffer) {
    const w = wert(t.id, t.e);
    const text = textVon(t);
    const anders = geaendert(t.id, t.e);
    for (const el of t.els) {
      const d = el.ownerDocument;
      if (d.activeElement !== el && lesen(el, true) !== text) {
        // Zeilen als <br>, sonst nur Text (eigene Auszeichnung der Zeilen geht dabei verloren, bis gespeichert ist)
        el.replaceChildren(...text.split('\n').flatMap((z, i) => (i ? [d.createElement('br'), d.createTextNode(z)] : [d.createTextNode(z)])));
      }
      el.classList.toggle('sb-geaendert', anders);
      if (w.aus) el.setAttribute('data-sb-aus', '');
      else el.removeAttribute('data-sb-aus');
    }
  }

  function einrichten(d: Document) {
    if (!d.body) return;
    const stil = d.createElement('style');
    stil.textContent = STIL;
    d.head.append(stil);
    // Navigieren geht wie auf der Website; ein Klick in einen Text bearbeitet ihn (öffnen: „Link öffnen“ in der Leiste).
    // Externe Links, Dateien und der interne Bereich öffnen in einem neuen Tab.
    d.addEventListener('click', (ev) => {
      const t = ev.target as Element;
      if (t.closest('.sb-leiste')) return;
      const text = t.closest<HTMLElement>('[data-sb-text]');
      // Text wird gerade bearbeitet (auch ein Linktext nach dem Doppelklick): nicht folgen
      if (text?.isContentEditable) return ev.preventDefault();
      const a = t.closest<HTMLAnchorElement>('a[href]');
      if (!a || (a.getAttribute('href') ?? '').startsWith('#')) return text ? ev.preventDefault() : undefined;
      const url = new URL(a.href, d.baseURI);
      const imRahmen = websiteLink(url) && a.target !== '_blank' && !a.hasAttribute('download');
      // Linktext: kurz warten, ob ein Doppelklick (Bearbeiten) folgt
      if (text) {
        ev.preventDefault();
        window.clearTimeout(linkTimer);
        if (ev.detail < 2) linkTimer = window.setTimeout(() => folgen(url, imRahmen), 280);
        return;
      }
      if (imRahmen) return;
      ev.preventDefault();
      folgen(url, false);
    }, true);
    d.addEventListener('submit', (ev) => ev.preventDefault(), true);

    // Elemente nach Text (ohne Leerraum), nur sichtbare Inhalte
    const index = new Map<string, HTMLElement[]>();
    for (const el of d.body.querySelectorAll<HTMLElement>('*')) {
      if (/^(SCRIPT|STYLE|SVG|CANVAS|NOSCRIPT|TEMPLATE|IFRAME|IMG|TEXTAREA)$/i.test(el.tagName) || el.closest('svg')) continue;
      const k = norm(el.textContent ?? '');
      if (!k || k.length > 600) continue;
      const liste = index.get(k);
      if (liste) liste.push(el);
      else index.set(k, [el]);
    }
    const leiste = d.createElement('div');
    leiste.className = 'sb-leiste';
    leiste.hidden = true;
    d.body.append(leiste);
    const frei = (n: Node) => !(n.nodeType === Node.ELEMENT_NODE ? (n as Element) : n.parentElement)?.closest(`[data-sb-text], ${UNSICHTBAR}`);
    /** Textstück in einem Textknoten als eigenes Element (damit es beschreibbar wird) */
    const umhuellen = (n: Text, von: number, bis: number) => {
      const span = d.createElement('span');
      span.className = 'sb-teil';
      const r = d.createRange();
      r.setStart(n, von);
      r.setEnd(n, bis);
      r.surroundContents(span);
      return span;
    };
    const textknoten = () => {
      const out: Text[] = [];
      const w = d.createTreeWalker(d.body, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode() as Text | null; n; n = w.nextNode() as Text | null) if (n.data.trim() && frei(n)) out.push(n);
      return out;
    };
    /** im bevorzugten Teil der Seite, sonst wo erlaubt */
    const passend = <T extends Node>(liste: T[], ort: Ort) => {
      const el = (x: T) => (x.nodeType === Node.ELEMENT_NODE ? (x as unknown as Element) : x.parentElement!);
      const hier = liste.filter((x) => ort.bevorzugt(el(x)));
      return hier.length ? hier : liste.filter((x) => ort.erlaubt(el(x)));
    };
    const BUCHSTABE = /[\p{L}\p{N}]/u;
    /**
     * Stellen, die genau diesen Text zeigen: 1. ein Element mit genau diesem Text, 2. ein Textknoten mit genau diesem
     * Text (z. B. vor einem Link), 3. der Text als abgegrenztes Stück eines kurzen Textknotens („Gestaltung: Name“).
     */
    const finden = (text: string, b: Ort): HTMLElement[] => {
      const k = norm(text);
      if (!k) return [];
      const gefunden = (index.get(k) ?? []).filter(frei);
      const els = passend(gefunden.filter((el) => !gefunden.some((o) => o !== el && el.contains(o))), b);
      if (els.length) return els;
      const knoten = textknoten();
      const genau = passend(knoten.filter((n) => norm(n.data) === k), b);
      if (genau.length) {
        return genau.map((n) => {
          const anfang = n.data.length - n.data.trimStart().length;
          return umhuellen(n, anfang, anfang + n.data.trim().length);
        });
      }
      if (text.trim().length < 3) return [];
      const t = text.trim();
      const teil = passend(knoten.filter((n) => {
        const i = n.data.indexOf(t);
        if (i < 0 || n.data.indexOf(t, i + 1) >= 0 || n.data.length > t.length + 60) return false;
        return !BUCHSTABE.test(n.data[i - 1] ?? '') && !BUCHSTABE.test(n.data[i + t.length] ?? '');
      }), b);
      return teil.map((n) => {
        const i = n.data.indexOf(t);
        return umhuellen(n, i, i + t.length);
      });
    };

    treffer = [];
    const gefundenIds = new Set<string>();
    // zuerst die Texte dieser Seite, dann „Auf jeder Seite“ (Menü, Fuß, Hinweise)
    const reihe = [...eintraege().filter((x) => x.seite !== 'allgemein'), ...eintraege().filter((x) => x.seite === 'allgemein')];
    for (const { seite: s, abschnitt, key, e } of reihe) {
      if (e.aus || platzhalter(e.de).length || /Browser-Tab|Suchmaschinen/.test(e.wo)) continue;
      const id = textId(s, abschnitt, key);
      const b = ortFuer(s, abschnitt);
      // wie die Website den Text gerade zeigt: gespeicherter Stand oder (fester Testlauf) die ursprüngliche Fassung
      const kandidaten = lang === 'en' ? [e.en || e.de, e.ursprung?.en || e.ursprung?.de] : [e.de, e.ursprung?.de];
      const mehrzeilig = (e.zeilen ?? 1) > 1 || e.de.includes('\n');
      const neueTreffer: Treffer[] = [];
      for (const k of kandidaten) {
        if (!k) continue;
        const els = finden(k, b);
        if (els.length) {
          neueTreffer.push({ id, e, els });
          break;
        }
        // mehrzeilig, Zeilen in getrennten Elementen: jede Zeile für sich
        const zeilen = k.split('\n');
        if (zeilen.length > 1) {
          const je = zeilen.map((z) => finden(z, b));
          if (je.every((x) => x.length)) {
            je.forEach((x, i) => neueTreffer.push({ id, e, els: x, zeile: i }));
            break;
          }
        }
      }
      for (const t of neueTreffer) {
        treffer.push(t);
        for (const el of t.els) beschreibbar(el, t, mehrzeilig && t.zeile === undefined, leiste);
        zeigen(t);
      }
      if (neueTreffer.length) gefundenIds.add(id);
    }
    weitere(gefundenIds);
    $('[data-sb-zahl]')!.textContent = `${gefundenIds.size} Texte direkt auf der Seite`;
  }

  function beschreibbar(el: HTMLElement, t: Treffer, mehrzeilig: boolean, leiste: HTMLElement) {
    if (root.dataset.gesperrt === 'true') return;
    const an = () => {
      try {
        el.contentEditable = mehrzeilig ? 'true' : 'plaintext-only';
      } catch {
        el.contentEditable = 'true';
      }
    };
    const d = el.ownerDocument;
    // Text in einem Link: Klick folgt dem Link, Doppelklick bearbeitet
    const imLink = !!el.closest('a[href]:not([href^="#"])');
    if (imLink) {
      el.addEventListener('dblclick', (ev) => {
        ev.preventDefault();
        window.clearTimeout(linkTimer);
        an();
        el.focus();
        const sel = d.getSelection();
        sel?.selectAllChildren(el);
        sel?.collapseToEnd();
        leisteZeigen();
      });
    } else an();
    el.setAttribute('data-sb-text', t.id);
    el.spellcheck = true;
    el.title = imLink ? `${t.e.wo}: Doppelklick zum Bearbeiten, Klick folgt dem Link` : `${t.e.wo}: zum Bearbeiten klicken`;
    const leisteZeigen = () => {
      const w = wert(t.id, t.e);
      const text = lesen(el, mehrzeilig);
      const knopf = (txt: string, fn: () => void) => {
        const b = d.createElement('button');
        b.type = 'button';
        b.textContent = txt;
        b.addEventListener('mousedown', (ev) => ev.preventDefault());
        b.addEventListener('click', fn);
        return b;
      };
      const zahl = d.createElement('span');
      zahl.className = 'sb-leiste__zahl';
      zahl.textContent = t.e.max ? `${text.length} / ${t.e.max}` : `${text.length} Zeichen`;
      if (t.e.max && text.length > t.e.max) zahl.setAttribute('data-zu-lang', '');
      const wo = d.createElement('span');
      wo.className = 'sb-leiste__wo';
      wo.textContent = `${t.e.wo}${lang === 'en' ? ' · Englisch' : ''}`;
      leiste.replaceChildren(wo, zahl);
      const link = el.closest<HTMLAnchorElement>('a[href]');
      if (link && !(link.getAttribute('href') ?? '').startsWith('#')) {
        leiste.append(knopf('Link öffnen →', () => {
          const url = new URL(link.href, d.baseURI);
          el.blur();
          if (websiteLink(url)) frame.contentWindow!.location.href = url.href;
          else window.open(url.href, '_blank', 'noopener');
        }));
      }
      if (geaendert(t.id, t.e)) {
        leiste.append(knopf('↺ Zurücksetzen', () => {
          neu.delete(t.id);
          el.blur();
          zeigen(t);
          merken(true);
          stand();
        }));
      }
      if (t.e.ausblendbar) {
        leiste.append(knopf(w.aus ? 'Wieder anzeigen' : 'Ausblenden', () => {
          neu.set(t.id, { ...w, de: w.de, en: w.en, aus: !w.aus });
          zeigen(t);
          merken(true);
          stand();
          leisteZeigen();
        }));
      }
      leiste.hidden = false;
      const rect = el.getBoundingClientRect();
      // über dem Text, wenn oben Platz ist, sonst darunter (nie über dem Text selbst)
      const y = d.defaultView?.scrollY ?? 0;
      const oben = rect.top - leiste.offsetHeight - 8;
      leiste.style.top = `${y + (oben >= 4 ? oben : rect.bottom + 8)}px`;
      leiste.style.left = `${Math.max(8, Math.min(rect.left + (d.defaultView?.scrollX ?? 0), (d.defaultView?.innerWidth ?? 800) - leiste.offsetWidth - 8))}px`;
    };
    // Leiste nur beim Bearbeiten (ein Link bekommt den Fokus auch beim Anklicken – dort erst nach dem Doppelklick)
    el.addEventListener('focus', () => el.isContentEditable && leisteZeigen());
    el.addEventListener('blur', () => {
      leiste.hidden = true;
      if (imLink) el.removeAttribute('contenteditable');
      zeigen(t);
    });
    el.addEventListener('input', () => {
      const w = wert(t.id, t.e);
      const eigen = lesen(el, mehrzeilig);
      // eine Zeile eines mehrzeiligen Texts: nur diese Zeile ersetzen
      let text = eigen;
      if (t.zeile !== undefined) {
        const zeilen = ((lang === 'en' && w.en) || w.de).split('\n');
        zeilen[t.zeile] = eigen;
        text = zeilen.join('\n');
      }
      neu.set(t.id, lang === 'en' ? { ...w, en: text } : { ...w, de: text });
      // dieselbe Stelle anderswo auf der Seite mitziehen
      for (const o of t.els) if (o !== el) o.textContent = eigen;
      el.classList.toggle('sb-geaendert', geaendert(t.id, t.e));
      merken();
      stand();
      leisteZeigen();
    });
    el.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') el.blur();
      else if (ev.key === 'Enter') {
        ev.preventDefault();
        if (mehrzeilig && !ev.shiftKey) d.execCommand('insertLineBreak');
        else if (!mehrzeilig) el.blur();
      } else if ((ev.ctrlKey || ev.metaKey) && /^[biu]$/i.test(ev.key)) ev.preventDefault(); // keine Auszeichnung
    });
    el.addEventListener('paste', (ev) => {
      ev.preventDefault();
      const text = ev.clipboardData?.getData('text/plain') ?? '';
      d.execCommand('insertText', false, mehrzeilig ? text : text.replace(/\s*\n\s*/g, ' '));
    });
  }

  /** nach dem Laden oder Navigieren im Rahmen: Seite, Sprache und Adresse aus dem Rahmen übernehmen */
  function angekommen() {
    const ort = frame.contentWindow?.location;
    if (!ort || !ort.pathname.startsWith(basis)) return;
    let p = decodeURIComponent(ort.pathname.slice(basis.length));
    lang = p.startsWith('en/') || p === 'en' ? 'en' : 'de';
    p = p.replace(/^en(\/|$)/, '');
    root.querySelectorAll('[data-sb-sprache]').forEach((x) => x.setAttribute('aria-pressed', String((x as HTMLElement).dataset.sbSprache === lang)));
    const id = seiteFuer(p) ?? seite;
    if (id !== seite) {
      seite = id;
      wahl.value = id;
      const s = seiteVon(id);
      $('[data-sb-titel]')!.textContent = s?.titel ?? 'Seite';
      const nurVorstand = !!s?.nurVorstand && !r.vorstand;
      meldung(nurVorstand ? 'Diese Seite ändert nur der Vorstand.' : '', 'error', $('[data-sb-meldung]'));
      root.dataset.gesperrt = String(nurVorstand);
      inhalteListe();
    }
    pfad = p;
    history.replaceState(null, '', `?s=${seite}${p !== seiteVon(seite)?.pfad ? `&pfad=${encodeURIComponent(p)}` : ''}`);
    // ein Beitrag: im News-Editor bearbeiten
    const beitrag = $<HTMLAnchorElement>('[data-sb-beitrag]');
    if (beitrag) {
      const b = /^news\/([^/]+)\/?$/.exec(p);
      beitrag.hidden = !b;
      if (b) beitrag.href = `${location.pathname.replace(/seite-bearbeiten\/?$/, 'bearbeiten/')}?seite=${encodeURIComponent(p)}`;
    }
  }

  frame.addEventListener('load', () => {
    const d = frame.contentDocument;
    if (!d) return;
    treffer = [];
    angekommen();
    // Rückgängig/Wiederholen auch im Rahmen (Strg+Z außerhalb eines Textes)
    d.addEventListener('keydown', tasten);
    // warten, bis der Auftritt der Köpfe die Wörter der Headline wieder zusammengesetzt hat
    const start = Date.now();
    const warten = () => (d.querySelector('.kopf-wort') && Date.now() - start < 4000 ? window.setTimeout(warten, 150) : einrichten(d));
    window.setTimeout(warten, 300);
  });

  // ---------- Knöpfe ----------
  const zurueck = () => {
    merken(true);
    if (!zurueckL.length) return;
    vorL.push(letzter);
    wiederherstellen(zurueckL.pop()!);
  };
  const vor = () => {
    merken(true);
    if (!vorL.length) return;
    zurueckL.push(letzter);
    wiederherstellen(vorL.pop()!);
  };
  function tasten(ev: KeyboardEvent) {
    if (!(ev.ctrlKey || ev.metaKey)) return;
    const k = ev.key.toLowerCase();
    if (k !== 'z' && k !== 'y') return;
    ev.preventDefault();
    (ev.target as HTMLElement | null)?.blur?.();
    if (k === 'y' || ev.shiftKey) vor();
    else zurueck();
  }
  document.addEventListener('keydown', (ev) => {
    if (!(ev.target as Element).closest('input, textarea, select')) tasten(ev);
  });
  $('[data-sb-zurueck]')!.addEventListener('click', zurueck);
  $('[data-sb-vor]')!.addEventListener('click', vor);
  root.querySelectorAll<HTMLButtonElement>('[data-sb-geraet]').forEach((b) =>
    b.addEventListener('click', () => {
      geraet = b.dataset.sbGeraet === 'handy' ? 'handy' : 'computer';
      root.querySelectorAll('[data-sb-geraet]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      groesse();
    }),
  );
  root.querySelectorAll<HTMLButtonElement>('[data-sb-sprache]').forEach((b) =>
    b.addEventListener('click', () => {
      lang = b.dataset.sbSprache === 'en' ? 'en' : 'de';
      root.querySelectorAll('[data-sb-sprache]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      laden();
    }),
  );
  wahl.value = seite;
  // andere Seite wählen: dorthin navigieren (ungespeicherte Änderungen bleiben erhalten)
  wahl.addEventListener('change', () => {
    seite = wahl.value;
    pfad = null;
    laden();
  });
  $('[data-sb-verwerfen]')!.addEventListener('click', () => {
    if (!confirm('Alle ungespeicherten Änderungen verwerfen?')) return;
    merken(true);
    zurueckL.push(letzter);
    wiederherstellen('[]');
  });
  $<HTMLButtonElement>('[data-sb-speichern]')!.addEventListener('click', async () => {
    const liste = offen();
    for (const x of liste) {
      const id = textId(x.seite, x.abschnitt, x.key);
      const w = neu.get(id)!;
      const fehler = textPruefen(x.e, w.de, x.e.de, 'de') ?? textPruefen(x.e, w.en, x.e.en || x.e.de, 'en');
      if (fehler) {
        meldung(`${x.e.wo}: ${fehler}`, 'error', $('[data-sb-meldung]'));
        treffer.find((t) => t.id === id)?.els[0]?.focus();
        return;
      }
    }
    const kopie = structuredClone(datei);
    const n = uebernehmen(kopie, new Map(liste.map((x) => [textId(x.seite, x.abschnitt, x.key), neu.get(textId(x.seite, x.abschnitt, x.key))!])));
    if (!n) return stand();
    const knopf = $<HTMLButtonElement>('[data-sb-speichern]')!;
    knopf.disabled = true;
    try {
      const namen = [...new Set(liste.map((x) => (datei[x.seite] as TextSeite).titel))].join(', ');
      await r.a.speichern(`Texte: ${namen} (${n} ${n === 1 ? 'Text' : 'Texte'}, auf der Seite)`, [{ pfad: PFAD, text: dateiText(kopie), alt: sha }]);
      await dateiLaden();
      // neue Fassung ist jetzt der gespeicherte Stand; die Treffer zeigen auf die neuen Einträge
      const nach = new Map(alleTexte(datei).map((x) => [textId(x.seite, x.abschnitt, x.key), x.e]));
      for (const t of treffer) t.e = nach.get(t.id) ?? t.e;
      neu = new Map();
      zurueckL.length = 0;
      vorL.length = 0;
      letzter = '[]';
      for (const t of treffer) zeigen(t);
      weitere();
      meldung(`Gespeichert: ${n} ${n === 1 ? 'Text' : 'Texte'}. Die Website zeigt das in 2–3 Minuten.`, 'ok', $('[data-sb-meldung]'));
    } catch (e) {
      meldung((e as Error).message, 'error', $('[data-sb-meldung]'));
    } finally {
      stand();
    }
  });
  addEventListener('beforeunload', (ev) => {
    if (offen().length) ev.preventDefault();
  });

  async function dateiLaden() {
    const g = await r.a.lesen([PFAD]);
    const d = g.dateien[PFAD];
    if (!d) throw new Error('Die Datei mit den Texten gibt es im Repository noch nicht (src/settings/texte.json).');
    sha = d.sha;
    datei = JSON.parse(d.text) as Record<string, unknown>;
  }

  return (async () => {
    try {
      await dateiLaden();
      root.hidden = false;
      laden();
      stand();
    } catch (e) {
      meldung((e as Error).message);
    }
  })();
}
