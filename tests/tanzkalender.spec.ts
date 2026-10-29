/**
 * Tanzkalender (/termine/, Entwurf design/entwuerfe/2026-10-kalender/): Liste, Mini-Monat, Monatsansicht,
 * Filter, Suche, Kalenderdateien. Platzhalter-Termine Okt.–Dez. 2026, KEEP UP aus wochen.yaml, Fristen aus den News.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { buendeln, ics, monate, monatPlus, passt, raster, type KTermin } from '../src/lib/tanzkalender-modell';
import { newsDateien } from './news-daten';

/** Ausschreibung mit der spätesten Frist (Beiträge aus der alten Website, tests/news-daten.ts) */
const ausschreibung = newsDateien().filter((p) => p.deadline && !p.draft).sort((a, b) => b.deadline!.localeCompare(a.deadline!))[0];

async function oeffnen(page: Page, pfad = '/termine/') {
  await page.clock.install({ time: new Date('2026-10-12T08:00:00+02:00') });
  await page.goto(pfad);
  await page.getByRole('button', { name: /^(Nur notwendige|Necessary only)$/ }).click();
}
const liste = (page: Page) => page.locator('#tk-liste');

test('Liste: heute, Trainingswoche gebündelt, Termin aufklappen mit Ort, Adresse und Eintritt', async ({ page }) => {
  await oeffnen(page);
  const l = liste(page);
  await expect(l.locator('[data-tk-treffer]')).toHaveText(/^\d+ Termine ab heute$/);
  const heute = l.locator('.tk-tagzeile.is-heute');
  await expect(heute).toHaveAttribute('data-day', '2026-10-12');
  await expect(heute).toContainText('Heute');
  // Profitraining der Woche in einer Zeile
  await expect(heute.locator('.tk-ev')).toHaveCount(1);
  await expect(heute.locator('.tk-zeile2')).toHaveText('Mo · Di · Mi · Fr · mit Leon Börgens · TENZA Schmiede');
  await expect(heute.locator('.badge')).toHaveText('Training');

  const knopf = l.getByRole('button', { name: /Studio Round #9/ });
  await knopf.click();
  await expect(knopf).toHaveAttribute('aria-expanded', 'true');
  const d = l.locator('[data-detail="2026-10-15-studio-round-9"]');
  await expect(d).toContainText('Donnerstag, 15. Oktober 2026 · 19:30–21:30 Uhr');
  await expect(d).toContainText('Villa Wigman für Tanz');
  await expect(d).toContainText('Bautzner Straße 107, 01099 Dresden');
  await expect(d).toContainText('Eintritt frei');
  await expect(d.getByRole('link', { name: 'Zum Termin →' })).toHaveAttribute('href', /\/termine\/2026-10-15-studio-round-9\/$/);
  await expect(d.getByRole('link', { name: 'Route →' })).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=51\.06566,13\.76699$/);
  // Training aufklappen: alle Tage der Woche
  await heute.getByRole('button').click();
  await expect(knopf).toHaveAttribute('aria-expanded', 'false');
  await expect(heute.locator('.tk-tage span')).toHaveText(['Mo 12. Okt', 'Di 13. Okt', 'Mi 14. Okt', 'Fr 16. Okt']);
  await expect(heute.getByRole('link', { name: 'KEEP UP Kalender →' })).toHaveAttribute('href', /\/profitraining\/#kalender$/);
});

test('Liste: Filter, Suche, leere Auswahl, Vergangene, Frist aus einer Ausschreibung', async ({ page }) => {
  await oeffnen(page);
  const l = liste(page);
  const chips = page.locator('[data-tk-chips]');
  await expect(chips.getByRole('button', { name: /^Bühne/ })).toContainText('2');
  const frist = l.locator(`[data-ev="frist-${ausschreibung.id}"]`);
  await chips.getByRole('button', { name: /^Bühne/ }).click();
  await expect(chips.getByRole('button', { name: /^Bühne/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(l.locator('.tk-ev .badge')).toHaveText(['Bühne', 'Bühne']);
  await expect(l.locator('[data-ev^="frist-"]')).toHaveCount(0);

  await page.getByRole('searchbox', { name: 'Termine durchsuchen' }).fill('vision');
  await expect(l.locator('[data-tk-treffer]')).toHaveText('1 Termin ab heute für „vision“');
  await page.getByRole('searchbox', { name: 'Termine durchsuchen' }).fill('gibtesnicht');
  await expect(l.getByText('Keine Termine für diese Auswahl.')).toBeVisible();
  await l.getByRole('button', { name: 'Filter zurücksetzen →' }).click();
  await expect(page.getByRole('searchbox', { name: 'Termine durchsuchen' })).toHaveValue('');
  await expect(chips.getByRole('button', { name: /^Alle/ })).toHaveAttribute('aria-pressed', 'true');

  const past = l.getByRole('button', { name: /^Vergangene zeigen \(\d+\)$/ });
  await past.click();
  await expect(l.locator('[data-tk-treffer]')).toHaveText(/^\d+ Termine$/);
  await expect(l.locator('[data-day="2026-09-07"]')).toBeVisible();
  // Frist einer Ausschreibung (News mit Bewerbungsfrist), hier schon vorbei
  await expect(frist.locator('.tk-zeit')).toHaveText('Frist');
  await frist.getByRole('button').click();
  await expect(frist.getByRole('link', { name: 'Zur Ausschreibung →' })).toHaveAttribute('href', new RegExp(`/news/${ausschreibung.id}/$`));
  await l.getByRole('button', { name: 'Vergangene ausblenden' }).click();
  await expect(l.locator('[data-day="2026-09-07"]')).toHaveCount(0);
});

test('Mini-Monat: Tage mit Terminen, Blättern, Klick springt zum Tag', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Mini-Monat steht auf dem Handy über der Liste');
  // ohne weiches Scrollen: der Scroll-Spion soll nicht während des Blätterns weiterlaufen
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await oeffnen(page);
  const mini = page.locator('[data-tk-mini]');
  await expect(page.locator('[data-tk-mini-label]')).toHaveText('Oktober 2026');
  await expect(mini.getByRole('button', { name: /^Sonntag, 11\. Oktober 2026, keine Termine$/ })).toBeDisabled();
  await expect(mini.getByRole('button', { name: /^Montag, 12\. Oktober 2026, 1 Termin$/ })).toHaveClass(/is-heute/);
  await page.locator('[data-tk-mini-nach]').click();
  await expect(page.locator('[data-tk-mini-label]')).toHaveText('November 2026');
  await mini.getByRole('button', { name: /^Samstag, 14\. November 2026/ }).click();
  await expect(liste(page).locator('[data-day="2026-11-14"]')).toBeInViewport();
  // vergangener Tag: blendet Vergangene ein
  await page.locator('[data-tk-mini-vor]').click();
  await page.locator('[data-tk-mini-vor]').click();
  await expect(page.locator('[data-tk-mini-label]')).toHaveText('September 2026');
  await mini.getByRole('button', { name: /^Montag, 7\. September 2026/ }).click();
  await expect(liste(page).getByRole('button', { name: 'Vergangene ausblenden' })).toBeVisible();
  await expect(liste(page).locator('[data-day="2026-09-07"]')).toBeInViewport();
});

test('Monat: Raster, Tag wählen, blättern, nächster Termin, Heute; Ansicht per Tastatur', async ({ page }) => {
  await oeffnen(page);
  const tab = page.getByRole('tab', { name: 'Liste' });
  await tab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Monat' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'Monat' })).toBeFocused();
  const m = page.locator('#tk-monat');
  await expect(m).toBeVisible();
  await expect(liste(page)).toBeHidden();
  await expect(m.locator('[data-tk-vm-label]')).toHaveText('Oktober 2026');
  const tag = m.locator('[data-tk-tag]');
  await expect(tag.locator('.tk-tag__k')).toHaveText('Heute');
  await expect(tag.locator('h3')).toHaveText('Montag, 12. Oktober');
  await expect(tag).toContainText('KEEP UP · Profitraining');

  await m.getByRole('button', { name: /^Donnerstag, 15\. Oktober 2026/ }).click();
  await expect(m.getByRole('button', { name: /^Donnerstag, 15\. Oktober 2026/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(tag.locator('.tk-tag__k')).toHaveText('Ausgewählter Tag');
  await expect(tag).toContainText('Studio Round #9');
  await expect(tag).toContainText('Eintritt frei');

  await m.getByRole('button', { name: /^Samstag, 17\. Oktober 2026/ }).click();
  await expect(tag).toContainText('An diesem Tag ist nichts eingetragen.');
  await tag.getByRole('button', { name: /^Nächster Termin: Mo 19\. Okt · KEEP UP · Profitraining →$/ }).click();
  await expect(tag.locator('h3')).toHaveText('Montag, 19. Oktober');

  await m.getByRole('button', { name: 'Nächster Monat' }).click();
  await expect(m.locator('[data-tk-vm-label]')).toHaveText('November 2026');
  await expect(tag.locator('h3')).toHaveText('Montag, 2. November');
  await page.getByRole('button', { name: 'Heute', exact: true }).click();
  await expect(m.locator('[data-tk-vm-label]')).toHaveText('Oktober 2026');
  await expect(tag.locator('h3')).toHaveText('Montag, 12. Oktober');
});

test('Als Nächstes im Kopf öffnet den Termin in der Liste', async ({ page }) => {
  await oeffnen(page);
  const next = page.locator('[data-tk-next] a');
  await expect(next).toHaveCount(3);
  await expect(next.nth(0)).toContainText('Studio Round #9');
  await expect(next.nth(0)).toContainText('19:30 Uhr · Villa Wigman für Tanz');
  await page.getByRole('tab', { name: 'Monat' }).click();
  await next.nth(1).click();
  await expect(liste(page)).toBeVisible();
  const knopf = liste(page).getByRole('button', { name: /POP UP/ }).first();
  await expect(knopf).toHaveAttribute('aria-expanded', 'true');
  await expect(knopf).toBeFocused();
});

test('Kalenderdateien: ein Termin, eine Trainingswoche und die Auswahl', async ({ page }) => {
  await oeffnen(page);
  const l = liste(page);
  const text = async (klick: () => Promise<void>) => {
    const [dl] = await Promise.all([page.waitForEvent('download'), klick()]);
    return readFileSync((await dl.path())!, 'utf8');
  };
  await l.getByRole('button', { name: /POP UP/ }).first().click();
  const eins = await text(() => l.getByRole('button', { name: 'In Kalender speichern' }).click());
  expect(eins).toContain('UID:2026-10-31-pop-up@');
  expect(eins).toContain('DTSTART;TZID=Europe/Berlin:20261031T200000');
  expect(eins).toContain('LOCATION:Zentralwerk\\, Riesaer Straße 32\\, 01127 Dresden');
  expect(eins).toContain('DESCRIPTION:Neue Kurzstücke aus dem Netzwerk');
  expect(eins).toMatch(/URL:http:\/\/localhost:\d+\/termine\/2026-10-31-pop-up\//);

  await l.locator('.tk-tagzeile.is-heute').getByRole('button').click();
  await expect(l.locator('[data-detail="woche-2026-10-12"]')).toBeVisible();
  const woche = await text(() => l.getByRole('button', { name: 'In Kalender speichern' }).click());
  expect(woche.match(/BEGIN:VEVENT/g)).toHaveLength(4);
  expect(woche).toContain('UID:keep-up-2026-10-12-1000@');
  expect(woche).toContain('SUMMARY:KEEP UP · Profitraining · Leon Börgens');

  await page.locator('[data-tk-chips]').getByRole('button', { name: /^Bühne/ }).click();
  const auswahl = await text(() => page.getByRole('button', { name: 'Auswahl als .ics laden' }).click());
  expect(auswahl.match(/BEGIN:VEVENT/g)).toHaveLength(2);
});

test('Englisch: #kategorie-buhne wählt Bühne, englische Texte und Eintritt', async ({ page }) => {
  await oeffnen(page, '/en/events/#kategorie-buhne');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Dance in Dresden.');
  await expect(page.locator('[data-tk-chips]').getByRole('button', { name: /^Stage/ })).toHaveAttribute('aria-pressed', 'true');
  const l = liste(page);
  await expect(l.locator('[data-tk-treffer]')).toHaveText('2 events from today');
  await l.getByRole('button', { name: /POP UP/ }).first().click();
  await expect(l.locator('[data-detail="2026-10-31-pop-up"]')).toContainText('Saturday 31 October 2026 · 20:00');
  await expect(l.locator('[data-detail="2026-10-31-pop-up"]')).toContainText('Pay what you can');
  await expect(l.getByRole('link', { name: 'About the event →' })).toHaveAttribute('href', /\/en\/events\/2026-10-31-pop-up\/$/);
});

test('Terminseite zeigt den Eintritt', async ({ page }) => {
  await page.goto('/termine/2026-10-31-pop-up/');
  await expect(page.locator('dl')).toContainText('EintrittEintritt auf Spendenbasis');
});

test('Ohne JavaScript: einfache Liste aller kommenden Termine', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/termine/');
  await expect(page.locator('[data-tk-main]')).toBeHidden();
  await expect(page.locator('[data-tk-leiste]')).toBeHidden();
  await expect(page.locator('#all-events .event').first()).toBeVisible();
  await ctx.close();
});

test('Barrierefreiheit: aufgeklappter Termin und Monatsansicht (axe)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await oeffnen(page);
  await liste(page).getByRole('button', { name: /Studio Round #9/ }).click();
  const pruefen = async () => {
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`);
  };
  expect(await pruefen()).toEqual([]);
  await page.getByRole('tab', { name: 'Monat' }).click();
  await page.locator('#tk-monat').getByRole('button', { name: /^Donnerstag, 15\. Oktober 2026/ }).click();
  expect(await pruefen()).toEqual([]);
});

test('Logik: Filter, Wochen bündeln, Monate, Raster, Kalenderdatei', async ({}, info) => {
  test.skip(info.project.name !== 'desktop', 'reine Logik, einmal genügt');
  const t = (o: Partial<KTermin>): KTermin => ({
    id: 'x', datum: '2026-10-12', von: '10:00', bis: '11:30', zeit: '10:00–11:30', titel: 'Titel', wer: '', ort: '', adresse: '', route: '',
    kat: 'Bühne', badge: 'Bühne', text: '', eintritt: '', link: '', linkText: '', training: false, ...o,
  });
  const a = t({ id: 'a', datum: '2026-10-12', training: true, kat: 'Training', wer: 'Leon' });
  const b = t({ id: 'b', datum: '2026-10-14', training: true, kat: 'Training', wer: 'Leon' });
  const c = t({ id: 'c', datum: '2026-10-13', titel: 'Größe Bühne', ort: 'Zentralwerk' });
  expect(passt(c, '', 'grosse')).toBe(true);
  expect(passt(c, 'Training', '')).toBe(false);
  const z = buendeln([a, c, b]);
  expect(z.map((x) => x.id)).toEqual(['woche-2026-10-12', 'c']);
  expect(z[0].sitzungen?.map((s) => s.id)).toEqual(['a', 'b']);
  const ms = monate([c], '2026-10-01');
  expect(ms.map((m) => [m.key, m.tage.map((d) => d.datum), m.anzahl])).toEqual([['2026-10', ['2026-10-01', '2026-10-13'], 1]]);
  const r = raster('2026-11');
  expect(r.length % 7).toBe(0);
  expect(r[0]).toEqual({ datum: '2026-10-26', imMonat: false });
  expect(r.filter((x) => x.imMonat)).toHaveLength(30);
  expect(monatPlus('2026-12', 1)).toBe('2027-01');
  expect(monatPlus('2026-01', -1)).toBe('2025-12');
  const datei = ics([t({ id: 'f', von: '', zeit: '', kat: 'Frist', titel: 'Frist, lang;', link: '/news/x/' })], { seite: 'https://tanznetzdresden.de/termine/', jetzt: new Date('2026-10-12T00:00:00Z') });
  expect(datei).toContain('DTSTART;VALUE=DATE:20261012\r\nDTEND;VALUE=DATE:20261013');
  expect(datei).toContain('SUMMARY:Frist\\, lang\\;');
  expect(datei).toContain('URL:https://tanznetzdresden.de/news/x/');
  expect(datei.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
});
