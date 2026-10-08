/**
 * News / Journal – zwei Quellen, beim Build zusammengeführt:
 *  1. Dateien: deutsche Beiträge in src/content/news/de/, englische Fassungen
 *     (optional) in src/content/news/en/ mit gleichem Dateinamen (auch über das CMS).
 *  2. Interner Bereich: Beiträge, die Presse, Vorstand oder Admin unter
 *     Intern → News veröffentlicht haben (Supabase-Ansicht public_news).
 * Ist Supabase nicht erreichbar, baut die Website nur mit den Dateien (Warnung im Log).
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from 'astro:env/client';
import type { Lang } from './i18n';
import { newsCategories } from '../content.config';
import { renderMarkdown } from './markdown';

export type NewsCategory = (typeof newsCategories)[number];
export type NewsKind = 'call' | 'quote' | 'photo' | 'text';

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

export const newsCategoryLabel: Record<Lang, Record<NewsCategory | 'Alle', string>> = {
  de: { Alle: 'Alle', Netzwerk: 'Netzwerk', Ausschreibung: 'Ausschreibung', Training: 'Training', Verein: 'Verein', Rückblick: 'Rückblick', Stimme: 'Stimme' },
  en: { Alle: 'All', Netzwerk: 'Network', Ausschreibung: 'Open call', Training: 'Training', Verein: 'Association', Rückblick: 'Review', Stimme: 'Voices' },
};

export const newsBadge: Record<NewsCategory, 'purple' | 'magenta' | 'cyan'> = {
  Netzwerk: 'purple', Ausschreibung: 'magenta', Training: 'cyan', Verein: 'purple', Rückblick: 'cyan', Stimme: 'magenta',
};
/** Auf Lila ist ein lila Badge unsichtbar – dort Cyan. */
export const newsBadgeOnDark = (c: NewsCategory) => (newsBadge[c] === 'purple' ? 'cyan' : newsBadge[c]);

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const minutes = (...texts: string[]) => Math.max(2, Math.ceil(texts.reduce((n, t) => n + words(t), 0) / 180));
const kindOf = (p: { deadline?: string | null; quote?: unknown; image?: unknown }): NewsKind =>
  p.deadline ? 'call' : p.quote ? 'quote' : p.image ? 'photo' : 'text';
const filled = <T,>(v: T | null | undefined): v is T => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length);

type Draft = Omit<NewsPost, 'nr'>;

function fromFile(d: De, e: En | undefined, lang: Lang): Draft {
  const t = e?.data ?? {};
  const entry = e?.body?.trim() ? e : d;
  const title = filled(t.title) ? t.title : d.data.title;
  const teaser = filled(t.teaser) ? t.teaser : d.data.teaser;
  return {
    id: d.id,
    html: renderMarkdown(entry.body ?? '', import.meta.env.BASE_URL),
    translated: lang === 'de' || entry === e,
    title,
    teaser,
    facts: filled(t.facts) ? t.facts : d.data.facts,
    quote: d.data.quote ? { ...d.data.quote, ...t.quote } : undefined,
    image: d.data.image,
    alt: filled(t.alt) ? t.alt : d.data.alt,
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
}

let remoteCache: Promise<RemoteNews[]> | undefined;
function fetchRemote(): Promise<RemoteNews[]> {
  remoteCache ??= (async () => {
    if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) return [];
    try {
      const res = await fetch(`${PUBLIC_SUPABASE_URL}/rest/v1/public_news?select=*&order=date.desc`, {
        headers: { apikey: PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${PUBLIC_SUPABASE_ANON_KEY}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = ((await res.json()) as RemoteNews[]).filter((r) => (newsCategories as readonly string[]).includes(r.category));
      // Fehlt ein Foto im Speicher, erscheint der Beitrag ohne Foto statt den Build abzubrechen.
      await Promise.all(
        rows.map(async (r) => {
          if (!r.image_path) return;
          const ok = await fetch(`${PUBLIC_SUPABASE_URL}/storage/v1/object/public/newsbilder/${r.image_path}`, { method: 'HEAD', signal: AbortSignal.timeout(10_000) })
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

function fromRemote(r: RemoteNews, lang: Lang): Draft {
  const en = lang === 'en';
  const pick = <T,>(de: T, enV: T | null | undefined) => (en && filled(enV) ? enV : de);
  const body = pick(r.body, r.body_en);
  const teaser = pick(r.teaser, r.teaser_en);
  const quote = r.quote_text ? { text: pick(r.quote_text, r.quote_text_en), who: r.quote_who ?? '', role: pick(r.quote_role ?? undefined, r.quote_role_en) } : undefined;
  const image = r.image_path ? `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/newsbilder/${r.image_path}` : undefined;
  return {
    id: r.slug,
    html: renderMarkdown(body, import.meta.env.BASE_URL),
    translated: !en || filled(r.body_en) || !r.body.trim(),
    title: pick(r.title, r.title_en),
    teaser,
    facts: pick(r.facts ?? [], r.facts_en),
    quote,
    image,
    alt: pick(r.image_alt ?? undefined, r.image_alt_en),
    imageCredit: r.image_credit ?? undefined,
    date: r.date,
    category: r.category,
    author: r.author,
    deadline: r.deadline ?? undefined,
    featured: r.featured,
    kind: kindOf({ deadline: r.deadline, quote, image }),
    minutes: minutes(teaser, body),
  };
}

/** Alle veröffentlichten Beiträge einer Sprache, neueste zuerst. */
export async function getNews(lang: Lang): Promise<NewsPost[]> {
  const [de, enAll, remote] = await Promise.all([
    getCollection('news', ({ data }) => !data.draft),
    lang === 'en' ? getCollection('newsEn') : Promise.resolve([] as En[]),
    fetchRemote(),
  ]);
  const en = new Map(enAll.map((e) => [e.id, e]));
  const posts: Draft[] = de.map((d) => fromFile(d, en.get(d.id), lang));
  const taken = new Set(posts.map((p) => p.id));
  for (const r of remote) {
    if (taken.has(r.slug)) {
      console.warn(`[news] Adresse „${r.slug}“ gibt es schon als Datei – der Beitrag aus dem internen Bereich wird übersprungen.`);
      continue;
    }
    posts.push(fromRemote(r, lang));
  }
  posts.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  return posts.map((p, i) => ({ ...p, nr: posts.length - i }));
}

/** Titelthema: markierter Beitrag, sonst der neueste mit Foto, sonst der neueste. */
export const leadPost = (posts: NewsPost[]) => posts.find((p) => p.featured) ?? posts.find((p) => p.image) ?? posts[0];

const MONTHS: Record<Lang, string[]> = {
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const MON: Record<Lang, string[]> = {
  de: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
const ymd = (iso: string) => iso.split('-').map(Number) as [number, number, number];
const pad = (n: number) => String(n).padStart(2, '0');

/** 01. Oktober 2026 / 1 October 2026 */
export function dateLong(iso: string, lang: Lang) {
  const [y, m, d] = ymd(iso);
  return lang === 'de' ? `${pad(d)}. ${MONTHS.de[m - 1]} ${y}` : `${d} ${MONTHS.en[m - 1]} ${y}`;
}
/** 01. Okt 2026 / 1 Oct 2026 */
export function dateShort(iso: string, lang: Lang) {
  const [y, m, d] = ymd(iso);
  return lang === 'de' ? `${pad(d)}. ${MON.de[m - 1]} ${y}` : `${d} ${MON.en[m - 1]} ${y}`;
}
export const monthShort = (iso: string, lang: Lang) => MON[lang][ymd(iso)[1] - 1];
export const monthLong = (iso: string, lang: Lang) => `${MONTHS[lang][ymd(iso)[1] - 1]} ${ymd(iso)[0]}`;

/** Ganze Tage bis zum Ende des Fristtages (Ortszeit); negativ = abgelaufen. */
export function daysLeft(deadline: string, now = new Date()) {
  const [y, m, d] = ymd(deadline);
  return Math.ceil((new Date(y, m - 1, d, 23, 59, 59).getTime() - now.getTime()) / 864e5);
}

export { deadlineText } from './deadline-text';

export const nrLabel = (n: number) => `Nº ${pad(n)}`;
