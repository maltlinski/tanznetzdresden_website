/**
 * Formate-Seite (src/views/FormateView.astro): Kopf mit Durchlauf der Formate (Ziffern und Titel gleiten
 * hinaus und herein, der Freisteller öffnet sich mit einer Keil-Kante, Fortschritt in der Leiste), Netz,
 * nächste Termine (beim Öffnen neu gewählt), Filter „Ich möchte …“, Leiste mit aktivem Format,
 * Bilder mit Wischer, Archiv und die nächste Ausschreibung.
 * Ohne JavaScript: das erste Format im Kopf, alle Formate darunter, das Archiv zum Aufklappen.
 */
import { gsap, EASE, motionOk } from './gsap';
import { ueberschriften } from './split-text';
import { heuteDresden, naechster, terminText, type FormatTermin } from '../lib/formate-termin';

interface Daten {
  locale: string;
  heute: string;
  folgt: string;
  folgtText: string;
  newsletter: string;
  termine: Record<string, FormatTermin[]>;
  anhalten: string;
  weiter: string;
}

const STANDZEIT = 6.5;
const ALLE = <T extends Element>(root: ParentNode, sel: string) => [...root.querySelectorAll<T>(sel)];

export function initFormate() {
  const daten = JSON.parse(document.getElementById('fo-daten')?.textContent ?? '{}') as Daten;
  termineAktualisieren(daten);
  kopf(daten);
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

/* ---------- Kopf ---------- */
function kopf(d: Daten) {
  const root = document.querySelector<HTMLElement>('[data-fo-kopf]');
  if (!root) return;
  const panels = ALLE<HTMLElement>(root, '[data-fo-panel]');
  const tabs = ALLE<HTMLButtonElement>(root, '[data-fo-tab]');
  const cuts = ALLE<HTMLElement>(root, '[data-cut]');
  const fills = ALLE<HTMLElement>(root, '[data-fill]');
  const live = root.querySelector<HTMLElement>('[data-fo-live]')!;
  const pause = root.querySelector<HTMLButtonElement>('[data-fo-pause]')!;
  const bewegt = motionOk();
  let cur = 0;
  let busy = false;
  let fill: gsap.core.Tween | null = null;
  let angehalten = false;
  let hover = false;
  let draussen = false;

  netz(root);

  const ruhen = () => angehalten || hover || draussen || document.hidden;
  const pruefen = () => fill && (ruhen() ? fill.pause() : fill.resume());

  function zyklus() {
    fill?.kill();
    fill = null;
    fills.forEach((el, i) => gsap.set(el, { scaleX: i < cur ? 1 : 0 }));
    if (!bewegt) {
      gsap.set(fills[cur], { scaleX: 1 });
      return;
    }
    fill = gsap.fromTo(fills[cur], { scaleX: 0 }, { scaleX: 1, duration: STANDZEIT, ease: 'none', onComplete: () => zeigen((cur + 1) % panels.length, false) });
    pruefen();
  }

  function umschalten(i: number) {
    panels[cur].hidden = true;
    panels[i].hidden = false;
    tabs[cur].setAttribute('aria-selected', 'false');
    tabs[cur].tabIndex = -1;
    tabs[i].setAttribute('aria-selected', 'true');
    tabs[i].tabIndex = 0;
    cur = i;
  }

  function hinein(p: HTMLElement, delay = 0) {
    if (!bewegt) return;
    gsap.fromTo(p.querySelectorAll('[data-ch]'), { yPercent: 110 }, { yPercent: 0, duration: 0.95, ease: EASE, stagger: 0.07, delay });
    gsap.fromTo(p.querySelectorAll('[data-w]'), { yPercent: 110 }, { yPercent: 0, duration: 0.85, ease: EASE, stagger: 0.06, delay: delay + 0.08 });
    gsap.fromTo(p.querySelectorAll('[data-out]'), { x: -60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: EASE, stagger: 0.06, delay: delay + 0.14, clearProps: 'transform,opacity' });
  }

  function foto(i: number) {
    const neu = cuts[i];
    const alt = cuts.filter((c) => c !== neu);
    if (!bewegt) {
      alt.forEach((c) => c.classList.remove('is-an'));
      neu.classList.add('is-an');
      return;
    }
    // Keil-Schnitt: eine schräge Kante öffnet die neue Figur, die alte tritt zur Seite ab
    gsap.to(alt.filter((c) => c.classList.contains('is-an')), { opacity: 0, x: 60, duration: 0.45, ease: 'power3.in', overwrite: true, onComplete: () => alt.forEach((c) => c.classList.remove('is-an')) });
    neu.classList.add('is-an');
    gsap.fromTo(
      neu,
      { opacity: 1, x: -60, clipPath: 'polygon(-40% 0%, 0% 0%, -40% 100%, -40% 100%)' },
      { x: 0, clipPath: 'polygon(-40% 0%, 140% 0%, 100% 100%, -40% 100%)', duration: 1.15, ease: EASE, delay: 0.18, overwrite: true, onComplete: () => gsap.set(neu, { clearProps: 'clipPath' }) },
    );
  }

  /** Format i zeigen; `nutzer` = gewählt (dann ansagen), sonst automatischer Wechsel (still) */
  function zeigen(i: number, nutzer: boolean) {
    if (i === cur || busy) return;
    live.setAttribute('aria-live', nutzer ? 'polite' : 'off');
    foto(i);
    if (!bewegt) {
      umschalten(i);
      zyklus();
      return;
    }
    busy = true;
    fill?.kill();
    const p = panels[cur];
    gsap
      .timeline({
        onComplete: () => {
          gsap.set(p.querySelectorAll('[data-ch], [data-w], [data-out]'), { clearProps: 'all' });
          umschalten(i);
          busy = false;
          hinein(panels[i]);
          zyklus();
        },
      })
      .to(p.querySelectorAll('[data-ch]'), { yPercent: -110, duration: 0.34, ease: 'power3.in', stagger: 0.04 }, 0)
      .to(p.querySelectorAll('[data-w]'), { yPercent: -110, duration: 0.3, ease: 'power3.in', stagger: 0.03 }, 0.04)
      .to(p.querySelectorAll('[data-out]'), { x: 40, opacity: 0, duration: 0.26, ease: 'power3.in', stagger: 0.025 }, 0);
  }

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => zeigen(i, true));
    // Pfeiltasten wechseln zwischen den Reitern (wie bei Tabs üblich)
    t.addEventListener('keydown', (e) => {
      const n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      const ziel = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : n ? (i + n + tabs.length) % tabs.length : -1;
      if (ziel < 0) return;
      e.preventDefault();
      tabs[ziel].focus();
      zeigen(ziel, true);
    });
  });

  // Anhalten: Knopf, Maus über der Bühne, Fokus darin, Kopf außer Sicht, Tab im Hintergrund
  if (bewegt) {
    pause.hidden = false;
    pause.addEventListener('click', () => {
      angehalten = !angehalten;
      pause.setAttribute('aria-pressed', String(angehalten));
      pause.textContent = angehalten ? d.weiter : d.anhalten;
      pruefen();
    });
    const buehne = root.querySelector<HTMLElement>('.fo-buehne')!;
    buehne.addEventListener('pointerenter', () => ((hover = true), pruefen()));
    buehne.addEventListener('pointerleave', () => ((hover = false), pruefen()));
    root.addEventListener('focusin', () => ((hover = true), pruefen()));
    root.addEventListener('focusout', () => ((hover = false), pruefen()));
    document.addEventListener('visibilitychange', pruefen);
    new IntersectionObserver((en) => ((draussen = !en[0].isIntersecting), pruefen()), { threshold: 0.25 }).observe(root);
  }

  hinein(panels[0], 0.3);
  zyklus();
}

/** Netz im Kopf: Linien zeichnen sich, Punkte erscheinen, beim Scrollen und mit der Maus leicht versetzt (wie im Kalender) */
function netz(root: HTMLElement) {
  const svg = root.querySelector<SVGSVGElement>('[data-fo-netz]');
  if (!svg) return;
  svg.classList.add('is-da');
  if (!motionOk()) return;
  gsap.fromTo(svg.querySelectorAll('line'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.2, ease: EASE, stagger: 0.0035 });
  gsap.fromTo(svg.querySelectorAll('rect'), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.6, ease: EASE, stagger: 0.005, delay: 0.3, clearProps: 'transform' });
  gsap.to(svg, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: true } });
  const qx = gsap.quickTo(svg, 'x', { duration: 1.4, ease: EASE });
  const qy = gsap.quickTo(svg, 'y', { duration: 1.4, ease: EASE });
  root.addEventListener('pointermove', (e) => {
    const r = root.getBoundingClientRect();
    qx(((e.clientX - r.left) / r.width - 0.5) * -24);
    qy(((e.clientY - r.top) / r.height - 0.5) * -14);
  });
}

/* ---------- Formate im Detail ---------- */
function details(): (rubrik: string) => void {
  const box = document.querySelector<HTMLElement>('[data-fo-filter]');
  const chips = box ? ALLE<HTMLButtonElement>(box, '[data-rubrik]') : [];
  const kapitel = ALLE<HTMLElement>(document, '[data-kap]');
  const rail = ALLE<HTMLAnchorElement>(document, '[data-rail]');
  const fillEl = document.querySelector<HTMLElement>('[data-rail-fill]');
  const alle = document.querySelector<HTMLButtonElement>('[data-fo-alle]');
  let aktiv = -1;

  // Leiste: aktives Format = das letzte, dessen Oberkante über 40 % der Fensterhöhe liegt
  const markieren = () => {
    const sichtbar = kapitel.filter((k) => !k.hidden);
    const linie = innerHeight * 0.4;
    let a = 0;
    sichtbar.forEach((k, i) => {
      if (k.getBoundingClientRect().top < linie) a = i;
    });
    if (a === aktiv && fillEl?.dataset.n === String(sichtbar.length)) return;
    aktiv = a;
    const id = sichtbar[a]?.id;
    rail.forEach((l) => l.classList.toggle('is-aktiv', l.dataset.rail === id));
    rail.forEach((l) => (l.dataset.rail === id ? l.setAttribute('aria-current', 'true') : l.removeAttribute('aria-current')));
    if (fillEl) {
      fillEl.dataset.n = String(sichtbar.length);
      fillEl.style.height = sichtbar.length ? `${((a + 1) / sichtbar.length) * 100}%` : '0';
    }
  };
  let raf = 0;
  addEventListener('scroll', () => (raf ||= requestAnimationFrame(() => ((raf = 0), markieren()))), { passive: true });
  addEventListener('resize', markieren);

  const filtern = (rubrik: string) => {
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.rubrik === rubrik)));
    kapitel.forEach((k) => (k.hidden = !!rubrik && !k.dataset.rubriken!.split(' ').includes(rubrik)));
    rail.forEach((l) => (l.hidden = document.getElementById(l.dataset.rail!)!.hidden));
    if (alle) alle.hidden = !rubrik;
    // abwechselnd links/rechts nur unter den sichtbaren
    kapitel.filter((k) => !k.hidden).forEach((k, i) => k.classList.toggle('fo-kap--rechts', i % 2 === 1));
    aktiv = -1;
    markieren();
  };
  if (box) {
    box.hidden = false;
    chips.forEach((c) => c.addEventListener('click', () => filtern(c.dataset.rubrik ?? '')));
  }
  alle?.addEventListener('click', () => {
    filtern('');
    chips[0]?.focus();
  });
  markieren();

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
    wipes.forEach((w) => io.observe(w.querySelector('img') ?? w));
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
