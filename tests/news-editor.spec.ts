/**
 * News-Editor (Intern → News → Beitrag) mit Abschnitten, Fotos und Vorschau im Browser.
 * Supabase (Anmeldung, Tabelle news_posts, Bucket newsbilder) und die Funktion „inhalte“ sind nachgebaut;
 * hochgeladene Fotos werden aus dem Speicher wieder ausgeliefert.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { abschnitte, zuMarkdown } from '../src/lib/news-bloecke';
import { supabase } from '../src/settings/supabase';

test.skip(!supabase.url || !supabase.anonKey, 'Supabase nicht eingetragen');

const SB = supabase.url.replace(/\/+$/, '');
const ref = new URL(SB).hostname.split('.')[0];
const FOTOS = ['solo-blau.jpg', 'sprung.jpg', 'duo-rot.jpg'].map((n) => `src/assets/photos/${n}`);

interface Mock {
  gespeichert: Record<string, unknown>[];
  hochgeladen: string[];
  geloescht: string[][];
  neubau: number;
}

/** Meldet Pia (Presse) an und baut Supabase nach. `zeile`: vorhandener Beitrag für ?id=n1 */
async function editor(page: Page, zeile?: Record<string, unknown>): Promise<Mock> {
  const m: Mock = { gespeichert: [], hochgeladen: [], geloescht: [], neubau: 0 };
  const dateien = new Map<string, Buffer>();
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp: 4102444800 })}.x`;
  const session = {
    access_token: token, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800,
    user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'pia@example.org', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
  };
  await page.addInitScript(([k, v]) => {
    localStorage.setItem(k, v);
    localStorage.setItem('tndd-consent', JSON.stringify({ v: 1, date: '2026-10-15T00:00:00Z', categories: { notwendig: true } }));
  }, [`sb-${ref}-auth-token`, JSON.stringify(session)]);
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
  await page.route(`${SB}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: cors });
    if (req.method() === 'OPTIONS') return json({});
    if (url.pathname === '/rest/v1/profiles') {
      const p = { id: 'u1', display_name: 'Pia Presse', role: 'presse' };
      return json(req.headers()['accept']?.includes('object') ? p : [p]);
    }
    if (url.pathname === '/rest/v1/news_posts') {
      if (req.method() === 'GET') return json(zeile ?? null);
      const body = req.postDataJSON();
      m.gespeichert.push(body);
      return json({ id: 'n1', updated_at: '2026-10-15T10:00:00Z', ...zeile, ...body });
    }
    let t: RegExpMatchArray | null;
    if ((t = url.pathname.match(/^\/storage\/v1\/object\/newsbilder\/(.+)$/)) && req.method() === 'POST') {
      const pfad = decodeURIComponent(t[1]);
      // supabase-js schickt das Foto als Formular; ausgeliefert wird einfach ein echtes Foto
      dateien.set(pfad, readFileSync(FOTOS[m.hochgeladen.length % FOTOS.length]));
      m.hochgeladen.push(pfad);
      return json({ Key: `newsbilder/${pfad}` });
    }
    if (url.pathname === '/storage/v1/object/newsbilder' && req.method() === 'DELETE') {
      m.geloescht.push(req.postDataJSON().prefixes);
      return json([]);
    }
    if ((t = url.pathname.match(/^\/storage\/v1\/object\/public\/newsbilder\/(.+)$/))) {
      const pfad = decodeURIComponent(t[1]);
      const inhalt = dateien.get(pfad) ?? (pfad.startsWith('vorhanden/') ? readFileSync(FOTOS[0]) : undefined);
      if (!inhalt) return route.fulfill({ status: 404, headers: cors });
      return route.fulfill({ status: 200, contentType: 'image/jpeg', body: inhalt, headers: cors });
    }
    if (url.pathname === '/functions/v1/inhalte') {
      m.neubau++;
      return json({ ok: true });
    }
    return json({ message: 'nicht nachgebaut' }, 404);
  });
  return m;
}

const detail = (page: Page) => page.locator('.fb-detail');

test('Beitrag mit Galerie, Ausschnitt und Hinweiskasten anlegen und veröffentlichen', async ({ page }) => {
  const m = await editor(page);
  await page.goto('/intern/news/bearbeiten/');
  await page.getByLabel('Titel', { exact: true }).fill('3 Jahre TANZPAKT in residence • Resümee und Rückschau');
  await page.getByLabel('Kurztext', { exact: true }).fill('Das dreijährige Kooperationsprogramm ist abgeschlossen.');
  await page.getByLabel('Text, Abschnitt 1', { exact: true }).fill('## TANZPAKT in residence\n\nIn den Jahren 2022–24 wurden 18 Residenzen ausgeschrieben.');

  // Bilder-Abschnitt: drei Fotos auf einmal
  await page.getByRole('button', { name: '+ Bilder' }).click();
  await page.locator('.fb-plus input[type=file]').setInputFiles(FOTOS);
  await expect(page.locator('.fb-bild')).toHaveCount(3);
  await expect(page.locator('.fb-bild.is-laedt')).toHaveCount(0);
  expect(m.hochgeladen).toHaveLength(3);
  // mehrere Fotos: Querformat, drei pro Reihe
  await expect(page.getByLabel('Format', { exact: true })).toHaveValue('quer');
  await expect(page.getByLabel('Fotos pro Reihe')).toHaveValue('3');
  await expect(page.locator('.fb-raster')).toHaveAttribute('style', '--sp:3');

  for (const [i, alt] of ['Tänzerin in Blau', 'Sprung', 'Duo in Rot'].entries()) {
    await page.getByRole('button', { name: new RegExp(`^Foto ${i + 1} bearbeiten`) }).click();
    await detail(page).getByLabel('Bildbeschreibung', { exact: true }).fill(alt);
  }
  // Ausschnitt von Foto 3: Klick oben links ins Foto
  const bild = detail(page).locator('.fb-fokus img');
  const box = (await bild.boundingBox())!;
  await bild.click({ position: { x: box.width * 0.25, y: box.height * 0.1 } });
  await expect(page.locator('.fb-bild').nth(2).locator('img')).toHaveAttribute('style', /object-position: ?25% 10%/);
  // Reihenfolge: Foto 3 nach vorn
  await detail(page).getByRole('button', { name: 'Foto 3 nach vorn' }).click();
  await expect(detail(page).locator('.fb-detail__h')).toHaveText('Foto 2 von 3');

  await page.getByLabel('Bildunterschrift (optional)').fill('Die Teilnehmenden von »re-preview«');
  await page.getByLabel('Fotos von').fill('André Wirsig');

  await page.getByRole('button', { name: '+ Hinweiskasten' }).click();
  await page.getByLabel('Hinweiskasten', { exact: true }).fill('»TANZPAKT in residence« wurde gefördert von TANZPAKT Stadt-Land-Bund.');
  await expect(page.locator('.ab-block')).toHaveCount(3);

  await page.getByRole('button', { name: 'Veröffentlichen' }).click();
  await expect(page.locator('[data-msg]').filter({ hasText: 'Veröffentlicht.' })).toContainText('in 2–3 Minuten');
  expect(m.neubau).toBe(1);
  const body = m.gespeichert[0].body as string;
  expect(body).toContain('::: bilder');
  expect(body).toContain('::: hinweis');
  expect(m.gespeichert[0].body_en).toBeNull();
  const { bloecke } = abschnitte(body);
  expect(bloecke.map((b) => b.typ)).toEqual(['text', 'bilder', 'hinweis']);
  const g = bloecke[1];
  if (g.typ !== 'bilder') throw new Error('Bilder erwartet');
  expect(g).toMatchObject({ format: 'quer', spalten: 3, text: 'Die Teilnehmenden von »re-preview«', foto: 'André Wirsig' });
  expect(g.bilder.map((b) => [b.alt, b.fokus])).toEqual([['Tänzerin in Blau', undefined], ['Duo in Rot', '25% 10%'], ['Sprung', undefined]]);
  // Uploads laufen parallel: welche Datei welches Foto ist, steht erst nach dem Hochladen fest
  expect(g.bilder.map((b) => b.datei).sort()).toEqual([...m.hochgeladen].sort());
});

test('Veröffentlichen verlangt Bildbeschreibungen, ein Entwurf nicht', async ({ page }) => {
  const m = await editor(page);
  await page.goto('/intern/news/bearbeiten/');
  await page.getByLabel('Titel', { exact: true }).fill('Galerie ohne Beschreibung');
  await page.getByLabel('Kurztext', { exact: true }).fill('Kurz.');
  await page.getByRole('button', { name: '+ Bilder' }).click();
  await page.locator('.fb-plus input[type=file]').setInputFiles(FOTOS.slice(0, 2));
  await expect(page.locator('.fb-bild.is-laedt')).toHaveCount(0);
  await expect(page.locator('.fb-bild.is-fehlt')).toHaveCount(2);
  await page.getByRole('button', { name: 'Veröffentlichen' }).click();
  await expect(page.locator('[data-msg]')).toContainText('Abschnitt 2: Bildbeschreibung fehlt bei Foto 1, 2.');
  expect(m.gespeichert).toHaveLength(0);
  await page.getByRole('button', { name: 'Als Entwurf speichern' }).click();
  await expect(page.locator('[data-msg]')).toContainText('Entwurf gespeichert');
  expect(m.gespeichert).toHaveLength(1);
});

test('Vorhandener Beitrag: Abschnitte mit Englisch, unverändert gespeichert bleibt der Text gleich', async ({ page }) => {
  const bloecke = abschnitte(
    'Einleitung.\n\n::: bilder\nformat: hoch\nspalten: 4\nfoto: André Wirsig\nbilder:\n  - datei: vorhanden/a.jpg\n    alt: Foyer\n  - datei: vorhanden/b.jpg\n    alt: Rundgang\n    fokus: 40% 20%\n:::\n\n::: hinweis\nGefördert von …\n:::',
    'Introduction.\n\n::: bilder\nformat: hoch\nspalten: 4\nfoto: André Wirsig\nbilder:\n  - datei: vorhanden/a.jpg\n    alt: Foyer\n  - datei: vorhanden/b.jpg\n    alt: Tour\n    fokus: 40% 20%\n:::\n\n::: hinweis\nFunded by …\n:::',
  ).bloecke;
  const body = zuMarkdown(bloecke, 'de');
  const body_en = zuMarkdown(bloecke, 'en');
  const m = await editor(page, {
    id: 'n1', slug: 'rueckblick', status: 'entwurf', title: 'Rückblick', teaser: 'Kurz.', category: 'Rückblick', date: '2025-04-28',
    author: 'Malte', featured: false, body, body_en, facts: [], facts_en: [], image_focus: null, updated_at: '2026-10-15T09:00:00Z',
  });
  await page.goto('/intern/news/bearbeiten/?id=n1');
  await expect(page.locator('.ab-block')).toHaveCount(3);
  await expect(page.locator('.fb-bild')).toHaveCount(2);
  await expect(page.locator('.fb-raster')).toHaveClass(/fb--hoch/);
  await expect(page.getByLabel('Text, Abschnitt 1: Englisch')).toHaveValue('Introduction.');
  await page.getByRole('button', { name: /^Foto 2 bearbeiten/ }).click();
  await expect(detail(page).getByLabel('Bildbeschreibung Englisch')).toHaveValue('Tour');

  await page.getByRole('button', { name: 'Als Entwurf speichern' }).click();
  await expect(page.locator('[data-msg]')).toContainText('Entwurf gespeichert');
  expect(m.gespeichert[0].body).toBe(body);
  expect(m.gespeichert[0].body_en).toBe(body_en);
  // nichts hochgeladen, also auch nichts gelöscht
  expect(m.geloescht).toEqual([]);
});

test('Abschnitte verschieben, einfügen und löschen', async ({ page }) => {
  await editor(page);
  await page.goto('/intern/news/bearbeiten/');
  await page.getByLabel('Text, Abschnitt 1', { exact: true }).fill('Erster');
  await page.getByRole('button', { name: '+ Hinweiskasten' }).click();
  await page.getByLabel('Hinweiskasten', { exact: true }).fill('Kasten');
  // zwischen 1 und 2 einen Text einfügen
  await page.getByRole('button', { name: '+ Abschnitt einfügen' }).click();
  await page.locator('.ab-plus:not(.ab-plus--ende) .ab-plus__menue').getByRole('button', { name: '+ Text' }).click();
  await expect(page.locator('.ab-block__typ')).toHaveText(['1 · Text', '2 · Text', '3 · Hinweiskasten']);
  await page.getByRole('button', { name: 'Abschnitt 3 nach oben' }).click();
  await expect(page.locator('.ab-block__typ')).toHaveText(['1 · Text', '2 · Hinweiskasten', '3 · Text']);
  await page.getByRole('button', { name: 'Abschnitt 3 löschen' }).click();
  await expect(page.locator('.ab-block__typ')).toHaveText(['1 · Text', '2 · Hinweiskasten']);
});

test('Vorschau zeigt den Beitrag wie auf der Website, auf dem Handy und auf Englisch', async ({ page }) => {
  await editor(page);
  await page.goto('/intern/news/bearbeiten/');
  await page.getByText('Mit Foto', { exact: true }).click();
  await page.getByLabel('Titel', { exact: true }).fill('Rückblick mit Fotos');
  await page.getByLabel('Titel', { exact: true }).press('Tab');
  await page.getByLabel('Kurztext', { exact: true }).fill('Drei Jahre in Bildern.');
  await page.locator('[data-photo-input]').setInputFiles(FOTOS[2]);
  await expect(page.locator('[data-photo-img]')).toBeVisible();
  // Ausschnitt des Titelfotos
  const frame = page.locator('[data-photo-frame]');
  const fb = (await frame.boundingBox())!;
  await frame.click({ position: { x: fb.width * 0.5, y: fb.height * 0.2 } });
  await expect(page.locator('[data-photo-img]')).toHaveAttribute('style', /object-position: 50% 20%/);
  await page.getByRole('button', { name: '+ Bilder' }).click();
  await page.locator('.fb-plus input[type=file]').setInputFiles(FOTOS.slice(0, 2));
  await expect(page.locator('.fb-bild.is-laedt')).toHaveCount(0);

  await page.getByRole('button', { name: 'Vorschau', exact: true }).click();
  const dlg = page.getByRole('dialog', { name: 'Vorschau' });
  await expect(dlg).toBeVisible();
  const v = page.frameLocator('[data-vorschau-frame]');
  await expect(v.getByRole('heading', { level: 1 })).toHaveText('Rückblick mit Fotos');
  await expect(v.locator('.ah__img-frame img')).toHaveAttribute('style', /object-position: 50% 20%/);
  await expect(v.locator('.nb--galerie .nb__item img')).toHaveCount(2);
  await dlg.getByRole('button', { name: 'Handy' }).click();
  await expect(page.locator('[data-vorschau-frame]')).toHaveCSS('width', /^(390|370)px$/);
  await dlg.getByRole('button', { name: 'Englisch' }).click();
  await expect(v.locator('html')).toHaveAttribute('lang', 'en');
  await expect(v.getByText('This post is only available in German so far.')).toBeVisible();
  // Großansicht in der Vorschau
  await v.locator('.nb__item').first().click();
  await expect(v.locator('dialog.lb')).toBeVisible();
  await expect(v.locator('.lb__n')).toHaveText('1 of 2');
  await dlg.getByRole('button', { name: 'Schließen' }).click();
  await expect(dlg).toBeHidden();
});

test('Editor mit Galerie ist barrierearm (axe)', async ({ page }) => {
  await editor(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/intern/news/bearbeiten/');
  await page.getByRole('button', { name: '+ Bilder' }).click();
  await page.locator('.fb-plus input[type=file]').setInputFiles(FOTOS.slice(0, 2));
  await expect(page.locator('.fb-bild.is-laedt')).toHaveCount(0);
  await page.getByRole('button', { name: '+ Hinweiskasten' }).click();
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const serious = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
});
