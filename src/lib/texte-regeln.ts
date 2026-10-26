/**
 * Regeln für die festen Texte der Website (src/settings/texte.json): Aufbau, Platzhalter, Zeilen, Prüfung.
 * Ohne Imports, damit Website (Build) und Redaktion → Texte (Browser) dieselben Regeln nutzen.
 */

export interface TextEintrag {
  /** wo der Text auf der Seite steht (für die Redaktion) */
  wo: string;
  de: string;
  en: string;
  /** Anzahl Zeilen, z. B. 2 bei zweizeiligen Überschriften */
  zeilen?: number;
  /** höchstens so viele Zeichen (je Sprache) */
  max?: number;
  /** Fassung vor der ersten Änderung durch die Redaktion (zum Zurückholen) */
  ursprung?: { de: string; en: string };
  /** Deutsch wurde geändert, Englisch noch nicht angepasst */
  enPruefen?: boolean;
}
export interface TextAbschnitt {
  titel: string;
  /**
   * Was zu diesem Abschnitt anderswo gepflegt wird: Link in der Redaktion.
   * `ziel`: „redaktion:<bereich>“ (Website-Inhalte) oder ein Pfad im internen Bereich, z. B. „intern/kalender/“
   */
  auch?: { text: string; ziel: string }[];
  texte: Record<string, TextEintrag>;
}
export interface TextSeite {
  titel: string;
  /** Gruppe in der Seitenliste der Redaktion (Auf jeder Seite, Seiten im Menü …) */
  gruppe: string;
  /** Adresse der Seite ohne Sprache und Basis-Pfad ('' = Startseite) */
  pfad: string;
  /** nur Vorstand und Admin ändern diese Seite (Rechtliches; geprüft auch in der Funktion „inhalte“) */
  nurVorstand?: boolean;
  abschnitte: Record<string, TextAbschnitt>;
}

/** Platzhalter wie {name}, sortiert und ohne Doppelte */
export function platzhalter(text: string): string[] {
  return [...new Set([...text.matchAll(/\{([a-z]+)\}/gi)].map((m) => m[1]))].sort();
}

/**
 * Setzt Werte für Platzhalter ein. Fehlt ein Wert, verschwindet der Platzhalter samt einem Leerzeichen
 * („Alle {zahl} Profile“ → „Alle Profile“).
 */
export function fuellen(text: string, werte: Record<string, string | number | undefined | null> = {}): string {
  return text
    .replace(/ ?\{([a-z]+)\}/gi, (ganz, k: string) => {
      const v = werte[k];
      if (v === undefined || v === null || v === '') return '';
      return `${ganz.startsWith(' ') ? ' ' : ''}${v}`;
    })
    .replace(/^ /, '');
}

/** Zeilen eines mehrzeiligen Texts (zweizeilige Überschriften) */
export function zeilen(text: string): string[] {
  return text.split('\n');
}

/**
 * Prüft eine Fassung gegen die Regeln des Eintrags. Rückgabe: Meldung oder null.
 * `vorlage` = Text, dessen Platzhalter erhalten bleiben müssen (die bisherige Fassung).
 */
export function textPruefen(e: Pick<TextEintrag, 'zeilen' | 'max'>, text: string, vorlage: string, sprache: 'de' | 'en'): string | null {
  const name = sprache === 'de' ? 'Deutsch' : 'Englisch';
  if (sprache === 'de' && !text.trim()) return 'Bitte einen Text eintragen.';
  if (!text.trim()) return null; // Englisch leer = Deutsch wird gezeigt
  if (e.max && text.length > e.max) return `${name}: ${text.length} Zeichen, erlaubt sind ${e.max}.`;
  if (e.zeilen && zeilen(text.replace(/\n+$/, '')).length !== e.zeilen) return `${name}: Bitte genau ${e.zeilen} Zeilen (neue Zeile mit der Eingabetaste).`;
  const soll = platzhalter(vorlage);
  const ist = platzhalter(text);
  const fehlt = soll.filter((p) => !ist.includes(p));
  if (fehlt.length) return `${name}: ${fehlt.map((p) => `{${p}}`).join(', ')} muss im Text bleiben (wird auf der Website ersetzt).`;
  const fremd = ist.filter((p) => !soll.includes(p));
  if (fremd.length) return `${name}: ${fremd.map((p) => `{${p}}`).join(', ')} gibt es hier nicht. Geschweifte Klammern bitte nur für vorhandene Platzhalter.`;
  if (/<[a-z/!]/i.test(text)) return `${name}: Bitte kein HTML (spitze Klammern).`;
  return null;
}

/** Alle Einträge einer Datei flach, in der Reihenfolge der Seiten */
export function alleTexte(datei: Record<string, unknown>) {
  const out: { seite: string; abschnitt: string; key: string; s: TextSeite; a: TextAbschnitt; e: TextEintrag }[] = [];
  for (const [seite, s] of Object.entries(datei)) {
    if (seite.startsWith('_') || !s || typeof s !== 'object') continue;
    const ts = s as TextSeite;
    for (const [abschnitt, a] of Object.entries(ts.abschnitte)) for (const [key, e] of Object.entries(a.texte)) out.push({ seite, abschnitt, key, s: ts, a, e });
  }
  return out;
}

/**
 * Datei wieder als Text, im selben Format wie von Hand angelegt: Seiten und Abschnitte eingerückt,
 * jeder Text in einer Zeile (übersichtliche Änderungen in der Versionsgeschichte).
 */
export function dateiText(datei: Record<string, unknown>): string {
  const eine = (v: unknown): string =>
    Array.isArray(v)
      ? `[${v.map(eine).join(', ')}]`
      : v && typeof v === 'object'
        ? `{ ${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${eine(x)}`).join(', ')} }`
        : JSON.stringify(v);
  const block = (v: unknown, tiefe: number): string => {
    if (!v || typeof v !== 'object' || Array.isArray(v) || 'wo' in v) return eine(v);
    const ein = '  '.repeat(tiefe + 1);
    const zeilen = Object.entries(v).map(([k, x]) => `${ein}${JSON.stringify(k)}: ${block(x, tiefe + 1)}`);
    return `{\n${zeilen.join(',\n')}\n${'  '.repeat(tiefe)}}`;
  };
  return `${block(datei, 0)}\n`;
}

/** Kennung eines Texts: seite.abschnitt.schluessel */
export const textId = (seite: string, abschnitt: string, key: string) => `${seite}.${abschnitt}.${key}`;

/**
 * Übernimmt Änderungen in eine (kopierte) Datei. Beim ersten Ändern wird die bisherige Fassung als `ursprung`
 * gemerkt; ändert sich nur Deutsch, wird Englisch zum Prüfen markiert. `englischPasst`: Markierung entfernen.
 * Gibt die Zahl der geänderten Texte zurück.
 */
export function uebernehmen(datei: Record<string, unknown>, neu: Map<string, { de: string; en: string; englischPasst?: boolean }>): number {
  let n = 0;
  for (const { seite, abschnitt, key, e } of alleTexte(datei)) {
    const x = neu.get(textId(seite, abschnitt, key));
    if (!x) continue;
    const de = x.de.replace(/\s+$/, '');
    const en = x.en.replace(/\s+$/, '');
    const deNeu = de !== e.de;
    const enNeu = en !== e.en;
    if (!deNeu && !enNeu && !(x.englischPasst && e.enPruefen)) continue;
    n++;
    e.ursprung ??= { de: e.de, en: e.en };
    e.de = de;
    e.en = en;
    if (enNeu || x.englischPasst) delete e.enPruefen;
    else if (deNeu) e.enPruefen = true;
    if (e.de === e.ursprung.de && e.en === e.ursprung.en) {
      delete e.ursprung;
      delete e.enPruefen;
    }
  }
  return n;
}
