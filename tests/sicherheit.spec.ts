/**
 * Sicherheit der gebauten Seiten: Daten im <script> der Seite (ld+json, Startdaten) gehen immer über jsonImHtml()
 * (src/lib/json-im-html.ts). Sonst könnte ein Profiltext mit „</script>“ das Skript beenden und eigenen Code auf
 * die Website bringen. Die Zugriffsregeln der Datenbank prüft supabase/pruefen.sql (im SQL-Editor, docs/intern.md).
 */
import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { jsonImHtml } from '../src/lib/json-im-html';

const dateien = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? dateien(p) : /\.(astro|ts)$/.test(n) ? [p] : [];
  });

test('jsonImHtml: „</script>“ beendet das Skript nicht, die Daten bleiben gleich', () => {
  const daten = { name: 'Eve</script><script>alert(1)</script>', text: 'a < b <!-- c -->', n: 3 };
  const s = jsonImHtml(daten);
  expect(s).not.toContain('<');
  expect(JSON.parse(s)).toEqual(daten);
});

test('Quelltext: Daten in der Seite nur über jsonImHtml', () => {
  const treffer = dateien('src')
    .filter((p) => !p.endsWith('json-im-html.ts'))
    .flatMap((p) => {
      const t = readFileSync(p, 'utf8');
      return [/set:html=\{JSON\.stringify\(/, /\.replace\(\/<\/g, '\\\\u003c'\)/].some((r) => r.test(t)) ? [p] : [];
    });
  expect(treffer, 'Bitte jsonImHtml() aus src/lib/json-im-html.ts nehmen').toEqual([]);
});

test('Gebaute Seiten: jeder Datenblock für Suchmaschinen ist gültiges JSON', async ({ page }) => {
  const termin = readdirSync('src/content/termine').find((n) => n.endsWith('.md'))!.replace(/\.md$/, '');
  for (const pfad of ['/', '/netzwerk/alba-t-alvarez/', `/termine/${termin}/`, '/news/15-jahre-tanznetzdresden-der-rueckblick-von-rico-stehfest/']) {
    await page.goto(pfad);
    const bloecke = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(bloecke.length, pfad).toBeGreaterThan(0);
    for (const b of bloecke) expect(() => JSON.parse(b), pfad).not.toThrow();
  }
});
