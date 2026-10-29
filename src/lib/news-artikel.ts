/**
 * Gerüst der Beitragsseite (Entwurf News v3) als HTML-Text: Kopf in fünf Varianten, Zeile mit Teilen,
 * Eckdaten, Fuß mit Bildnachweisen. Benutzt von der Beitragsseite (src/views/NewsArticleView.astro) und der
 * Vorschau im Editor (src/pages/intern/news/vorschau/) – beide sehen dadurch gleich aus.
 * Ohne Build-Abhängigkeiten, damit es auch im Browser läuft. Stile: src/styles/artikel.css,
 * Bewegung und Netz: src/scripts/news-artikel.ts.
 */
import type { Lang } from './i18n';
import { dateLong, dateShort, daysLeft, nrLabel, newsBadge, newsBadgeOnDark, newsCategoryLabel, type NewsCategory } from './news-format';
import { deadlineText } from './deadline-text';
import { texte } from './texte';

export type KopfModus = 'vollbild' | 'hochkant' | 'split' | 'typo' | 'netz';
export type Flaeche = 'purple' | 'cyan' | 'tint';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Welcher Kopf: ohne Titelbild das Netz, „auto“ = Vollbild, Hochkant-Fotos bekommen den Hochkant-Kopf */
export function kopfModus(hero: string | undefined, hatBild: boolean, verhaeltnis?: number): KopfModus {
  if (!hatBild) return 'netz';
  const m = !hero || hero === 'auto' ? 'vollbild' : (hero as KopfModus);
  return m === 'vollbild' && verhaeltnis !== undefined && verhaeltnis < 1 ? 'hochkant' : m;
}

export interface KopfDaten {
  lang: Lang;
  modus: KopfModus;
  flaeche: Flaeche;
  kategorie: NewsCategory;
  titel: string;
  teaser: string;
  autor: string;
  /** fortlaufende Nummer (fehlt in der Vorschau) */
  nr?: number;
  datum: string;
  minuten: number;
  /** Link „← Alle Beiträge“ (leer = nur Text, Vorschau) */
  zurueck: string;
  /** Titelbild: fertiges <img> (Klasse ak__img), Link zur großen Fassung, Seitenverhältnis Breite/Höhe */
  bild?: { img: string; gross: string; verhaeltnis: number; credit?: string };
  /** Angabe am Magenta-Knoten (Netz-Kopf); bei Ausschreibungen die Frist */
  knoten?: { kicker: string; value: string };
  frist?: string;
}

const badge = (v: 'magenta' | 'cyan' | 'purple', text: string) => `<span class="badge${v === 'magenta' ? '' : ` badge--${v}`}">${esc(text)}</span>`;
const keil = (farbe: string, cls: string, flip = false) => `<div class="keil${flip ? ' keil--flip' : ''} ${cls}" style="background:${farbe}" aria-hidden="true"></div>`;

export function kopfHtml(d: KopfDaten): string {
  const t = texte(d.lang, 'news', 'beitrag');
  const kat = newsCategoryLabel[d.lang][d.kategorie];
  const variante = d.modus !== 'netz' || d.flaeche === 'purple' ? newsBadgeOnDark(d.kategorie) : d.flaeche === 'cyan' ? 'purple' : newsBadge[d.kategorie];
  const nr = d.nr ? `${nrLabel(d.nr)} · ` : '';
  const lesezeit = `${d.minuten} ${t.min} ${t.read}`;
  const meta = (mitZeit = true) =>
    `<div class="ak__meta" data-rise="0.08">${badge(variante, kat)}<span>${nr}<time datetime="${d.datum}">${dateLong(d.datum, d.lang)}</time>${mitZeit ? ` · ${lesezeit}` : ''}</span></div>`;
  const zurueck = (cls = '') =>
    d.zurueck ? `<a href="${esc(d.zurueck)}" class="ak__back${cls}" data-rise="0">${esc(t.back)}</a>` : `<span class="ak__back${cls}" data-rise="0">${esc(t.back)}</span>`;
  // lange Titel (oft aus der alten Website) kleiner setzen, sonst füllen sie den Kopf
  const h1 = `<h1 class="ak__titel${d.titel.length > 60 ? ' ak__titel--lang' : ''}" data-split>${esc(d.titel)}</h1>`;
  const teaser = d.teaser ? `<p class="ak__teaser" data-rise="0.26">${esc(d.teaser)}</p>` : '';
  const autor = (extra = '') => `<span class="ak__autor" data-rise="0.34">${esc(t.text)} · ${esc(d.autor)}${extra}</span>`;
  const credit = d.bild?.credit ? `<span class="ak__credit">${esc(t.credit)} · ${esc(d.bild.credit)}</span>` : '';
  const zoom = (cls: string) =>
    d.bild
      ? `<a class="ak__zoom ${cls}" href="${esc(d.bild.gross)}" data-lightbox data-k="${esc(t.cover)}" data-cap="" data-credit="${esc(d.bild.credit ?? '')}" aria-label="${esc(d.lang === 'en' ? 'Enlarge cover image' : 'Titelbild vergrößern')}">${d.bild.img}</a>`
      : '';

  switch (d.modus) {
    case 'vollbild':
      return (
        `<header class="ak ak--vollbild" data-kopf>${zoom('ak__buehne')}` +
        `<div class="ak__oben"><div class="wrap">${zurueck(' ak__back--fahne')}</div></div>` +
        `<div class="ak__band">${keil('var(--cyan)', 'ak__keil-oben')}<div class="wrap ak__band-innen">` +
        `<div class="ak__block">${meta()}${h1}</div>${credit}</div></div></header>`
      );
    case 'hochkant':
      return (
        `<header class="ak ak--hochkant" data-kopf><div class="wrap ak__innen">` +
        `<div class="ak__text">${zurueck()}<div class="ak__block">${meta()}${h1}${teaser}${autor()}</div></div>` +
        `<div class="ak__hoch" style="--r:${d.bild!.verhaeltnis.toFixed(4)}">${zoom('ak__hoch-bild')}${credit}</div>` +
        `</div>${keil('var(--magenta)', 'ak__keil')}</header>`
      );
    case 'split':
      return (
        `<header class="ak ak--split" data-kopf>` +
        `<div class="ak__text ak__text--split">${zurueck()}<div class="ak__block">${meta(false)}${h1}${teaser}${autor(` · ${lesezeit}`)}</div></div>` +
        `<div class="ak__seite">${zoom('ak__seite-bild')}${credit}</div>${keil('var(--magenta)', 'ak__keil')}</header>`
      );
    case 'typo':
      return (
        `<header class="ak ak--typo${d.bild ? ' ak--mit-bild' : ''}" data-kopf><div class="wrap ak__innen">${zurueck()}` +
        `<div class="ak__block">${meta()}${h1}${teaser}${autor()}</div></div>${keil('var(--magenta)', 'ak__keil')}</header>` +
        (d.bild
          ? `<div class="wrap"><figure class="ak__figur">${zoom('ak__breit')}<figcaption class="ak__figcap">` +
            `<span class="nb__k">${esc(t.cover)}</span><span class="ak__figcap-luecke"></span>${credit.replace('ak__credit', 'nb__credit')}</figcaption></figure></div>`
          : '')
      );
    default: {
      // Netz auf einer Farbfläche; der Knoten trägt die wichtigste Angabe (Ausschreibung: die Frist)
      const k = d.frist
        ? { kicker: `${t.deadline} · ${dateShort(d.frist, d.lang)}`, value: `<span data-deadline="${d.frist}" data-deadline-part="label">${deadlineText(daysLeft(d.frist), 'label', d.lang)}</span>` }
        : d.knoten
          ? { kicker: esc(d.knoten.kicker), value: esc(d.knoten.value) }
          : { kicker: esc(kat), value: esc(dateShort(d.datum, d.lang)) };
      const keilFarbe = d.flaeche === 'cyan' ? 'var(--purple)' : 'var(--magenta)';
      return (
        `<header class="ak ak--netz ak--${d.flaeche}" data-kopf data-netz-kopf>` +
        `<canvas class="ak__netz" aria-hidden="true"></canvas>` +
        `<div class="ak__knoten" data-knoten>${k.kicker ? `<span class="ak__knoten-k">${k.kicker}</span>` : ''}${k.value ? `<span class="ak__knoten-v">${k.value}</span>` : ''}</div>` +
        `<div class="wrap ak__innen">${zurueck(' ak__back--linie')}<div class="ak__block" data-netz-text>${meta()}${h1}${teaser}${autor()}</div></div>` +
        `${keil(keilFarbe, 'ak__keil')}</header>`
      );
    }
  }
}

/** Zeile über dem Text: wer, wann, Teilen */
export function zeileHtml(lang: Lang, autor: string, datum: string, mail: string): string {
  const t = texte(lang, 'news', 'beitrag');
  return (
    `<div class="ab__zeile"><span class="ab__wer">${esc(t.text)} · <span class="ab__name">${esc(autor)}</span> · ${dateShort(datum, lang)}</span>` +
    `<div class="ab__teilen" role="group" aria-label="${esc(t.share)}"><button type="button" class="ab__knopf" data-copy data-copied="${esc(t.copied)}">${esc(t.copy)}</button>` +
    `<a class="ab__knopf" href="${esc(mail)}">${esc(t.mail)}</a></div></div>`
  );
}

/** Eckdaten oben im Beitrag (bei Ausschreibungen zuerst der Countdown) */
export function faktenHtml(lang: Lang, fakten: { label: string; value: string }[], frist?: string): string {
  const t = texte(lang, 'news', 'beitrag');
  const liste = fakten.filter((f) => f.label || f.value);
  if (!liste.length && !frist) return '';
  const tage = frist ? daysLeft(frist) : 0;
  const call = frist
    ? `<div class="ab__call"><span class="ab__call-k">${esc(t.deadline)}</span>` +
      `<span class="ab__call-n" data-deadline="${frist}" data-deadline-part="n">${deadlineText(tage, 'n', lang)}</span>` +
      `<span class="ab__call-u"><span data-deadline="${frist}" data-deadline-part="unit">${deadlineText(tage, 'unit', lang)}</span> · ${esc(t.until)} ${dateShort(frist, lang)}</span></div>`
    : '';
  return `<section class="ab__fakten" aria-label="${esc(t.glance)}">${call}<dl class="ab__dl">${liste.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl></section>`;
}

/** Bildnachweise aus dem fertigen Text (data-k / data-credit an jedem Bild), zusammengefasst je Person */
export function nachweise(html: string, titelbild?: { k: string; credit?: string }): { nrs: string; credit: string }[] {
  const je = new Map<string, string[]>();
  const dazu = (k: string, c: string) => c && je.set(c, [...(je.get(c) ?? []), k]);
  if (titelbild?.credit) dazu(esc(titelbild.k), esc(titelbild.credit));
  for (const m of html.matchAll(/data-k="([^"]*)"[^>]*?data-credit="([^"]*)"/g)) dazu(m[1], m[2]);
  return [...je].map(([credit, ks]) => ({ credit, nrs: ks.join(', ') }));
}

/** Fuß des Textes: wer, wann veröffentlicht, Bildnachweise */
export function fussHtml(lang: Lang, autor: string, datum: string, liste: { nrs: string; credit: string }[]): string {
  const t = texte(lang, 'news', 'beitrag');
  // Werte stammen aus Attributen (schon maskiert) – nicht noch einmal maskieren
  const credits = liste.length
    ? `<div class="ab__nachweise"><h2 class="ab__nachweise-h">${esc(t.credits)}</h2>${liste.map((c) => `<p>${c.nrs} · ${esc(t.credit)}: ${c.credit}</p>`).join('')}</div>`
    : '';
  return `<footer class="ab__fuss"><p class="ab__foot">${esc(t.text)} · ${esc(autor)} · ${esc(t.published)} ${dateLong(datum, lang)}</p>${credits}</footer>`;
}
