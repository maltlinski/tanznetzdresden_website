/**
 * Formate-Seite (src/views/FormateView.astro): Kopf als Netz der Formate (zufällig geknüpft, Namen überlappen
 * sich nicht und lassen den Text frei, Knoten weichen der Maus entgegen, „Netz neu knüpfen“), Kurzbeschreibung
 * des Formats unter der Maus, nächste Termine (beim Öffnen neu gewählt), Filter „Ich möchte …“, Fotos mit
 * Wischer und Parallax, Archiv und die nächste Ausschreibung.
 * Ohne JavaScript: das Netz in fester Lage unter dem Text, alle Formate darunter, das Archiv zum Aufklappen.
 */
import { gsap, ScrollTrigger, EASE, motionOk } from './gsap';
import { knuepfen, verteilen, type Kante, type Lage } from '../lib/formate-netz';
import { ueberschriften } from './split-text';
import { kopfAuftritt, KOPF } from './kopf-auftritt';
import { heuteDresden, naechster, terminText, type FormatTermin } from '../lib/formate-termin';

interface Daten {
  locale: string;
  heute: string;
  folgt: string;
  folgtText: string;
  newsletter: string;
  termine: Record<string, FormatTermin[]>;
}

const ALLE = <T extends Element>(root: ParentNode, sel: string) => [...root.querySelectorAll<T>(sel)];

export function initFormate() {
  const daten = JSON.parse(document.getElementById('fo-daten')?.textContent ?? '{}') as Daten;
  termineAktualisieren(daten);
  kopf();
  ueberschriften();
  const filter = details();
  archiv();
  calls();
  // Sprung zu einem Format, das der Filter gerade ausblendet: Filter zurücksetzen, bevor gescrollt wird
  document.addEventListener(
    'click',
    (e) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]');
      const ziel = a && document.getElementById(decodeURIComponent(a.getAttribute('href')!.slice(1)));
      if (ziel?.matches('[data-kap]') && ziel.hidden) filter('');
    },
    { capture: true },
  );
}

/** Nächster Termin je Format, mit dem heutigen Datum statt dem des Builds */
function termineAktualisieren(d: Daten) {
  const heute = heuteDresden();
  for (const [id, liste] of Object.entries(d.termine ?? {})) {
    const n = naechster(liste, heute);
    const text = n ? terminText(n, d.locale, d.heute, heute) : d.folgt;
    ALLE<HTMLElement>(document, `[data-fo-termin="${id}"]`).forEach((el) => (el.textContent = text));
    const cta = document.querySelector<HTMLAnchorElement>(`[data-fo-cta="${id}"]`);
    if (!cta) continue;
    cta.href = n?.link ?? d.newsletter;
    const t = cta.querySelector('[data-t]')!;
    t.textContent = text;
    // Termin in der Datumsschrift (src/lib/datum-schrift.ts), „Termin folgt“ nicht
    t.classList.toggle('datum', !!n);
    cta.querySelector('[data-w]')!.textContent = n?.wo ?? d.folgtText;
  }
}

/* ---------- Kopf: Netz der Formate ---------- */
const SVG = 'http://www.w3.org/2000/svg';
/** Reichweite der Maus und größte Verschiebung eines Knotens (px) */
const ZUG = 22;

function kopf() {
  const root = document.querySelector<HTMLElement>('[data-fo-kopf]');
  const buehne = root?.querySelector<HTMLElement>('[data-fo-buehne]');
  if (!root || !buehne) return;
  const intro = root.querySelector<HTMLElement>('[data-fo-intro]')!;
  const knoten = ALLE<HTMLElement>(buehne, '[data-knoten]');
  const infoK = root.querySelector<HTMLElement>('[data-fo-info-k]')!;
  const infoT = root.querySelector<HTMLElement>('[data-fo-info-t]')!;
  const knopf = root.querySelector<HTMLButtonElement>('[data-fo-knuepfen]')!;
  const standard = { k: infoK.textContent ?? '', t: infoT.textContent ?? '' };
  // feste Lage aus dem Build (src/lib/formate-netz.ts), falls das Verteilen keinen Platz findet
  const fest = (el: HTMLElement, m: 'b' | 's'): Lage => ({
    x: parseFloat(el.style.getPropertyValue(`--x${m}`)),
    y: parseFloat(el.style.getPropertyValue(`--y${m}`)),
    seite: el.dataset[`s${m}`] === 'l' ? 'l' : 'r',
  });
  const start = { breit: knoten.map((el) => fest(el, 'b')), schmal: knoten.map((el) => fest(el, 's')) };
  const bewegt = motionOk();
  const fein = matchMedia('(pointer: fine)').matches;

  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'fo-netz fo-netz--js');
  svg.setAttribute('aria-hidden', 'true');
  buehne.prepend(svg);

  let lage: Lage[] = [];
  let kanten: Kante[] = [];
  let linien: SVGLineElement[] = [];
  let sw = 0;
  let sh = 0;
  let maus: [number, number] | null = null;
  let an = -1;
  const off = knoten.map(() => ({ x: 0, y: 0 }));
  let raf = 0;
  let busy = false;

  /** Text oben links freihalten, wenn er über der Bühne liegt (ab 720px) */
  const freiFlaeche = (): [number, number, number, number] | null => {
    const b = buehne.getBoundingClientRect();
    const i = intro.getBoundingClientRect();
    if (i.bottom <= b.top + 1) return null;
    return [i.left - b.left - 30, i.top - b.top - 30, i.right - b.left + 30, i.bottom - b.top + 30];
  };

  const setzen = () => {
    knoten.forEach((el, i) => {
      const l = lage[i];
      if (!l) return;
      el.style.setProperty('--xb', `${l.x}%`);
      el.style.setProperty('--xs', `${l.x}%`);
      el.style.setProperty('--yb', `${l.y}%`);
      el.style.setProperty('--ys', `${l.y}%`);
      el.dataset.sb = l.seite;
      el.dataset.ss = l.seite;
    });
    svg.setAttribute('viewBox', `0 0 ${sw} ${sh}`);
    svg.replaceChildren(
      ...kanten.map(() => {
        const l = document.createElementNS(SVG, 'line');
        l.setAttribute('pathLength', '1');
        return l;
      }),
    );
    linien = [...svg.querySelectorAll('line')];
    zeichnen(true);
  };

  /** neu verteilen und verbinden; false, wenn es keinen Platz gibt (dann bleibt das alte Netz) */
  const knuepfenNeu = (): boolean => {
    sw = buehne.clientWidth;
    sh = buehne.clientHeight;
    // Größe der Namen ohne Vergrößerung beim Darüberfahren
    const groessen = knoten.map((el) => {
      const a = el.querySelector<HTMLElement>('.fo-knoten__a')!;
      return { b: a.offsetWidth, h: a.offsetHeight };
    });
    const frei = freiFlaeche();
    let neu = verteilen(groessen, sw, sh, frei);
    // kein Platz gefunden: die feste Lage aus dem Build – unter dem Text immer, über dem Text nur beim ersten Mal
    if (!neu && (!frei || !lage.length)) neu = innerWidth < 720 ? start.schmal : start.breit;
    if (!neu) return false;
    lage = neu;
    kanten = knuepfen(lage.map((l) => [(l.x / 100) * sw, (l.y / 100) * sh]));
    setzen();
    return true;
  };

  /** Knoten und Linien an die Lage plus Verschiebung (Maus, gewählter Knoten) setzen */
  function zeichnen(sofort = false) {
    raf = 0;
    const basis = lage.map((l) => [(l.x / 100) * sw, (l.y / 100) * sh] as const);
    const R = Math.max(180, Math.min(340, sw * 0.28));
    let bewegtSich = false;
    basis.forEach((p, i) => {
      let tx = 0;
      let ty = 0;
      if (bewegt && i === an) {
        // gewählter Knoten rückt ein Stück nach außen
        const dx = p[0] - sw / 2;
        const dy = p[1] - sh / 2;
        const d = Math.hypot(dx, dy) || 1;
        tx = (dx / d) * ZUG;
        ty = (dy / d) * ZUG;
      } else if (bewegt && maus) {
        // Knoten in der Nähe der Maus neigen sich ihr zu
        const dx = maus[0] - p[0];
        const dy = maus[1] - p[1];
        const d = Math.hypot(dx, dy) || 1;
        if (d < R) {
          const f = Math.sin((1 - d / R) * Math.PI) * ZUG;
          tx = (dx / d) * f;
          ty = (dy / d) * f;
        }
      }
      const o = off[i];
      o.x = sofort ? tx : o.x + (tx - o.x) * 0.08;
      o.y = sofort ? ty : o.y + (ty - o.y) * 0.08;
      if (Math.abs(tx - o.x) > 0.05 || Math.abs(ty - o.y) > 0.05) bewegtSich = true;
    });
    const f = (n: number) => n.toFixed(1);
    knoten.forEach((el, i) => (el.style.transform = off[i].x || off[i].y ? `translate(${f(off[i].x)}px, ${f(off[i].y)}px)` : ''));
    kanten.forEach(([a, b], k) => {
      const L = linien[k];
      if (!L || !basis[a] || !basis[b]) return;
      L.setAttribute('x1', f(basis[a][0] + off[a].x));
      L.setAttribute('y1', f(basis[a][1] + off[a].y));
      L.setAttribute('x2', f(basis[b][0] + off[b].x));
      L.setAttribute('y2', f(basis[b][1] + off[b].y));
    });
    if (bewegtSich) raf = requestAnimationFrame(() => zeichnen());
  }
  const anstossen = () => {
    if (bewegt && !raf) raf = requestAnimationFrame(() => zeichnen());
  };

  /** Linien zeichnen sich von links, die Namen gleiten herein */
  const hineinZeichnen = (t0 = 0) =>
    gsap
      .timeline({ defaults: { ease: EASE } })
      .fromTo(linien, { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 1.5, stagger: 0.09 }, t0)
      .fromTo(buehne.querySelectorAll('[data-pre]'), { opacity: 0, x: -36 }, { opacity: 1, x: 0, duration: KOPF.dauer, stagger: 0.09, clearProps: 'transform,opacity' }, t0 + 0.15);

  // Info-Kasten: Kurzbeschreibung des Formats unter Maus oder Fokus
  const waehlen = (i: number) => {
    if (an === i) return;
    if (an >= 0) knoten[an].classList.remove('is-an');
    an = i;
    const el = knoten[i];
    if (el) el.classList.add('is-an');
    infoK.textContent = el ? el.dataset.kicker! : standard.k;
    infoT.textContent = el ? el.dataset.text! : standard.t;
    anstossen();
  };
  knoten.forEach((el, i) => {
    const a = el.querySelector('a')!;
    a.addEventListener('pointerenter', () => waehlen(i));
    a.addEventListener('pointerleave', () => an === i && waehlen(-1));
    a.addEventListener('focus', () => waehlen(i));
    a.addEventListener('blur', () => an === i && waehlen(-1));
  });
  if (bewegt && fein) {
    root.addEventListener('pointermove', (e) => {
      const r = buehne.getBoundingClientRect();
      maus = [e.clientX - r.left, e.clientY - r.top];
      anstossen();
    });
    root.addEventListener('pointerleave', () => {
      maus = null;
      anstossen();
    });
  }

  knopf.hidden = false;
  knopf.addEventListener('click', () => {
    if (busy) return;
    if (!bewegt) {
      knuepfenNeu();
      return;
    }
    busy = true;
    gsap
      .timeline({
        onComplete: () => {
          off.forEach((o) => ((o.x = 0), (o.y = 0)));
          knuepfenNeu();
          hineinZeichnen().eventCallback('onComplete', () => (busy = false));
        },
      })
      .to(linien, { attr: { 'stroke-dashoffset': 1 }, duration: 0.4, ease: 'power3.in', stagger: 0.02 }, 0)
      .to(buehne.querySelectorAll('[data-pre]'), { opacity: 0, x: 30, duration: 0.35, ease: 'power3.in', stagger: 0.03 }, 0);
  });

  // neu knüpfen, wenn sich die Breite ändert (nicht bei der Höhe: die Adressleiste auf dem Handy)
  let breite = innerWidth;
  let wart = 0;
  addEventListener('resize', () => {
    if (innerWidth === breite) return;
    breite = innerWidth;
    clearTimeout(wart);
    wart = window.setTimeout(() => knuepfenNeu(), 200);
  });

  // Text sofort wie auf allen Unterseiten (kopf-auftritt.ts); das Netz der Formate erst mit den richtigen Schriften
  const auftritt = kopfAuftritt(root);
  const los = () => {
    knuepfenNeu();
    buehne.classList.add('is-da');
    if (bewegt) hineinZeichnen(Math.max(0, KOPF.netz - (auftritt?.time() ?? KOPF.netz)));
  };
  // erst mit den richtigen Schriften messen (Breite der Namen)
  (document.fonts?.ready ?? Promise.resolve()).then(los, los);
}

/* ---------- Formate im Detail ---------- */
function details(): (rubrik: string) => void {
  const box = document.querySelector<HTMLElement>('[data-fo-filter]');
  const chips = box ? ALLE<HTMLButtonElement>(box, '[data-rubrik]') : [];
  const kapitel = ALLE<HTMLElement>(document, '[data-kap]');
  const alle = document.querySelector<HTMLButtonElement>('[data-fo-alle]');

  const filtern = (rubrik: string) => {
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.rubrik === rubrik)));
    kapitel.forEach((k) => (k.hidden = !!rubrik && !k.dataset.rubriken!.split(' ').includes(rubrik)));
    if (alle) alle.hidden = !rubrik;
    ScrollTrigger.refresh();
  };
  if (box) {
    box.hidden = false;
    chips.forEach((c) => c.addEventListener('click', () => filtern(c.dataset.rubrik ?? '')));
  }
  alle?.addEventListener('click', () => {
    filtern('');
    chips[0]?.focus();
  });
  // Fotos wischen von links herein
  const wipes = ALLE<HTMLElement>(document, '[data-wipe]');
  if (motionOk() && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (en) =>
        en.forEach((e) => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          (e.target as HTMLElement).animate?.([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 1000, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' });
        }),
      { threshold: 0.15 },
    );
    wipes.forEach((w) => io.observe(w));
  }
  // Fotos gleiten beim Scrollen langsamer als die Seite (Parallax)
  if (motionOk()) {
    ALLE<HTMLElement>(document, '[data-par]').forEach((im) =>
      gsap.fromTo(im, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: im.closest('.fo-kap__bild'), start: 'top bottom', end: 'bottom top', scrub: true } }),
    );
  }
  return filtern;
}

/* ---------- Archiv: Inhalt gleitet beim Aufklappen herein ---------- */
function archiv() {
  if (!motionOk()) return;
  ALLE<HTMLDetailsElement>(document, '[data-projekt]').forEach((d) =>
    d.addEventListener('toggle', () => {
      if (d.open) d.querySelector<HTMLElement>('[data-inhalt]')?.animate([{ opacity: 0, transform: 'translateX(-40px)' }, { opacity: 1, transform: 'none' }], { duration: 600, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    }),
  );
}

/* ---------- Mitmachen: die nächste noch offene Ausschreibung ---------- */
function calls() {
  const box = document.querySelector<HTMLElement>('[data-fo-calls]');
  if (!box) return;
  const heute = heuteDresden();
  const offen = ALLE<HTMLElement>(box, '[data-frist]').filter((c) => c.dataset.frist! >= heute);
  ALLE<HTMLElement>(box, '[data-frist]').forEach((c) => (c.hidden = c !== offen[0]));
  box.querySelector<HTMLElement>('[data-fo-keine]')!.hidden = offen.length > 0;
}
