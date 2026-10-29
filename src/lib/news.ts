/**
 * News / Journal – zwei Quellen, beim Build zusammengeführt:
 *  1. Dateien: deutsche Beiträge in src/content/news/de/, englische Fassungen
 *     (optional) in src/content/news/en/ mit gleichem Dateinamen (auch über das CMS).
 *  2. Interner Bereich: Beiträge, die Presse, Vorstand oder Admin unter
 *     Intern → News veröffentlicht haben (Supabase-Ansicht public_news).
 * Ist Supabase nicht erreichbar, baut die Website nur mit den Dateien (Warnung im Log).
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { getImage } from 'astro:assets';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase-config';
import type { Lang } from './i18n';
import { newsCategories, type newsHeroes, type newsThemes } from '../content.config';
import { renderMarkdown } from './markdown';
import { ASSET, medienAnwenden, type MedienAngaben } from './news-bloecke';
import { emailsSchuetzen } from './news-email';
import archivBilder from '../content/news/archiv-bilder.json';

import type { NewsCategory } from './news-format';
export * from './news-format';
export type NewsKind = 'call' | 'quote' | 'photo' | 'text';
export type NewsHero = (typeof newsHeroes)[number];
export type NewsTheme = (typeof newsThemes)[number];

type De = CollectionEntry<'news'>;
type En = CollectionEntry<'newsEn'>;
type Fact = { label: string; value: string };

export interface NewsPost {
  id: string;
  /** Text als HTML (Markdown aus Datei oder Editor, sicher umgewandelt) */
  html: string;
  /** false = englische Seite zeigt den deutschen Text */
  translated: boolean;
  title: string;
  teaser: string;
  facts: Fact[];
  quote?: { text: string; who: string; role?: string };
  /** lokales Bild (Datei) oder Adresse (Supabase Storage) */
  image?: ImageMetadata | string;
  alt?: string;
  imageCredit?: string;
  /** Bildausschnitt des Titelfotos, z. B. „50% 30%“ */
  imageFocus?: string;
  /** Kopf der Beitragsseite (mit Titelbild) */
  hero: NewsHero;
  /** Farbfläche des Netz-Kopfs (ohne Titelbild) */
  heroTheme: NewsTheme;
  /** Angabe am Magenta-Knoten im Netz-Kopf */
  node?: { kicker: string; value: string };
  date: string;
  category: NewsCategory;
  author: string;
  deadline?: string;
  featured: boolean;
  kind: NewsKind;
  /** fortlaufende Nummer, ältester Beitrag = 1 */
  nr: number;
  /** Lesezeit in Minuten */
  minutes: number;
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const minutes = (...texts: string[]) => Math.max(2, Math.ceil(texts.reduce((n, t) => n + words(t), 0) / 180));
const kindOf = (p: { deadline?: string | null; quote?: unknown; image?: unknown }): NewsKind =>
  p.deadline ? 'call' : p.quote ? 'quote' : p.image ? 'photo' : 'text';
const filled = <T,>(v: T | null | undefined): v is T => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length);

type Draft = Omit<NewsPost, 'nr'>;
const knoten = (kicker?: string | null, value?: string | null) => (kicker?.trim() || value?.trim() ? { kicker: kicker?.trim() ?? '', value: value?.trim() ?? '' } : undefined);
const HEROES = ['auto', 'vollbild', 'hochkant', 'split', 'typo'];
const THEMES = ['purple', 'cyan', 'tint'];

function fromFile(d: De, e: En | undefined, lang: Lang): Draft {
  const t = e?.data ?? {};
  const entry = e?.body?.trim() ? e : d;
  const title = filled(t.title) ? t.title : d.data.title;
  const teaser = filled(t.teaser) ? t.teaser : d.data.teaser;
  return {
    id: d.id,
    html: renderMarkdown(entry.body ?? '', import.meta.env.BASE_URL, { lang }),
    translated: lang === 'de' || entry === e,
    title,
    teaser,
    facts: filled(t.facts) ? t.facts : d.data.facts,
    quote: d.data.quote ? { ...d.data.quote, ...t.quote } : undefined,
    image: d.data.image,
    alt: filled(t.alt) ? t.alt : d.data.alt,
    imageFocus: d.data.imageFocus,
    hero: d.data.hero,
    heroTheme: d.data.heroTheme,
    node: knoten(filled(t.nodeKicker) ? t.nodeKicker : d.data.nodeKicker, filled(t.nodeValue) ? t.nodeValue : d.data.nodeValue),
    date: d.data.date,
    category: d.data.category,
    author: d.data.author,
    deadline: d.data.deadline,
    featured: d.data.featured,
    kind: kindOf(d.data),
    minutes: minutes(teaser, entry.body ?? ''),
  };
}

/** Zeile aus der Supabase-Ansicht public_news */
interface RemoteNews {
  slug: string;
  category: NewsCategory;
  date: string;
  author: string;
  featured: boolean;
  deadline: string | null;
  title: string;
  teaser: string;
  body: string;
  facts: Fact[] | null;
  image_path: string | null;
  image_alt: string | null;
  image_credit: string | null;
  /** Migration 20261015000000 */
  image_focus?: string | null;
  quote_text: string | null;
  quote_who: string | null;
  quote_role: string | null;
  title_en: string | null;
  teaser_en: string | null;
  body_en: string | null;
  facts_en: Fact[] | null;
  image_alt_en: string | null;
  quote_text_en: string | null;
  quote_role_en: string | null;
  /** Migration 20261029000000 */
  hero?: string | null;
  hero_theme?: string | null;
  node_kicker?: string | null;
  node_value?: string | null;
  node_kicker_en?: string | null;
  node_value_en?: string | null;
}

let medienCache: Promise<Map<string, MedienAngaben>> | undefined;
/** Mediathek (Migration 20261016000000): Bildbeschreibung, Fotonachweis und Ausschnitt je Foto */
function fetchMedien(): Promise<Map<string, MedienAngaben>> {
  medienCache ??= (async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return new Map();
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/news_medien?select=datei,alt,alt_en,credit,focus`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return new Map();
      const rows = (await res.json()) as (MedienAngaben & { datei: string })[];
      return new Map(rows.map(({ datei, ...m }) => [datei, m]));
    } catch {
      return new Map();
    }
  })();
  return medienCache;
}

let remoteCache: Promise<RemoteNews[]> | undefined;
function fetchRemote(): Promise<RemoteNews[]> {
  remoteCache ??= (async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/public_news?select=*&order=date.desc`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = ((await res.json()) as RemoteNews[]).filter((r) => (newsCategories as readonly string[]).includes(r.category));
      // Fehlt ein Foto im Speicher, erscheint der Beitrag ohne Foto statt den Build abzubrechen.
      await Promise.all(
        rows.map(async (r) => {
          if (!r.image_path) return;
          const ok = await fetch(`${SUPABASE_URL}/storage/v1/object/public/newsbilder/${r.image_path}`, { method: 'HEAD', signal: AbortSignal.timeout(10_000) })
            .then((x) => x.ok, () => false);
          if (!ok) {
            console.warn(`[news] Foto zu „${r.slug}“ nicht gefunden – Beitrag erscheint ohne Foto.`);
            r.image_path = null;
          }
        }),
      );
      return rows;
    } catch (err) {
      console.warn(`[news] Beiträge aus dem internen Bereich nicht geladen (${String(err)}) – nur Dateien werden verwendet.`);
      return [];
    }
  })();
  return remoteCache;
}

function fromRemote(r: RemoteNews, lang: Lang, medien: Map<string, MedienAngaben>): Draft {
  const en = lang === 'en';
  const pick = <T,>(de: T, enV: T | null | undefined) => (en && filled(enV) ? enV : de);
  // Angaben der Mediathek gelten überall, wo das Foto steht
  const body = medienAnwenden(pick(r.body, r.body_en), medien, lang);
  const m = r.image_path ? medien.get(r.image_path) : undefined;
  const teaser = pick(r.teaser, r.teaser_en);
  const quote = r.quote_text ? { text: pick(r.quote_text, r.quote_text_en), who: r.quote_who ?? '', role: pick(r.quote_role ?? undefined, r.quote_role_en) } : undefined;
  const image = r.image_path ? `${SUPABASE_URL}/storage/v1/object/public/newsbilder/${r.image_path}` : undefined;
  return {
    id: r.slug,
    html: renderMarkdown(body, import.meta.env.BASE_URL, { lang }),
    translated: !en || filled(r.body_en) || !r.body.trim(),
    title: pick(r.title, r.title_en),
    teaser,
    facts: pick(r.facts ?? [], r.facts_en),
    quote,
    image,
    alt: (en ? m?.alt_en : m?.alt) || pick(r.image_alt ?? undefined, r.image_alt_en),
    imageCredit: m?.credit || r.image_credit || undefined,
    imageFocus: [m?.focus, r.image_focus].find((f): f is string => !!f && /^\d{1,3}% \d{1,3}%$/.test(f)),
    hero: (HEROES.includes(r.hero ?? '') ? r.hero : 'auto') as NewsHero,
    heroTheme: (THEMES.includes(r.hero_theme ?? '') ? r.hero_theme : 'purple') as NewsTheme,
    node: knoten(pick(r.node_kicker, r.node_kicker_en), pick(r.node_value, r.node_value_en)),
    date: r.date,
    category: r.category,
    author: r.author,
    deadline: r.deadline ?? undefined,
    featured: r.featured,
    kind: kindOf({ deadline: r.deadline, quote, image }),
    minutes: minutes(teaser, body),
  };
}

/** Alle veröffentlichten Beiträge einer Sprache, neueste zuerst. Beim Build nur einmal je Sprache berechnet. */
const newsCache = new Map<Lang, Promise<NewsPost[]>>();
export function getNews(lang: Lang): Promise<NewsPost[]> {
  if (import.meta.env.DEV) return newsLaden(lang);
  if (!newsCache.has(lang)) newsCache.set(lang, newsLaden(lang));
  return newsCache.get(lang)!;
}
async function newsLaden(lang: Lang): Promise<NewsPost[]> {
  const [de, enAll, remote, medien] = await Promise.all([
    getCollection('news', ({ data }) => !data.draft),
    lang === 'en' ? getCollection('newsEn') : Promise.resolve([] as En[]),
    fetchRemote(),
    fetchMedien(),
  ]);
  const en = new Map(enAll.map((e) => [e.id, e]));
  const posts: Draft[] = de.map((d) => fromFile(d, en.get(d.id), lang));
  const taken = new Set(posts.map((p) => p.id));
  for (const r of remote) {
    if (taken.has(r.slug)) {
      console.warn(`[news] Adresse „${r.slug}“ gibt es schon als Datei – der Beitrag aus dem internen Bereich wird übersprungen.`);
      continue;
    }
    posts.push(fromRemote(r, lang, medien));
  }
  // Datum in der Zukunft = geplant: erscheint mit dem ersten Build an diesem Tag (nächtlich)
  const heute = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
  const sichtbar = posts.filter((p) => p.date <= heute).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  await Promise.all(sichtbar.map(async (p) => (p.html = await emailsSchuetzen(await bilderOptimieren(p.html, p.id), lang))));
  return sichtbar.map((p, i) => ({ ...p, nr: sichtbar.length - i }));
}

/**
 * Fotos aus Bilder- und Schritte-Abschnitten (src/lib/markdown.ts) beim Build herunterladen und optimieren:
 * kleine Fassungen für die Seite, eine große für die Großansicht. Besucher:innen laden nichts von Supabase.
 * Das Seitenverhältnis kommt als --r an den Link (Bildpaar und Bildstrecke setzen die Fotos gleich hoch).
 * Fehlt ein Foto, fällt es weg (Warnung im Log) statt den Build abzubrechen.
 */
const NB = /<a class="nb__item" href="([^"]*)"([^>]*)><img src="[^"]*"([^>]*)><\/a>|<img class="ns__bild" src="([^"]*)"([^>]*)>/g;
const versionen = new Map<string, ReturnType<typeof bildVersionen>>();
const fotos = import.meta.glob<{ default: ImageMetadata }>('../assets/photos/*.{jpg,jpeg,png,webp}', { eager: true });
async function bildVersionen(url: string | ImageMetadata) {
  const remote = typeof url === 'string' ? { inferSize: true } : {};
  const [klein, gross] = await Promise.all([
    getImage({ src: url, ...remote, widths: [360, 540, 720, 1080, 1440], format: 'webp', quality: 80 }),
    getImage({ src: url, ...remote, width: 2000, format: 'webp', quality: 82 }),
  ]);
  return { klein, gross };
}
interface Fassung { gross: string; klein: string; srcset: string; w: number; h: number }
/**
 * Bilder aus der alten Website (scripts/wordpress-import/): liegen schon verkleinert unter public/news/archiv/
 * (1600 px und -800), Maße in src/content/news/archiv-bilder.json – der Build muss sie nicht umrechnen.
 */
const ARCHIV = /^(?:.*?)(\/news\/archiv\/.+)\.webp$/;
function archivBild(url: string): Fassung | null {
  const m = ARCHIV.exec(url);
  const masse = m && (archivBilder as Record<string, number[]>)[`${m[1]}.webp`];
  if (!m || !masse) return null;
  const klein = url.replace(/\.webp$/, '-800.webp');
  const [w, h] = masse;
  const f = Math.min(1, 800 / w, 800 / h);
  const kw = Math.round(w * f), kh = Math.round(h * f);
  return { gross: url, klein, srcset: `${klein} ${kw}w, ${url} ${w}w`, w: kw, h: kh };
}
async function fassung(url: string, id: string): Promise<Fassung | null | undefined> {
  const archiv = archivBild(url);
  if (archiv) return archiv;
  const asset = url.match(ASSET)?.[1];
  if (!/^https:\/\//.test(url) && !asset) return undefined;
  if (!versionen.has(url)) {
    const quelle = asset ? fotos[`../assets/photos/${asset}`]?.default : url;
    versionen.set(url, quelle ? bildVersionen(quelle) : Promise.reject(new Error('Datei fehlt in src/assets/photos/')));
  }
  try {
    const { klein, gross } = await versionen.get(url)!;
    const { width = 0, height = 0 } = klein.attributes as { width?: number; height?: number };
    return { gross: gross.src, klein: klein.src, srcset: klein.srcSet.attribute, w: width, h: height };
  } catch (err) {
    console.warn(`[news] Foto in „${id}“ nicht gefunden (${url}) – es fällt weg. ${String(err).slice(0, 120)}`);
    return null;
  }
}
async function bilderOptimieren(html: string, id: string): Promise<string> {
  const treffer = [...html.matchAll(NB)];
  if (!treffer.length) return html;
  const ersatz = await Promise.all(
    treffer.map(async ([ganz, href, attr, rest, src, restNs]) => {
      const url = (href ?? src).replace(/&amp;/g, '&');
      const f = await fassung(url, id);
      if (f === undefined) return ganz;
      if (f === null) return '';
      const r = f.w && f.h ? ` style="--r:${(f.w / f.h).toFixed(4)}"` : '';
      if (src !== undefined) return `<img class="ns__bild" src="${f.klein}" srcset="${f.srcset}" width="${f.w}" height="${f.h}"${restNs}>`;
      return `<a class="nb__item" href="${f.gross}"${attr}${r}><img src="${f.klein}" srcset="${f.srcset}" width="${f.w}" height="${f.h}"${rest}></a>`;
    }),
  );
  let i = 0;
  return html.replace(NB, () => ersatz[i++]);
}

/** Titelthema: markierter Beitrag, sonst der neueste mit Foto, sonst der neueste. */
export const leadPost = (posts: NewsPost[]) => posts.find((p) => p.featured) ?? posts.find((p) => p.image) ?? posts[0];

