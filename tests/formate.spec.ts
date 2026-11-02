/**
 * Formate (/formate/, Entwurf design/entwuerfe/2026-11-formate/) und Tanzkalender-Archiv (/formate/tanzkalender/).
 * Daten: src/content/formate/, src/content/formate-archiv/. Plakate und PDFs der alten Website sind im Test nicht
 * erreichbar – geprüft werden Aufbau, Links und Bedienung.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';

const formate = readdirSync('src/content/formate').filter((f) => f.endsWith('.md'));
const ausgaben = parse(readFileSync('src/content/formate-archiv/tanzkalender.yaml', 'utf8')) as { id: string; pdf: string }[];

async function oeffnen(page: Page, pfad: string) {
  await page.clock.install({ time: new Date('2026-11-02T08:00:00+01:00') });
  await page.goto(pfad);
  await page.getByRole('button', { name: /^(Nur notwendige|Necessary only)$/ }).click();
}

test('Formate: Menü, Kopf mit Reitern, nächster Termin aus dem Kalender', async ({ page, isMobile }) => {
  await oeffnen(page, '/');
  if (!isMobile) {
    await page.locator('.site-nav').getByRole('link', { name: 'Formate' }).click();
    await expect(page).toHaveURL(/\/formate\/$/);
  } else await page.goto('/formate/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Acht Formate. Ein Netz.');

  const reiter = page.getByRole('tab');
  await expect(reiter).toHaveCount(formate.length);
  await expect(reiter.first()).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
  await expect(page.getByRole('tabpanel')).toContainText('Studio Round');

  // Reiter wählen (auf dem Handy ohne Namen, nur Nummer)
  await reiter.nth(2).click();
  await expect(reiter.nth(2)).toHaveAttribute('aria-selected', 'true');
  const panel = page.getByRole('tabpanel');
  await expect(panel).toContainText('KEEP UP');
  // KEEP UP: das nächste Training (wochen.yaml) – heute
  await expect(panel).toContainText(/Nächster Termin · Heute · Mo 2\. Nov · \d\d:\d\d/);
  await expect(panel.getByRole('link')).toHaveAttribute('href', '#keep-up');
  // Pfeiltasten wechseln den Reiter
  await reiter.nth(2).press('ArrowRight');
  await expect(reiter.nth(3)).toBeFocused();
  await expect(page.getByRole('tabpanel')).toContainText('vision:danceable');

  // Wechsel anhalten
  const pause = page.getByRole('button', { name: 'Anhalten' });
  await pause.click();
  await expect(page.getByRole('button', { name: 'Weiter' })).toHaveAttribute('aria-pressed', 'true');
});

test('Formate: Filter „Ich möchte …“, Leiste, Kasten mit Termin oder Rückblick', async ({ page, isMobile }) => {
  await oeffnen(page, '/formate/');
  const kapitel = page.locator('[data-kap]');
  await expect(kapitel).toHaveCount(formate.length);
  const gruppe = page.getByRole('group', { name: 'Formate filtern' });
  await gruppe.getByRole('button', { name: /^Trainieren/ }).click();
  await expect(kapitel.filter({ visible: true })).toHaveCount(1);
  await expect(page.locator('#keep-up')).toBeVisible();
  await expect(gruppe.getByRole('button', { name: /^Trainieren/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: `Alle ${formate.length} Formate zeigen →` }).click();
  await expect(kapitel.filter({ visible: true })).toHaveCount(formate.length);

  const keepUp = page.locator('#keep-up');
  await expect(keepUp.getByRole('heading', { level: 2 })).toHaveText('KEEP UP');
  await expect(keepUp.locator('.badge')).toHaveText('Training');
  await expect(keepUp.locator('[data-fo-cta]')).toHaveAttribute('href', /\/profitraining\/#kalender$/);
  await expect(keepUp.getByRole('link', { name: 'Trainingsplan →' })).toHaveAttribute('href', /\/profitraining\/$/);
  // ohne Termin: Hinweis auf den Newsletter
  await expect(page.locator('#bodies-and-textiles [data-fo-cta]')).toContainText('Termin folgt');
  await expect(page.locator('#bodies-and-textiles [data-fo-cta]')).toHaveAttribute('href', /\/#newsletter$/);
  // beendet: Laufzeit und Rückblick statt Termin, kein Kalender-Link
  const tanzpakt = page.locator('#tanzpakt-in-residence');
  await expect(tanzpakt.locator('dt').first()).toHaveText('Laufzeit');
  await expect(tanzpakt.locator('.fo-cta')).toContainText('Programm abgeschlossen');
  await expect(tanzpakt.locator('.fo-cta')).toHaveAttribute('href', /\/news\/3-jahre-tanzpakt-in-residence-resuemee-und-rueckschau\/$/);
  await expect(tanzpakt.getByRole('link', { name: 'Alle Termine →' })).toHaveCount(0);

  if (!isMobile) {
    const leiste = page.getByRole('navigation', { name: 'Formate im Detail' });
    await expect(leiste.getByRole('link')).toHaveCount(formate.length);
    await page.locator('#welttanztag').scrollIntoViewIfNeeded();
    await expect(leiste.locator('[aria-current="true"]')).toHaveText(/Welttanztag/);
  }
});

test('Formate: Chronik, Archiv zum Aufklappen, Mitmachen', async ({ page }) => {
  await oeffnen(page, '/formate/');
  await expect(page.locator('#fo-chronik-h')).toHaveText(/^Seit 2010\s*in Bewegung\.$/);
  await expect(page.locator('.fo-meilenstein')).toHaveCount(7);

  const archiv = page.locator('#archiv');
  const tk = archiv.locator('#archiv-tanzkalender');
  await expect(tk.getByRole('link', { name: 'Alle 18 Ausgaben →' })).toBeHidden();
  await tk.locator('summary').click();
  await expect(tk.getByRole('link', { name: 'Alle 18 Ausgaben →' })).toHaveAttribute('href', /\/formate\/tanzkalender\/$/);
  await expect(tk).toContainText('Mit');

  const mit = page.locator('#mitmachen');
  await expect(mit.getByRole('heading', { level: 2 })).toHaveText(/^Zeig deine Arbeit\.\s*Gestalte mit\.$/);
  await expect(mit.locator('.fo-call:visible')).toHaveCount(1);
  await expect(mit.locator('.fo-ags__liste li')).toHaveCount(JSON.parse(readFileSync('src/settings/arbeitsgruppen.json', 'utf8')).length);
  await expect(mit.getByRole('link', { name: /Mitglied werden/ })).toHaveAttribute('href', /\/mitglied-werden\/$/);
});

test('Formate: englische Fassung und Barrierefreiheit', async ({ page }) => {
  await oeffnen(page, '/en/formats/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Eight formats. One network.');
  await expect(page.locator('#keep-up .fo-fakten dt').nth(1)).toHaveText('Venue');
  await expect(page.locator('#archiv-tanzkalender summary')).toContainText('Monthly poster');
  const ergebnis = await new AxeBuilder({ page }).include('main').analyze();
  expect(ergebnis.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
});

test('Tanzkalender-Archiv: Jahrgänge, Großansicht zum Blättern, PDF', async ({ page }) => {
  await oeffnen(page, '/formate/tanzkalender/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(new RegExp(`^Tanzkalender\\s*Dresden\\.\\s*${ausgaben.length} Ausgaben\\.$`));
  await expect(page.getByRole('navigation', { name: 'Brotkrumen' }).getByRole('link', { name: 'Archiv' })).toHaveAttribute('href', /\/formate\/#archiv$/);
  const ansehen = page.getByRole('button', { name: /ansehen$/ });
  await expect(ansehen).toHaveCount(ausgaben.length);

  const jahre = page.getByRole('group', { name: 'Nach Jahrgang filtern' });
  const n2024 = ausgaben.filter((a) => a.id.startsWith('2024')).length;
  await jahre.getByRole('button', { name: `2024 ${n2024}` }).click();
  await expect(ansehen.filter({ visible: true })).toHaveCount(n2024);
  await expect(page.locator('[data-tka-jahr="2025"]')).toBeHidden();

  // Doppelausgabe Juli/August 2024: die neueste des Jahrgangs zuerst ist Dezember
  await page.getByRole('button', { name: 'Dezember 2024 ansehen' }).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('[data-lb-label]')).toHaveText('Dezember 2024');
  await expect(dlg.getByRole('button', { name: 'Vorherige Ausgabe' })).toBeDisabled();
  await page.keyboard.press('ArrowRight');
  await expect(dlg.locator('[data-lb-label]')).toHaveText('November 2024');
  await expect(dlg.locator('[data-lb-pdf]')).toHaveAttribute('href', ausgaben.find((a) => a.id === '2024-11')!.pdf);
  await page.keyboard.press('Escape');
  await expect(dlg).toBeHidden();
  await expect(page.getByRole('button', { name: 'November 2024 ansehen' })).toBeFocused();

  await expect(page.getByRole('link', { name: 'Juli / August 2024 als PDF (öffnet in neuem Tab)' })).toHaveAttribute('target', '_blank');
  await expect(page.getByRole('link', { name: '← Zurück zum Archiv' })).toHaveAttribute('href', /\/formate\/#archiv$/);
});

test('Tanzkalender-Archiv: englisch, alte Adresse leitet weiter', async ({ page }) => {
  await oeffnen(page, '/en/formats/dance-calendar/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(new RegExp(`^Tanzkalender\\s*Dresden\\.\\s*${ausgaben.length} issues\\.$`));
  await expect(page.getByRole('button', { name: 'View April 2026' })).toBeVisible();
  const ergebnis = await new AxeBuilder({ page }).include('main').analyze();
  expect(ergebnis.violations.map((v) => v.id)).toEqual([]);

  await page.goto('/tanzkalender/');
  await expect(page).toHaveURL(/\/formate\/tanzkalender\/$/);
});
