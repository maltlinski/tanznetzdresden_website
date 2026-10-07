/**
 * Einwilligungs-Kategorien (TDDDG § 25 / DSGVO Art. 6 Abs. 1 lit. a).
 *
 * Die Website setzt von sich aus KEINE Tracking-Cookies. Einwilligung braucht es nur
 * für externe Inhalte (Karten, Videos, Social-Media-Beiträge) und – falls später
 * aktiviert – für Statistik. Neue Dienste hier eintragen und in der
 * Datenschutzerklärung (src/content/seiten/datenschutz.md) beschreiben.
 *
 * Wird eine Kategorie hinzugefügt oder geändert, `CONSENT_VERSION` erhöhen:
 * dann werden alle Besucher:innen erneut gefragt.
 */
export const CONSENT_VERSION = 1;

export interface ConsentCategory {
  id: string;
  label: string;
  description: string;
  required?: boolean;
  /** Kategorie erscheint nur, wenn aktiv */
  enabled: boolean;
  services: string[];
}

export const consentCategories: ConsentCategory[] = [
  {
    id: 'notwendig',
    label: 'Notwendig',
    description:
      'Speichert deine Auswahl in diesem Dialog und – nur nach dem Login im internen Bereich – deine Sitzung. Ohne diese Daten funktioniert die Website nicht.',
    required: true,
    enabled: true,
    services: ['Einwilligungs-Speicher (lokal)', 'Login-Sitzung (Supabase, nur intern)'],
  },
  {
    id: 'medien',
    label: 'Externe Medien',
    description:
      'Karten, Videos und Social-Media-Beiträge von anderen Anbietern. Beim Laden wird deine IP-Adresse an den jeweiligen Anbieter übertragen.',
    enabled: true,
    services: ['OpenStreetMap', 'YouTube (youtube-nocookie.com)', 'Vimeo', 'Instagram'],
  },
  {
    id: 'statistik',
    label: 'Statistik',
    description: 'Anonyme Reichweitenmessung, damit wir sehen, welche Inhalte gelesen werden.',
    enabled: false,
    services: [],
  },
];
