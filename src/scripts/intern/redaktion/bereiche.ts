/**
 * Was die Redaktion bearbeiten kann: jeder Bereich mit Datei(en), Feldern und Regeln.
 * Die Felder entsprechen den Schemas in src/content.config.ts und src/lib/settings.ts –
 * kommt dort ein Feld dazu, hier ergänzen (sonst bleibt es erhalten, ist aber nicht bearbeitbar).
 */
import { slugify } from '../../../lib/supabase';
import { routes } from '../../../lib/i18n';
import { ANGABEN, GALERIE_LAYOUTS, OFFEN_FUER } from '../../../lib/profil-felder';
import type { Daten, Eintrag } from './daten';

export interface Option {
  wert: string;
  label: string;
}

interface Basis {
  /** Pfad im Datensatz, z. B. „title“ oder „training.fee“; „id“ = Kennung des Eintrags */
  key: string;
  label: string;
  hilfe?: string;
  pflicht?: boolean;
  /**
   * Englische Fassung: true = Feld „<key>_en“ (bzw. gleicher Schlüssel in der englischen Datei),
   * Text = eigener Pfad, z. B. „en.claim“
   */
  en?: true | string;
  /** nur beim Anlegen änderbar (Kennungen) */
  nurNeu?: boolean;
  nurVorstand?: boolean;
  platzhalter?: string;
}
export type Feld =
  | (Basis & { typ: 'text'; max?: number; muster?: [RegExp, string] })
  | (Basis & { typ: 'textlang'; zeilen?: number; max?: number })
  | (Basis & { typ: 'markdown' })
  | (Basis & { typ: 'auswahl'; optionen: Option[] })
  | (Basis & { typ: 'mehrfach'; optionen: Option[]; min?: number })
  | (Basis & { typ: 'janein'; standard?: boolean })
  | (Basis & { typ: 'zahl'; min?: number; max?: number; schritt?: number })
  | (Basis & { typ: 'datum'; montag?: boolean })
  | (Basis & { typ: 'datumzeit' })
  | (Basis & { typ: 'url' })
  | (Basis & { typ: 'email' })
  | (Basis & { typ: 'schlagworte' })
  | (Basis & { typ: 'verweis'; quelle: string; mehrfach?: boolean })
  | (Basis & { typ: 'bild'; ordner: 'photos' | 'personen' | 'foerderer'; form: 'relativ' | 'name' })
  | (Basis & { typ: 'pdf' })
  | (Basis & { typ: 'werte'; art: 'text' | 'zahl'; neu: string; max?: number })
  | (Basis & { typ: 'liste'; felder: Feld[]; neu: string; titel: (v: Daten) => string })
  | { typ: 'abschnitt'; key?: undefined; label: string; hilfe?: string; nurVorstand?: boolean };

/** Kontext für Titel, Infos und Prüfungen: Namen aus anderen Bereichen */
export interface Kontext {
  name(quelle: string, id: string): string;
}

interface BereichBasis {
  id: string;
  label: string;
  einzahl: string;
  gruppe: string;
  beschreibung: string;
  felder: Feld[];
  /** Einträge nur für Vorstand/Admin */
  nurVorstand?: (id: string) => boolean;
  /** Bereiche, deren Namen Titel oder Verweise brauchen */
  braucht?: string[];
  titel: (e: Eintrag, k: Kontext) => string;
  info?: (e: Eintrag, k: Kontext) => string;
  /** öffentliche Seite des Eintrags (ohne Basis-Pfad) */
  seite?: (e: Eintrag) => string | null;
  /** zusätzliche Prüfungen: Fehlermeldung je Feld */
  pruefen?: (e: Eintrag) => Record<string, string>;
}
export interface OrdnerBereich extends BereichBasis {
  art: 'ordner';
  ordner: string;
  /** Dateien im Ordner, die nicht dazugehören (relativ zum Ordner) */
  ohne?: RegExp;
  anlegen: boolean;
  loeschen: boolean;
  duplizieren?: boolean;
  /** Kennung (Dateiname) für neue Einträge */
  neueId?: (d: Daten) => string;
  /** 'order' = Reihenfolge per Feld „order“, sonst sortiert nach Feld */
  sortierung: 'order' | { feld: string; abwaerts?: boolean };
  /** englische Fassung in eigener Datei */
  uebersetzung?: (id: string) => string;
  /** englische Felder, die Pflicht sind, sobald es eine englische Fassung gibt */
  enPflicht?: string[];
  filter?: { id: string; label: string; passt: (e: Eintrag) => boolean }[];
}
export interface ListeBereich extends BereichBasis {
  art: 'liste';
  datei: string;
  anlegen: boolean;
  loeschen: boolean;
  /** 'hand' = Reihenfolge in der Datei = Anzeige; 'id' = automatisch nach Kennung (Datum) */
  sortierung: 'hand' | 'id';
  neueId?: (d: Daten) => string;
}
export interface EinstellungBereich extends BereichBasis {
  art: 'einstellung';
  datei: string;
  /** JSON ist eine Liste: im Formular unter diesem Schlüssel */
  wurzel?: string;
}
export type Bereich = OrdnerBereich | ListeBereich | EinstellungBereich;

const opt = (...xs: string[]): Option[] => xs.map((x) => ({ wert: x, label: x }));
const heute = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
const datumDe = (iso?: string) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '');
const TAGE = [
  { wert: 'mo', label: 'Mo' }, { wert: 'di', label: 'Di' }, { wert: 'mi', label: 'Mi' }, { wert: 'do', label: 'Do' },
  { wert: 'fr', label: 'Fr' }, { wert: 'sa', label: 'Sa' }, { wert: 'so', label: 'So' },
];
const URL_HILFE = 'Vollständige Adresse mit https://';
const BILD_ALT = 'Was ist zu sehen? Für Menschen, die das Bild nicht sehen können.';

const seitenRouten: Record<string, keyof typeof routes> = {
  impressum: 'impressum', datenschutz: 'datenschutz', transparenz: 'transparenz', barrierefreiheit: 'barrierefreiheit', 'leichte-sprache': 'leichteSprache',
};

export const bereiche: Bereich[] = [
  // ---------------- Programm ----------------
  {
    id: 'termine',
    art: 'ordner',
    label: 'Termine',
    einzahl: 'Termin',
    gruppe: 'Programm',
    beschreibung: 'Vorstellungen, Trainings, Gespräche. Erscheinen im Tanzkalender, auf der Startseite und mit eigener Seite.',
    ordner: 'src/content/termine',
    anlegen: true,
    loeschen: true,
    duplizieren: true,
    braucht: ['personen', 'formate'],
    neueId: (d) => `${String(d.start ?? '').slice(0, 10)}-${slugify(String(d.title ?? 'termin'))}`.replace(/^-/, ''),
    sortierung: { feld: 'start' },
    titel: (e) => e.data.title ?? e.id,
    info: (e, k) =>
      [datumDe(e.data.start) + (e.data.start ? `, ${String(e.data.start).slice(11)}` : ''), e.data.venue, e.data.category, e.data.format ? k.name('formate', e.data.format) : '', e.data.draft ? 'Entwurf' : '']
        .filter(Boolean)
        .join(' · '),
    seite: (e) => (e.data.draft ? null : `termine/${e.id}/`),
    filter: [
      { id: 'kommend', label: 'Kommende', passt: (e) => String(e.data.start ?? '').slice(0, 10) >= heute() },
      { id: 'vergangen', label: 'Vergangene', passt: (e) => String(e.data.start ?? '').slice(0, 10) < heute() },
      { id: 'entwurf', label: 'Entwürfe', passt: (e) => !!e.data.draft },
    ],
    pruefen: (e): Record<string, string> => (e.data.end && e.data.start && e.data.end < e.data.start ? { end: 'Das Ende liegt vor dem Beginn.' } : {}),
    felder: [
      { typ: 'text', key: 'title', label: 'Titel', pflicht: true, en: true, max: 140 },
      { typ: 'datumzeit', key: 'start', label: 'Beginn', pflicht: true, hilfe: 'Ortszeit Dresden.' },
      { typ: 'datumzeit', key: 'end', label: 'Ende', hilfe: 'Optional, für den Kalender-Export.' },
      { typ: 'text', key: 'timeLabel', label: 'Uhrzeit anders anzeigen', en: true, hilfe: 'Optional, z. B. „11:00–15:00 Uhr“ oder „ganztägig“.' },
      { typ: 'text', key: 'venue', label: 'Ort', pflicht: true, platzhalter: 'z. B. TENZA Schmiede', hilfe: 'Heißt der Ort wie einer unter Kooperationen → Orte, zeigt der Kalender Adresse und Route.' },
      { typ: 'text', key: 'eintritt', label: 'Eintritt', en: true, max: 80, platzhalter: 'z. B. Eintritt frei', hilfe: 'Optional, z. B. „Eintritt auf Spendenbasis“ oder „Tickets über das Societaetstheater“.' },
      { typ: 'auswahl', key: 'category', label: 'Kategorie', pflicht: true, optionen: opt('Bühne', 'Training', 'Diskurs') },
      { typ: 'textlang', key: 'teaser', label: 'Kurzbeschreibung', pflicht: true, en: true, zeilen: 2, max: 300, hilfe: 'Ein Satz für Kalender und Startseite.' },
      { typ: 'markdown', key: 'body', label: 'Beschreibung für die Terminseite', hilfe: 'Optional. Absätze mit Leerzeile trennen.' },
      { typ: 'url', key: 'link', label: 'Link für Tickets oder Anmeldung', hilfe: `Erscheint als Knopf auf der Terminseite. ${URL_HILFE}` },
      { typ: 'verweis', key: 'people', label: 'Mitwirkende aus dem Netzwerk', quelle: 'personen', mehrfach: true, hilfe: 'Der Termin erscheint dann auch auf ihren Profilen.' },
      { typ: 'verweis', key: 'format', label: 'Gehört zum Format', quelle: 'formate', hilfe: 'KEEP UP = Workshop im Profitrainings-Kalender.' },
      { typ: 'verweis', key: 'news', label: 'Passender News-Beitrag', quelle: 'news' },
      { typ: 'janein', key: 'draft', label: 'Entwurf: noch nicht auf der Website zeigen', standard: false },
    ],
  },
  {
    id: 'formate',
    art: 'ordner',
    label: 'Formate',
    einzahl: 'Format',
    gruppe: 'Programm',
    beschreibung: 'Die Reihen des Vereins (KEEP UP, POP UP …) auf der Startseite. Reihenfolge per Sortieren.',
    ordner: 'src/content/formate',
    anlegen: true,
    loeschen: true,
    neueId: (d) => slugify(String(d.title ?? 'format')),
    sortierung: 'order',
    titel: (e) => e.data.title ?? e.id,
    info: (e) => [e.data.since, e.data.seite ? `eigene Seite: /${routes[e.data.seite as keyof typeof routes]?.de ?? ''}` : ''].filter(Boolean).join(' · '),
    seite: (e) => (e.data.seite ? (routes[e.data.seite as keyof typeof routes]?.de ?? null) : ''),
    felder: [
      { typ: 'text', key: 'title', label: 'Name', pflicht: true, en: true },
      { typ: 'text', key: 'since', label: 'Seit', pflicht: true, en: true, platzhalter: 'z. B. seit 2022' },
      { typ: 'textlang', key: 'summary', label: 'Beschreibung', pflicht: true, en: true, zeilen: 3, max: 400 },
      { typ: 'bild', key: 'image', label: 'Foto', pflicht: true, ordner: 'photos', form: 'relativ' },
      { typ: 'text', key: 'alt', label: 'Bildbeschreibung', pflicht: true, en: true, hilfe: BILD_ALT },
      {
        typ: 'auswahl',
        key: 'seite',
        label: 'Eigene Seite',
        hilfe: 'Optional: Seite der Website, auf die „Mehr zu …“ verlinkt.',
        optionen: Object.entries(routes)
          .filter(([k]) => !['home', 'intern', 'spendenNachweis'].includes(k))
          .map(([k, r]) => ({ wert: k, label: `/${r.de}` })),
      },
    ],
  },
  {
    id: 'news',
    art: 'ordner',
    label: 'News-Archiv',
    einzahl: 'Beitrag',
    gruppe: 'Programm',
    beschreibung: 'Ältere News, die als Datei vorliegen. Neue Beiträge entstehen unter „News schreiben“.',
    ordner: 'src/content/news/de',
    uebersetzung: (id) => `src/content/news/en/${id}.md`,
    anlegen: false,
    loeschen: true,
    sortierung: { feld: 'date', abwaerts: true },
    titel: (e) => e.data.title ?? e.id,
    info: (e) => [datumDe(e.data.date), e.data.category, e.en?.data.title ? 'DE/EN' : 'nur DE', e.data.draft ? 'Entwurf' : ''].filter(Boolean).join(' · '),
    seite: (e) => (e.data.draft ? null : `news/${e.id}/`),
    pruefen: (e): Record<string, string> => (e.data.image && !e.data.alt ? { alt: 'Zum Foto fehlt die Bildbeschreibung.' } : {}),
    felder: [
      { typ: 'text', key: 'title', label: 'Titel', pflicht: true, en: true },
      { typ: 'textlang', key: 'teaser', label: 'Kurztext', pflicht: true, en: true, zeilen: 3, max: 400 },
      { typ: 'markdown', key: 'body', label: 'Text', en: true },
      { typ: 'datum', key: 'date', label: 'Datum', pflicht: true },
      { typ: 'auswahl', key: 'category', label: 'Kategorie', pflicht: true, optionen: opt('Netzwerk', 'Ausschreibung', 'Training', 'Verein', 'Rückblick', 'Stimme') },
      { typ: 'text', key: 'author', label: 'Text von', pflicht: true },
      { typ: 'datum', key: 'deadline', label: 'Bewerbungsfrist', hilfe: 'Macht den Beitrag zur Ausschreibung mit Countdown.' },
      { typ: 'bild', key: 'image', label: 'Foto', ordner: 'photos', form: 'relativ' },
      { typ: 'text', key: 'alt', label: 'Bildbeschreibung', en: true, hilfe: BILD_ALT },
      { typ: 'text', key: 'imageFocus', label: 'Bildausschnitt', platzhalter: '50% 30%', muster: [/^\d{1,3}% \d{1,3}%$/, 'Format: 50% 30%'], hilfe: 'Optional. Welche Stelle im Foto sichtbar bleibt, wenn es zugeschnitten wird: waagerecht und senkrecht in Prozent.' },
      { typ: 'liste', key: 'facts', label: 'Auf einen Blick', en: true, neu: 'Zeile hinzufügen', titel: (v) => v.label ?? '', felder: [
        { typ: 'text', key: 'label', label: 'Was', pflicht: true, platzhalter: 'z. B. Wann' },
        { typ: 'text', key: 'value', label: 'Angabe', pflicht: true },
      ] },
      { typ: 'janein', key: 'featured', label: 'Titelthema (groß oben)', standard: false },
      { typ: 'janein', key: 'draft', label: 'Entwurf: nicht auf der Website zeigen', standard: false },
    ],
  },

  {
    id: 'news-bausteine',
    art: 'einstellung',
    label: 'News-Bausteine',
    einzahl: 'News-Bausteine',
    gruppe: 'Programm',
    beschreibung: 'Wiederkehrende Texte wie Förderhinweise, mit einem Klick in News einfügen.',
    datei: 'src/settings/news-bausteine.json',
    wurzel: 'liste',
    titel: () => 'News-Bausteine',
    felder: [
      { typ: 'liste', key: 'liste', label: 'Bausteine', pflicht: true, neu: 'Baustein hinzufügen', titel: (v) => v.name ?? '', felder: [
        { typ: 'text', key: 'name', label: 'Name', pflicht: true, platzhalter: 'z. B. Förderhinweis TANZPAKT', hilfe: 'So heißt der Knopf im Editor.' },
        { typ: 'auswahl', key: 'typ', label: 'Erscheint als', pflicht: true, optionen: [{ wert: 'hinweis', label: 'Hinweiskasten' }, { wert: 'text', label: 'normaler Text' }] },
        { typ: 'textlang', key: 'text', label: 'Text', pflicht: true, en: true, zeilen: 5 },
      ] },
    ],
  },

  // ---------------- Profitraining ----------------
  {
    id: 'wochen',
    art: 'liste',
    label: 'Trainingsplan',
    einzahl: 'Trainingswoche',
    gruppe: 'Profitraining KEEP UP',
    beschreibung: 'Welche Dozent:in in welcher Woche an welchen Tagen unterrichtet. Erscheint im Kalender auf /profitraining/.',
    datei: 'src/content/keep-up/wochen.yaml',
    anlegen: true,
    loeschen: true,
    sortierung: 'id',
    braucht: ['dozentinnen', 'personen'],
    titel: (e) => `Woche ab ${datumDe(e.id)}`,
    info: (e, k) => [k.name('dozentinnen', e.data.dozent), (e.data.tage ?? []).map((t: string) => TAGE.find((x) => x.wert === t)?.label).join(' '), e.data.zeit].filter(Boolean).join(' · '),
    seite: () => 'profitraining/#kalender',
    felder: [
      { typ: 'datum', key: 'id', label: 'Woche ab Montag', pflicht: true, nurNeu: true, montag: true },
      { typ: 'verweis', key: 'dozent', label: 'Dozent:in', pflicht: true, quelle: 'dozentinnen', hilfe: 'Neue Dozent:innen zuerst unter „Dozent:innen“ anlegen.' },
      { typ: 'mehrfach', key: 'tage', label: 'Trainingstage', pflicht: true, min: 1, optionen: TAGE },
      { typ: 'text', key: 'zeit', label: 'Uhrzeit', platzhalter: '10:00–11:30', muster: [/^\d{2}:\d{2}\s*[–-]\s*\d{2}:\d{2}$/, 'Format: 10:00–11:30'], hilfe: 'Leer = 10:00–11:30.' },
      { typ: 'text', key: 'ort', label: 'Ort', hilfe: 'Leer = Trainingsort aus den Vereinsdaten.' },
    ],
  },
  {
    id: 'dozentinnen',
    art: 'liste',
    label: 'Dozent:innen',
    einzahl: 'Dozent:in',
    gruppe: 'Profitraining KEEP UP',
    beschreibung: 'Die Kacheln im Foto-Mosaik auf /profitraining/. Reihenfolge = Reihenfolge im Mosaik.',
    datei: 'src/content/keep-up/dozentinnen.yaml',
    anlegen: true,
    loeschen: true,
    sortierung: 'hand',
    braucht: ['personen'],
    titel: (e, k) => k.name('personen', e.id),
    info: (e) => e.data.stil ?? '',
    seite: (e) => `profitraining/#dozentin-${e.id}`,
    felder: [
      { typ: 'verweis', key: 'id', label: 'Person', pflicht: true, nurNeu: true, quelle: 'personen', hilfe: 'Name, Profil und Foto kommen aus dem Profil der Person. Wer fehlt: unter „Personen“ anlegen oder das eigene Profil im internen Bereich freigeben lassen.' },
      { typ: 'text', key: 'stil', label: 'Schwerpunkt im Unterricht', pflicht: true, en: true, platzhalter: 'z. B. Contemporary' },
      { typ: 'textlang', key: 'text', label: 'Text zum Unterricht', pflicht: true, en: true, zeilen: 4, max: 600, hilfe: 'Zwei bis drei Sätze.' },
    ],
  },
  {
    id: 'keep-up-texte',
    art: 'einstellung',
    label: 'Seite Profitraining',
    einzahl: 'Texte',
    gruppe: 'Profitraining KEEP UP',
    beschreibung: 'Überschrift, Einleitung, Infos und Kopffoto der Seite /profitraining/.',
    datei: 'src/settings/keep-up.json',
    titel: () => 'Seite Profitraining',
    seite: () => 'profitraining/',
    felder: [
      { typ: 'abschnitt', label: 'Kopf' },
      { typ: 'text', key: 'de.kicker', label: 'Kicker', en: 'en.kicker', pflicht: true },
      { typ: 'text', key: 'de.l1', label: 'Überschrift, Zeile 1', en: 'en.l1', pflicht: true },
      { typ: 'text', key: 'de.l2', label: 'Überschrift, Zeile 2 (Magenta)', en: 'en.l2', pflicht: true },
      { typ: 'textlang', key: 'de.lead', label: 'Einleitung', en: 'en.lead', pflicht: true },
      { typ: 'bild', key: 'foto.datei', label: 'Kopffoto', ordner: 'photos', form: 'name', pflicht: true },
      { typ: 'text', key: 'foto.alt.de', label: 'Bildbeschreibung', en: 'foto.alt.en', pflicht: true, hilfe: BILD_ALT },
      { typ: 'abschnitt', label: 'Dozent:innen' },
      { typ: 'text', key: 'de.saison', label: 'Saison', en: 'en.saison', pflicht: true, platzhalter: 'z. B. Herbst 2026' },
      { typ: 'textlang', key: 'de.stapelText', label: 'Text neben den Dozent:innen', en: 'en.stapelText', pflicht: true },
      { typ: 'textlang', key: 'de.anmeldung', label: 'Hinweis zur Anmeldung (Kalender)', en: 'en.anmeldung', pflicht: true },
      { typ: 'abschnitt', label: 'Infos' },
      { typ: 'text', key: 'de.wann', label: 'Wann', en: 'en.wann', pflicht: true },
      { typ: 'textlang', key: 'de.wannText', label: 'Wann: Text', en: 'en.wannText', pflicht: true },
      { typ: 'textlang', key: 'de.woText', label: 'Wo: Zusatz', en: 'en.woText', pflicht: true, hilfe: 'Ort und Adresse kommen aus den Vereinsdaten (Training).' },
      { typ: 'text', key: 'de.fuerWen', label: 'Für wen', en: 'en.fuerWen', pflicht: true },
      { typ: 'textlang', key: 'de.fuerWenText', label: 'Für wen: Text', en: 'en.fuerWenText', pflicht: true },
      { typ: 'abschnitt', label: 'Band unten' },
      { typ: 'text', key: 'de.cta1', label: 'Zeile 1', en: 'en.cta1', pflicht: true },
      { typ: 'text', key: 'de.cta2', label: 'Zeile 2', en: 'en.cta2', pflicht: true },
    ],
  },

  // ---------------- Netzwerk & Partner ----------------
  {
    id: 'personen',
    art: 'liste',
    label: 'Personen',
    einzahl: 'Person',
    gruppe: 'Netzwerk & Partner',
    beschreibung: 'Mitglieder:innen und Trainer:innen auf /netzwerk/ mit eigenem Profil. Reihenfolge = Anzeige.',
    datei: 'src/content/personen.yaml',
    anlegen: true,
    loeschen: true,
    sortierung: 'hand',
    neueId: (d) => slugify(String(d.name ?? 'person')),
    titel: (e) => e.data.name ?? e.id,
    info: (e) => [(e.data.roles ?? []).map((r: string) => (r === 'trainer' ? 'Trainer:in' : 'Mitglied')).join(', '), e.data.vorstand ? 'Vorstand' : ''].filter(Boolean).join(' · '),
    seite: (e) => `netzwerk/${e.id}/`,
    felder: [
      { typ: 'text', key: 'name', label: 'Name', pflicht: true },
      { typ: 'text', key: 'pronouns', label: 'Pronomen', platzhalter: 'z. B. sie/ihr' },
      { typ: 'mehrfach', key: 'roles', label: 'Im Netzwerk als', pflicht: true, min: 1, optionen: [{ wert: 'mitglied', label: 'Mitglied' }, { wert: 'trainer', label: 'Trainer:in' }] },
      { typ: 'text', key: 'vorstand', label: 'Funktion im Vorstand/Koordinationsteam', en: true, hilfe: 'Optional.' },
      { typ: 'text', key: 'profession', label: 'Tätigkeit', en: true, max: 80, platzhalter: 'z. B. Tänzerin und Choreografin' },
      { typ: 'text', key: 'base', label: 'Basis', max: 60, platzhalter: 'z. B. Dresden-Neustadt' },
      { typ: 'abschnitt', label: 'Text' },
      { typ: 'textlang', key: 'pitch', label: 'In einem Satz', en: true, zeilen: 2, max: 200, hilfe: 'Groß oben auf dem Profil. Was nach einem Doppelpunkt steht, wird pink hervorgehoben.' },
      { typ: 'textlang', key: 'bio', label: 'Profiltext', en: true, zeilen: 5, hilfe: 'Absätze mit Leerzeile trennen. Der erste Absatz erscheint größer.' },
      { typ: 'schlagworte', key: 'tags', label: 'Schwerpunkte', hilfe: 'Mit Komma trennen, z. B. Choreografie, Contemporary.' },
      ...ANGABEN.map((a): Feld => ({ typ: 'text', key: a.key, label: a.de, max: a.max, platzhalter: a.platzhalter, hilfe: 'Optional.' })),
      { typ: 'abschnitt', label: 'Fotos' },
      { typ: 'bild', key: 'photo', label: 'Porträt', ordner: 'personen', form: 'relativ', hilfe: 'Groß oben auf dem Profil.' },
      { typ: 'text', key: 'photoCredit', label: 'Foto von' },
      { typ: 'liste', key: 'gallery', label: 'Galerie', neu: 'Foto hinzufügen', titel: (v) => v.caption ?? '', felder: [
        { typ: 'bild', key: 'photo', label: 'Foto', pflicht: true, ordner: 'personen', form: 'relativ' },
        { typ: 'text', key: 'caption', label: 'Bildunterschrift', en: true, hilfe: 'Beschreibt das Foto auch für Menschen, die es nicht sehen.' },
        { typ: 'text', key: 'credit', label: 'Foto von' },
      ] },
      { typ: 'auswahl', key: 'galleryLayout', label: 'Galerie zeigen als', optionen: Object.entries(GALERIE_LAYOUTS).map(([wert, l]) => ({ wert, label: `${l.de}: ${l.hilfe}` })) },
      { typ: 'abschnitt', label: 'Arbeiten' },
      { typ: 'liste', key: 'works', label: 'Stücke und Projekte', neu: 'Arbeit hinzufügen', titel: (v) => [v.year, v.title].filter(Boolean).join(' · '), felder: [
        { typ: 'text', key: 'year', label: 'Jahr', pflicht: true, max: 9, platzhalter: '2026', muster: [/^\d{4}(–\d{4})?$/, 'Format: 2026 oder 2024–2026'] },
        { typ: 'text', key: 'title', label: 'Titel', pflicht: true, max: 120 },
        { typ: 'text', key: 'place', label: 'Wo', max: 120, platzhalter: 'z. B. Welttanztag · Societaetstheater' },
      ] },
      { typ: 'abschnitt', label: 'Kontakt' },
      { typ: 'mehrfach', key: 'openFor', label: 'Offen für', optionen: Object.entries(OFFEN_FUER).map(([wert, l]) => ({ wert, label: l.de })) },
      { typ: 'email', key: 'email', label: 'Öffentliche E-Mail-Adresse', hilfe: 'Optional. Wird auf der Website gegen Spam geschützt.' },
      { typ: 'url', key: 'website', label: 'Website', hilfe: URL_HILFE },
      { typ: 'text', key: 'instagram', label: 'Instagram', platzhalter: '@name' },
      { typ: 'url', key: 'vimeo', label: 'Video oder Showreel', hilfe: `Vimeo, YouTube oder eigene Seite. ${URL_HILFE}` },
      { typ: 'janein', key: 'featured', label: 'Auf der Startseite zeigen', standard: true },
    ],
  },
  {
    id: 'orte',
    art: 'liste',
    label: 'Orte auf der Karte',
    einzahl: 'Ort',
    gruppe: 'Netzwerk & Partner',
    beschreibung: 'Spielorte und Partnerhäuser auf der Karte der Kooperationsseite.',
    datei: 'src/content/kooperation/orte.yaml',
    anlegen: true,
    loeschen: true,
    sortierung: 'hand',
    neueId: (d) => slugify(String(d.kurz || d.name || 'ort')),
    titel: (e) => e.data.name ?? e.id,
    info: (e) => [e.data.rolle, e.data.sitz ? 'Sitz' : ''].filter(Boolean).join(' · '),
    seite: () => 'kooperationen/',
    felder: [
      { typ: 'text', key: 'name', label: 'Name', pflicht: true },
      { typ: 'text', key: 'kurz', label: 'Kurzname auf der Karte', hilfe: 'Optional, sonst der Name.' },
      { typ: 'text', key: 'adresse', label: 'Adresse', platzhalter: 'z. B. Bautzner Straße 107, 01099 Dresden', hilfe: 'Optional. Steht im Tanzkalender unter dem Ort, wenn ein Termin dort stattfindet (Ort wie Name oder Kurzname).' },
      { typ: 'text', key: 'rolle', label: 'Was wir dort machen', pflicht: true, en: true },
      { typ: 'zahl', key: 'lat', label: 'Breitengrad', pflicht: true, min: -90, max: 90, schritt: 0.00001, hilfe: 'In OpenStreetMap: Rechtsklick → „Adresse anzeigen“, erste Zahl.' },
      { typ: 'zahl', key: 'lon', label: 'Längengrad', pflicht: true, min: -180, max: 180, schritt: 0.00001, hilfe: 'Zweite Zahl.' },
      { typ: 'verweis', key: 'verbunden', label: 'Linien zu', quelle: 'orte', mehrfach: true },
      { typ: 'url', key: 'url', label: 'Website', hilfe: URL_HILFE },
      { typ: 'janein', key: 'sitz', label: 'Sitz des Vereins (Ausgangspunkt des Netzes)', standard: false },
    ],
  },
  {
    id: 'partnergruppen',
    art: 'liste',
    label: 'Partner',
    einzahl: 'Partnergruppe',
    gruppe: 'Netzwerk & Partner',
    beschreibung: 'Partnerlisten auf der Kooperationsseite, nach Gruppen.',
    datei: 'src/content/kooperation/gruppen.yaml',
    anlegen: true,
    loeschen: true,
    sortierung: 'hand',
    neueId: (d) => slugify(String(d.titel ?? 'gruppe')),
    titel: (e) => e.data.titel ?? e.id,
    info: (e) => `${(e.data.partner ?? []).length} Partner`,
    seite: () => 'kooperationen/',
    felder: [
      { typ: 'text', key: 'titel', label: 'Gruppe', pflicht: true, en: true },
      { typ: 'liste', key: 'partner', label: 'Partner', pflicht: true, neu: 'Partner hinzufügen', titel: (v) => v.name ?? '', felder: [
        { typ: 'text', key: 'name', label: 'Name', pflicht: true },
        { typ: 'text', key: 'rolle', label: 'Was wir zusammen machen', pflicht: true, en: true },
        { typ: 'url', key: 'url', label: 'Website' },
      ] },
    ],
  },
  {
    id: 'arbeitsgruppen',
    art: 'einstellung',
    label: 'Arbeitsgruppen',
    einzahl: 'Arbeitsgruppen',
    gruppe: 'Netzwerk & Partner',
    beschreibung: 'Die AGs auf der Vereinsseite (und zur Auswahl im eigenen Profil).',
    datei: 'src/settings/arbeitsgruppen.json',
    wurzel: 'liste',
    titel: () => 'Arbeitsgruppen',
    seite: () => 'verein/',
    felder: [
      { typ: 'liste', key: 'liste', label: 'Arbeitsgruppen', pflicht: true, neu: 'AG hinzufügen', titel: (v) => v.name ?? '', felder: [
        { typ: 'text', key: 'name', label: 'Name', pflicht: true },
        { typ: 'textlang', key: 'text', label: 'Beschreibung', pflicht: true, en: true, zeilen: 2 },
      ] },
    ],
  },

  // ---------------- Startseite & Verein ----------------
  {
    id: 'hero',
    art: 'einstellung',
    label: 'Startseite: Kopf',
    einzahl: 'Kopf',
    gruppe: 'Startseite & Verein',
    beschreibung: '„Tanz für …“ mit den wechselnden Wörtern.',
    datei: 'src/settings/hero.json',
    titel: () => 'Startseite: Kopf',
    seite: () => '',
    felder: [
      { typ: 'text', key: 'claim.de.lead', label: 'Anfang', en: 'claim.en.lead', pflicht: true, platzhalter: 'Tanz für' },
      { typ: 'werte', key: 'claim.de.woerter', label: 'Wechselnde Wörter', en: 'claim.en.woerter', art: 'text', neu: 'Wort hinzufügen', hilfe: 'Laufen nacheinander durch. Leere Liste = Zeile ausblenden.' },
      { typ: 'zahl', key: 'wortPause', label: 'Sekunden pro Wort', pflicht: true, min: 1, max: 20, schritt: 0.5 },
    ],
  },
  {
    id: 'haltung',
    art: 'einstellung',
    label: 'Über uns: Haltung',
    einzahl: 'Haltung',
    gruppe: 'Startseite & Verein',
    beschreibung: 'Abschnitt „Haltung & Wirkung“ auf der Seite „Über uns“: Überschrift, vier Säulen, Auszeichnungen, Foto.',
    datei: 'src/settings/haltung.json',
    titel: () => 'Über uns: Haltung',
    seite: () => 'verein/',
    felder: [
      { typ: 'text', key: 'de.kicker', label: 'Kicker', en: 'en.kicker', pflicht: true },
      { typ: 'text', key: 'de.l1', label: 'Überschrift, Zeile 1', en: 'en.l1', pflicht: true },
      { typ: 'text', key: 'de.l2', label: 'Überschrift, Zeile 2 (Magenta)', en: 'en.l2', pflicht: true },
      { typ: 'textlang', key: 'de.lead', label: 'Einleitung', en: 'en.lead', pflicht: true },
      { typ: 'liste', key: 'de.saeulen', label: 'Säulen', en: 'en.saeulen', pflicht: true, neu: 'Säule hinzufügen', titel: (v) => v.titel ?? '', felder: [
        { typ: 'text', key: 'titel', label: 'Titel', pflicht: true },
        { typ: 'textlang', key: 'text', label: 'Text', pflicht: true, zeilen: 2 },
      ] },
      { typ: 'werte', key: 'de.auszeichnungen', label: 'Auszeichnungen', en: 'en.auszeichnungen', art: 'text', neu: 'Auszeichnung hinzufügen' },
      { typ: 'bild', key: 'foto.datei', label: 'Foto', ordner: 'photos', form: 'name', pflicht: true },
      { typ: 'text', key: 'foto.alt.de', label: 'Bildbeschreibung', en: 'foto.alt.en', pflicht: true, hilfe: BILD_ALT },
    ],
  },
  {
    id: 'verein',
    art: 'einstellung',
    label: 'Vereinsdaten',
    einzahl: 'Vereinsdaten',
    gruppe: 'Startseite & Verein',
    beschreibung: 'Claim, Zahlen, Training, Mitgliedschaft, Presse, Partner, Förderer, Spenden. Rechtliches nur Vorstand.',
    datei: 'src/settings/verein.json',
    braucht: ['formate'],
    titel: () => 'Vereinsdaten',
    seite: () => 'verein/',
    felder: [
      { typ: 'abschnitt', label: 'Auftritt' },
      { typ: 'text', key: 'claim', label: 'Claim', en: 'en.claim', pflicht: true },
      { typ: 'textlang', key: 'description', label: 'Kurzbeschreibung', en: 'en.description', pflicht: true, hilfe: 'Für Suchmaschinen und beim Teilen.' },
      { typ: 'zahl', key: 'founded', label: 'Gegründet', pflicht: true, min: 1990, max: 2100 },
      { typ: 'url', key: 'social.instagram', label: 'Instagram', hilfe: URL_HILFE },
      { typ: 'text', key: 'social.telegram', label: 'Telegram-Gruppe (Link)', hilfe: 'Für die Anmeldung zu KEEP UP-Workshops. Leer = Kontaktseite.' },
      { typ: 'liste', key: 'stats', label: 'Zahlen', en: 'en.stats', hilfe: 'Die erste Zahl steht auf der Startseite bei „Wer im Netz tanzt“ (z. B. 70+ Tanzschaffende).', neu: 'Zahl hinzufügen', titel: (v) => `${v.value ?? ''} ${v.label ?? ''}`, felder: [
        { typ: 'text', key: 'value', label: 'Zahl', pflicht: true, platzhalter: '70+' },
        { typ: 'text', key: 'label', label: 'Bedeutung', pflicht: true },
      ] },
      { typ: 'abschnitt', label: 'Training' },
      { typ: 'text', key: 'training.rhythm', label: 'Rhythmus', pflicht: true },
      { typ: 'text', key: 'training.rhythmNote', label: 'Rhythmus: Zusatz', en: 'en.training.rhythmNote', pflicht: true },
      { typ: 'text', key: 'training.fee', label: 'Beitrag', pflicht: true, hilfe: 'Zwei Preise mit „/“ trennen: regulär / Mitglieder.' },
      { typ: 'text', key: 'training.feeNote', label: 'Beitrag: Zusatz', en: 'en.training.feeNote', pflicht: true },
      { typ: 'text', key: 'training.place', label: 'Trainingsort', pflicht: true },
      { typ: 'text', key: 'training.placeAddress', label: 'Adresse des Trainingsorts', pflicht: true },
      { typ: 'abschnitt', label: 'Mitgliedschaft' },
      { typ: 'text', key: 'membership.fee', label: 'Mitgliedsbeitrag', en: 'en.membership.fee', pflicht: true },
      { typ: 'text', key: 'membership.feeNote', label: 'Beitrag: Zusatz', en: 'en.membership.feeNote', pflicht: true },
      { typ: 'pdf', key: 'membership.applicationPdf', label: 'Mitgliedsantrag (PDF)' },
      { typ: 'pdf', key: 'membership.statutesPdf', label: 'Satzung (PDF)' },
      { typ: 'abschnitt', label: 'Presse und Partner' },
      { typ: 'text', key: 'press.contact', label: 'Pressekontakt (Name)', pflicht: true },
      { typ: 'text', key: 'press.role', label: 'Funktion', en: 'en.press.role', pflicht: true },
      { typ: 'werte', key: 'partners', label: 'Partner auf der Startseite („Gemeinsam mit“)', en: 'en.partners', art: 'text', neu: 'Partner hinzufügen' },
      { typ: 'abschnitt', label: 'Förderer' },
      { typ: 'liste', key: 'funders', label: 'Förderer', neu: 'Förderer hinzufügen', titel: (v) => v.name ?? '', felder: [
        { typ: 'text', key: 'name', label: 'Name', pflicht: true, en: true },
        { typ: 'url', key: 'url', label: 'Website', pflicht: true },
        { typ: 'bild', key: 'logo', label: 'Logo', ordner: 'foerderer', form: 'name', hilfe: 'PNG mit transparentem Hintergrund. Leer = Name als Text.' },
        { typ: 'zahl', key: 'height', label: 'Höhe des Logos (px)', min: 24, max: 120 },
        { typ: 'textlang', key: 'notice', label: 'Pflicht-Förderhinweis', en: true, zeilen: 2, hilfe: 'Wortlaut laut Zuwendungsbescheid.' },
      ] },
      { typ: 'textlang', key: 'fundingText', label: 'Allgemeiner Förderhinweis', en: 'en.fundingText' },
      { typ: 'abschnitt', label: 'Spenden' },
      { typ: 'text', key: 'donation.reference', label: 'Verwendungszweck', en: 'en.donation.reference', pflicht: true, max: 140 },
      { typ: 'liste', key: 'donation.formate', label: 'Spenden: „Deine Spende wird Bewegung“', neu: 'Format hinzufügen', titel: (v) => v.format ?? '', hilfe: 'Bis zu sechs Formate mit Foto und Titel aus Formate.', felder: [
        { typ: 'verweis', key: 'format', label: 'Format', pflicht: true, quelle: 'formate' },
        { typ: 'text', key: 'meta', label: 'Zeile über dem Titel', pflicht: true, en: true, platzhalter: 'z. B. Seit 2022 · 3–5× pro Woche' },
        { typ: 'textlang', key: 'text', label: 'Text', pflicht: true, en: true, zeilen: 2 },
      ] },
      { typ: 'abschnitt', label: 'Kontakt und Bankverbindung', nurVorstand: true, hilfe: 'Ändert nur der Vorstand.' },
      { typ: 'text', key: 'address.street', label: 'Straße', pflicht: true },
      { typ: 'text', key: 'address.zip', label: 'PLZ', pflicht: true },
      { typ: 'text', key: 'address.city', label: 'Ort', pflicht: true },
      { typ: 'text', key: 'phone', label: 'Telefon', pflicht: true },
      { typ: 'email', key: 'emails.kontakt', label: 'E-Mail Kontakt', pflicht: true },
      { typ: 'email', key: 'emails.vorstand', label: 'E-Mail Vorstand', pflicht: true },
      { typ: 'email', key: 'emails.datenschutz', label: 'E-Mail Datenschutz', pflicht: true },
      { typ: 'text', key: 'donation.accountHolder', label: 'Kontoinhaber', pflicht: true },
      { typ: 'text', key: 'donation.iban', label: 'IBAN', hilfe: 'Leer = Bankverbindung wird nicht angezeigt.' },
      { typ: 'text', key: 'donation.bic', label: 'BIC' },
      { typ: 'text', key: 'donation.bank', label: 'Bank' },
      { typ: 'url', key: 'donation.onlineUrl', label: 'Online-Spendenformular (Link)' },
      { typ: 'text', key: 'donation.onlineProvider', label: 'Anbieter des Spendenformulars' },
      { typ: 'abschnitt', label: 'Rechtliches (Impressum, Transparenz)', nurVorstand: true, hilfe: 'Ändert nur der Vorstand.' },
      { typ: 'text', key: 'legalName', label: 'Name laut Register', pflicht: true },
      { typ: 'text', key: 'register.court', label: 'Registergericht', pflicht: true },
      { typ: 'text', key: 'register.number', label: 'Registernummer', pflicht: true },
      { typ: 'text', key: 'register.representatives', label: 'Vertreten durch', pflicht: true },
      { typ: 'textlang', key: 'register.representationNote', label: 'Hinweis zur Vertretung', en: 'en.register.representationNote', pflicht: true },
      { typ: 'text', key: 'register.contentResponsible', label: 'Inhaltlich verantwortlich', pflicht: true },
      { typ: 'textlang', key: 'register.taxNote', label: 'Hinweis Gemeinnützigkeit', en: 'en.register.taxNote', pflicht: true },
      { typ: 'text', key: 'taxExemption.purpose', label: 'Steuerbegünstigter Zweck', en: 'taxExemption.purpose_en', pflicht: true },
      { typ: 'text', key: 'taxExemption.office', label: 'Finanzamt', pflicht: true },
      { typ: 'text', key: 'taxExemption.taxNumber', label: 'Steuernummer', pflicht: true },
      { typ: 'text', key: 'taxExemption.noticeDate', label: 'Datum des Freistellungsbescheids', pflicht: true },
      { typ: 'text', key: 'taxExemption.period', label: 'Veranlagungszeitraum', pflicht: true },
    ],
  },

  // ---------------- Textseiten ----------------
  {
    id: 'seiten',
    art: 'ordner',
    label: 'Textseiten',
    einzahl: 'Textseite',
    gruppe: 'Textseiten',
    beschreibung: 'Transparenz, Barrierefreiheit, Leichte Sprache. Impressum und Datenschutz ändert nur der Vorstand.',
    ordner: 'src/content/seiten',
    ohne: /\//,
    uebersetzung: (id) => `src/content/seiten/en/${id}.md`,
    enPflicht: ['title'],
    anlegen: false,
    loeschen: false,
    sortierung: { feld: 'title' },
    nurVorstand: (id) => id === 'impressum' || id === 'datenschutz',
    titel: (e) => e.data.title ?? e.id,
    info: (e) => [e.data.updated ? `Stand ${datumDe(e.data.updated)}` : '', e.en?.data.title ? 'DE/EN' : 'nur DE'].filter(Boolean).join(' · '),
    seite: (e) => (seitenRouten[e.id] ? routes[seitenRouten[e.id]].de : null),
    felder: [
      { typ: 'text', key: 'title', label: 'Titel', pflicht: true, en: true },
      { typ: 'textlang', key: 'description', label: 'Kurzbeschreibung', en: true, zeilen: 2, hilfe: 'Für Suchmaschinen.' },
      { typ: 'datum', key: 'updated', label: 'Stand' },
      { typ: 'markdown', key: 'body', label: 'Text', en: true, hilfe: 'Zwischenüberschriften erscheinen im Inhaltsverzeichnis.' },
    ],
  },
];

export const bereich = (id: string | null) => bereiche.find((b) => b.id === id);
export const gruppen = [...new Set(bereiche.map((b) => b.gruppe))];
