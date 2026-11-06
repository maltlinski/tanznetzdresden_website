/**
 * Vorlage für die Vorschau unter „Mein Profil“: ein Profil, in dem jeder Baustein der Profilseite vorkommt
 * (Pitch, Galerie, Angaben, Links, Arbeiten, Kontakt). Die Vorschau (scripts/profil-vorschau.ts) ersetzt alles
 * durch den Stand des Formulars; ohne Skript sieht man nur diese Platzhalter.
 */
import type { ImageMetadata } from 'astro';
import type { Lang } from './i18n';
import type { PublicProfile } from './profiles';

const fotos = Object.entries(import.meta.glob<{ default: ImageMetadata }>('../assets/photos/*.{jpg,jpeg,png,webp}', { eager: true }))
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, m]) => m.default);

export function profilVorlage(lang: Lang): PublicProfile {
  const de = lang === 'de';
  return {
    id: 'vorlage',
    name: de ? 'Dein Name' : 'Your Name',
    pronouns: de ? 'Pronomen' : 'Pronouns',
    roles: ['mitglied', 'trainer'],
    profession: de ? 'Tätigkeit' : 'Profession',
    base: 'Dresden',
    pitch: de ? 'Dein Satz steht hier: so, wie du ihn einträgst.' : 'Your sentence goes here: just as you write it.',
    bio: de ? 'Hier steht deine Kurzbio.' : 'Your short bio goes here.',
    tags: [de ? 'Schwerpunkt' : 'Focus'],
    photo: fotos[0],
    photoCredit: de ? 'Name' : 'Name',
    website: 'https://example.org',
    instagram: 'name',
    vimeo: 'https://vimeo.com/',
    email: 'name@example.org',
    openFor: ['kooperationen'],
    works: [{ year: '2026', title: de ? 'Titel' : 'Title', place: de ? 'Ort' : 'Venue' }],
    education: '–', techniques: '–', languages: '–', regions: '–', height: '–', available: '–',
    gallery: fotos.slice(1, 3).map((photo) => ({ photo, caption: de ? 'Bildunterschrift' : 'Caption' })),
    galleryLayout: 'filmstreifen',
    featured: false,
    selfManaged: true,
  };
}
