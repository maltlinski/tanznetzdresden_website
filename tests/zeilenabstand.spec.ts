/**
 * Regel „Zeilenabstand“ (docs/entwicklung.md#zeilenabstand-regel, Tokens in src/styles/global.css): Fließtext
 * – dunkle Schrift auf hellem Grund – steht kompakt mit `--lh-text` (Feedback 2026-11-01: besser lesbar und
 * platzsparend, vor allem auf dem Handy). Lange Lesetexte (Beiträge, Rechtstexte) nehmen `--lh-lesetext`.
 * Heller Text auf dunklem Grund ist ausgenommen.
 *
 * Geprüft wird jeder mehrzeilige Absatz in Open Sans auf den Seiten der Sitemap (je Bereich bis zu drei,
 * Deutsch und Englisch), auf Desktop und Handy. Neue Gestaltung: `line-height: var(--lh-text)` statt fester Werte.
 */
import { test, expect, type Page } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';

/** Lange Lesetexte: Beitragstext und Markdown-Seiten (Bildunterschriften darin sind normaler Fließtext) */
const LESETEXT = ['.ab__text', '.prose', '.tb__text', '.pueber__bio'];
const KEIN_LESETEXT = ['.nb__cap', 'figcaption', '.nh', '.ns__p', '.ab__text ul:has(> li > strong:first-child)'];

function seiten(): string[] {
  const datei = 'dist/sitemap-0.xml';
  if (!existsSync(datei)) return ['/'];
  const pfade = [...readFileSync(datei, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const je: Record<string, string[]> = {};
  for (const p of pfade) {
    const teile = p.split('/').filter(Boolean);
    if (teile.includes('intern') || teile.includes('admin')) continue;
    const bereich = teile[0] === 'en' ? teile.slice(0, 2).join('/') : (teile[0] ?? '');
    (je[bereich] ??= []).push(p);
  }
  return Object.values(je).flatMap((l) => l.slice(0, 3));
}

async function pruefen(page: Page, seite: string): Promise<string[]> {
  return page.evaluate(
    ({ seite, lesetext, keinLesetext }) => {
      const px = (v: string) => {
        const d = document.createElement('div');
        d.style.cssText = `position:absolute;visibility:hidden;font-size:100px;line-height:var(${v})`;
        d.textContent = 'x';
        document.body.append(d);
        const h = parseFloat(getComputedStyle(d).lineHeight) / 100;
        d.remove();
        return h;
      };
      const soll = { text: px('--lh-text'), lese: px('--lh-lesetext') };
      const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
      const hell = ([r, g, b]: number[]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const grund = (el: Element): number[] => {
        for (let e: Element | null = el; e; e = e.parentElement) {
          const c = rgb(getComputedStyle(e).backgroundColor);
          if (c.length >= 3 && (c[3] ?? 1) > 0.5) return c;
          // Bild oder Fläche dahinter, die nicht als Farbe ankommt: nicht prüfen
          if (getComputedStyle(e).backgroundImage !== 'none') return [0, 0, 0];
        }
        return [255, 255, 255];
      };
      const raus: string[] = [];
      const gesehen = new Set<string>();
      for (const el of document.querySelectorAll<HTMLElement>('main *')) {
        if (/^(H[1-6]|BUTTON|LABEL|INPUT|TEXTAREA|SELECT|OPTION|SCRIPT|STYLE|SVG|TH|TD|CODE|PRE)$/.test(el.tagName)) continue;
        const eigen = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent ?? '').join('').trim();
        if (eigen.length < 40) continue;
        const cs = getComputedStyle(el);
        if (!cs.fontFamily.startsWith('"Open Sans"') && !cs.fontFamily.startsWith('Open Sans')) continue;
        const fs = parseFloat(cs.fontSize);
        if (fs < 13 || fs > 22 || cs.display.startsWith('inline')) continue;
        if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true }) || el.closest('.visually-hidden, .sr-only, [aria-hidden="true"]')) continue;
        const lh = parseFloat(cs.lineHeight);
        if (!lh || el.getBoundingClientRect().height < lh * 1.8) continue;
        // nur dunkle Schrift auf hellem Grund (Weiß, Tint, auch Cyan mit lila Schrift)
        if (hell(rgb(cs.color)) > 0.35 || hell(grund(el)) < 0.5) continue;
        const ziel = el.closest(lesetext.join(', ')) && !el.closest(keinLesetext.join(', ')) ? soll.lese : soll.text;
        const ist = lh / fs;
        if (Math.abs(ist - ziel) <= 0.02) continue;
        const stelle = [el.parentElement?.classList[0], el.tagName.toLowerCase() + (el.classList[0] ? '.' + el.classList[0] : '')].filter(Boolean).join(' > ');
        if (gesehen.has(stelle)) continue;
        gesehen.add(stelle);
        raus.push(`${seite} · ${stelle} · ${ist.toFixed(2)} statt ${ziel.toFixed(2)} („${eigen.slice(0, 30)}“)`);
      }
      return raus;
    },
    { seite, lesetext: LESETEXT, keinLesetext: KEIN_LESETEXT },
  );
}

test('Zeilenabstand: Fließtext dunkel auf hell überall kompakt (--lh-text, Lesetexte --lh-lesetext)', async ({ page }) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const fehler: string[] = [];
  for (const seite of seiten()) {
    await page.goto(seite);
    await page.evaluate(() => document.fonts.ready);
    fehler.push(...(await pruefen(page, seite)));
  }
  // aufgeklappter Termin im Kalender (erst nach Klick sichtbar)
  await page.goto('/termine/');
  await page.locator('.tk-ev__knopf').first().click();
  await expect(page.locator('.tk-detail')).toBeVisible();
  fehler.push(...(await pruefen(page, '/termine/ (Termin offen)')));
  expect(fehler).toEqual([]);
});
