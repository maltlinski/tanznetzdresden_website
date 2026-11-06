/**
 * Vorschau der Redaktion: die echte Seite der Website in einem Rahmen (gleiche Adresse), daneben das Formular.
 * Änderungen erscheinen beim Tippen, noch bevor gespeichert ist: Die Vorschau ändert die geladene Seite im Browser
 * (Texte ersetzen, Ausgeblendetes entfernen oder schraffiert markieren) und springt zur Stelle, die gerade
 * bearbeitet wird. Die Website selbst bleibt unverändert; neu laden zeigt wieder den veröffentlichten Stand.
 *
 * Grenzen (statische Website): Schon gespeicherte, ausgeblendete Inhalte stehen nicht im HTML. Die Vorschau
 * nennt sie in ihrer Leiste. Neue Einträge, neue Fotos und eine andere Reihenfolge zeigt sie erst nach dem Speichern.
 *
 *   const v = vorschau(document.querySelector('[data-vorschau]')!, { pfad: 'formate/' });
 *   v.zustand(() => ({ ersetzen: [['Alter Titel', 'Neuer Titel']], aus: ['#archiv-linie-08'], ziel: '#archiv-linie-08' }));
 *   v.neu();            // nach jeder Änderung (gebündelt)
 *   v.springen('#…');   // beim Bearbeiten eines Felds
 *
 * Mein Profil nutzt dasselbe mit einer Vorlage der Profilseite, die sich selbst füllt (Zustand.daten,
 * src/scripts/profil-vorschau.ts): Dort erscheinen auch neue Einträge und Fotos sofort.
 */

export type Geraet = 'desktop' | 'tablet' | 'handy';
const BREITE: Record<Geraet, number> = { desktop: 1280, tablet: 820, handy: 390 };

export interface Zustand {
  /** Text auf der Seite ersetzen: [veröffentlicht, neu]; mehrzeilige Texte zeilenweise */
  ersetzen?: [string, string][];
  /** HTML statt Text: [CSS-Selektor, neues HTML] (z. B. der Text einer Textseite) */
  html?: [string, string][];
  /** ausblenden: CSS-Selektoren oder Texte (dann der Block, der den Text enthält) */
  aus?: string[];
  /** Hinweis in der Leiste, z. B. was ausgeblendet ist und deshalb fehlt */
  hinweise?: string[];
  /** Daten für eine Seite, die sich selbst füllt: gehen an `window.vorschauDaten` im Rahmen (Vorlage „Mein Profil“) */
  daten?: unknown;
}

export interface Vorschau {
  /** Seite laden (Pfad ohne Basis, z. B. „formate/“), optional englisch */
  laden(pfad: string): void;
  /** woher die Änderungen kommen */
  zustand(fn: () => Zustand): void;
  /** Änderungen anwenden (gebündelt) */
  neu(): void;
  /** zu einer Stelle springen und sie hervorheben: CSS-Selektor oder Text */
  springen(ziel: string | null): void;
}

const basis = () => import.meta.env.BASE_URL.replace(/\/?$/, '/');
const STIL = `
  [data-vs-aus] { outline: 2px dashed var(--magenta) !important; outline-offset: -2px; opacity: 0.45; position: relative; }
  [data-vs-aus]::before { content: 'Ausgeblendet'; position: absolute; z-index: 50; left: 6px; top: 6px; padding: 2px 6px;
    background: var(--purple); color: #fff; font: 600 11px/1.4 var(--font-mono); letter-spacing: 0.1em; text-transform: uppercase; opacity: 1; }
  html:not([data-vs-markieren]) [data-vs-aus] { display: none !important; }
  [data-vs-fokus] { outline: 3px solid var(--magenta) !important; outline-offset: 4px; transition: outline-color 0.3s; }
`;

/** Block, der einen Text trägt (zum Ausblenden und Hervorheben) */
const block = (n: Node | null): HTMLElement | null => {
  let el = n instanceof HTMLElement ? n : (n?.parentElement ?? null);
  while (el && getComputedStyle(el).display.startsWith('inline')) el = el.parentElement;
  return el;
};

export function vorschau(root: HTMLElement, opt: { pfad: string; titel?: string; lang?: 'de' | 'en' }): Vorschau {
  const frame = root.querySelector<HTMLIFrameElement>('iframe')!;
  const buehne = frame.parentElement as HTMLElement;
  const hinweisBox = root.querySelector<HTMLElement>('[data-vs-hinweise]');
  const markieren = root.querySelector<HTMLInputElement>('[data-vs-markieren]');
  let geraet: Geraet = 'desktop';
  let pfad = opt.pfad;
  let lang: 'de' | 'en' = opt.lang ?? 'de';
  root.querySelectorAll('[data-vs-sprache]').forEach((x) => x.setAttribute('aria-pressed', String((x as HTMLElement).dataset.vsSprache === lang)));
  let quelle: () => Zustand = () => ({});
  let ziel: string | null = null;
  let geladen = false;
  let timer = 0;
  /** veränderte Textknoten mit ihrem Original, damit jede Runde vom veröffentlichten Stand ausgeht */
  let original = new Map<Text, string>();
  let htmlOriginal = new Map<Element, string>();

  const doc = () => (geladen ? frame.contentDocument : null);

  function skalieren() {
    const w = BREITE[geraet];
    const platz = buehne.clientWidth || w;
    const s = Math.min(1, platz / w);
    frame.style.width = `${w}px`;
    frame.style.height = `${Math.round((buehne.clientHeight || 800) / s)}px`;
    frame.style.transform = `scale(${s})`;
  }

  function zuruecksetzen(d: Document) {
    for (const [t, text] of original) t.data = text;
    for (const [el, html] of htmlOriginal) el.innerHTML = html;
    original = new Map();
    htmlOriginal = new Map();
    d.querySelectorAll('[data-vs-aus]').forEach((el) => el.removeAttribute('data-vs-aus'));
  }

  /** alle Textknoten, die einen Text enthalten (veröffentlichter Stand; aktuell = so, wie er gerade angezeigt wird) */
  function finden(d: Document, text: string, aktuell = false): Text[] {
    const t = text.trim();
    if (!t) return [];
    const out: Text[] = [];
    const w = d.createTreeWalker(d.body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode() as Text | null; n; n = w.nextNode() as Text | null) if ((aktuell ? n.data : (original.get(n) ?? n.data)).includes(t)) out.push(n);
    return out;
  }

  function anwenden() {
    const d = doc();
    if (!d) return;
    zuruecksetzen(d);
    const z = quelle();
    for (const [alt, neu] of z.ersetzen ?? []) {
      const a = alt.split('\n');
      const b = neu.split('\n');
      a.forEach((zeile, i) => {
        if (!zeile.trim() || zeile === b[i]) return;
        for (const n of finden(d, zeile)) {
          if (!original.has(n)) original.set(n, n.data);
          n.data = n.data.split(zeile.trim()).join((b[i] ?? '').trim());
        }
      });
    }
    for (const [sel, html] of z.html ?? []) {
      const el = d.querySelector(sel);
      if (!el) continue;
      if (!htmlOriginal.has(el)) htmlOriginal.set(el, el.innerHTML);
      el.innerHTML = html;
    }
    if (z.daten !== undefined) (d.defaultView as (Window & { vorschauDaten?: (x: unknown) => void }) | null)?.vorschauDaten?.(z.daten);
    for (const a of z.aus ?? []) {
      const els = /^[#.[]/.test(a) ? [...d.querySelectorAll<HTMLElement>(a)] : finden(d, a).map(block).filter((x): x is HTMLElement => !!x);
      els.forEach((el) => el.setAttribute('data-vs-aus', ''));
    }
    if (hinweisBox) {
      hinweisBox.replaceChildren(...(z.hinweise ?? []).map((h) => Object.assign(document.createElement('li'), { textContent: h })));
      hinweisBox.hidden = !(z.hinweise ?? []).length;
    }
    zeigen();
  }

  function zeigen() {
    const d = doc();
    if (!d) return;
    d.querySelectorAll('[data-vs-fokus]').forEach((el) => el.removeAttribute('data-vs-fokus'));
    if (!ziel) return;
    const el = /^[#.[]/.test(ziel) ? d.querySelector<HTMLElement>(ziel) : block(finden(d, ziel, true)[0] ?? null);
    if (!el) return;
    el.setAttribute('data-vs-fokus', '');
    // nur im Rahmen scrollen (scrollIntoView würde auch das Formular verschieben)
    const win = d.defaultView;
    if (win) win.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + win.scrollY - win.innerHeight / 3), behavior: 'instant' as ScrollBehavior });
  }

  frame.addEventListener('load', () => {
    geladen = true;
    original = new Map();
    htmlOriginal = new Map();
    const d = frame.contentDocument;
    if (!d) return;
    // Vorschau: keine Animationen, die Inhalte verstecken; Links öffnen nicht im Rahmen
    d.documentElement.classList.add('vorschau');
    const s = d.createElement('style');
    s.textContent = `${STIL} *, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; } [data-reveal], [data-rise], [data-tk-rise] { opacity: 1 !important; transform: none !important; }`;
    d.head.append(s);
    d.documentElement.toggleAttribute('data-vs-markieren', markieren?.checked ?? true);
    d.addEventListener('click', (e) => {
      // Links, Vollbild und geschützte E-Mail-Adressen öffnen nicht im Rahmen
      if (!(e.target as Element).closest('a, [data-lb-oeffnen], [data-protected-email]')) return;
      e.preventDefault();
      e.stopPropagation();
    }, true);
    anwenden();
  });

  const url = () => `${basis()}${lang === 'en' ? 'en/' : ''}${pfad}`;
  function laden(p: string) {
    pfad = p.replace(/^\//, '');
    geladen = false;
    frame.src = url();
  }

  // Geräte, Sprache, Markieren, neu laden
  root.querySelectorAll<HTMLButtonElement>('[data-vs-geraet]').forEach((b) =>
    b.addEventListener('click', () => {
      geraet = b.dataset.vsGeraet as Geraet;
      root.querySelectorAll('[data-vs-geraet]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      root.dataset.geraet = geraet;
      skalieren();
      window.setTimeout(zeigen, 50);
    }));
  root.querySelectorAll<HTMLButtonElement>('[data-vs-sprache]').forEach((b) =>
    b.addEventListener('click', () => {
      lang = b.dataset.vsSprache as 'de' | 'en';
      root.querySelectorAll('[data-vs-sprache]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      laden(pfad);
    }));
  markieren?.addEventListener('change', () => doc()?.documentElement.toggleAttribute('data-vs-markieren', markieren.checked));
  root.querySelector('[data-vs-neu]')?.addEventListener('click', () => laden(pfad));
  new ResizeObserver(skalieren).observe(buehne);
  skalieren();
  laden(pfad);

  return {
    laden,
    zustand: (fn) => (quelle = fn),
    neu() {
      window.clearTimeout(timer);
      timer = window.setTimeout(anwenden, 250);
    },
    springen(z) {
      ziel = z;
      zeigen();
    },
  };
}
