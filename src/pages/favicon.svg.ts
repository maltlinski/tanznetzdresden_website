/** Favicon in den Farben des Designsystems (ändert sich mit design/system mit). */
import type { APIRoute } from 'astro';
import { token } from '../lib/tokens';

export const GET: APIRoute = () => {
  const purple = token('--purple', '#2E1A4D');
  const magenta = token('--magenta', '#DA1A6A');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${purple}"/><g fill="#fff"><path d="M12 14h22v6h-8v18h-6V20h-8z"/><path d="M30 24h6l8 12V24h6v26h-6l-8-12v12h-6z"/></g><rect x="44" y="12" width="8" height="8" fill="${magenta}"/></svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
};
