/**
 * Arbeitsgruppen (AGs) – tragen die Arbeit des Vereins. text_en = englische Beschreibung.
 * Die Liste steht in arbeitsgruppen.json (bearbeitbar unter Intern → Redaktion → Verein).
 */
import data from './arbeitsgruppen.json';
import { nurSichtbare } from '../lib/sichtbar';

/** Alle AGs (auch ausgeblendete): Auswahl im eigenen Profil, Redaktion */
export const alleArbeitsgruppen: { name: string; text: string; text_en?: string; sichtbar?: boolean }[] = data;
/** AGs auf der Website (ausgeblendete fallen heraus) */
export const arbeitsgruppen = nurSichtbare(alleArbeitsgruppen);
