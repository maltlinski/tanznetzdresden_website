import { test, expect, type Page } from '@playwright/test';
import { readFileSync, statSync } from 'node:fs';
import { veroeffentlicht } from './news-daten';

/**
 * Festlegungen aus der Durchsicht vom November 2026 (docs/entwicklung.md, „Tempo und Technik“):
 * Mitgliedsantrag, Cookie-Hinweis nur auf Wunsch, bildschirmfüllendes Handy-Menü, Schriften als WOFF2,
 * Silbentrennung nur im Fließtext, kleine News-Übersicht, Angaben für geteilte Links und Startbildschirm.
 */

const ohneHinweis = (page: Page) =>
  page.addInitScript(() => localStorage.setItem('tndd-consent', JSON.stringify({ v: 1, date: '2026-10-15T00:00:00Z', categories: { notwendig: true } })));

test('Mitglied werden: kein Platzhalter sichtbar, Formular prüft die Angaben und schickt den Antrag ab', async ({ page }) => {
  await ohneHinweis(page);
  let gesendet: Record<string, string> | null = null;
  await page.route('**/rest/v1/rpc/mitgliedsantrag_stellen', (r) => {
    gesendet = r.request().postDataJSON();
    return r.fulfill({ status: 204, body: '' });
  });
  await page.goto('/mitglied-werden/');
  // Platzhalter aus den Vereinsdaten („[BITTE ERGÄNZEN …]“) erscheinen nicht auf der Seite
  await expect(page.locator('main')).not.toContainText('[');

  const form = page.locator('[data-antrag]');
  const senden = form.getByRole('button', { name: 'Antrag senden' });
  await senden.click();
  await expect(form.getByRole('alert')).toHaveText('Bitte gib deinen Namen an.');
  await form.getByLabel('Name').fill('Ada Beispiel');
  await form.getByLabel('E-Mail', { exact: true }).fill('ada');
  await senden.click();
  await expect(form.getByRole('alert')).toHaveText('Bitte gib eine gültige E-Mail-Adresse an.');
  await form.getByLabel('E-Mail', { exact: true }).fill('ada@example.org');
  await form.getByLabel(/Wer bist du/).fill('Ich arbeite als Choreografin in Dresden.');
  await senden.click();
  await expect(form.getByRole('alert')).toHaveText('Bitte stimme der Verarbeitung deiner Angaben zu.');
  expect(gesendet).toBeNull();

  await form.getByText('Fördermitglied werden').click();
  await form.locator('.ma__box').click();
  // Schutz vor Bots: in den ersten drei Sekunden wird nichts abgeschickt
  await page.waitForTimeout(3100);
  await senden.click();
  await expect(page.getByRole('status').filter({ hasText: 'dein Antrag ist beim Vorstand angekommen' })).toBeVisible();
  await expect(form).toBeHidden();
  expect(gesendet).toEqual({
    p_name: 'Ada Beispiel', p_email: 'ada@example.org', p_art: 'Fördermitglied',
    p_nachricht: 'Ich arbeite als Choreografin in Dresden.', p_sprache: 'de',
  });
});

test('Cookie-Hinweis: verdeckt beim ersten Besuch nichts; ausführlich über „Cookie-Einstellungen“', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('load');
  const banner = page.getByRole('dialog', { name: 'Deine Privatsphäre' });
  // ohne Statistik nichts zum Wegklicken: externe Inhalte fragen dort, wo sie stehen
  await expect(banner).toBeHidden();
  await page.getByRole('button', { name: 'Cookie-Einstellungen' }).click();
  await expect(banner.getByRole('heading', { name: 'Deine Privatsphäre' })).toBeVisible();
  await expect(banner.getByRole('checkbox', { name: /Externe Medien/ })).toBeVisible();
  // beide Hauptknöpfe gleich gewichtet (gleiche Farben)
  const farbe = (name: string) => banner.getByRole('button', { name }).evaluate((b) => `${getComputedStyle(b).backgroundColor} ${getComputedStyle(b).color}`);
  expect(await farbe('Alle akzeptieren')).toBe(await farbe('Nur notwendige'));
});

test('Menü auf dem Handy füllt den Bildschirm und führt auch zu Netzwerk und Kontakt', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'nur mobil');
  await ohneHinweis(page);
  await page.goto('/verein/');
  await page.evaluate(() => scrollTo(0, 400));
  await page.getByRole('button', { name: 'Menü' }).click();
  const kopf = (await page.locator('[data-header]').boundingBox())!;
  expect(kopf.y).toBe(0);
  expect(kopf.height).toBeGreaterThanOrEqual(page.viewportSize()!.height - 1);
  await expect(page.locator('html')).toHaveClass(/menu-offen/);
  await expect(page.locator('#site-menu').getByRole('link', { name: 'Netzwerk & Profile' })).toBeVisible();
  await page.locator('#site-menu').getByRole('link', { name: 'Kontakt & Presse' }).click();
  await expect(page).toHaveURL(/\/kontakt\/$/);
  await expect(page.locator('html')).not.toHaveClass(/menu-offen/);
});

test('Schriften kommen als WOFF2, Überschrift und Fließtext werden vorab geladen', async ({ page }) => {
  await ohneHinweis(page);
  const schriften: string[] = [];
  page.on('response', (r) => r.request().resourceType() === 'font' && schriften.push(new URL(r.url()).pathname));
  await page.goto('/verein/');
  await page.evaluate(() => document.fonts.ready);
  expect(schriften.length).toBeGreaterThan(0);
  expect(schriften.filter((s) => !s.endsWith('.woff2'))).toEqual([]);
  const vorab = await page.locator('link[rel="preload"][as="font"]').evaluateAll((ls) => ls.map((l) => l.getAttribute('href')!));
  expect(vorab.some((h) => /work-sans-latin-800/.test(h))).toBe(true);
  expect(vorab.some((h) => /open-sans-latin-400-normal/.test(h))).toBe(true);
});

test('Silbentrennung: Knöpfe, Kartentitel und kleine Zeilen trennen nie, Überschriften nur sehr lange Wörter', async ({ page }) => {
  await ohneHinweis(page);
  await page.goto('/news/');
  const trennung = (sel: string) => page.locator(sel).first().evaluate((e) => getComputedStyle(e).hyphens);
  expect(await trennung('[data-sort]')).toBe('manual');
  expect(await trennung('.mono-link')).toBe('manual');
  expect(await trennung('main p')).toBe('auto');
  // Überschriften: erst ab 16 Buchstaben („TanzNetzDresden“ hat 15), Zeilen ausgewogen
  const h1 = page.locator('h1');
  expect(await h1.evaluate((e) => getComputedStyle(e).getPropertyValue('hyphenate-limit-chars'))).toMatch(/^16\b/);
  expect(await h1.evaluate((e) => getComputedStyle(e).textWrap || getComputedStyle(e).getPropertyValue('text-wrap-style'))).toMatch(/balance/);
  // Kartentitel außerhalb von Überschriften (Netzwerk) trennen gar nicht
  await page.goto('/netzwerk/');
  expect(await trennung('.card__name')).toBe('manual');
});

test('News-Übersicht bleibt klein: neueste Beiträge im HTML, ältere werden nachgeladen', async ({ page, request }) => {
  const alle = veroeffentlicht();
  test.skip(alle.length <= 30, 'zu wenige Beiträge zum Teilen');
  expect(statSync('dist/news/index.html').size).toBeLessThan(200_000);
  const html = readFileSync('dist/news/index.html', 'utf8');
  // Titelthema und die neuesten 24
  expect(html.match(/data-post/g)!.length).toBe(25);
  const rest = await request.get('/news/weitere/');
  expect(rest.ok()).toBe(true);
  const restHtml = await rest.text();
  expect(restHtml.match(/data-post/g)!.length).toBe(alle.length - 25);
  expect(restHtml).toContain('noindex, follow');
  expect(readFileSync('dist/sitemap-0.xml', 'utf8')).not.toContain('news/weitere');

  // im Browser: der älteste Beitrag ist über die Suche zu finden, also nachgeladen
  await ohneHinweis(page);
  await page.goto('/news/');
  const aeltester = alle.at(-1)!;
  await page.getByRole('searchbox', { name: 'Beiträge durchsuchen' }).fill(aeltester.title);
  await expect(page.locator(`[data-liste] a.post[href$="/news/${aeltester.id}/"]`)).toBeVisible();
});

test('Geteilte Links und Startbildschirm: Beitrag als Artikel, Profil als Person, Manifest mit Symbolen', async ({ page, request }) => {
  const beitrag = veroeffentlicht()[0];
  await page.goto(`/news/${beitrag.id}/`);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  await expect(page.locator('meta[property="article:published_time"]')).toHaveAttribute('content', beitrag.date);
  await page.goto('/netzwerk/alina-lucifero/');
  const daten = await page.locator('script[type="application/ld+json"]').evaluateAll((ss) => ss.map((s) => JSON.parse(s.textContent!)));
  expect(daten.find((d) => d['@type'] === 'Person')?.name).toBe('Alina Lucifero');

  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(href!)).json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.map((i: { purpose: string }) => i.purpose).sort()).toEqual(['any', 'any', 'maskable']);
  for (const icon of manifest.icons) {
    const r = await request.get(icon.src);
    expect(r.headers()['content-type'], icon.src).toContain('image/png');
  }
  expect((await request.get((await page.locator('link[rel="apple-touch-icon"]').getAttribute('href'))!)).ok()).toBe(true);
});

test('Kalender: die drei Links unter dem Mini-Monat stehen untereinander', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'Spalte links nur auf breiten Bildschirmen geprüft');
  await ohneHinweis(page);
  await page.goto('/termine/');
  const oben = await page.locator('.tk-aktionen > *').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  expect(oben).toHaveLength(3);
  expect(new Set(oben).size).toBe(3);
});

test('Seitenwechsel blendet weich um, ohne Fehler; die Kopfleiste bleibt stehen', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'Menüzeile nur auf breiten Bildschirmen');
  await ohneHinweis(page);
  const fehler: string[] = [];
  page.on('pageerror', (e) => fehler.push(String(e)));
  await page.addInitScript(() => addEventListener('pagereveal', (e) => ((window as unknown as { blende: boolean }).blende = !!(e as PageRevealEvent).viewTransition)));
  await page.goto('/kontakt/');
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Kalender' }).click();
  await expect(page).toHaveURL(/\/termine\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tanz in Dresden');
  expect(await page.evaluate(() => (window as unknown as { blende: boolean }).blende)).toBe(true);
  expect(await page.locator('[data-header]').evaluate((e) => getComputedStyle(e).viewTransitionName)).toBe('kopfleiste');
  expect(fehler).toEqual([]);
});
