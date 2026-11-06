/**
 * Netz im Kopf der Unterseiten (src/components/KopfNetz.astro), wie im Kalender: Linien zeichnen sich ein,
 * Quadrate springen auf, Scrollen und Maus verschieben das Netz leicht. Bei „Bewegung reduzieren“ steht es still.
 */
import { gsap, EASE, motionOk } from './gsap';

export function initKopfNetz() {
  document.querySelectorAll<SVGSVGElement>('svg[data-kopf-netz]:not(.is-da)').forEach((svg) => {
    svg.classList.add('is-da');
    const kopf = svg.parentElement;
    if (!kopf || !motionOk()) return;
    gsap.fromTo(svg.querySelectorAll('line'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.2, ease: EASE, stagger: 0.004 });
    gsap.fromTo(svg.querySelectorAll('rect'), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.6, ease: EASE, stagger: 0.006, delay: 0.3, clearProps: 'transform' });
    gsap.to(svg, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: kopf, start: 'top top', end: 'bottom top', scrub: true } });
    if (!matchMedia('(pointer: fine)').matches) return;
    const qx = gsap.quickTo(svg, 'x', { duration: 1.4, ease: EASE });
    const qy = gsap.quickTo(svg, 'y', { duration: 1.4, ease: EASE });
    kopf.addEventListener('pointermove', (e) => {
      const r = kopf.getBoundingClientRect();
      qx(((e.clientX - r.left) / r.width - 0.5) * -24);
      qy(((e.clientY - r.top) / r.height - 0.5) * -14);
    });
  });
}
