/**
 * Intern → Kalender: Termine eintragen, bearbeiten, kopieren, löschen, Termine aus Dateien übernehmen, Abo für
 * Google Kalender. Supabase ist nachgebaut (tests/redaktion-mock.ts). Die Daten liegen in dieser Woche.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { redaktion } from './redaktion-mock';
import { montag, plusTage } from '../src/lib/keep-up-plan';
import { alsTerminDaten, slugAus } from '../src/lib/kalender-intern';

const heute = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
const mo = montag(heute);
const pia = { display_name: 'Pia Presse', role: 'presse' };
const termin = (z: Record<string, unknown> = {}) => ({
  id: 't1', slug: `${plusTage(mo, 3)}-studio-round-10`, titel: 'Studio Round #10', titel_en: '', datum: plusTage(mo, 3), von: '19:30:00', bis: '21:00:00',
  zeit_text: '', ort: 'Villa Wigman für Tanz', kategorie: 'Diskurs', kurz: 'Showing und Gespräch.', kurz_en: '', text: '', link: '', format: '',
  personen: [], news: '', sichtbar: true, ...z,
});
const schublade = (page: Page) => page.locator('[data-schublade]');
const woche = (page: Page) => page.locator(`[data-woche="${mo}"]`);

test('Termin eintragen: Tag anklicken, ausfüllen, Website baut neu', async ({ page }) => {
  const m = await redaktion(page, { profil: pia, kalender: [], keepup: [] });
  await page.goto('/intern/kalender/');
  const nav = page.getByRole('navigation', { name: 'Interner Bereich' });
  await expect(nav.getByRole('link', { name: /^Kalender/ })).toHaveAttribute('aria-current', 'page');

  // Donnerstag dieser Woche
  await woche(page).locator('.pl-tag').nth(3).click();
  const s = schublade(page);
  await expect(page.getByRole('dialog', { name: 'Neuer Termin' })).toBeVisible();
  await expect(s.getByLabel('Datum')).toHaveValue(plusTage(mo, 3));

  // ohne Titel geht es nicht
  await s.getByRole('button', { name: 'Eintragen' }).click();
  await expect(s.locator('[data-s-msg]')).toHaveText('Bitte einen Titel eintragen.');

  await s.getByLabel('Titel', { exact: true }).fill('Studio Round #10');
  await expect(page.getByRole('dialog', { name: 'Studio Round #10' })).toBeVisible();
  await s.getByLabel('Beginn').fill('19:30');
  await s.getByLabel(/^Ende/).fill('21:00');
  await s.getByRole('button', { name: 'Diskurs' }).click();
  await s.getByRole('combobox', { name: 'Ort', exact: true }).fill('Villa Wigman für Tanz');
  await s.locator('#t-kurz').fill('x'.repeat(241));
  await expect(s.locator('[data-t-zahl]')).toHaveText('241 / 240');
  await s.getByRole('button', { name: 'Eintragen' }).click();
  await expect(s.locator('[data-s-msg]')).toContainText('zu lang');
  await s.locator('#t-kurz').fill('Showing und moderiertes Gespräch.');
  await s.getByLabel(/^Link/).fill('https://tickets.example.org/sr10');

  // mehr Angaben: Mitwirkende aus der Liste, Format
  await s.getByText('Mehr Angaben').click();
  await s.getByLabel('Mitwirkende aus dem Netzwerk').fill('Alina Lucifero');
  await s.getByLabel('Mitwirkende aus dem Netzwerk').press('Enter');
  await expect(s.locator('.kal-chip')).toHaveText(['Alina Lucifero×']);
  await s.getByLabel('Gehört zum Format').selectOption({ label: 'Studio Round' });
  await s.getByRole('button', { name: 'Eintragen' }).click();

  await expect(s).toBeHidden();
  await expect(page.locator('[data-ku-toast]')).toContainText('Eingetragen. Die Website zeigt das in wenigen Minuten.');
  expect(m.kalenderAenderungen[0]).toEqual({
    methode: 'POST',
    body: {
      slug: `${plusTage(mo, 3)}-studio-round-10`, titel: 'Studio Round #10', titel_en: '', datum: plusTage(mo, 3), von: '19:30', bis: '21:00', zeit_text: '',
      ort: 'Villa Wigman für Tanz', kategorie: 'Diskurs', kurz: 'Showing und moderiertes Gespräch.', kurz_en: '', text: '', link: 'https://tickets.example.org/sr10',
      format: 'studio-round', personen: ['alina-lucifero'], news: '', sichtbar: true, eintritt: '', eintritt_en: '',
    },
  });
  expect(m.neubau).toBe(1);
  const block = woche(page).locator('.pl-block--termin', { hasText: 'Studio Round #10' });
  await expect(block).toContainText('Diskurs · 19:30–21:00 · Villa Wigman für Tanz');
  await expect(block).toContainText('Online');
  await expect(woche(page).locator('.pl-tag').nth(3).locator('.pl-mk--diskurs')).toHaveCount(1);
});

test('Termin bearbeiten, als Entwurf, Kopie eine Woche später, löschen und rückgängig', async ({ page }) => {
  const m = await redaktion(page, { profil: pia, kalender: [termin()], keepup: [] });
  await page.goto('/intern/kalender/');
  await woche(page).locator('.pl-block--termin', { hasText: 'Studio Round #10' }).click();
  const s = schublade(page);
  await expect(s.locator('[data-s-tag]')).toHaveText('Termin bearbeiten');
  await expect(s.locator('[data-s-typ]')).toBeHidden();
  await expect(s.getByLabel('Beginn')).toHaveValue('19:30');

  // nur intern: Entwurf, kein Neubau
  await s.getByLabel(/Auf der Website zeigen/).uncheck();
  await s.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.locator('[data-ku-toast]')).toContainText('Gespeichert. Als Entwurf nur hier zu sehen.');
  expect(m.kalenderAenderungen.at(-1)).toMatchObject({ methode: 'PATCH', body: { sichtbar: false, slug: `${plusTage(mo, 3)}-studio-round-10` } });
  expect(m.neubau).toBe(0);
  await expect(woche(page).locator('.pl-block--termin', { hasText: 'Studio Round #10' })).toContainText('Entwurf');

  // Kopie: eine Woche später, neue Adresse
  await woche(page).locator('.pl-block--termin', { hasText: 'Studio Round #10' }).click();
  await s.getByRole('button', { name: 'Kopie anlegen' }).click();
  await expect(s.getByLabel('Datum')).toHaveValue(plusTage(mo, 10));
  await s.getByLabel(/Auf der Website zeigen/).check();
  await s.getByRole('button', { name: 'Eintragen' }).click();
  await expect(s).toBeHidden();
  expect(m.kalenderAenderungen.at(-1)).toMatchObject({ methode: 'POST', body: { slug: `${plusTage(mo, 10)}-studio-round-10`, datum: plusTage(mo, 10) } });

  // löschen mit Rückfrage, dann rückgängig
  await page.goto('/intern/kalender/');
  await woche(page).locator('.pl-block--termin', { hasText: 'Studio Round #10' }).click();
  await s.getByRole('button', { name: 'Löschen' }).click();
  await s.getByRole('button', { name: 'Wirklich löschen?' }).click();
  await expect(woche(page).locator('.pl-block--termin', { hasText: 'Studio Round #10' })).toHaveCount(0);
  await page.locator('[data-ku-toast]').getByRole('button', { name: 'Rückgängig' }).click();
  await expect(woche(page).locator('.pl-block--termin', { hasText: 'Studio Round #10' })).toHaveCount(1);
});

test('Termin aus einer Datei übernehmen, Filter, Abo für Google Kalender', async ({ page }) => {
  const m = await redaktion(page, { profil: pia, kalender: [termin()], keepup: [{ id: 'k1', dozent: 'aurora-fradella', woche: mo, tage: [1, 2] }] });
  await page.goto('/intern/kalender/');
  const datei = await page.evaluate(() => JSON.parse(document.querySelector('[data-ku-daten]')!.textContent!).kalender.dateiTermine[0] as { slug: string; datum: string; titel: string });
  // zum Monat der Datei blättern
  const diff = (Number(datei.datum.slice(0, 4)) - Number(heute.slice(0, 4))) * 12 + Number(datei.datum.slice(5, 7)) - Number(heute.slice(5, 7));
  for (let i = 0; i < Math.abs(diff); i++) await page.getByRole('button', { name: diff > 0 ? 'Nächster Monat' : 'Vorheriger Monat' }).click();
  const block = page.locator(`[data-termin="${datei.slug}"]`);
  await expect(block).toContainText('Datei');
  await block.click();
  const s = schublade(page);
  await expect(s.locator('[data-s-tag]')).toHaveText('Termin aus Datei');
  await expect(s.locator('[data-t-datei]')).toContainText('steht als Datei auf der Website');
  await expect(s.getByLabel('Titel', { exact: true })).toHaveValue(datei.titel);
  await s.getByRole('button', { name: 'In den Kalender übernehmen' }).click();
  await expect(s).toBeHidden();
  expect(m.kalenderAenderungen.at(-1)).toMatchObject({ methode: 'POST', body: { slug: datei.slug, titel: datei.titel } });
  await expect(page.locator(`[data-termin="${datei.slug}"]`)).toContainText('Online');

  // Filter „Termine“: KEEP UP wird blass
  await page.goto('/intern/kalender/');
  await page.locator('.pl-chip', { hasText: 'Termine' }).click();
  await expect(woche(page).locator('.pl-block:not(.pl-block--termin)')).toHaveClass(/is-blass/);
  await expect(woche(page).locator('.pl-block--termin').first()).not.toHaveClass(/is-blass/);

  // Abo
  await page.getByText('Im Google Kalender abonnieren').click();
  await expect(page.getByLabel('Adresse des Kalender-Abos')).toHaveValue(/^https?:\/\/.+\/termine\.ics$/);
});

test('Kalender: Barrierefreiheit von Übersicht und Termin-Fenster', async ({ page }) => {
  const pruefen = async () => {
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`);
  };
  await redaktion(page, { profil: pia, kalender: [termin(), termin({ id: 't2', slug: `${plusTage(mo, 5)}-pop-up`, titel: 'POP UP', datum: plusTage(mo, 5), kategorie: 'Bühne', sichtbar: false })], keepup: [] });
  await page.goto('/intern/kalender/');
  await expect(page.locator('.pl-block--termin').first()).toBeVisible();
  await page.waitForTimeout(1200);
  expect(await pruefen()).toEqual([]);
  await page.getByRole('button', { name: 'Termin eintragen', exact: true }).click();
  await page.waitForTimeout(800);
  await page.getByText('Mehr Angaben').click();
  expect(await pruefen()).toEqual([]);
});

test('Logik: Adresse und Felder wie eine Termin-Datei', async ({}, info) => {
  test.skip(info.project.name !== 'desktop', 'ohne Browser, einmal reicht');
  expect(slugAus('2026-11-20', 'Studio Round #10 – Gäste & Gespräch')).toBe('2026-11-20-studio-round-10-gaste-und-gesprach');
  expect(slugAus('2026-11-20', '!!!')).toBe('2026-11-20-termin');
  const { id: _i, sichtbar: _s, ...r } = termin({ personen: ['alina-lucifero'], format: 'studio-round', link: 'https://x.org', bis: null });
  expect(alsTerminDaten(r as Parameters<typeof alsTerminDaten>[0])).toMatchObject({
    title: 'Studio Round #10', start: `${plusTage(mo, 3)} 19:30`, end: undefined, venue: 'Villa Wigman für Tanz', category: 'Diskurs',
    teaser: 'Showing und Gespräch.', people: ['alina-lucifero'], link: 'https://x.org', format: { id: 'studio-round', collection: 'formate' }, draft: false,
  });
});
