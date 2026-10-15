/**
 * Vorlagen für neue News: legen Art, Kategorie, „Auf einen Blick“ und den Aufbau aus Abschnitten an.
 * Die grauen Hinweise in den Feldern sagen, was hineingehört; gespeichert wird nur, was jemand schreibt.
 */
import type { EBlock } from './abschnitte';

export interface Vorlage {
  id: string;
  name: string;
  text: string;
  art: 'text' | 'photo' | 'call' | 'quote';
  kategorie: string;
  fakten: string[];
  bloecke: () => EBlock[];
}

const text = (platzhalter: string): EBlock => ({ typ: 'text', de: '', en: '', platzhalter });
const bilder = (): EBlock => ({ typ: 'bilder', darstellung: 'raster', format: 'quer', spalten: 4, text: '', text_en: '', foto: '', bilder: [] });

export const vorlagen: Vorlage[] = [
  {
    id: 'rueckblick',
    name: 'Rückblick',
    text: 'Bericht mit Fotos, z. B. nach einem Festival oder Projekt',
    art: 'photo',
    kategorie: 'Rückblick',
    fakten: [],
    bloecke: () => [
      text('Einleitung: Was ist passiert? Wann, wo und mit wem?'),
      bilder(),
      text('Zwischenüberschrift (Knopf H2) und weiterer Text. Tipp: Eine Liste, deren Punkte mit einem fetten Namen beginnen, erscheint als Namenskarten.'),
      bilder(),
      { typ: 'hinweis', de: '', en: '', platzhalter: 'Förderhinweis – oder diesen Abschnitt löschen. Fertige Förderhinweise gibt es unter „+ Abschnitt einfügen → Baustein“.' },
    ],
  },
  {
    id: 'ausschreibung',
    name: 'Ausschreibung',
    text: 'Open Call mit Frist und Countdown',
    art: 'call',
    kategorie: 'Ausschreibung',
    fakten: ['Frist', 'Für wen', 'Bewerbung an'],
    bloecke: () => [
      text('Worum geht es? Wer kann sich bewerben, was bieten wir?'),
      text('Zwischenüberschrift „So bewirbst du dich“ (Knopf H2) und die Schritte als Aufzählung.'),
    ],
  },
  {
    id: 'veranstaltung',
    name: 'Veranstaltung',
    text: 'Hinweis auf Aufführung, Workshop oder Gespräch',
    art: 'photo',
    kategorie: 'Netzwerk',
    fakten: ['Wann', 'Wo', 'Eintritt'],
    bloecke: () => [
      text('Was erwartet das Publikum? Wer ist dabei?'),
      bilder(),
    ],
  },
];
