/**
 * „Website bearbeiten“ → Fotos frei formatieren (erweiterter Modus): Foto anklicken, Ausschnitt mit der Maus (oder
 * den Pfeiltasten) verschieben, Zoom, „Ganz zeigen“ statt die Fläche zu füllen, Zurücksetzen. Gilt für dieses Foto auf
 * dieser Seite (beide Sprachen, alle Bildschirmgrößen) und wird mit „Speichern“ oben in src/settings/bilder.json
 * gespeichert. Regeln und CSS (gleich wie auf der Website): src/lib/bild-stil.ts.
 */
import { bildStamm, bildStilCss, bildStilPruefen, type BildStil } from '../../../lib/bild-stil';

const STIL = `
  html[data-sb-fotos] img { cursor: move; outline: 1.5px dashed color-mix(in srgb, var(--magenta) 75%, transparent); outline-offset: -1.5px; }
  html[data-sb-fotos] .sb-foto-wahl { outline: 3px solid var(--magenta) !important; outline-offset: -3px; }
  html[data-sb-fotos] .sb-chip { display: none !important; }
  .sb-werkzeug { position: absolute; z-index: 2147483002; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; max-width: min(560px, calc(100vw - 16px));
    padding: 8px 10px; background: var(--purple); color: #fff; font: 600 11px/1.4 var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; }
  .sb-werkzeug[hidden] { display: none; }
  .sb-werkzeug__name { flex: 1 1 100%; color: var(--cyan); text-transform: none; letter-spacing: 0.02em; }
  .sb-werkzeug label { display: flex; align-items: center; gap: 6px; }
  .sb-werkzeug input[type=range] { width: 120px; accent-color: var(--magenta); }
  .sb-werkzeug button { padding: 5px 8px; border: 1.5px solid rgba(255, 255, 255, 0.5); border-radius: 0; background: transparent; color: #fff; font: inherit; letter-spacing: inherit; text-transform: inherit; cursor: pointer; }
  .sb-werkzeug button[aria-pressed='true'] { background: #fff; color: var(--purple); }
  .sb-werkzeug button:hover { border-color: var(--magenta); }
  .sb-werkzeug button:focus-visible, .sb-werkzeug input:focus-visible { outline: 2px solid var(--cyan); outline-offset: 1px; }
  .sb-werkzeug__tipp { flex: 1 1 100%; color: rgba(255, 255, 255, 0.75); text-transform: none; letter-spacing: 0.02em; font-weight: 400; }
`;

export interface FotoOptionen {
  /** Stile der Fotos dieser Seite (Arbeitsstand) */
  lesen(): Record<string, BildStil>;
  /** ein Foto geändert (null = zurückgesetzt); fertig = ein Schritt für Rückgängig */
  setzen(stamm: string, s: BildStil | null, fertig: boolean): void;
}

export interface Fotos {
  /** Modus an/aus */
  modus(an: boolean): void;
  /** Stile neu zeichnen (nach Rückgängig, Verwerfen, Speichern) */
  zeichnen(): void;
}

export function fotosFormatieren(d: Document, opt: FotoOptionen): Fotos {
  const win = d.defaultView!;
  // der Editor zeichnet die Stile selbst (der gespeicherte Stand aus Base.astro ginge sonst nicht zurückzusetzen)
  d.querySelector('style[data-bildstil]')?.remove();
  const css = d.createElement('style');
  const ui = d.createElement('style');
  ui.textContent = STIL;
  d.head.append(css, ui);
  const zeichnen = () => {
    css.textContent = bildStilCss(opt.lesen());
  };
  zeichnen();

  let an = false;
  let wahl: HTMLImageElement | null = null;
  const werkzeug = d.createElement('div');
  werkzeug.className = 'sb-werkzeug';
  werkzeug.hidden = true;
  werkzeug.setAttribute('role', 'group');
  werkzeug.setAttribute('aria-label', 'Foto formatieren');
  d.body.append(werkzeug);

  const stamm = () => (wahl ? bildStamm(wahl.getAttribute('src') ?? wahl.currentSrc) : '');
  const jetzt = (): BildStil => opt.lesen()[stamm()] ?? {};
  const aendern = (s: BildStil, fertig: boolean) => {
    opt.setzen(stamm(), bildStilPruefen(s), fertig);
    zeichnen();
    if (fertig) leiste();
  };

  function leiste() {
    if (!wahl) return;
    const s = jetzt();
    const knopf = (text: string, fn: () => void, gedrueckt?: boolean) => {
      const b = d.createElement('button');
      b.type = 'button';
      b.textContent = text;
      if (gedrueckt !== undefined) b.setAttribute('aria-pressed', String(gedrueckt));
      b.addEventListener('click', fn);
      return b;
    };
    const name = d.createElement('span');
    name.className = 'sb-werkzeug__name';
    name.textContent = `Foto „${stamm()}“ · auf dieser Seite`;
    const zoom = d.createElement('input');
    zoom.type = 'range';
    zoom.min = '100';
    zoom.max = '300';
    zoom.step = '5';
    zoom.value = String(Math.round((s.zoom ?? 1) * 100));
    zoom.setAttribute('aria-label', 'Zoom');
    const zahl = d.createElement('span');
    zahl.textContent = `${zoom.value} %`;
    zoom.addEventListener('input', () => {
      zahl.textContent = `${zoom.value} %`;
      aendern({ ...jetzt(), zoom: Number(zoom.value) / 100 }, false);
    });
    zoom.addEventListener('change', () => aendern({ ...jetzt(), zoom: Number(zoom.value) / 100 }, true));
    const zl = d.createElement('label');
    zl.append('Zoom', zoom, zahl);
    const tipp = d.createElement('span');
    tipp.className = 'sb-werkzeug__tipp';
    tipp.textContent = 'Ziehen (oder Pfeiltasten) verschiebt den Ausschnitt, bei Bedarf erst zoomen. Gilt nach dem Speichern oben.';
    werkzeug.replaceChildren(
      name,
      zl,
      knopf('Füllen', () => aendern({ ...jetzt(), ganz: false }, true), !s.ganz),
      knopf('Ganz zeigen', () => aendern({ ...jetzt(), ganz: true }, true), !!s.ganz),
      knopf('Zurücksetzen', () => aendern({}, true)),
      knopf('Fertig', () => waehlen(null)),
      tipp,
    );
    werkzeug.hidden = false;
    platzieren();
  }

  /** Leiste am Foto: darunter, wenn Platz ist, sonst darüber (auch beim Scrollen) */
  function platzieren() {
    if (!wahl || werkzeug.hidden) return;
    const r = wahl.getBoundingClientRect();
    const h = werkzeug.offsetHeight;
    // nicht unter die Kopfleiste der Website
    const oben = Math.max(8, (d.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0) + 8);
    // darunter, sonst darüber, sonst (großes Foto) oben im sichtbaren Teil des Fotos
    const y = r.bottom + 8 + h < win.innerHeight ? r.bottom + 8 : r.top - h - 8 >= oben ? r.top - h - 8 : Math.max(r.top, oben) + 8;
    werkzeug.style.top = `${win.scrollY + y}px`;
    werkzeug.style.left = `${win.scrollX + Math.max(8, Math.min(r.left, win.innerWidth - werkzeug.offsetWidth - 8))}px`;
  }

  /** Markierung am Rahmen um das Foto (ein vergrößertes Foto schneidet seine eigene Linie ab) */
  const rahmen = (img: HTMLImageElement | null) => (img ? ((img.parentElement?.tagName === 'PICTURE' ? img.parentElement.parentElement : img.parentElement) ?? img) : null);
  function waehlen(img: HTMLImageElement | null) {
    rahmen(wahl)?.classList.remove('sb-foto-wahl');
    wahl = img;
    rahmen(wahl)?.classList.add('sb-foto-wahl');
    if (wahl) leiste();
    else werkzeug.hidden = true;
  }

  /** Foto unter dem Zeiger, auch unter durchsichtigen Ebenen (Verläufe, Links über dem Bild) */
  const fotoBei = (x: number, y: number) => d.elementsFromPoint(x, y).find((el): el is HTMLImageElement => el.tagName === 'IMG' && !!bildStamm(el.getAttribute('src') ?? ''));

  // Ziehen verschiebt den Ausschnitt; vor allem anderen auf der Seite (Fenster, Erfassungsphase)
  let zug: { x: number; y: number; s: BildStil; w: number; h: number } | null = null;
  win.addEventListener('pointerdown', (ev) => {
    // Leisten und feste Texte (auch über einem Foto) bleiben bedienbar
    if (!an || (ev.target as Element).closest('.sb-werkzeug, .sb-leiste, [data-sb-text]')) return;
    const img = fotoBei(ev.clientX, ev.clientY);
    if (!img) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (img !== wahl) waehlen(img);
    const r = img.getBoundingClientRect();
    const s = jetzt();
    zug = { x: ev.clientX, y: ev.clientY, s: { x: 50, y: 50, ...s }, w: r.width, h: r.height };
  }, true);
  win.addEventListener('pointermove', (ev) => {
    if (!zug) return;
    const z = zug.s.zoom ?? 1;
    // Foto folgt dem Zeiger: nach rechts ziehen zeigt mehr vom linken Rand
    aendern({ ...zug.s, x: (zug.s.x ?? 50) - ((ev.clientX - zug.x) / zug.w) * 100 / z, y: (zug.s.y ?? 50) - ((ev.clientY - zug.y) / zug.h) * 100 / z }, false);
  }, true);
  win.addEventListener('pointerup', () => {
    if (!zug) return;
    zug = null;
    aendern(jetzt(), true);
  }, true);
  // Klicks im Modus: keine Links, kein Formular
  win.addEventListener('click', (ev) => {
    if (!an || (ev.target as Element).closest('.sb-werkzeug, .sb-leiste, [data-sb-text]')) return;
    if (fotoBei(ev.clientX, ev.clientY)) {
      ev.preventDefault();
      ev.stopPropagation();
    }
  }, true);
  win.addEventListener('dragstart', (ev) => an && ev.preventDefault(), true);
  win.addEventListener('scroll', platzieren, { passive: true });
  win.addEventListener('resize', platzieren);
  win.addEventListener('keydown', (ev) => {
    if (!an || !wahl) return;
    if (ev.key === 'Escape') return waehlen(null);
    const schritt = ev.shiftKey ? 10 : 2;
    const dx = { ArrowLeft: -schritt, ArrowRight: schritt }[ev.key] ?? 0;
    const dy = { ArrowUp: -schritt, ArrowDown: schritt }[ev.key] ?? 0;
    if (!dx && !dy) return;
    if ((ev.target as Element).closest?.('input')) return;
    ev.preventDefault();
    const s = jetzt();
    // wie Ziehen: Pfeil nach links schiebt das Foto nach links
    aendern({ ...s, x: (s.x ?? 50) - dx, y: (s.y ?? 50) - dy }, true);
  }, true);

  return {
    modus(x) {
      an = x;
      d.documentElement.toggleAttribute('data-sb-fotos', x);
      if (!x) waehlen(null);
    },
    zeichnen() {
      zeichnen();
      if (wahl) leiste();
    },
  };
}
