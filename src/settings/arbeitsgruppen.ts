/**
 * Arbeitsgruppen (AGs) – tragen die Arbeit des Vereins. text_en = englische Beschreibung.
 * Die Liste steht in arbeitsgruppen.json (bearbeitbar unter Intern → Redaktion → Verein).
 */
import data from './arbeitsgruppen.json';

export const arbeitsgruppen: { name: string; text: string; text_en?: string }[] = data;
