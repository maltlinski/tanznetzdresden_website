/**
 * Fotos im Hero der Startseite. Bei jedem Besuch erscheint eines davon (zufällig),
 * „Netz neu knüpfen“ zeigt das nächste.
 *
 * Die Fotos liegen in src/assets/photos/. Sie brauchen schwarzen Bühnenhintergrund:
 * Dunkles wird ausgeblendet, die Körper scheinen durch das Lila (Screen-Mischung).
 *
 * Alle Angaben in Pixeln. Die Bühne ist 1280 × 800 groß, 800 ist die Oberkante der
 * Zahlenleiste (der „Boden“). Die Bühne wird rechtsbündig auf die Hero-Höhe skaliert.
 *   ausschnitt  [x, y, Breite, Höhe] – welcher Teil des Fotos (Originalpixel)
 *   ziel        [x, y, Breite, Höhe] – wohin dieser Ausschnitt auf der Bühne kommt
 *   koerper     [links, oben, rechts, unten] – wo der Körper auf der Bühne steht;
 *               links rückt nie über das Ende der Überschrift
 *   boden       y auf der Bühne, unterhalb dessen Spiegelungen am Boden stärker
 *               ausgeblendet werden (optional)
 *
 * Neues Foto: Datei ablegen, Eintrag kopieren, Werte anpassen und mit `npm run dev`
 * ansehen. Fehlt eine Datei, bricht der Build mit einer Meldung ab.
 */
export interface HeroFoto {
  datei: string;
  ausschnitt: [number, number, number, number];
  ziel: [number, number, number, number];
  koerper: [number, number, number, number];
  boden?: number;
}

export const heroFotos: HeroFoto[] = [
  { datei: 'duo-rot.jpg', ausschnitt: [0, 0, 1333, 2000], ziel: [760, -20, 560, 840], koerper: [780, 40, 1270, 800] },
  { datei: 'solo-blau.jpg', ausschnitt: [725, 300, 689, 1033], ziel: [760, -20, 560, 840], koerper: [860, 280, 1220, 800], boden: 610 },
  { datei: 'sprung.jpg', ausschnitt: [215, 0, 889, 1333], ziel: [760, -20, 560, 840], koerper: [870, 40, 1210, 800], boden: 700 },
  { datei: 'kopfstand.jpg', ausschnitt: [240, 0, 1110, 1333], ziel: [620, -20, 700, 840], koerper: [640, 0, 1280, 800] },
];

/** Netz läuft nach rechts zu den Fotos hin aus (0 = gar nicht, 1 = ganz). */
export const netzAuslauf = 1;

/** Knotendichte bei 1440 × 820 (wird mit der Fläche skaliert). */
export const knoten = 110;
