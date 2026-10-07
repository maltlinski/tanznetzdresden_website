/**
 * Einwilligungs-Kategorien (TDDDG § 25 / DSGVO Art. 6 Abs. 1 lit. a).
 *
 * Die Website setzt von sich aus KEINE Tracking-Cookies. Einwilligung braucht es nur
 * für externe Inhalte (Karten, Videos, Social-Media-Beiträge) und für Statistik.
 * „Statistik“ erscheint nur, wenn in verein.json → analytics ein Dienst eingetragen ist.
 * Neue Dienste hier eintragen und in der Datenschutzerklärung beschreiben.
 *
 * Wird eine Kategorie hinzugefügt oder geändert, `CONSENT_VERSION` erhöhen:
 * dann werden alle Besucher:innen erneut gefragt.
 */
import { verein } from '../lib/settings';

export const CONSENT_VERSION = 1;

export interface ConsentCategory {
  id: string;
  label: string;
  label_en: string;
  description: string;
  description_en: string;
  required?: boolean;
  /** Kategorie erscheint nur, wenn aktiv */
  enabled: boolean;
  services: string[];
}

const analytics = verein.analytics.provider;

export const consentCategories: ConsentCategory[] = [
  {
    id: 'notwendig',
    label: 'Notwendig',
    label_en: 'Necessary',
    description:
      'Speichert deine Auswahl in diesem Dialog und – nur nach dem Login im internen Bereich – deine Sitzung. Ohne diese Daten funktioniert die Website nicht.',
    description_en:
      'Stores your choice in this dialog and – only after logging in to the members area – your session. The website cannot work without this.',
    required: true,
    enabled: true,
    services: ['Einwilligungs-Speicher (lokal)', 'Login-Sitzung (Supabase, nur intern)'],
  },
  {
    id: 'medien',
    label: 'Externe Medien',
    label_en: 'External media',
    description:
      'Karten, Videos und Social-Media-Beiträge von anderen Anbietern. Beim Laden wird deine IP-Adresse an den jeweiligen Anbieter übertragen.',
    description_en:
      'Maps, videos and social media posts from other providers. Loading them transmits your IP address to the respective provider.',
    enabled: true,
    services: ['OpenStreetMap', 'YouTube (youtube-nocookie.com)', 'Vimeo', 'Instagram'],
  },
  {
    id: 'statistik',
    label: 'Statistik',
    label_en: 'Statistics',
    description: 'Anonyme Reichweitenmessung ohne Cookies. Die Zahlen brauchen wir für Förderberichte.',
    description_en: 'Anonymous, cookie-free audience measurement. We need the figures for our funding reports.',
    enabled: analytics !== '',
    services: analytics === 'matomo' ? ['Matomo (cookielos)'] : analytics === 'plausible' ? ['Plausible Analytics'] : [],
  },
];
