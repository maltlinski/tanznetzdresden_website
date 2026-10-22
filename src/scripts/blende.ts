/**
 * Blende zwischen Website und internem Bereich (Entwurf Startseite v5 + Mitgliedsstatus):
 *
 *   blendeEin()  Website, Klick auf „Login“: Magenta und Lila wischen von links über die Seite,
 *                Logo und „Interner Bereich“ erscheinen, dann geht es weiter zum internen Bereich.
 *   blendeAus()  interner Bereich (layouts/Intern.astro): die lila Fläche schrumpft auf die Seitenleiste,
 *                Logo und Schriftzug gleiten an ihren Platz, die Inhalte kommen dazu.
 *
 * Verbunden über sessionStorage (das Inline-Skript im Intern-Rahmen setzt dann html.blende vor dem ersten Bild).
 * Bei „Bewegung reduzieren“ oder ohne Web Animations geht es ohne Blende direkt weiter.
 */
export const BLENDE_KEY = 'tndd-blende';

const EXPO_IN_OUT = 'cubic-bezier(0.87, 0, 0.13, 1)';
const EXPO_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const ruhig = () => matchMedia('(prefers-reduced-motion: reduce)').matches || !('animate' in Element.prototype);
const fertig = (a: Animation) => a.finished.catch(() => undefined);

/** Website: Blende zuziehen und dann zu `ziel` wechseln. Gibt false zurück, wenn es ohne Blende weitergehen soll. */
export function blendeEin(root: HTMLElement, ziel: string): boolean {
  try {
    sessionStorage.setItem(BLENDE_KEY, '1');
  } catch {
    return false;
  }
  if (ruhig()) return false;
  const q = (s: string) => root.querySelector<HTMLElement>(s)!;
  root.hidden = false;
  const opt = (dauer: number, delay: number, easing: string): KeyframeAnimationOptions => ({ duration: dauer, delay, easing, fill: 'both' });
  const zu = [{ transform: 'translateX(-100%)' }, { transform: 'translateX(0)' }];
  q('[data-blende-naht]').animate(zu, opt(750, 0, EXPO_IN_OUT));
  const flaeche = q('[data-blende-flaeche]').animate(zu, opt(750, 90, EXPO_IN_OUT));
  const rein = [{ opacity: 0, transform: 'translateX(-60px)' }, { opacity: 1, transform: 'none' }];
  q('[data-blende-logo]').animate(rein, opt(600, 550, EXPO_OUT));
  const tag = q('[data-blende-tag]').animate(rein, opt(600, 650, EXPO_OUT));
  void Promise.all([fertig(flaeche), fertig(tag)]).then(() => setTimeout(() => location.assign(ziel), 150));
  return true;
}

/** Interner Bereich: Blende in die Seitenleiste auflösen (nur wenn html.blende gesetzt ist) */
export function blendeAus(): void {
  const html = document.documentElement;
  if (!html.classList.contains('blende')) return;
  const ende = () => html.classList.remove('blende');
  const root = document.querySelector<HTMLElement>('[data-blende]');
  const side = document.querySelector<HTMLElement>('[data-side]');
  if (!root || !side || ruhig()) return ende();
  // Sicherheitsnetz, falls eine Animation hängen bleibt
  const notfall = setTimeout(ende, 2500);

  const los = () => {
    const q = (s: string) => root.querySelector<HTMLElement>(s)!;
    const flaeche = q('[data-blende-flaeche]');
    const leiste = side.getBoundingClientRect();
    const flug = (el: HTMLElement, ziel: Element | null) => {
      if (!ziel) return el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: 'both' });
      const a = el.getBoundingClientRect();
      const b = ziel.getBoundingClientRect();
      const s = b.width / a.width;
      el.style.transformOrigin = '0 0';
      return el.animate(
        [{ transform: 'none' }, { transform: `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${s})` }],
        { duration: 1000, delay: 200, easing: EXPO_IN_OUT, fill: 'both' },
      );
    };
    const zu = flaeche.animate(
      [{ width: '100%', height: '100%' }, { width: `${leiste.width}px`, height: `${leiste.height}px` }],
      { duration: 1000, delay: 200, easing: EXPO_IN_OUT, fill: 'both' },
    );
    flug(q('[data-blende-logo]'), side.querySelector('[data-blende-ziel="logo"]'));
    flug(q('[data-blende-tag]'), side.querySelector('[data-blende-ziel="tag"]'));
    q('[data-blende-naht]').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 1000, fill: 'both' });

    // Inhalt von unten, Ausweis (falls da) mit Drehung von rechts
    const inhalt = document.querySelector<HTMLElement>('[data-blende-inhalt]');
    inhalt?.animate([{ opacity: 0, transform: 'translateY(36px)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: 800, easing: EXPO_OUT, fill: 'backwards' });
    document.querySelector<HTMLElement>('[data-blende-karte]')?.animate(
      [{ opacity: 0, transform: 'perspective(1400px) translateX(90px) rotateY(-22deg)' }, { opacity: 1, transform: 'none' }],
      { duration: 1100, delay: 900, easing: EXPO_OUT, fill: 'backwards' },
    );

    void fertig(zu).then(() => {
      clearTimeout(notfall);
      ende();
      side.querySelectorAll<HTMLElement>('[data-side-teil]').forEach((el, i) =>
        el.animate([{ opacity: 0, transform: 'translateX(-24px)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: i * 80, easing: EXPO_OUT, fill: 'backwards' }),
      );
    });
  };
  (document.fonts?.ready ?? Promise.resolve()).then(los, los);
}
