/**
 * Auftritt für Überschriften und Einleitungen (Entwurf Startseite/News, Runde 4).
 *
 *   data-sweep="0.3"  ein Farbbalken (data-bar, Standard Cyan) wischt über die Zeile,
 *                     dahinter erscheint der Text – Start nach 0,3 s
 *   data-rise="0.9"   Element gleitet von links herein – Start nach 0,9 s
 *
 * Ohne JavaScript oder bei „Bewegung reduzieren“ steht alles sofort da.
 */
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

export function introText(root: ParentNode | null): void {
  if (!root || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('animate' in Element.prototype)) return;

  root.querySelectorAll('[data-sweep-bar]').forEach((b) => b.remove());
  root.querySelectorAll<HTMLElement>('[data-sweep]').forEach((el) => {
    const delay = Number(el.dataset.sweep) * 1000;
    const duration = 1000;
    const color = getComputedStyle(el).color;
    const bar = document.createElement('span');
    bar.dataset.sweepBar = '';
    bar.setAttribute('aria-hidden', 'true');
    bar.className = 'sweep-bar';
    bar.style.background = el.dataset.bar || 'var(--cyan)';
    el.append(bar);
    el.animate(
      [{ color: 'transparent' }, { color: 'transparent', offset: 0.46 }, { color, offset: 0.47 }, { color }],
      { duration, delay, fill: 'backwards' },
    );
    bar
      .animate(
        [
          { transform: 'scaleX(0)', transformOrigin: '0 50%', easing: EASE },
          { transform: 'scaleX(1)', transformOrigin: '0 50%', offset: 0.46 },
          { transform: 'scaleX(1)', transformOrigin: '100% 50%', offset: 0.47, easing: 'cubic-bezier(0.7, 0, 0.84, 0)' },
          { transform: 'scaleX(0)', transformOrigin: '100% 50%' },
        ],
        { duration, delay, fill: 'both' },
      )
      .finished.then(() => bar.remove(), () => bar.remove());
  });
  root.querySelectorAll<HTMLElement>('[data-rise]').forEach((el) => {
    el.animate([{ opacity: 0, transform: 'translateX(-48px)' }, { opacity: 1, transform: 'none' }], {
      duration: 900,
      delay: Number(el.dataset.rise) * 1000,
      easing: EASE,
      fill: 'backwards',
    });
  });
}
