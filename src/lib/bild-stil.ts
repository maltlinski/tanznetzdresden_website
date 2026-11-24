/**
 * Fotos frei formatieren („Website bearbeiten“ → Fotos frei formatieren): Ausschnitt, Zoom und „ganz zeigen“ je Foto
 * und Seite, gespeichert in src/settings/bilder.json:
 *
 *   { "formate/": { "duo-silhouette-stage": { "x": 40, "y": 25, "zoom": 1.3, "ganz": false } } }
 *
 * Seite wie im Seitenplan ("" = Startseite, beide Sprachen gleich), Foto = Dateiname ohne Endung. Base.astro schreibt
 * daraus CSS in den Kopf der Seite, der Editor dasselbe live (src/scripts/intern/redaktion/seite-fotos.ts).
 * Die Datei schreibt die Redaktion: ins CSS kommen nur geprüfte Zahlen und Dateinamen aus sicheren Zeichen.
 */
export interface BildStil {
  /** Ausschnitt waagrecht/senkrecht in Prozent (wie object-position), Standard 50 */
  x?: number;
  y?: number;
  /** Vergrößerung 1–4, Standard 1 */
  zoom?: number;
  /** ganzes Foto zeigen (Ränder bleiben frei) statt die Fläche zu füllen */
  ganz?: boolean;
}
export type BildStile = Record<string, Record<string, BildStil>>;

const NAME = /^[a-z0-9][a-z0-9_-]{0,120}$/i;
const zahl = (v: unknown, min: number, max: number, std: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.min(max, Math.max(min, v)) * 100) / 100 : std);

/**
 * Seite zu einer Adresse, wie in bilder.json: ohne Basis-Pfad, englische Seiten unter ihrer deutschen Adresse
 * (zuDeutsch: pfadIn(p, 'de') aus src/lib/i18n.ts; hier ohne Import, damit die Regeln ohne Astro prüfbar sind)
 */
export function seitenPfad(pathname: string, base: string, zuDeutsch: (p: string) => string): string {
  const rest = decodeURIComponent(pathname).slice(base.replace(/\/?$/, '/').length).replace(/index\.html$/, '');
  return /^en(\/|$)/.test(rest) ? zuDeutsch(rest.replace(/^en\/?/, '')) : rest;
}

/** Dateiname ohne Endung aus der Adresse eines Bilds (Astro hängt beim Bauen eine Prüfsumme an: name.abc123.webp) */
export const bildStamm = (src: string) => decodeURIComponent(src.split(/[?#]/)[0]).split('/').pop()!.split('.')[0];

/** geprüfte Werte (Standardwerte fallen weg) – null, wenn nichts vom Standard abweicht */
export function bildStilPruefen(s: BildStil | undefined): BildStil | null {
  if (!s) return null;
  const x = zahl(s.x, 0, 100, 50);
  const y = zahl(s.y, 0, 100, 50);
  const zoom = zahl(s.zoom, 1, 4, 1);
  const out: BildStil = { ...(x !== 50 && { x }), ...(y !== 50 && { y }), ...(zoom !== 1 && { zoom }), ...(s.ganz === true && { ganz: true }) };
  return Object.keys(out).length ? out : null;
}

/** CSS für die Fotos einer Seite */
export function bildStilCss(stile: Record<string, BildStil> | undefined): string {
  return Object.entries(stile ?? {})
    .filter(([n]) => NAME.test(n))
    .map(([n, roh]) => {
      const s = bildStilPruefen(roh);
      if (!s) return '';
      const x = s.x ?? 50;
      const y = s.y ?? 50;
      const zoom = s.zoom ?? 1;
      const sel = `img[src*="/${n}."]`;
      const regeln = [`object-position:${x}% ${y}% !important`, zoom > 1 ? `scale:${zoom} !important;transform-origin:${x}% ${y}%` : '', s.ganz ? 'object-fit:contain !important' : ''];
      // vergrößert: der Rahmen um das Foto schneidet ab
      return `${sel}{${regeln.filter(Boolean).join(';')}}${zoom > 1 ? `:has(> ${sel}),:has(> picture > ${sel}){overflow:hidden}` : ''}`;
    })
    .join('');
}
