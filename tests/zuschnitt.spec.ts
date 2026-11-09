/**
 * Zuschnitt von Profilfotos: Geometrie und Vorschlag (src/lib/bild-zuschnitt.ts), Dialog unter „Mein Profil“
 * (src/scripts/intern/zuschnitt.ts) und die Darstellung auf der Website.
 */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { ausschnitt, fokusLesen, fokusPos, fokusVorschlag, rahmenGalerie, rahmenPortraet, sicherSichtbar, streifenFormat } from '../src/lib/bild-zuschnitt';
import { supabase } from '../src/settings/supabase';
import { FOTOS, redaktion } from './redaktion-mock';

/** Testbild: grauer Grund, ein hautfarbener Fleck mit Kanten um (cx, cy) */
function bild(w: number, h: number, cx?: number, cy?: number) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const drin = cx !== undefined && cy !== undefined && Math.hypot(x - cx, y - cy) < Math.min(w, h) * 0.1;
      const [r, g, b] = drin ? ((x + y) % 4 < 2 ? [224, 168, 132] : [196, 140, 108]) : [128, 128, 128];
      px.set([r, g, b, 255], i);
    }
  }
  return px;
}

test.describe('Zuschnitt: Regeln', () => {
  test('Fokus lesen: nur „x% y%“ zwischen 0 und 100', () => {
    expect(fokusLesen('40% 25%')).toEqual({ x: 40, y: 25 });
    expect(fokusLesen('100% 0%')).toEqual({ x: 100, y: 0 });
    for (const v of ['101% 5%', '40%', '40 25', 'center', '', null, 7]) expect(fokusLesen(v)).toBeUndefined();
    expect(fokusPos(' 12.4% 60% ')).toBe('12% 60%');
  });

  test('Ausschnitt wie object-fit: cover – der Fokuspunkt bleibt im Rahmen', () => {
    // Querformat 3:2 im Hochformat 4:5: sichtbar ist ein Streifen der Breite (4/5)/(3/2)
    const a = ausschnitt(3 / 2, 4 / 5, { x: 100, y: 50 });
    expect(a.w).toBeCloseTo(0.5333, 3);
    expect(a.x + a.w).toBeCloseTo(1, 5);
    expect(a.h).toBe(1);
    // Hochformat im Querformat: Streifen der Höhe
    const b = ausschnitt(2 / 3, 16 / 9, { x: 50, y: 20 });
    expect(b.w).toBe(1);
    expect(b.h).toBeCloseTo(0.375, 3);
    for (const f of [{ x: 0, y: 0 }, { x: 33, y: 71 }, { x: 100, y: 100 }]) {
      for (const [bildR, rahmenR] of [[3 / 2, 4 / 5], [2 / 3, 21 / 9], [1, 1]]) {
        const s = ausschnitt(bildR, rahmenR, f);
        expect(f.x / 100).toBeGreaterThanOrEqual(s.x - 1e-9);
        expect(f.x / 100).toBeLessThanOrEqual(s.x + s.w + 1e-9);
        expect(f.y / 100).toBeGreaterThanOrEqual(s.y - 1e-9);
        expect(f.y / 100).toBeLessThanOrEqual(s.y + s.h + 1e-9);
      }
    }
    // überall sichtbar: Schnitt der Rahmen, ganze Fotos zählen nicht
    const s = sicherSichtbar(3 / 2, [...rahmenPortraet({ karte: true }), { id: 'x', de: '', en: '', r: 21 / 9, ganz: true }], { x: 50, y: 50 });
    expect(s.w).toBeCloseTo((0.78) / 1.5, 3);
    expect(s.h).toBe(1);
  });

  test('Rahmen der Galerie folgen der Darstellung; ganz gezeigt im Filmstreifen mit eigenem Format', () => {
    expect(rahmenGalerie(0, 5, 'filmstreifen', 1.5, false)[0].r).toBeCloseTo(4 / 5);
    expect(rahmenGalerie(0, 5, 'filmstreifen', 1.5, false)[0].clip).toContain('polygon');
    expect(rahmenGalerie(0, 5, 'filmstreifen', 1.5, true)[0]).toMatchObject({ r: 1.5, clip: undefined });
    // eigenes Format im Filmstreifen und Raster; im Mosaik gibt die Anordnung die Form vor, „ganz“ geht vor
    expect(rahmenGalerie(0, 5, 'filmstreifen', 0.7, false, 'quer')[0].r).toBeCloseTo(3 / 2);
    expect(rahmenGalerie(1, 5, 'raster', 1.5, false, 'quadrat').map((r) => r.r)).toEqual([1, 1]);
    expect(rahmenGalerie(0, 5, 'mosaik', 1.5, false, 'quadrat').map((r) => r.r)).toEqual(rahmenGalerie(0, 5, 'mosaik', 1.5, false).map((r) => r.r));
    expect(rahmenGalerie(0, 5, 'filmstreifen', 0.7, true, 'quer')[0].r).toBeCloseTo(0.7);
    expect(streifenFormat(5)).toBe(2.2);
    const m = rahmenGalerie(3, 4, 'mosaik', 1, false);
    expect(m.map((r) => r.id)).toEqual(['gross', 'handy']);
    expect(m[0].r).toBeCloseTo(21 / 9); // viertes von vier: ganz breit
    expect(rahmenGalerie(1, 4, 'raster', 1, true).every((r) => r.ganz && r.r === 4 / 5)).toBe(true);
  });

  test('Vorschlag: Gesicht geht vor, sonst der Bildinhalt, ohne Inhalt die Mitte', () => {
    const w = 120, h = 90;
    const v = fokusVorschlag(bild(w, h, 90, 25), w, h);
    expect(v.quelle).toBe('inhalt');
    expect(Math.abs(v.fokus.x - 75)).toBeLessThan(8);
    expect(Math.abs(v.fokus.y - 28)).toBeLessThan(10);
    const links = fokusVorschlag(bild(w, h, 20, 70), w, h);
    expect(links.fokus.x).toBeLessThan(30);
    expect(links.fokus.y).toBeGreaterThan(62);
    expect(fokusVorschlag(bild(w, h), w, h)).toEqual({ fokus: { x: 50, y: 50 }, quelle: 'mitte' });
    expect(fokusVorschlag(bild(w, h, 90, 25), w, h, { gesichter: [{ x: 0, y: 0, w: 24, h: 18 }] })).toEqual({ fokus: { x: 10, y: 10 }, quelle: 'gesicht' });
    // kleines Gesicht im Hintergrund zählt nicht neben einem großen
    expect(fokusVorschlag(bild(w, h), w, h, { gesichter: [{ x: 0, y: 0, w: 24, h: 18 }, { x: 110, y: 80, w: 4, h: 4 }] }).fokus).toEqual({ x: 10, y: 10 });
    // Personen: Mitte waagerecht, Kopfhöhe senkrecht; Gesichter gehen vor
    const person = { x: 60, y: 30, w: 24, h: 60 };
    expect(fokusVorschlag(bild(w, h), w, h, { personen: [person] })).toEqual({ fokus: { x: 60, y: 42 }, quelle: 'person' });
    expect(fokusVorschlag(bild(w, h), w, h, { personen: [person], gesichter: [{ x: 6, y: 6, w: 12, h: 12 }] }).quelle).toBe('gesicht');
  });
});

test.describe('Zuschnitt unter „Mein Profil“', () => {
  test.skip(!supabase.url || !supabase.anonKey, 'Supabase nicht eingetragen');

  const profil = {
    slug: 'pia-presse', public_listing: true, verified: true, bio: 'Text', profession: 'Tänzerin', base: 'Dresden', pitch: null, pitch_en: null,
    profession_en: null, open_for: [], works: [], education: null, techniques: null, languages: null, regions: null, height: null, available: null,
    public_email: null, gallery_layout: 'filmstreifen', photo_path: 'u1/portrait-1.jpg', photo_pending: null, photo_focus: {},
    gallery: [{ path: 'u1/galerie-a.jpg', caption: 'Probe', frei: true }],
  };

  test('Porträt: Dialog mit allen Formen, Fokus mit Tastatur, gespeichert je Foto', async ({ page }) => {
    await page.setViewportSize({ width: 1500, height: 1000 });
    const m = await redaktion(page, { profil });
    await page.goto('/intern/profil/');
    await page.getByRole('button', { name: 'Ausschnitt wählen' }).click();
    const dlg = page.getByRole('dialog', { name: 'Ausschnitt des Porträts' });
    await expect(dlg).toBeVisible();
    await expect(dlg.locator('.zs__formel')).toHaveCount(3); // Profil groß, Handy, Netzwerk
    await expect(dlg.locator('.zs__formel > span')).toHaveText(['Profil, großer Bildschirm', 'Profil auf dem Handy', 'Netzwerk-Übersicht']);
    const punkt = dlg.getByRole('slider', { name: 'Fokuspunkt' });
    await expect(punkt).toHaveAttribute('aria-valuetext', '50 % von links, 30 % von oben');
    await punkt.press('Shift+ArrowRight');
    await punkt.press('ArrowUp');
    await expect(punkt).toHaveAttribute('aria-valuetext', '60 % von links, 29 % von oben');
    await expect(dlg.locator('.zs__form img').first()).toHaveCSS('object-position', '60% 29%');
    // Klick ins Foto setzt den Punkt
    const box = (await dlg.locator('.zs__bild').boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.75);
    await expect(punkt).toHaveAttribute('aria-valuetext', /^2[45] % von links, 7[45] % von oben$/);
    await punkt.press('Home');
    await punkt.press('Shift+ArrowLeft');
    await dlg.getByRole('button', { name: 'Übernehmen' }).click();
    await expect(dlg).toBeHidden();
    await expect(page.locator('[data-profile-msg]')).toHaveText('Ausschnitt gespeichert.');
    expect(m.profilGespeichert.at(-1)).toEqual({ photo_focus: { 'u1/portrait-1.jpg': '40% 50%' } });
    await expect(page.locator('[data-photo-preview] img')).toHaveCSS('object-position', '40% 50%');
    // Vorschau daneben übernimmt den Ausschnitt
    const f = page.frameLocator('[data-vorschau] iframe');
    await expect(f.locator('[data-ph-bild] img')).toHaveCSS('object-position', '40% 50%');
  });

  test('Galerie: neue Fotos bekommen einen Vorschlag, Ausschnitt und „ganzes Foto“ werden gespeichert', async ({ page }) => {
    await page.setViewportSize({ width: 1500, height: 1000 });
    const m = await redaktion(page, { profil });
    await page.goto('/intern/profil/');
    await page.locator('summary', { hasText: 'Galerie' }).click();
    await page.locator('#p-galerie-datei').setInputFiles(FOTOS.slice(0, 1));
    await expect(page.locator('.pg__el')).toHaveCount(2);
    const neu = m.profilGespeichert.at(-1)!.gallery as { path: string; fokus?: string }[];
    expect(neu[1].fokus).toMatch(/^\d{1,3}% \d{1,3}%$/);
    // neu gespeichert: ohne Kamera-Angaben (Exif, darin auch der Aufnahmeort) – das Testfoto hat welche
    expect(readFileSync(FOTOS[0]).includes('Exif')).toBe(true);
    expect(m.hochgeladenDaten.at(-1)!.length).toBeGreaterThan(1000);
    expect(m.hochgeladenDaten.at(-1)!.includes('Exif')).toBe(false);

    await page.getByRole('button', { name: 'Ausschnitt und Format von Foto 1 wählen' }).click();
    const dlg = page.getByRole('dialog', { name: 'Ausschnitt: Foto 1' });
    await expect(dlg.locator('.zs__formel > span')).toHaveText(['Filmstreifen']);
    await dlg.getByRole('button', { name: 'Vorschlag' }).click();
    await expect(dlg.getByRole('status')).toContainText(/Vorschlag nach dem Bildinhalt|Gesicht erkannt|Person erkannt|Mitte/, { timeout: 20000 });
    await dlg.getByRole('slider').press('Home');
    await dlg.getByRole('radio', { name: 'Ganzes Foto, nicht zuschneiden' }).check();
    await expect(dlg.locator('.zs__form')).not.toHaveAttribute('style', /clip-path/);
    await dlg.getByRole('button', { name: 'Übernehmen' }).click();
    await expect(page.locator('[data-profile-msg]')).toHaveText('Ausschnitt gespeichert.');
    const g = m.profilGespeichert.at(-1)!.gallery as { path: string; fokus?: string; ganz?: boolean; caption?: string }[];
    expect(g[0]).toMatchObject({ path: 'u1/galerie-a.jpg', caption: 'Probe', fokus: '50% 50%', ganz: true });
    await expect(page.getByRole('button', { name: 'Ausschnitt und Format von Foto 1 wählen' })).toHaveText('Ganzes Foto');
    // Vorschau: Filmstreifen ohne Keil im Format des Fotos
    const f = page.frameLocator('[data-vorschau] iframe');
    const el = f.locator('.pstrip__el').first();
    await expect(el.locator('.pstrip__bild')).not.toHaveClass(/keil/);
    await expect.poll(async () => Number(await el.evaluate((e) => (e as HTMLElement).style.getPropertyValue('--r')))).not.toBeCloseTo(0.8, 2);

    // eigenes Format: Querformat 3 : 2 im Filmstreifen, auch in der Vorschau
    await page.getByRole('button', { name: 'Ausschnitt und Format von Foto 2 wählen' }).click();
    const dlg2 = page.getByRole('dialog', { name: 'Ausschnitt: Foto 2' });
    await expect(dlg2.getByRole('radio', { name: 'Wie die Galerie es vorsieht' })).toBeChecked();
    await dlg2.getByRole('radio', { name: 'Querformat' }).check();
    await expect(dlg2.locator('.zs__form')).toHaveAttribute('style', /aspect-ratio: 1\.5/);
    const gespeichert = m.profilGespeichert.length;
    await dlg2.getByRole('button', { name: 'Übernehmen' }).click();
    await expect.poll(() => m.profilGespeichert.length).toBe(gespeichert + 1);
    const g2 = m.profilGespeichert.at(-1)!.gallery as { format?: string; ganz?: boolean }[];
    expect(g2[1]).toMatchObject({ format: 'quer' });
    expect(g2[1].ganz).toBeUndefined();
    await expect(page.getByRole('button', { name: 'Ausschnitt und Format von Foto 2 wählen' })).toHaveText('Ausschnitt · Querformat');
    await expect.poll(async () => f.locator('.pstrip__el').nth(1).evaluate((e) => (e as HTMLElement).style.getPropertyValue('--r'))).toBe('1.5');

    // Abbrechen ändert nichts
    const vorher = m.profilGespeichert.length;
    await page.getByRole('button', { name: 'Ausschnitt und Format von Foto 2 wählen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Abbrechen' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    expect(m.profilGespeichert.length).toBe(vorher);
  });

  test('ohne Migration photo_focus: kein Ausschnitt fürs Porträt', async ({ page }) => {
    const { photo_focus: _, ...ohne } = profil;
    await redaktion(page, { profil: ohne });
    await page.goto('/intern/profil/');
    await expect(page.locator('[data-photo-preview] img')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ausschnitt wählen' })).toBeHidden();
  });
});

test.describe('Zuschnitt in der Redaktion (News)', () => {
  test.skip(!supabase.url || !supabase.anonKey, 'Supabase nicht eingetragen');

  test('Titelbild: „Ausschnitt-Editor“ öffnet den Dialog mit den Formen der News', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 950 });
    await redaktion(page);
    await page.goto('/intern/news/bearbeiten/');
    await page.locator('[data-photo-input]').first().setInputFiles(FOTOS[2]);
    const flaeche = page.locator('[data-cover-fokus] .md-fokus');
    await expect(flaeche.locator('img')).toBeVisible();
    await flaeche.getByRole('button', { name: 'Ausschnitt-Editor' }).click();
    const dlg = page.getByRole('dialog', { name: 'Ausschnitt wählen' });
    await expect(dlg.locator('.zs__formel > span')).toHaveText(['News-Übersicht', 'Startseite', 'Beitrag, großer Bildschirm', 'Beitrag auf dem Handy']);
    const punkt = dlg.getByRole('slider');
    await punkt.press('Home');
    await punkt.press('Shift+ArrowLeft');
    await punkt.press('Shift+ArrowUp');
    await dlg.getByRole('button', { name: 'Übernehmen' }).click();
    await expect(dlg).toBeHidden();
    await expect(flaeche.locator('.md-fokus__punkt')).toHaveAttribute('style', /left: ?40%; ?top: ?40%/);
    await expect(page.locator('.md-zuschnitt img').first()).toHaveCSS('object-position', '40% 40%');
  });
});

