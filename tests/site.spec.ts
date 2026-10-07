import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { giroCodeSvg, isValidIban } from '../src/lib/girocode';

const pages = [
  '/', '/termine/', '/netzwerk/', '/netzwerk/alina-lucifero/', '/verein/', '/mitglied-werden/', '/kontakt/',
  '/transparenz/', '/spenden/', '/spenden/nachweis/', '/barrierefreiheit/', '/leichte-sprache/', '/impressum/', '/datenschutz/', '/intern/',
  '/en/', '/en/events/', '/en/network/', '/en/network/alina-lucifero/', '/en/about/', '/en/membership/',
  '/en/contact/', '/en/donate/', '/en/transparency/', '/en/accessibility/', '/en/legal-notice/', '/en/privacy/',
];

/** Externe Anfragen sperren: die Seite selbst darf ohne Einwilligung nichts nachladen. */
async function trackExternal(page: Page) {
  const external: string[] = [];
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'localhost') {
      external.push(url.href);
      return route.abort();
    }
    return route.continue();
  });
  return external;
}

async function dismissConsent(page: Page) {
  await page.getByRole('button', { name: /^(Nur notwendige|Necessary only)$/ }).click();
}

for (const path of pages) {
  test(`${path} lädt ohne Fehler und ohne externe Anfragen`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    const external = await trackExternal(page);
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
  });

  test(`${path} ist barrierearm (axe)`, async ({ page }) => {
    // ohne Einblend-Animationen messen, sonst zählt halbe Deckkraft als Kontrastfehler
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    await dismissConsent(page);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
  });
}

test('Einwilligung: Auswahl wird gespeichert und ist wieder aufrufbar', async ({ page }) => {
  await page.goto('/');
  const banner = page.getByRole('dialog', { name: 'Deine Privatsphäre' });
  await expect(banner).toBeVisible();
  await dismissConsent(page);
  await expect(banner).toBeHidden();
  await page.reload();
  await expect(banner).toBeHidden();
  await page.getByRole('button', { name: 'Cookie-Einstellungen' }).click();
  await expect(banner).toBeVisible();
  await expect(banner.getByRole('checkbox', { name: /Externe Medien/ })).not.toBeChecked();
});

test('Karte lädt erst nach Zustimmung', async ({ page }) => {
  await page.route('https://www.openstreetmap.org/**', (r) => r.fulfill({ body: '<html></html>', contentType: 'text/html' }));
  await page.goto('/kontakt/');
  await dismissConsent(page);
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'Einmal laden' }).click();
  await expect(page.locator('iframe[title^="Karte"]')).toHaveCount(1);
});

test('E-Mail-Adresse steht nicht im HTML und lässt sich per Klick anzeigen', async ({ page, request }) => {
  const html = await (await request.get('/kontakt/')).text();
  expect(html).not.toMatch(/(kontakt|vorstand)@tanznetzdresden\.de/);
  await page.goto('/kontakt/');
  await dismissConsent(page);
  await page.locator('#vorstand').getByRole('button', { name: /E-Mail an den Vorstand/ }).click();
  await expect(page.locator('#vorstand a[href^="mailto:"]')).toHaveText(/@/, { timeout: 15_000 });
});

test('Terminfilter zeigt nur die gewählte Kategorie', async ({ page }) => {
  await page.goto('/');
  await dismissConsent(page);
  await page.getByRole('group', { name: /Termine/ }).getByRole('button', { name: /^Training/ }).click();
  const visible = page.locator('#home-events .event:visible');
  await expect(visible.first()).toBeVisible();
  for (const badge of await visible.locator('.badge').allTextContents()) expect(badge).toBe('Training');
});

test('Kalender-Feed ist gültiges iCalendar', async ({ request }) => {
  const res = await request.get('/termine.ics');
  expect(res.headers()['content-type']).toContain('text/calendar');
  const body = await res.text();
  expect(body.startsWith('BEGIN:VCALENDAR')).toBe(true);
  expect(body).toContain('BEGIN:VEVENT');
  expect(body.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
});

test('Interner Bereich ohne Supabase zeigt Einrichtungshinweis', async ({ page }) => {
  test.skip(!!process.env.PUBLIC_SUPABASE_URL, 'Supabase ist konfiguriert');
  await page.goto('/intern/');
  await expect(page.getByRole('heading', { name: 'Noch nicht eingerichtet' })).toBeVisible();
});

test('Mobiles Menü öffnet und schließt', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'nur mobil');
  await page.goto('/');
  await dismissConsent(page);
  const toggle = page.getByRole('button', { name: 'Menü' });
  await toggle.click();
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('Sprachumschalter führt zur passenden Seite in der anderen Sprache', async ({ page, isMobile }) => {
  await page.goto('/termine/');
  await dismissConsent(page);
  if (isMobile) await page.getByRole('button', { name: 'Menü' }).click();
  await page.getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/en\/events\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toContainText("What's on");
  if (isMobile) await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('link', { name: 'Deutsch' }).click();
  await expect(page).toHaveURL(/\/termine\/$/);
});

test('hreflang verweist auf beide Sprachfassungen', async ({ request }) => {
  const html = await (await request.get('/verein/')).text();
  expect(html).toMatch(/hreflang="de" href="[^"]*\/verein\/"/);
  expect(html).toMatch(/hreflang="en" href="[^"]*\/en\/about\/"/);
});

test('Förderhinweis steht auf jeder Seite', async ({ page }) => {
  for (const path of ['/', '/en/', '/kontakt/']) {
    await page.goto(path);
    await expect(page.locator('#funding-h')).toHaveText(/Gefördert durch|Funded by/);
  }
});

test('Netzwerk: Suche und Filter, Profil mit Terminen', async ({ page }) => {
  await page.goto('/netzwerk/');
  await dismissConsent(page);
  await page.getByLabel('Suchen').fill('rika');
  await expect(page.locator('[data-net-list] .card:visible')).toHaveCount(1);
  await page.locator('[data-net-list] .card:visible a').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rika Yotsumoto');
  await expect(page.getByRole('heading', { name: 'Nächste Termine' })).toBeVisible();
  await expect(page.locator('.event')).toContainText(['KEEP UP']);
});

test('Englische Termine nutzen englische Texte', async ({ page }) => {
  await page.goto('/en/events/');
  await expect(page.getByText('New short pieces from the network')).toBeVisible();
  await expect(page.locator('.badge', { hasText: 'Stage' }).first()).toBeVisible();
});

test('Spendenseite: ohne IBAN kein GiroCode, dafür Kontaktweg', async ({ page }) => {
  await page.goto('/spenden/');
  await dismissConsent(page);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Halte das Netz');
  await expect(page.locator('.qr__code')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Bankverbindung anfragen/ })).toBeVisible();
  await page.getByRole('link', { name: /Spendennachweis öffnen/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vereinfachter Spendennachweis');
});

test('GiroCode: IBAN-Prüfung und QR-Erzeugung', async () => {
  expect(isValidIban('DE89 3704 0044 0532 0130 00')).toBe(true);
  expect(isValidIban('DE89 3704 0044 0532 0130 01')).toBe(false);
  expect(isValidIban('')).toBe(false);
  const svg = await giroCodeSvg({ name: 'TanzNetzDresden e.V.', iban: 'DE89370400440532013000', amount: 50, text: 'Spende' });
  expect(svg).toContain('<svg');
});
