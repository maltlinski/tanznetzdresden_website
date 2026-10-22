/**
 * Mitgliedschaft und Mitgliedsausweis (Intern → Mein Status, Migration 20261022000000_mitgliedschaft.sql).
 * Dieselbe Status-Regel steht in der Datenbankfunktion ausweis_pruefen().
 */

/** Zeile der Tabelle mitgliedschaften */
export interface Mitgliedschaft {
  person: string;
  nummer: string | null;
  art: string;
  seit: string | null;
  /** letztes Jahr, für das der Beitrag bezahlt ist */
  bezahlt_bis: number | null;
  bezahlt_am: string | null;
  /** Ende der Mitgliedschaft (Austritt) */
  ende: string | null;
  pruefcode: string;
  updated_at?: string;
}

export type Status = 'aktiv' | 'offen' | 'abgelaufen';

/** Bis wann der Jahresbeitrag bezahlt sein soll (Monat-Tag); danach heißt es „fällig seit“ */
export const BEITRAG_FAELLIG = '03-31';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function status(m: Pick<Mitgliedschaft, 'bezahlt_bis' | 'ende'>, heute = new Date()): Status {
  if (m.ende && m.ende < iso(heute)) return 'abgelaufen';
  if (m.bezahlt_bis != null && m.bezahlt_bis >= heute.getFullYear()) return 'aktiv';
  return 'offen';
}

/** Gültig bis: Ende der Mitgliedschaft oder 31.12. des bezahlten Jahres */
export function gueltigBis(m: Pick<Mitgliedschaft, 'bezahlt_bis' | 'ende'>): string | null {
  return m.ende ?? (m.bezahlt_bis != null ? `${m.bezahlt_bis}-12-31` : null);
}

/** Jahr, das der Ausweis zeigt: laufendes Jahr, nach dem Ende das letzte Jahr der Mitgliedschaft */
export function ausweisJahr(m: Pick<Mitgliedschaft, 'bezahlt_bis' | 'ende'>, heute = new Date()): number {
  if (status(m, heute) === 'abgelaufen') return Number((gueltigBis(m) ?? iso(heute)).slice(0, 4));
  return heute.getFullYear();
}

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('de-DE', { ...o, timeZone: 'UTC' });
const datum = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00Z`);
/** 31.12.2026 */
export const kurz = (s: string) => fmt({ day: '2-digit', month: '2-digit', year: 'numeric' }).format(datum(s));
/** 31. Dezember 2026 */
export const lang = (s: string) => fmt({ day: 'numeric', month: 'long', year: 'numeric' }).format(datum(s));
/** März 2019 */
export const monat = (s: string) => fmt({ month: 'long', year: 'numeric' }).format(datum(s));

/** Adresse der öffentlichen Prüfseite für den QR-Code */
export function pruefUrl(code: string, origin = location.origin): string {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  return `${origin}${base}mitglied/pruefen/?c=${encodeURIComponent(code)}`;
}
