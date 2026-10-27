/**
 * Termine aus Intern → Kalender (Tabelle kalender_termine, supabase/migrations/20261026000000_kalender.sql).
 * Gemeinsam für den Build (src/lib/content.ts macht daraus Termine wie aus den Dateien) und den internen Bereich.
 * Läuft auch im Browser: keine Astro-Importe.
 */

export const KATEGORIEN = ['Bühne', 'Training', 'Diskurs'] as const;
export type Kategorie = (typeof KATEGORIEN)[number];

export interface KalenderTermin {
  id: string;
  /** Adresse der Terminseite, z. B. 2026-11-20-studio-round-10 */
  slug: string;
  titel: string;
  titel_en: string;
  /** JJJJ-MM-TT */
  datum: string;
  /** „19:30“ (aus der Datenbank auch „19:30:00“) */
  von: string;
  bis: string | null;
  zeit_text: string;
  ort: string;
  kategorie: Kategorie;
  kurz: string;
  kurz_en: string;
  /** längerer Text (Markdown wie in den Termin-Dateien) */
  text: string;
  link: string;
  /** Format (Dateiname aus src/content/formate/), z. B. keep-up */
  format: string;
  /** Kürzel der Mitwirkenden (Profil) */
  personen: string[];
  /** passender News-Beitrag */
  news: string;
  /** Eintritt, z. B. „Eintritt frei“ (fehlt, solange die Migration 20261028 nicht eingespielt ist) */
  eintritt?: string;
  eintritt_en?: string;
  /** false = Entwurf, nur intern zu sehen */
  sichtbar: boolean;
}

/** Zeile der öffentlichen Ansicht public_kalender */
export type OeffentlicherKalenderTermin = Omit<KalenderTermin, 'id' | 'sichtbar'>;

export const KURZ_MAX = 240;
export const uhr = (t: string | null | undefined) => (t ? t.slice(0, 5) : '');

/** Adresse für einen neuen Termin: Datum + Titel in Kleinbuchstaben */
export function slugAus(datum: string, titel: string): string {
  const s = titel
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'und')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
    .replace(/-$/, '');
  return `${datum}-${s || 'termin'}`;
}

/** Felder wie in einer Termin-Datei (src/content.config.ts, Sammlung „termine“) */
export function alsTerminDaten(r: OeffentlicherKalenderTermin) {
  return {
    title: r.titel,
    title_en: r.titel_en || undefined,
    start: `${r.datum} ${uhr(r.von)}`,
    end: r.bis ? `${r.datum} ${uhr(r.bis)}` : undefined,
    venue: r.ort,
    timeLabel: r.zeit_text || undefined,
    category: r.kategorie,
    teaser: r.kurz,
    teaser_en: r.kurz_en || undefined,
    eintritt: r.eintritt || undefined,
    eintritt_en: r.eintritt_en || undefined,
    people: r.personen ?? [],
    link: r.link || undefined,
    news: r.news || undefined,
    format: r.format ? { id: r.format, collection: 'formate' as const } : undefined,
    draft: false,
  };
}
