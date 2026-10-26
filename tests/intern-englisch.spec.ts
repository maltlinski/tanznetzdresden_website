/**
 * Interner Bereich auf Englisch (/en/intern/): Anmelden, Mein Status, Mein Profil, Meine Trainings und der Editor.
 * Umschalter Deutsch/English in der Leiste merkt sich die Sprache; Redaktion und Kalender bleiben deutsch.
 * Supabase ist nachgebaut (tests/redaktion-mock.ts).
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { supabase } from '../src/settings/supabase';
import { redaktion } from './redaktion-mock';
import { gegenstueck, internPfad } from '../src/lib/intern-sprache';
import { montag } from '../src/lib/keep-up-plan';
import { artName } from '../src/lib/mitgliedschaft';

const J = new Date().getFullYear();
const lea = { display_name: 'Lea Sommer', role: 'mitglied' };
const ms = {
  person: 'u1', nummer: 'TNDD-2019-047', art: 'Ordentliches Mitglied', seit: '2019-03-01', bezahlt_bis: J, bezahlt_am: `${J}-02-14`,
  ende: null, pruefcode: '6f1c2b3a-0000-4000-8000-000000000001', updated_at: `${J}-01-06T10:00:00Z`,
};
const nav = (page: Page) => page.getByRole('navigation', { name: 'Members area' });
const sprache = (page: Page) => page.getByRole('group', { name: /^(Language|Sprache)$/ });
const pruefen = async (page: Page) => {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`);
};

test('Anmelden auf Englisch, Login der englischen Website führt dorthin', async ({ page, isMobile }) => {
  await page.addInitScript(() => localStorage.setItem('tndd-consent', JSON.stringify({ v: 1, date: '2026-10-15T00:00:00Z', categories: { notwendig: true } })));
  await page.goto('/en/');
  if (isMobile) await page.getByRole('button', { name: 'Menu' }).click();
  await page.locator('[data-login]').click();
  await page.waitForURL(/\/en\/intern\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Log in');
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Contact the board →' })).toHaveAttribute('href', '/en/contact/#vorstand');
  await expect(sprache(page).getByRole('link', { name: 'English' })).toHaveAttribute('aria-current', 'true');
  await expect(sprache(page).getByRole('link', { name: 'Deutsch' })).toHaveAttribute('href', '/intern/');
  await page.getByRole('button', { name: 'Get a login link by email instead' }).click();
  await expect(page.locator('[data-login-submit]')).toHaveText('Send login link');
  await page.getByRole('button', { name: 'Forgot your password?' }).click();
  await expect(page.locator('[data-login-msg]')).toHaveText('Enter your email address above and we will send you a reset link.');
  expect(await pruefen(page)).toEqual([]);
});

test('Mein Status auf Englisch: Leiste, Ausweis, Angaben', async ({ page }) => {
  await redaktion(page, { profil: lea, mitgliedschaft: ms });
  await page.goto('/en/intern/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My status');
  await expect(nav(page).getByRole('link')).toHaveText(['My status', 'My profile', /^Open Calls/, 'Members', 'Documents']);
  // Mitgliederseiten auf Englisch, die übrigen bleiben deutsch
  await expect(nav(page).getByRole('link', { name: 'My profile' })).toHaveAttribute('href', '/en/intern/profil/');
  await expect(nav(page).getByRole('link', { name: 'Members' })).toHaveAttribute('href', '/intern/mitglieder/');
  await expect(page.locator('.ms-lead')).toHaveText(`Hello Lea. Your membership is active until 31 December ${J}.`);
  await expect(page.locator('[data-ms-badge]')).toHaveText('Active');
  await expect(page.locator('[data-ms-daten] dt')).toHaveText(['Membership number', 'Type', 'Member since', `Fee ${J}`, 'Valid until']);
  await expect(page.locator('[data-ms-daten] dd')).toHaveText(['TNDD-2019-047', 'Full member', 'March 2019', `Paid on 14 February ${J}`, `31/12/${J}`]);
  await expect(page.locator('[data-ausweis-vorne] .av__titel')).toHaveText(`Membership card ${J}`);
  await expect(page.locator('[data-ms-art-seit]')).toHaveText('Full member · since 2019');
  await expect(page.locator('.ah__satz')).toHaveText('Lea Sommer is a member of TanzNetzDresden e.V.');
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeVisible();
  await expect(page.locator('.ms-fuss').getByRole('link', { name: 'Edit your profile' })).toHaveAttribute('href', '/en/intern/profil/');
  await page.waitForTimeout(600);
  expect(await pruefen(page)).toEqual([]);
});

test('Umschalter merkt sich die Sprache, Redaktion bleibt deutsch', async ({ page }) => {
  await redaktion(page, { profil: { display_name: 'Pia Presse' }, mitgliedschaft: ms });
  await page.goto('/intern/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mein Status');
  await sprache(page).getByRole('link', { name: 'English' }).click();
  await page.waitForURL(/\/en\/intern\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My status');

  // gemerkt: deutsche Adresse öffnet die englische Seite
  await page.goto('/intern/profil/');
  await page.waitForURL(/\/en\/intern\/profil\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My profile');

  // Redaktion: deutsch, ohne Umschalter; Links aus der englischen Leiste führen dorthin
  await expect(nav(page).getByRole('link', { name: /^Posts/ })).toHaveAttribute('href', '/intern/news/');
  await page.goto('/intern/news/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(sprache(page)).toHaveCount(0);

  // zurück auf Deutsch, auch mit Parametern in der Adresse
  await page.goto('/en/intern/keep-up/beschreiben/?id=x1');
  await sprache(page).getByRole('link', { name: 'Deutsch' }).click();
  await page.waitForURL(/\/intern\/keep-up\/beschreiben\/\?id=x1$/);
  await page.goto('/en/intern/');
  await page.waitForURL(/\/intern\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
});

test.describe('Mein Profil auf Englisch', () => {
  test.skip(!supabase.url || !supabase.anonKey, 'Supabase nicht eingetragen');

  test('Felder, Zusammenfassung, Speichern', async ({ page }) => {
    const m = await redaktion(page, {
      profil: {
        slug: 'pia-presse', public_listing: true, verified: true, bio: 'Text', profession: 'Tänzerin', base: 'Dresden', pitch: null, pitch_en: null,
        profession_en: null, open_for: ['workshops'], works: [{ year: '2025', title: 'Kreide', place: 'TENZA' }], education: null, techniques: null,
        languages: null, regions: null, height: null, available: null, public_email: null, gallery_layout: 'mosaik',
        gallery: [{ path: 'u1/galerie-alt.jpg', caption: 'Probe', frei: true }],
      },
    });
    await page.goto('/en/intern/profil/');
    await expect(page.getByLabel('Profession optional')).toHaveValue('Tänzerin');
    await expect(page.locator('[data-public-status]')).toContainText('Approved: your profile is public.');
    await expect(page.getByRole('link', { name: 'View public profile' })).toHaveAttribute('href', '/en/network/pia-presse/');
    await expect(page.getByRole('link', { name: 'Change password' })).toHaveAttribute('href', '/en/intern/passwort/');
    await expect(page.locator('[data-info-galerie]')).toHaveText('· 1 photo');
    await expect(page.locator('[data-info-arbeiten]')).toHaveText('· 1 entry');
    await page.locator('summary', { hasText: 'Gallery' }).click();
    await expect(page.locator('.pg__status')).toHaveText('On the website');
    await expect(page.getByRole('button', { name: 'Move photo 1 forward' })).toBeDisabled();
    await page.locator('summary', { hasText: 'Contact and video' }).click();
    await expect(page.getByLabel('Teaching workshops')).toBeChecked();
    await page.getByLabel('Pronouns optional').fill('she/her');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.locator('[data-profile-msg]')).toHaveText('Saved.');
    expect(m.profilGespeichert.at(-1)).toMatchObject({ pronouns: 'she/her', profession: 'Tänzerin' });
    await page.waitForTimeout(400);
    expect(await pruefen(page)).toEqual([]);
  });
});

test('KEEP UP auf Englisch: Meine Trainings und Editor', async ({ page }) => {
  const heute = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
  await redaktion(page, {
    profil: { display_name: 'Aurora Fradella', role: 'mitglied', slug: 'aurora-fradella', verified: true },
    keepup: [{ id: 'k1', dozent: 'aurora-fradella', woche: montag(heute), tage: [1, 2, 3, 4, 5, 6, 7], notiz: 'Bitte bis Freitag beschreiben.' }],
    keepupIch: 'aurora-fradella',
  });
  await page.goto('/en/intern/keep-up/meine/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello Aurora.');
  await expect(nav(page).getByRole('link', { name: /My classes/ })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('[data-todo-text]')).toHaveText('One date still needs a description.');
  const karte = page.locator('.mt-karte');
  await expect(karte.locator('.ku-check')).toHaveText(['Title', 'Short description', 'Picture (optional)']);
  await expect(karte).toContainText('Note from the board');
  await expect(karte).toContainText('No description');
  // englische Datumsangaben ohne Punkte, z. B. „26 Oct – 1 Nov“
  await expect(karte.locator('.mt-karte__zeitraum')).toHaveText(/^\d{1,2}(–\d{1,2})? [A-Z][a-z]{2}( – \d{1,2} [A-Z][a-z]{2})?$/);
  await karte.getByRole('link', { name: 'Describe' }).click();
  await page.waitForURL(/\/en\/intern\/keep-up\/beschreiben\/\?id=k1$/);
  await expect(page.locator('[data-zurueck]')).toHaveText('← My classes');
  await expect(page.locator('[data-zurueck]')).toHaveAttribute('href', '/en/intern/keep-up/meine/');
  await expect(page.locator('[data-pv-text]')).toContainText('The description of this class will follow.');
  await expect(page.locator('.ed-form')).toContainText('Write in German or English');
  await page.getByPlaceholder('What is this week about?').fill('Floor and arcs');
  await expect(page.locator('[data-speicher]')).toHaveText('Saved');
  await expect(page.locator('[data-veroeffentlichen]')).toHaveText('Publish');
  await page.waitForTimeout(800);
  expect(await pruefen(page)).toEqual([]);
});

test('Adressen: welche Seiten es auf Englisch gibt', async ({}, info) => {
  test.skip(info.project.name !== 'desktop', 'ohne Browser, einmal reicht');
  expect(internPfad('en', 'profil/')).toBe('en/intern/profil/');
  expect(internPfad('en', 'keep-up/beschreiben/?id=1')).toBe('en/intern/keep-up/beschreiben/?id=1');
  expect(internPfad('en', 'redaktion/')).toBe('intern/redaktion/');
  expect(internPfad('de', 'profil/')).toBe('intern/profil/');
  expect(gegenstueck('/intern/', '/')).toEqual({ lang: 'en', pfad: '/en/intern/' });
  expect(gegenstueck('/basis/en/intern/profil/', '/basis/')).toEqual({ lang: 'de', pfad: '/basis/intern/profil/' });
  expect(gegenstueck('/intern/kalender/', '/')).toBeNull();
  expect(gegenstueck('/netzwerk/', '/')).toBeNull();
  expect(artName('Ordentliches Mitglied · Tanzschaffende', 'en')).toBe('Full member · Dance professional');
  expect(artName('Mitglied auf Probe', 'en')).toBe('Mitglied auf Probe');
  expect(artName('Fördermitglied')).toBe('Fördermitglied');
});
