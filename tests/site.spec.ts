import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { giroCodeSvg, isValidIban } from '../src/lib/girocode';
import { supabase } from '../src/settings/supabase';

const pages = [
  '/', '/termine/', '/termine/2026-10-15-studio-round-9/', '/profitraining/', '/news/', '/news/studio-round-9/', '/news/open-call-pop-up-2027/', '/news/stimme-rika-yotsumoto/', '/netzwerk/', '/netzwerk/alina-lucifero/', '/verein/', '/mitglied-werden/', '/kontakt/',
  '/kooperationen/', '/transparenz/', '/spenden/', '/spenden/nachweis/', '/barrierefreiheit/', '/leichte-sprache/', '/impressum/', '/datenschutz/', '/mitglied/pruefen/', '/intern/',
  '/intern/news/', '/intern/news/bearbeiten/', '/intern/redaktion/', '/intern/redaktion/liste/', '/intern/redaktion/eintrag/', '/intern/redaktion/freigaben/',
  '/en/', '/en/events/', '/en/events/2026-10-15-studio-round-9/', '/en/training/', '/en/news/', '/en/news/neues-koordinationsteam/', '/en/network/', '/en/network/alina-lucifero/', '/en/about/', '/en/membership/',
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
  // ausgeblendete Termine gleiten kurz heraus (GSAP Flip), danach stehen nur noch Trainings da
  await expect.poll(async () => [...new Set(await visible.locator('.badge').allTextContents())]).toEqual(['Training']);
});

test('Kalender-Feed ist gültiges iCalendar', async ({ request }) => {
  const res = await request.get('/termine.ics');
  expect(res.headers()['content-type']).toContain('text/calendar');
  const body = await res.text();
  expect(body.startsWith('BEGIN:VCALENDAR')).toBe(true);
  expect(body).toContain('BEGIN:VEVENT');
  expect(body.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  // wie der Tanzkalender: auch die Trainingstage von KEEP UP
  expect(body).toMatch(/UID:keep-up-2026-10-12-1000@/);
  expect(body).toContain('SUMMARY:KEEP UP · Profitraining mit Leon Börgens');
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
  await page.getByLabel('Suchen').fill('justine');
  await expect(page.locator('[data-net-list] .card:visible')).toHaveCount(1);
  await page.locator('[data-net-list] .card:visible a').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Justine Rouquart');
  await expect(page.getByRole('heading', { name: 'Nächste Termine' })).toBeVisible();
  await expect(page.locator('.event')).toContainText(['POP UP']);
});

test('News: Galerie mit Großansicht und Hinweiskasten, Fotos werden optimiert ausgeliefert', async ({ page }) => {
  await page.goto('/news/keep-up-herbst/');
  await dismissConsent(page);
  const g = page.locator('figure.nb--galerie');
  await expect(g.locator('img')).toHaveCount(4);
  await expect(g.locator('img').first()).toHaveAttribute('srcset', /\/_astro\/.+\.webp/);
  await expect(g.locator('figcaption')).toContainText('Fotos: Archiv TanzNetzDresden');
  await expect(page.locator('.ab__text .nh')).toContainText('Gut zu wissen');
  await g.locator('a').nth(1).click();
  const lb = page.getByRole('dialog', { name: 'Foto' });
  await expect(lb).toBeVisible();
  await expect(lb.locator('.lb__n')).toHaveText('2 von 4');
  await expect(lb.locator('.lb__cap')).toContainText('Tänzer im Sprung');
  await page.keyboard.press('ArrowRight');
  await expect(lb.locator('.lb__n')).toHaveText('3 von 4');
  await page.keyboard.press('Escape');
  await expect(lb).toBeHidden();
  // englische Fassung mit eigener Bildbeschreibung
  await page.goto('/en/news/keep-up-herbst/');
  await expect(page.locator('figure.nb--galerie img').first()).toHaveAttribute('alt', 'A dancer in blue light on stage');
  await expect(page.locator('figure.nb--galerie figcaption')).toContainText('Photos:');
});

/** Tanzkalender mit festem Datum (Platzhalter-Termine Okt.–Dez. 2026) */
async function openKalender(page: Page, path = '/termine/') {
  await page.clock.install({ time: new Date('2026-10-12T08:00:00+02:00') });
  await page.goto(path);
  await dismissConsent(page);
  return page.locator('#kalender');
}

test('Tanzkalender: Termine und Profitraining in einem Kalender, Filter nach Kategorie', async ({ page }) => {
  const cal = await openKalender(page);
  await expect(cal.locator('[data-kcal-label]')).toHaveText('Oktober 2026');
  // heute: Profitraining
  await expect(cal.locator('[data-kcal-date]')).toHaveText('12. Oktober');
  await expect(cal.locator('[data-kcal-items]')).toContainText('KEEP UP · Leon Börgens');
  await expect(cal.locator('[data-kcal-items] a', { hasText: 'Zum Profitraining' })).toHaveAttribute('href', /\/profitraining\/#kalender$/);
  // Termin wählen
  await cal.getByRole('button', { name: /^Donnerstag, 15\. Oktober 2026/ }).click();
  await expect(cal.locator('[data-kcal-items]')).toContainText('Studio Round');
  await expect(cal.locator('[data-kcal-items] a', { hasText: 'Zum Termin' })).toHaveAttribute('href', /\/termine\/2026-10-15-studio-round-9\/$/);
  // nur Bühne: Trainingstage sind gesperrt, Auswahl springt zum nächsten Bühnentermin
  await cal.getByRole('button', { name: 'Bühne', exact: true }).click();
  await expect(cal.getByRole('button', { name: /^Montag, 12\. Oktober 2026/ })).toBeDisabled();
  await expect(cal.locator('[data-kcal-date]')).toHaveText('31. Oktober');
  await expect(cal.locator('[data-kcal-items]')).toContainText('POP UP');
});

test('Tanzkalender: #kategorie-… wählt den Filter vor; englische Texte', async ({ page }) => {
  const cal = await openKalender(page, '/en/events/#kategorie-buhne');
  await expect(cal.getByRole('button', { name: 'Stage', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(cal.locator('[data-kcal-date]')).toHaveText('31 October');
  await expect(cal.locator('[data-kcal-items]')).toContainText('New short pieces from the network');
  await expect(cal.locator('[data-kcal-items] .badge')).toHaveText('Stage');
});

test('Tanzkalender ohne JavaScript: Liste aller kommenden Termine', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/termine/');
  await expect(page.locator('#kalender .kcal__layout')).toBeHidden();
  await expect(page.locator('#all-events .event').first()).toBeVisible();
  await ctx.close();
});

test('Demo-Ansicht: Beispielinhalte nur mit Schalter, Echtes bleibt', async ({ page }) => {
  await page.goto('/netzwerk/alina-lucifero/');
  await dismissConsent(page);
  await expect(page.getByText('Dieses Profil wird gerade aufgebaut.')).toBeVisible();
  await expect(page.getByText(/^Beispieltext/)).toBeHidden();
  await expect(page.getByRole('note')).toBeHidden();

  await page.goto('/netzwerk/alina-lucifero/?demo=1');
  await expect(page.getByText(/^Beispieltext/)).toBeVisible();
  await expect(page.getByText('Dieses Profil wird gerade aufgebaut.')).toBeHidden();
  await expect(page.getByRole('note')).toContainText('Demo-Ansicht');
  // gilt weiter auf anderen Seiten, bis sie ausgeschaltet wird
  await page.goto('/netzwerk/');
  await expect(page.locator('.card__bio.demo-an').first()).toBeVisible();
  await page.getByRole('note').getByRole('button', { name: 'Ausschalten' }).click();
  await expect(page.locator('.card__bio.demo-an').first()).toBeHidden();
  await page.reload();
  await expect(page.getByRole('note')).toBeHidden();
});

test('Spendenseite: ohne IBAN kein GiroCode, dafür Kontaktweg; Formate, andere Wege, Fragen', async ({ page }) => {
  await page.goto('/spenden/');
  await dismissConsent(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Tanz braucht\s*Rückhalt\./);
  await expect(page.locator('.konto__code')).toHaveCount(0);
  await expect(page.locator('#spende').getByRole('button', { name: /Bankverbindung anfragen/ })).toBeVisible();
  await expect(page.locator('.bw__t')).toHaveText(['KEEP UP', 'Studio Round', 'Welttanztag']);
  await expect(page.getByRole('link', { name: 'Mehr zu KEEP UP →' })).toHaveAttribute('href', /\/profitraining\/$/);
  await expect(page.getByRole('link', { name: 'Zum Mitgliedsantrag →' })).toHaveAttribute('href', /\/mitglied-werden\/$/);
  // Platzhalter des Freistellungsbescheids stehen nicht öffentlich auf der Seite
  await expect(page.getByText('BITTE ERGÄNZEN')).toHaveCount(0);
  // Fragen klappen auf und zu, die erste ist offen
  const fragen = page.locator('.faq__el');
  await expect(fragen.first()).toHaveAttribute('open', '');
  await fragen.nth(1).locator('summary').click();
  await expect(fragen.nth(1).getByText(/„Spende KEEP UP“/)).toBeVisible();
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
  await expect(news.getByText(/Frist 15\. Nov 2026/)).toBeVisible();
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

test('Header: TNDD-Zeichen führt zur Startseite, Journal und Über uns im Menü', async ({ page, isMobile }) => {
  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
  // Profile gehören zu „Über uns“
  await page.goto('/netzwerk/alina-lucifero/');
  await dismissConsent(page);
  if (isMobile) await page.getByRole('button', { name: 'Menü' }).click();
  await expect(nav.getByRole('link')).toHaveText(['Kalender', 'Formate', 'Training', 'Journal', 'Über uns', 'Spenden']);
  // „Kalender“ führt zum ganzen Tanzkalender, nicht zum Ausschnitt auf der Startseite
  await expect(nav.getByRole('link', { name: 'Kalender' })).toHaveAttribute('href', /\/termine\/$/);
  await expect(nav.getByRole('link', { name: 'Über uns' })).toHaveAttribute('aria-current', 'page');
  // auch beim zweiten Klick bleibt man im Kalender, der Menüpunkt ist markiert
  for (let i = 0; i < 2; i++) {
    await nav.getByRole('link', { name: 'Kalender' }).click();
    await expect(page).toHaveURL(/\/termine\/$/);
    if (isMobile) await page.getByRole('button', { name: 'Menü' }).click();
    await expect(nav.getByRole('link', { name: 'Kalender' })).toHaveAttribute('aria-current', 'page');
  }
  await page.goto('/news/');
  if (isMobile) await page.getByRole('button', { name: 'Menü' }).click();
  await expect(nav.getByRole('link', { name: 'Journal' })).toHaveAttribute('aria-current', 'page');
  await page.locator('[data-header]').getByRole('link', { name: 'TanzNetzDresden – zur Startseite' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('Lila Kopf der Unterseiten ist so hoch wie auf der Startseite', async ({ page, isMobile }) => {
  test.skip(isMobile, 'auf dem Handy stehen Spalten untereinander, inhaltsreiche Köpfe werden länger');
  await page.setViewportSize({ width: 1440, height: 900 });
  const hoehe = async (pfad: string) => {
    await page.goto(pfad);
    return page.locator('main section, main header').first().evaluate((el) => Math.round(el.getBoundingClientRect().height));
  };
  const start = await hoehe('/');
  for (const pfad of ['/verein/', '/termine/', '/kontakt/', '/mitglied-werden/', '/netzwerk/', '/kooperationen/', '/profitraining/', '/spenden/', '/news/', '/en/news/']) {
    expect(await hoehe(pfad), pfad).toBe(start);
  }
  // Rechtstexte bleiben kompakt
  expect(await hoehe('/impressum/')).toBeLessThan(start / 2);
});

test('Startseite: Überschrift und Claim sind ohne Animation sofort lesbar', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tanz für Dresden, alle, Professionals');
  await expect(page.locator('[data-claim-word]')).toHaveText('Dresden');
  await page.locator('#netz').scrollIntoViewIfNeeded();
  await expect(page.locator('#netz-h')).toHaveText(/Eine Stadt\.\s*Ein Netz\./);
  // ohne Bewegung keine Aufteilung in Wörter
  await expect(page.locator('#netz-h .word, #termine-h div')).toHaveCount(0);
  await expect.poll(() => page.locator('.netz__namen [data-name]').first().evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
});

test('Startseite: Namen bei „Wer im Netz tanzt“ blenden beim Scrollen ein', async ({ page }) => {
  await page.goto('/');
  await dismissConsent(page);
  const erster = page.locator('.netz__namen [data-name]').first();
  // vor dem Scrollen noch ausgeblendet
  await expect.poll(() => erster.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
  await page.locator('.netz__namen').scrollIntoViewIfNeeded();
  const letzter = page.locator('.netz__namen [data-name]').last();
  await expect.poll(() => letzter.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  await expect.poll(() => letzter.evaluate((el) => el.style.transform)).toBe('');
  await expect(page.locator('.netz__punkt').last()).toBeVisible();
});

test('Startseite: Einstiege im Hero, Netz mit Profilen, Formate zum Blättern', async ({ page }) => {
  await page.goto('/');
  await dismissConsent(page);
  const wege = page.getByRole('navigation', { name: 'Einstiege' });
  await expect(wege.getByRole('link')).toHaveCount(3);
  await expect(wege.getByRole('link', { name: /Mittrainieren/ })).toHaveAttribute('href', /\/profitraining\/$/);
  await expect(wege.getByRole('link', { name: /Teil des Netzes werden/ })).toHaveAttribute('href', /#mitglied$/);

  const netz = page.locator('#netz');
  await expect(netz.getByText('70+ Tanzschaffende')).toBeVisible();
  await expect(netz.locator('.netz__namen a')).toHaveCount(16);
  await expect(netz.getByRole('link', { name: 'Alina Lucifero' })).toHaveAttribute('href', /\/netzwerk\/alina-lucifero\/$/);
  await expect(netz.getByRole('link', { name: 'Alle 70+ Profile →' })).toHaveAttribute('href', /\/netzwerk\/$/);

  const streifen = page.locator('#formate-streifen');
  await streifen.scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Vorherige Formate' })).toBeDisabled();
  const vorher = await streifen.evaluate((el) => el.scrollLeft);
  await page.getByRole('button', { name: 'Weitere Formate' }).click();
  await expect.poll(() => streifen.evaluate((el) => el.scrollLeft)).toBeGreaterThan(vorher);
  await expect(page.getByRole('button', { name: 'Vorherige Formate' })).toBeEnabled();
});

test('Startseite: Fortschrittsbalken läuft erst nach dem Hero', async ({ page }) => {
  await page.goto('/');
  const balken = page.locator('[data-fortschritt]');
  await expect(balken).toHaveCSS('transform', /matrix\(0, /);
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => balken.evaluate((el) => getComputedStyle(el).transform)).toMatch(/^matrix\(1, /);
  // nur auf der Startseite
  await page.goto('/verein/');
  await expect(page.locator('[data-fortschritt]')).toHaveCount(0);
});

test('Hero: zeigt den nächsten Termin und verlinkt ihn', async ({ page }) => {
  await page.goto('/');
  const up = page.locator('[data-hero-up]:visible');
  await expect(up).toHaveCount(1);
  await expect(up).toContainText('Upcoming');
  await up.click();
  await expect(page).toHaveURL(/\/termine\/\d{4}-\d{2}-\d{2}-[a-z0-9-]+\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('Startseite: Termine und News führen auf ihre eigene Seite', async ({ page }) => {
  await page.goto('/');
  await dismissConsent(page);
  const ev = page.locator('#home-events a').first();
  const evTitle = (await ev.locator('h3').textContent())!.trim();
  await ev.click();
  await expect(page).toHaveURL(/\/termine\/[^/#]+\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(evTitle);
  await expect(page.getByRole('link', { name: 'In meinen Kalender (.ics)' })).toHaveAttribute('href', /\/termine\/[^/]+\.ics$/);

  await page.goto('/');
  const lead = page.locator('#news .jl');
  const newsTitle = (await lead.locator('h3').textContent())!.trim();
  await lead.click();
  await expect(page).toHaveURL(/\/news\/[^/#]+\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(newsTitle);
});

test('Terminseite: Englisch, Kalenderdatei und passender Beitrag', async ({ page, request }) => {
  await page.goto('/en/events/2026-10-15-studio-round-9/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Studio Round #9');
  await expect(page.getByRole('link', { name: /Studio Round #9: / })).toHaveAttribute('href', /\/en\/news\/studio-round-9\/$/);
  const ics = await request.get('/termine/2026-10-15-studio-round-9.ics');
  expect(ics.status()).toBe(200);
  const body = await ics.text();
  expect(body.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  expect(body).toContain('SUMMARY:Studio Round #9');
});

test('Über uns: Haltung & Wirkung mit Partnern', async ({ page }) => {
  await page.goto('/verein/');
  const s = page.locator('#haltung');
  await expect(s.getByRole('heading', { level: 2 })).toHaveText(/Tanz gehört\s*in die Stadt\./);
  await expect(s.getByRole('listitem')).toHaveCount(6); // 4 Säulen + 2 Auszeichnungen
  await expect(s.getByRole('link', { name: 'Alle Partner →' })).toHaveAttribute('href', /\/kooperationen\/$/);
});

test('Weiches Scrollen: Lenis aktiv, Sprungmarke landet unter dem Header; aus bei „Bewegung reduzieren“', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Touch scrollt nativ');
  await page.goto('/');
  await dismissConsent(page);
  await expect(page.locator('html')).toHaveClass(/\blenis\b/);
  const link = page.locator('[data-hero-floor] a[href$="#termine"]').first();
  await link.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await link.click();
  await expect(page).toHaveURL(/#termine$/);
  await expect.poll(() => page.evaluate(() => Math.round(document.getElementById('termine')!.getBoundingClientRect().top))).toBe(70);
  await expect(page.locator('#termine')).toBeFocused();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass(/\blenis\b/);
});

/** Profitraining-Seite mit festem Datum (Platzhalter-Trainingsplan Sep.–Dez. 2026) */
async function openTraining(page: Page, path = '/profitraining/') {
  await page.clock.install({ time: new Date('2026-10-12T08:00:00+02:00') }); // Uhr läuft weiter (Animationen)
  await page.goto(path);
  await dismissConsent(page);
}

test('Profitraining: Kalender mit Tagesansicht, Monaten und Filter nach Dozent:in', async ({ page }) => {
  await openTraining(page);
  const cal = page.locator('#kalender');
  await expect(cal.locator('[data-kcal-label]')).toHaveText('Oktober 2026');
  // nächster Trainingstag ist vorgewählt
  await expect(cal.getByRole('button', { name: /^Montag, 12\. Oktober 2026: Training mit Leon Börgens/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(cal.locator('[data-kcal-items]')).toContainText('Leon Börgens');
  await expect(page.locator('[data-next-date]')).toHaveText('Mo · 12. Oktober');

  // Tag wählen
  await cal.getByRole('button', { name: /^Montag, 19\. Oktober 2026/ }).click();
  await expect(cal.locator('[data-kcal-date]')).toHaveText('19. Oktober');
  await expect(cal.locator('[data-kcal-items]')).toContainText('Alexandre May');

  // Monat weiter: Workshop im November
  await cal.getByRole('button', { name: 'Nächster Monat' }).click();
  await expect(cal.locator('[data-kcal-label]')).toHaveText('November 2026');
  await cal.getByRole('button', { name: /^Samstag, 14\. November 2026: KEEP UP · Workshop Floorwork mit Aurora Fradella/ }).click();
  await expect(cal.locator('[data-kcal-items] a', { hasText: 'Zum Workshop' })).toHaveAttribute('href', /\/termine\/2026-11-14-keep-up-workshop\/$/);

  // Filter: nur Charles – andere Tage sind gesperrt, Auswahl springt auf den nächsten Termin von Charles
  await cal.getByRole('button', { name: 'Charles Washington', exact: true }).click();
  await expect(cal.getByRole('button', { name: 'Charles Washington', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(cal.locator('[data-kcal-label]')).toHaveText('November 2026');
  await expect(cal.locator('[data-kcal-date]')).toHaveText('2. November');
  await expect(cal.getByRole('button', { name: /^Montag, 9\. November 2026/ })).toBeDisabled();
});

test('Profitraining: Pfeiltasten wandern durch die Trainingstage', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Tastatur');
  await openTraining(page);
  const cal = page.locator('#kalender');
  await cal.getByRole('button', { name: /^Montag, 12\. Oktober 2026/ }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(cal.getByRole('button', { name: /^Dienstag, 13\. Oktober 2026/ })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(cal.getByRole('button', { name: /^Dienstag, 20\. Oktober 2026/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(cal.locator('[data-kcal-date]')).toHaveText('20. Oktober');
});

test('Profitraining: Dozent:innen-Mosaik läuft, hält an und führt in den Kalender', async ({ page }) => {
  await openTraining(page);
  const mosaik = page.locator('[data-mosaik]');
  await expect(mosaik).toHaveClass(/is-laufend/);
  await expect(mosaik.locator('.mosaik__teil:not(.mosaik__teil--kopie) .kachel')).toHaveCount(6);
  // die zweite Hälfte ist nur für die Endlosschleife da
  await expect(mosaik.locator('.mosaik__teil--kopie')).toHaveAttribute('aria-hidden', 'true');
  const spur = mosaik.locator('[data-mosaik-spur]');
  const lage = () => spur.evaluate((e) => getComputedStyle(e).transform);

  // läuft …
  const a = await lage();
  await expect.poll(lage).not.toBe(a);
  // … und hält auf Knopfdruck an
  const pause = page.locator('[data-mosaik-pause]');
  await expect(pause).toHaveText('Anhalten');
  await pause.click();
  await expect(pause).toHaveAttribute('aria-pressed', 'true');
  await expect(pause).toHaveText('Weiterlaufen');
  await page.waitForTimeout(700);
  const b = await lage();
  await page.waitForTimeout(500);
  expect(await lage()).toBe(b);

  // Kachel: Kalender auf diese Dozent:in filtern
  await page.locator('#dozentin-leon-borgens').click();
  await expect(page).toHaveURL(/#kalender$/);
  await expect(page.locator('#kalender').getByRole('button', { name: 'Leon Börgens', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#kalender [data-kcal-items]')).toContainText('Leon Börgens');

  // „Zur Dozent:in →“ im Kalender hebt die Kachel hervor
  await page.locator('#kalender [data-kcal-items] a', { hasText: 'Zur Dozent:in' }).click();
  await expect(page.locator('#dozentin-leon-borgens')).toHaveClass(/is-hl/);
  await expect(page.locator('#dozentin-leon-borgens')).toBeFocused();
  await expect(page.locator('#dozentin-leon-borgens')).toBeInViewport();
});

test('Profitraining: ohne JavaScript und bei „Bewegung reduzieren“ ist das Mosaik ein Streifen zum Wischen', async ({ browser, page, isMobile }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const nojs = await ctx.newPage();
  await nojs.goto('/profitraining/');
  await expect(nojs.locator('.mosaik__teil--kopie')).toBeHidden();
  await expect(nojs.locator('.mosaik__teil:not(.mosaik__teil--kopie) .kachel')).toHaveCount(6);
  await ctx.close();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openTraining(page);
  await expect(page.locator('#ku-h1')).toHaveText(/KEEP UP\s*Training\./);
  await expect(page.locator('[data-mosaik]')).not.toHaveClass(/is-laufend/);
  await expect(page.getByRole('button', { name: 'Anhalten' })).toBeHidden();
  // auf dem Handy breiter als der Bildschirm: zum Wischen
  if (isMobile) expect(await page.locator('[data-mosaik]').evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);
  await page.locator('#dozentin-aurora-fradella').click();
  await expect(page.locator('#kalender').getByRole('button', { name: 'Aurora Fradella', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('Profitraining: englische Fassung und Verlinkung aus Menü und Formaten', async ({ page, isMobile }) => {
  await openTraining(page, '/en/training/');
  await expect(page.locator('#kalender [data-kcal-label]')).toHaveText('October 2026');
  await expect(page.getByRole('heading', { name: 'Who teaches' })).toBeVisible();

  await page.goto('/');
  if (!isMobile) await expect(page.locator('.site-nav').getByRole('link', { name: 'Training' })).toHaveAttribute('href', /\/profitraining\/$/);
  await expect(page.locator('#formate a[data-format="keep-up"]')).toHaveAttribute('href', /\/profitraining\/$/);
  // Formate ohne eigene Seite sind keine Links
  await expect(page.locator('#formate article[data-format="studio-round"]')).toHaveCount(1);
});
