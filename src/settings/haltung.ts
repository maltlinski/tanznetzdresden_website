/**
 * Startseite, Abschnitt „Haltung & Wirkung“: wofür der Verein steht, Auszeichnungen, Foto.
 * Die Texte stehen in haltung.json (bearbeitbar unter Intern → Redaktion → Startseite).
 * Die Partnerliste („Gemeinsam mit“) kommt aus src/settings/verein.json (partners).
 *
 * foto.datei: Datei in src/assets/photos/. Ideal: Menschen im Austausch, z. B. Gespräch nach der Studio Round.
 */
import data from './haltung.json';
import { nurSichtbare, sichtbareWorte, type Wort } from '../lib/sichtbar';

/** Ausgeblendete Säulen und Auszeichnungen (Redaktion: „Auf der Website anzeigen“) fallen hier heraus */
type Fassung = Omit<typeof data.de, 'saeulen' | 'auszeichnungen'> & {
  saeulen: { titel: string; text: string; sichtbar?: boolean }[];
  auszeichnungen: Wort[];
};
const fassung = (f: Fassung) => ({ ...f, saeulen: nurSichtbare(f.saeulen), auszeichnungen: sichtbareWorte(f.auszeichnungen) });
export const haltung = { de: fassung(data.de), en: fassung(data.en) };
export const haltungFoto = data.foto;
