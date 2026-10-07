/**
 * Design-Tokens beim Build lesen (für Stellen außerhalb von CSS:
 * Favicon, theme-color). Quelle: design/system/tokens/colors.css.
 */
import colorsCss from '../../design/system/tokens/colors.css?raw';

const values = Object.fromEntries([...colorsCss.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));

export function token(name: string, fallback = ''): string {
  let v = values[name] ?? fallback;
  // Aliase wie var(--purple) auflösen
  for (let i = 0; i < 5 && v.startsWith('var('); i++) v = values[v.slice(4, -1).trim()] ?? fallback;
  return v;
}
