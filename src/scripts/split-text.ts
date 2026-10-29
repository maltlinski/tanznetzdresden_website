/**
 * Text-Auftritte mit GSAP SplitText (Entwurf Startseite v5, Stufe „dezent“):
 *
 *   data-split          Überschrift: Wörter gleiten nacheinander von links herein, sobald sie ins Bild kommt
 *   data-sweep="0.35"   Zeile steigt Wort für Wort aus einer Maske auf, Start nach 0,35 × 1,2 s
 *                       (sobald der Abschnitt ins Bild kommt, siehe aufstieg())
 *
 * Ohne JavaScript oder bei „Bewegung reduzieren“ steht der Text sofort da. SplitText setzt ein aria-label
 * auf das Element, Screenreader lesen also den ganzen Satz statt einzelner Wörter.
 */
import { SplitText } from 'gsap/SplitText';
import { gsap, EASE, motionOk } from './gsap';

gsap.registerPlugin(SplitText);

const schriften = () => document.fonts?.ready ?? Promise.resolve();

/** Überschriften mit data-split innerhalb von root */
export function ueberschriften(root: ParentNode = document): void {
  if (!motionOk()) return;
  const els = [...root.querySelectorAll<HTMLElement>('[data-split]')];
  if (!els.length) return;
  schriften().then(() => {
    for (const el of els) {
      SplitText.create(el, {
        type: 'words',
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.words, { x: -60, opacity: 0, duration: 0.8, ease: EASE, stagger: 0.06, scrollTrigger: { trigger: el, start: 'top 85%', once: true } }),
      });
    }
  });
}

/** Zeilen mit data-sweep steigen aus einer Maske auf (einmal, wenn root ins Bild kommt) */
export function aufstieg(root: HTMLElement): void {
  if (!motionOk()) return;
  const els = [...root.querySelectorAll<HTMLElement>('[data-sweep]')];
  schriften().then(() => {
    for (const el of els) {
      SplitText.create(el, {
        type: 'words',
        mask: 'words',
        onSplit: (self) =>
          gsap.from(self.words, {
            yPercent: 110, duration: 0.9, ease: EASE, stagger: 0.08, delay: Number(el.dataset.sweep) * 1.2,
            scrollTrigger: { trigger: root, start: 'top 80%', once: true },
          }),
      });
    }
  });
}

/** Ein Wort Buchstabe für Buchstabe von unten herein (Claim im Hero); gibt die Aufteilung zurück */
export function zeichenHinein(el: HTMLElement, delay = 0): SplitText {
  const s = SplitText.create(el, { type: 'chars', aria: 'none' });
  gsap.from(s.chars, { yPercent: 105, duration: 0.75, ease: EASE, stagger: 0.022, delay });
  return s;
}

/** Buchstaben gleiten nach rechts hinaus; danach ist die Aufteilung zurückgenommen */
export function zeichenHinaus(s: SplitText): Promise<void> {
  return new Promise((fertig) => {
    gsap.to(s.chars, {
      x: 40, opacity: 0, duration: 0.28, ease: 'power3.in', stagger: 0.012,
      onComplete: () => {
        s.revert();
        fertig();
      },
    });
  });
}

/**
 * Titel im Kopf eines Beitrags: Wörter gleiten nacheinander herein, danach wird die Aufteilung zurückgenommen –
 * sonst könnten lange Wörter (als Blöcke) nicht mehr umbrechen.
 */
export function titelHerein(root: ParentNode = document, delay = 0.16): void {
  if (!motionOk()) return;
  const els = [...root.querySelectorAll<HTMLElement>('[data-split]')];
  if (!els.length) return;
  els.forEach((el) => (el.style.visibility = 'hidden'));
  schriften().then(() => {
    for (const el of els) {
      const s = SplitText.create(el, { type: 'words' });
      el.style.visibility = '';
      gsap.from(s.words, { x: -60, opacity: 0, duration: 0.8, ease: EASE, stagger: 0.06, delay, onComplete: () => s.revert() });
    }
  });
}
