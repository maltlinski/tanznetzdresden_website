/**
 * GSAP (https://gsap.com) ohne ScrollTrigger: für Bewegung, die sofort beim Aufrufen läuft (Auftritt der Köpfe).
 * So laden Seiten ohne Scroll-Animationen ein gutes Drittel weniger JavaScript. Mit Scroll-Auslösern: ./gsap.
 *
 * Hausregeln für Bewegung: schnell und entschieden, kein Federn (EASE = --ease-out),
 * und nichts bei „Bewegung reduzieren“ (motionOk() bzw. gsap.matchMedia()).
 */
import { gsap } from 'gsap';

/** wie --ease-out im Designsystem (cubic-bezier(0.16, 1, 0.3, 1)) */
export const EASE = 'expo.out';

export const motionOk = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;

export { gsap };
