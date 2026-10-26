/**
 * Interner Bereich auf Englisch: Diese Seiten gibt es auch unter /en/intern/ (für Mitglieder und Dozent:innen).
 * Redaktion, Kalender, Mitglieder und Dokumente bleiben deutsch.
 * Ohne Imports, damit Build und Browser (scripts/intern/session.ts) dieselbe Liste nutzen.
 */
export const INTERN_EN = ['', 'passwort/', 'profil/', 'keep-up/meine/', 'keep-up/beschreiben/'] as const;

/** Gemerkte Sprache (Umschalter in der Seitenleiste) */
export const SPRACHE_KEY = 'tndd-intern-sprache';

const gibtEnglisch = (pfad: string) => (INTERN_EN as readonly string[]).includes(pfad.split(/[?#]/)[0]);

/**
 * Pfad einer internen Seite ohne Basis-Pfad. Englisch nur, wenn es die Seite auf Englisch gibt.
 *   internPfad('en', 'profil/')         → 'en/intern/profil/'
 *   internPfad('en', 'redaktion/')      → 'intern/redaktion/'
 */
export function internPfad(lang: 'de' | 'en', pfad = ''): string {
  return `${lang === 'en' && gibtEnglisch(pfad) ? 'en/' : ''}intern/${pfad}`;
}

/**
 * Seite in der anderen Sprache zu einem Pfad wie „/intern/profil/“ oder „/basis/en/intern/“ (mit Basis-Pfad),
 * oder null, wenn es sie nicht gibt.
 */
export function gegenstueck(pathname: string, base: string): { lang: 'de' | 'en'; pfad: string } | null {
  const b = base.replace(/\/?$/, '/');
  const rest = pathname.startsWith(b) ? pathname.slice(b.length) : pathname.replace(/^\//, '');
  const m = /^(en\/)?intern\/(.*)$/.exec(rest);
  if (!m) return null;
  const pfad = m[2].replace(/index\.html$/, '');
  if (!gibtEnglisch(pfad)) return null;
  const lang = m[1] ? 'de' : 'en';
  return { lang, pfad: `${b}${internPfad(lang, pfad)}` };
}
