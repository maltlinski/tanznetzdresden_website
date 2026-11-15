/**
 * Zeichen der Website als SVG in den Farben des Designsystems (ändert sich mit design/system mit).
 * Daraus entstehen das Favicon (src/pages/favicon.svg.ts) und die Symbole für den Startbildschirm
 * (src/pages/icon-[name].png.ts, eingetragen im Web-Manifest src/lib/manifest.ts).
 */
import { token } from './tokens';

/** `rand`: Anteil der Kante, der frei bleibt (maskierbare Symbole schneidet das Gerät rund oder abgerundet zu) */
export function iconSvg(rand = 0): string {
  const purple = token('--purple', '#2E1A4D');
  const magenta = token('--magenta', '#DA1A6A');
  const k = 1 - 2 * rand;
  const zeichen = `<g fill="#fff"><path d="M12 14h22v6h-8v18h-6V20h-8z"/><path d="M30 24h6l8 12V24h6v26h-6l-8-12v12h-6z"/></g><rect x="44" y="12" width="8" height="8" fill="${magenta}"/>`;
  const inhalt = rand ? `<g transform="translate(${64 * rand} ${64 * rand}) scale(${k})">${zeichen}</g>` : zeichen;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${purple}"/>${inhalt}</svg>`;
}

/** Symbole als PNG: Name in der Adresse (icon-<name>.png) → Kantenlänge und Rand */
export const ICONS = {
  '180': { groesse: 180, rand: 0 },
  '192': { groesse: 192, rand: 0 },
  '512': { groesse: 512, rand: 0 },
  '512-maskable': { groesse: 512, rand: 0.1 },
} as const;
