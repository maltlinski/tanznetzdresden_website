/**
 * Hero der Startseite (Entwurf v2): drei Bühnenfotos als Tiefenebenen, davor das Netz,
 * oben „Tanz für …“ mit wechselnden Wörtern, in der Mitte der nächste Termin („Upcoming“).
 *
 * Die Fotos liegen in src/assets/photos/. Sie brauchen schwarzen Bühnenhintergrund:
 * Dunkles wird ausgestanzt, die Körper stehen frei auf dem Lila.
 *
 *   datei       Dateiname in src/assets/photos/
 *   ausschnitt  [x, y, Breite, Höhe] – welcher Teil des Fotos (Originalpixel), Füße unten
 *   boden       Anteil der Ausschnitthöhe (0–1), ab dem Spiegelungen am Boden stärker
 *               ausgeblendet werden (optional)
 *
 * Reihenfolge = Platz auf der Bühne: links (hinten), Mitte (vorn, über dem Netz), rechts (hinten).
 * Auf schmalen Bildschirmen erscheinen nur die ersten beiden (links hinten, rechts vorn).
 * Fehlt eine Datei, bricht der Build mit einer Meldung ab.
 */
export interface HeroFoto {
  datei: string;
  ausschnitt: [number, number, number, number];
  boden?: number;
}

export const heroFotos: HeroFoto[] = [
  { datei: 'solo-blau.jpg', ausschnitt: [725, 300, 689, 1033], boden: 0.75 },
  { datei: 'sprung.jpg', ausschnitt: [215, 0, 889, 1333], boden: 0.857 },
  { datei: 'kopfstand.jpg', ausschnitt: [240, 0, 1110, 1333] },
];

/** „Tanz für …“ – die Wörter wechseln nacheinander. Leere Liste = Zeile ausblenden. */
export const claim = {
  de: { lead: 'Tanz für', woerter: ['Dresden', 'alle', 'Professionals', 'Newcomer:innen', 'die freie Szene', 'den Stadtraum'] },
  en: { lead: 'Dance for', woerter: ['Dresden', 'everyone', 'professionals', 'newcomers', 'the independent scene', 'the city'] },
};

/** Standzeit pro Wort in Sekunden. Nach einer Runde bleibt das erste Wort stehen. */
export const wortPause = 4;

/** Knotendichte bei 1440 × 820 (wird mit der Fläche skaliert). */
export const knoten = 100;

/** Beim Scrollen ziehen die Fotos nach oben weg (vorderes am schnellsten). */
export const scrollWegziehen = true;
