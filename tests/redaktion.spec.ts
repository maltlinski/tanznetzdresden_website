/**
 * Redaktion im internen Bereich (src/pages/intern/redaktion/) im Browser.
 * Supabase (Anmeldung, Profil) und die Funktion „inhalte“ sind nachgebaut. Die nachgebaute Funktion
 * liest die echten Dateien aus dem Repository; was gespeichert würde, prüfen die Tests direkt.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { supabase } from '../src/settings/supabase';

test.skip(!supabase.url || !supabase.anonKey, 'Supabase nicht eingetragen');

const SB = supabase.url.replace(/\/+$/, '');
const ref = new URL(SB).hostname.split('.')[0];
const ERLAUBT = /^(src\/content\/.+\.(md|ya?ml)|src\/settings\/[a-z0-9-]+\.json|src\/assets\/(photos|personen|foerderer)\/[^/]+\.(jpe?g|png|webp)|public\/downloads\/[^/]+\.pdf)$/;

function alleDateien(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? alleDateien(p) : [p];
  });
}
const sha = (b: Buffer) => createHash('sha1').update(b).digest('hex');

interface Gespeichert {
  nachricht: string;
  aenderungen: { pfad: string; text?: string; base64?: string; loeschen?: boolean; alt?: string | null }[];
}

/** Meldet eine Person mit Rolle an und baut Supabase samt Funktion „inhalte“ nach. */
async function redaktion(page: Page, rolle: 'presse' | 'vorstand' | 'mitglied' = 'presse') {
  const gespeichert: Gespeichert[] = [];
  const dateien = ['src', 'public'].flatMap((d) => alleDateien(d)).filter((p) => ERLAUBT.test(p));
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp: 4102444800 })}.x`;
  const session = {
    access_token: token, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800,
    user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'pia@example.org', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
  };
  await page.addInitScript(([k, v]) => {
    localStorage.setItem(k, v);
    localStorage.setItem('tndd-consent', JSON.stringify({ v: 1, date: '2026-10-13T00:00:00Z', categories: { notwendig: true } }));
  }, [`sb-${ref}-auth-token`, JSON.stringify(session)]);

  await page.route(`${SB}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
    if (req.method() === 'OPTIONS') return json({});
    if (url.pathname === '/rest/v1/profiles') {
      const p = { id: 'u1', display_name: 'Pia Presse', role: rolle };
      return json(req.headers()['accept']?.includes('object') ? p : [p]);
    }
    if (url.pathname === '/rest/v1/news_posts') return json([{ slug: 'aus-supabase', title: 'Beitrag aus News schreiben', status: 'veroeffentlicht' }]);
    if (url.pathname === '/functions/v1/inhalte') {
      if (rolle === 'mitglied') return json({ fehler: 'Die Redaktion ist für Mitglieder mit der Rolle Presse, Vorstand oder Admin.' }, 403);
      const body = req.postDataJSON();
      switch (body.aktion) {
        case 'stand':
          return json({ head: 'h1', rolle, name: 'Pia Presse', dateien: dateien.map((p) => ({ pfad: p, sha: sha(readFileSync(p)), groesse: statSync(p).size })) });
        case 'lesen':
          return json({
            head: 'h1',
            dateien: Object.fromEntries((body.pfade as string[]).map((p) => [p, dateien.includes(p) ? { sha: sha(readFileSync(p)), text: readFileSync(p, 'utf8') } : null])),
          });
        case 'datei':
          return json({ sha: sha(readFileSync(body.pfad)), base64: readFileSync(body.pfad).toString('base64') });
        case 'status':
          return json({
            website: { status: 'completed', ergebnis: 'success', zeit: '2026-10-13T10:00:00Z', url: '', commit: 'h1' },
            verlauf: [{ sha: 'h1', url: '', zeit: '2026-10-13T09:58:00Z', titel: 'Termin „POP UP“ geändert', von: 'Pia Presse' }],
          });
        case 'speichern':
          gespeichert.push({ nachricht: body.nachricht, aenderungen: body.aenderungen });
          return json({ commit: 'c2', url: '' });
      }
    }
    return json({ message: 'nicht nachgebaut' }, 404);
  });
  return gespeichert;
}

/** Eingabefeld nach Beschriftung („Pflicht“ ist Teil des Label-Texts, aber nicht des Namens) */
const feld = (page: Page, name: string) => page.getByLabel(new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( Pflicht)?$`));
const frontmatter = (text: string) => parse(text.match(/^---\n([\s\S]*?)---\n/)![1]);
const aktuell = (p: string) => sha(readFileSync(p));

test('Übersicht: alle Bereiche, Website-Status und Verlauf', async ({ page }) => {
  await redaktion(page);
  await page.goto('/intern/redaktion/');
  await expect(page.getByRole('heading', { name: 'Redaktion', exact: true })).toBeVisible();
  for (const name of ['News schreiben', 'Termine', 'Formate', 'Trainingsplan', 'Dozent:innen', 'Personen', 'Partner', 'Vereinsdaten', 'Textseiten']) {
    await expect(page.locator('[data-access]').getByRole('link', { name: new RegExp(`^${name}`) })).toBeVisible();
  }
  await expect(page.getByRole('status').filter({ hasText: 'Die Website ist aktuell' })).toBeVisible();
  await expect(page.getByText('Termin „POP UP“ geändert')).toBeVisible();
  // Menü im internen Bereich führt hierher
  await expect(page.getByRole('navigation', { name: 'Interner Bereich' }).getByRole('link', { name: 'Redaktion' })).toHaveAttribute('aria-current', 'page');
});

test('Ohne Rolle Presse/Vorstand kein Zugang', async ({ page }) => {
  await redaktion(page, 'mitglied');
  await page.goto('/intern/redaktion/');
  await expect(page.getByText(/Die Redaktion ist für Mitglieder mit der Rolle/)).toBeVisible();
  await expect(page.getByRole('link', { name: /^Termine/ })).toBeHidden();
});

test('Termin anlegen: Pflichtfelder, Verweise, gespeicherte Datei', async ({ page }) => {
  const gespeichert = await redaktion(page);
  await page.goto('/intern/redaktion/liste/?b=termine');
  await expect(page.getByRole('heading', { name: 'Termine', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Termin anlegen' }).click();
  await expect(page.getByRole('heading', { name: 'Termin anlegen' })).toBeVisible();

  // Leer speichern: Fehler am Feld, Fokus auf dem ersten
  await page.getByRole('button', { name: 'Termin anlegen' }).click();
  await expect(page.getByText('Felder brauchen noch deine Aufmerksamkeit')).toBeVisible();
  await expect(feld(page, 'Titel')).toBeFocused();
  expect(gespeichert).toEqual([]);

  await feld(page, 'Titel').fill('Offenes Sharing im Dezember');
  await feld(page, 'Titel Englisch').fill('Open sharing in December');
  await page.getByLabel('Beginn: Datum').fill('2026-12-20');
  await page.getByLabel('Beginn: Uhrzeit').fill('19:30');
  await feld(page, 'Ort').fill('Zentralwerk');
  await feld(page, 'Kategorie').selectOption('Diskurs');
  await feld(page, 'Kurzbeschreibung').fill('Wir zeigen, woran wir gerade arbeiten.');
  await page.getByLabel('Link für Tickets oder Anmeldung').fill('javascript:alert(1)');
  await page.getByRole('searchbox', { name: 'Mitwirkende aus dem Netzwerk: suchen' }).fill('alina');
  await page.getByRole('checkbox', { name: 'Alina Lucifero' }).check();
  await page.getByLabel('Gehört zum Format').selectOption({ label: 'POP UP' });
  await page.getByLabel('Passender News-Beitrag').selectOption({ label: 'Beitrag aus News schreiben (News schreiben)' });
  await page.getByRole('button', { name: 'Termin anlegen' }).click();
  await expect(page.getByText('Bitte eine vollständige Adresse mit https:// eintragen.')).toBeVisible();
  await page.getByLabel('Link für Tickets oder Anmeldung').fill('https://example.org/tickets');
  await page.getByRole('button', { name: 'Termin anlegen' }).click();

  await expect.poll(() => gespeichert.length).toBe(1);
  const [{ nachricht, aenderungen }] = gespeichert;
  expect(nachricht).toBe('Termin „Offenes Sharing im Dezember“ angelegt');
  expect(aenderungen).toHaveLength(1);
  expect(aenderungen[0]).toMatchObject({ pfad: 'src/content/termine/2026-12-20-offenes-sharing-im-dezember.md', alt: null });
  const text = aenderungen[0].text!;
  expect(text).toContain('start: "2026-12-20 19:30"');
  expect(frontmatter(text)).toEqual({
    title: 'Offenes Sharing im Dezember', title_en: 'Open sharing in December', start: '2026-12-20 19:30', venue: 'Zentralwerk',
    category: 'Diskurs', teaser: 'Wir zeigen, woran wir gerade arbeiten.', link: 'https://example.org/tickets',
    people: ['alina-lucifero'], format: 'pop-up', news: 'aus-supabase',
  });
});

test('Termin ändern: nur das Geänderte, Kommentare bleiben', async ({ page }) => {
  const gespeichert = await redaktion(page);
  const pfad = 'src/content/termine/2026-11-14-keep-up-workshop.md';
  await page.goto('/intern/redaktion/eintrag/?b=termine&id=2026-11-14-keep-up-workshop');
  await expect(page.getByRole('heading', { name: 'KEEP UP · Workshop Floorwork' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Aurora Fradella' })).toBeChecked();
  await feld(page, 'Ort').fill('Villa Wigman');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect.poll(() => gespeichert.length).toBe(1);
  const a = gespeichert[0].aenderungen[0];
  expect(a.pfad).toBe(pfad);
  expect(a.alt).toBe(aktuell(pfad));
  const vorher = readFileSync(pfad, 'utf8');
  expect(a.text).toBe(vorher.replace('venue: "TENZA Schmiede"', 'venue: Villa Wigman'));
  expect(gespeichert[0].nachricht).toBe('Termin „KEEP UP · Workshop Floorwork“ geändert');
});

test('Personen: Reihenfolge ändern und speichern', async ({ page }) => {
  const gespeichert = await redaktion(page);
  await page.goto('/intern/redaktion/liste/?b=personen');
  const erste = page.locator('.r-zeile').first();
  await expect(erste).toContainText('Alba T Álvarez');
  await erste.getByRole('button', { name: 'Nach unten: Alba T Álvarez' }).click();
  await expect(page.locator('.r-zeile').first()).toContainText('Alexandre May');
  // Fokus bleibt auf dem verschobenen Eintrag
  await expect(page.getByRole('button', { name: 'Nach unten: Alba T Álvarez' })).toBeFocused();
  await page.getByRole('button', { name: 'Reihenfolge speichern' }).click();
  await expect.poll(() => gespeichert.length).toBe(1);
  const text = gespeichert[0].aenderungen[0].text!;
  expect(text.startsWith('# Personen im Netzwerk. Reihenfolge = Anzeige-Reihenfolge.')).toBe(true);
  const ids = (parse(text) as { id: string }[]).map((p) => p.id);
  const vorher = (parse(readFileSync('src/content/personen.yaml', 'utf8')) as { id: string }[]).map((p) => p.id);
  expect(ids.slice(0, 2)).toEqual([vorher[1], vorher[0]]);
  expect(ids.slice(2)).toEqual(vorher.slice(2));
  expect(gespeichert[0].nachricht).toBe('Personen: Reihenfolge geändert');
});

test('Löschen: verwendete Einträge sind geschützt, andere werden entfernt', async ({ page }) => {
  const gespeichert = await redaktion(page);
  await page.goto('/intern/redaktion/liste/?b=personen');
  await page.getByRole('button', { name: 'Löschen: Aurora Fradella' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: '„Aurora Fradella“ wird noch verwendet' })).toBeVisible();
  await expect(dialog).toContainText('Termin „KEEP UP · Workshop Floorwork“');
  await expect(dialog).toContainText('Dozent:in „Aurora Fradella“');
  await dialog.getByRole('button', { name: 'Schließen' }).click();

  await page.getByRole('button', { name: 'Löschen: Alba T Álvarez' }).click();
  await expect(dialog.getByRole('heading', { name: '„Alba T Álvarez“ löschen?' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Löschen' }).click();
  await expect.poll(() => gespeichert.length).toBe(1);
  const ids = (parse(gespeichert[0].aenderungen[0].text!) as { id: string }[]).map((p) => p.id);
  expect(ids).not.toContain('alba-t-alvarez');
  expect(ids).toContain('aurora-fradella');
  expect(gespeichert[0].nachricht).toBe('Person „Alba T Álvarez“ gelöscht');
});

test('Trainingswoche: nur Montage, wird nach Datum einsortiert', async ({ page }) => {
  const gespeichert = await redaktion(page);
  await page.goto('/intern/redaktion/eintrag/?b=wochen&neu=1');
  await feld(page, 'Woche ab Montag').fill('2026-12-23');
  await feld(page, 'Dozent:in').selectOption({ label: 'Laura Gary' });
  await page.getByRole('checkbox', { name: 'Di' }).check();
  await page.getByRole('checkbox', { name: 'Do' }).check();
  await page.getByRole('button', { name: 'Trainingswoche anlegen' }).click();
  await expect(page.getByText('Bitte den Montag der Woche wählen.')).toBeVisible();
  await feld(page, 'Woche ab Montag').fill('2026-12-21');
  await page.getByRole('button', { name: 'Trainingswoche anlegen' }).click();
  await expect.poll(() => gespeichert.length).toBe(1);
  const text = gespeichert[0].aenderungen[0].text!;
  expect(text).toContain('- { id: "2026-12-21", dozent: laura-gary, tage: [di, do] }');
  const ids = (parse(text) as { id: string }[]).map((w) => w.id);
  expect(ids).toEqual([...ids].sort());
  expect(text.split('\n')[0]).toMatch(/^# KEEP UP · Trainingswochen/);
});

test('Formate: neues Format mit Foto-Upload', async ({ page }) => {
  const gespeichert = await redaktion(page);
  await page.goto('/intern/redaktion/eintrag/?b=formate&neu=1');
  await feld(page, 'Name').fill('Tanz im Park');
  await feld(page, 'Seit').fill('seit 2027');
  await feld(page, 'Beschreibung').fill('Draußen tanzen, für alle.');
  await page.locator('input[type=file]').setInputFiles('src/assets/photos/duo-rot.jpg');
  await expect(page.getByText('„duo-rot-2.jpg“ wird beim Speichern hochgeladen.')).toBeVisible();
  await expect(page.locator('.rf-bild__frame img')).toBeVisible();
  await page.getByRole('button', { name: 'Format anlegen' }).click();
  await expect(page.getByText('Bitte ausfüllen.')).toBeVisible(); // Bildbeschreibung fehlt
  await feld(page, 'Bildbeschreibung').fill('Zwei Tänzerinnen in Rot');
  await page.getByRole('button', { name: 'Format anlegen' }).click();
  await expect.poll(() => gespeichert.length).toBe(1);
  const [md, foto] = gespeichert[0].aenderungen;
  expect(md.pfad).toBe('src/content/formate/tanz-im-park.md');
  expect(frontmatter(md.text!)).toMatchObject({ title: 'Tanz im Park', image: '../../assets/photos/duo-rot-2.jpg', alt: 'Zwei Tänzerinnen in Rot' });
  expect(foto).toMatchObject({ pfad: 'src/assets/photos/duo-rot-2.jpg', alt: null });
  expect(Buffer.from(foto.base64!, 'base64').subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
});

test('Einstellungen: Texte ändern, rechtliche Angaben nur für den Vorstand', async ({ page }) => {
  const gespeichert = await redaktion(page);
  await page.goto('/intern/redaktion/eintrag/?b=keep-up-texte');
  await expect(feld(page, 'Saison')).toHaveValue('Herbst 2026');
  await feld(page, 'Saison').fill('Winter 2026/27');
  await page.getByLabel('Saison Englisch').fill('Winter 2026/27');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect.poll(() => gespeichert.length).toBe(1);
  const neu = JSON.parse(gespeichert[0].aenderungen[0].text!);
  const alt = JSON.parse(readFileSync('src/settings/keep-up.json', 'utf8'));
  expect(neu).toEqual({ ...alt, de: { ...alt.de, saison: 'Winter 2026/27' }, en: { ...alt.en, saison: 'Winter 2026/27' } });

  await expect(page.getByText('Gespeichert. Die Website ist in etwa 2–3 Minuten aktualisiert.')).toBeVisible();
  await page.goto('/intern/redaktion/eintrag/?b=verein');
  await expect(feld(page, 'Registernummer')).toBeDisabled();
  await expect(feld(page, 'Beitrag')).toBeEnabled();
});

test('Vorstand darf Impressum bearbeiten, Presse nur lesen', async ({ page }) => {
  await redaktion(page);
  await page.goto('/intern/redaktion/eintrag/?b=seiten&id=impressum');
  await expect(page.getByText('Diesen Eintrag ändert nur der Vorstand.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Speichern' })).toBeHidden();
  await expect(feld(page, 'Titel')).toBeDisabled();
});

test('Textseite mit englischer Fassung bearbeiten', async ({ page }) => {
  const gespeichert = await redaktion(page, 'vorstand');
  await page.goto('/intern/redaktion/eintrag/?b=seiten&id=transparenz');
  // vorhandene englische Fassung ist aufgeklappt
  const en = page.locator('.rf-en textarea');
  await expect(en).toHaveValue(/Statutes|statutes|purpose/i);
  await en.fill(`${await en.inputValue()}\n\nNew paragraph.`);
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect.poll(() => gespeichert.length).toBe(1);
  const pfade = gespeichert[0].aenderungen.map((a) => a.pfad);
  expect(pfade).toEqual(['src/content/seiten/transparenz.md', 'src/content/seiten/en/transparenz.md']);
  expect(gespeichert[0].aenderungen[0].text).toBe(readFileSync('src/content/seiten/transparenz.md', 'utf8'));
  expect(gespeichert[0].aenderungen[1].text!.trimEnd().endsWith('New paragraph.')).toBe(true);
});

for (const pfad of ['/intern/redaktion/', '/intern/redaktion/liste/?b=termine', '/intern/redaktion/eintrag/?b=termine&id=2026-10-15-studio-round-9', '/intern/redaktion/eintrag/?b=verein']) {
  test(`${pfad} ist barrierearm (axe)`, async ({ page }) => {
    await redaktion(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(pfad);
    await expect(page.locator('[data-access]')).toBeVisible();
    await page.waitForLoadState('networkidle');
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    const serious = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
  });
}
