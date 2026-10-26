/**
 * KEEP UP · Einplanungen aus Supabase (Tabelle keepup_termine, supabase/migrations/20261025000000_keepup.sql).
 * Gemeinsam für den Build der Website (src/lib/keep-up.ts) und den internen Bereich (Intern → KEEP UP).
 * Läuft auch im Browser: keine Astro-Importe.
 */

/** Was die Dozent:in schreibt und was auf der Website steht */
export interface Beschreibung {
  titel: string;
  kurz: string;
  text: string;
  schwerpunkte: string[];
  mitbringen: string;
  /** „assets/photos/<datei>“ (Foto der Website) oder Pfad im Bucket „keepup“ */
  bild: string | null;
  bild_alt: string;
}

export interface KeepUpTermin extends Beschreibung {
  id: string;
  art: 'training' | 'workshop';
  /** Kürzel aus src/content/keep-up/dozentinnen.yaml */
  dozent: string;
  /** Montag der Woche, JJJJ-MM-TT */
  woche: string;
  /** 1 = Montag … 7 = Sonntag */
  tage: number[];
  zeit: string;
  ort: string;
  /** nur intern: Notiz des Vorstands an die Dozent:in */
  notiz: string;
  veroeffentlicht: Beschreibung | null;
  veroeffentlicht_am: string | null;
  erinnert_am: string | null;
}

/** Zeile der öffentlichen Ansicht public_keepup */
export type OeffentlicherTermin = Pick<KeepUpTermin, 'id' | 'art' | 'dozent' | 'woche' | 'tage' | 'zeit' | 'ort' | 'veroeffentlicht'>;

export type Status = 'offen' | 'entwurf' | 'online' | 'geaendert';

export const STATUS: Record<Status, { label: string; label_en: string; badge: string }> = {
  offen: { label: 'Ohne Beschreibung', label_en: 'No description', badge: 'outline' },
  entwurf: { label: 'Entwurf', label_en: 'Draft', badge: 'purple' },
  online: { label: 'Online', label_en: 'Online', badge: 'cyan' },
  geaendert: { label: 'Änderungen offen', label_en: 'Unpublished changes', badge: 'magenta' },
};

/** Höchstlänge der Kurzbeschreibung (die Datenbank erlaubt etwas mehr) */
export const KURZ_MAX = 240;
export const TITEL_MAX = 60;

/** Vorschläge für Schwerpunkte (eigene sind möglich) */
export const SCHWERPUNKTE = ['Floorwork', 'Release', 'Improvisation', 'Contact Improvisation', 'Partnering', 'Technik', 'Kraft', 'Komposition', 'Phrasenarbeit', 'Ballett-Basis'];

/** Standardwerte beim Einplanen */
export const STANDARD = {
  training: { tage: [1, 2, 3, 4, 5], zeit: '10:00–11:30' },
  workshop: { tage: [6], zeit: '11:00–15:00' },
} as const;

export const inhalt = (t: Beschreibung): Beschreibung => ({
  titel: t.titel ?? '',
  kurz: t.kurz ?? '',
  text: t.text ?? '',
  schwerpunkte: [...(t.schwerpunkte ?? [])],
  mitbringen: t.mitbringen ?? '',
  bild: t.bild ?? null,
  bild_alt: t.bild_alt ?? '',
});

const gleich = (a: Beschreibung, b: Beschreibung) => JSON.stringify(inhalt(a)) === JSON.stringify(inhalt(b));
const leer = (b: Beschreibung) => !b.titel.trim() && !b.kurz.trim() && !b.text.trim() && !b.mitbringen.trim() && !b.schwerpunkte.length && !b.bild;

export function status(t: KeepUpTermin): Status {
  if (t.veroeffentlicht) return gleich(t, t.veroeffentlicht) ? 'online' : 'geaendert';
  return leer(t) ? 'offen' : 'entwurf';
}

/** Darf veröffentlicht werden: Titel und Kurzbeschreibung da, nicht zu lang */
export const bereit = (b: Beschreibung) => !!b.titel.trim() && !!b.kurz.trim() && b.kurz.length <= KURZ_MAX && b.titel.length <= TITEL_MAX;

/** Absätze aus dem Text (Leerzeile = neuer Absatz) */
export const absaetze = (text: string) => text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const plusTage = (iso: string, n: number) => {
  const d = utc(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
/** Datum eines Tages der Woche (1 = Montag) */
export const tagDatum = (woche: string, tag: number) => plusTage(woche, tag - 1);
/** Montag der Woche eines Datums */
export const montag = (iso: string) => plusTage(iso, -((utc(iso).getUTCDay() + 6) % 7));
export const ersterTag = (t: Pick<KeepUpTermin, 'woche' | 'tage'>) => tagDatum(t.woche, Math.min(...t.tage));
export const letzterTag = (t: Pick<KeepUpTermin, 'woche' | 'tage'>) => tagDatum(t.woche, Math.max(...t.tage));

/** ISO-Kalenderwoche */
export function kalenderwoche(iso: string): number {
  const d = utc(iso);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return Math.ceil(((+d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
}

/** „Uhrzeit“ einheitlich mit Halbgeviertstrich */
export const zeitNorm = (z: string) => z.trim().replace(/\s*[–-]\s*/, '–');

/** Adresse eines Bildes im Bucket „keepup“ */
export const bucketUrl = (supabaseUrl: string, pfad: string) => `${supabaseUrl}/storage/v1/object/public/keepup/${pfad.split('/').map(encodeURIComponent).join('/')}`;
export const istWebsiteFoto = (bild: string) => bild.startsWith('assets/photos/');
