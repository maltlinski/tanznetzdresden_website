/**
 * News-Editor der Redaktion: Blöcke, Fotos, Mediathek, Veröffentlichen-Panel, Speichern und Vorschau.
 * Supabase ist nachgebaut (tests/redaktion-mock.ts).
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { abschnitte, medienAnwenden, zuMarkdown } from '../src/lib/news-bloecke';
import { supabase } from '../src/settings/supabase';
import { redaktion, FOTOS } from './redaktion-mock';

test.skip(!supabase.url || !supabase.anonKey, 'Supabase nicht eingetragen');

const heute = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
const detail = (page: Page) => page.locator('.fb-detail');
const typen = (page: Page) => page.locator('.ab-block__typ');
const ende = (page: Page, name: string) => page.locator('.ab-ende').getByRole('button', { name, exact: true }).click();
const panel = (page: Page) => page.locator('[data-pub]');
const msg = (page: Page) => page.locator('[data-msg]');
async function panelOeffnen(page: Page) {
  await page.locator('[data-pub-oeffnen]').click();
  await expect(panel(page)).toBeVisible();
}
const online = { id: 'n1', slug: 'online', status: 'veroeffentlicht', title: 'Schon online', teaser: 'Kurz.', category: 'Netzwerk', date: '2026-10-01', author: 'Pia', featured: false, body: 'Text.', body_en: null, facts: [], facts_en: [], image_focus: null, newsletter: false, updated_at: '2026-10-15T09:00:00Z' };

test('Beitrag mit Zwischentitel, Galerie, Zitat und Baustein veröffentlichen', async ({ page }) => {
  const m = await redaktion(page);
  await page.goto('/intern/news/bearbeiten/');
  await page.getByRole('radio', { name: 'Rückblick' }).check({ force: true });
  await page.getByLabel('Titel', { exact: true }).fill('3 Jahre TANZPAKT in residence • Resümee und Rückschau');
  await page.getByLabel('Teaser', { exact: true }).fill('Das dreijährige Kooperationsprogramm ist abgeschlossen.');
  await page.getByLabel('Absatz, Block 1', { exact: true }).fill('In den Jahren 2022–24 wurden 18 Residenzen ausgeschrieben.');
  await ende(page, '+ Zwischentitel');
  await page.getByLabel('Zwischentitel, Block 2', { exact: true }).fill('Die Residenzen');

  // Bild-Block: drei Fotos auf einmal → Galerie
  await ende(page, '+ Bild');
  await page.locator('.ab-block').nth(2).locator('input[type=file]').setInputFiles(FOTOS);
  await expect(page.locator('.fb-bild')).toHaveCount(3);
  await expect(page.locator('.fb-bild.is-laedt')).toHaveCount(0);
  expect(m.hochgeladen).toHaveLength(3);
  await expect(typen(page).nth(2)).toHaveText('Galerie · 3 Fotos');
  await expect(detail(page)).toHaveCount(0);
  await expect(page.locator('.fb-mehr summary')).toContainText('Querformat · 3 pro Reihe');

  // Bildbeschreibung ist freiwillig – hier für zwei Fotos
  for (const [i, alt] of [[0, 'Tänzerin in Blau'], [2, 'Duo in Rot']] as const) {
    await page.getByRole('button', { name: new RegExp(`^Foto ${i + 1} bearbeiten`) }).click();
    await detail(page).getByLabel('Bildbeschreibung (optional)').fill(alt);
  }
  // Ausschnitt von Foto 3: Klick oben links ins Foto
  const bild = detail(page).locator('.md-fokus img');
  const box = (await bild.boundingBox())!;
  await bild.click({ position: { x: box.width * 0.25, y: box.height * 0.1 } });
  await expect(page.locator('.fb-bild').nth(2).locator('img')).toHaveAttribute('style', /object-position: ?25% (9|10|11)%/);
  await detail(page).getByRole('button', { name: 'Foto 3 nach vorn' }).click();
  await expect(detail(page).locator('.fb-detail__h')).toHaveText('Foto 2 von 3');
  await detail(page).getByRole('button', { name: 'Fertig' }).click();
  await expect(detail(page)).toHaveCount(0);
  await page.getByLabel('Bildunterschrift', { exact: true }).fill('Die Teilnehmenden von »re-preview«');
  await page.getByLabel('Fotos von').fill('André Wirsig');

  await ende(page, '+ Zitat');
  await page.getByLabel('Zitat, Block 4', { exact: true }).fill('Wir wollen sehen, woran andere gerade arbeiten.');
  await page.getByLabel('Zitat, Block 4: Wer sagt das?').fill('Alina Lucifero · Projektleitung');
  await page.locator('.ab-ende').getByRole('button', { name: 'Förderhinweis TANZPAKT in residence' }).click();
  await expect(page.getByLabel('Hinweiskasten, Block 5', { exact: true })).toHaveValue(/TANZPAKT Stadt-Land-Bund/);

  await panelOeffnen(page);
  await expect(panel(page).getByRole('heading', { level: 2 })).toHaveText('3 Jahre TANZPAKT in residence • Resümee und Rückschau');
  await expect(panel(page).locator('[data-chronik]')).toContainText('Rückblick');
  await panel(page).getByRole('button', { name: 'Jetzt veröffentlichen' }).click();
  await expect(msg(page)).toContainText('Veröffentlicht. Der Beitrag ist in 2–3 Minuten online.');
  await expect(panel(page)).toBeHidden();
  await expect(page.locator('[data-status-badge]')).toHaveText('Online');
  expect(m.neubau).toBe(1);

  const gespeichert = m.gespeichert.at(-1)!;
  expect(gespeichert).toMatchObject({ status: 'veroeffentlicht', category: 'Rückblick', date: heute() });
  const { bloecke } = abschnitte(gespeichert.body as string);
  expect(bloecke.map((b) => b.typ)).toEqual(['text', 'zwischentitel', 'bilder', 'zitat', 'hinweis']);
  expect(bloecke[3]).toMatchObject({ de: 'Wir wollen sehen, woran andere gerade arbeiten.', wer: 'Alina Lucifero · Projektleitung' });
  const g = bloecke[2];
  if (g.typ !== 'bilder') throw new Error('Bilder erwartet');
  expect(g).toMatchObject({ format: 'quer', spalten: 3, text: 'Die Teilnehmenden von »re-preview«', foto: 'André Wirsig' });
  expect(g.bilder.map((b) => b.alt)).toEqual(['Tänzerin in Blau', 'Duo in Rot', '']);
  expect(g.bilder.map((b) => b.fokus?.replace(/ (9|10|11)%$/, ' 10%'))).toEqual([undefined, '25% 10%', undefined]);
  expect(g.bilder.map((b) => b.datei).sort()).toEqual([...m.hochgeladen].sort());
  expect(gespeichert.body_en).toMatch(/Federal Government Commissioner/);
  // Angaben der Fotos stehen in der Mediathek (gelten überall)
  expect(m.medien.get(g.bilder[0].datei)).toMatchObject({ alt: 'Tänzerin in Blau' });
});

test('Pflichtpunkte sperren das Veröffentlichen, die Bildbeschreibung ist nur empfohlen', async ({ page }) => {
  const m = await redaktion(page);
  await page.goto('/intern/news/bearbeiten/');
  await panelOeffnen(page);
  await expect(panel(page).locator('[data-pub-block]')).toBeVisible();
  await expect(panel(page).getByRole('button', { name: 'Jetzt veröffentlichen' })).toBeDisabled();
  // Beheben springt zum Feld
  await panel(page).getByRole('button', { name: 'Titel gesetzt: beheben' }).click();
  await expect(panel(page)).toBeHidden();
  await expect(page.getByLabel('Titel', { exact: true })).toBeFocused();
  await page.getByLabel('Titel', { exact: true }).fill('Galerie ohne Beschreibung');
  await page.getByLabel('Teaser', { exact: true }).fill('Kurz.');
  await ende(page, '+ Bild');
  await page.locator('.ab-block').nth(1).locator('input[type=file]').setInputFiles(FOTOS.slice(0, 2));
  await expect(page.locator('.fb-bild.is-laedt')).toHaveCount(0);
  await panelOeffnen(page);
  await expect(panel(page).locator('[data-pub-block]')).toBeHidden();
  const punkt = panel(page).locator('li').filter({ hasText: 'Bildbeschreibung fehlt bei 2 Fotos' });
  await expect(punkt).toContainText('Empfohlen');
  await panel(page).getByRole('button', { name: 'Jetzt veröffentlichen' }).click();
  await expect(msg(page)).toContainText('Veröffentlicht.');
  expect(m.gespeichert.at(-1)).toMatchObject({ status: 'veroeffentlicht' });
});

test('Emoji im Titel sperren das Veröffentlichen (Gestaltungsregel)', async ({ page }) => {
  await redaktion(page);
  await page.goto('/intern/news/bearbeiten/');
  await page.getByLabel('Titel', { exact: true }).fill('Sommerfest 🎉');
  await page.getByLabel('Teaser', { exact: true }).fill('Kurz.');
  await panelOeffnen(page);
  await expect(panel(page).locator('li').filter({ hasText: 'Keine Emoji' })).toContainText('Pflicht');
  await expect(panel(page).getByRole('button', { name: 'Jetzt veröffentlichen' })).toBeDisabled();
});

test('Vorhandener Beitrag: Blöcke mit Englisch, unverändert veröffentlicht bleibt der Text gleich', async ({ page }) => {
  const bloecke = abschnitte(
    'Einleitung.\n\n## Rundgang\n\n> Ein Satz, der bleibt.\n>\n> — Rika · KEEP UP\n\n::: bilder\nformat: hoch\nspalten: 4\nfoto: André Wirsig\nbilder:\n  - datei: vorhanden/a.jpg\n    alt: Foyer\n  - datei: vorhanden/b.jpg\n    alt: Rundgang\n    fokus: 40% 20%\n:::\n\n::: hinweis\nGefördert von …\n:::',
    'Introduction.\n\n## Tour\n\n> A sentence that stays.\n>\n> — Rika · KEEP UP\n\n::: bilder\nformat: hoch\nspalten: 4\nfoto: André Wirsig\nbilder:\n  - datei: vorhanden/a.jpg\n    alt: Foyer\n  - datei: vorhanden/b.jpg\n    alt: Tour\n    fokus: 40% 20%\n:::\n\n::: hinweis\nFunded by …\n:::',
  ).bloecke;
  const body = zuMarkdown(bloecke, 'de');
  const body_en = zuMarkdown(bloecke, 'en');
  const m = await redaktion(page, {
    zeile: { id: 'n1', slug: 'rueckblick', status: 'entwurf', title: 'Rückblick', teaser: 'Kurz.', category: 'Rückblick', date: '2025-04-28', author: 'Malte', featured: false, body, body_en, facts: [], facts_en: [], image_focus: null, updated_at: '2026-10-15T09:00:00Z' },
  });
  await page.goto('/intern/news/bearbeiten/?id=n1');
  await expect(typen(page)).toHaveText(['Absatz', 'Zwischentitel', 'Zitat', 'Galerie · 2 Fotos', 'Hinweiskasten']);
  await expect(page.locator('.fb-raster')).toHaveClass(/fb--hoch/);
  await expect(page.locator('[data-vorlagen]')).toBeHidden();
  await expect(page.locator('[data-sicher]')).toContainText('Gespeichert');
  await page.locator('.ab-block').first().locator('.ab-en summary').click();
  await expect(page.getByLabel('Absatz, Block 1: Englisch')).toHaveValue('Introduction.');
  await expect(page.getByLabel('Zitat, Block 3: Wer sagt das?')).toHaveValue('Rika · KEEP UP');
  await page.getByRole('button', { name: /^Foto 2 bearbeiten/ }).click();
  await expect(detail(page).getByLabel('Bildbeschreibung (Englisch)')).toHaveValue('Tour');

  // ohne Änderung speichert der Editor nichts von selbst
  await page.waitForTimeout(3000);
  expect(m.gespeichert).toHaveLength(0);
  await panelOeffnen(page);
  await panel(page).getByRole('button', { name: 'Jetzt veröffentlichen' }).click();
  await expect(msg(page)).toContainText('Veröffentlicht.');
  expect(m.gespeichert[0].body).toBe(body);
  expect(m.gespeichert[0].body_en).toBe(body_en);
  expect(m.geloescht).toEqual([]);
});

test('Blöcke verschieben (auch ziehen), einfügen und löschen', async ({ page, isMobile }) => {
  await redaktion(page);
  await page.goto('/intern/news/bearbeiten/');
  await page.getByLabel('Absatz, Block 1', { exact: true }).fill('Erster');
  await ende(page, '+ Hinweiskasten');
  await page.getByLabel('Hinweiskasten, Block 2', { exact: true }).fill('Kasten');
  await page.getByRole('button', { name: 'Block an Stelle 2 einfügen' }).click();
  await page.locator('.ab-plus .ab-plus__menue').getByRole('button', { name: '+ Zwischentitel' }).click();
  await expect(typen(page)).toHaveText(['Absatz', 'Zwischentitel', 'Hinweiskasten']);
  await expect(page.getByLabel('Zwischentitel, Block 2', { exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Block 3 nach oben' }).click();
  await expect(typen(page)).toHaveText(['Absatz', 'Hinweiskasten', 'Zwischentitel']);
  if (!isMobile) {
    // Hinweiskasten am Griff ganz nach oben ziehen (echte Drag-Ereignisse, wie im Browser)
    await page.evaluate(() => {
      const [a, b] = document.querySelectorAll<HTMLElement>('.ab-block');
      const dt = new DataTransfer();
      const r = a.getBoundingClientRect();
      b.querySelector('.ab-block__griff')!.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
      a.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientY: r.top + 4 }));
      a.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientY: r.top + 4 }));
    });
    await expect(typen(page)).toHaveText(['Hinweiskasten', 'Absatz', 'Zwischentitel']);
  }
  await page.getByRole('button', { name: 'Block 3 löschen' }).click();
  await expect(page.locator('.ab-block')).toHaveCount(2);
});

test('Link einfügen: Person aus dem Netzwerk suchen', async ({ page }) => {
  await redaktion(page);
  await page.goto('/intern/news/bearbeiten/');
  const ta = page.getByLabel('Absatz, Block 1', { exact: true });
  await ta.fill('Mit Rika im Studio.');
  await ta.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(4, 8));
  await page.locator('.ab-block').first().getByRole('button', { name: 'Link einfügen' }).first().click();
  const dlg = page.getByRole('dialog', { name: 'Link einfügen' });
  await expect(dlg.getByLabel('Text des Links')).toHaveValue('Rika');
  await dlg.getByLabel(/^Auf der Website suchen/).fill('yotsumoto');
  await dlg.getByRole('button', { name: /Person\s*Rika Yotsumoto/ }).click();
  await expect(ta).toHaveValue('Mit [Rika](/netzwerk/rika-yotsumoto/) im Studio.');
});

test('Vorlage „Rückblick“ legt Aufbau und Rubrik an', async ({ page }) => {
  await redaktion(page);
  await page.goto('/intern/news/bearbeiten/');
  await page.getByRole('button', { name: /^Rückblick/ }).click();
  await expect(page.getByRole('radio', { name: 'Rückblick' })).toBeChecked();
  await expect(typen(page)).toHaveText(['Absatz', 'Bild', 'Zwischentitel', 'Absatz', 'Bild', 'Hinweiskasten']);
  await expect(page.getByLabel('Absatz, Block 1', { exact: true })).toHaveAttribute('placeholder', /Einleitung/);
  await expect(page.locator('[data-vorlagen]')).toBeHidden();
});

test('Rubrik Ausschreibung zeigt die Frist, Stimme das Zitat für die Übersicht', async ({ page }) => {
  const m = await redaktion(page);
  await page.goto('/intern/news/bearbeiten/');
  await expect(page.getByLabel('Bewerbungsfrist')).toBeHidden();
  await page.locator('.ne-chip', { hasText: 'Ausschreibung' }).click();
  await page.getByLabel('Bewerbungsfrist').fill('2099-11-15');
  await page.getByLabel('Titel', { exact: true }).fill('Open Call');
  await page.getByLabel('Teaser', { exact: true }).fill('Bewerbt euch.');
  await page.locator('.ne-chip', { hasText: 'Stimme' }).click();
  // Frist steht schon drin: bleibt sichtbar, damit sie sich leeren lässt
  await expect(page.getByLabel('Bewerbungsfrist')).toBeVisible();
  await expect(page.getByLabel('Wer sagt das?')).toBeVisible();
  await page.getByLabel('Bewerbungsfrist').fill('');
  await page.locator('.ne-chip', { hasText: 'Ausschreibung' }).click();
  await page.getByLabel('Bewerbungsfrist').fill('2099-11-15');
  await panelOeffnen(page);
  await expect(panel(page).locator('li').filter({ hasText: 'Bewerbungsfrist eingetragen' })).not.toContainText('Pflicht');
  await panel(page).getByRole('button', { name: 'Jetzt veröffentlichen' }).click();
  await expect(msg(page)).toContainText('Veröffentlicht.');
  expect(m.gespeichert.at(-1)).toMatchObject({ category: 'Ausschreibung', deadline: '2099-11-15', quote_text: null });
});

test('Titelbild und Fotos aus der Mediathek; ihre Angaben gelten überall', async ({ page }) => {
  const m = await redaktion(page, {
    andere: [{ id: 'a1', title: 'Älterer Beitrag', status: 'veroeffentlicht', body: '', image_path: 'vorhanden/titel.jpg', image_alt: '' }],
    medien: [{ datei: 'vorhanden/titel.jpg', alt: 'Probe im Studio', alt_en: 'Rehearsal', credit: 'Kim Foto', focus: '30% 40%' }],
  });
  await page.goto('/intern/news/bearbeiten/');
  await page.locator('[data-cover-leer]').getByRole('button', { name: 'Aus Mediathek' }).click();
  const dlg = page.getByRole('dialog', { name: 'Bild wählen' });
  await dlg.getByRole('button', { name: 'Probe im Studio wählen' }).click();
  await expect(dlg).toBeHidden();
  await expect(page.locator('[data-cover-voll]')).toBeVisible();
  await expect(page.getByLabel('Bildbeschreibung (optional)')).toHaveValue('Probe im Studio');
  await expect(page.getByLabel('Fotonachweis')).toHaveValue('Kim Foto');
  await expect(page.locator('.md-zuschnitt img').first()).toHaveAttribute('style', /object-position: ?30% 40%/);

  // Bild-Block aus der Mediathek
  await ende(page, '+ Bild');
  await page.locator('.ab-block').nth(1).getByRole('button', { name: 'Mediathek' }).click();
  const viele = page.getByRole('dialog', { name: 'Bilder wählen' });
  await viele.getByLabel('Probe im Studio').check();
  await viele.getByRole('button', { name: '1 übernehmen' }).click();
  await expect(typen(page).nth(1)).toHaveText('Bild');
  await expect(page.locator('.ab-block').nth(1).getByLabel('Bildbeschreibung (optional)')).toHaveValue('Probe im Studio');
  await expect(page.locator('.ab-block').nth(1).getByLabel('Fotonachweis')).toHaveValue('Kim Foto');

  // Beschreibung ändern: gilt danach überall (Mediathek)
  await page.locator('[data-cover-voll]').getByLabel('Bildbeschreibung (optional)').fill('Probe im großen Studio');
  await page.getByLabel('Titel', { exact: true }).fill('Mit Mediathek');
  await page.getByLabel('Teaser', { exact: true }).fill('Kurz.');
  await panelOeffnen(page);
  await panel(page).getByRole('button', { name: 'Jetzt veröffentlichen' }).click();
  await expect(msg(page)).toContainText('Veröffentlicht.');
  expect(m.gespeichert.at(-1)).toMatchObject({ image_path: 'vorhanden/titel.jpg', image_alt: 'Probe im großen Studio', image_credit: 'Kim Foto', image_focus: '30% 40%' });
  expect(m.medien.get('vorhanden/titel.jpg')).toMatchObject({ credit: 'Kim Foto', focus: '30% 40%' });
  expect(m.hochgeladen).toEqual([]);
});

test('Entwürfe speichert der Editor selbst, sobald ein Titel da ist', async ({ page }) => {
  const m = await redaktion(page);
  await page.goto('/intern/news/bearbeiten/');
  await expect(page.locator('[data-sicher]')).toHaveText('Noch nicht gespeichert');
  await page.getByLabel('Titel', { exact: true }).fill('Speichert sich selbst');
  await expect.poll(() => m.gespeichert.length, { timeout: 8000 }).toBeGreaterThan(0);
  expect(m.gespeichert[0]).toMatchObject({ status: 'entwurf', title: 'Speichert sich selbst', slug: 'speichert-sich-selbst' });
  await expect(page.locator('[data-sicher]')).toContainText('Gespeichert ·');
  await expect(page).toHaveURL(/\?id=n1$/);
  expect(m.neubau).toBe(0);
});

test('Online-Beitrag: Änderungen bleiben auf dem Gerät, bis „Änderungen veröffentlichen“', async ({ page }) => {
  const m = await redaktion(page, { zeile: online });
  await page.goto('/intern/news/bearbeiten/?id=n1');
  await expect(page.locator('[data-pub-oeffnen]')).toHaveText('Aktualisieren');
  await page.getByLabel('Titel', { exact: true }).fill('Neuer Titel, noch nicht online');
  await expect(page.locator('[data-sicher]')).toContainText('auf diesem Gerät gesichert');
  await page.waitForTimeout(3000);
  expect(m.gespeichert).toHaveLength(0);

  await page.reload();
  const box = page.locator('[data-wieder]');
  await expect(box).toContainText('ungespeicherte Änderungen');
  await expect(page.getByLabel('Titel', { exact: true })).toHaveValue('Schon online');
  await box.getByRole('button', { name: 'Wiederherstellen' }).click();
  await expect(page.getByLabel('Titel', { exact: true })).toHaveValue('Neuer Titel, noch nicht online');
  await panelOeffnen(page);
  await panel(page).getByRole('button', { name: 'Änderungen veröffentlichen' }).click();
  await expect(msg(page)).toContainText('Veröffentlicht.');
  // das Datum bleibt beim Aktualisieren
  expect(m.gespeichert[0]).toMatchObject({ status: 'veroeffentlicht', title: 'Neuer Titel, noch nicht online', date: '2026-10-01' });
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('tndd-news-sicherung')))).toEqual([]);
});

test('Offline nehmen macht den Beitrag wieder zum Entwurf', async ({ page }) => {
  const m = await redaktion(page, { zeile: online });
  await page.goto('/intern/news/bearbeiten/?id=n1');
  await panelOeffnen(page);
  page.once('dialog', (d) => d.accept());
  await panel(page).getByRole('button', { name: 'Offline nehmen' }).click();
  await expect(msg(page)).toContainText('Offline genommen.');
  await expect(page.locator('[data-status-badge]')).toHaveText('Entwurf');
  expect(m.gespeichert[0]).toMatchObject({ status: 'entwurf' });
  expect(m.neubau).toBe(1);
});

test('Planen: Beitrag erscheint an einem späteren Tag', async ({ page }) => {
  const m = await redaktion(page);
  await page.goto('/intern/news/bearbeiten/');
  await page.getByLabel('Titel', { exact: true }).fill('Kommt später');
  await page.getByLabel('Teaser', { exact: true }).fill('Kurz.');
  await panelOeffnen(page);
  await panel(page).getByRole('button', { name: 'Planen' }).click();
  await panel(page).getByLabel('Erscheint am').fill('2099-11-03');
  await panel(page).getByRole('button', { name: 'Einplanen' }).click();
  await expect(msg(page)).toContainText('Eingeplant. Der Beitrag erscheint am 3. November 2099 morgens');
  await expect(page.locator('[data-status-badge]')).toHaveText(/^Geplant · 03\. Nov\.? 2099$/);
  expect(m.gespeichert.at(-1)).toMatchObject({ status: 'veroeffentlicht', date: '2099-11-03' });
});

test('Newsletter vormerken und Story-Bild herunterladen', async ({ page }) => {
  const m = await redaktion(page);
  await page.goto('/intern/news/bearbeiten/');
  await page.getByLabel('Titel', { exact: true }).fill('Mit Story');
  await page.getByLabel('Teaser', { exact: true }).fill('Kurz.');
  await page.locator('[data-photo-input]').first().setInputFiles(FOTOS[1]);
  await expect(page.locator('[data-cover-voll]')).toBeVisible();
  await panelOeffnen(page);
  await panel(page).getByText('Für den nächsten Newsletter vormerken').click();
  await panel(page).getByText('Instagram-Story als Bild herunterladen').click();
  const download = page.waitForEvent('download');
  await panel(page).getByRole('button', { name: 'Jetzt veröffentlichen' }).click();
  expect((await download).suggestedFilename()).toBe('story-mit-story.png');
  expect(m.gespeichert.at(-1)).toMatchObject({ newsletter: true });
});

test('Live-Vorschau daneben (Desktop) und groß; Klick in die Vorschau springt in den Editor', async ({ page, isMobile }) => {
  await redaktion(page);
  await page.goto('/intern/news/bearbeiten/');
  await page.getByLabel('Titel', { exact: true }).fill('Rückblick mit Fotos');
  await page.getByLabel('Teaser', { exact: true }).fill('Drei Jahre in Bildern.');
  await page.locator('[data-photo-input]').first().setInputFiles(FOTOS[2]);
  const fokus = page.locator('[data-cover-fokus] img');
  await expect(fokus).toBeVisible();
  const fb = (await fokus.boundingBox())!;
  await fokus.click({ position: { x: fb.width * 0.5, y: fb.height * 0.2 } });
  await page.getByLabel('Absatz, Block 1', { exact: true }).fill('Erster Absatz.');
  await ende(page, '+ Bild');
  await page.locator('.ab-block').nth(1).locator('input[type=file]').setInputFiles(FOTOS.slice(0, 2));
  await expect(page.locator('.fb-bild.is-laedt')).toHaveCount(0);

  const seite = page.locator('[data-vp]');
  if (!isMobile) {
    await expect(seite).toBeVisible();
    await expect(seite.locator('[data-vp-adresse]')).toContainText('/news/ruckblick-mit-fotos/');
    const vs = page.frameLocator('[data-vp] iframe');
    await expect(vs.getByRole('heading', { level: 1 })).toHaveText('Rückblick mit Fotos');
    await expect(vs.locator('.nb--galerie .nb__item img')).toHaveCount(2);
    await vs.getByText('Erster Absatz.').click();
    await expect(page.getByLabel('Absatz, Block 1', { exact: true })).toBeFocused();
    await vs.locator('.ak__titel').click();
    await expect(page.getByLabel('Titel', { exact: true })).toBeFocused();
    // ausblenden bleibt gemerkt
    await page.getByRole('button', { name: 'Vorschau aus' }).click();
    await expect(seite).toBeHidden();
    await page.reload();
    await expect(page.locator('[data-vp]')).toBeHidden();
    await page.getByRole('button', { name: 'Vorschau an' }).click();
    await expect(page.locator('[data-vp]')).toBeVisible();
    return;
  }

  await expect(seite).toBeHidden();
  await page.getByRole('button', { name: 'Vorschau', exact: true }).click();
  const dlg = page.getByRole('dialog', { name: 'Vorschau' });
  await expect(dlg).toBeVisible();
  const v = page.frameLocator('[data-vorschau-frame]');
  await expect(v.getByRole('heading', { level: 1 })).toHaveText('Rückblick mit Fotos');
  await expect(v.locator('.ak__img')).toHaveAttribute('style', /object-position: ?50% (19|20|21)%/);
  await expect(v.locator('.nb--galerie .nb__item img')).toHaveCount(2);
  await dlg.getByRole('button', { name: 'Englisch' }).click();
  await expect(v.locator('html')).toHaveAttribute('lang', 'en');
  await dlg.getByRole('button', { name: 'Schließen' }).click();
  await expect(dlg).toBeHidden();
});

test('Vorschau: lange Zitate werden kleiner gesetzt', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Vorschau neben dem Formular nur auf breiten Bildschirmen');
  await redaktion(page);
  await page.goto('/intern/news/bearbeiten/');
  await page.getByLabel('Titel', { exact: true }).fill('Zitate');
  await page.getByLabel('Absatz, Block 1', { exact: true }).fill('Erster Absatz.');
  await ende(page, '+ Zitat');
  const zitat = page.getByLabel('Zitat, Block 2', { exact: true });
  const vs = page.frameLocator('[data-vp] iframe');
  await zitat.fill('Kurz und knapp.');
  await expect(vs.locator('.ab__text blockquote')).not.toHaveClass(/zitat--/);
  await zitat.fill('Wir wollen sehen, woran andere gerade arbeiten. '.repeat(6).trim());
  await expect(vs.locator('.ab__text blockquote')).toHaveClass('zitat--l');
});

test('Kopfbereich: mit Titelbild eine Variante wählen, ohne Titelbild Farbfläche und Knoten', async ({ page, isMobile }) => {
  const m = await redaktion(page);
  await page.goto('/intern/news/bearbeiten/');
  await page.getByLabel('Titel', { exact: true }).fill('vision:danceable #6');
  await page.getByLabel('Teaser', { exact: true }).fill('Am 26. November zeigt die Kurzstückreihe neue Arbeiten.');
  await page.getByLabel('Absatz, Block 1', { exact: true }).fill('Text.');
  const kopf = page.locator('[data-kopf-feld]');
  // ohne Titelbild: Netz auf einer Farbfläche, der Knoten trägt die Angabe
  await expect(kopf.locator('[data-kopf-info]')).toHaveText('Ohne Titelbild · Netz');
  await kopf.getByRole('radio', { name: 'Cyan' }).check({ force: true });
  await kopf.getByLabel('Knoten · kleine Zeile').fill('Ausgabe');
  await kopf.getByLabel('Knoten · Angabe').fill('#6 · 26. November');
  if (!isMobile) {
    const vs = page.frameLocator('[data-vp] iframe');
    await expect(vs.locator('.ak--netz.ak--cyan')).toBeVisible();
    await expect(vs.locator('[data-knoten]')).toContainText('#6 · 26. November');
    // Klick in den Kopf der Vorschau springt zum Kopfbereich
    await vs.locator('.ak__netz').click({ position: { x: 5, y: 5 } });
    await expect(kopf.getByRole('radio', { name: 'Cyan' })).toBeFocused();
  }
  // Ausschreibung: der Knoten zeigt die Frist, die Felder entfallen
  await page.getByRole('radio', { name: 'Ausschreibung' }).check({ force: true });
  await expect(kopf.getByLabel('Knoten · kleine Zeile')).toBeHidden();
  await expect(kopf.getByText('Bei Ausschreibungen zeigt der Knoten automatisch den Countdown bis zur Frist.')).toBeVisible();
  await page.getByRole('radio', { name: 'Netzwerk' }).check({ force: true });

  // mit Titelbild: Querformat → Auto zeigt Vollbild; Split gewählt
  await page.locator('[data-photo-input]').first().setInputFiles(FOTOS[0]);
  await expect(kopf.locator('[data-kopf-info]')).toHaveText('Querformat · zeigt Vollbild');
  await kopf.getByRole('radio', { name: 'Split' }).check({ force: true });
  await expect(kopf.locator('[data-kopf-info]')).toHaveText('Querformat · zeigt Split');
  if (!isMobile) await expect(page.frameLocator('[data-vp] iframe').locator('.ak--split .ak__img')).toBeVisible();
  // Hochkant-Foto: Auto zeigt den Hochkant-Kopf (der nachgebaute Speicher liefert als drittes Foto duo-rot.jpg, hochkant)
  await kopf.getByRole('radio', { name: /^Auto/ }).check({ force: true });
  await page.locator('[data-photo-input]').nth(1).setInputFiles(FOTOS[1]);
  await expect.poll(() => m.hochgeladen.length).toBe(2);
  await page.locator('[data-photo-input]').nth(1).setInputFiles(FOTOS[2]);
  await expect(kopf.locator('[data-kopf-info]')).toHaveText('Hochkant-Foto · zeigt Hochkant');
  await expect(kopf.locator('[data-kopf-name="auto"]')).toHaveText('Auto · Hochkant');
  if (!isMobile) await expect(page.frameLocator('[data-vp] iframe').locator('.ak--hochkant')).toBeVisible();
  await kopf.getByRole('radio', { name: 'Typo' }).check({ force: true });

  await panelOeffnen(page);
  await panel(page).getByRole('button', { name: 'Jetzt veröffentlichen' }).click();
  await expect(panel(page)).toBeHidden();
  expect(m.gespeichert.at(-1)).toMatchObject({ hero: 'typo', hero_theme: 'cyan', node_kicker: 'Ausgabe', node_value: '#6 · 26. November' });
});

test('Eckdaten stehen offen im Editor und oben im Beitrag', async ({ page, isMobile }) => {
  const m = await redaktion(page);
  await page.goto('/intern/news/bearbeiten/');
  await page.getByLabel('Titel', { exact: true }).fill('Studio Round #9');
  await page.getByRole('button', { name: '+ Eckdatum' }).click();
  await page.locator('[data-fakten]').getByLabel('Bezeichnung').fill('Wann');
  await page.locator('[data-fakten]').getByLabel('Angabe').fill('Do · 15. Oktober · 19:30 Uhr');
  if (!isMobile) await expect(page.frameLocator('[data-vp] iframe').locator('.ab__fakten')).toContainText('Do · 15. Oktober · 19:30 Uhr');
  await page.getByRole('button', { name: '+ Eckdatum' }).click();
  await page.locator('[data-fakten] .ne-fact').nth(1).getByRole('button', { name: 'Löschen' }).click();
  await expect(page.locator('[data-fakten] .ne-fact')).toHaveCount(1);
  await expect.poll(() => m.gespeichert.at(-1)?.facts, { timeout: 8000 }).toEqual([{ label: 'Wann', value: 'Do · 15. Oktober · 19:30 Uhr' }]);
});

test('Bildpaar, Bildstrecke und Bild & Text: Blöcke anlegen, Checkliste, Vorschau', async ({ page, isMobile }) => {
  const m = await redaktion(page);
  await page.goto('/intern/news/bearbeiten/');
  await page.getByLabel('Titel', { exact: true }).fill('Welttanztag 2026');
  await page.getByLabel('Teaser', { exact: true }).fill('Die Stadt als Bühne.');
  await page.getByLabel('Absatz, Block 1', { exact: true }).fill('Zum Welttanztag gehen wir raus.');

  // Bildpaar: genau zwei Fotos, jedes mit eigener Unterschrift
  await ende(page, '+ Bildpaar');
  const paar = page.locator('.ab-block').nth(1);
  await expect(typen(page).nth(1)).toHaveText('Bildpaar');
  await expect(paar.getByText('Ein Bildpaar braucht genau 2 Bilder.')).toBeVisible();
  await paar.locator('input[type=file]').setInputFiles(FOTOS);
  await expect(page.locator('[data-msg]')).toContainText('Ein Bildpaar hat genau 2 Bilder.');
  await expect(paar.locator('.fm-kachel')).toHaveCount(2);
  await expect(paar.locator('.fm-kachel .is-laedt')).toHaveCount(0);
  await expect(paar.locator('.fm-plus')).toHaveCount(0);
  await paar.getByLabel('Foto 1: Bildunterschrift', { exact: true }).fill('Duo in Blau.');
  await paar.getByLabel('Foto 2: Bildbeschreibung', { exact: true }).fill('Tänzerin im Sprung');

  // Bildstrecke: unter drei Fotos unvollständig
  await ende(page, '+ Bildstrecke');
  const strecke = page.locator('.ab-block').nth(2);
  await strecke.getByPlaceholder('Titel der Bildstrecke').fill('Der Tag in Bildern');
  await strecke.locator('input[type=file]').setInputFiles(FOTOS.slice(0, 2));
  await expect(strecke.locator('.fm-kachel')).toHaveCount(2);
  await expect(strecke.getByText('Mindestens 3, höchstens 12 Bilder.')).toBeVisible();

  // Bild & Text: zwei Schritte; ohne Bild und Text unvollständig
  await ende(page, '+ Bild & Text');
  const schritte = page.locator('.ab-block').nth(3);
  await expect(schritte.locator('.fs-schritt')).toHaveCount(2);
  await schritte.getByPlaceholder('Titel, z. B. Ein Tag in der Stadt').fill('Ein Tag in der Stadt');
  await schritte.locator('.fs-schritt').nth(0).locator('input[type=file]').setInputFiles(FOTOS[0]);
  await schritte.getByLabel('Schritt 1: Titel', { exact: true }).fill('Raus aus dem Studio');
  await schritte.getByLabel('Schritt 1: Text', { exact: true }).fill('Getanzt wird dort, wo Menschen unterwegs sind.');

  await panelOeffnen(page);
  const unvollstaendig = panel(page).locator('li', { hasText: 'Keine leeren oder unvollständigen Blöcke' });
  await expect(unvollstaendig).toHaveAttribute('data-zustand', 'tipp');
  await unvollstaendig.getByRole('button', { name: /beheben/ }).click();
  await expect(strecke).toHaveClass(/is-markiert/);

  await strecke.locator('input[type=file]').setInputFiles(FOTOS[2]);
  await expect(strecke.locator('.fm-kachel')).toHaveCount(3);
  await expect(typen(page).nth(2)).toHaveText('Bildstrecke · 3 Bilder');
  await schritte.locator('.fs-schritt').nth(1).locator('input[type=file]').setInputFiles(FOTOS[1]);
  await expect(schritte.locator('.fs-bild')).toHaveCount(2);
  await schritte.getByLabel('Schritt 2: Text', { exact: true }).fill('Kein Podest, kein Eintritt.');

  if (!isMobile) {
    const vs = page.frameLocator('[data-vp] iframe');
    await expect(vs.locator('.nb--paar .nb__item')).toHaveCount(2);
    await expect(vs.locator('.nb--paar figcaption')).toContainText('Abb. 01Duo in Blau.');
    await expect(vs.locator('.nb--strecke .nb__titel')).toHaveText('Der Tag in Bildern');
    await expect(vs.locator('.nb--strecke .nb__item')).toHaveCount(3);
    await expect(vs.locator('.ns__titel')).toHaveText('Ein Tag in der Stadt');
    await expect(vs.locator('.ns__schritt')).toHaveCount(2);
  }

  await panelOeffnen(page);
  await expect(unvollstaendig).toHaveAttribute('data-zustand', 'ok');
  await panel(page).getByRole('button', { name: 'Jetzt veröffentlichen' }).click();
  await expect(panel(page)).toBeHidden();
  const body = m.gespeichert.at(-1)!.body as string;
  const { bloecke } = abschnitte(body);
  expect(bloecke.map((b) => b.typ)).toEqual(['text', 'bilder', 'bilder', 'schritte']);
  expect(bloecke[1]).toMatchObject({ darstellung: 'paar', bilder: [{ text: 'Duo in Blau.' }, { alt: 'Tänzerin im Sprung' }] });
  expect(bloecke[2]).toMatchObject({ darstellung: 'strecke', titel: 'Der Tag in Bildern' });
  expect(bloecke[3]).toMatchObject({ titel: 'Ein Tag in der Stadt', schritte: [{ titel: 'Raus aus dem Studio' }, { text: 'Kein Podest, kein Eintritt.' }] });
  // Bildbeschreibung aus dem Bildpaar steht in der Mediathek
  const zweites = (bloecke[1] as { bilder: { datei: string }[] }).bilder[1].datei;
  expect(m.medien.get(zweites)).toMatchObject({ alt: 'Tänzerin im Sprung' });
});

test('Ein Foto: Breite Textbreite, weit, randlos oder neben dem Text', async ({ page }) => {
  const m = await redaktion(page);
  await page.goto('/intern/news/bearbeiten/');
  await page.getByLabel('Titel', { exact: true }).fill('Ein Foto');
  await ende(page, '+ Bild');
  const block = page.locator('.ab-block').nth(1);
  await block.locator('input[type=file]').setInputFiles(FOTOS[0]);
  const breite = block.getByRole('group', { name: 'Breite' });
  await expect(breite.getByRole('button', { name: 'Weit' })).toHaveAttribute('aria-pressed', 'true');
  await breite.getByRole('button', { name: 'Randlos' }).click();
  await expect(breite.getByRole('button', { name: 'Randlos' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => (m.gespeichert.at(-1)?.body as string | undefined) ?? '', { timeout: 8000 }).toContain('breite: randlos');
  await breite.getByRole('button', { name: 'Neben dem Text' }).click();
  await expect.poll(() => (m.gespeichert.at(-1)?.body as string | undefined) ?? '', { timeout: 8000 }).toContain('darstellung: neben');
});

test('Editor und Veröffentlichen-Panel sind barrierearm (axe)', async ({ page }) => {
  await redaktion(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/intern/news/bearbeiten/');
  await ende(page, '+ Bild');
  await page.locator('.ab-block').nth(1).locator('input[type=file]').setInputFiles(FOTOS.slice(0, 2));
  await expect(page.locator('.fb-bild.is-laedt')).toHaveCount(0);
  await page.getByRole('button', { name: /^Foto 1 bearbeiten/ }).click();
  await ende(page, '+ Zitat');
  const pruefen = async () => {
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).exclude('iframe').analyze();
    return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`);
  };
  expect(await pruefen()).toEqual([]);
  await panelOeffnen(page);
  expect(await pruefen()).toEqual([]);
});

test('Format: Zwischentitel und Zitat sind eigene Blöcke; Mediathek-Angaben gelten beim Build', () => {
  const md = 'Einleitung.\n## Zwischentitel A\n\n> Ein Satz.\n>\n> — Name · Rolle\n\n::: bilder\nbilder:\n  - datei: 2026/a.jpg\n    alt: Alt\n:::';
  const { bloecke } = abschnitte(md);
  expect(bloecke.map((b) => b.typ)).toEqual(['text', 'zwischentitel', 'zitat', 'bilder']);
  expect(bloecke[2]).toMatchObject({ de: 'Ein Satz.', wer: 'Name · Rolle' });
  const neu = zuMarkdown(bloecke);
  expect(zuMarkdown(abschnitte(neu).bloecke)).toBe(neu);
  const medien = new Map([['2026/a.jpg', { alt: 'Neu', alt_en: 'New', credit: 'Kim', focus: '20% 30%' }]]);
  const de = abschnitte(medienAnwenden(neu, medien)).bloecke[3];
  expect(de).toMatchObject({ foto: 'Kim', bilder: [{ datei: '2026/a.jpg', alt: 'Neu', fokus: '20% 30%' }] });
  expect(medienAnwenden(neu, medien, 'en')).toContain('alt: New');
  expect(medienAnwenden(neu, new Map())).toBe(neu);
});

test('Format: Bildpaar, Bildstrecke und Bild & Text mit Englisch bleiben beim Hin und Her gleich', () => {
  const de = [
    '::: bilder\ndarstellung: paar\nbilder:\n  - datei: 2026/a.jpg\n    alt: A\n    text: Erstes\n  - datei: 2026/b.jpg\n    alt: B\n:::',
    '::: bilder\ndarstellung: strecke\ntitel: Der Tag\nbilder:\n  - datei: 2026/a.jpg\n    alt: A\n  - datei: 2026/b.jpg\n    alt: B\n  - datei: 2026/c.jpg\n    alt: C\n:::',
    '::: schritte\ntitel: Ein Tag\nschritte:\n  - datei: 2026/a.jpg\n    alt: A\n    titel: Raus\n    text: Zum Welttanztag.\n  - datei: ""\n    titel: Noch ohne Bild\n:::',
    '::: bilder\nbreite: randlos\nformat: original\nbilder:\n  - datei: 2026/a.jpg\n    alt: A\n:::',
  ].join('\n\n');
  const en = de.replace('text: Erstes', 'text: First').replace('titel: Der Tag', 'titel: The day').replace('titel: Raus', 'titel: Out');
  const { bloecke, passend } = abschnitte(de, en);
  expect(passend).toBe(true);
  expect(bloecke.map((b) => b.typ)).toEqual(['bilder', 'bilder', 'schritte', 'bilder']);
  expect(bloecke[0]).toMatchObject({ darstellung: 'paar', bilder: [{ text: 'Erstes', text_en: 'First' }, { alt: 'B' }] });
  expect(bloecke[1]).toMatchObject({ darstellung: 'strecke', titel: 'Der Tag', titel_en: 'The day' });
  expect(bloecke[2]).toMatchObject({ typ: 'schritte', schritte: [{ titel: 'Raus', titel_en: 'Out' }, { datei: '', titel: 'Noch ohne Bild' }] });
  expect(bloecke[3]).toMatchObject({ breite: 'randlos' });
  expect(zuMarkdown(bloecke, 'de')).toBe(zuMarkdown(abschnitte(zuMarkdown(bloecke, 'de')).bloecke, 'de'));
  expect(zuMarkdown(bloecke, 'en')).toContain('titel: The day');
  // Mediathek: Nachweis je Foto, wenn der Abschnitt keinen eigenen hat
  const medien = new Map([['2026/a.jpg', { alt: 'Neu', alt_en: '', credit: 'Kim', focus: null }], ['2026/b.jpg', { alt: '', alt_en: '', credit: 'Lea', focus: null }]]);
  const mit = abschnitte(medienAnwenden(zuMarkdown(bloecke), medien)).bloecke;
  expect(mit[0]).toMatchObject({ foto: 'Kim, Lea', bilder: [{ foto: 'Kim' }, { foto: 'Lea' }] });
  expect(mit[2]).toMatchObject({ schritte: [{ alt: 'Neu', foto: 'Kim' }, { titel: 'Noch ohne Bild' }] });
});
