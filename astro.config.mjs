// @ts-check
import { defineConfig, envField } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// SITE_URL / BASE_PATH are set by the deploy workflow (GitHub Pages serves the
// site under /<repo>/). For a custom domain, set SITE_URL=https://tanznetzdresden.de
// and leave BASE_PATH empty.
const site = process.env.SITE_URL || 'https://tanznetzdresden.de';
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  integrations: [sitemap({ filter: (page) => !/\/(intern|admin)\//.test(page) && !page.endsWith('/404/') })],
  prefetch: true,
  build: { inlineStylesheets: 'auto' },
  env: {
    schema: {
      // Interner Bereich (Supabase). Beide Werte sind öffentlich – die Daten
      // schützt Row Level Security in der Datenbank (supabase/migrations).
      PUBLIC_SUPABASE_URL: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_SUPABASE_ANON_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },
});
