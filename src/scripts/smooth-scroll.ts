/**
 * Weiches Scrollen mit Lenis (https://github.com/darkroomengineering/lenis), seitenweit.
 *
 * - Mausrad und Trackpad gleiten nach, Touch bleibt nativ (fühlt sich auf dem Handy richtig an).
 * - Sprungmarken auf derselben Seite (#termine …) gleiten hin; sticky Header und
 *   scroll-margin werden berücksichtigt, der Fokus springt mit (Tastatur, Screenreader).
 * - Bereiche mit eigenem Scrollen (Cookie-Dialog, Textfelder) scrollen weiter selbst.
 * - Bei „Bewegung reduzieren“ bleibt alles beim normalen Browser-Scrollen.
 *
 * Feineinstellung: LERP (0–1, kleiner = weicher) und ANCHOR_DURATION in Sekunden.
 */
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

const LERP = 0.12;
const ANCHOR_DURATION = 1.1;
/** wie --ease-out im Designsystem: schnell und entschieden, kein Federn */
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

let lenis: Lenis | null = null;

export function getLenis(): Lenis | null {
  return lenis;
}

/**
 * Zielposition aus der echten Scrollposition (Lenis' eigene kann nach Scrollbalken oder Tastatur
 * veraltet sein), abzüglich scroll-margin des Ziels und scroll-padding (sticky Header).
 */
function targetY(el: HTMLElement): number {
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  return el.getBoundingClientRect().top + window.scrollY - margin - padding;
}

export function initSmoothScroll(): void {
  if (lenis || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  lenis = new Lenis({ autoRaf: true, lerp: LERP, allowNestedScroll: true, stopInertiaOnNavigate: true });

  // Sprungmarken auf derselben Seite: weich hingleiten statt springen.
  document.addEventListener('click', (e) => {
    if (!lenis || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.('a[href*="#"]');
    if (!(a instanceof HTMLAnchorElement) || a.target === '_blank') return;
    const to = new URL(a.href);
    if (to.origin !== location.origin || to.pathname !== location.pathname || !to.hash) return;
    const id = decodeURIComponent(to.hash.slice(1));
    const target = id === 'top' ? document.body : document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(id === 'top' ? 0 : targetY(target), { duration: ANCHOR_DURATION, easing: easeOutExpo });
    if (location.hash !== to.hash) history.pushState(null, '', to.hash);
    // Fokus mitnehmen, ohne dass der Browser selbst springt
    if (target !== document.body) {
      if (!target.matches('a, button, input, select, textarea, [tabindex]')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  });
}
