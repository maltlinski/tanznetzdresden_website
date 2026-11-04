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

/** Mitgliederprofil, wie es die Freigaben-Seite aus Supabase liest */
interface Mitglied {
  id: string; display_name: string; slug: string; verified: boolean; photo_path: string | null; photo_pending: string | null;
  pronouns?: string | null; bio?: string | null; tags?: string[]; is_trainer?: boolean;
}

/**
 * Meldet eine Person mit Rolle an und baut Supabase samt Funktion „inhalte“ nach.
 * `mitglieder`: Profile für Redaktion → Freigaben; `aufrufe` sammelt Freigaben, gelöschte Fotos und Neubauten.
 */
async function redaktion(page: Page, rolle: 'presse' | 'vorstand' | 'mitglied' = 'presse', mitglieder: Mitglied[] = [], aufrufe: string[] = []) {
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
    if (url.pathname === '/rest/v1/profiles' && url.searchParams.has('public_listing')) {
      const offen = mitglieder.filter((m) => !m.verified || m.photo_pending).length;
      if (req.method() === 'HEAD') return route.fulfill({ status: 200, headers: { 'content-range': `0-0/${offen}`, 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'content-range' } });
      return json(mitglieder.map((m) => ({ pronouns: null, bio: null, tags: [], is_trainer: false, ...m })));
    }
    if (url.pathname === '/rest/v1/public_profiles') return json([{ slug: 'mira-mitglied', display_name: 'Mira Mitglied' }]);
    if (url.pathname === '/rest/v1/rpc/freigabe') {
      aufrufe.push(`freigabe ${JSON.stringify(req.postDataJSON())}`);
      return json(req.postDataJSON().aktion === 'zurueckziehen' ? null : 'alt/foto.jpg');
    }
    if (url.pathname === '/storage/v1/object/profilbilder' && req.method() === 'DELETE') {
      aufrufe.push(`löschen ${JSON.stringify(req.postDataJSON().prefixes)}`);
      return json([]);
    }
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
        case 'neu_bauen':
          aufrufe.push('neu bauen');
          return json({ ok: true });
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
/** Englische Felder einblenden (sind sonst eingeklappt) */
const englisch = (page: Page) => page.getByLabel('Englische Fassung zeigen').check();
/** „Erweitert“ (selten gebrauchte Felder) aufklappen */
async function erweitert(page: Page) {
  for (const d of await page.locator('details[data-erweitert]:not([open]) > summary').all()) await d.click();
}

test('Übersicht: „Was möchtest du ändern?“, Seiten, Website-Status und Verlauf', async ({ page }) => {
  await redaktion(page);
  await page.goto('/intern/redaktion/');
  await expect(page.getByRole('heading', { name: 'Was möchtest du ändern?', level: 1 })).toBeVisible();
  const kacheln = page.getByRole('list', { name: 'Was möchtest du ändern?' });
  for (const [name, ziel] of [['Texte ändern', /redaktion\/texte\/$/], ['Seite für Seite', /redaktion\/seiten\/$/], ['Beitrag schreiben', /intern\/news\/$/],
    ['Termin eintragen', /intern\/kalender\/$/], ['Medien verwalten', /news\/medien\/$/], ['Freigaben', /redaktion\/freigaben\/$/],
    ['Vorschau öffnen', /redaktion\/vorschau\/$/]] as const) {
    await expect(kacheln.getByRole('link', { name: new RegExp(`^${name}`) })).toHaveAttribute('href', ziel);
  }
  // direkt zu einer Seite der Website
  await expect(page.getByRole('link', { name: 'Startseite', exact: true })).toHaveAttribute('href', /redaktion\/seiten\/\?s=startseite$/);
  await expect(page.getByRole('status').filter({ hasText: 'Die Website ist aktuell' })).toBeVisible();
  await expect(page.getByText('Termin „POP UP“ geändert')).toBeVisible();
  // Seitenleiste: „Website-Inhalte“ mit Übersicht, Seiten, Texte, Medien, Beiträge, Termine, Freigaben
  const nav = page.getByRole('navigation', { name: 'Interner Bereich' });
  await expect(nav.getByRole('link', { name: 'Übersicht' })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByText('Website-Inhalte', { exact: true })).toBeVisible();
  for (const name of ['Seiten', 'Texte', 'Medien', 'Beiträge', 'Termine', 'Freigaben']) await expect(nav.getByRole('link', { name: new RegExp(`^${name}`) })).toBeVisible();
  // Verwaltung nur für Vorstand und Admin
  await expect(nav.getByRole('link', { name: 'Verwaltung' })).toBeHidden();
  // keine Fachbegriffe in der Oberfläche
  expect(await page.locator('main').innerText()).not.toMatch(/GitHub|Repository|Commit|Markdown|YAML|JSON|Slug|Payload/);
});

test('Ohne Rolle Presse/Vorstand kein Zugang', async ({ page }) => {
  await redaktion(page, 'mitglied');
  await page.goto('/intern/redaktion/');
  await expect(page.getByText(/Die Redaktion ist für Mitglieder mit der Rolle/)).toBeVisible();
  await expect(page.getByRole('link', { name: /^Termine/ })).toBeHidden();
});

test('Ältere Termine: kein Anlegen mehr, Bearbeiten mit Prüfung, Verweisen und „Erweitert“', async ({ page }) => {
  const gespeichert = await redaktion(page);
  await page.goto('/intern/redaktion/liste/?b=termine');
  await expect(page.getByRole('heading', { name: 'Ältere Termine', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Termin anlegen' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /^Kopieren/ })).toHaveCount(0);
  // Neu nur noch unter Termine (Kalender)
  await page.goto('/intern/redaktion/eintrag/?b=termine&neu=1');
  await expect(page.getByText(/Hier lässt sich nichts Neues anlegen\. .*Neue Termine trägst du unter „Termine“ ein\./)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Termin anlegen' })).toBeHidden();

  await page.goto('/intern/redaktion/eintrag/?b=termine&id=2026-10-15-studio-round-9');
  await expect(page.getByRole('heading', { name: 'Studio Round #9' })).toBeVisible();
  // Selten Gebrauchtes ist eingeklappt
  const mehr = page.locator('details[data-erweitert]');
  await expect(mehr).not.toHaveAttribute('open', '');
  await expect(mehr.locator('summary')).toContainText('Erweitert');
  await expect(page.getByLabel('Passender News-Beitrag')).toBeHidden();
  await page.getByLabel('Link für Tickets oder Anmeldung').fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByText('Bitte eine vollständige Adresse mit https:// eintragen.')).toBeVisible();
  expect(gespeichert).toEqual([]);
  await page.getByLabel('Link für Tickets oder Anmeldung').fill('https://example.org/tickets');
  await erweitert(page);
  // freigegebene Mitgliederprofile stehen mit zur Auswahl
  await page.getByRole('searchbox', { name: 'Mitwirkende aus dem Netzwerk: suchen' }).fill('mira');
  await expect(page.getByRole('checkbox', { name: 'Mira Mitglied (Mitgliederprofil)' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Mitwirkende aus dem Netzwerk: suchen' }).fill('aurora');
  await page.getByRole('checkbox', { name: 'Aurora Fradella' }).check();
  await page.getByLabel('Gehört zum Format').selectOption({ label: 'POP UP' });
  await page.getByLabel('Passender News-Beitrag').selectOption({ label: 'Beitrag aus News schreiben (News schreiben)' });
  await page.getByRole('button', { name: 'Speichern' }).click();

  await expect.poll(() => gespeichert.length).toBe(1);
  const [{ nachricht, aenderungen }] = gespeichert;
  expect(nachricht).toBe('Termin „Studio Round #9“ geändert');
  expect(aenderungen).toHaveLength(1);
  expect(aenderungen[0]).toMatchObject({ pfad: 'src/content/termine/2026-10-15-studio-round-9.md', alt: aktuell('src/content/termine/2026-10-15-studio-round-9.md') });
  expect(frontmatter(aenderungen[0].text!)).toMatchObject({
    title: 'Studio Round #9', link: 'https://example.org/tickets', people: ['alina-lucifero', 'aurora-fradella'], format: 'pop-up', news: 'aus-supabase',
  });
});

test('Termin ändern: nur das Geänderte, Kommentare bleiben', async ({ page }) => {
  const gespeichert = await redaktion(page);
  const pfad = 'src/content/termine/2026-11-14-keep-up-workshop.md';
  await page.goto('/intern/redaktion/eintrag/?b=termine&id=2026-11-14-keep-up-workshop');
  await expect(page.getByRole('heading', { name: 'KEEP UP · Workshop Floorwork' })).toBeVisible();
  await erweitert(page);
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

test('Älterer Trainingsplan: neue Wochen nur noch im Kalender', async ({ page }) => {
  await redaktion(page);
  await page.goto('/intern/redaktion/liste/?b=wochen');
  await expect(page.getByRole('heading', { name: 'Älterer Trainingsplan', exact: true })).toBeVisible();
  await expect(page.getByText('Neue KEEP UP-Trainings planst du unter „Termine“.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Trainingswoche anlegen' })).toHaveCount(0);
  await page.goto('/intern/redaktion/eintrag/?b=wochen&neu=1');
  await expect(page.getByText(/Hier lässt sich nichts Neues anlegen/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Trainingswoche anlegen' })).toBeHidden();
});

test('Formate: neues Format mit Foto-Upload', async ({ page }) => {
  const gespeichert = await redaktion(page);
  await page.goto('/intern/redaktion/eintrag/?b=formate&neu=1');
  await feld(page, 'Name').fill('Tanz im Park');
  await feld(page, 'Seit').fill('seit 2027');
  await feld(page, 'Kurzbeschreibung').fill('Draußen tanzen, für alle.');
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
  // Englisch ist eingeklappt, bis man es einblendet
  await expect(page.getByLabel('Saison Englisch')).toBeHidden();
  await expect(page.getByText(/^Englisch: \d+ von \d+ ausgefüllt$/)).toBeVisible();
  await englisch(page);
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

test('Textseite mit englischer Fassung bearbeiten (Text-Editor), Tabelle und Notiz bleiben erhalten', async ({ page }) => {
  const gespeichert = await redaktion(page, 'vorstand');
  await page.goto('/intern/redaktion/eintrag/?b=seiten&id=transparenz');
  await englisch(page);
  // vorhandene englische Fassung ist aufgeklappt, der Text steht im Editor (nicht als Markdown)
  const en = page.locator('.rf-en .rt__eingabe');
  await expect(en).toContainText(/Statutes|statutes|purpose/i);
  await expect(page.locator('.rf-en .rt-roh').first()).toBeVisible();
  // ans Ende: neuer Absatz mit fettem Wort
  // Cursor ans Ende des letzten Absatzes (Strg+Ende ist im Handy-Profil nicht verlässlich)
  await en.locator(':scope > p').last().click();
  await en.evaluate((el) => {
    const r = document.createRange();
    r.selectNodeContents(el.lastElementChild!);
    r.collapse(false);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(r);
  });
  await page.waitForTimeout(100);
  await page.keyboard.press('Enter');
  await page.keyboard.type('New paragraph with ');
  await page.locator('.rf-en').getByRole('button', { name: 'Fett' }).click();
  await page.keyboard.type('bold');
  await expect(en.locator('strong', { hasText: 'bold' })).toBeVisible();
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect.poll(() => gespeichert.length).toBe(1);
  const pfade = gespeichert[0].aenderungen.map((a) => a.pfad);
  expect(pfade).toEqual(['src/content/seiten/transparenz.md', 'src/content/seiten/en/transparenz.md']);
  // Deutsch unverändert, Englisch: neuer Absatz als Markdown, Tabelle und Notiz wie vorher
  expect(gespeichert[0].aenderungen[0].text).toBe(readFileSync('src/content/seiten/transparenz.md', 'utf8'));
  const neu = gespeichert[0].aenderungen[1].text!;
  expect(neu.trimEnd().endsWith('New paragraph with **bold**')).toBe(true);
  const alt = readFileSync('src/content/seiten/en/transparenz.md', 'utf8');
  for (const block of [...alt.matchAll(/^\|.*\|$/gm)].map((m) => m[0])) expect(neu).toContain(block);
  for (const notiz of alt.match(/<!--[\s\S]*?-->/g) ?? []) expect(neu).toContain(notiz);
});

test('Text-Editor: Bilder-Abschnitte bleiben, Überschrift und Liste über die Werkzeugleiste, keine Markdown-Zeichen', async ({ page }) => {
  const gespeichert = await redaktion(page);
  // ein älterer Beitrag mit Bilder-Abschnitt, der alle Pflichtangaben hat
  const id = readdirSync('src/content/news/de').map((n) => n.replace(/\.md$/, '')).find((n) => {
    const t = readFileSync(`src/content/news/de/${n}.md`, 'utf8');
    return t.includes('\n::: bilder') && /^author:/m.test(t) && (!/^image:/m.test(t) || /^alt:/m.test(t));
  })!;
  const alt = readFileSync(`src/content/news/de/${id}.md`, 'utf8');
  await page.goto(`/intern/redaktion/eintrag/?b=news&id=${id}`);
  const ed = page.locator('.rt__eingabe').first();
  await expect(ed).toBeVisible();
  await expect(page.locator('.rt-roh', { hasText: 'Bilder-Abschnitt' }).first()).toBeVisible();
  // News zeigen Bilder-Abschnitte: dort gibt es „Bild aus Medien“ (Mediathek)
  await expect(page.getByRole('button', { name: 'Bild aus Medien einfügen' }).first()).toBeVisible();
  // keine Markdown-Zeichen im Editor
  expect(await ed.innerText()).not.toMatch(/\*\*|^## /m);
  // Überschrift und Liste über die Werkzeugleiste
  await ed.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Zwischenüberschrift' }).first().click();
  await page.keyboard.type('Neu im Netz');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Liste' }).first().click();
  await page.keyboard.type('Punkt eins');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect.poll(() => gespeichert.length).toBe(1);
  const text = gespeichert[0].aenderungen[0].text!;
  expect(text).toContain('## Neu im Netz');
  expect(text).toContain('- Punkt eins');
  // jeder Bilder-Abschnitt steht unverändert drin
  for (const m of alt.matchAll(/^::: ?bilder[\s\S]*?\n:::$/gm)) expect(text).toContain(m[0]);
});


test('Freigaben: Profil mit Foto freigeben, neues Foto ablehnen, Hinweis auf doppelte Person', async ({ page }) => {
  const aufrufe: string[] = [];
  await redaktion(page, 'presse', [
    { id: 'u2', display_name: 'Rika Yotsumoto', slug: 'rika-yotsumoto', verified: false, photo_path: null, photo_pending: 'u2/neu.jpg', bio: 'Tänzerin.', tags: ['Contemporary'], is_trainer: true },
    { id: 'u3', display_name: 'Alina Lucifero', slug: 'alina', verified: true, photo_path: 'u3/a.jpg', photo_pending: 'u3/b.jpg' },
    { id: 'u4', display_name: 'Olga Online', slug: 'olga-online', verified: true, photo_path: 'u4/x.jpg', photo_pending: null },
  ], aufrufe);
  await page.goto('/intern/redaktion/freigaben/');
  const offen = page.locator('[data-offen] > li');
  await expect(offen).toHaveCount(2);
  await expect(page.locator('[data-online] > li')).toHaveCount(2);
  const rika = offen.filter({ hasText: 'Rika Yotsumoto' });
  await expect(rika).toContainText('Ergänzt „Rika Yotsumoto“ aus Personen');
  await expect(offen.filter({ hasText: 'Alina Lucifero' })).toContainText('Achtung: „Alina Lucifero“ steht schon unter /netzwerk/alina-lucifero/');

  await rika.getByRole('button', { name: 'Profil und Foto freigeben' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Profil freigegeben.' })).toContainText('in 2–3 Minuten');
  expect(aufrufe).toEqual(['freigabe {"person":"u2","aktion":"profil"}', 'löschen ["alt/foto.jpg"]', 'neu bauen']);

  aufrufe.length = 0;
  page.once('dialog', (d) => d.accept());
  await offen.filter({ hasText: 'Alina Lucifero' }).getByRole('button', { name: 'Foto ablehnen' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Foto abgelehnt.' })).toBeVisible();
  // ein abgelehntes Foto war nie online: kein Neubau
  expect(aufrufe).toEqual(['freigabe {"person":"u3","aktion":"foto_ablehnen"}', 'löschen ["alt/foto.jpg"]']);
});

test('Freigaben: Zahl der offenen Freigaben auf Übersicht und in der Redaktion', async ({ page }) => {
  await redaktion(page, 'presse', [{ id: 'u2', display_name: 'Neu', slug: 'neu', verified: false, photo_path: null, photo_pending: null }]);
  await page.goto('/intern/');
  await expect(page.getByRole('link', { name: '1 Profil oder Foto wartet auf Freigabe →' })).toHaveAttribute('href', /\/intern\/redaktion\/freigaben\/$/);
  await page.goto('/intern/redaktion/');
  await expect(page.locator('[data-access]').getByRole('link', { name: /^Freigaben\s*1/ })).toBeVisible();
});

test('Freigaben: ohne Rolle Presse/Vorstand kein Zugang', async ({ page }) => {
  await redaktion(page, 'mitglied');
  await page.goto('/intern/redaktion/freigaben/');
  await expect(page.getByText(/Freigeben dürfen Mitglieder mit der Rolle/)).toBeVisible();
  await expect(page.locator('[data-access]')).toBeHidden();
});

/** Seite der Website auf „Texte“ wählen: Liste links, auf dem Handy das Auswahlfeld */
const textSeite = async (page: Page, isMobile: boolean, titel: string) =>
  isMobile
    ? page.getByLabel('Seite der Website').selectOption({ label: titel })
    : page.getByRole('navigation', { name: 'Seiten der Website' }).getByRole('button', { name: new RegExp(`^${titel.replace(/[()]/g, '\\$&')}`) }).click();

test('Texte: ändern, Englisch prüfen, Regeln, ursprünglicher Text', async ({ page, isMobile }) => {
  const gespeichert = await redaktion(page);
  const PFAD = 'src/settings/texte.json';
  await page.goto('/intern/redaktion/texte/');
  await expect(page.getByRole('navigation', { name: 'Interner Bereich' }).getByRole('link', { name: 'Texte' })).toHaveAttribute('aria-current', 'page');
  // auf dem Handy ist die Liste ausgeblendet (dort das Auswahlfeld), daher ohne Rolle gesucht
  const seiten = page.locator('.tx-seiten');
  // alle Seiten der Website in Gruppen, in der Reihenfolge des Menüs
  const titel = ['Menü, Fuß und Hinweise', 'Startseite', 'Tanzkalender und Termine', 'Formate', 'News', 'Profitraining (KEEP UP)', 'Über uns', 'Spenden',
    'Netzwerk', 'Profil einer Person', 'Mitglied werden', 'Kooperationen', 'Tanzkalender-Archiv', 'Kontakt', 'Barrierefreiheit und Textseiten',
    'Seite nicht gefunden (404)', 'Mitgliedsausweis prüfen', 'Rechtliches (nur Vorstand)'];
  await expect(seiten.locator('[data-seite-wahl] span:first-child')).toHaveText(titel);
  await expect(seiten.locator('.tx-seiten__gruppe')).toHaveText(['Auf jeder Seite', 'Seiten im Menü', 'Weitere Seiten', 'Selten gebraucht']);
  await expect(page.locator('[data-seiten-wahl] option')).toHaveText(titel);
  await expect(seiten.locator('[data-seite-wahl="allgemein"]')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('[data-seiten-wahl]')).toHaveValue('allgemein');
  // Rechtliches: Presse liest nur
  await textSeite(page, isMobile, 'Rechtliches (nur Vorstand)');
  await expect(page.getByText('Diese Texte ändert nur der Vorstand. Du kannst sie hier lesen.')).toBeVisible();
  await expect(page.locator('[data-text="rechtliches.impressum.h"]').getByLabel('Deutsch')).toHaveAttribute('readonly', '');
  await textSeite(page, isMobile, 'Startseite');
  // Abschnitte als Sprungmarken (Liste links) und Wegweiser zu dem, was anderswo gepflegt wird
  if (!isMobile) await expect(seiten.locator('[data-abschnitte-von="startseite"]').getByRole('link')).toHaveText(['Kopf', 'Termine und News', 'Formate', 'Eine Stadt. Ein Netz.', 'Mitglied werden']);
  await expect(page.locator('.tx-auch', { hasText: 'Tanz für' }).getByRole('link', { name: '„Tanz für …“ mit den wechselnden Wörtern' })).toHaveAttribute('href', /intern\/redaktion\/eintrag\/\?b=hero&von=startseite\.kopf$/);
  await expect(page.locator('.tx-auch', { hasText: 'Die Termine selbst' }).getByRole('link', { name: 'Die Termine selbst' })).toHaveAttribute('href', /intern\/kalender\/$/);

  // Überschrift „Werde Teil / des Netzes.“: zwei Zeilen, nur Deutsch ändern
  const karte = page.locator('[data-text="startseite.mitglied.titel"]');
  await expect(karte).toContainText('Überschrift in zwei Zeilen');
  const de = karte.getByLabel('Deutsch');
  await expect(de).toHaveValue('Werde Teil\ndes Netzes.');
  await de.fill('Werde Teil des Netzes.');
  await expect(karte.locator('[data-fehler]').first()).toHaveText('Deutsch: Bitte genau 2 Zeilen (neue Zeile mit der Eingabetaste).');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.locator('[data-msg]')).toHaveText('Bitte zuerst den markierten Text korrigieren.');
  expect(gespeichert).toHaveLength(0);
  await de.fill('Mach mit\nim Netz.');
  await expect(karte.locator('[data-fehler]').first()).toHaveText('');
  await expect(page.locator('[data-bar-n]')).toHaveText('1 Text geändert, noch nicht gespeichert');

  // Platzhalter muss bleiben (Suche über alle Seiten)
  await page.getByPlaceholder(/Suchen/).fill('Profile →');
  const alle = page.locator('[data-text="startseite.netz.alle"]');
  await expect(alle).toBeVisible();
  await expect(page.locator('[data-text="startseite.mitglied.titel"]')).toBeHidden();
  await alle.getByLabel('Englisch').fill('All profiles →');
  await expect(alle.locator('[data-fehler]').nth(1)).toContainText('{zahl} muss im Text bleiben');
  await alle.getByLabel('Englisch').fill('All {zahl} profiles →');
  await page.getByPlaceholder(/Suchen/).fill('');

  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.locator('[data-msg]')).toHaveText('Gespeichert: 1 Text. Die Website zeigt das in 2–3 Minuten.');
  expect(gespeichert).toHaveLength(1);
  expect(gespeichert[0].nachricht).toBe('Texte: Startseite (1 Text)');
  expect(gespeichert[0].aenderungen[0]).toMatchObject({ pfad: PFAD, alt: aktuell(PFAD) });
  const neu = JSON.parse(gespeichert[0].aenderungen[0].text!);
  expect(neu.startseite.abschnitte.mitglied.texte.titel).toEqual({
    wo: 'Überschrift in zwei Zeilen', zeilen: 2, de: 'Mach mit\nim Netz.', en: 'Become part\nof the network.', max: 40,
    ursprung: { de: 'Werde Teil\ndes Netzes.', en: 'Become part\nof the network.' }, enPruefen: true,
  });
  // sonst unverändert und im selben Format: nur diese eine Zeile ist anders
  const vorher = readFileSync(PFAD, 'utf8').split('\n');
  const nachher = gespeichert[0].aenderungen[0].text!.split('\n');
  expect(nachher).toHaveLength(vorher.length);
  expect(nachher.filter((z, i) => z !== vorher[i])).toHaveLength(1);
});

test('Texte: Englisch prüfen, ursprünglichen Text zurückholen, Filter, Textbuch', async ({ page }) => {
  const gespeichert = await redaktion(page);
  // Stand wie nach einer früheren Änderung: Datei der nachgebauten Funktion austauschen
  const PFAD = 'src/settings/texte.json';
  const datei = JSON.parse(readFileSync(PFAD, 'utf8'));
  Object.assign(datei.profil.abschnitte.kopf.texte.anfrage, { de: 'Anfragen', ursprung: { de: 'Anfrage senden', en: 'Send a request' }, enPruefen: true });
  const text = JSON.stringify(datei);
  await page.route(`${SB}/functions/v1/inhalte`, async (route) => {
    const body = route.request().postDataJSON();
    if (body.aktion !== 'lesen') return route.fallback();
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ head: 'h1', dateien: { [PFAD]: { sha: 'x1', text } } }) });
  });
  await page.goto('/intern/redaktion/texte/');
  await page.getByRole('button', { name: /^Englisch prüfen/ }).click();
  await expect(page.getByRole('button', { name: /^Englisch prüfen/ })).toContainText('(1)');
  const karte = page.locator('[data-text="profil.kopf.anfrage"]');
  await expect(karte).toBeVisible();
  await expect(page.locator('.tx-karte:visible')).toHaveCount(1);
  await expect(karte).toContainText('Deutsch wurde geändert: Englisch prüfen.');
  await karte.getByRole('button', { name: 'Englisch passt so' }).click();
  await expect(page.locator('[data-bar-n]')).toHaveText('1 Text geändert, noch nicht gespeichert');
  await page.getByRole('button', { name: 'Änderungen verwerfen' }).click();
  await expect(page.locator('[data-bar]')).toBeHidden();

  // ursprünglichen Text zurückholen: danach ohne Merker gespeichert
  await karte.getByRole('button', { name: 'Ursprünglichen Text zurückholen' }).click();
  await expect(karte.getByLabel('Deutsch')).toHaveValue('Anfrage senden');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.locator('[data-msg]')).toContainText('Gespeichert');
  const neu = JSON.parse(gespeichert[0].aenderungen[0].text!);
  expect(neu.profil.abschnitte.kopf.texte.anfrage).toEqual({ wo: 'Knopf unter dem Namen', de: 'Anfrage senden', en: 'Send a request', max: 30 });
  expect(gespeichert[0].aenderungen[0].alt).toBe('x1');

  // Textbuch
  await page.goto('/intern/redaktion/texte/textbuch/');
  await expect(page.getByRole('heading', { name: 'Textbuch' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Startseite', exact: true })).toContainText('Werde Teil');
  await expect(page.getByRole('button', { name: 'Drucken oder als PDF speichern' })).toBeVisible();
});

test('Texte: Regeln (Platzhalter, Zeilen, Format der Datei)', async ({}, info) => {
  test.skip(info.project.name !== 'desktop', 'ohne Browser, einmal reicht');
  const { fuellen, textPruefen, dateiText, uebernehmen, alleTexte } = await import('../src/lib/texte-regeln');
  expect(fuellen('Alle {zahl} Profile →', { zahl: 72 })).toBe('Alle 72 Profile →');
  expect(fuellen('Alle {zahl} Profile →', {})).toBe('Alle Profile →');
  expect(fuellen('{name} arbeitet', {})).toBe('arbeitet');
  expect(textPruefen({ max: 10 }, 'x'.repeat(11), 'x', 'de')).toBe('Deutsch: 11 Zeichen, erlaubt sind 10.');
  expect(textPruefen({}, '', 'x', 'en')).toBeNull();
  expect(textPruefen({}, 'Hallo {vorname}', 'Hallo {name}', 'de')).toContain('{name} muss im Text bleiben');
  expect(textPruefen({}, '<b>x</b>', 'x', 'de')).toContain('kein HTML');
  const roh = readFileSync('src/settings/texte.json', 'utf8');
  const datei = JSON.parse(roh);
  expect(dateiText(datei)).toBe(roh);
  // jeder Text: Deutsch da, Platzhalter in beiden Sprachen gleich, Regeln eingehalten
  for (const { seite, abschnitt, key, e } of alleTexte(datei)) {
    const wo = `${seite}.${abschnitt}.${key}`;
    expect(e.wo, wo).toBeTruthy();
    expect(textPruefen(e, e.de, e.de, 'de'), wo).toBeNull();
    expect(textPruefen(e, e.en, e.de, 'en'), wo).toBeNull();
  }
  // nur Englisch angepasst: kein Merker „Englisch prüfen“, ursprung bleibt
  const n = uebernehmen(datei, new Map([['startseite.formate.titel', { de: 'Formate & Reihen', en: 'Formats and series' }]]));
  expect(n).toBe(1);
  expect(datei.startseite.abschnitte.formate.texte.titel).toMatchObject({ en: 'Formats and series', ursprung: { en: 'Formats & series' } });
  expect(datei.startseite.abschnitte.formate.texte.titel.enPruefen).toBeUndefined();
});

test('Seiten: Seite → Abschnitt → Element, mit Breadcrumbs bis zum Eintrag', async ({ page }) => {
  await redaktion(page);
  await page.goto('/intern/redaktion/seiten/');
  await expect(page.getByRole('heading', { name: 'Seiten', level: 1 })).toBeVisible();
  const krumen = page.getByRole('navigation', { name: 'Du bist hier' });
  await expect(krumen.getByRole('listitem')).toHaveText(['Website-Inhalte', 'Seiten']);
  // eine Seite: Abschnitte in der Reihenfolge der Website, je Abschnitt Texte und was dort sonst steht
  await page.getByRole('link', { name: 'Startseite' }).first().click();
  await expect(page.getByRole('heading', { name: 'Startseite', level: 1 })).toBeVisible();
  await expect(krumen.getByRole('listitem')).toHaveText(['Website-Inhalte', 'Seiten', 'Startseite']);
  const seite = page.locator('[data-seite="startseite"]');
  await expect(seite.locator('.sp-abschnitt h3')).toHaveText(['Kopf', 'Termine und News', 'Formate', 'Eine Stadt. Ein Netz.', 'Mitglied werden']);
  const kopf = seite.locator('[data-abschnitt="startseite.kopf"]');
  await expect(kopf.getByRole('link', { name: /^Texte 5 Texte/ })).toHaveAttribute('href', /redaktion\/texte\/\?seite=startseite#abschnitt-startseite-kopf$/);
  await kopf.getByRole('link', { name: /„Tanz für …“ mit den wechselnden Wörtern/ }).click();
  // Einstellung „Startseite: Kopf“: Breadcrumbs mit Seite und Abschnitt, „Erscheint auf …“
  await expect(page.getByRole('heading', { name: 'Startseite: Kopf', level: 1 })).toBeVisible();
  await expect(krumen.getByRole('listitem')).toHaveText(['Website-Inhalte', 'Seiten', 'Startseite', 'Kopf', 'Startseite: Kopf']);
  await expect(page.getByText('Erscheint auf der Website:')).toContainText('Startseite › Kopf');

  // Liste mit Eintrag: Formate erscheint an mehreren Stellen, die Breadcrumbs folgen dem Weg
  await page.goto('/intern/redaktion/liste/?b=formate&von=formate.detail');
  await expect(krumen.getByRole('listitem')).toHaveText(['Website-Inhalte', 'Seiten', 'Formate', 'Formate im Detail', 'Formate']);
  await expect(page.getByText('Erscheint auf der Website:')).toContainText('Startseite › Formate');
  await page.locator('.r-zeile__link').first().click();
  await expect(krumen.getByRole('listitem')).toHaveCount(6);
  await expect(krumen.getByRole('listitem').nth(4)).toHaveText('Formate');
  await expect(krumen.getByRole('link', { name: 'Formate', exact: true }).last()).toHaveAttribute('href', /liste\/\?b=formate&von=formate\.detail$/);
  await expect(page).toHaveURL(/von=formate\.detail/);

  // Texte: Breadcrumbs mit der gewählten Seite
  await page.goto('/intern/redaktion/texte/?seite=formate');
  await expect(krumen.getByRole('listitem')).toHaveText(['Website-Inhalte', 'Texte', 'Formate']);
});

test('Seiten: jeder Bereich der Redaktion ist von einer Seite aus erreichbar', async () => {
  // Bereiche in src/scripts/intern/redaktion/bereiche.ts, Seitenplan aus texte.json („auch“ je Abschnitt)
  const ids = [...readFileSync('src/scripts/intern/redaktion/bereiche.ts', 'utf8').matchAll(/^ {4}id: '([a-z-]+)',$/gm)].map((m) => m[1]);
  expect(ids.length).toBeGreaterThan(15);
  const texte = JSON.parse(readFileSync('src/settings/texte.json', 'utf8')) as Record<string, { abschnitte?: Record<string, { auch?: { ziel: string }[] }> }>;
  const ziele = new Set(Object.values(texte).flatMap((s) => Object.values(s.abschnitte ?? {}).flatMap((a) => (a.auch ?? []).map((x) => x.ziel))));
  expect(ids.filter((id) => !ziele.has(`redaktion:${id}`))).toEqual([]);
  // und jedes Ziel gibt es
  for (const z of ziele) if (z.startsWith('redaktion:')) expect(ids, z).toContain(z.slice(10));
});

test('Verwaltung: nur Vorstand und Admin, mit Rechtlichem, Demo-Ansicht und Verlauf', async ({ page }) => {
  await redaktion(page);
  await page.goto('/intern/redaktion/verwaltung/');
  await expect(page.getByText('Die Verwaltung ist für den Vorstand und den Admin.')).toBeVisible();
  await expect(page.getByRole('link', { name: /^Impressum/ })).toBeHidden();

  await page.context().clearCookies();
  const p2 = await page.context().newPage();
  await redaktion(p2, 'vorstand');
  await p2.goto('/intern/redaktion/verwaltung/');
  await expect(p2.getByRole('heading', { name: 'Verwaltung', level: 1 })).toBeVisible();
  await expect(p2.getByRole('navigation', { name: 'Interner Bereich' }).getByRole('link', { name: 'Verwaltung' })).toHaveAttribute('aria-current', 'page');
  await expect(p2.getByRole('link', { name: /^Impressum/ })).toHaveAttribute('href', /eintrag\/\?b=seiten&id=impressum$/);
  await expect(p2.getByLabel('Demo-Ansicht')).toBeVisible();
  await expect(p2.getByText('Termin „POP UP“ geändert')).toBeVisible();
  // Sprung in den Abschnitt der Vereinsdaten
  await p2.getByRole('link', { name: /^Kontakt und Bankverbindung/ }).click();
  await expect(p2.locator('#abschnitt-kontakt-und-bankverbindung')).toBeInViewport();
  await expect(feld(p2, 'IBAN')).toBeEnabled();
});

test('Ausblenden: Eintrag, Termin, Listeneintrag und Wort – gespeichert wird nur die Markierung', async ({ page }) => {
  const gespeichert = await redaktion(page);
  // Person: Schalter oben im Formular, Label am Titel
  await page.goto('/intern/redaktion/eintrag/?b=personen&id=alba-t-alvarez');
  const schalter = page.getByRole('switch', { name: 'Auf der Website anzeigen' }).first();
  await expect(schalter).toBeChecked();
  await expect(page.locator('[data-aus-label]')).toBeHidden();
  await schalter.uncheck();
  await expect(page.locator('[data-aus-label]')).toBeVisible();
  await expect(page.getByText('Ausgeblendet', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect.poll(() => gespeichert.length).toBe(1);
  const personen = parse(gespeichert[0].aenderungen[0].text!) as { id: string; sichtbar?: boolean }[];
  expect(personen.find((p) => p.id === 'alba-t-alvarez')?.sichtbar).toBe(false);
  expect(personen.filter((p) => p.sichtbar === false)).toHaveLength(1);
  await expect(page.getByText('Gespeichert. Die Website ist in etwa 2–3 Minuten aktualisiert.')).toBeVisible();

  // Termin: derselbe Schalter setzt „draft“ (kein zweites Feld)
  await page.goto('/intern/redaktion/eintrag/?b=termine&id=2026-10-15-studio-round-9');
  await page.getByRole('switch', { name: 'Auf der Website anzeigen' }).uncheck();
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect.poll(() => gespeichert.length).toBe(2);
  expect(frontmatter(gespeichert[1].aenderungen[0].text!)).toMatchObject({ draft: true });
  expect(frontmatter(gespeichert[1].aenderungen[0].text!).sichtbar).toBeUndefined();
  await expect(page.getByText('Gespeichert. Die Website ist in etwa 2–3 Minuten aktualisiert.')).toBeVisible();

  // Listeneintrag (Förderer) und einzelnes Wort (Partner auf der Startseite)
  await page.goto('/intern/redaktion/eintrag/?b=verein');
  const foerderer = page.locator('.rf-item').filter({ hasText: 'Amt für Kultur' }).first();
  await foerderer.getByRole('switch', { name: 'Auf der Website anzeigen' }).uncheck();
  await expect(foerderer).toHaveClass(/is-aus/);
  await page.getByRole('button', { name: 'Ausblenden: TENZA' }).click();
  await expect(page.getByRole('button', { name: 'Einblenden: TENZA' })).toBeVisible();
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect.poll(() => gespeichert.length).toBe(3);
  const verein = JSON.parse(gespeichert[2].aenderungen[0].text!);
  expect(verein.funders.filter((f: { sichtbar?: boolean }) => f.sichtbar === false)).toHaveLength(1);
  expect(verein.partners).toContainEqual({ text: 'TENZA', sichtbar: false });
  expect(verein.partners.filter((p: unknown) => typeof p === 'object')).toHaveLength(1);
});

test('Ausblenden: Liste zeigt Ausgeblendetes markiert und filtert danach', async ({ page }) => {
  await redaktion(page);
  // ausgeblendeten Eintrag nachbauen: der Mock liefert die Datei mit „sichtbar: false“ für Alba
  await page.route('**/functions/v1/inhalte', async (route) => {
    const body = route.request().postDataJSON();
    if (body.aktion !== 'lesen' || !body.pfade.includes('src/content/personen.yaml')) return route.fallback();
    const dateien = Object.fromEntries((body.pfade as string[]).map((p) => {
      const text = readFileSync(p, 'utf8');
      return [p, { sha: aktuell(p), text: p.endsWith('personen.yaml') ? text.replace('- id: alba-t-alvarez\n', '- id: alba-t-alvarez\n  sichtbar: false\n') : text }];
    }));
    return route.fulfill({ json: { head: 'h1', dateien }, headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await page.goto('/intern/redaktion/liste/?b=personen');
  const zeile = page.locator('.r-zeile', { hasText: 'Alba T Álvarez' });
  await expect(zeile).toHaveClass(/is-aus/);
  await expect(zeile.getByText('Ausgeblendet')).toBeVisible();
  await expect(zeile.getByRole('link', { name: /auf der Website ansehen/ })).toHaveCount(0);
  const filter = page.getByRole('group', { name: 'Auf der Website' });
  await filter.getByRole('button', { name: /^Ausgeblendet/ }).click();
  await expect(page.locator('.r-zeile')).toHaveCount(1);
  await filter.getByRole('button', { name: /^Sichtbar/ }).click();
  await expect(page.locator('.r-zeile', { hasText: 'Alba T Álvarez' })).toHaveCount(0);
});

test('Ausblenden: Texte und ganze Abschnitte, nur wo vorgesehen', async ({ page }) => {
  const gespeichert = await redaktion(page);
  await page.goto('/intern/redaktion/texte/?seite=startseite');
  const netz = page.locator('[data-abschnitt="startseite.netz"]');
  await netz.getByRole('switch', { name: /Abschnitt „Eine Stadt. Ein Netz.“/ }).uncheck();
  await expect(netz).toHaveClass(/is-aus/);
  // Überschriften haben keinen Schalter, die Einleitung von „Mitglied werden“ schon
  await expect(page.locator('[data-text="startseite.netz.titel"]').getByRole('switch')).toHaveCount(0);
  await page.locator('[data-text="startseite.mitglied.lead"]').getByRole('switch').uncheck();
  await expect(page.locator('[data-text="startseite.mitglied.lead"]')).toHaveClass(/is-aus/);
  await expect(page.getByText('2 Texte geändert, noch nicht gespeichert')).toBeVisible();
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect.poll(() => gespeichert.length).toBe(1);
  const d = JSON.parse(gespeichert[0].aenderungen[0].text!);
  expect(d.startseite.abschnitte.netz.aus).toBe(true);
  expect(d.startseite.abschnitte.mitglied.texte.lead.aus).toBe(true);
  expect(d.startseite.abschnitte.mitglied.aus).toBeUndefined();
});

test('Text-Editor: „Bild aus Medien“ fügt ein Foto der Mediathek als Bilder-Abschnitt ein, Beschreibung ist Pflicht', async ({ page }) => {
  const gespeichert = await redaktion(page);
  // Mediathek nachbauen: ein Foto ohne Beschreibung
  await page.route(`${SB}/rest/v1/news_medien**`, (route) =>
    route.fulfill({ json: [{ datei: '2026/probe.jpg', alt: '', alt_en: '', credit: '', focus: null }], headers: { 'Access-Control-Allow-Origin': '*', 'content-range': '0-0/1' } }));
  await page.route(`${SB}/storage/v1/object/list/**`, (route) => route.fulfill({ json: [], headers: { 'Access-Control-Allow-Origin': '*' } }));
  const id = readdirSync('src/content/news/de').map((n) => n.replace(/\.md$/, '')).find((n) => {
    const t = readFileSync(`src/content/news/de/${n}.md`, 'utf8');
    return /^author:/m.test(t) && (!/^image:/m.test(t) || /^alt:/m.test(t));
  })!;
  await page.goto(`/intern/redaktion/eintrag/?b=news&id=${id}`);
  await page.locator('.rt__eingabe').first().click();
  await page.keyboard.press('Control+End');
  page.once('dialog', (d) => void d.accept('Zwei Tänzerinnen bei der Probe'));
  await page.getByRole('button', { name: 'Bild aus Medien einfügen' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: /^Foto probe\.jpg wählen/ }).click();
  await expect(page.locator('.rt-roh', { hasText: 'Bilder-Abschnitt · 1 Foto' }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect.poll(() => gespeichert.length).toBe(1);
  const text = gespeichert[0].aenderungen[0].text!;
  expect(text).toMatch(/::: bilder\n[\s\S]*datei: 2026\/probe\.jpg\n\s+alt: Zwei Tänzerinnen bei der Probe[\s\S]*\n:::/);
});

test('Vorschau im Formular: Seite daneben, Änderungen vor dem Speichern, Ausgeblendetes markiert, Geräte', async ({ page, isMobile }) => {
  await redaktion(page);
  await page.goto('/intern/redaktion/eintrag/?b=formate&id=pop-up');
  // schmale Bildschirme: Vorschau öffnet als Fenster
  if (isMobile) await page.locator('[data-vs-auf]').click();
  const panel = page.getByRole('region', { name: 'Vorschau der Website' });
  await expect(panel).toBeVisible();
  const seite = page.frameLocator('[data-vorschau] iframe');
  await expect(seite.locator('#pop-up')).toBeVisible({ timeout: 15000 });
  if (isMobile) await panel.getByRole('button', { name: 'Schließen' }).click();
  await feld(page, 'Name').fill('POP UP Sommer');
  await expect(seite.locator('#pop-up')).toContainText('POP UP Sommer');
  await page.getByRole('switch', { name: 'Auf der Website anzeigen' }).first().uncheck();
  await expect(seite.locator('#pop-up')).toHaveAttribute('data-vs-aus', '');
  // nichts gespeichert: die Website selbst ist unverändert
  if (isMobile) await page.locator('[data-vs-auf]').click();
  await panel.getByRole('button', { name: 'Handy' }).click();
  await expect(panel).toHaveAttribute('data-geraet', 'handy');
  expect(await page.locator('[data-vorschau] iframe').evaluate((f: HTMLIFrameElement) => f.style.width)).toBe('390px');
});

test('Mehr Platz für die Vorschau: Seitenleiste einklappen, Trenner ziehen, Vollbild', async ({ page, isMobile }) => {
  test.skip(isMobile, 'auf schmalen Bildschirmen liegt die Vorschau ohnehin als Fenster über dem Formular');
  await page.setViewportSize({ width: 1600, height: 1000 });
  await redaktion(page);
  await page.goto('/intern/redaktion/eintrag/?b=formate&id=pop-up');
  const panel = page.getByRole('region', { name: 'Vorschau der Website' });
  await expect(panel).toBeVisible();
  const breite = () => page.locator('[data-form]').evaluate((f) => f.getBoundingClientRect().width);

  // Seitenleiste einklappen: das Formular wird breiter, der Zustand bleibt nach dem Neuladen
  const vorher = await panel.evaluate((p) => p.getBoundingClientRect().width);
  await page.getByRole('button', { name: 'Seitenleiste einklappen' }).click();
  await expect(page.getByRole('button', { name: 'Seitenleiste zeigen' })).toHaveAttribute('aria-expanded', 'false');
  expect(await page.locator('[data-side]').evaluate((s) => s.getBoundingClientRect().width)).toBeLessThan(60);
  await expect.poll(() => panel.evaluate((p) => p.getBoundingClientRect().width)).toBeGreaterThan(vorher + 100);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Seitenleiste zeigen' })).toBeVisible();

  // Trenner mit der Tastatur: Formular schmaler, Vorschau breiter; gemerkt
  const griff = page.getByRole('separator', { name: 'Breite von Formular und Vorschau' });
  await expect(griff).toBeVisible();
  const formVorher = await breite();
  await griff.focus();
  await page.keyboard.press('Home');
  await expect(griff).toHaveAttribute('aria-valuenow', '25');
  expect(await breite()).toBeLessThan(formVorher - 200);
  await page.reload();
  await expect(griff).toHaveAttribute('aria-valuenow', '25');
  // ziehen mit der Maus
  const box = (await griff.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(box.x + 400, box.y + 200, { steps: 5 });
  await page.mouse.up();
  expect(Number(await griff.getAttribute('aria-valuenow'))).toBeGreaterThan(40);

  // Vollbild: Vorschau über dem ganzen Fenster, Esc schließt
  await panel.getByRole('button', { name: 'Vollbild' }).click();
  await expect.poll(() => panel.evaluate((p) => p.getBoundingClientRect().width)).toBe(1600);
  await page.keyboard.press('Escape');
  await expect(panel.getByRole('button', { name: 'Vollbild' })).toHaveAttribute('aria-pressed', 'false');
  expect(await panel.evaluate((p) => p.getBoundingClientRect().width)).toBeLessThan(1200);

  // zurück: Leiste wieder zeigen
  await page.getByRole('button', { name: 'Seitenleiste zeigen' }).click();
  expect(await page.locator('[data-side]').evaluate((s) => s.getBoundingClientRect().width)).toBeGreaterThan(200);
});

test('Vorschau in Texte: geänderter Text und ausgeblendeter Abschnitt erscheinen sofort', async ({ page, isMobile }) => {
  test.skip(isMobile, 'gleiche Logik, auf dem Handy als Fenster');
  await redaktion(page);
  await page.goto('/intern/redaktion/texte/?seite=startseite');
  const seite = page.frameLocator('[data-vorschau] iframe');
  await expect(seite.locator('[data-abschnitt="startseite.mitglied"]')).toBeVisible({ timeout: 15000 });
  const lead = page.locator('[data-text="startseite.mitglied.lead"] textarea[data-sprache="de"]');
  await lead.fill('Werde Teil des Netzes: neuer Text in der Vorschau.');
  await expect(seite.locator('[data-abschnitt="startseite.mitglied"]')).toContainText('neuer Text in der Vorschau');
  await page.locator('[data-abschnitt="startseite.netz"]').getByRole('switch').uncheck();
  await expect(seite.locator('[data-abschnitt="startseite.netz"]')).toHaveAttribute('data-vs-aus', '');
  // „Ausgeblendetes markiert zeigen“ aus: der Abschnitt verschwindet ganz
  await page.getByLabel('Ausgeblendetes markiert zeigen').uncheck();
  await expect(seite.locator('[data-abschnitt="startseite.netz"]')).toBeHidden();
});

test('Medien: Reiter, Fotos der Seiten mit Verwendung, PDFs hochladen', async ({ page }) => {
  const gespeichert = await redaktion(page);
  await page.goto('/intern/redaktion/medien/?art=seiten');
  const reiter = page.getByRole('navigation', { name: 'Medien' });
  await expect(reiter.getByRole('link', { name: 'Fotos der Seiten' })).toHaveAttribute('aria-current', 'page');
  await expect(reiter.getByRole('link', { name: 'Fotos für Beiträge' })).toHaveAttribute('href', /intern\/news\/medien\/$/);
  const zeile = page.locator('.mr-zeile', { hasText: 'duo-rot.jpg' });
  await expect(zeile).toContainText('Wird verwendet auf');
  await expect(zeile.getByRole('link', { name: /^Format „/ }).first()).toHaveAttribute('href', /eintrag\/\?b=formate&id=/);
  // verwendete Fotos lassen sich nicht löschen
  await expect(zeile.getByRole('button', { name: /löschen/ })).toHaveCount(0);
  await zeile.scrollIntoViewIfNeeded();
  await expect(zeile.locator('img')).toHaveAttribute('src', /^blob:/);

  await page.goto('/intern/redaktion/medien/?art=dokumente');
  await expect(page.getByRole('heading', { name: 'Dokumente (PDF)' })).toBeVisible();
  await page.locator('input[data-upload]').setInputFiles({ name: 'Satzung 2027.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF\n') });
  await expect.poll(() => gespeichert.length).toBe(1);
  expect(gespeichert[0].aenderungen[0]).toMatchObject({ pfad: 'public/downloads/satzung-2027.pdf', alt: null });
  await expect(page.locator('.mr-zeile', { hasText: 'satzung-2027.pdf' })).toContainText('Nirgends');
});

const AXE: [string, 'presse' | 'vorstand'][] = [
  ...['/intern/redaktion/texte/', '/intern/redaktion/texte/textbuch/', '/intern/redaktion/freigaben/', '/intern/redaktion/', '/intern/redaktion/seiten/',
    '/intern/redaktion/seiten/?s=startseite', '/intern/redaktion/liste/?b=termine', '/intern/redaktion/eintrag/?b=termine&id=2026-10-15-studio-round-9',
    '/intern/redaktion/eintrag/?b=verein', '/intern/redaktion/vorschau/', '/intern/redaktion/medien/?art=seiten', '/intern/redaktion/medien/?art=dokumente'].map((p): [string, 'presse'] => [p, 'presse']),
  ['/intern/redaktion/verwaltung/', 'vorstand'],
];
for (const [pfad, rolle] of AXE) {
  test(`${pfad} ist barrierearm (axe)`, async ({ page }) => {
    await redaktion(page, rolle);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(pfad);
    await expect(page.locator('[data-access]')).toBeVisible();
    await page.waitForLoadState('networkidle');
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    const serious = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
  });
}
