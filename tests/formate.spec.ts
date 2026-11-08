/**
 * Formate (/formate/, Entwurf design/entwuerfe/2026-11-formate/formate-v2.dc.html) und Tanzkalender-Archiv (/formate/tanzkalender/).
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

test('Formate: Menü, Kopf als Netz, Kurzbeschreibung unter der Maus, neu knüpfen', async ({ page, isMobile }) => {
  await oeffnen(page, '/');
  if (!isMobile) {
    await page.locator('.site-nav').getByRole('link', { name: 'Formate' }).click();
    await expect(page).toHaveURL(/\/formate\/$/);
  } else await page.goto('/formate/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Acht Formate. Ein Netz.');

  const netz = page.getByRole('navigation', { name: 'Formate', exact: true });
  const namen = netz.getByRole('link');
  await expect(namen).toHaveCount(formate.length);
  await expect(netz.locator('.fo-netz--js line').first()).toBeAttached();
  // Namen überlappen sich nicht, bleiben in der Bühne und lassen den Text frei (gemessen ohne Maus, nach dem Hereingleiten)
  await page.mouse.move(0, 0);
  await expect(netz.locator('[data-pre]').last()).toHaveCSS('opacity', '1');
  const lage = await page.evaluate(() => {
    const r = (el: Element) => el.getBoundingClientRect();
    const namen = [...document.querySelectorAll('.fo-knoten__a')].map(r);
    const intro = r(document.querySelector('[data-fo-intro]')!);
    const buehne = r(document.querySelector('[data-fo-buehne]')!);
    const trifft = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    return {
      ueberlappt: namen.some((a, i) => namen.some((b, j) => j > i && trifft(a, b))),
      imText: namen.some((a) => trifft(a, intro)),
      draussen: namen.some((a) => a.left < buehne.left - 1 || a.right > buehne.right + 1),
    };
  });
  expect(lage).toEqual({ ueberlappt: false, imText: false, draussen: false });

  // Name mit der Maus oder dem Fokus: Kurzbeschreibung unter der Überschrift
  const info = page.locator('[data-fo-info]');
  await expect(info).toContainText('Menschen · Orte · Partner');
  await netz.getByRole('link', { name: /KEEP UP/ }).focus();
  await expect(info).toContainText('03 · Training · seit 2022');
  await expect(info).toContainText('Profitraining');
  await netz.getByRole('link', { name: /KEEP UP/ }).blur();
  await expect(info).toContainText('Menschen · Orte · Partner');

  // neu knüpfen: andere Lage, wieder ohne Überlappung
  const vorher = await netz.locator('[data-knoten]').evaluateAll((l) => l.map((el) => (el as HTMLElement).style.getPropertyValue('--xb')).join());
  await page.getByRole('button', { name: 'Netz neu knüpfen' }).click();
  await expect.poll(() => netz.locator('[data-knoten]').evaluateAll((l) => l.map((el) => (el as HTMLElement).style.getPropertyValue('--xb')).join())).not.toBe(vorher);

  // ein Name führt zum Format
  await netz.getByRole('link', { name: /KEEP UP/ }).click();
  await expect(page.locator('#keep-up h2')).toBeInViewport();
  // KEEP UP: das nächste Training (wochen.yaml) – je nach Build-Tag heute oder an einem der nächsten Tage
  const termin = page.locator('#keep-up [data-fo-cta] [data-t]');
  await expect(termin).toHaveText(/^(Heute · )?\p{L}{2} (· )?\d{1,2}\. \p{L}{3} · \d\d:\d\d/u);
  await expect(termin).toHaveCSS('font-family', /JetBrains Mono/);
});

test('Formate: ohne JavaScript steht das Netz unter dem Text', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/formate/');
  const namen = page.locator('.fo-knoten__a');
  await expect(namen).toHaveCount(formate.length);
  await expect(namen.first()).toBeVisible();
  await expect(page.locator('.fo-netz line:visible').first()).toBeAttached();
  await expect(page.getByRole('button', { name: 'Netz neu knüpfen' })).toBeHidden();
  const introUnten = (await page.locator('[data-fo-intro]').boundingBox())!;
  const buehne = (await page.locator('[data-fo-buehne]').boundingBox())!;
  expect(buehne.y).toBeGreaterThanOrEqual(introUnten.y + introUnten.height);
  await ctx.close();
});

test('Formate: Filter „Ich möchte …“, großes Foto, Kasten mit Termin oder Rückblick', async ({ page }) => {
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

  // Foto über die ganze Breite, darunter Text und Eckdaten
  const foto = (await keepUp.locator('.fo-kap__bild').boundingBox())!;
  const titel = (await keepUp.getByRole('heading', { level: 2 }).boundingBox())!;
  expect(titel.y).toBeGreaterThan(foto.y + foto.height);
  expect(foto.width).toBeGreaterThan(((await keepUp.boundingBox())!.width) - 2);
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
  // Kontrast erst messen, wenn alles hereingeglitten ist
  await expect(page.locator('[data-fo-info]')).toHaveCSS('opacity', '1');
  await expect(page.locator('[data-pre]').last()).toHaveCSS('opacity', '1');
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
  // die Uhr steht (oeffnen): ohne „Bewegung reduzieren“ bliebe der Kopf am Anfang seines Auftritts stehen
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await oeffnen(page, '/en/formats/dance-calendar/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(new RegExp(`^Tanzkalender\\s*Dresden\\.\\s*${ausgaben.length} issues\\.$`));
  await expect(page.getByRole('button', { name: 'View April 2026' })).toBeVisible();
  const ergebnis = await new AxeBuilder({ page }).include('main').analyze();
  expect(ergebnis.violations.map((v) => v.id)).toEqual([]);

  await page.goto('/tanzkalender/');
  await expect(page).toHaveURL(/\/formate\/tanzkalender\/$/);
});
