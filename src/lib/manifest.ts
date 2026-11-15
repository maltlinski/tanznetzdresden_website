/**
 * Web-Manifest: Name, Farben und Symbole, damit sich die Website sauber auf dem Startbildschirm ablegen lässt.
 * Je Sprache eine Datei (/manifest.webmanifest, /en/manifest.webmanifest), eingebunden in src/layouts/Base.astro.
 */
import { getVerein } from './settings';
import { token } from './tokens';
import type { Lang } from './i18n';

export function manifest(lang: Lang): Response {
  const verein = getVerein(lang);
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const purple = token('--purple', '#2E1A4D');
  const icon = (name: string, sizes: string, purpose: 'any' | 'maskable') => ({ src: `${base}icon-${name}.png`, sizes, type: 'image/png', purpose });
  const daten = {
    name: verein.name,
    short_name: 'TNDD',
    description: verein.description,
    lang,
    start_url: lang === 'en' ? `${base}en/` : base,
    scope: base,
    display: 'standalone',
    background_color: purple,
    theme_color: purple,
    icons: [icon('192', '192x192', 'any'), icon('512', '512x512', 'any'), icon('512-maskable', '512x512', 'maskable')],
  };
  return new Response(JSON.stringify(daten), { headers: { 'Content-Type': 'application/manifest+json' } });
}
