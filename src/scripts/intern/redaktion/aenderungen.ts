/**
 * Änderungen (Website-Inhalte → Änderungen): alles, was die Redaktion geändert hat, an einer Stelle.
 *
 * Zwei Quellen, zusammengeführt und nach Zeit sortiert:
 *  - Dateien (Texte, Seiten, Formate, Fotos der Seiten, PDFs): die Speicherungen der Redaktion im Git-Verlauf,
 *    über die Funktion „inhalte“ (Aktionen verlauf/aenderung; Commits der Entwicklung bleiben draußen).
 *  - Datenbank (Beiträge, Termine, KEEP UP, Mediathek, Freigaben, Rollen): Tabelle public.aenderungen, die
 *    Trigger füllen (supabase/migrations/20261105000000_aenderungen.sql) – nur die geänderten Felder.
 * Wiederherstellen gibt es bewusst nicht; dafür bitte den Vorstand oder Admin fragen.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Api, CommitDatei, VerlaufCommit } from './api';
import { bereiche, type Bereich, type Feld } from './bereiche';
import { h } from '../../dom';

export type Kategorie = 'texte' | 'inhalte' | 'beitraege' | 'termine' | 'keepup' | 'medien' | 'freigaben' | 'rollen';
export const KATEGORIEN: Record<Kategorie, string> = {
  texte: 'Texte',
  inhalte: 'Seiten und Listen',
  beitraege: 'Beiträge',
  termine: 'Termine',
  keepup: 'KEEP UP',
  medien: 'Fotos und Dokumente',
  freigaben: 'Freigaben',
  rollen: 'Rollen',
};

export interface DbZeile {
  id: number;
  zeit: string;
  bereich: string;
  eintrag: string;
  titel: string;
  aktion: 'angelegt' | 'geaendert' | 'geloescht';
  von_name: string;
  vorher: Record<string, unknown> | null;
  nachher: Record<string, unknown> | null;
}

export interface LogEintrag {
  schluessel: string;
  zeit: string;
  kategorie: Kategorie;
  /** wo auf der Website / in der Redaktion, z. B. „Formate“ */
  wo: string;
  titel: string;
  von: string;
  commit?: VerlaufCommit;
  db?: DbZeile;
}

export interface Geladen {
  eintraege: LogEintrag[];
  /** Hinweise, z. B. wenn eine Quelle fehlt oder nicht alles geladen ist */
  hinweise: string[];
}

// ---------- Dateien: Pfad → Bereich ----------

const TEXTE = 'src/settings/texte.json';

function bereichVonPfad(p: string): Bereich | undefined {
  return bereiche.find((b) => {
    if (b.art !== 'ordner') return b.datei === p;
    if (p.startsWith(`${b.ordner}/`)) return true;
    const en = b.uebersetzung?.('\u0000');
    return !!en && p.startsWith(en.split('\u0000')[0]);
  });
}

const kategorieVon = (b: Bereich): Kategorie =>
  b.id === 'termine' ? 'termine' : b.id.startsWith('news') ? 'beitraege' : ['wochen', 'dozentinnen', 'keep-up-texte'].includes(b.id) ? 'keepup' : 'inhalte';

function ortVonPfad(p: string): { kategorie: Kategorie; wo: string; bereich?: Bereich } {
  if (p === TEXTE) return { kategorie: 'texte', wo: 'Texte' };
  if (p.startsWith('src/assets/')) return { kategorie: 'medien', wo: 'Fotos der Seiten' };
  if (p.startsWith('public/downloads/')) return { kategorie: 'medien', wo: 'Dokumente' };
  const b = bereichVonPfad(p);
  return b ? { kategorie: kategorieVon(b), wo: b.label, bereich: b } : { kategorie: 'inhalte', wo: 'Website' };
}

/** ältere Speicherungen ohne Dateiliste: aus dem Titel („Format „POP UP“ geändert“, „Texte: …“) */
function ortVonTitel(titel: string): { kategorie: Kategorie; wo: string } {
  if (titel.startsWith('Texte:')) return { kategorie: 'texte', wo: 'Texte' };
  if (/^(Foto|Dokument|\d+ Dokumente)\b/.test(titel)) return { kategorie: 'medien', wo: titel.startsWith('Foto') ? 'Fotos der Seiten' : 'Dokumente' };
  const b = bereiche.find((x) => titel.startsWith(`${x.einzahl} „`) || titel.startsWith(`${x.label}:`));
  return b ? { kategorie: kategorieVon(b), wo: b.label } : { kategorie: 'inhalte', wo: 'Website' };
}

function ausCommit(c: VerlaufCommit): LogEintrag {
  const orte = c.dateien.map(ortVonPfad);
  const haupt = orte.find((o) => o.kategorie !== 'medien') ?? orte[0] ?? ortVonTitel(c.titel);
  const wo = [...new Set(orte.map((o) => o.wo))].join(' · ') || haupt.wo;
  return { schluessel: `c:${c.sha}`, zeit: c.zeit, kategorie: haupt.kategorie, wo, titel: c.titel, von: c.von, commit: c };
}

// ---------- Datenbank ----------

const DB_ORT: Record<string, { kategorie: Kategorie; wo: string; einzahl: string }> = {
  beitraege: { kategorie: 'beitraege', wo: 'Beiträge', einzahl: 'Beitrag' },
  termine: { kategorie: 'termine', wo: 'Termine', einzahl: 'Termin' },
  keepup: { kategorie: 'keepup', wo: 'KEEP UP', einzahl: 'KEEP UP-Training' },
  medien: { kategorie: 'medien', wo: 'Fotos für Beiträge', einzahl: 'Foto' },
  freigaben: { kategorie: 'freigaben', wo: 'Freigaben', einzahl: 'Profil' },
  rollen: { kategorie: 'rollen', wo: 'Rollen', einzahl: 'Rolle' },
};
const AKTION = { angelegt: 'angelegt', geaendert: 'geändert', geloescht: 'gelöscht' } as const;
const ROLLEN: Record<string, string> = { mitglied: 'Mitglied', presse: 'Presse', vorstand: 'Vorstand', admin: 'Admin' };

const geaendert = (z: DbZeile, k: string) => !!z.nachher && k in z.nachher && JSON.stringify(z.nachher[k]) !== JSON.stringify(z.vorher?.[k]);

/** Satz für eine Zeile der Datenbank, z. B. „Beitrag „Open Call“ veröffentlicht“ */
export function dbTitel(z: DbZeile): string {
  const o = DB_ORT[z.bereich] ?? { einzahl: 'Eintrag' };
  const name = z.bereich === 'medien' ? (z.titel.split('/').pop() ?? z.titel) : z.titel;
  const n = z.nachher ?? {};
  if (z.bereich === 'freigaben') {
    if (geaendert(z, 'verified')) return `Profil von ${name} ${n.verified ? 'freigegeben' : 'von der Website genommen'}`;
    if (geaendert(z, 'photo_path')) return `Foto von ${name} ${n.photo_path ? 'freigegeben' : 'entfernt'}`;
    return `Profil von ${name} geändert`;
  }
  if (z.bereich === 'rollen') return `Rolle von ${name}: ${ROLLEN[String(z.vorher?.role)] ?? z.vorher?.role} → ${ROLLEN[String(n.role)] ?? n.role}`;
  let was: string = AKTION[z.aktion];
  if (z.aktion === 'geaendert') {
    const nur = Object.keys(n).filter((k) => geaendert(z, k));
    if (geaendert(z, 'status')) was = n.status === 'veroeffentlicht' ? 'veröffentlicht' : 'zurück zum Entwurf';
    else if (nur.length === 1 && nur[0] === 'sichtbar') was = n.sichtbar ? 'wieder eingeblendet' : 'ausgeblendet';
  }
  return `${o.einzahl} „${name}“ ${was}`;
}

function ausDb(z: DbZeile): LogEintrag {
  const o = DB_ORT[z.bereich] ?? { kategorie: 'inhalte' as Kategorie, wo: z.bereich };
  return { schluessel: `d:${z.id}`, zeit: z.zeit, kategorie: o.kategorie, wo: o.wo, titel: dbTitel(z), von: z.von_name || 'Datenbank', db: z };
}

// ---------- Laden ----------

/** Änderungen seit „seit“ (ISO), neueste zuerst */
export async function logLaden(sb: SupabaseClient, a: Api, seit: string): Promise<Geladen> {
  const hinweise: string[] = [];
  const [commits, db] = await Promise.all([
    a.verlauf(seit).catch((e: Error) => {
      // ältere Fassung der Funktion „inhalte“ kennt die Aktion „verlauf“ noch nicht (docs/redaktion.md: neu einspielen)
      hinweise.push(/Unbekannte Aktion/.test(e.message)
        ? 'Änderungen an Texten und Seiten erscheinen hier, sobald die Redaktion in Supabase auf den neuesten Stand gebracht ist. Bitte gib dem Admin Bescheid.'
        : `Änderungen an Texten und Seiten konnten nicht geladen werden: ${e.message}`);
      return { eintraege: [], mehr: false };
    }),
    sb.from('aenderungen').select('id,zeit,bereich,eintrag,titel,aktion,von_name,vorher,nachher').gte('zeit', seit).order('zeit', { ascending: false }).limit(1000),
  ]);
  if (commits.mehr) hinweise.push('Es gibt mehr Änderungen an Texten und Seiten, als hier angezeigt werden. Wähle einen kürzeren Zeitraum.');
  let zeilen: DbZeile[] = [];
  if (db.error) {
    const fehlt = ['42P01', 'PGRST205'].includes(db.error.code ?? '') || /aenderungen/.test(db.error.message);
    hinweise.push(
      fehlt
        ? 'Beiträge, Termine, Fotos für Beiträge und Freigaben erscheinen hier, sobald die Datenbank dafür erweitert ist. Bitte gib dem Admin Bescheid.'
        : `Änderungen an Beiträgen, Terminen und Fotos konnten nicht geladen werden: ${db.error.message}`,
    );
  } else {
    zeilen = (db.data ?? []) as DbZeile[];
    if (zeilen.length >= 1000) hinweise.push('Es gibt mehr Änderungen an Beiträgen und Terminen, als hier angezeigt werden. Wähle einen kürzeren Zeitraum.');
  }
  const eintraege = [...commits.eintraege.map(ausCommit), ...zeilen.map(ausDb)].sort((x, y) => y.zeit.localeCompare(x.zeit));
  return { eintraege, hinweise };
}

// ---------- vorher/nachher ----------

const FELDER: Record<string, string> = {
  title: 'Titel', teaser: 'Kurztext', body: 'Text', status: 'Status', category: 'Rubrik', date: 'Datum', author: 'Autor:in',
  featured: 'Hervorgehoben', deadline: 'Frist', facts: 'Eckdaten', image_path: 'Titelbild', image_alt: 'Bildbeschreibung',
  image_credit: 'Bildnachweis', quote_text: 'Zitat', quote_who: 'Zitat von', quote_role: 'Zitat: Funktion', slug: 'Adresse',
  titel: 'Titel', datum: 'Datum', von: 'Beginn', bis: 'Ende', zeit_text: 'Zeit (als Text)', ort: 'Ort', kategorie: 'Kategorie',
  kurz: 'Kurztext', text: 'Text', link: 'Link', format: 'Format', personen: 'Personen', news: 'Beitrag', eintritt: 'Eintritt',
  sichtbar: 'Auf der Website anzeigen', draft: 'Ausgeblendet', alt: 'Bildbeschreibung', credit: 'Bildnachweis', focus: 'Bildausschnitt',
  datei: 'Datei', verified: 'Profil freigegeben', photo_path: 'Foto', role: 'Rolle', dozent: 'Dozent:in', woche: 'Woche',
  tage: 'Tage', zeit: 'Zeit', notiz: 'Notiz', schwerpunkte: 'Schwerpunkte', mitbringen: 'Mitbringen', bild: 'Bild',
  bild_alt: 'Bildbeschreibung', veroeffentlicht_am: 'Veröffentlicht am', art: 'Art', de: 'Deutsch', en: 'Englisch',
};

function feldLabels(b?: Bereich): Map<string, string> {
  const m = new Map<string, string>();
  const rein = (fs: Feld[]) => {
    for (const f of fs) {
      if (!f.key) continue;
      const key = f.key.split('.').pop()!;
      if (!m.has(key)) m.set(key, f.label);
      if (f.typ === 'liste') rein(f.felder);
    }
  };
  if (b) rein(b.felder);
  return m;
}

function label(key: string, eigene?: Map<string, string>): string {
  const en = key.endsWith('_en');
  const basis = en ? key.slice(0, -3) : key;
  const l = eigene?.get(basis) ?? FELDER[basis] ?? basis.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  return en ? `${l} (Englisch)` : l;
}

function wert(v: unknown, key = ''): string {
  if (v === null || v === undefined || v === '') return '(leer)';
  if (typeof v === 'boolean') return v ? 'Ja' : 'Nein';
  if (key === 'role') return ROLLEN[String(v)] ?? String(v);
  if (key === 'status') return v === 'veroeffentlicht' ? 'Veröffentlicht' : v === 'entwurf' ? 'Entwurf' : String(v);
  if (Array.isArray(v) && v.every((x) => typeof x !== 'object')) return v.length ? v.join(', ') : '(leer)';
  if (typeof v === 'object') return JSON.stringify(v, null, 2);
  return String(v);
}

/** Zeilenweiser Vergleich (kleinste Änderung), für lange Texte */
export function zeilenDiff(alt: string[], neu: string[]): { art: ' ' | '-' | '+'; text: string }[] {
  const n = alt.length;
  const m = neu.length;
  if (n * m > 4_000_000) return [...alt.map((t) => ({ art: '-' as const, text: t })), ...neu.map((t) => ({ art: '+' as const, text: t }))];
  const l: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) l[i][j] = alt[i] === neu[j] ? l[i + 1][j + 1] + 1 : Math.max(l[i + 1][j], l[i][j + 1]);
  const out: { art: ' ' | '-' | '+'; text: string }[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (alt[i] === neu[j]) {
      out.push({ art: ' ', text: alt[i] });
      i++;
      j++;
    } else if (l[i + 1][j] >= l[i][j + 1]) out.push({ art: '-', text: alt[i++] });
    else out.push({ art: '+', text: neu[j++] });
  }
  while (i < n) out.push({ art: '-', text: alt[i++] });
  while (j < m) out.push({ art: '+', text: neu[j++] });
  return out;
}

const zeile = (art: ' ' | '-' | '+', text: string) =>
  h('div', { class: `ae-z ae-z--${art === '-' ? 'alt' : art === '+' ? 'neu' : 'gleich'}` },
    h('span', { class: 'ae-z__m', 'aria-hidden': 'true', text: art === '-' ? '−' : art === '+' ? '+' : '' }),
    h('span', { class: 'visually-hidden', text: art === '-' ? 'Vorher: ' : art === '+' ? 'Nachher: ' : '' }),
    h('span', { class: 'ae-z__t', text: text || ' ' }));

/** ein Feld: kurz als „vorher → nachher“, lange Texte zeilenweise mit dem, was weg ist und was dazukam */
function feldVergleich(name: string, key: string, vorher: unknown, nachher: unknown, aktion: DbZeile['aktion']): HTMLElement {
  const a = wert(vorher, key);
  const n = wert(nachher, key);
  const lang = (s: string) => s.includes('\n') || s.length > 160;
  const box = h('div', { class: 'ae-feld' }, h('p', { class: 'ae-feld__n', text: name }));
  if (aktion === 'angelegt') box.append(zeile('+', n));
  else if (aktion === 'geloescht') box.append(zeile('-', a));
  else if (lang(a) || lang(n)) {
    const d = zeilenDiff(a === '(leer)' ? [] : a.split('\n'), n === '(leer)' ? [] : n.split('\n'));
    // nur Geändertes und je eine Zeile davor und danach
    d.forEach((z, i) => {
      const nachbar = (x?: { art: string }) => !!x && x.art !== ' ';
      if (z.art !== ' ' || (z.text.trim() && (nachbar(d[i - 1]) || nachbar(d[i + 1])))) box.append(zeile(z.art, z.text));
    });
  } else box.append(zeile('-', a), zeile('+', n));
  return box;
}

/** vorher/nachher einer Zeile der Datenbank */
export function dbVergleich(z: DbZeile): HTMLElement {
  const box = h('div', { class: 'ae-vergleich' });
  const keys = [...new Set([...Object.keys(z.vorher ?? {}), ...Object.keys(z.nachher ?? {})])].filter(
    (k) => z.aktion !== 'geaendert' || JSON.stringify(z.vorher?.[k]) !== JSON.stringify(z.nachher?.[k]),
  );
  const leer = (v: unknown) => v === null || v === '' || (Array.isArray(v) && !v.length);
  for (const k of keys) {
    const v = z.vorher?.[k];
    const n = z.nachher?.[k];
    if (z.aktion !== 'geaendert' && leer(z.aktion === 'angelegt' ? n : v)) continue;
    box.append(feldVergleich(label(k), k, v, n, z.aktion));
  }
  if (!box.childElementCount) box.append(h('p', { class: 'i-hint', text: 'Am Ende war wieder alles wie vorher.' }));
  return box;
}

// Zeilen einer Datei lesbar machen: „"lead": "Text",“ → Feld „Einleitung“, Wert „Text“
const JSON_ZEILE = /^\s*"([^"]+)":\s*(.*?),?\s*$/;
const YAML_ZEILE = /^\s*(?:- )?([A-Za-z_][\w]*):\s?(.*)$/;
const NUR_KLAMMERN = /^\s*[[\]{},]*\s*$/;

function unquote(v: string): string {
  const t = v.trim();
  if (t.startsWith('"')) {
    try {
      return JSON.parse(t.replace(/,$/, ''));
    } catch {
      return t;
    }
  }
  return t.replace(/^'(.*)'$/, '$1');
}

/** eine Zeile aus dem Vergleich einer Datei; null = nur Klammern o. Ä. */
function dateiZeile(text: string, json: boolean, labels: Map<string, string>, oben: string): string | null {
  if (NUR_KLAMMERN.test(text)) return null;
  const m = (json ? JSON_ZEILE : YAML_ZEILE).exec(text);
  if (!m) return text.trim();
  const [, key, v] = m;
  const w = unquote(v);
  if (w === '{' || w === '[' || w === '|' || w === '>-' || w === '') return `${label(key, labels)}:`;
  const name = (key === 'de' || key === 'en') && oben ? `${oben} · ${label(key, labels)}` : label(key, labels);
  return `${name}: ${w}`;
}

/** vorher/nachher einer Speicherung (Commit): je Datei die geänderten Zeilen */
export function dateiVergleich(dateien: CommitDatei[]): HTMLElement {
  const box = h('div', { class: 'ae-vergleich' });
  for (const d of dateien) {
    const ort = ortVonPfad(d.pfad);
    const labels = feldLabels(ort.bereich);
    const titel = `${ort.wo}${/\/en\//.test(d.pfad) ? ' (Englisch)' : ''}`;
    const teil = h('div', { class: 'ae-feld' }, h('p', { class: 'ae-feld__n', text: titel }));
    if (!d.patch) {
      const was = d.status === 'added' ? 'neu hochgeladen' : d.status === 'removed' ? 'gelöscht' : 'ersetzt';
      teil.append(h('p', { class: 'i-hint', text: `${d.pfad.split('/').pop()}: ${was}` }));
    } else {
      const json = d.pfad.endsWith('.json');
      let oben = '';
      for (const roh of d.patch.split('\n')) {
        if (roh.startsWith('@@')) {
          if (teil.childElementCount > 1) teil.append(h('div', { class: 'ae-z ae-z--luecke', 'aria-hidden': 'true', text: '…' }));
          continue;
        }
        const art = roh[0] === '-' ? '-' : roh[0] === '+' ? '+' : ' ';
        const text = roh.slice(1);
        const k = (json ? JSON_ZEILE : YAML_ZEILE).exec(text);
        if (k && /^\s*[{[]\s*$/.test(k[2]) && k[1] !== 'de' && k[1] !== 'en') oben = label(k[1], labels);
        if (art === ' ') continue;
        const z = dateiZeile(text, json, labels, oben);
        if (z !== null) teil.append(zeile(art, z));
      }
      if (d.gekuerzt) teil.append(h('p', { class: 'i-hint', text: 'Sehr lange Änderung: nur der Anfang wird gezeigt.' }));
    }
    box.append(teil);
  }
  if (!dateien.length) box.append(h('p', { class: 'i-hint', text: 'Keine Einzelheiten verfügbar.' }));
  return box;
}

// ---------- Darstellung ----------

const uhr = (iso: string) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
export const tagVon = (iso: string) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(iso));
export const tagName = (tag: string) =>
  new Date(`${tag}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** eine Zeile im Verlauf; mitVergleich = „Was wurde geändert?“ zum Aufklappen */
export function eintragElement(e: LogEintrag, a: Api, mitVergleich = true): HTMLLIElement {
  const li = h('li', { class: 'ae', 'data-kategorie': e.kategorie },
    h('div', { class: 'ae__kopf' },
      h('time', { class: 'ae__zeit', datetime: e.zeit, text: uhr(e.zeit) }),
      h('span', { class: 'ae__wo', text: e.wo }),
      h('span', { class: 'ae__titel', text: e.titel }),
      h('span', { class: 'ae__von', text: e.von })));
  if (!mitVergleich) return li;
  const inhalt = h('div', { class: 'ae__inhalt' });
  const det = h('details', { class: 'ae__mehr' }, h('summary', { text: 'Was wurde geändert?' }), inhalt);
  let geladen = false;
  det.addEventListener('toggle', async () => {
    if (!det.open || geladen) return;
    geladen = true;
    if (e.db) inhalt.append(dbVergleich(e.db));
    else if (e.commit) {
      inhalt.append(h('p', { class: 'i-hint', text: 'Wird geladen …' }));
      try {
        const r = await a.aenderung(e.commit.sha);
        inhalt.replaceChildren(dateiVergleich(r.dateien));
      } catch (err) {
        geladen = false;
        inhalt.replaceChildren(h('p', { class: 'i-hint', text: `Konnte nicht geladen werden: ${(err as Error).message}` }));
      }
    }
  });
  li.append(det);
  return li;
}
