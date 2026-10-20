/**
 * Profilseite (src/views/ProfilView.astro): Abschnittsleiste mit Fortschritt, Vollbild der Galerie
 * und Bewegung (Intro des Namens, Wörter des Pitch, Filmstreifen, Parallaxe).
 * Bei „Bewegung reduzieren“ bleibt alles still und der Filmstreifen ist eine wischbare Reihe.
 */
interface VollbildFoto {
  nr: string;
  gross: string;
  alt: string;
  cap: string;
  credit: string;
}

const EASE = 'cubic-bezier(0.16,1,0.3,1)';

export function initProfil() {
  const root = document.querySelector<HTMLElement>('[data-profil]');
  if (!root) return;
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;

  kopfHoehe();
  root.querySelectorAll<HTMLElement>('[data-galerie]').forEach(vollbild);
  if (!ruhig) intro(root);

  const pbar = root.querySelector<HTMLElement>('[data-pbar]');
  const fortschritt = root.querySelector<HTMLElement>('[data-fortschritt]');
  const links = [...root.querySelectorAll<HTMLAnchorElement>('[data-pbar-link]')];
  const pitch = root.querySelector<HTMLElement>('[data-pitch]');
  const woerter = pitch ? [...pitch.querySelectorAll<HTMLElement>('[data-w]')] : [];
  const bild = root.querySelector<HTMLElement>('[data-parallax]');
  const streifen = [...root.querySelectorAll<HTMLElement>('[data-strip]')].map(filmstreifen);
  if (!ruhig && woerter.length) pitch!.classList.add('ppitch--an');

  let raf = 0;
  const tick = () => {
    raf = 0;
    const y = scrollY;
    const vh = innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    if (fortschritt) fortschritt.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max).toFixed(4) : 0})`;
    // aktueller Abschnitt: der letzte, dessen Anfang oben vorbei ist
    const grenze = (pbar?.getBoundingClientRect().bottom ?? 0) + 40;
    let aktiv: HTMLAnchorElement | undefined;
    for (const a of links) {
      const ziel = document.getElementById(a.dataset.pbarLink!);
      if (ziel && ziel.offsetParent !== null && ziel.getBoundingClientRect().top < grenze) aktiv = a;
    }
    links.forEach((a) => (a === aktiv ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current')));
    if (ruhig) return;
    if (bild && y < vh * 1.5) bild.style.transform = `translate3d(0, ${(y * 0.14).toFixed(1)}px, 0)`;
    if (pitch && woerter.length) {
      const r = pitch.getBoundingClientRect();
      const q = Math.max(0, Math.min(1, (vh * 0.82 - r.top) / (r.height * 0.6)));
      woerter.forEach((w, i) => w.classList.toggle('is-an', q * (woerter.length + 1) > i + 0.5));
    }
    streifen.forEach((s) => s?.());
  };
  const planen = () => (raf ||= requestAnimationFrame(tick));
  addEventListener('scroll', planen, { passive: true });
  addEventListener('resize', planen);
  tick();
}

/** Höhe des klebenden Seitenkopfs als --header-h (die Abschnittsleiste klebt darunter) */
function kopfHoehe() {
  const kopf = document.querySelector<HTMLElement>('[data-header]');
  if (!kopf) return;
  const setzen = () => document.documentElement.style.setProperty('--header-h', `${kopf.offsetHeight}px`);
  setzen();
  new ResizeObserver(setzen).observe(kopf);
}

/** Name wischt mit einem Farbbalken herein, Zeilen gleiten von links, das Foto öffnet sich */
function intro(root: HTMLElement) {
  if (!root.animate) return;
  root.querySelectorAll<HTMLElement>('[data-sweep]').forEach((el) => {
    const delay = Number(el.dataset.sweep) * 1000;
    const dauer = 1100;
    const farbe = getComputedStyle(el).color;
    const balken = document.createElement('span');
    balken.setAttribute('aria-hidden', 'true');
    balken.style.cssText = `position:absolute;left:-0.04em;right:-0.04em;top:0.08em;bottom:0.02em;pointer-events:none;background:${el.dataset.bar ?? 'var(--cyan)'}`;
    el.append(balken);
    el.animate([{ color: 'transparent' }, { color: 'transparent', offset: 0.46 }, { color: farbe, offset: 0.47 }, { color: farbe }], { duration: dauer, delay, fill: 'backwards' });
    balken
      .animate(
        [
          { transform: 'scaleX(0)', transformOrigin: '0 50%', easing: EASE },
          { transform: 'scaleX(1)', transformOrigin: '0 50%', offset: 0.46 },
          { transform: 'scaleX(1)', transformOrigin: '100% 50%', offset: 0.47, easing: 'cubic-bezier(0.7,0,0.84,0)' },
          { transform: 'scaleX(0)', transformOrigin: '100% 50%' },
        ],
        { duration: dauer, delay, fill: 'both' },
      )
      .finished.finally(() => balken.remove());
  });
  root.querySelectorAll<HTMLElement>('[data-rise]').forEach((el) =>
    el.animate([{ opacity: 0, transform: 'translateX(-48px)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: Number(el.dataset.rise) * 1000, easing: EASE, fill: 'backwards' }),
  );
  root.querySelectorAll<HTMLElement>('[data-wipe]').forEach((el) =>
    el.animate([{ clipPath: 'inset(0 0 0 100%)' }, { clipPath: getComputedStyle(el).clipPath }], { duration: 1300, delay: 150, easing: EASE, fill: 'backwards' }),
  );
}

/**
 * Filmstreifen: auf breiten Bildschirmen bleibt der Abschnitt stehen und die Fotos ziehen beim Scrollen
 * seitlich vorbei. Gibt die Funktion zurück, die bei jedem Scrollen läuft (oder null ohne Bewegung).
 */
function filmstreifen(box: HTMLElement): (() => void) | null {
  const track = box.querySelector<HTMLElement>('[data-track]');
  const bar = box.querySelector<HTMLElement>('[data-strip-bar]');
  if (!track || matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  const breit = matchMedia('(min-width: 861px)');
  const messen = () => {
    box.classList.toggle('pstrip--pin', breit.matches);
    track.style.transform = '';
    box.style.height = breit.matches ? `${Math.round(track.scrollWidth - innerWidth + innerHeight)}px` : '';
  };
  messen();
  breit.addEventListener('change', messen);
  addEventListener('resize', messen);
  // Bilder laden nach und verändern die Breite
  track.querySelectorAll('img').forEach((img) => img.addEventListener('load', messen, { once: true }));
  return () => {
    if (!breit.matches) return;
    const r = box.getBoundingClientRect();
    const weg = r.height - innerHeight;
    const q = weg > 0 ? Math.max(0, Math.min(1, -r.top / weg)) : 0;
    track.style.transform = `translate3d(${(-q * Math.max(0, track.scrollWidth - innerWidth)).toFixed(1)}px, 0, 0)`;
    if (bar) bar.style.transform = `scaleX(${q.toFixed(3)})`;
  };
}

/** Vollbild: Knöpfe mit data-lb-oeffnen öffnen das Foto, Pfeile/Pfeiltasten blättern, Esc schließt */
function vollbild(box: HTMLElement) {
  const dlg = box.querySelector<HTMLDialogElement>('[data-lb]');
  const daten = JSON.parse(box.querySelector('[data-lb-daten]')?.textContent ?? '[]') as VollbildFoto[];
  if (!dlg || !daten.length) return;
  const img = dlg.querySelector<HTMLImageElement>('[data-lb-img]')!;
  const nr = dlg.querySelector<HTMLElement>('[data-lb-nr]')!;
  const cap = dlg.querySelector<HTMLElement>('[data-lb-cap]')!;
  const credit = dlg.querySelector<HTMLElement>('[data-lb-credit]')!;
  const thumbs = [...dlg.querySelectorAll<HTMLButtonElement>('[data-lb-gehe]')];
  let i = 0;
  let zurueck: HTMLElement | null = null;

  const zeigen = (n: number) => {
    i = (n + daten.length) % daten.length;
    const f = daten[i];
    img.src = f.gross;
    img.alt = f.alt || f.cap;
    nr.textContent = f.nr;
    cap.textContent = f.cap;
    credit.textContent = f.credit;
    thumbs.forEach((b, k) => (k === i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
  };
  box.querySelectorAll<HTMLElement>('[data-lb-oeffnen]').forEach((b) =>
    b.addEventListener('click', () => {
      zurueck = b;
      zeigen(Number(b.dataset.lbOeffnen));
      dlg.showModal();
    }),
  );
  dlg.querySelectorAll<HTMLElement>('[data-lb-schritt]').forEach((b) => b.addEventListener('click', () => zeigen(i + Number(b.dataset.lbSchritt))));
  thumbs.forEach((b) => b.addEventListener('click', () => zeigen(Number(b.dataset.lbGehe))));
  dlg.querySelector('[data-lb-zu]')?.addEventListener('click', () => dlg.close());
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') zeigen(i + 1);
    if (e.key === 'ArrowLeft') zeigen(i - 1);
  });
  // Klick neben das Foto schließt
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || (e.target as HTMLElement).classList.contains('plb__mitte')) dlg.close();
  });
  dlg.addEventListener('close', () => zurueck?.focus());
}
