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

/**
 * Meldet Pia (Presse) an und baut Supabase nach.
 * `zeile`: vorhandener Beitrag für ?id=n1 · `andere`: weitere Beiträge (Mediathek, Löschen)
 */
async function editor(page: Page, zeile?: Record<string, unknown>, andere: Record<string, unknown>[] = []): Promise<Mock> {
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
      if (req.method() === 'GET') return json(req.headers()['accept']?.includes('object') ? (zeile ?? null) : [...(zeile ? [zeile] : []), ...andere]);
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
const block = (page: Page, i: number) => page.locator('.ab-block').nth(i);
/** „Darstellung und Bildunterschrift“ eines Bilder-Abschnitts aufklappen */
const darstellung = async (page: Page) => {
  const d = page.locator('.fb-mehr').first();
  if (!(await d.getAttribute('open') !== null)) await d.locator('summary').click();
};

test('Beitrag mit Galerie, Ausschnitt und Hinweiskasten anlegen und veröffentlichen', async ({ page }) => {
  const m = await editor(page);
  await page.goto('/intern/news/bearbeiten/');
  await page.getByLabel('Titel', { exact: true }).fill('3 Jahre TANZPAKT in residence • Resümee und Rückschau');
  await page.getByLabel('Kurztext', { exact: true }).fill('Das dreijährige Kooperationsprogramm ist abgeschlossen.');
  await page.getByLabel('Text, Abschnitt 1', { exact: true }).fill('## TANZPAKT in residence\n\nIn den Jahren 2022–24 wurden 18 Residenzen ausgeschrieben.');

  // Bilder-Abschnitt: drei Fotos auf einmal
  await page.getByRole('button', { name: '+ Bilder', exact: true }).click();
  await page.locator('.fb-plus input[type=file]').setInputFiles(FOTOS);
  await expect(page.locator('.fb-bild')).toHaveCount(3);
  await expect(page.locator('.fb-bild.is-laedt')).toHaveCount(0);
  expect(m.hochgeladen).toHaveLength(3);
  // ruhig: keine Fotodetails, Darstellung eingeklappt mit Zusammenfassung
  await expect(detail(page)).toHaveCount(0);
  await expect(page.locator('.fb-mehr summary')).toContainText('Querformat · 3 pro Reihe');
  await expect(page.locator('.fb-raster')).toHaveAttribute('style', '--sp:3');

  // Bildbeschreibung ist eingeklappt und optional – hier für zwei Fotos
  for (const [i, alt] of [[0, 'Tänzerin in Blau'], [2, 'Duo in Rot']] as const) {
    await page.getByRole('button', { name: new RegExp(`^Foto ${i + 1} bearbeiten`) }).click();
    await detail(page).locator('.fb-alt summary').click();
    await detail(page).getByLabel('Bildbeschreibung', { exact: true }).fill(alt);
  }
  // Ausschnitt von Foto 3: Klick oben links ins Foto
  const bild = detail(page).locator('.fb-fokus img');
  const box = (await bild.boundingBox())!;
  await bild.click({ position: { x: box.width * 0.25, y: box.height * 0.1 } });
  await expect(page.locator('.fb-bild').nth(2).locator('img')).toHaveAttribute('style', /object-position: ?25% (9|10|11)%/);
  await detail(page).getByRole('button', { name: 'Foto 3 nach vorn' }).click();
  await expect(detail(page).locator('.fb-detail__h')).toHaveText('Foto 2 von 3');
  await detail(page).getByRole('button', { name: 'Fertig' }).click();
  await expect(detail(page)).toHaveCount(0);

  await darstellung(page);
  await page.getByLabel('Bildunterschrift', { exact: true }).fill('Die Teilnehmenden von »re-preview«');
  await page.getByLabel('Fotos von').fill('André Wirsig');

  // Hinweiskasten aus einem Baustein
  await page.locator('.ab-plus--ende').getByRole('button', { name: 'Förderhinweis TANZPAKT in residence' }).click();
  await expect(page.getByLabel('Hinweiskasten', { exact: true })).toHaveValue(/TANZPAKT Stadt-Land-Bund/);
  await expect(page.locator('.ab-block')).toHaveCount(3);

  await page.getByRole('button', { name: 'Veröffentlichen' }).click();
  await expect(page.locator('[data-msg]').filter({ hasText: 'Veröffentlicht.' })).toContainText('in 2–3 Minuten');
  expect(m.neubau).toBe(1);
  const body = m.gespeichert[0].body as string;
  const { bloecke } = abschnitte(body);
  expect(bloecke.map((b) => b.typ)).toEqual(['text', 'bilder', 'hinweis']);
  const g = bloecke[1];
  if (g.typ !== 'bilder') throw new Error('Bilder erwartet');
  expect(g).toMatchObject({ format: 'quer', spalten: 3, text: 'Die Teilnehmenden von »re-preview«', foto: 'André Wirsig' });
  expect(g.bilder.map((b) => b.alt)).toEqual(['Tänzerin in Blau', 'Duo in Rot', '']);
  expect(g.bilder.map((b) => b.fokus?.replace(/ (9|10|11)%$/, ' 10%'))).toEqual([undefined, '25% 10%', undefined]);
  // Uploads laufen parallel: welche Datei welches Foto ist, steht erst nach dem Hochladen fest
  expect(g.bilder.map((b) => b.datei).sort()).toEqual([...m.hochgeladen].sort());
  expect(m.gespeichert[0].body_en).toMatch(/Federal Government Commissioner/);
});

test('Bildbeschreibung ist keine Pflicht, die Checkliste empfiehlt sie nur', async ({ page }) => {
  const m = await editor(page);
  await page.goto('/intern/news/bearbeiten/');
  const check = page.locator('[data-check]');
  await expect(check.locator('summary')).toHaveText('Noch 2 Punkte zum Veröffentlichen');
  // Klick auf einen Punkt springt zum Feld
  await check.locator('summary').click();
  await check.getByRole('button', { name: 'Titel: fehlt' }).click();
  await expect(page.getByLabel('Titel', { exact: true })).toBeFocused();
  await page.getByLabel('Titel', { exact: true }).fill('Galerie ohne Beschreibung');
  await page.getByLabel('Kurztext', { exact: true }).fill('Kurz.');
  await page.getByRole('button', { name: '+ Bilder', exact: true }).click();
  await page.locator('.fb-plus input[type=file]').setInputFiles(FOTOS.slice(0, 2));
  await expect(page.locator('.fb-bild.is-laedt')).toHaveCount(0);
  await expect(check.locator('summary')).toHaveText('Bereit zum Veröffentlichen');
  await expect(check.getByRole('button', { name: 'Bildbeschreibung bei 2 Fotos: empfohlen' })).toBeVisible();
  await page.getByRole('button', { name: 'Veröffentlichen' }).click();
  await expect(page.locator('[data-msg]')).toContainText('Veröffentlicht.');
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
  // Vorlagen nur bei neuen Beiträgen
  await expect(page.locator('[data-vorlagen]')).toBeHidden();
  await page.locator('.ab-block').first().locator('.ab-en summary').click();
  await expect(page.getByLabel('Text, Abschnitt 1: Englisch')).toHaveValue('Introduction.');
  await page.getByRole('button', { name: /^Foto 2 bearbeiten/ }).click();
  await detail(page).locator('.fb-alt summary').click();
  await expect(detail(page).getByLabel('Bildbeschreibung Englisch')).toHaveValue('Tour');

  await page.getByRole('button', { name: 'Als Entwurf speichern' }).click();
  await expect(page.locator('[data-msg]')).toContainText('Entwurf gespeichert');
  expect(m.gespeichert[0].body).toBe(body);
  expect(m.gespeichert[0].body_en).toBe(body_en);
  expect(m.geloescht).toEqual([]);
});

test('Abschnitte verschieben (auch ziehen), einfügen und löschen', async ({ page, isMobile }) => {
  await editor(page);
  await page.goto('/intern/news/bearbeiten/');
  await page.getByLabel('Text, Abschnitt 1', { exact: true }).fill('Erster');
  await page.locator('.ab-plus--ende').getByRole('button', { name: '+ Hinweiskasten' }).click();
  await page.getByLabel('Hinweiskasten', { exact: true }).fill('Kasten');
  await page.getByRole('button', { name: '+ Abschnitt einfügen' }).click();
  await page.locator('.ab-plus:not(.ab-plus--ende) .ab-plus__menue').getByRole('button', { name: '+ Text' }).click();
  await expect(page.locator('.ab-block__typ')).toHaveText(['1 · Text', '2 · Text', '3 · Hinweiskasten']);
  await page.getByRole('button', { name: 'Abschnitt 3 nach oben' }).click();
  await expect(page.locator('.ab-block__typ')).toHaveText(['1 · Text', '2 · Hinweiskasten', '3 · Text']);
  if (!isMobile) {
    // Hinweiskasten am Griff ganz nach oben ziehen
    // (Ziehen mit echten Drag-Ereignissen, wie im Browser)
    await page.evaluate(() => {
      const [a, b] = document.querySelectorAll<HTMLElement>('.ab-block');
      const dt = new DataTransfer();
      const r = a.getBoundingClientRect();
      b.querySelector('.ab-block__griff')!.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
      a.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientY: r.top + 4 }));
      a.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientY: r.top + 4 }));
    });
    await expect(page.locator('.ab-block__typ')).toHaveText(['1 · Hinweiskasten', '2 · Text', '3 · Text']);
  }
  await page.getByRole('button', { name: 'Abschnitt 3 löschen' }).click();
  await expect(page.locator('.ab-block')).toHaveCount(2);
});

test('Link einfügen: Person aus dem Netzwerk suchen', async ({ page }) => {
  await editor(page);
  await page.goto('/intern/news/bearbeiten/');
  const ta = page.getByLabel('Text, Abschnitt 1', { exact: true });
  await ta.fill('Mit Rika im Studio.');
  await ta.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(4, 8));
  await block(page, 0).getByRole('button', { name: 'Link einfügen' }).first().click();
  const dlg = page.getByRole('dialog', { name: 'Link einfügen' });
  await expect(dlg.getByLabel('Text des Links')).toHaveValue('Rika');
  await dlg.getByLabel(/^Auf der Website suchen/).fill('yotsumoto');
  await dlg.getByRole('button', { name: /Person\s*Rika Yotsumoto/ }).click();
  await expect(ta).toHaveValue('Mit [Rika](/netzwerk/rika-yotsumoto/) im Studio.');
});

test('Vorlage „Rückblick“ legt Aufbau, Art und Kategorie an', async ({ page }) => {
  await editor(page);
  await page.goto('/intern/news/bearbeiten/');
  await page.getByRole('button', { name: /^Rückblick/ }).click();
  await expect(page.locator('input[name=kind][value=photo]')).toBeChecked();
  await expect(page.getByLabel('Kategorie')).toHaveValue('Rückblick');
  await expect(page.locator('.ab-block__typ')).toHaveText(['1 · Text', '2 · Bilder', '3 · Text', '4 · Bilder', '5 · Hinweiskasten']);
  await expect(page.getByLabel('Text, Abschnitt 1', { exact: true })).toHaveAttribute('placeholder', /Einleitung/);
  await expect(page.locator('[data-vorlagen]')).toBeHidden();
});

test('Fotos aus früheren Beiträgen (Mediathek) übernehmen', async ({ page }) => {
  await editor(page, undefined, [
    { title: 'Älterer Beitrag', body: '::: bilder\nbilder:\n  - datei: vorhanden/alt-1.jpg\n    alt: Probe\n:::', image_path: 'vorhanden/titel.jpg', image_alt: 'Titel' },
  ]);
  await page.goto('/intern/news/bearbeiten/');
  await page.getByRole('button', { name: '+ Bilder', exact: true }).click();
  await page.getByRole('button', { name: 'Foto aus früheren Beiträgen wählen' }).click();
  const dlg = page.getByRole('dialog', { name: 'Fotos aus früheren Beiträgen' });
  await expect(dlg.locator('.fb-mt__bild')).toHaveCount(2);
  await dlg.getByLabel('Probe').check();
  await dlg.getByRole('button', { name: '1 übernehmen' }).click();
  await expect(page.locator('.fb-bild')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Foto 1 bearbeiten: Probe' })).toBeVisible();
});

test('Ungespeicherte Änderungen werden auf dem Gerät gesichert und lassen sich wiederherstellen', async ({ page }) => {
  await editor(page);
  await page.goto('/intern/news/bearbeiten/');
  await page.getByLabel('Titel', { exact: true }).fill('Nicht verlieren');
  await page.getByLabel('Text, Abschnitt 1', { exact: true }).fill('Langer Text, der nicht verloren gehen darf.');
  await expect(page.locator('[data-sicher]')).toContainText('Auf diesem Gerät gesichert');
  await page.reload();
  const box = page.locator('[data-wieder]');
  await expect(box).toContainText('ungespeicherte Änderungen');
  await expect(page.getByLabel('Titel', { exact: true })).toHaveValue('');
  await box.getByRole('button', { name: 'Wiederherstellen' }).click();
  await expect(page.getByLabel('Titel', { exact: true })).toHaveValue('Nicht verlieren');
  await expect(page.getByLabel('Text, Abschnitt 1', { exact: true })).toHaveValue('Langer Text, der nicht verloren gehen darf.');
  // nach dem Speichern ist die Sicherung weg
  await page.getByLabel('Kurztext', { exact: true }).fill('Kurz.');
  await page.getByRole('button', { name: 'Als Entwurf speichern' }).click();
  await expect(page.locator('[data-msg]')).toContainText('Entwurf gespeichert');
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('tndd-news-sicherung')))).toEqual([]);
});

test('Datum in der Zukunft plant den Beitrag', async ({ page }) => {
  const m = await editor(page);
  await page.goto('/intern/news/bearbeiten/');
  await page.getByLabel('Titel', { exact: true }).fill('Kommt später');
  await page.getByLabel('Kurztext', { exact: true }).fill('Kurz.');
  await page.getByLabel('Datum', { exact: true }).fill('2099-11-03');
  await expect(page.locator('[data-date-hint]')).toContainText('erscheint am 3. November 2099 morgens');
  await page.getByRole('button', { name: 'Veröffentlichen' }).click();
  await expect(page.locator('[data-msg]')).toContainText('Geplant. Der Beitrag erscheint am 3. November 2099 morgens');
  await expect(page.locator('[data-status-badge]')).toHaveText('Geplant · 3. November 2099');
  expect(m.gespeichert[0]).toMatchObject({ status: 'veroeffentlicht', date: '2099-11-03' });
});

test('Vorschau daneben (Computer) und groß; Klick in die Vorschau springt in den Editor', async ({ page, isMobile }) => {
  await editor(page);
  await page.goto('/intern/news/bearbeiten/');
  await page.getByText('Mit Foto', { exact: true }).click();
  await page.getByLabel('Titel', { exact: true }).fill('Rückblick mit Fotos');
  await page.getByLabel('Kurztext', { exact: true }).fill('Drei Jahre in Bildern.');
  await page.locator('[data-photo-input]').setInputFiles(FOTOS[2]);
  await expect(page.locator('[data-photo-img]')).toBeVisible();
  const frame = page.locator('[data-photo-frame]');
  const fb = (await frame.boundingBox())!;
  await frame.click({ position: { x: fb.width * 0.5, y: fb.height * 0.2 } });
  await expect(page.locator('[data-photo-img]')).toHaveAttribute('style', /object-position: 50% (19|20|21)%/);
  await page.getByLabel('Text, Abschnitt 1', { exact: true }).fill('Erster Absatz.');
  await page.locator('.ab-plus--ende').getByRole('button', { name: '+ Bilder', exact: true }).click();
  await page.locator('.fb-plus input[type=file]').setInputFiles(FOTOS.slice(0, 2));
  await expect(page.locator('.fb-bild.is-laedt')).toHaveCount(0);

  const seite = page.locator('[data-vp]');
  if (isMobile) {
    await expect(seite).toBeHidden();
  } else {
    await expect(seite).toBeVisible();
    const vs = page.frameLocator('[data-vp] iframe');
    await expect(vs.getByRole('heading', { level: 1 })).toHaveText('Rückblick mit Fotos');
    await expect(vs.locator('.nb--galerie .nb__item img')).toHaveCount(2);
    // Klick auf den Text in der Vorschau: Editor springt zu Abschnitt 1
    await vs.getByText('Erster Absatz.').click();
    await expect(page.getByLabel('Text, Abschnitt 1', { exact: true })).toBeFocused();
    await vs.locator('.ah__title').click();
    await expect(page.getByLabel('Titel', { exact: true })).toBeFocused();
    // ausblenden bleibt gemerkt
    await page.getByRole('button', { name: 'Vorschau daneben ausblenden' }).click();
    await expect(seite).toBeHidden();
    await page.reload();
    await expect(page.locator('[data-vp]')).toBeHidden();
    await page.getByRole('button', { name: 'Vorschau daneben zeigen' }).click();
    await expect(page.locator('[data-vp]')).toBeVisible();
    return;
  }

  await page.getByRole('button', { name: 'Vorschau', exact: true }).click();
  const dlg = page.getByRole('dialog', { name: 'Vorschau' });
  await expect(dlg).toBeVisible();
  const v = page.frameLocator('[data-vorschau-frame]');
  await expect(v.getByRole('heading', { level: 1 })).toHaveText('Rückblick mit Fotos');
  await expect(v.locator('.ah__img-frame img')).toHaveAttribute('style', /object-position: 50% (19|20|21)%/);
  await expect(v.locator('.nb--galerie .nb__item img')).toHaveCount(2);
  await dlg.getByRole('button', { name: 'Englisch' }).click();
  await expect(v.locator('html')).toHaveAttribute('lang', 'en');
  await dlg.getByRole('button', { name: 'Schließen' }).click();
  await expect(dlg).toBeHidden();
});

test('Editor mit Galerie ist barrierearm (axe)', async ({ page }) => {
  await editor(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/intern/news/bearbeiten/');
  await page.getByRole('button', { name: '+ Bilder', exact: true }).click();
  await page.locator('.fb-plus input[type=file]').setInputFiles(FOTOS.slice(0, 2));
  await expect(page.locator('.fb-bild.is-laedt')).toHaveCount(0);
  await page.getByRole('button', { name: /^Foto 1 bearbeiten/ }).click();
  await page.locator('.ab-plus--ende').getByRole('button', { name: '+ Hinweiskasten' }).click();
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).exclude('iframe').analyze();
  const serious = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
});
