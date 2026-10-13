/**
 * Startseite, Abschnitt „Haltung & Wirkung“: wofür der Verein steht, Auszeichnungen, Foto.
 * Die Texte stehen in haltung.json (bearbeitbar unter Intern → Redaktion → Startseite).
 * Die Partnerliste („Gemeinsam mit“) kommt aus src/settings/verein.json (partners).
 *
 * foto.datei: Datei in src/assets/photos/. Ideal: Menschen im Austausch, z. B. Gespräch nach der Studio Round.
 */
import data from './haltung.json';

export const haltung = { de: data.de, en: data.en };
export const haltungFoto = data.foto;
