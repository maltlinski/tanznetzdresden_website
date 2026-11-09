/**
 * Regel „Köpfe“ (docs/entwicklung.md#köpfe-regel, Tokens in src/styles/global.css): Beim Wechsel zwischen den
 * Menüpunkten steht alles an derselben Stelle.
 *
 * - Jeder lila Kopf trägt die Klasse `kopf` und beginnt oben (nicht mittig): die erste Zeile (Kicker
 *   `.kopf__kicker`, auf der Startseite der Claim) steht `--buehne-oben` unter der Kopfleiste.
 * - Die Headline steht `--kopf-kicker` unter dem Kicker – damit auf allen Seiten auf gleicher Höhe.
 * - Der erste Textblock nach dem Kopf steht überall `--nach-kopf` darunter.
 * - Schrift im Kopf hält mindestens `--kopf-unten` Abstand zum unteren Rand (Keil).
 *
 * Geprüft werden die Menüseiten und alle Seiten der Sitemap mit Kopf (je Bereich bis zu drei, Deutsch und
 * Englisch), auf Desktop und Handy. Ausnahme: `data-kopf-frei` (Profil: Name unten am Porträt) – dort gelten
 * nur die erste Zeile und der Abstand danach.
 */
import { test, expect, type Page } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';

/** Menüseiten: müssen einen Kopf nach der Regel haben */
const MENUE = ['/', '/termine/', '/formate/', '/profitraining/', '/news/', '/verein/', '/spenden/'];
/** Seiten mit kurzem Kopf eigener Art (Beitrag, Termin) oder ohne Kopf (Dokument zum Drucken) */
const OHNE = [/^\/(en\/)?news\/.+/, /^\/(en\/)?termine\/.+/, /^\/(en\/)?spenden\/nachweis\//, /^\/(en\/)?mitglied\/pruefen\//];

function seiten(): string[] {
  const datei = 'dist/sitemap-0.xml';
  const alle = existsSync(datei) ? [...readFileSync(datei, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname) : [];
  const je: Record<string, string[]> = {};
  for (const p of alle) {
    const teile = p.split('/').filter(Boolean);
    if (teile.includes('intern') || teile.includes('admin') || OHNE.some((r) => r.test(p))) continue;
    const bereich = teile[0] === 'en' ? teile.slice(0, 2).join('/') : (teile[0] ?? '');
    (je[bereich] ??= []).push(p);
  }
  const auswahl = Object.values(je).flatMap((l) => l.slice(0, 3));
  return [...new Set([...MENUE, ...MENUE.map((p) => '/en' + p), ...auswahl])];
}

interface Messung {
  kopf: boolean;
  frei: boolean;
  soll: { oben: number; kicker: number; nach: number; unten: number };
  unten: number | null;
  untenStelle: string;
  ersteZeile: number | null;
  kickerUnten: number | null;
  h1: number | null;
  nach: number | null;
  nachStelle: string;
}

async function messen(page: Page): Promise<Messung> {
  return page.evaluate(() => {
    const px = (v: string) => {
      const d = document.createElement('div');
      d.style.cssText = `position:absolute;visibility:hidden;height:var(${v})`;
      document.body.append(d);
      const h = d.getBoundingClientRect().height;
      d.remove();
      return h;
    };
    const soll = { oben: px('--buehne-oben'), kicker: px('--kopf-kicker'), nach: px('--nach-kopf'), unten: px('--kopf-unten') };
    const kopf = document.querySelector<HTMLElement>('main > .kopf');
    if (!kopf) return { kopf: false, frei: false, soll, ersteZeile: null, kickerUnten: null, h1: null, nach: null, nachStelle: '', unten: null, untenStelle: '' };
    const k = kopf.getBoundingClientRect();
    const kicker = kopf.querySelector('.kopf__kicker');
    const h1 = kopf.querySelector('h1');
    const erste = (kicker ?? h1)?.getBoundingClientRect();
    // letzte Zeile im Kopf: Abstand zum unteren Rand (Keil)
    let unten: number | null = null;
    let untenStelle = '';
    const wk = document.createTreeWalker(kopf, NodeFilter.SHOW_TEXT);
    for (let n = wk.nextNode(); n; n = wk.nextNode()) {
      const el = n.parentElement;
      if (!n.textContent?.trim() || !el?.checkVisibility({ visibilityProperty: true, opacityProperty: true }) || el.closest('.visually-hidden, .sr-only, [hidden]')) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      // Zeilen, die abgeschnitten sind (line-clamp, overflow), zählen nicht
      const box = el.getBoundingClientRect();
      for (const x of r.getClientRects()) {
        if (x.height === 0 || x.bottom > k.bottom || x.top >= box.bottom - 1) continue;
        const abstand = k.bottom - x.bottom;
        if (unten === null || abstand < unten) { unten = abstand; untenStelle = `„${n.textContent.trim().slice(0, 24)}“`; }
      }
    }
    // erster Textblock danach: der oberste sichtbare Inhalt (Text, Linie, Fläche, Feld) im nächsten Block
    let block = kopf.nextElementSibling;
    while (block && ['SCRIPT', 'STYLE', 'TEMPLATE'].includes(block.tagName)) block = block.nextElementSibling;
    let nach: number | null = null;
    let nachStelle = '';
    if (block) {
      const kandidaten: { top: number; stelle: string }[] = [];
      const w = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const el = n.parentElement;
        if (!n.textContent?.trim() || !el?.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
        if (el.closest('.visually-hidden, .sr-only')) continue;
        const r = document.createRange();
        r.selectNodeContents(n);
        const rr = [...r.getClientRects()].find((x) => x.height > 0);
        if (rr) kandidaten.push({ top: rr.top, stelle: `„${n.textContent.trim().slice(0, 24)}“` });
      }
      for (const el of block.querySelectorAll<HTMLElement>('*')) {
        // der Keil ist die Kante zwischen zwei Flächen, kein Inhalt
        if (el.closest('.keil') || !el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (r.height === 0 || r.width === 0) continue;
        const linie = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none' && !cs.borderTopColor.endsWith(', 0)');
        const flaeche = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== getComputedStyle(block).backgroundColor;
        // Marker-Quadrat vor Zwischenüberschriften (::before als Block oben)
        const vor = getComputedStyle(el, '::before');
        const marker = vor.content !== 'none' && vor.display === 'block' && vor.backgroundColor !== 'rgba(0, 0, 0, 0)';
        if (linie || flaeche || marker || ['IMG', 'INPUT', 'SELECT', 'TEXTAREA', 'CANVAS'].includes(el.tagName)) {
          kandidaten.push({ top: r.top, stelle: el.tagName.toLowerCase() + (el.classList[0] ? '.' + el.classList[0] : '') });
        }
      }
      const oben = kandidaten.sort((a, b) => a.top - b.top)[0];
      if (oben) { nach = oben.top - k.bottom; nachStelle = oben.stelle; }
    }
    return {
      kopf: true,
      frei: kopf.hasAttribute('data-kopf-frei'),
      soll,
      ersteZeile: erste ? erste.top - k.top : null,
      kickerUnten: kicker ? kicker.getBoundingClientRect().bottom - k.top : null,
      h1: h1 && kicker ? h1.getBoundingClientRect().top - k.top : null,
      nach,
      nachStelle,
      unten,
      untenStelle,
    };
  });
}

test('Köpfe: erste Zeile, Headline und Abstand zum ersten Textblock überall gleich', async ({ page }) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const fehler: string[] = [];
  const headlines: { seite: string; top: number }[] = [];
  for (const seite of seiten()) {
    await page.goto(seite);
    await page.evaluate(() => document.fonts.ready);
    const m = await messen(page);
    if (!m.kopf) {
      if (MENUE.some((p) => seite === p || seite === '/en' + p)) fehler.push(`${seite}: Menüseite ohne Kopf (.kopf)`);
      continue;
    }
    if (m.ersteZeile === null || Math.abs(m.ersteZeile - m.soll.oben) > 2) fehler.push(`${seite}: erste Zeile ${m.ersteZeile?.toFixed(0)} px unter der Kopfleiste, soll ${m.soll.oben} (--buehne-oben)`);
    if (!m.frei && m.h1 !== null && m.kickerUnten !== null) {
      if (Math.abs(m.h1 - m.kickerUnten - m.soll.kicker) > 2) fehler.push(`${seite}: Headline ${(m.h1 - m.kickerUnten).toFixed(0)} px unter dem Kicker, soll ${m.soll.kicker} (--kopf-kicker)`);
      headlines.push({ seite, top: m.h1 });
    }
    if (m.unten !== null && m.unten < m.soll.unten - 1) fehler.push(`${seite}: ${m.untenStelle} steht ${m.unten.toFixed(0)} px über dem unteren Rand des Kopfs, mindestens ${m.soll.unten} (--kopf-unten)`);
    // Text sitzt mit halber Zeilenhöhe im Block – bis 8 px darüber zählen als „gleich“
    if (m.nach !== null && (m.nach < m.soll.nach - 2 || m.nach > m.soll.nach + 8)) fehler.push(`${seite}: erster Textblock (${m.nachStelle}) ${m.nach.toFixed(0)} px unter dem Kopf, soll ${m.soll.nach} (--nach-kopf)`);
  }
  // Headline auf allen Seiten auf gleicher Höhe
  const tops = headlines.map((h) => h.top);
  const mitte = tops.sort((a, b) => a - b)[Math.floor(tops.length / 2)];
  for (const h of headlines) if (Math.abs(h.top - mitte) > 3) fehler.push(`${h.seite}: Headline ${h.top.toFixed(0)} px unter der Kopfleiste, auf den anderen Seiten ${mitte.toFixed(0)}`);
  expect(fehler).toEqual([]);
});

/**
 * Auftritt (src/scripts/kopf-auftritt.ts): Alle Unterseiten spielen beim Aufrufen denselben Auftritt ab wie Kalender
 * und Formate; Startseite und Profitraining (KEEP UP) behalten ihre eigene Bewegung. Danach steht alles wie ohne
 * Bewegung: keine geteilten Wörter, keine Reste von Verschiebung oder Deckkraft.
 */
const AUFTRITT = [
  '/termine/', '/formate/', '/news/', '/verein/', '/spenden/', '/kontakt/', '/netzwerk/', '/mitglied-werden/', '/kooperationen/',
  '/impressum/', '/formate/tanzkalender/', '/en/about/', '/termine/2026-10-31-pop-up/', '/gibt-es-nicht/',
  '/news/15-jahre-tanznetzdresden-der-rueckblick-von-rico-stehfest/', '/netzwerk/alba-t-alvarez/',
];

test('Köpfe: gleicher Auftritt auf allen Unterseiten', async ({ page, isMobile }) => {
  // die Bewegung hängt nicht von der Bildschirmbreite ab (src/scripts/kopf-auftritt.ts)
  test.skip(isMobile, 'gleiche Bewegung auf dem Handy');
  test.setTimeout(120_000);
  for (const seite of AUFTRITT) {
    await page.goto(seite);
    await expect(page.locator('[data-auftritt="da"]').first(), seite).toBeAttached();
    await expect
      .poll(() => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.kopf-wort, [data-kopf-wort], [data-kopf-vor], [data-kopf-folgt], .kopf__kicker')].filter((e) => e.classList.contains('kopf-wort') || e.style.opacity || e.style.transform).length), { message: seite, timeout: 4000 })
      .toBe(0);
  }
  for (const seite of ['/', '/profitraining/']) {
    await page.goto(seite);
    await expect(page.locator('[data-auftritt]'), seite).toHaveCount(0);
  }
  // bei „Bewegung reduzieren“ läuft nichts
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/verein/');
  await expect(page.locator('[data-auftritt]')).toHaveCount(0);
  await expect(page.locator('.kopf-wort')).toHaveCount(0);
});
