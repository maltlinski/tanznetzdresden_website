/**
 * News-Beiträge für Tests aus den Dateien lesen (src/content/news/de|en/). Die Beiträge kommen aus der alten
 * Website (scripts/wordpress-import/) und ändern sich mit der Redaktion – Tests leiten ihre Erwartungen deshalb
 * hieraus ab, statt Titel fest einzutragen.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';

export interface NewsDatei {
  id: string;
  title: string;
  date: string;
  category: string;
  deadline?: string;
  image?: string;
  draft?: boolean;
  body: string;
}

const dir = (lang: 'de' | 'en') => `src/content/news/${lang}`;
const datum = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? undefined : String(v));

export function newsDateien(lang: 'de' | 'en' = 'de'): NewsDatei[] {
  return readdirSync(dir(lang))
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const [, kopf, body] = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(readFileSync(`${dir(lang)}/${f}`, 'utf8'))!;
      const d = parse(kopf) as Record<string, unknown>;
      return { ...d, id: f.replace(/\.md$/, ''), date: datum(d.date)!, deadline: datum(d.deadline), body } as NewsDatei;
    });
}

/** Veröffentlichte deutsche Beiträge, neueste zuerst (wie getNews: Datum, dann Adresse) */
export function veroeffentlicht(): NewsDatei[] {
  const heute = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
  return newsDateien('de')
    .filter((p) => !p.draft && p.date <= heute)
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

/** Anzahl der Bilder im ersten Bilder-Abschnitt mit mindestens `min` Bildern (Galerie) */
export function galerie(p: NewsDatei, min = 3) {
  for (const [, inhalt] of p.body.matchAll(/^::: bilder\n([\s\S]*?)\n:::/gm)) {
    const n = (inhalt.match(/^ {2}- datei:/gm) ?? []).length;
    if (n >= min) return { n, yaml: parse(inhalt) as { text?: string; foto?: string; bilder: { datei: string; alt: string }[] } };
  }
  return null;
}
