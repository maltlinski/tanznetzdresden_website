/**
 * Tanzkalender-Archiv (src/views/TanzkalenderArchivView.astro): Filter nach Jahrgang, Plakate wischen herein,
 * Großansicht zum Blättern (Pfeile, Pfeiltasten, Esc) innerhalb des gewählten Jahrgangs.
 * Ohne JavaScript: alle Ausgaben, „PDF“ öffnet die Datei.
 */
import { fuellen } from '../lib/texte-regeln';

interface Ausgabe { nr: string; label: string; gross: string; pdf: string; alt: string; jahr: number }
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const ruhig = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initTanzkalenderArchiv() {
  const ausgaben = JSON.parse(document.getElementById('tka-daten')?.textContent ?? '[]') as Ausgabe[];
  const texte = JSON.parse(document.getElementById('tka-texte')?.textContent ?? '{}') as { kopf: string; gesamt: string };
  let jahr = '';

  // Jahrgang
  const filter = document.querySelector<HTMLElement>('[data-tka-filter]');
  if (filter) {
    filter.hidden = false;
    const chips = [...filter.querySelectorAll<HTMLButtonElement>('[data-jahr]')];
    chips.forEach((c) =>
      c.addEventListener('click', () => {
        jahr = c.dataset.jahr ?? '';
        chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
        document.querySelectorAll<HTMLElement>('[data-tka-jahr]').forEach((b) => (b.hidden = !!jahr && b.dataset.tkaJahr !== jahr));
      }),
    );
  }

  // Plakate im Kopf wischen von links herein
  if (!ruhig()) {
    document.querySelectorAll<HTMLElement>('[data-wipe]').forEach((el, i) =>
      el.animate?.([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 1300, delay: 450 + i * 100, easing: EASE, fill: 'backwards' }),
    );
  }

  // Großansicht
  const dlg = document.querySelector<HTMLDialogElement>('[data-tka-lb]');
  if (!dlg) return;
  const img = dlg.querySelector<HTMLImageElement>('[data-lb-img]')!;
  const kopf = dlg.querySelector<HTMLElement>('[data-lb-kopf]')!;
  const label = dlg.querySelector<HTMLElement>('[data-lb-label]')!;
  const pdf = dlg.querySelector<HTMLAnchorElement>('[data-lb-pdf]')!;
  const vor = dlg.querySelector<HTMLButtonElement>('[data-lb-vor]')!;
  const nach = dlg.querySelector<HTMLButtonElement>('[data-lb-nach]')!;
  let i = 0;

  const liste = () => ausgaben.map((_, k) => k).filter((k) => !jahr || String(ausgaben[k].jahr) === jahr);
  function zeigen(k: number, richtung = 0) {
    i = k;
    const a = ausgaben[k];
    const l = liste();
    const pos = l.indexOf(k);
    img.src = a.gross;
    img.alt = a.alt;
    kopf.textContent = fuellen(texte.kopf, { nr: a.nr, gesamt: texte.gesamt });
    label.textContent = a.label;
    pdf.href = a.pdf;
    vor.disabled = pos <= 0;
    nach.disabled = pos >= l.length - 1;
    if (!ruhig()) img.animate?.([{ opacity: 0, transform: `translateX(${richtung * -60}px)` }, { opacity: 1, transform: 'none' }], { duration: 500, easing: EASE });
  }
  const blaettern = (d: number) => {
    const l = liste();
    const n = l[l.indexOf(i) + d];
    if (n !== undefined) zeigen(n, d);
  };

  document.querySelectorAll<HTMLElement>('[data-oeffnen]').forEach((b) =>
    b.addEventListener('click', () => {
      zeigen(Number(b.dataset.oeffnen));
      dlg.showModal();
    }),
  );
  vor.addEventListener('click', () => blaettern(-1));
  nach.addEventListener('click', () => blaettern(1));
  dlg.querySelector('[data-lb-zu]')!.addEventListener('click', () => dlg.close());
  // Klick neben das Plakat schließt
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || (e.target as HTMLElement).matches('.tka-lb__buehne, .tka-lb__flaeche')) dlg.close();
  });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') blaettern(1);
    if (e.key === 'ArrowLeft') blaettern(-1);
  });
  // Fokus nach dem Schließen auf „Ansehen“ der zuletzt gezeigten Ausgabe (Plakate selbst sind nur für die Maus)
  dlg.addEventListener('close', () => document.querySelector<HTMLElement>(`.tka-ansehen[data-oeffnen="${i}"]`)?.focus());
}
