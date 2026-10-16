/**
 * Redaktion: Seitenleiste, Beitragsliste und Mediathek. Supabase ist nachgebaut (tests/redaktion-mock.ts).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { supabase } from '../src/settings/supabase';
import { redaktion, FOTOS } from './redaktion-mock';

test.skip(!supabase.url || !supabase.anonKey, 'Supabase nicht eingetragen');

const beitraege = [
  { id: 'a1', slug: 'open-call', status: 'veroeffentlicht', title: 'Open Call: POP UP Frühjahr 2027', teaser: 'Wir suchen Kurzstücke.', category: 'Ausschreibung', date: '2026-10-06', author: 'AG POP UP', updated_at: '2026-10-06T10:00:00Z', body: '', image_path: null, newsletter: true },
  { id: 'a2', slug: 'studio-round', status: 'entwurf', title: 'Studio Round #9', teaser: 'Drei Städte, ein Abend.', category: 'Netzwerk', date: '2026-10-01', author: 'Alina', updated_at: '2026-10-12T10:00:00Z', body: '::: bilder\nbilder:\n  - datei: vorhanden/x.jpg\n    alt: ""\n:::', image_path: 'vorhanden/titel.jpg', image_alt: 'Titel' },
  { id: 'a3', slug: 'spaeter', status: 'veroeffentlicht', title: 'Welttanztag', teaser: 'Die Stadt als Bühne.', category: 'Rückblick', date: '2099-10-20', author: 'Thomas', updated_at: '2026-10-12T10:00:00Z', body: '', image_path: null },
];
const zeilen = (page: import('@playwright/test').Page) => page.locator('.bl__zeile:visible');

test('Beitragsliste: Filter, Suche, Status und Hinweise', async ({ page }) => {
  await redaktion(page, { andere: beitraege });
  await page.goto('/intern/news/');
  await expect(page.getByRole('navigation', { name: 'Redaktion' }).getByRole('link', { name: /Beiträge/ })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('[data-nav-n="beitraege"]')).toHaveText('3');
  await expect(zeilen(page)).toHaveCount(3);
  // Geplantes steht oben
  await expect(zeilen(page).first()).toContainText('Erscheint am 20. Okt. 2099');
  await expect(page.getByRole('button', { name: 'Entwürfe 1' })).toBeVisible();
  await page.getByRole('button', { name: /^Online/ }).click();
  await expect(zeilen(page)).toHaveCount(1);
  await expect(zeilen(page)).toContainText('Newsletter');
  await page.getByRole('button', { name: /^Alle/ }).click();
  await page.getByLabel('Beiträge durchsuchen').fill('studio');
  await expect(zeilen(page)).toHaveCount(1);
  await expect(zeilen(page)).toContainText('Bildbeschreibung fehlt');
  await expect(zeilen(page)).toHaveAttribute('href', /\/intern\/news\/bearbeiten\/\?id=a2$/);
  await page.getByLabel('Beiträge durchsuchen').fill('gibt es nicht');
  await expect(page.locator('[data-empty]')).toHaveText('Keine Beiträge in dieser Ansicht.');
});

test('Mediathek: hochladen, beschreiben, Verwendung sehen, unbenutzte löschen', async ({ page }) => {
  const m = await redaktion(page, {
    andere: [{ id: 'a2', title: 'Studio Round #9', status: 'veroeffentlicht', body: '', image_path: 'vorhanden/titel.jpg' }],
    medien: [{ datei: 'vorhanden/titel.jpg', alt: '', alt_en: '', credit: '', focus: null }],
  });
  await page.goto('/intern/news/medien/');
  await expect(page.locator('.md-kachel')).toHaveCount(1);
  await expect(page.locator('[data-stat]')).toHaveText('1 Bild · 1 ohne Bildbeschreibung');
  // erstes Foto ist gewählt: Verwendung und Angaben
  await expect(page.locator('.md-detail__verwendet')).toContainText('Studio Round #9 →');
  await page.getByLabel('Bildbeschreibung (optional)').fill('Probe im Studio');
  await page.getByLabel('Fotonachweis').fill('Kim Foto');
  await expect.poll(() => m.medien.get('vorhanden/titel.jpg')?.credit).toBe('Kim Foto');
  expect(m.medien.get('vorhanden/titel.jpg')).toMatchObject({ alt: 'Probe im Studio' });
  await expect(page.locator('[data-stat]')).toHaveText('1 Bild · alle beschrieben');
  // Fokuspunkt
  const bild = page.locator('.md-detail .md-fokus img');
  const box = (await bild.boundingBox())!;
  await bild.click({ position: { x: box.width * 0.2, y: box.height * 0.5 } });
  await expect.poll(() => m.medien.get('vorhanden/titel.jpg')?.focus).toMatch(/^(19|20|21)% (49|50|51)%$/);
  // Website wird neu gebaut, weil das Foto in einem veröffentlichten Beitrag steht
  await expect.poll(() => m.neubau, { timeout: 12000 }).toBe(1);

  // hochladen: zwei Fotos
  await page.locator('[data-upload]').setInputFiles(FOTOS.slice(0, 2));
  await expect(page.locator('.md-kachel')).toHaveCount(3);
  expect(m.hochgeladen).toHaveLength(2);
  expect(m.medien.has(m.hochgeladen[0])).toBe(true);
  await expect(page.locator('.md-detail__verwendet')).toContainText('Noch in keinem Beitrag.');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Foto löschen' }).click();
  await expect(page.locator('.md-kachel')).toHaveCount(2);
  expect(m.geloescht).toHaveLength(1);
});

test('Mediathek ohne Migration: Hinweis statt Fehler', async ({ page }) => {
  await redaktion(page, { ohneMediathek: true, andere: [{ id: 'a2', title: 'Alt', status: 'entwurf', body: '', image_path: 'vorhanden/titel.jpg' }] });
  await page.goto('/intern/news/medien/');
  await expect(page.locator('[data-migration]')).toBeVisible();
  await expect(page.locator('.md-kachel')).toHaveCount(1);
  await expect(page.getByLabel('Fotonachweis')).toBeDisabled();
});

for (const pfad of ['/intern/news/', '/intern/news/medien/', '/intern/news/bearbeiten/']) {
  test(`${pfad} ist barrierearm (axe) und ohne seitliches Scrollen`, async ({ page }) => {
    await redaktion(page, { andere: beitraege });
    await page.goto(pfad);
    await expect(page.locator('.intern')).toHaveAttribute('data-state', 'ready');
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    const serious = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
  });
}
