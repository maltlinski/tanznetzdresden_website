/**
 * KEEP UP · Profitraining: Trainingswochen (src/content/keep-up/wochen.yaml), Dozent:innen
 * (keep-up/dozentinnen.yaml + Profile) und Workshops (Termine mit `format: keep-up`)
 * werden hier zu Kalendertagen zusammengeführt. Die Trainingstage erscheinen auch im Tanzkalender.
 */
import type { ImageMetadata } from 'astro';
import { getCollection } from 'astro:content';
import dozentinnenRaw from '../content/keep-up/dozentinnen.yaml?raw';
import { getTermine, inFileOrder } from './content';
import { getProfiles } from './profiles';
import { getVerein } from './settings';
import { dateLocale, loc, tr, url, type Lang } from './i18n';
import { monate, type KalenderEintrag, type Tage } from './kalender';
import { platzhalterFotos } from '../settings/keep-up';

export interface Dozentin {
  id: string;
  name: string;
  first: string;
  stil: string;
  text: string;
  photo: ImageMetadata | string;
  /** Platzhalterfoto, nicht die Person */
  placeholder: boolean;
  /** Profilseite (leer, wenn es kein öffentliches Profil gibt) */
  profile: string;
  /** Trainingswochen [erster Tag, letzter Tag] als JJJJ-MM-TT */
  weeks: [string, string][];
}

/** Ein Trainingstag (für den Tanzkalender) */
export interface Training {
  date: string;
  time: string;
  dozentin: Dozentin;
  where: string;
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
  const t = tr(lang, {
    de: { training: 'Training', workshop: 'Workshop', with: 'mit', toCard: 'Zur Dozent:in →', toEvent: 'Zum Workshop →' },
    en: { training: 'Training', workshop: 'Workshop', with: 'with', toCard: 'Meet the teacher →', toEvent: 'About the workshop →' },
  });

  // Name, Profil und Foto kommen aus dem Profil der Person (personen.yaml oder selbst gepflegt).
  // Fehlt das Profil (z. B. nicht mehr öffentlich), bleibt das Training mit dem Namen aus dem Kürzel stehen.
  const dozentinnen: Dozentin[] = eintraege.map(({ id, data }, i) => {
    const p = profiles.get(id);
    if (!p) console.warn(`[keep-up] Dozent:in „${id}“ hat kein öffentliches Profil – Name aus dem Kürzel, ohne Foto.`);
    const name = p?.name ?? id.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
    const datei = platzhalterFotos[i % platzhalterFotos.length];
    const photo = p?.photo ?? fotos[`../assets/photos/${datei}`]?.default;
    if (!photo) throw new Error(`src/settings/keep-up.ts: Platzhalterfoto „${datei}“ fehlt`);
    return {
      id,
      name,
      first: name.split(/\s+/)[0],
      stil: loc(data, 'stil', lang),
      text: loc(data, 'text', lang),
      photo,
      placeholder: !p?.photo,
      profile: p ? url(lang, 'netzwerk', `${id}/`) : '',
      weeks: [],
    };
  });
  const byId = new Map(dozentinnen.map((d) => [d.id, d]));

  const trainings: Training[] = [];
  const days: Tage = {};
  const add = (date: string, e: KalenderEintrag) => (days[date] ??= []).push(e);

  for (const w of wochen) {
    if (utc(w.id).getUTCDay() !== 1) throw new Error(`src/content/keep-up/wochen.yaml: „${w.id}“ ist kein Montag`);
    const d = byId.get(w.data.dozent.id);
    if (!d) throw new Error(`src/content/keep-up/wochen.yaml: Dozent:in „${w.data.dozent.id}“ fehlt in dozentinnen.yaml`);
    const offsets = w.data.tage.map((x) => TAGE.indexOf(x)).sort((a, b) => a - b);
    const time = w.data.zeit.replace(/\s*[–-]\s*/, '–');
    const where = w.data.ort ?? verein.training.place;
    for (const o of offsets) {
      const date = addDays(w.id, o);
      trainings.push({ date, time, dozentin: d, where });
      add(date, {
        time,
        title: d.name,
        sub: `${d.stil} · ${where}`,
        badge: t.training,
        color: 'cyan',
        short: d.first,
        keys: [d.id],
        label: `${t.training} ${t.with} ${d.name}`,
        links: [{ href: `#dozentin-${d.id}`, text: t.toCard }],
      });
    }
    d.weeks.push([addDays(w.id, offsets[0]), addDays(w.id, offsets[offsets.length - 1])]);
  }

  // Workshops: Termine mit `format: keep-up`
  for (const termin of await getTermine()) {
    if (termin.data.format?.id !== 'keep-up') continue;
    const [date, from] = termin.data.start.split(' ');
    const to = termin.data.end?.split(' ')[1];
    const person = termin.data.people[0];
    const who = (person && (byId.get(person)?.name ?? profiles.get(person)?.name)) || '';
    const what = loc(termin.data, 'title', lang);
    add(date, {
      time: to ? `${from}–${to}` : from,
      title: who || what,
      sub: who ? `${what} · ${termin.data.venue}` : termin.data.venue,
      badge: t.workshop,
      color: 'magenta',
      short: t.workshop,
      keys: person ? [person] : [],
      label: `${what}${who ? ` ${t.with} ${who}` : ''}`,
      links: [
        { href: url(lang, 'termine', `${termin.id}/`), text: t.toEvent },
        ...(person && byId.has(person) ? [{ href: `#dozentin-${person}`, text: t.toCard }] : []),
      ],
    });
  }

  return { dozentinnen, trainings, ...monate(days, lang) };
}
