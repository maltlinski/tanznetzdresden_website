/**
 * Zuschnitt von Profilfotos: Fokuspunkt, sichtbarer Ausschnitt je Rahmen und ein Vorschlag aus dem Bildinhalt.
 *
 * Fotos stehen auf der Website in festen Formen (Porträt im Keil, Filmstreifen, Mosaik …) mit `object-fit: cover`.
 * Der Fokuspunkt („x% y%“, wie `object-position`) bestimmt, welcher Teil sichtbar bleibt: der Punkt liegt im Rahmen
 * an derselben Stelle wie im Foto, ist also in jeder Form zu sehen. Gespeichert wird er je Foto (Porträt:
 * `profiles.photo_focus`, Galerie: `fokus` im Eintrag). Galeriefotos können statt dessen ganz gezeigt werden (`ganz`).
 *
 * Gemeinsam für den Build (ProfilView, ProfilePhoto, Mosaik) und den Zuschnitt-Dialog unter „Mein Profil“
 * (src/scripts/intern/zuschnitt.ts) – ohne Imports aus astro:*, weil die Datei auch im Browser läuft.
 */
import type { GalerieLayout } from './profil-felder';
import { mosaik, STREIFEN } from './profil-ansicht';

/** Fokuspunkt in Prozent (0 = links/oben, 100 = rechts/unten) */
export interface Fokus {
  x: number;
  y: number;
}

/** Standard für Porträts ohne gewählten Fokus: Mitte, etwas oberhalb (Gesichter) */
export const FOKUS_PORTRAET: Fokus = { x: 50, y: 30 };
export const FOKUS_MITTE: Fokus = { x: 50, y: 50 };

const RE = /^(\d{1,3}(?:\.\d+)?)% (\d{1,3}(?:\.\d+)?)%$/;
const klemmen = (v: number, a = 0, b = 100) => Math.min(b, Math.max(a, v));

/** „40% 25%“ lesen; alles andere (auch aus der Datenbank) ergibt undefined */
export function fokusLesen(v: unknown): Fokus | undefined {
  if (typeof v !== 'string') return undefined;
  const m = RE.exec(v.trim());
  if (!m) return undefined;
  const x = Number(m[1]);
  const y = Number(m[2]);
  return x <= 100 && y <= 100 ? { x, y } : undefined;
}

export const fokusText = (f: Fokus) => `${Math.round(klemmen(f.x))}% ${Math.round(klemmen(f.y))}%`;

/** gültiger Fokus als Text für `object-position`, sonst undefined */
export const fokusPos = (v: unknown) => {
  const f = fokusLesen(v);
  return f ? fokusText(f) : undefined;
};

/**
 * Sichtbarer Teil eines Fotos (Seitenverhältnis `bild` = Breite/Höhe) in einem Rahmen (`rahmen`) bei
 * `object-fit: cover` und `object-position` = Fokus. Ergebnis in Anteilen des Fotos (0–1).
 */
export function ausschnitt(bild: number, rahmen: number, f: Fokus) {
  if (bild > rahmen) {
    const w = rahmen / bild;
    return { x: (1 - w) * (klemmen(f.x) / 100), y: 0, w, h: 1 };
  }
  const h = bild / rahmen;
  return { x: 0, y: (1 - h) * (klemmen(f.y) / 100), w: 1, h };
}

/** Eine Form, in der ein Foto auf der Website erscheint */
export interface Rahmen {
  id: string;
  de: string;
  en: string;
  /** Seitenverhältnis Breite/Höhe */
  r: number;
  /** Keil (clip-path) wie auf der Seite */
  clip?: string;
  /** Foto wird ganz gezeigt (kein Zuschnitt, Rest der Fläche bleibt frei) */
  ganz?: boolean;
}

// Formen wie in ProfilView.astro, ProfilePhoto.astro und keep-up/Mosaik.astro
const KEIL_PROFIL = 'polygon(18% 0, 100% 0, 100% 100%, 0 100%)';
const KEIL_HANDY = 'polygon(0 0, 100% 0, 100% 90%, 84% 100%, 0 100%)';
const KEIL_KARTE = 'polygon(0 0, 100% 0, 100% 88%, 88% 100%, 0 100%)';
const KEIL_STREIFEN = { a: 'polygon(0 0, 100% 0, 100% 90%, 86% 100%, 0 100%)', b: 'polygon(0 0, 100% 0, 100% 100%, 12% 100%, 0 88%)' } as const;
/** Mosaik auf großen Bildschirmen (groß: 7 von 12 Spalten über zwei Zeilen der kleinen 4:3) */
const MOSAIK_R: Record<string, number> = { gross: 0.93, klein: 4 / 3, halb: 4 / 3, ganz: 21 / 9, raster: 4 / 5 };
const MOSAIK_HANDY_R: Record<string, number> = { gross: 4 / 3, ganz: 4 / 3, klein: 4 / 5, halb: 4 / 5, raster: 4 / 5 };

/** Filmstreifen mit ganzem Foto: der Rahmen nimmt das Format des Fotos an (in Grenzen), ohne Keil */
export const streifenFormat = (bild: number) => +klemmen(bild, 0.5, 2.2).toFixed(3);

/** Rahmen des Porträts (oder des Fotos oben, wenn es kein Porträt gibt) */
export function rahmenPortraet(o: { karte?: boolean; training?: boolean } = {}): Rahmen[] {
  return [
    { id: 'profil', de: 'Profil, großer Bildschirm', en: 'Profile, large screen', r: 0.78, clip: KEIL_PROFIL },
    { id: 'handy', de: 'Profil auf dem Handy', en: 'Profile on a phone', r: 4 / 5, clip: KEIL_HANDY },
    ...(o.karte ? [{ id: 'karte', de: 'Netzwerk-Übersicht', en: 'Network overview', r: 4 / 5, clip: KEIL_KARTE }] : []),
    ...(o.training ? [{ id: 'training', de: 'Profitraining', en: 'Professional training', r: 1 }] : []),
  ];
}

/**
 * Rahmen eines Galeriefotos. `k` zählt in der Galerie unter dem Foto oben (ohne Porträt rückt das erste
 * Galeriefoto nach oben, dann gilt rahmenPortraet), `n` ist die Zahl dieser Fotos.
 */
export function rahmenGalerie(k: number, n: number, layout: GalerieLayout, bild: number, ganz: boolean): Rahmen[] {
  if (layout === 'filmstreifen') {
    const s = STREIFEN[k % STREIFEN.length];
    return [{
      id: 'streifen', de: 'Filmstreifen', en: 'Film strip',
      r: ganz ? streifenFormat(bild) : s.r, clip: s.keil && !ganz ? KEIL_STREIFEN[s.keil] : undefined,
    }];
  }
  const span = mosaik(n, layout)[k] ?? 'raster';
  const name = layout === 'mosaik' ? { de: 'Mosaik', en: 'Mosaic' } : { de: 'Raster', en: 'Grid' };
  return [
    { id: 'gross', de: `${name.de}, großer Bildschirm`, en: `${name.en}, large screen`, r: MOSAIK_R[span], ganz },
    { id: 'handy', de: `${name.de} auf dem Handy`, en: `${name.en} on a phone`, r: MOSAIK_HANDY_R[span], ganz },
  ];
}

/** Bereich, der in allen Rahmen sichtbar ist (Schnitt der Ausschnitte); Rahmen mit ganzem Foto zählen nicht */
export function sicherSichtbar(bild: number, rahmen: Rahmen[], f: Fokus) {
  let x0 = 0, y0 = 0, x1 = 1, y1 = 1;
  for (const r of rahmen) {
    if (r.ganz) continue;
    const a = ausschnitt(bild, r.r, f);
    x0 = Math.max(x0, a.x);
    y0 = Math.max(y0, a.y);
    x1 = Math.min(x1, a.x + a.w);
    y1 = Math.min(y1, a.y + a.h);
  }
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}

export type Quelle = 'gesicht' | 'person' | 'inhalt' | 'mitte';

/** erkannter Bereich (Gesicht, Person) in Pixeln des Bildes */
export interface Kasten {
  x: number;
  y: number;
  w: number;
  h: number;
  score?: number;
}

/** nur die deutlichen: kleine Kästen im Hintergrund (unter einem Viertel des größten) fallen weg */
const deutlich = (k: Kasten[]) => {
  const max = Math.max(...k.map((x) => x.w * x.h));
  return k.filter((x) => x.w * x.h >= max * 0.25);
};

/**
 * Fokus-Vorschlag. Reihenfolge:
 * 1. Gesichter (Erkennung im Browser, src/scripts/intern/bild-erkennung.ts): Mitte der Gesichter, nach Größe gewichtet.
 * 2. Personen (Bühnen- und Gruppenfotos): waagerecht die Mitte der Personen, senkrecht Kopfhöhe (oberes Achtel).
 * 3. Bildinhalt aus den Bildpunkten `px` (RGBA, z. B. auf ~128 px verkleinert), wie bei inhaltsbezogenem
 *    Zuschneiden üblich (vgl. smartcrop.js): Hautton, Kanten und Farbsättigung ergeben eine Wichtigkeit je Punkt;
 *    das Fenster mit der größten Summe (leicht zur Mitte gewichtet) gibt den Fokus.
 * Kästen in Pixeln desselben Bildes (w × h).
 */
export function fokusVorschlag(
  px: ArrayLike<number>,
  w: number,
  h: number,
  erkannt: { gesichter?: Kasten[]; personen?: Kasten[] } = {},
): { fokus: Fokus; quelle: Quelle } {
  const prozent = (x: number, y: number): Fokus => ({ x: Math.round(klemmen((x / w) * 100)), y: Math.round(klemmen((y / h) * 100)) });
  const gesichter = deutlich(erkannt.gesichter ?? []);
  if (gesichter.length) {
    let sx = 0, sy = 0, sa = 0;
    for (const g of gesichter) {
      const a = g.w * g.h;
      sx += (g.x + g.w / 2) * a;
      sy += (g.y + g.h / 2) * a;
      sa += a;
    }
    return { fokus: prozent(sx / sa, sy / sa), quelle: 'gesicht' };
  }
  const personen = deutlich(erkannt.personen ?? []);
  if (personen.length) {
    const x0 = Math.min(...personen.map((p) => p.x));
    const x1 = Math.max(...personen.map((p) => p.x + p.w));
    const y0 = Math.min(...personen.map((p) => p.y));
    const hoehe = personen.reduce((s, p) => s + p.h, 0) / personen.length;
    return { fokus: prozent((x0 + x1) / 2, y0 + hoehe * 0.13), quelle: 'person' };
  }
  if (w < 3 || h < 3) return { fokus: { ...FOKUS_MITTE }, quelle: 'mitte' };

  const n = w * h;
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) lum[i] = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
  const wert = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
      const l = lum[i];
      // Kante: Laplace der Helligkeit
      const nb = (dx: number, dy: number) => lum[klemmen(y + dy, 0, h - 1) * w + klemmen(x + dx, 0, w - 1)];
      const kante = Math.min(1, Math.abs(4 * l - nb(-1, 0) - nb(1, 0) - nb(0, -1) - nb(0, 1)) * 4);
      // Hautton: Richtung des Farbvektors nahe an (0.78, 0.57, 0.44), nicht zu dunkel
      const mag = Math.hypot(r, g, b) || 1;
      const d = Math.hypot(r / mag - 0.78, g / mag - 0.57, b / mag - 0.44);
      const haut = l > 0.2 && l < 0.97 ? klemmen((1 - d - 0.8) / 0.2, 0, 1) : 0;
      // Sättigung, nur in mittleren Helligkeiten
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const satt = max > 0 && l > 0.08 && l < 0.92 ? (max - min) / max : 0;
      wert[i] = 1.8 * haut + 0.7 * kante + 0.3 * satt * satt;
    }
  }
  // Summen-Tabelle für schnelle Fenstersummen
  const S = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let zeile = 0;
    for (let x = 0; x < w; x++) {
      zeile += wert[y * w + x];
      S[(y + 1) * (w + 1) + x + 1] = S[y * (w + 1) + x + 1] + zeile;
    }
  }
  const summe = (x: number, y: number, fw: number, fh: number) =>
    S[(y + fh) * (w + 1) + x + fw] - S[y * (w + 1) + x + fw] - S[(y + fh) * (w + 1) + x] + S[y * (w + 1) + x];
  const gesamt = summe(0, 0, w, h);
  if (gesamt / n < 0.02) return { fokus: { ...FOKUS_MITTE }, quelle: 'mitte' };

  const fw = Math.max(2, Math.round(Math.min(w, h) * 0.38));
  const fh = fw;
  let best = -1, bx = 0, by = 0;
  for (let y = 0; y + fh <= h; y++) {
    for (let x = 0; x + fw <= w; x++) {
      const cx = (x + fw / 2) / w - 0.5, cy = (y + fh / 2) / h - 0.5;
      const s = summe(x, y, fw, fh) * (1 - 0.35 * Math.hypot(cx, cy));
      if (s > best) {
        best = s;
        bx = x;
        by = y;
      }
    }
  }
  // Schwerpunkt im besten Fenster (genauer als die Fenstermitte)
  let sx = 0, sy = 0, sw = 0;
  for (let y = by; y < by + fh; y++) {
    for (let x = bx; x < bx + fw; x++) {
      const v = wert[y * w + x];
      sx += (x + 0.5) * v;
      sy += (y + 0.5) * v;
      sw += v;
    }
  }
  const fx = sw ? sx / sw : bx + fw / 2;
  const fy = sw ? sy / sw : by + fh / 2;
  return { fokus: { x: Math.round(klemmen((fx / w) * 100)), y: Math.round(klemmen((fy / h) * 100)) }, quelle: 'inhalt' };
}
