/**
 * Profilseite (Netzwerk) nach Entwurf, „Mein Profil“ mit Galerie und Arbeiten, Freigabe von Galeriefotos.
 * Die öffentliche Seite wird mit der Demo-Ansicht gefüllt (personen.yaml enthält keine vollen Profile).
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { supabase } from '../src/settings/supabase';
import { redaktion, FOTOS } from './redaktion-mock';
import { pitchWoerter } from '../src/lib/profil-ansicht';

const ohneBanner = (page: Page) =>
  page.addInitScript(() => localStorage.setItem('tndd-consent', JSON.stringify({ v: 1, date: '2026-10-15T00:00:00Z', categories: { notwendig: true } })));

test.describe('öffentliche Profilseite', () => {
  test('ohne Angaben: nur was da ist, ehrlich leer', async ({ page }) => {
    await ohneBanner(page);
    await page.goto('/netzwerk/alina-lucifero/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Alina\s*Lucifero/);
    await expect(page.getByText('Vorstand', { exact: true })).toBeVisible();
    const leiste = page.getByRole('navigation', { name: 'Abschnitte' });
    await expect(leiste.getByRole('link')).toHaveText(['Über']);
    await expect(page.locator('#pitch:visible, #galerie:visible, #arbeiten:visible, #kontakt:visible')).toHaveCount(0);
    await expect(page.getByText('Dieses Profil wird gerade aufgebaut.')).toBeVisible();
  });

  test('Demo-Ansicht zeigt alle Abschnitte', async ({ page }) => {
    await ohneBanner(page);
    await page.goto('/netzwerk/alina-lucifero/?demo=1');
    const leiste = page.getByRole('navigation', { name: 'Abschnitte' });
    await expect(leiste.getByRole('link')).toHaveText(['Pitch', 'Galerie', 'Über', 'Arbeiten']);
    await expect(page.locator('#pitch .ppitch__satz')).toContainText('Beispiel – ');
    await expect(page.getByRole('heading', { name: /Stücke und\s*Projekte/ })).toBeVisible();
  });

  test('Galerie: Vollbild mit Blättern, Esc schließt und Fokus kehrt zurück', async ({ page }) => {
    await ohneBanner(page);
    await page.goto('/netzwerk/alina-lucifero/?demo=1');
    const zweites = page.locator('#galerie [data-lb-oeffnen="1"]').first();
    await zweites.scrollIntoViewIfNeeded();
    await zweites.click();
    const dlg = page.getByRole('dialog', { name: 'Fotos' });
    await expect(dlg).toBeVisible();
    await expect(dlg.locator('[data-lb-nr]')).toHaveText('02 / 05');
    await page.keyboard.press('ArrowRight');
    await expect(dlg.locator('[data-lb-nr]')).toHaveText('03 / 05');
    await dlg.getByRole('button', { name: 'Vorheriges Foto' }).click();
    await dlg.getByRole('button', { name: 'Vorheriges Foto' }).click();
    await expect(dlg.locator('[data-lb-nr]')).toHaveText('01 / 05');
    await expect(dlg.getByRole('button', { name: 'Foto 01' })).toHaveAttribute('aria-current', 'true');
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();
    await expect(zweites).toBeFocused();
  });

  test('Pitch: hervorgehoben ab dem Wort nach dem Doppelpunkt, sonst die letzten drei Wörter (Entwurf v3)', () => {
    const hi = (s: string) => pitchWoerter(s).filter((w) => w.hi).map((w) => w.text).join(' ');
    expect(hi('Ich bringe Tanz an Orte: Höfe, Haltestellen, leere Läden.')).toBe('Höfe, Haltestellen, leere Läden.');
    expect(hi('Ich arbeite mit Gewicht, Vertrauen und Zufall')).toBe('Vertrauen und Zufall');
    expect(hi('Tanz – überall und für alle')).toBe('und für alle'); // Gedankenstrich zählt nicht
  });

  test('Name über dem Porträt: voll links vom Bildrand, darüber mit getauschten Farben; Angaben neben „Über“', async ({ page, isMobile }) => {
    await ohneBanner(page);
    await page.goto('/netzwerk/alina-lucifero/?demo=1');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^\s*Alina\s*Lucifero\s*$/);
    await expect(page.locator('[data-name-licht]')).toHaveAttribute('aria-hidden', 'true');
    const clip = () => page.evaluate(() => ['[data-name-voll]', '[data-name-licht]'].map((s) => document.querySelector<HTMLElement>(s)!.style.clipPath));
    if (isMobile) {
      // Foto steht über dem Namen: nichts abschneiden
      expect(await clip()).toEqual(['', '']);
    } else {
      await expect.poll(async () => (await clip()).every((c) => c.startsWith('polygon('))).toBe(true);
    }
    // Tausch (Entwurf v3): über dem Foto Vorname magenta, Nachname weiß
    const farben = () => page.evaluate(() => ['.ph__vor', '.ph__nach'].map((s) => getComputedStyle(document.querySelector(`[data-name-licht] ${s}`)!).color));
    // nach dem Einwischen des Namens (Intro)
    await expect.poll(async () => (await farben())[1], { timeout: 5000 }).toBe('rgb(255, 255, 255)');
    expect((await farben())[0]).toMatch(/^rgb\(2\d\d, \d+, \d+\)$/); // Magenta
    const seite = page.locator('#ueber .pueber__seite');
    await expect(seite.getByText('Ausbildung')).toBeVisible();
  });

  test('Abschnittsleiste markiert den aktuellen Abschnitt', async ({ page }) => {
    await ohneBanner(page);
    await page.goto('/netzwerk/alina-lucifero/?demo=1');
    await page.locator('#arbeiten').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-pbar-link="arbeiten"]')).toHaveAttribute('aria-current', 'location');
    await expect(page.locator('[data-pbar-link="galerie"]')).not.toHaveAttribute('aria-current');
  });

  test('englische Seite', async ({ page }) => {
    await ohneBanner(page);
    await page.goto('/en/network/alina-lucifero/?demo=1');
    await expect(page.getByRole('navigation', { name: 'Sections' }).getByRole('link')).toHaveText(['Pitch', 'Gallery', 'About', 'Work']);
    await expect(page.getByRole('heading', { name: 'About Alina' })).toBeVisible();
  });

  for (const pfad of ['/netzwerk/alina-lucifero/?demo=1', '/netzwerk/alina-lucifero/']) {
    test(`${pfad} ist barrierearm (axe) und ohne seitliches Scrollen`, async ({ page }) => {
      await ohneBanner(page);
      await page.goto(pfad);
      // einmal durchscrollen, damit Wörter, Reveal und Filmstreifen ihren Endzustand haben
      const hoehe = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < hoehe; y += 600) {
        await page.evaluate((yy) => scrollTo(0, yy), y);
        await page.waitForTimeout(60);
      }
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(1600);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      const serious = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
    });
  }
});

test.describe('Mein Profil und Freigaben', () => {
  test.skip(!supabase.url || !supabase.anonKey, 'Supabase nicht eingetragen');

  const profil = {
    slug: 'pia-presse', public_listing: true, verified: true, bio: 'Text', profession: 'Tänzerin', base: 'Dresden', pitch: null, pitch_en: null,
    profession_en: null, open_for: ['workshops'], works: [{ year: '2025', title: 'Kreide', place: 'TENZA' }], education: null, techniques: null,
    languages: null, regions: null, height: null, available: null, public_email: null, gallery_layout: 'mosaik',
    gallery: [{ path: 'u1/galerie-alt.jpg', caption: 'Probe', frei: true }],
  };

  test('neue Felder, Galerie hochladen und Arbeiten speichern', async ({ page }) => {
    const m = await redaktion(page, { profil });
    await page.goto('/intern/profil/');
    await expect(page.getByLabel('Tätigkeit optional')).toHaveValue('Tänzerin');
    await expect(page.locator('[data-info-galerie]')).toHaveText('· 1 Foto');
    await expect(page.locator('[data-info-arbeiten]')).toHaveText('· 1 Eintrag');

    await page.locator('summary', { hasText: 'Galerie' }).click();
    await expect(page.locator('.pg__status')).toHaveText('Auf der Website');
    await expect(page.getByLabel('Mosaik', { exact: false })).toBeChecked();
    await page.locator('#p-galerie-datei').setInputFiles(FOTOS.slice(0, 2));
    await expect(page.locator('.pg__el')).toHaveCount(3);
    await expect(page.locator('.pg__status').nth(1)).toHaveText('Wartet auf Freigabe');
    expect(m.hochgeladen).toHaveLength(2);
    expect(m.hochgeladen[0]).toMatch(/^u1\/galerie-\d+-0\.jpg$/);
    await expect(page.locator('[data-info-galerie]')).toHaveText('· 3 Fotos, 2 warten auf Freigabe');
    await page.getByLabel('Bildunterschrift Foto 2', { exact: true }).fill('Im Studio');

    await page.locator('summary', { hasText: 'Arbeiten' }).click();
    await page.getByRole('button', { name: '+ Arbeit hinzufügen' }).click();
    await page.getByLabel('Arbeit 2: Jahr').fill('2026');
    await page.getByLabel('Arbeit 2: Titel').fill('Echo, draußen');
    await page.locator('summary', { hasText: 'Kontakt und Video' }).click();
    await page.getByLabel('Öffentliche E-Mail-Adresse optional').fill('pia@example.org');
    await page.getByLabel('Kooperationen').check();
    await page.getByLabel('In einem Satz optional').fill('Ich tanze: draußen.');
    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.locator('[data-profile-msg]')).toHaveText('Gespeichert.');

    const letzte = m.profilGespeichert.at(-1)!;
    expect(letzte).toMatchObject({
      pitch: 'Ich tanze: draußen.',
      public_email: 'pia@example.org',
      open_for: ['kooperationen', 'workshops'],
      gallery_layout: 'mosaik',
      works: [{ year: '2025', title: 'Kreide', place: 'TENZA' }, { year: '2026', title: 'Echo, draußen' }],
    });
    expect((letzte.gallery as { caption: string }[]).map((g) => g.caption)).toEqual(['Probe', 'Im Studio', '']);

    // Foto entfernen löscht auch die Datei
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Foto 3 entfernen' }).click();
    await expect(page.locator('.pg__el')).toHaveCount(2);
    await expect.poll(() => m.geloescht.at(-1)).toEqual([m.hochgeladen[1]]);
  });

  test('Vorschau neben dem Formular: zeigt den Stand beim Tippen, auch neue Fotos und Einträge', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await redaktion(page, { profil: { ...profil, display_name: 'Pia Presse', pitch: 'Ich tanze: draußen.', tags: ['Floorwork'], instagram: 'pia' } });
    await page.goto('/intern/profil/');
    const vs = page.locator('[data-vorschau]');
    await expect(vs).toBeVisible();
    const f = page.frameLocator('[data-vorschau] iframe');
    await expect(f.locator('h1 .ph__vor')).toHaveText('Pia');
    await expect(f.locator('h1 .ph__nach')).toHaveText('Presse');
    await expect(f.locator('.ph__meta')).toHaveText('Tänzerin · Dresden');
    await expect(f.locator('.ppitch__w--hi')).toHaveText(['draußen.']);
    await expect(f.locator('#galerie')).toBeHidden(); // ein Galeriefoto steht ohne Porträt oben
    await expect(f.locator('.parb__titel')).toHaveText(['Kreide']);
    await expect(f.locator('#kontakt')).toBeVisible();
    await expect(f.locator('.pkontakt__offen li')).toHaveText(['Workshops geben']);

    // Tippen ändert die Vorschau, noch bevor gespeichert ist; die Vorschau springt zur Stelle
    await page.getByLabel('Name', { exact: true }).fill('Pia Maria Presse');
    await expect(f.locator('h1 .ph__nach')).toHaveText('Maria Presse');
    await page.getByLabel('Kurzbio', { exact: true }).fill('Erster Absatz.\n\nZweiter Absatz.');
    await expect(f.locator('.pueber__bio p')).toHaveText(['Erster Absatz.', 'Zweiter Absatz.']);
    await expect(f.locator('#ueber-h')).toContainText('Pia');
    await expect(f.locator('[data-vs-fokus]')).toHaveId('ueber');
    await page.getByLabel('In einem Satz optional').fill('');
    await expect(f.locator('#pitch')).toBeHidden();
    await expect(f.locator('.pfakten')).toContainText('Floorwork'); // ohne Satz stehen die Schwerpunkte bei den Angaben

    // Neue Fotos und Arbeiten erscheinen sofort, auch das Raster
    await page.locator('summary', { hasText: 'Galerie' }).click();
    await page.locator('#p-galerie-datei').setInputFiles(FOTOS.slice(0, 2));
    await expect(page.locator('.pg__el')).toHaveCount(3);
    await expect(f.locator('#galerie')).toBeVisible();
    await expect(f.locator('.pgrid__el')).toHaveCount(2);
    await expect(f.locator('.pgal__n')).toContainText('03');
    await page.getByLabel('Raster', { exact: false }).check();
    await expect(f.locator('.pgrid--raster .pgrid__el--raster')).toHaveCount(2);
    await page.getByLabel('Filmstreifen', { exact: false }).check();
    await expect(f.locator('.pstrip__el')).toHaveCount(2);
    await page.locator('summary', { hasText: 'Arbeiten' }).click();
    await page.getByRole('button', { name: '+ Arbeit hinzufügen' }).click();
    await page.getByLabel('Arbeit 2: Jahr').fill('2026');
    await page.getByLabel('Arbeit 2: Titel').fill('Echo, draußen');
    await expect(f.locator('.parb__titel')).toHaveText(['Echo, draußen', 'Kreide']);
    await expect(f.locator('.parb__n')).toContainText('02');

    // Englische Felder: Vorschau wechselt auf Englisch
    await page.locator('summary', { hasText: 'Auf Englisch' }).click();
    await page.getByLabel('Kurzbio (Englisch)').fill('In English.');
    await expect(vs.getByRole('button', { name: 'EN', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(f.locator('.pueber__bio p')).toHaveText(['In English.']);
    await expect(f.locator('html')).toHaveAttribute('lang', 'en');

    // Kontakt weg: Abschnitt und Knopf verschwinden
    await page.locator('#p-instagram').fill('');
    await page.locator('#p-website').fill('');
    await expect(f.locator('#kontakt')).toBeHidden();
    await expect(f.locator('.pbar__anfrage')).toBeHidden();
    // Vorschau ist nicht in Suchmaschinen
    await expect(f.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('ohne Migration: neue Bereiche verborgen, Speichern geht weiter', async ({ page }) => {
    const m = await redaktion(page, { profil: { slug: 'pia-presse', public_listing: true, verified: true } });
    await page.goto('/intern/profil/');
    await expect(page.locator('[data-neu-fehlt]')).toBeVisible();
    await expect(page.locator('[data-klapp="galerie"]')).toBeHidden();
    await expect(page.locator('#p-profession')).toBeHidden();
    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.locator('[data-profile-msg]')).toHaveText('Gespeichert.');
    expect(m.profilGespeichert.at(-1)).not.toHaveProperty('gallery');
  });

  test('Freigaben: wartende Galeriefotos freigeben und ablehnen', async ({ page }) => {
    const m = await redaktion(page, {
      freigaben: [
        {
          id: 'm1', display_name: 'Mia Muster', slug: 'mia-muster', verified: true, is_trainer: false, photo_path: null, photo_pending: null, tags: [],
          gallery: [{ path: 'm1/a.jpg', caption: 'Hof', frei: false }, { path: 'm1/b.jpg', frei: false }, { path: 'm1/c.jpg', frei: true }],
        },
      ],
    });
    await page.goto('/intern/redaktion/freigaben/');
    await expect(page.locator('[data-offen] .fg__karte')).toHaveCount(1);
    await expect(page.locator('[data-offen]')).toContainText('2 Galeriefotos');
    await expect(page.locator('.fg__gfoto')).toHaveCount(2);
    await page.getByRole('button', { name: 'Galeriefoto „Hof“ freigeben' }).click();
    await expect(page.locator('[data-msg]')).toContainText('Galeriefoto freigegeben.');
    expect(m.galerieFreigaben[0]).toEqual({ person: 'm1', pfad: 'm1/a.jpg', ok: true });
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Galeriefoto ablehnen' }).click();
    await expect.poll(() => m.galerieFreigaben.length).toBe(2);
    expect(m.galerieFreigaben[1]).toEqual({ person: 'm1', pfad: 'm1/b.jpg', ok: false });
    await expect.poll(() => m.geloescht.at(-1)).toEqual(['m1/b.jpg']);
  });
});
