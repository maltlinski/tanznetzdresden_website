/**
 * Links relativ zur Basis-URL (GitHub Pages liegt z. B. unter /tanznetzdresden_website/).
 * Für Seiten besser `url(lang, 'termine')` aus ./i18n verwenden – das kennt beide Sprachen.
 * `href()` ist für Dateien und feste Pfade (z. B. termine.ics, Bilder).
 */
const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');

export function href(path = ''): string {
  if (/^(https?:|mailto:|tel:)/.test(path)) return path;
  return base + path.replace(/^\//, '');
}
