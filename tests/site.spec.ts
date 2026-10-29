import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { giroCodeSvg, isValidIban } from '../src/lib/girocode';
import { supabase } from '../src/settings/supabase';
import { galerie, newsDateien, veroeffentlicht } from './news-daten';

// Beiträge aus der alten Website: neuester, eine Ausschreibung, einer mit englischer Fassung (tests/news-daten.ts)
const neuester = veroeffentlicht()[0];
const ausschreibung = veroeffentlicht().find((p) => p.deadline) ?? neuester;
const englisch = newsDateien('en').find((e) => veroeffentlicht().some((p) => p.id === e.id))!;

const pages = [
  '/', '/termine/', '/termine/2026-10-15-studio-round-9/', '/profitraining/', '/news/', `/news/${neuester.id}/`, `/news/${ausschreibung.id}/`, '/netzwerk/', '/netzwerk/alina-lucifero/', '/verein/', '/mitglied-werden/', '/kontakt/',
  '/kooperationen/', '/transparenz/', '/spenden/', '/spenden/nachweis/', '/barrierefreiheit/', '/leichte-sprache/', '/impressum/', '/datenschutz/', '/mitglied/pruefen/', '/intern/',
  '/intern/news/', '/intern/news/bearbeiten/', '/intern/redaktion/', '/intern/redaktion/liste/', '/intern/redaktion/eintrag/', '/intern/redaktion/freigaben/',
  '/en/', '/en/events/', '/en/events/2026-10-15-studio-round-9/', '/en/training/', '/en/news/', `/en/news/${englisch.id}/`, '/en/network/', '/en/network/alina-lucifero/', '/en/about/', '/en/membership/',
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
  // Kommas und Strichpunkte sind maskiert (RFC 5545)
  expect(body).not.toMatch(/^(SUMMARY|DESCRIPTION|LOCATION):.*[^\\][,;]/m);

  // nur KEEP UP, z. B. für Google Kalender
  const ku = await (await request.get('/profitraining.ics')).text();
  expect(ku).toContain('X-WR-CALNAME:TanzNetzDresden · KEEP UP · Profitraining');
  expect(ku).toContain('SUMMARY:KEEP UP · Profitraining mit Leon Börgens');
  expect(ku).toContain('/termine/2026-11-14-keep-up-workshop/');
  expect(ku).not.toContain('Studio Round');
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
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Dance in Dresden');
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

test('News: Galerie mit Großansicht, Archivbilder in zwei Größen', async ({ page }) => {
  const p = veroeffentlicht().find((x) => galerie(x));
  test.skip(!p, 'kein Beitrag mit Galerie (Import ohne Bilder?)');
  const g = galerie(p!)!;
  await page.goto(`/news/${p!.id}/`);
  await dismissConsent(page);
  const fig = page.locator('figure.nb--galerie').first();
  await expect(fig.locator('img')).toHaveCount(g.n);
  // Bilder der alten Website liegen fertig verkleinert vor (800 px und 1600 px), neue werden beim Build optimiert
  await expect(fig.locator('img').first()).toHaveAttribute('srcset', /-800\.webp \d+w, .+\.webp \d+w|\/_astro\/.+\.webp/);
  await expect(fig.locator('img').first()).toHaveAttribute('width', /^\d+$/);
  if (g.yaml.foto) await expect(fig.locator('figcaption')).toContainText(`Fotos · ${g.yaml.foto}`);
  // Großansicht: alle Fotos des Beitrags in einer Reihe, mit Nummer, Bezeichnung und Vorschaubildern
  const alle = await page.locator('[data-article] a[data-lightbox]').count();
  const zweites = fig.locator('a').nth(1);
  const k = await zweites.getAttribute('data-k');
  const pos = await zweites.evaluate((el) => [...document.querySelectorAll('[data-article] a[data-lightbox]')].indexOf(el));
  await zweites.click();
  const lb = page.getByRole('dialog', { name: 'Bildansicht' });
  await expect(lb).toBeVisible();
  const pad = (n: number) => String(n).padStart(2, '0');
  await expect(lb.locator('.lb__n')).toHaveText(`${pad(pos + 1)} / ${pad(alle)}`);
  await expect(lb.locator('.lb__k')).toHaveText(k!);
  await expect(lb.locator('.lb__daumen button')).toHaveCount(alle);
  await page.keyboard.press('ArrowRight');
  await expect(lb.locator('.lb__n')).toHaveText(`${pad(((pos + 1) % alle) + 1)} / ${pad(alle)}`);
  await page.keyboard.press('Escape');
  await expect(lb).toBeHidden();
});

test('News: Kopf mit Titelbild, Großansicht ab dem Titelbild, Zeile zum Teilen und Fuß', async ({ page }) => {
  const p = veroeffentlicht().find((x) => x.image)!;
  await page.goto(`/news/${p.id}/`);
  await dismissConsent(page);
  const kopf = page.locator('.ak');
  await expect(kopf).toHaveClass(/ak--(vollbild|hochkant|split|typo)/);
  await expect(kopf.getByRole('heading', { level: 1 })).toHaveText(p.title);
  await expect(page.locator('.ab__zeile')).toContainText(p.author);
  await expect(page.locator('.ab__zeile').getByRole('button', { name: 'Link kopieren' })).toBeVisible();
  await expect(page.locator('.ab__fuss')).toContainText('Veröffentlicht');
  // das Titelbild ist das erste Foto der Großansicht
  const zoom = page.locator('.ak__zoom');
  const box = (await zoom.boundingBox())!;
  await zoom.click({ position: { x: box.width * 0.8, y: 30 } });
  const lb = page.getByRole('dialog', { name: 'Bildansicht' });
  await expect(lb.locator('.lb__n')).toHaveText(/^01 \/ \d{2}$/);
  await expect(lb.locator('.lb__k')).toHaveText('Titelbild');
  await page.keyboard.press('Escape');
  await expect(lb).toBeHidden();
});

test('News: Beitrag ohne Titelbild hat den Netz-Kopf mit Knoten', async ({ page }) => {
  // alle Beiträge der alten Website haben ein Titelbild; ohne geht es nur im Editor (tests/news-editor.spec.ts)
  const p = veroeffentlicht().find((x) => !x.image);
  test.skip(!p, 'kein Beitrag ohne Titelbild');
  await page.goto(`/news/${p!.id}/`);
  const kopf = page.locator('.ak--netz');
  await expect(kopf.getByRole('heading', { level: 1 })).toHaveText(p!.title);
  await expect(kopf.locator('canvas.ak__netz')).toHaveCount(1);
  // der Knoten erscheint, sobald das Netz steht
  await expect.poll(() => kopf.locator('[data-knoten]').evaluate((el) => getComputedStyle(el).opacity), { timeout: 6000 }).toBe('1');
  if (p!.deadline) await expect(page.locator('.ak__knoten')).toContainText('Bewerbungsfrist');
});

test('News: Förderhinweis als Kasten, E-Mail-Adressen geschützt, Video als Link', async ({ page }) => {
  const hinweis = veroeffentlicht().find((x) => /^::: hinweis$/m.test(x.body))!;
  await page.goto(`/news/${hinweis.id}/`);
  await expect(page.locator('.ab__text .nh')).toBeVisible();

  const mail = veroeffentlicht().find((x) => /\(mailto:/.test(x.body))!;
  const adresse = /\(mailto:([^)]+)\)/.exec(mail.body)![1];
  await page.goto(`/news/${mail.id}/`);
  // die Adresse steht nicht im HTML, erst der Klick zeigt sie
  expect(await page.content()).not.toContain(adresse);
  const knopf = page.locator('.ab__text [data-protected-email] button').first();
  await knopf.click();
  await expect(page.locator('.ab__text a[href^="mailto:"]').first()).toBeVisible({ timeout: 15000 });

  const video = veroeffentlicht().find((x) => /\[Video auf (YouTube|Vimeo) ansehen ↗\]/.test(x.body))!;
  const external: string[] = [];
  page.on('request', (r) => !r.url().startsWith('http://localhost') && external.push(r.url()));
  await page.goto(`/news/${video.id}/`);
  await expect(page.getByRole('link', { name: /^Video auf (YouTube|Vimeo) ansehen ↗$/ }).first()).toHaveAttribute('target', '_blank');
  expect(external).toEqual([]);
});

test('Alte Adressen der WordPress-Website leiten auf die neuen weiter', async ({ page, request }) => {
  const weiter = JSON.parse(readFileSync('src/content/news/weiterleitungen.json', 'utf8')) as Record<string, string>;
  const [alt, ziel] = Object.entries(weiter).find(([, z]) => z.startsWith('news/'))!;
  const res = await request.get(`/${alt}/`);
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain('<meta name="robots" content="noindex">');
  await page.goto(`/${alt}/`);
  await expect(page).toHaveURL(new RegExp(`/${ziel}$`));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // Weiterleitungen stehen nicht in der Sitemap
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  expect(sitemap).not.toContain(`/${alt}/<`);
  expect(sitemap).toContain(`/${ziel}<`);
});

/** Kalender der Profitrainings-Seite mit festem Datum (Platzhalter-Termine Okt.–Dez. 2026) */
async function openKalender(page: Page, path = '/profitraining/') {
  await page.clock.install({ time: new Date('2026-10-12T08:00:00+02:00') });
  await page.goto(path);
  await dismissConsent(page);
  return page.locator('#kalender');
}

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

test('News: Startseite zeigt Titelthema und offene Ausschreibungen, Links führen zum Beitrag', async ({ page }) => {
  const heute = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
  const lead = veroeffentlicht().find((p) => p.image) ?? neuester;
  await page.goto('/');
  const news = page.locator('#news');
  await expect(news.getByRole('heading', { name: 'Aus dem Netz' })).toBeVisible();
  await expect(news.locator(`a[href$="/news/${lead.id}/"]`).first()).toBeVisible();
  // offene Ausschreibungen (Frist noch nicht vorbei) stehen mit Frist darunter
  const offen = veroeffentlicht().filter((p) => p.id !== lead.id && p.deadline && p.deadline >= heute);
  if (offen.length) await expect(news.getByText(/Frist \d+\./).first()).toBeVisible();
  await news.getByRole('link', { name: 'Alle Beiträge →' }).click();
  await expect(page).toHaveURL(/\/news\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Aus dem');
});

test('News: Filter zeigt nur die gewählte Kategorie, „Alle“ blendet das Titelthema in der Chronik aus', async ({ page }) => {
  const alle = veroeffentlicht();
  await page.goto('/news/');
  await dismissConsent(page);
  const posts = page.locator('[data-post]:visible');
  await expect(page.locator('[data-post]')).toHaveCount(alle.length);
  await expect(posts).toHaveCount(alle.length - 1);
  await page.getByRole('button', { name: /^Verein/ }).click();
  await expect(page.getByRole('button', { name: /^Verein/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(posts).toHaveCount(alle.filter((p) => p.category === 'Verein').length);
  await page.getByRole('button', { name: /^Training/ }).click();
  const training = alle.find((p) => p.category === 'Training')!;
  await expect(posts.filter({ hasText: training.title })).toHaveCount(1);
});

test('News: englische Seite nutzt die Übersetzung und weist auf fehlende Übersetzungen hin', async ({ page }) => {
  await page.goto(`/en/news/${englisch.id}/`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(englisch.title);
  await expect(page.getByText('This post is only available in German so far.')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  // Sprachumschalter führt zum selben Beitrag
  await expect(page.locator('.site-header__lang')).toHaveAttribute('href', new RegExp(`/news/${englisch.id}/$`));
  // ohne englische Fassung: deutscher Text mit Hinweis
  const nurDeutsch = veroeffentlicht().find((p) => !newsDateien('en').some((e) => e.id === p.id) && / und /.test(p.body))!;
  await page.goto(`/en/news/${nurDeutsch.id}/`);
  await expect(page.getByText('This post is only available in German so far.')).toBeVisible();
});

test('News: RSS-Feeds sind gültig und verlinken die Beiträge', async ({ request }) => {
  for (const [path, link] of [['/news.xml', `/news/${neuester.id}/`], ['/en/news.xml', `/en/news/${neuester.id}/`]]) {
    const res = await request.get(path);
    expect(res.status()).toBe(200);
    const xml = await res.text();
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain(link);
  }
});

test('Header: TNDD-Zeichen führt zur Startseite, News und Über uns im Menü', async ({ page, isMobile }) => {
  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
  // Profile gehören zu „Über uns“
  await page.goto('/netzwerk/alina-lucifero/');
  await dismissConsent(page);
  if (isMobile) await page.getByRole('button', { name: 'Menü' }).click();
  await expect(nav.getByRole('link')).toHaveText(['Kalender', 'Formate', 'Training', 'News', 'Über uns', 'Spenden']);
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
  await expect(nav.getByRole('link', { name: 'News' })).toHaveAttribute('aria-current', 'page');
  await page.locator('[data-header]').getByRole('link', { name: 'TanzNetzDresden – zur Startseite' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('Header: Unterstreichung gleitet beim Wechsel im Menü zum neuen Punkt', async ({ page, isMobile }) => {
  test.skip(isMobile, 'im aufklappbaren Menü bleibt die einfache Unterstreichung');
  // Animationen des Strichs mitschreiben
  await page.addInitScript(() => {
    const orig = Element.prototype.animate;
    (window as any).__strich = [];
    Element.prototype.animate = function (k: any, o: any) {
      if (this instanceof HTMLElement && this.matches('[data-nav-strich]')) (window as any).__strich.push(k);
      return orig.call(this, k, o);
    };
  });
  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
  const strich = nav.locator('[data-nav-strich]');
  const lage = (name: string) => nav.getByRole('link', { name }).evaluate((a: HTMLElement) => ({ x: a.offsetLeft, w: a.offsetWidth }));
  await page.goto('/termine/');
  await dismissConsent(page);
  // der Strich ersetzt die Unterstreichung des aktiven Punkts
  await expect(strich).toHaveCSS('opacity', '1');
  await expect(nav.getByRole('link', { name: 'Kalender' })).toHaveCSS('border-bottom-color', 'rgba(0, 0, 0, 0)');
  const kalender = await lage('Kalender');
  await expect.poll(() => strich.evaluate((e: HTMLElement) => e.offsetWidth)).toBe(kalender.w);

  await nav.getByRole('link', { name: 'Training' }).click();
  await expect(page).toHaveURL(/\/profitraining\/$/);
  const training = await lage('Training');
  // startet unter „Kalender“ und endet unter „Training“
  await expect.poll(() => page.evaluate(() => (window as any).__strich.length)).toBe(1);
  const [von, bis] = await page.evaluate(() => (window as any).__strich[0]);
  expect(von).toMatchObject({ transform: `translateX(${kalender.x}px)`, width: `${kalender.w}px` });
  expect(bis).toMatchObject({ transform: `translateX(${training.x}px)`, width: `${training.w}px` });
  await expect.poll(() => strich.evaluate((e: HTMLElement) => [e.offsetLeft + new DOMMatrix(getComputedStyle(e).transform).m41, e.offsetWidth])).toEqual([training.x, training.w]);
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

test('Terminseite: Englisch und Kalenderdatei', async ({ page, request }) => {
  await page.goto('/en/events/2026-10-15-studio-round-9/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Studio Round #9');
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
  // … auch unter der Maus weiter …
  // (die Kacheln laufen, daher die Maus einfach in die Mitte des Mosaiks)
  const box = (await mosaik.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(700);
  const h = await lage();
  await expect.poll(lage).not.toBe(h);
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

test('Gestaltung: Name im Fuß, im Impressum und in den Metadaten', async ({ page }) => {
  for (const [start, impressum, label, h] of [
    ['/', '/impressum/', 'Gestaltung: Malte Leonard Herz', 'Gestaltung'],
    ['/en/', '/en/legal-notice/', 'Design: Malte Leonard Herz', 'Design'],
  ] as const) {
    await page.goto(start);
    await expect(page.locator('meta[name="designer"]')).toHaveAttribute('content', 'Malte Leonard Herz');
    const link = page.locator('.site-footer__legal').getByRole('link', { name: label });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${impressum}#gestaltung$`));
    await expect(page.getByRole('heading', { level: 2, name: h, exact: true })).toBeVisible();
    await expect(page.locator('#gestaltung + p')).toContainText('© 2026 Malte Leonard Herz');
  }
});
