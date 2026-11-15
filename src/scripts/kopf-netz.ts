/**
 * Netz im Kopf der Unterseiten (src/components/KopfNetz.astro) und im Kalender: Linien zeichnen sich ein,
 * Quadrate springen auf, Scrollen und Maus verschieben das Netz leicht. Bei „Bewegung reduzieren“ steht es still.
 * Der Start passt zum Auftritt des Textes (KOPF.netz in kopf-auftritt.ts).
 */
import { gsap, EASE, motionOk } from './gsap-kern';
import { KOPF } from './kopf-auftritt';

/** ein Netz bewegen; kopf ist die Fläche, über der Maus und Scrollen wirken */
export function netzBewegen(svg: SVGSVGElement, kopf: HTMLElement): void {
  svg.classList.add('is-da');
  if (!motionOk()) return;
  const linien = svg.querySelectorAll('line');
  const punkte = svg.querySelectorAll('rect');
  gsap.fromTo(linien, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.6, ease: EASE, stagger: { amount: Math.min(1, linien.length * 0.004) }, delay: KOPF.netz });
  gsap.fromTo(punkte, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.8, ease: EASE, stagger: { amount: Math.min(1, punkte.length * 0.006) }, delay: KOPF.netz + 0.4, clearProps: 'transform' });
  // Scrollen schiebt das Netz bis zu 12 % nach unten, solange der Kopf durchs Bild läuft (Oberkante oben bis
  // Unterkante oben). Bewusst ohne ScrollTrigger: so brauchen einfache Unterseiten nur den GSAP-Kern.
  const setzeY = gsap.quickSetter(svg, 'yPercent');
  let bild = 0;
  const schieben = () => {
    bild = 0;
    const r = kopf.getBoundingClientRect();
    setzeY(12 * Math.min(1, Math.max(0, -r.top / (r.height || 1))));
  };
  const planen = () => (bild ||= requestAnimationFrame(schieben));
  addEventListener('scroll', planen, { passive: true });
  addEventListener('resize', planen);
  schieben();
  if (!matchMedia('(pointer: fine)').matches) return;
  const qx = gsap.quickTo(svg, 'x', { duration: 1.4, ease: EASE });
  const qy = gsap.quickTo(svg, 'y', { duration: 1.4, ease: EASE });
  kopf.addEventListener('pointermove', (e) => {
    const r = kopf.getBoundingClientRect();
    qx(((e.clientX - r.left) / r.width - 0.5) * -24);
    qy(((e.clientY - r.top) / r.height - 0.5) * -14);
  });
}

export function initKopfNetz() {
  document.querySelectorAll<SVGSVGElement>('svg[data-kopf-netz]:not(.is-da)').forEach((svg) => {
    if (svg.parentElement) netzBewegen(svg, svg.parentElement);
  });
}
