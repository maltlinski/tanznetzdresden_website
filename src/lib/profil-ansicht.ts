/**
 * Darstellungsregeln der Profilseite, die beim Build (src/views/ProfilView.astro) und in der Vorschau unter
 * „Mein Profil“ (src/scripts/profil-vorschau.ts) gleich gelten müssen: Name, Pitch-Wörter, Galerie-Formen.
 * Ohne Imports aus astro:*, weil die Datei auch im Browser läuft.
 */
import type { AngabeKey, GalerieLayout, OffenFuer } from './profil-felder';

export const pad = (n: number) => String(n).padStart(2, '0');

/** Vor- und Nachname (erstes Wort, Rest) und Schriftgröße nach dem längsten Wort (lange Namen sprengen sonst die Zeile) */
export function nameTeile(name: string) {
  const woerter = name.trim().split(/\s+/).filter(Boolean);
  const laengstes = Math.max(...woerter.map((w) => w.length), 4);
  return {
    vorname: woerter[0] ?? name,
    nachname: woerter.slice(1).join(' '),
    fit: `min(${(150 / laengstes).toFixed(2)}vw, ${Math.round(2000 / laengstes)}px)`,
  };
}

/**
 * Pitch in Wörter (Entwurf Profil v3): hervorgehoben wird ab dem Wort nach dem ersten Wort, das auf einen
 * Doppelpunkt endet; ohne Doppelpunkt im Satz die letzten drei Wörter. Gedankenstriche zählen nicht.
 */
export function pitchWoerter(satz: string) {
  const w = satz.trim().split(/\s+/).filter(Boolean);
  const mitDoppelpunkt = satz.includes(':');
  let an = false;
  return w.map((text, i) => {
    const hi = an || (!mitDoppelpunkt && i >= w.length - 3);
    if (mitDoppelpunkt && text.endsWith(':')) an = true;
    return { text, hi };
  });
}

/** Kurzbio als Absätze (Leerzeile trennt) */
export const absaetze = (text?: string) => (text ?? '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);

// Filmstreifen: wechselnde Höhen und Formate wie im Entwurf (h in vh, r = Breite/Höhe)
export const STREIFEN = [
  { h: 64, r: 4 / 5, align: 'start', keil: 'a' },
  { h: 48, r: 3 / 2, align: 'end', keil: '' },
  { h: 58, r: 3 / 4, align: 'center', keil: '' },
  { h: 44, r: 1, align: 'start', keil: 'b' },
  { h: 60, r: 16 / 10, align: 'end', keil: '' },
] as const;

/** Mosaik: Gruppen aus einem großen und zwei kleinen Fotos, Rest halb oder ganz breit */
export function mosaik(n: number, layout: GalerieLayout) {
  if (layout === 'raster') return Array.from({ length: n }, () => 'raster');
  const out: string[] = [];
  let i = 0;
  let gruppe = 0;
  while (i < n) {
    const rest = n - i;
    if (rest >= 3) {
      out.push(...(gruppe % 2 === 0 ? ['gross', 'klein', 'klein'] : ['klein', 'gross', 'klein']));
      i += 3;
      gruppe++;
    } else if (rest === 2) {
      out.push('halb', 'halb');
      i += 2;
    } else {
      out.push('ganz');
      i += 1;
    }
  }
  return out;
}

/** Nur Links ins Web (http/https) – kein „javascript:“ o. ä. aus Profilen; gleiche Regel wie in der Datenbank (20261108000000) */
export const webLink = (u?: string | null) => (u && /^https?:\/\/\S/i.test(u.trim()) ? u.trim() : undefined);

export const linkText = (u: string) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

/** Stand des Formulars „Mein Profil“, den die Vorschau zeigt (noch nicht gespeichert) */
export interface ProfilEntwurf {
  name: string;
  pronouns?: string;
  trainer: boolean;
  profession?: string;
  profession_en?: string;
  base?: string;
  pitch?: string;
  pitch_en?: string;
  tags: string[];
  bio?: string;
  bio_en?: string;
  /** Adresse des Porträts (auch ein neues, das noch auf Freigabe wartet) */
  photo?: string;
  photoCredit?: string;
  /** Fokuspunkt des Porträts „x% y%“ */
  photoFocus?: string;
  gallery: { src: string; caption?: string; caption_en?: string; credit?: string; fokus?: string; ganz?: boolean }[];
  galleryLayout: GalerieLayout;
  works: { year: string; title: string; place?: string }[];
  angaben: Partial<Record<AngabeKey, string>>;
  website?: string;
  instagram?: string;
  vimeo?: string;
  email?: string;
  openFor: OffenFuer[];
}
