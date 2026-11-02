/**
 * Nächster Termin eines Formats (Formate-Seite): beim Build vorbereitet, im Browser beim Öffnen neu gewählt,
 * damit vergangene Termine nicht stehen bleiben. Ohne Build-Abhängigkeiten (läuft auch im Browser).
 */
export interface FormatTermin {
  /** JJJJ-MM-TT */
  datum: string;
  /** „20:00“, leer ohne Uhrzeit */
  zeit: string;
  /** Zeile unter dem Datum: Ort · Titel */
  wo: string;
  link: string;
}

/** heute in Dresden als JJJJ-MM-TT */
export const heuteDresden = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());

/** erster Termin ab heute */
export const naechster = (liste: FormatTermin[], heute = heuteDresden()) => liste.find((t) => t.datum >= heute);

/** „Heute · Sa 31. Okt · 20:00“, „Do · 26. Nov · 20:00“, im nächsten Jahr „Do · 29. Apr 2027“ */
export function terminText(t: FormatTermin, locale: string, heuteWort: string, heute = heuteDresden()): string {
  const d = new Date(`${t.datum}T12:00:00Z`);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { ...o, timeZone: 'UTC' }).format(d).replace(/\.$/, '');
  const tag = f({ weekday: 'short' });
  const mon = f({ month: 'short' });
  const datum = locale.startsWith('de') ? `${d.getUTCDate()}. ${mon}` : `${d.getUTCDate()} ${mon}`;
  const kopf = t.datum === heute ? `${heuteWort} · ${tag} ${datum}` : `${tag} · ${datum}`;
  // in einem anderen Jahr zählt das Jahr mehr als die Uhrzeit
  if (t.datum.slice(0, 4) !== heute.slice(0, 4)) return `${kopf} ${t.datum.slice(0, 4)}`;
  return t.zeit ? `${kopf} · ${t.zeit}` : kopf;
}
