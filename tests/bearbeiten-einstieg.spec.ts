/**
 * „Seite bearbeiten“ auf der Website: nur für angemeldete Redaktion, führt an die passende Stelle
 * (src/components/BearbeitenKnopf.astro, src/pages/intern/redaktion/bearbeiten/).
 */
import { test, expect } from '@playwright/test';
import { supabase } from '../src/settings/supabase';
import { redaktion } from './redaktion-mock';

test.skip(!supabase.url || !supabase.anonKey, 'Supabase nicht eingetragen');

const knopf = (page: import('@playwright/test').Page) => page.getByRole('link', { name: 'Seite bearbeiten' });
const online = { id: 'n1', slug: 'online', status: 'veroeffentlicht', title: 'Schon online', teaser: 'Kurz.', category: 'Netzwerk', date: '2026-10-01', author: 'Pia', featured: false, body: 'Text.', body_en: null, facts: [], facts_en: [], image_focus: null, newsletter: false, updated_at: '2026-10-15T09:00:00Z' };

test('Besucher:innen sehen keinen Knopf', async ({ page }) => {
  await page.goto('/kooperationen/');
  await expect(page.locator('h1')).toBeVisible();
  await expect(knopf(page)).toHaveCount(0);
});

test('Redaktion: Knopf auf der Website führt zur Seite in der Redaktion', async ({ page }) => {
  await redaktion(page);
  // einmal im internen Bereich gewesen → der Browser merkt sich die Rolle
  await page.goto('/intern/');
  await expect(page.locator('[data-intern]')).toHaveAttribute('data-state', 'ready');
  await page.goto('/kooperationen/');
  await knopf(page).click();
  await expect(page).toHaveURL(/\/intern\/redaktion\/seiten\/\?s=kooperationen$/);
  // abgemeldet: kein Knopf mehr
  await page.evaluate(() => localStorage.removeItem('tndd-redaktion'));
  await page.goto('/kooperationen/');
  await expect(knopf(page)).toHaveCount(0);
});

test('Redaktion: Beitrag öffnet den Editor gleich im Bearbeiten auf der Seite', async ({ page }) => {
  await redaktion(page, { zeile: online });
  await page.goto('/intern/redaktion/bearbeiten/?seite=news/online/');
  await expect(page).toHaveURL(/\/intern\/news\/bearbeiten\/\?id=n1/);
  await expect(page.getByRole('dialog', { name: 'Vorschau' })).toBeVisible();
  await expect(page.frameLocator('[data-vorschau-frame]').locator('.ak__titel')).toHaveText('Schon online');
});
