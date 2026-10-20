/**
 * Felder des öffentlichen Profils, die Website, „Mein Profil“ und Redaktion gemeinsam nutzen.
 * Ohne Imports, weil auch src/content.config.ts diese Datei liest.
 * Neue Werte hier auch in der Migration (Prüfung von open_for, gallery_layout) ergänzen.
 */

/** „Offen für …“ im Kontaktbereich */
export const OFFEN_FUER = {
  kooperationen: { de: 'Kooperationen', en: 'Collaborations' },
  engagements: { de: 'Engagements', en: 'Engagements' },
  workshops: { de: 'Workshops geben', en: 'Teaching workshops' },
  unterricht: { de: 'Unterricht', en: 'Classes' },
  auftraege: { de: 'Choreografische Aufträge', en: 'Choreographic commissions' },
} as const;
export type OffenFuer = keyof typeof OFFEN_FUER;
export const OFFEN_WERTE = Object.keys(OFFEN_FUER) as [OffenFuer, ...OffenFuer[]];

/** Darstellung der Galerie */
export const GALERIE_LAYOUTS = {
  filmstreifen: { de: 'Filmstreifen', en: 'Film strip', hilfe: 'Fotos ziehen beim Scrollen seitlich vorbei.' },
  mosaik: { de: 'Mosaik', en: 'Mosaic', hilfe: 'Große und kleine Fotos im Wechsel.' },
  raster: { de: 'Raster', en: 'Grid', hilfe: 'Alle Fotos gleich groß.' },
} as const;
export type GalerieLayout = keyof typeof GALERIE_LAYOUTS;
export const GALERIE_WERTE = Object.keys(GALERIE_LAYOUTS) as [GalerieLayout, ...GalerieLayout[]];

/** Angaben im Abschnitt „Über“ (Schlüssel wie in personen.yaml und Supabase) */
export const ANGABEN = [
  { key: 'education', de: 'Ausbildung', en: 'Training', max: 200, platzhalter: 'z. B. Palucca Hochschule für Tanz Dresden, BA Tanz' },
  { key: 'techniques', de: 'Techniken', en: 'Techniques', max: 200, platzhalter: 'z. B. Release, Contact Improvisation, Floorwork' },
  { key: 'languages', de: 'Sprachen', en: 'Languages', max: 120, platzhalter: 'z. B. Deutsch, Englisch' },
  { key: 'regions', de: 'Arbeitsorte', en: 'Works in', max: 120, platzhalter: 'z. B. Dresden, Leipzig, Berlin · reisebereit' },
  { key: 'height', de: 'Körpergröße', en: 'Height', max: 20, platzhalter: 'z. B. 168 cm' },
  { key: 'available', de: 'Verfügbar', en: 'Available', max: 80, platzhalter: 'z. B. ab Januar 2027' },
] as const;
export type AngabeKey = (typeof ANGABEN)[number]['key'];

export const GALERIE_MAX = 12;
export const ARBEITEN_MAX = 20;
