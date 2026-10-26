/**
 * KEEP UP · Profitraining: Trainingswochen, Dozent:innen (keep-up/dozentinnen.yaml + Profile) und Workshops
 * werden hier zu Kalendertagen zusammengeführt. Die Trainingstage erscheinen auch im Tanzkalender.
 *
 * Woher die Wochen kommen:
 *  1. Intern → KEEP UP (Supabase, Ansicht public_keepup): vom Vorstand eingeplant, mit der Beschreibung der
 *     Dozent:in, sobald sie veröffentlicht ist. Wird beim Build geholt (src/lib/keep-up-plan.ts).
 *  2. src/content/keep-up/wochen.yaml: der ältere Weg. Eine Woche, die in Supabase ein Training hat, ersetzt
 *     die Woche aus der Datei. Ist Supabase nicht erreichbar, baut die Website nur mit der Datei.
 * Workshops: Termine mit `format: keep-up` (eigene Terminseite) und Workshops aus Intern → KEEP UP.
 */
import type { ImageMetadata } from 'astro';
import { getCollection } from 'astro:content';
import { getImage } from 'astro:assets';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase-config';
import { absaetze, bucketUrl, istWebsiteFoto, tagDatum, zeitNorm, type OeffentlicherTermin } from './keep-up-plan';
import dozentinnenRaw from '../content/keep-up/dozentinnen.yaml?raw';
import { getTermine, inFileOrder } from './content';
import { getProfiles } from './profiles';
import { getVerein } from './settings';
import { dateLocale, loc, tr, url, type Lang } from './i18n';
import { texte } from './texte';
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

/** Ein Trainingstag (für den Tanzkalender und das Kalender-Abo) */
export interface Training {
  date: string;
  time: string;
  dozentin: Dozentin;
  where: string;
  art: 'training' | 'workshop';
  /** veröffentlichte Beschreibung der Dozent:in (Intern → KEEP UP) */
  titel?: string;
  kurz?: string;
}

let planCache: Promise<OeffentlicherTermin[]> | undefined;
/** Einplanungen aus Intern → KEEP UP (leer, wenn Supabase fehlt oder die Migration noch nicht eingespielt ist) */
function fetchPlan(): Promise<OeffentlicherTermin[]> {
  planCache ??= (async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/public_keepup?select=*&order=woche`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = (await res.json()) as OeffentlicherTermin[];
      // Fehlt ein hochgeladenes Bild, erscheint die Beschreibung ohne Bild statt den Build abzubrechen
      await Promise.all(
        rows.map(async (r) => {
          const b = r.veroeffentlicht?.bild;
          if (!b || istWebsiteFoto(b)) return;
          const ok = await fetch(bucketUrl(SUPABASE_URL, b), { method: 'HEAD', signal: AbortSignal.timeout(10_000) }).then((x) => x.ok, () => false);
          if (!ok && r.veroeffentlicht) {
            console.warn(`[keep-up] Bild „${b}“ nicht gefunden – Beschreibung erscheint ohne Bild.`);
            r.veroeffentlicht.bild = null;
          }
        }),
      );
      return rows;
    } catch (err) {
      console.warn(`[keep-up] Einplanungen aus dem internen Bereich nicht geladen (${String(err)}) – nur wochen.yaml wird verwendet.`);
      return [];
    }
  })();
  return planCache;
}

/** Bild einer Beschreibung: Foto der Website (verkleinert) oder Adresse im Bucket */
async function bildSrc(bild: string | null): Promise<string | undefined> {
  if (!bild) return undefined;
  if (!istWebsiteFoto(bild)) return bucketUrl(SUPABASE_URL, bild);
  const f = fotos[`../${bild}`]?.default;
  return f ? (await getImage({ src: f, width: 960 })).src : undefined;
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
  const k = texte(lang, 'profitraining', 'kalender');
  const t = {
    training: k.badgeTraining, workshop: k.badgeWorkshop, toCard: k.toCard, toEvent: k.toEvent,
    // nur für Screenreader
    ...tr(lang, { de: { with: 'mit' }, en: { with: 'with' } }),
  };

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

  const t2 = { folgt: k.folgt, bring: k.bring };
  /** Ein Tag mit Dozent:in, als Training (cyan) oder Workshop (magenta) */
  const tagEintragen = (date: string, d: Dozentin, time: string, where: string, art: 'training' | 'workshop', beschreibung: KalenderEintrag['beschreibung']) => {
    const badge = art === 'workshop' ? t.workshop : t.training;
    trainings.push({ date, time, dozentin: d, where, art, titel: beschreibung?.titel || undefined, kurz: beschreibung?.kurz || undefined });
    add(date, {
      time,
      title: d.name,
      sub: `${d.stil} · ${where}`,
      badge,
      color: art === 'workshop' ? 'magenta' : 'cyan',
      short: art === 'workshop' ? t.workshop : d.first,
      keys: [d.id],
      label: `${badge} ${t.with} ${d.name}${beschreibung ? `: ${beschreibung.titel}` : ''}`,
      links: [{ href: `#dozentin-${d.id}`, text: t.toCard }],
      ort: where,
      wer: `${d.name} · ${d.stil}`,
      beschreibung,
    });
  };

  /** ohne Beschreibung; `folgt` = Hinweis (nur bei Einplanungen aus dem internen Bereich, dort kann sie kommen) */
  const ohne = (folgt: string) => ({ titel: '', kurz: '', absaetze: [], schwerpunkte: [], mitbringen: '', folgt, bringLabel: t2.bring });

  // 1. Intern → KEEP UP
  const plan = await fetchPlan();
  const geplant = new Set(plan.filter((p) => p.art === 'training').map((p) => p.woche));
  for (const p of plan) {
    const d = byId.get(p.dozent);
    if (!d) {
      console.warn(`[keep-up] Einplanung ${p.woche}: Dozent:in „${p.dozent}“ fehlt in dozentinnen.yaml – übersprungen.`);
      continue;
    }
    const v = p.veroeffentlicht;
    const bild = v ? await bildSrc(v.bild) : undefined;
    const beschreibung = v
      ? {
          titel: v.titel, kurz: v.kurz, absaetze: absaetze(v.text), schwerpunkte: v.schwerpunkte, mitbringen: v.mitbringen,
          bild: bild ? { src: bild, alt: v.bild_alt } : undefined, folgt: '', bringLabel: t2.bring,
        }
      : ohne(t2.folgt);
    const tage = [...p.tage].sort((a, b) => a - b);
    const time = zeitNorm(p.zeit);
    const where = p.ort || verein.training.place;
    for (const tag of tage) tagEintragen(tagDatum(p.woche, tag), d, time, where, p.art, beschreibung);
    if (p.art === 'training') d.weeks.push([tagDatum(p.woche, tage[0]), tagDatum(p.woche, tage[tage.length - 1])]);
  }

  // 2. wochen.yaml (nur Wochen, die nicht schon im internen Bereich eingeplant sind)
  for (const w of wochen) {
    if (utc(w.id).getUTCDay() !== 1) throw new Error(`src/content/keep-up/wochen.yaml: „${w.id}“ ist kein Montag`);
    if (geplant.has(w.id)) continue;
    const d = byId.get(w.data.dozent.id);
    if (!d) throw new Error(`src/content/keep-up/wochen.yaml: Dozent:in „${w.data.dozent.id}“ fehlt in dozentinnen.yaml`);
    const offsets = w.data.tage.map((x) => TAGE.indexOf(x)).sort((a, b) => a - b);
    const time = zeitNorm(w.data.zeit);
    const where = w.data.ort ?? verein.training.place;
    for (const o of offsets) tagEintragen(addDays(w.id, o), d, time, where, 'training', ohne(''));
    d.weeks.push([addDays(w.id, offsets[0]), addDays(w.id, offsets[offsets.length - 1])]);
  }
  dozentinnen.forEach((d) => d.weeks.sort((a, b) => a[0].localeCompare(b[0])));

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
