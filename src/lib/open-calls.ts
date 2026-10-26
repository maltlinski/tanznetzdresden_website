/**
 * Open Calls (Intern → Open Calls, Tabellen open_calls, open_call_stand, open_call_netz;
 * supabase/migrations/20261027000000_open_calls.sql, docs/open-calls.md).
 * Fristen, Filter, Zeitleiste und Kalenderdatei. Ohne Astro-Importe: läuft im Browser und in den Tests.
 * Alle Zeiten sind Ortszeit Dresden (Europe/Berlin), auch wenn der Browser woanders steht.
 */
import { escapeIcs, foldIcs, VTIMEZONE } from './ics-text';

type Sprache = 'de' | 'en';
type Wort = Record<Sprache, string>;

export const ARTEN = {
  foerderung: { de: 'Förderung', en: 'Funding' },
  residenz: { de: 'Residenz', en: 'Residency' },
  audition: { de: 'Audition', en: 'Audition' },
  festival: { de: 'Bühne & Festival', en: 'Stage & festival' },
  job: { de: 'Job & Honorar', en: 'Job & paid work' },
  stipendium: { de: 'Stipendium & Preis', en: 'Grant & award' },
  weiterbildung: { de: 'Weiterbildung', en: 'Further training' },
} satisfies Record<string, Wort>;
export type Art = keyof typeof ARTEN;

export const REICHWEITEN = {
  dd: { de: 'Dresden', en: 'Dresden' },
  sn: { de: 'Sachsen', en: 'Saxony' },
  bund: { de: 'Bundesweit', en: 'Germany' },
  int: { de: 'International', en: 'International' },
} satisfies Record<string, Wort>;
export type Reichweite = keyof typeof REICHWEITEN;

/** Eigener Stand, in dieser Reihenfolge (Badge-Variante wie im Entwurf) */
export const STAENDE = [
  { id: 'gemerkt', de: 'Gemerkt', en: 'Saved', badge: 'outline' },
  { id: 'arbeit', de: 'In Arbeit', en: 'In progress', badge: 'purple' },
  { id: 'eingereicht', de: 'Eingereicht', en: 'Submitted', badge: 'cyan' },
  { id: 'zusage', de: 'Zusage', en: 'Accepted', badge: 'magenta' },
  { id: 'absage', de: 'Absage', en: 'Declined', badge: 'outline' },
] as const;
export type StandId = (typeof STAENDE)[number]['id'];

/** Zeile in open_calls */
export interface OpenCall {
  id: string;
  art: Art;
  titel: string;
  anbieter: string;
  reichweite: Reichweite;
  ort: string;
  /** JJJJ-MM-TT */
  frist: string;
  /** „23:59“ (aus der Datenbank „23:59:00“) */
  uhrzeit: string;
  start: string | null;
  link: string;
  leistung: string;
  honoriert: boolean;
  englisch: boolean;
  zeitraum: string;
  zielgruppe: string;
  sprache: string;
  wiederkehrend: string;
  beschreibung: string;
  unterlagen: string[];
  hinweis: string;
  gemeinsam: boolean;
  vom_netzwerk: boolean;
  nur_mitglieder: boolean;
  quelle: string;
  status: 'pruefung' | 'frei';
  gemeldet_von: string | null;
  geprueft_am: string | null;
  created_at: string;
}

/** Zeile in open_call_stand (eigener Stand) */
export interface Stand {
  call_id: string;
  stand: StandId | null;
  unterlagen: boolean[];
  erinnerung: boolean;
  sprache: Sprache;
  erinnert: string[];
}

/** Zeile in open_call_netz */
export interface Netz {
  call_id: string;
  person: string;
  art: 'mitmachen' | 'erfahrung';
}

export const SPALTEN = 'id,art,titel,anbieter,reichweite,ort,frist,uhrzeit,start,link,leistung,honoriert,englisch,zeitraum,zielgruppe,sprache,wiederkehrend,beschreibung,unterlagen,hinweis,gemeinsam,vom_netzwerk,nur_mitglieder,quelle,status,gemeldet_von,geprueft_am,created_at';

/** Jetzt in Dresden: { datum: '2026-10-26', zeit: '18:15' } */
export function jetztDresden(d = new Date()): { datum: string; zeit: string } {
  const s = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
  const [datum, zeit] = s.split(' ');
  return { datum, zeit };
}

export const uhr = (t: string | null | undefined) => (t ?? '23:59').slice(0, 5);
const ende = (c: Pick<OpenCall, 'frist' | 'uhrzeit'>) => `${c.frist} ${uhr(c.uhrzeit)}`;
export const abgelaufen = (c: Pick<OpenCall, 'frist' | 'uhrzeit'>, jetzt = jetztDresden()) => ende(c) < `${jetzt.datum} ${jetzt.zeit}`;
/** Tage von heute bis zum Tag der Frist (0 = heute) */
export const tageBis = (frist: string, heute: string) => Math.round((Date.parse(`${frist}T00:00:00Z`) - Date.parse(`${heute}T00:00:00Z`)) / 86400000);
export const plusTage = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

/** Farbe der Frist: grau (vorbei oder in Prüfung), magenta (≤ dringend), lila (≤ 3 Wochen), hell (später) */
export type Ton = 'grau' | 'dringend' | 'bald' | 'spaeter';
export function ton(c: Pick<OpenCall, 'frist' | 'uhrzeit' | 'status'>, jetzt = jetztDresden(), dringend = 7): Ton {
  if (c.status !== 'frei' || abgelaufen(c, jetzt)) return 'grau';
  const n = tageBis(c.frist, jetzt.datum);
  return n <= dringend ? 'dringend' : n <= 21 ? 'bald' : 'spaeter';
}

const MONATE: Record<Sprache, string[]> = {
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const MON: Record<Sprache, string[]> = {
  de: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
const teile = (iso: string) => iso.split('-').map(Number) as [number, number, number];
export const monatName = (m: number, s: Sprache) => MONATE[s][m];
/** „Okt 26“ (Monat und Jahr über dem Tag im Datumsblock) */
export const monatKurz = (iso: string, s: Sprache) => `${MON[s][teile(iso)[1] - 1]} ${String(teile(iso)[0]).slice(2)}`;
/** „31. Oktober 2026“ / „31 October 2026“ */
export const datumLang = (iso: string, s: Sprache) => {
  const [y, m, d] = teile(iso);
  return s === 'en' ? `${d} ${MONATE.en[m - 1]} ${y}` : `${d}. ${MONATE.de[m - 1]} ${y}`;
};
/** „31.10.“ / „31 Oct“ */
export const datumKurz = (iso: string, s: Sprache) => {
  const [, m, d] = teile(iso);
  return s === 'en' ? `${d} ${MON.en[m - 1]}` : `${d}.${m}.`;
};
/** „31.10.2026“ / „31 Oct 2026“ */
export const datumMittel = (iso: string, s: Sprache) => `${datumKurz(iso, s)}${s === 'en' ? ' ' : ''}${teile(iso)[0]}`;

/** „Noch 5 Tage“, „Endet morgen“, „Abgelaufen“ … */
export function restText(c: Pick<OpenCall, 'frist' | 'uhrzeit' | 'status'>, s: Sprache, jetzt = jetztDresden()): string {
  if (c.status !== 'frei') return s === 'en' ? 'Under review' : 'In Prüfung';
  if (abgelaufen(c, jetzt)) return s === 'en' ? 'Closed' : 'Abgelaufen';
  const n = tageBis(c.frist, jetzt.datum);
  if (s === 'en') return n === 0 ? 'Ends today' : n === 1 ? 'Ends tomorrow' : `${n} days left`;
  return n === 0 ? 'Endet heute' : n === 1 ? 'Endet morgen' : `Noch ${n} Tage`;
}

export interface Filter {
  art: Art | 'alle';
  reichweite: Reichweite | 'alle';
  honoriert: boolean;
  englisch: boolean;
  netzwerk: boolean;
  suche: string;
}
export const FILTER_LEER: Filter = { art: 'alle', reichweite: 'alle', honoriert: false, englisch: false, netzwerk: false, suche: '' };

/** „Aus dem Netzwerk“: Ausschreibung des Vereins oder von einem Mitglied gemeldet */
export const ausDemNetzwerk = (c: Pick<OpenCall, 'vom_netzwerk' | 'gemeldet_von'>) => c.vom_netzwerk || !!c.gemeldet_von;

export function passt(c: OpenCall, f: Filter): boolean {
  const q = f.suche.trim().toLowerCase();
  return (f.art === 'alle' || c.art === f.art)
    && (f.reichweite === 'alle' || c.reichweite === f.reichweite)
    && (!f.honoriert || c.honoriert)
    && (!f.englisch || c.englisch)
    && (!f.netzwerk || ausDemNetzwerk(c))
    && (!q || `${c.titel} ${c.anbieter} ${c.ort}`.toLowerCase().includes(q));
}

export const nachFrist = (a: OpenCall, b: OpenCall) => ende(a).localeCompare(ende(b));
export const neuesteZuerst = (a: OpenCall, b: OpenCall) => b.created_at.localeCompare(a.created_at);

/** Markierungen der Zeitleiste „Fristen · nächste 12 Wochen“: Position in Prozent, bis zu drei Reihen */
export function zeitleiste(calls: OpenCall[], heute: string, spanne = 84) {
  const reihen = [-99, -99, -99];
  const abstand = 10;
  const marken = calls
    .filter((c) => tageBis(c.frist, heute) <= spanne)
    .sort(nachFrist)
    .map((c) => {
      const x = Math.max(0, Math.min(100, (tageBis(c.frist, heute) / spanne) * 100));
      let reihe = reihen.findIndex((e) => x - e >= abstand);
      if (reihe < 0) reihe = reihen.indexOf(Math.min(...reihen));
      reihen[reihe] = x;
      return { call: c, x, reihe };
    });
  const [y, m] = teile(heute);
  const monate: { x: number; monat: number }[] = [];
  for (let i = 1; i <= 3; i++) {
    const erster = new Date(Date.UTC(y, m - 1 + i, 1)).toISOString().slice(0, 10);
    const x = (tageBis(erster, heute) / spanne) * 100;
    if (x < 96) monate.push({ x, monat: teile(erster)[1] - 1 });
  }
  const spaeter = calls.filter((c) => tageBis(c.frist, heute) > spanne).length;
  return { marken, monate, spaeter };
}

const pad = (n: number) => String(n).padStart(2, '0');
/** Ortszeit als iCalendar-Wert, verschoben um Minuten */
const icsZeit = (datum: string, zeit: string, minuten = 0) => {
  const [y, m, d] = teile(datum);
  const [hh, mm] = zeit.split(':').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, hh, mm) + minuten * 60000);
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00`;
};

/**
 * Kalenderdatei mit den Fristen: je Call ein Termin, der zur Frist endet, mit Erinnerungen 7 Tage und
 * 1 Tag vorher. seite(c) = Adresse des Calls im internen Bereich.
 */
export function fristenIcs(calls: OpenCall[], o: { sprache: Sprache; seite: (c: OpenCall) => string; jetzt?: Date }): string {
  const en = o.sprache === 'en';
  const stamp = (o.jetzt ?? new Date()).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const zeilen = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//TanzNetzDresden//Open Calls//${en ? 'EN' : 'DE'}`, 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...VTIMEZONE];
  for (const c of calls) {
    const zeit = uhr(c.uhrzeit);
    const alarm = (dauer: string, text: string) => ['BEGIN:VALARM', `TRIGGER:${dauer}`, 'ACTION:DISPLAY', `DESCRIPTION:${escapeIcs(text)}`, 'END:VALARM'];
    zeilen.push(
      'BEGIN:VEVENT',
      `UID:open-call-${c.id}@tanznetzdresden.de`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Berlin:${icsZeit(c.frist, zeit, -30)}`,
      `DTEND;TZID=Europe/Berlin:${icsZeit(c.frist, zeit)}`,
      `SUMMARY:${escapeIcs(`${en ? 'Deadline' : 'Frist'}: ${c.titel}`)}`,
      `DESCRIPTION:${escapeIcs([c.anbieter, c.link, o.seite(c)].filter(Boolean).join('\n'))}`,
      `URL:${c.link || o.seite(c)}`,
      ...alarm('-P7D', `${en ? '7 days left' : 'Noch 7 Tage'}: ${c.titel}`),
      ...alarm('-P1D', `${en ? 'Tomorrow' : 'Morgen'}: ${c.titel}`),
      'END:VEVENT',
    );
  }
  zeilen.push('END:VCALENDAR');
  return zeilen.map(foldIcs).join('\r\n') + '\r\n';
}
