/**
 * Diashow der Statements im Kopf der Netzwerk-Seite (src/components/StatementsKopf.astro).
 *
 * - zeigt den Fotonachweis des gezeigten Statements im Band
 * - startet beim Statement, das das kleine Skript im HTML zufällig gewählt hat (data-start)
 * - alle DAUER ms das nächste (Überblenden per CSS), Fortschritt als Magenta-Linie
 * - hält an, solange die Maus darauf zeigt oder der Fokus in der Steuerung ist, und über den Pause-Knopf
 *   (dann bleibt sie stehen, bis man wieder startet); läuft nicht, wenn der Kopf nicht zu sehen oder der Tab
 *   im Hintergrund ist
 * - Pfeiltasten in der Steuerung, Wischen auf dem Foto
 * - „Bewegung reduzieren“: nichts läuft von selbst, Blättern geht ohne Überblenden
 */
import { motionOk } from './gsap-kern';

const DAUER = 7000;

export function statementsKopf(kopf: HTMLElement | null): void {
  const buehne = kopf?.querySelector<HTMLElement>('[data-nk-buehne]');
  if (!kopf || !buehne) return;
  const dias = [...buehne.querySelectorAll<HTMLElement>('[data-nk-dia]')];
  // Zitate als Text unter dem Foto (nur auf dem Handy sichtbar, StatementsKopf.astro)
  const zitate = [...kopf.querySelectorAll<HTMLElement>('[data-nk-zitat]')];
  // Fotonachweis des gezeigten Statements im Band (für Screenreader steht er in der Bildbeschreibung)
  const fotoZeile = kopf.querySelector<HTMLElement>('[data-nk-foto-zeile]');
  const foto = kopf.querySelector<HTMLElement>('[data-nk-foto]');
  const nachweis = (d: HTMLElement | undefined) => {
    if (!fotoZeile || !foto) return;
    foto.textContent = d?.dataset.foto ?? '';
    fotoZeile.hidden = !foto.textContent;
  };
  nachweis(dias.find((d) => d.classList.contains('is-aktiv')) ?? dias[0]);
  const steuer = kopf.querySelector<HTMLElement>('[data-nk-steuer]');
  if (!steuer || dias.length < 2) return;
  const nr = steuer.querySelector<HTMLElement>('[data-nk-nr]')!;
  const balken = steuer.querySelector<HTMLElement>('[data-nk-balken]')!;
  const pauseKnopf = steuer.querySelector<HTMLButtonElement>('[data-nk-pause]')!;
  steuer.hidden = false;

  let aktiv = Math.max(0, dias.findIndex((d) => d.classList.contains('is-aktiv')));
  /** vom Knopf angehalten (bleibt), sonst nur vorübergehend (Maus, Fokus, nicht sichtbar) */
  let angehalten = !motionOk();
  const halt = new Set<string>();
  let verstrichen = 0;
  let letzter = 0;
  let rahmen = 0;

  const zeigen = (i: number) => {
    aktiv = (i + dias.length) % dias.length;
    dias.forEach((d, k) => {
      d.classList.toggle('is-aktiv', k === aktiv);
      if (k === aktiv) d.removeAttribute('aria-hidden');
      else d.setAttribute('aria-hidden', 'true');
      // das nächste Foto schon laden
      if (k === (aktiv + 1) % dias.length) d.querySelector('img')?.setAttribute('loading', 'eager');
    });
    zitate.forEach((z, k) => z.classList.toggle('is-aktiv', k === aktiv));
    nr.textContent = String(aktiv + 1).padStart(2, '0');
    nachweis(dias[aktiv]);
    verstrichen = 0;
    balken.style.transform = 'scaleX(0)';
  };

  const laeuft = () => !angehalten && halt.size === 0;
  const takt = (jetzt: number) => {
    if (laeuft()) {
      verstrichen += letzter ? Math.min(jetzt - letzter, 100) : 0;
      if (verstrichen >= DAUER) zeigen(aktiv + 1);
      balken.style.transform = `scaleX(${Math.min(1, verstrichen / DAUER)})`;
    }
    letzter = jetzt;
    rahmen = requestAnimationFrame(takt);
  };

  const pauseZeigen = () => {
    pauseKnopf.setAttribute('aria-pressed', String(angehalten));
    pauseKnopf.setAttribute('aria-label', (angehalten ? pauseKnopf.dataset.start : pauseKnopf.dataset.pause) ?? '');
  };
  pauseKnopf.addEventListener('click', () => {
    angehalten = !angehalten;
    pauseZeigen();
  });
  steuer.querySelector('[data-nk-weiter]')!.addEventListener('click', () => zeigen(aktiv + 1));
  steuer.querySelector('[data-nk-zurueck]')!.addEventListener('click', () => zeigen(aktiv - 1));
  steuer.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') zeigen(aktiv + 1);
    else if (e.key === 'ArrowLeft') zeigen(aktiv - 1);
    else return;
    e.preventDefault();
  });

  // vorübergehend anhalten
  const an = (grund: string, ja: boolean) => (ja ? halt.add(grund) : halt.delete(grund));
  buehne.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && an('maus', true));
  buehne.addEventListener('pointerleave', () => an('maus', false));
  steuer.addEventListener('focusin', () => an('fokus', true));
  steuer.addEventListener('focusout', (e) => !steuer.contains(e.relatedTarget as Node) && an('fokus', false));
  document.addEventListener('visibilitychange', () => an('tab', document.hidden));
  new IntersectionObserver(([e]) => an('sicht', !e.isIntersecting)).observe(buehne);

  // Wischen
  let start: { x: number; y: number } | null = null;
  buehne.addEventListener('pointerdown', (e) => (start = { x: e.clientX, y: e.clientY }));
  buehne.addEventListener('pointerup', (e) => {
    if (!start) return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - start.y)) zeigen(aktiv + (dx < 0 ? 1 : -1));
    start = null;
  });

  zeigen(aktiv);
  pauseZeigen();
  rahmen = requestAnimationFrame(takt);
  addEventListener('pagehide', () => cancelAnimationFrame(rahmen), { once: true });
}
