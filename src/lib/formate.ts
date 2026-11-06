/**
 * Daten der Formate-Seite (/formate/) und des Tanzkalender-Archivs (/formate/tanzkalender/), docs/formate.md:
 * Formate mit nächsten Terminen, Archiv, Chronik und Ausgaben des Tanzkalenders (Netz im Kopf: src/lib/formate-netz.ts).
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getCollection, type CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';
import { getFormate, getTermine, inFileOrder } from './content';
import { getKeepUp } from './keep-up';
import { getNews } from './news';
import { istSichtbar, nurSichtbare, sichtbareWorte } from './sichtbar';
import { loc, url, type Lang } from './i18n';
import { href } from './url';
import type { FormatTermin } from './formate-termin';
import projekteRaw from '../content/formate-archiv/projekte.yaml?raw';
import chronikRaw from '../content/formate-archiv/chronik.yaml?raw';

export type Rubrik = CollectionEntry<'formate'>['data']['rubriken'][number];
/** Badge je Rubrik (erste Rubrik eines Formats) */
export const rubrikBadge: Record<Rubrik, 'magenta' | 'cyan' | 'purple' | 'outline'> = {
  buehne: 'magenta', training: 'cyan', diskurs: 'purple', stadt: 'outline', residenz: 'outline',
};
/** Filter „Ich möchte …“: Schlüssel in texte.json (formate → detail) und Rubrik */
export const formatFilter = [
  ['tanzSehen', 'buehne'],
  ['trainieren', 'training'],
  ['mitreden', 'diskurs'],
  ['draussen', 'stadt'],
] as const;

/** „Acht“ statt „8“ in der Überschrift */
const ZAHLWORT = {
  de: ['Null', 'Ein', 'Zwei', 'Drei', 'Vier', 'Fünf', 'Sechs', 'Sieben', 'Acht', 'Neun', 'Zehn', 'Elf', 'Zwölf'],
  en: ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'],
};
export const zahlwort = (lang: Lang, n: number) => ZAHLWORT[lang][n] ?? String(n);

const plakate = import.meta.glob<{ default: ImageMetadata }>('../assets/tanzkalender/*.webp', { eager: true });
const ausDatei = (glob: Record<string, { default: ImageMetadata }>, id: string) =>
  Object.entries(glob).find(([p]) => p.endsWith(`/${id}.webp`))?.[1].default;

/** Link eines Formats oder Projekts → Adresse (Dateien der alten Website: eigene Kopie, sobald geladen) */
export function linkZiel(lang: Lang, l: { news?: string; seite?: CollectionEntry<'formate'>['data']['seite']; datei?: string; url?: string }) {
  if (l.news) return { href: url(lang, 'news', `${l.news}/`), extern: false };
  if (l.seite) return { href: url(lang, l.seite), extern: false };
  if (l.datei) return { href: href(l.datei), extern: false };
  const ziel = archivDatei(l.url!, 'archiv');
  return { href: ziel, extern: /^https?:/.test(ziel) };
}
/** Datei der alten Website (wp-content/uploads) → Kopie unter public/downloads/<ordner>/ (npm run archiv:laden), wenn vorhanden */
function archivDatei(alt: string, ordner: string, name = alt.split('/').pop()!): string {
  if (!alt.includes('/wp-content/uploads/')) return alt;
  const rel = `downloads/${ordner}/${name}`;
  return existsSync(join(process.cwd(), 'public', rel)) ? href(rel) : alt;
}

/** Nächste Termine je Format (aus dem Kalender; KEEP UP auch die Trainings), höchstens sechs je Format */
async function formatTermine(lang: Lang): Promise<Map<string, FormatTermin[]>> {
  const heute = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
  const je = new Map<string, FormatTermin[]>();
  const dazu = (id: string, t: FormatTermin) => {
    if (t.datum < heute) return;
    je.set(id, [...(je.get(id) ?? []), t]);
  };
  for (const t of await getTermine()) {
    if (!t.data.format) continue;
    const [datum, zeit] = t.data.start.split(' ');
    dazu(t.data.format.id, { datum, zeit, wo: [t.data.venue, loc(t.data, 'title', lang)].join(' · '), link: url(lang, 'termine', `${t.id}/`) });
  }
  for (const e of (await getKeepUp(lang)).trainings) {
    dazu('keep-up', { datum: e.date, zeit: e.time.split('–')[0], wo: [e.where, e.dozentin.name, e.titel].filter(Boolean).join(' · '), link: url(lang, 'profitraining', '#kalender') });
  }
  for (const [id, l] of je) je.set(id, l.sort((a, b) => (a.datum + a.zeit).localeCompare(b.datum + b.zeit)).slice(0, 6));
  return je;
}

export async function getFormatSeite(lang: Lang) {
  const [formate, termine, news] = await Promise.all([getFormate(), formatTermine(lang), getNews(lang)]);
  const nachId = new Map(news.map((p) => [p.id, p]));
  return formate.map((f, i) => {
    const d = f.data;
    // Verweise auf ausgeblendete oder fehlende Beiträge entfallen (die Redaktion wählt sie aus einer Liste)
    const rueckblick = d.rueckblick ? nachId.get(d.rueckblick) : undefined;
    return {
      id: f.id,
      n: String(i + 1).padStart(2, '0'),
      titel: loc(d, 'title', lang),
      seit: loc(d, 'since', lang),
      kurz: loc(d, 'summary', lang),
      text: loc(d, 'text', lang) ?? loc(d, 'summary', lang),
      rubriken: d.rubriken,
      bild: d.image,
      alt: loc(d, 'alt', lang),
      fakten: nurSichtbare(d.fakten).map((x) => ({ k: loc(x, 'label', lang), v: loc(x, 'wert', lang) })),
      links: nurSichtbare(d.links).filter((l) => !l.news || nachId.has(l.news)).map((l) => ({ text: loc(l, 'text', lang), ...linkZiel(lang, l) })),
      beendet: d.beendet,
      rueckblick: rueckblick && { titel: rueckblick.title, datum: rueckblick.date, link: url(lang, 'news', `${rueckblick.id}/`) },
      termine: termine.get(f.id) ?? [],
    };
  });
}
export type FormatDaten = Awaited<ReturnType<typeof getFormatSeite>>[number];

export async function getProjekte(lang: Lang) {
  const news = new Set((await getNews(lang)).map((p) => p.id));
  return inFileOrder(await getCollection('projekte', istSichtbar), projekteRaw).map((p) => {
    return {
      id: p.id,
      titel: p.data.titel,
      jahre: p.data.jahre,
      art: loc(p.data, 'art', lang),
      text: loc(p.data, 'text', lang),
      partner: loc(p.data, 'partner', lang),
      links: nurSichtbare(p.data.links).filter((l) => !l.news || news.has(l.news)).map((l) => ({ text: loc(l, 'text', lang), ...linkZiel(lang, l) })),
    };
  });
}

export async function getChronik(lang: Lang) {
  return inFileOrder(await getCollection('chronik', istSichtbar), chronikRaw)
    .map((c) => {
      const en = sichtbareWorte(c.data.punkte_en);
      return { jahr: c.id, punkte: lang === 'en' && en.length ? en : sichtbareWorte(c.data.punkte) };
    })
    // Jahre, in denen alles ausgeblendet ist, entfallen
    .filter((c) => c.punkte.length > 0);
}

/** Ausgaben des Tanzkalenders, neueste zuerst; Plakat und PDF aus dem Repo, sonst von der alten Website */
export async function getTanzkalenderAusgaben(lang: Lang) {
  // id = erster Monat (JJJJ-MM): neueste zuerst
  const liste = (await getCollection('tanzkalenderAusgaben', istSichtbar)).sort((a, b) => b.id.localeCompare(a.id));
  const monat = (jahr: number, m: number) => new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'de-DE', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(jahr, m - 1, 1)));
  return liste.map((a, i) => {
    const jahr = Number(a.id.slice(0, 4));
    const two = (m: number) => String(m).padStart(2, '0');
    return {
      id: a.id,
      jahr,
      nr: String(liste.length - i).padStart(2, '0'),
      code: `${a.data.monate.map(two).join('–')}/${String(jahr).slice(2)}`,
      label: `${a.data.monate.map((m) => monat(jahr, m)).join(' / ')} ${jahr}`,
      plakat: ausDatei(plakate, a.id),
      plakatAlt: a.data.bild,
      pdf: archivDatei(a.data.pdf, 'tanzkalender', `${a.id}.pdf`),
      breit: a.data.breit,
      kopf: a.data.kopf,
    };
  });
}
export type Ausgabe = Awaited<ReturnType<typeof getTanzkalenderAusgaben>>[number];
