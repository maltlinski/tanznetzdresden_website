/**
 * KEEP UP · Profitraining: Trainingswochen (src/content/keep-up/wochen.yaml), Dozent:innen
 * (keep-up/dozentinnen.yaml + Profile) und Workshops (Termine mit `format: keep-up`)
 * werden hier zu einem Kalender nach Tagen zusammengeführt.
 */
import type { ImageMetadata } from 'astro';
import { getCollection } from 'astro:content';
import dozentinnenRaw from '../content/keep-up/dozentinnen.yaml?raw';
import { getTermine, inFileOrder } from './content';
import { getProfiles } from './profiles';
import { getVerein } from './settings';
import { dateLocale, loc, url, type Lang } from './i18n';
import { platzhalterFotos } from '../settings/keep-up';

export interface Einheit {
  kind: 'training' | 'workshop';
  /** „10:00–11:30“ */
  time: string;
  /** Kürzel der Dozent:in (falls im Stapel) */
  tr?: string;
  who: string;
  /** Stil (Training) bzw. Titel (Workshop) */
  what: string;
  where: string;
  /** Terminseite (Workshop) */
  href?: string;
}

export interface Dozentin {
  id: string;
  name: string;
  first: string;
  stil: string;
  text: string;
  photo: ImageMetadata | string;
  /** Platzhalterfoto, nicht die Person */
  placeholder: boolean;
  profile: string;
  /** Trainingswochen [erster Tag, letzter Tag] als JJJJ-MM-TT */
  weeks: [string, string][];
}

export interface KalenderTag {
  date: string;
  day: number;
  items: Einheit[];
}

export interface Monat {
  key: string;
  label: string;
  /** Montag zuerst; null = Feld vor dem 1. bzw. nach dem Monatsende */
  cells: (KalenderTag | null)[];
}

const TAGE = ['mo', 'di', 'mi', 'do', 'fr', 'sa', 'so'] as const;
const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);
const addDays = (iso: string, n: number) => {
  const d = utc(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const fotos = import.meta.glob<{ default: ImageMetadata }>('../assets/photos/*.{jpg,jpeg,png,webp}', { eager: true });

/** Heutiges Datum (Dresden) als JJJJ-MM-TT */
export function todayKey(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
}

/** „12.–16. Okt.“ bzw. „12–16 Oct“ – dieselbe Formatierung nutzt der Browser (Profitraining-Seite). */
export function weekLabel(lang: Lang, [a, b]: [string, string]): string {
  return new Intl.DateTimeFormat(dateLocale[lang], { day: 'numeric', month: 'short', timeZone: 'UTC' }).formatRange(utc(a), utc(b));
}

export async function getKeepUp(lang: Lang) {
  const verein = getVerein(lang);
  const profiles = new Map((await getProfiles()).map((p) => [p.id, p]));
  const eintraege = inFileOrder(await getCollection('keepUpDozentinnen'), dozentinnenRaw);
  const wochen = (await getCollection('keepUpWochen')).sort((a, b) => a.id.localeCompare(b.id));

  const dozentinnen: Dozentin[] = eintraege.map(({ id, data }, i) => {
    const p = profiles.get(id);
    if (!p) throw new Error(`src/content/keep-up/dozentinnen.yaml: „${id}“ fehlt in src/content/personen.yaml`);
    const platzhalter = fotos[`../assets/photos/${platzhalterFotos[i % platzhalterFotos.length]}`];
    const photo = data.foto ?? p.photo ?? platzhalter?.default;
    if (!photo) throw new Error(`src/settings/keep-up.ts: Platzhalterfoto „${platzhalterFotos[i % platzhalterFotos.length]}“ fehlt`);
    return {
      id,
      name: p.name,
      first: p.name.split(/\s+/)[0],
      stil: loc(data, 'stil', lang),
      text: loc(data, 'text', lang),
      photo,
      placeholder: !data.foto && !p.photo,
      profile: url(lang, 'netzwerk', `${id}/`),
      weeks: [],
    };
  });
  const byId = new Map(dozentinnen.map((d) => [d.id, d]));

  const days = new Map<string, Einheit[]>();
  const add = (date: string, e: Einheit) => days.set(date, [...(days.get(date) ?? []), e]);

  for (const w of wochen) {
    if (utc(w.id).getUTCDay() !== 1) throw new Error(`src/content/keep-up/wochen.yaml: „${w.id}“ ist kein Montag`);
    const d = byId.get(w.data.dozent.id);
    if (!d) throw new Error(`src/content/keep-up/wochen.yaml: Dozent:in „${w.data.dozent.id}“ fehlt in dozentinnen.yaml`);
    const offsets = w.data.tage.map((t) => TAGE.indexOf(t)).sort((a, b) => a - b);
    for (const o of offsets) {
      add(addDays(w.id, o), {
        kind: 'training',
        time: w.data.zeit.replace(/\s*[–-]\s*/, '–'),
        tr: d.id,
        who: d.name,
        what: d.stil,
        where: w.data.ort ?? verein.training.place,
      });
    }
    d.weeks.push([addDays(w.id, offsets[0]), addDays(w.id, offsets[offsets.length - 1])]);
  }

  for (const t of await getTermine()) {
    if (t.data.format?.id !== 'keep-up') continue;
    const [date, from] = t.data.start.split(' ');
    const to = t.data.end?.split(' ')[1];
    const person = t.data.people[0]?.id;
    add(date, {
      kind: 'workshop',
      time: to ? `${from}–${to}` : from,
      tr: person && byId.has(person) ? person : undefined,
      who: (person && profiles.get(person)?.name) ?? '',
      what: loc(t.data, 'title', lang),
      where: t.data.venue,
      href: url(lang, 'termine', `${t.id}/`),
    });
  }
  for (const list of days.values()) list.sort((a, b) => a.time.localeCompare(b.time));

  // Monatsraster vom ersten bis zum letzten Termin
  const keys = [...days.keys()].sort();
  const months: Monat[] = [];
  if (keys.length) {
    const monthFmt = new Intl.DateTimeFormat(dateLocale[lang], { month: 'long', year: 'numeric', timeZone: 'UTC' });
    let [y, m] = keys[0].split('-').map(Number);
    const [ly, lm] = keys[keys.length - 1].split('-').map(Number);
    while (y < ly || (y === ly && m <= lm)) {
      const key = `${y}-${String(m).padStart(2, '0')}`;
      const first = utc(`${key}-01`);
      const lead = (first.getUTCDay() + 6) % 7;
      const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const cells: (KalenderTag | null)[] = Array(lead).fill(null);
      for (let d = 1; d <= count; d++) {
        const date = `${key}-${String(d).padStart(2, '0')}`;
        cells.push({ date, day: d, items: days.get(date) ?? [] });
      }
      while (cells.length % 7) cells.push(null);
      months.push({ key, label: monthFmt.format(first), cells });
      if (++m > 12) { m = 1; y++; }
    }
  }

  return { dozentinnen, days: Object.fromEntries(keys.map((k) => [k, days.get(k)!])), months };
}
