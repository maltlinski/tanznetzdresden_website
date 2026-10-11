/**
 * GSAP (https://gsap.com) mit ScrollTrigger, abgestimmt auf das weiche Scrollen (Lenis).
 *
 * Nur dort importieren, wo eine Animation es braucht – dann landet GSAP nur auf diesen Seiten:
 *
 *   import { gsap, ScrollTrigger, EASE, motionOk } from '../scripts/gsap';
 *   if (motionOk()) gsap.from('.x', { x: -48, opacity: 0, ease: EASE, scrollTrigger: { trigger: '.x', start: 'top 80%' } });
 *
 * Hausregeln für Bewegung: schnell und entschieden, kein Federn (EASE = --ease-out),
 * und nichts bei „Bewegung reduzieren“ (motionOk() bzw. gsap.matchMedia()).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getLenis } from './smooth-scroll';

gsap.registerPlugin(ScrollTrigger);

/** wie --ease-out im Designsystem (cubic-bezier(0.16, 1, 0.3, 1)) */
export const EASE = 'expo.out';

export const motionOk = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;

// ScrollTrigger bei jedem Lenis-Schritt aktualisieren, damit Auslöser und weiches Scrollen
// nicht auseinanderlaufen. Lenis startet im Seitenrahmen (Base.astro), daher erst danach verbinden.
const connect = () => getLenis()?.on('scroll', ScrollTrigger.update);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', connect, { once: true });
else connect();

export { gsap, ScrollTrigger };
