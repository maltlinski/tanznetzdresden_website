/**
 * Links relativ zur Basis-URL (GitHub Pages liegt z. B. unter /tanznetzdresden_website/).
 * Immer `href(...)` statt fester Pfade verwenden, dann funktioniert jede Domain.
 */
const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');

export function href(path = ''): string {
  if (/^(https?:|mailto:|tel:)/.test(path)) return path;
  return base + path.replace(/^\//, '');
}

export const nav = [
  { path: '#termine', label: 'Kalender' },
  { path: '#formate', label: 'Formate' },
  { path: '#training', label: 'Training' },
  { path: '#netzwerk', label: 'Netzwerk' },
  { path: 'verein/', label: 'Über uns' },
] as const;
