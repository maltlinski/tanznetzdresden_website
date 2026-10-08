import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { giroCodeSvg, isValidIban } from '../src/lib/girocode';
import { supabase } from '../src/settings/supabase';

const pages = [
  '/', '/termine/', '/news/', '/news/studio-round-9/', '/news/open-call-pop-up-2027/', '/news/stimme-rika-yotsumoto/', '/netzwerk/', '/netzwerk/alina-lucifero/', '/verein/', '/mitglied-werden/', '/kontakt/',
  '/kooperationen/', '/transparenz/', '/spenden/', '/spenden/nachweis/', '/barrierefreiheit/', '/leichte-sprache/', '/impressum/', '/datenschutz/', '/intern/',
  '/intern/news/', '/intern/news/bearbeiten/',
  '/en/', '/en/events/', '/en/news/', '/en/news/neues-koordinationsteam/', '/en/network/', '/en/network/alina-lucifero/', '/en/about/', '/en/membership/',
  '/en/contact/', '/en/partners/', '/en/donate/', '/en/transparency/', '/en/accessibility/', '/en/legal-notice/', '/en/privacy/',
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
    await expect(page.locator('h1:visible').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
    // nichts ragt seitlich über den Bildschirm hinaus
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
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

test('Interner Bereich zeigt Anmeldung (oder ohne Supabase den Einrichtungshinweis)', async ({ page }) => {
  await page.goto('/intern/');
  const name = supabase.url && supabase.anonKey ? 'Anmelden' : 'Noch nicht eingerichtet';
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
});

test('Geschützte interne Seiten leiten ohne Anmeldung zum Login', async ({ page }) => {
  test.skip(!supabase.url || !supabase.anonKey, 'Supabase nicht eingetragen');
  await page.goto('/intern/news/');
  await expect(page).toHaveURL(/\/intern\/\?weiter=/);
  await expect(page.getByRole('heading', { name: 'Anmelden', exact: true })).toBeVisible();
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
  await page.getByRole('link', { name: 'English', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/events\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toContainText("What's on");
  if (isMobile) await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('link', { name: 'Deutsch', exact: true }).click();
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
  // alle fünf Förderer mit Logo, Alternativtext und Link
  await page.goto('/');
  const logos = page.locator('.funding__list img');
  await expect(logos).toHaveCount(5);
  for (const alt of ['Landeshauptstadt Dresden', 'Kulturstiftung des Freistaates Sachsen', 'Kultur und Medien', 'NEUSTART KULTUR', 'Dachverband Tanz']) {
    await expect(page.locator(`.funding__list a:has(img[alt*="${alt}"])`)).toHaveAttribute('href', /^https:\/\//);
  }
  await expect(page.locator('.funding__notices')).toContainText('Sächsischen Landtag');
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

test('Kooperationen: Orte in Datei-Reihenfolge, Karte erst nach Klick', async ({ page }) => {
  const tiles: string[] = [];
  await page.route('https://tile.openstreetmap.org/**', (r) => {
    tiles.push(r.request().url());
    return r.fulfill({ status: 204 });
  });
  await page.goto('/kooperationen/');
  await dismissConsent(page);
  await expect(page.locator('.venue__name').first()).toHaveText('TENZA Schmiede');
  await expect(page.locator('.venue.is-seed')).toHaveCount(1);
  await expect(page.locator('.group')).toHaveCount(8);
  await page.waitForTimeout(500);
  expect(tiles).toEqual([]);
  await page.getByRole('button', { name: 'Stadtkarte einblenden' }).click();
  await expect(page.locator('[data-netmap]')).toHaveClass(/has-tiles/);
  await expect.poll(() => tiles.length).toBeGreaterThan(0);
  // Liste und Netz sind gekoppelt
  await page.locator('.venue').nth(2).hover();
  await expect(page.locator('.venue').nth(2)).toHaveClass(/is-hot/);
});

test('News: Startseite zeigt Titelthema und offene Ausschreibung, Links führen zum Beitrag', async ({ page }) => {
  await page.goto('/');
  const news = page.locator('#news');
  await expect(news.getByRole('heading', { name: 'Aus dem Netz' })).toBeVisible();
  await expect(news.getByRole('link', { name: /Studio Round #9/ })).toHaveAttribute('href', /\/news\/studio-round-9\/$/);
  await expect(news.getByText(/Frist · 15\. Nov 2026/)).toBeVisible();
  await news.getByRole('link', { name: 'Alle Beiträge →' }).click();
  await expect(page).toHaveURL(/\/news\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Aus dem');
});

test('News: Filter zeigt nur die gewählte Kategorie, „Alle“ blendet das Titelthema in der Chronik aus', async ({ page }) => {
  await page.goto('/news/');
  await dismissConsent(page);
  const posts = page.locator('[data-post]:visible');
  const total = await page.locator('[data-post]').count();
  await expect(posts).toHaveCount(total - 1);
  await page.getByRole('button', { name: /^Verein/ }).click();
  await expect(page.getByRole('button', { name: /^Verein/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(posts).toHaveCount(2);
  await page.getByRole('button', { name: /^Netzwerk/ }).click();
  await expect(posts.filter({ hasText: 'Studio Round #9' })).toHaveCount(1);
});

test('News: englische Seite nutzt die Übersetzung und weist auf fehlende Übersetzungen hin', async ({ page }) => {
  await page.goto('/en/news/open-call-pop-up-2027/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Open call: POP UP spring 2027');
  await expect(page.getByText('This post is only available in German so far.')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  // Sprachumschalter führt zum selben Beitrag
  await expect(page.locator('.site-header__lang')).toHaveAttribute('href', /\/news\/open-call-pop-up-2027\/$/);
});

test('News: RSS-Feeds sind gültig und verlinken die Beiträge', async ({ request }) => {
  for (const [path, link] of [['/news.xml', '/news/studio-round-9/'], ['/en/news.xml', '/en/news/studio-round-9/']]) {
    const res = await request.get(path);
    expect(res.status()).toBe(200);
    const xml = await res.text();
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain(link);
  }
});

test('Header: TNDD-Zeichen führt zur Startseite, News steht im Menü', async ({ page, isMobile }) => {
  await page.goto('/news/');
  await dismissConsent(page);
  if (isMobile) await page.getByRole('button', { name: 'Menü' }).click();
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'News' })).toHaveAttribute('aria-current', 'page');
  await page.locator('[data-header]').getByRole('link', { name: 'TanzNetzDresden – zur Startseite' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('Hero: Text ist ohne Animation sofort lesbar', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('[data-sweep-bar]')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Eine Stadt\.\s*Ein Netz\./);
});
