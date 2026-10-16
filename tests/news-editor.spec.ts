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
    await vs.locator('.ah__title').click();
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
  await expect(v.locator('.ah__img-frame img')).toHaveAttribute('style', /object-position: 50% (19|20|21)%/);
  await expect(v.locator('.nb--galerie .nb__item img')).toHaveCount(2);
  await dlg.getByRole('button', { name: 'Englisch' }).click();
  await expect(v.locator('html')).toHaveAttribute('lang', 'en');
  await dlg.getByRole('button', { name: 'Schließen' }).click();
  await expect(dlg).toBeHidden();
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
