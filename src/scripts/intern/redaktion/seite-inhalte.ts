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
import { internUrl } from '../session';
import { laden, type Eintrag, type Geladen } from './daten';
import { redaktionUrl, type Redaktion } from './seite';
import { anwender, bildPasst, type Zustand } from './vorschau';

interface Inhalt {
  b: Bereich;
  e: Eintrag;
}
/** Zustand, wie ihn das Formular schickt: neue Fotos als Datei (eintrag/index.astro → zustandFuerSeite) */
type FachZustand = Zustand & { fotos?: [string, Blob][] };

const BILD = /\.(jpe?g|png|webp|avif)$/i;
const ADRESSE = /^(https?:|mailto:|\/|\.\.?\/|#)|\.(md|pdf)$/i;
/** zum Vergleichen: ohne Leerraum, Anführungszeichen und Pfeile („Zitat“, „POP UP →“) */
const norm = (s: string) => s.replace(/[\s„“”"«»‚‘’→↗]+/g, '');
const schluessel = (x: Inhalt) => `${x.b.id}|${x.e.id}`;

/** Texte eines Eintrags (beide Sprachen, Zeile für Zeile) und Fotos (Dateiname) */
function werte(e: Eintrag): { texte: string[]; fotos: string[] } {
  const texte: string[] = [];
  const fotos: string[] = [];
  const gehen = (v: unknown) => {
    if (typeof v === 'string') {
      const t = v.trim();
      if (BILD.test(t)) fotos.push(t.split('/').pop()!);
      else if (!ADRESSE.test(t) && !/^\d{4}-\d{2}-\d{2}/.test(t)) texte.push(...t.split('\n').map((z) => z.trim()).filter((z) => z.length >= 3));
    } else if (Array.isArray(v)) v.forEach(gehen);
    else if (v && typeof v === 'object') Object.values(v).forEach(gehen);
  };
  gehen(e.data);
  gehen(e.en?.data);
  return { texte, fotos };
}

/** Name im Knopf über dem Inhalt: „Format „POP UP“ bearbeiten“ */
function name(x: Inhalt): string {
  if (x.b.art === 'einstellung') return `${x.b.label} bearbeiten`;
  const titel = x.b.titel(x.e, { name: (_q, id) => id }) || x.e.id;
  return `${x.b.einzahl} „${titel.length > 40 ? `${titel.slice(0, 38)}…` : titel}“ bearbeiten`;
}

/**
 * Markiert die Inhalte auf der Seite: data-sb-inhalt="<bereich>|<id>" (Anker, Feld, Foto), dazu data-sb-feld (Text des
 * Felds) bzw. data-sb-foto (Dateiname). Feste Texte (data-sb-text) haben Vorrang. Gibt die Zahl der Einträge zurück.
 */
export function markieren(d: Document, inhalte: Inhalt[], pfad: string): number {
  const alle = inhalte.map((x) => ({ x, ...werte(x.e) }));
  // wie viele Einträge einen Text haben (dann nur innerhalb ihres Ankers)
  const zahl = new Map<string, Set<string>>();
  for (const { x, texte } of alle) for (const t of texte) (zahl.get(norm(t)) ?? zahl.set(norm(t), new Set()).get(norm(t))!).add(schluessel(x));
  const index = new Map<string, HTMLElement[]>();
  for (const el of d.body.querySelectorAll<HTMLElement>('*')) {
    if (/^(SCRIPT|STYLE|SVG|CANVAS|NOSCRIPT|TEMPLATE|IFRAME|IMG|TEXTAREA|BUTTON)$/i.test(el.tagName)) continue;
    if (el.closest('svg, .sb-leiste, .sb-chip, [data-sb-text]') || el.querySelector('[data-sb-text]')) continue;
    const k = norm(el.textContent ?? '');
    if (k && k.length <= 300) (index.get(k) ?? index.set(k, []).get(k)!).push(el);
  }
  const bilder = [...d.querySelectorAll<HTMLImageElement>('img')];
  let n = 0;
  for (const { x, texte, fotos } of alle) {
    const key = schluessel(x);
    // eigene Seite je Eintrag (Termin, Profil, Textseite), nicht die Seite, auf der eine ganze Liste steht
    const ganzeSeite = x.b.art === 'ordner' && !x.b.anker && x.b.seite?.(x.e) === pfad;
    const a = x.b.anker ? d.querySelector<HTMLElement>(x.b.anker(x.e)) : ganzeSeite && x.b.textSelektor ? d.querySelector<HTMLElement>(x.b.textSelektor) : null;
    // Anker an einer Überschrift (Sprungziel der Vorschau): der Block darum gehört dazu, bis zum nächsten Abschnitt
    let anker = a;
    if (a && /^H[1-6]$/.test(a.tagName)) {
      const andere = inhalte.filter((o) => o.b === x.b && o !== x && x.b.anker).map((o) => x.b.anker!(o.e));
      anker = a.parentElement;
      for (let i = 0; anker && i < 4 && !/^(SECTION|ARTICLE|LI|DETAILS)$/.test(anker.tagName); i++) {
        const hoeher: HTMLElement | null = anker.parentElement;
        if (!hoeher || hoeher === d.body || andere.some((sel) => hoeher.querySelector(sel))) break;
        anker = hoeher;
      }
    }
    const innen = (el: Element) => ganzeSeite || !anker || anker.contains(el);
    let gefunden = false;
    if (anker && !anker.hasAttribute('data-sb-inhalt')) {
      anker.setAttribute('data-sb-inhalt', key);
      gefunden = true;
    }
    for (const t of texte) {
      // ein Text, den nur dieser Eintrag hat, zählt überall (auch Kopien, z. B. im Foto-Mosaik), sonst nur im Anker
      const eindeutig = (zahl.get(norm(t))?.size ?? 0) <= 1;
      if (!eindeutig && !anker && !ganzeSeite) continue;
      const els = (index.get(norm(t)) ?? []).filter((el) => (eindeutig || innen(el)) && !el.hasAttribute('data-sb-feld'));
      for (const el of els.filter((el) => !els.some((o) => o !== el && el.contains(o)))) {
        el.setAttribute('data-sb-inhalt', key);
        el.setAttribute('data-sb-feld', t);
        gefunden = true;
      }
    }
    for (const f of fotos) {
      for (const img of bilder) {
        if (img.hasAttribute('data-sb-foto') || !innen(img) || !bildPasst(`${img.getAttribute('src') ?? ''} ${img.getAttribute('srcset') ?? ''}`, f.replace(/\.[^.]+$/, ''))) continue;
        img.setAttribute('data-sb-inhalt', key);
        img.setAttribute('data-sb-foto', f);
        gefunden = true;
      }
    }
    if (gefunden) n++;
  }
  return n;
}

/**
 * Beiträge und Termine aus dem internen Bereich (News-Editor, Kalender): Links zu ihnen bekommen den Knopf mit dem
 * Weg zum Bearbeiten (data-sb-extern = Adresse, data-sb-name = Beschriftung; neuer Tab). Ältere Termine aus Dateien
 * öffnen ihr Formular in der Seitenleiste (data-sb-daneben).
 */
function externMarkieren(d: Document, termineDateien: Set<string>) {
  const basis = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  for (const a of d.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    if (a.closest('[data-sb-inhalt], [data-sb-text], .site-header, .site-footer')) continue;
    const u = new URL(a.href, d.baseURI);
    if (u.origin !== location.origin || !u.pathname.startsWith(basis)) continue;
    const p = decodeURIComponent(u.pathname.slice(basis.length)).replace(/^en\//, '');
    const news = /^news\/([^/]+)\/$/.exec(p);
    const termin = /^termine\/([^/]+)\/$/.exec(p);
    if (news) {
      a.dataset.sbExtern = `${redaktionUrl('bearbeiten/')}?seite=${encodeURIComponent(p)}`;
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
      const ids = new Set(seiten.flatMap((s) => Object.values(s?.abschnitte ?? {}).flatMap((a) => (a.auch ?? []).map((z) => z.ziel))).filter((z) => z.startsWith('redaktion:')).map((z) => z.slice(10)));
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
      liste = gs.flatMap((g, i) => (g ? g.eintraege.map((e) => ({ b: bs[i], e })) : []));
      const n = markieren(d, liste, pfad);
      externMarkieren(d, new Set(r.stand.dateien.map((x) => /^src\/content\/termine\/(.+)\.md$/.exec(x.pfad)?.[1]).filter((x): x is string => !!x)));
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
