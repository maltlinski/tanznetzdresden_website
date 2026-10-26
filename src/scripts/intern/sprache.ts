/**
 * Sprache der internen Seite im Browser (aus <html lang>, gesetzt von Base.astro).
 * Texte in Skripten:  t('Gespeichert.', 'Saved.')
 * Seiten unter /en/intern/ sind englisch, alle anderen deutsch (src/lib/intern-sprache.ts).
 */
import type { Lang } from '../../lib/i18n';

export const sprache: Lang = document.documentElement.lang === 'en' ? 'en' : 'de';
export const t = <T>(de: T, en: T): T => (sprache === 'en' ? en : de);
/** Gebietsschema für Datumsangaben */
export const locale = t('de-DE', 'en-GB');
