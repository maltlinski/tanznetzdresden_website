// @ts-check
import { defineConfig, envField } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';

// SITE_URL / BASE_PATH are set by the deploy workflow (GitHub Pages serves the
// site under /<repo>/). For a custom domain, set SITE_URL=https://tanznetzdresden.de
// and leave BASE_PATH empty.
const site = process.env.SITE_URL || 'https://tanznetzdresden.de';
const base = process.env.BASE_PATH || '/';
// Weiterleitungen alter WordPress-Adressen (src/pages/[...alt].astro) gehören nicht in die Sitemap
const weiterleitungen = new Set(Object.keys(JSON.parse(readFileSync(new URL('./src/content/news/weiterleitungen.json', import.meta.url), 'utf8'))));
/** @param {string} page */
const istWeiterleitung = (page) => weiterleitungen.has(decodeURIComponent(new URL(page).pathname).slice(base.replace(/\/?$/, '/').length).replace(/\/$/, ''));

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  integrations: [sitemap({ filter: (page) => !/\/(intern|admin|mitglied\/pruefen)\//.test(page) && !page.endsWith('/404/') && !istWeiterleitung(page) })],
  prefetch: true,
  // Deutsch ohne Präfix (/termine/), Englisch unter /en/ (/en/events/)
  i18n: {
    defaultLocale: 'de',
    locales: ['de', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  build: { inlineStylesheets: 'auto' },
  // Porträts aus dem internen Bereich (Supabase Storage) beim Build optimieren
  image: { remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }] },
  env: {
    schema: {
      // Interner Bereich (Supabase). Beide Werte sind öffentlich – die Daten
      // schützt Row Level Security in der Datenbank (supabase/migrations).
      PUBLIC_SUPABASE_URL: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_SUPABASE_ANON_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },
});
