/**
 * Vorlagen für neue News: legen Rubrik, „Auf einen Blick“ und den Aufbau aus Blöcken an.
 * Die grauen Hinweise in den Feldern sagen, was hineingehört; gespeichert wird nur, was jemand schreibt.
 */
import type { EBlock } from './abschnitte';

export interface Vorlage {
  id: string;
  name: string;
  text: string;
  kategorie: string;
  fakten: string[];
  bloecke: () => EBlock[];
}

const text = (platzhalter: string): EBlock => ({ typ: 'text', de: '', en: '', platzhalter });
const titel = (platzhalter: string): EBlock => ({ typ: 'zwischentitel', de: '', en: '', platzhalter });
const bild = (format: 'quer' | 'original', spalten: 3 | 4 = 4): EBlock => ({
  typ: 'bilder', darstellung: 'raster', breite: 'weit', format, spalten, titel: '', titel_en: '', text: '', text_en: '', foto: '', bilder: [],
});
const bilder = () => bild('quer');

export const vorlagen: Vorlage[] = [
  {
    id: 'rueckblick',
    name: 'Rückblick',
    text: 'Bericht mit Fotos, z. B. nach einem Festival oder Projekt',
    kategorie: 'Rückblick',
    fakten: [],
    bloecke: () => [
      text('Einleitung: Was ist passiert? Wann, wo und mit wem?'),
      bilder(),
      titel('Zwischentitel, z. B. „Die Residenzen“'),
      text('Weiterer Text. Tipp: Eine Liste, deren Punkte mit einem fetten Namen beginnen, erscheint als Namenskarten.'),
      bilder(),
      { typ: 'hinweis', de: '', en: '', platzhalter: 'Förderhinweis – oder diesen Block löschen. Fertige Förderhinweise gibt es unten unter „Baustein“.' },
    ],
  },
  {
    id: 'ausschreibung',
    name: 'Ausschreibung',
    text: 'Open Call mit Frist und Countdown',
    kategorie: 'Ausschreibung',
    fakten: ['Frist', 'Für wen', 'Bewerbung an'],
    bloecke: () => [
      text('Worum geht es? Wer kann sich bewerben, was bieten wir?'),
      titel('So bewirbst du dich'),
      text('Die Schritte als Aufzählung (Knopf •).'),
    ],
  },
  {
    id: 'veranstaltung',
    name: 'Veranstaltung',
    text: 'Hinweis auf Aufführung, Workshop oder Gespräch',
    kategorie: 'Netzwerk',
    fakten: ['Wann', 'Wo', 'Eintritt'],
    bloecke: () => [
      text('Was erwartet das Publikum? Wer ist dabei?'),
      bild('original', 3),
    ],
  },
];
