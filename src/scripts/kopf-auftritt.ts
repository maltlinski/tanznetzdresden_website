/**
 * Auftritt der lila Köpfe beim Aufrufen einer Seite – auf allen Unterseiten gleich (Muster: Kalender und Formate).
 * Ausnahmen: Startseite (eigener Hero) und Profitraining/KEEP UP (eigene Bewegung).
 *
 *   0,00 s  Kicker (.kopf__kicker) und alles mit data-kopf-vor (Zurück-Link, Pfad, Datum) gleiten von links herein
 *   0,10 s  die Headline Wort für Wort von links (h1 oder data-kopf-titel; schon geteilt: data-kopf-wort)
 *   0,30 s  alles mit data-kopf-folgt (Einleitung, Knöpfe, Kästen, Fotos), nacheinander in der Reihenfolge der Seite
 *   0,20 s  das Netz im Hintergrund zeichnet sich ein (kopf-netz.ts, KOPF.netz)
 *
 * Ohne JavaScript oder bei „Bewegung reduzieren“ steht alles sofort da (gsap.from, nichts per CSS versteckt).
 * Die Wörter werden nach dem Auftritt wieder zusammengesetzt, damit Trennung und Umbruch der Headline stimmen.
 */
import { SplitText } from 'gsap/SplitText';
import { gsap, EASE, motionOk } from './gsap';

gsap.registerPlugin(SplitText);

/** Takt des Auftritts (Sekunden, Pixel) – einmal festgelegt, überall gleich */
export const KOPF = {
  /** Weg von links */
  x: -60,
  dauer: 0.8,
  /** Start der Headline */
  titel: 0.1,
  /** Abstand der Wörter */
  wort: 0.06,
  /** Start der folgenden Elemente */
  folgt: 0.3,
  /** Abstand der Elemente untereinander */
  abstand: 0.08,
  /** Start des Netzes im Hintergrund */
  netz: 0.2,
} as const;

const sichtbar = (el: HTMLElement) => !el.closest('[hidden]');
/** nur die äußersten Elemente (Kicker in einer Zeile mit data-kopf-vor nicht doppelt) */
const aussen = (els: HTMLElement[]) => els.filter((el) => !els.some((o) => o !== el && o.contains(el)));

interface Optionen {
  /** späterer Start (z. B. zweite Spalte der 404-Seite) */
  verzoegerung?: number;
}

/**
 * Spielt den Auftritt für einen Kopf (oder eine Spalte darin) ab. Gibt die Zeitleiste zurück,
 * damit eine Seite eigene Bewegung anhängen kann; null ohne Bewegung oder wenn er schon lief.
 */
export function kopfAuftritt(kopf: HTMLElement | null | undefined, { verzoegerung = 0 }: Optionen = {}): gsap.core.Timeline | null {
  if (!kopf || !motionOk() || kopf.dataset.auftritt === 'da') return null;
  kopf.dataset.auftritt = 'da';

  const vor = aussen([...kopf.querySelectorAll<HTMLElement>('.kopf__kicker, [data-kopf-vor]')].filter(sichtbar));
  const folgt = aussen([...kopf.querySelectorAll<HTMLElement>('[data-kopf-folgt]')].filter(sichtbar));
  const titel = kopf.querySelector<HTMLElement>('[data-kopf-titel]') ?? kopf.querySelector<HTMLElement>('h1');

  // fertige Teile (auch mehrere Ebenen desselben Namens, Profil) oder die Headline in Wörter teilen
  let woerter = [...kopf.querySelectorAll<HTMLElement>('[data-kopf-wort]')];
  let teilung: SplitText | null = null;
  if (titel && !woerter.length) {
    teilung = SplitText.create(titel, { type: 'words', wordsClass: 'kopf-wort' });
    woerter = teilung.words as HTMLElement[];
    // ein Wort passt nicht in die Zeile (sonst getrennt): Headline als Ganzes
    if (titel.scrollWidth > titel.clientWidth + 1) {
      teilung.revert();
      teilung = null;
      woerter = [titel];
    }
  }

  const von = { x: KOPF.x, opacity: 0, clearProps: 'transform,opacity' };
  const tl = gsap.timeline({ delay: verzoegerung, defaults: { ease: EASE, duration: KOPF.dauer } });
  if (vor.length) tl.from(vor, { ...von, stagger: KOPF.abstand }, 0);
  if (woerter.length) {
    // data-kopf-wort="1": feste Stelle in der Reihe (zwei Ebenen desselben Namens laufen gleich)
    const stelle = (i: number, el: Element) => {
      const n = Number((el as HTMLElement).dataset.kopfWort);
      return (Number.isFinite(n) && (el as HTMLElement).dataset.kopfWort !== '' ? n : i) * KOPF.wort;
    };
    tl.from(woerter, { ...von, stagger: stelle, onComplete: () => teilung?.revert() }, KOPF.titel);
  }
  if (folgt.length) tl.from(folgt, { ...von, stagger: KOPF.abstand }, KOPF.folgt);
  return tl;
}

/** Alle Köpfe mit data-kopf-auftritt auf der Seite */
export function initKopfAuftritt(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-kopf-auftritt]').forEach((k) => kopfAuftritt(k, { verzoegerung: Number(k.dataset.kopfAuftritt) || 0 }));
}
