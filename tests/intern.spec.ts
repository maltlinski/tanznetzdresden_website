/**
 * Interner Bereich (Entwurf Mitgliedsstatus): gemeinsamer Rahmen mit Seitenleiste, „Mein Status“ mit
 * Mitgliedsausweis, Pflege der Mitgliedschaften durch den Vorstand, öffentliche Prüfseite und die Blende
 * von „Login“ auf der Website. Supabase ist nachgebaut (tests/redaktion-mock.ts).
 */
import { test, expect } from '@playwright/test';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { redaktion } from './redaktion-mock';
import { handle, type Env } from '../supabase/functions/ausweis/index';

const J = new Date().getFullYear();
const CODE = '6f1c2b3a-0000-4000-8000-000000000001';
const lea = { display_name: 'Lea Sommer', role: 'mitglied' };
const ms = (z: Record<string, unknown> = {}) => ({
  person: 'u1', nummer: 'TNDD-2019-047', art: 'Ordentliches Mitglied', seit: '2019-03-01', bezahlt_bis: J, bezahlt_am: `${J}-02-14`,
  ende: null, pruefcode: CODE, updated_at: `${J}-01-06T10:00:00Z`, ...z,
});

test('Rahmen: Seitenleiste für Mitglieder, Redaktion nur mit Rolle', async ({ page, isMobile }) => {
  await redaktion(page, { profil: lea, mitgliedschaft: ms() });
  await page.goto('/intern/');
  const nav = page.getByRole('navigation', { name: 'Interner Bereich' });
  await expect(nav.getByRole('link')).toHaveText(['Mein Status', 'Mein Profil', 'Mitglieder', 'Dokumente']);
  await expect(nav.getByRole('link', { name: 'Mein Status' })).toHaveAttribute('aria-current', 'page');
  if (!isMobile) {
    await expect(page.locator('[data-intern-name]').first()).toHaveText('Lea Sommer');
    await expect(page.locator('[data-intern-unterzeile]')).toHaveText('Mitglied seit 2019');
  }

  // Presse: dieselbe Leiste, darunter die Redaktion
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await redaktion(page, { profil: { display_name: 'Pia Presse' }, mitgliedschaft: ms({ seit: '2021-05-01' }) });
  await page.goto('/intern/news/');
  await expect(nav.getByRole('link')).toHaveText(['Mein Status', 'Mein Profil', 'Mitglieder', 'Dokumente', /^Beiträge/, /^Medien/, 'Website-Inhalte', /^Freigaben/]);
  await expect(nav.getByRole('link', { name: /^Beiträge/ })).toHaveAttribute('aria-current', 'page');
  if (!isMobile) await expect(page.locator('[data-intern-unterzeile]')).toHaveText('Mitglied seit 2021 · Presse');
});

test('Mein Status: aktiver Ausweis zum Umdrehen, Angaben, PDF', async ({ page }) => {
  await redaktion(page, { profil: lea, mitgliedschaft: ms() });
  await page.goto('/intern/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mein Status');
  await expect(page.locator('.ms-lead')).toHaveText(`Hallo Lea. Deine Mitgliedschaft ist aktiv bis 31. Dezember ${J}.`);
  await expect(page.locator('[data-ms-badge]')).toHaveText('Aktiv');
  await expect(page.locator('[data-ms-daten] dd')).toHaveText(['TNDD-2019-047', 'Ordentliches Mitglied', 'März 2019', `Bezahlt am 14. Februar ${J}`, `31.12.${J}`]);
  await expect(page.locator('[data-ms-stempel]')).toBeHidden();
  await expect(page.locator('[data-ms-cta]')).toBeHidden();
  // Rückseite mit QR-Code zur Prüfseite
  await expect(page.locator('[data-ausweis-hinten] [data-ms-qr] svg')).toHaveCount(1);
  await page.getByRole('button', { name: 'Rückseite' }).click();
  await expect(page.locator('[data-ausweis]')).toHaveAttribute('data-hinten', '');
  await expect(page.getByRole('button', { name: 'Rückseite' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Ausweis umdrehen' }).click();
  await expect(page.locator('[data-ausweis]')).not.toHaveAttribute('data-hinten', '');
  // Google Wallet ist ausgeschaltet (settings/supabase.ts), PDF geht
  await expect(page.getByRole('button', { name: 'Zu Google Wallet hinzufügen' })).toHaveCount(0);
  await page.evaluate(() => (window.print = () => document.body.setAttribute('data-gedruckt', document.title)));
  await page.getByRole('button', { name: 'Als PDF speichern' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-gedruckt', 'Mitgliedsausweis-TNDD-2019-047');
  await expect(page.locator('.ms-druck .ms-druck__karte')).toHaveCount(2);
});

test('Mein Status: Beitrag offen, ohne Daten und ohne Tabelle', async ({ page }) => {
  await redaktion(page, { profil: lea, mitgliedschaft: ms({ bezahlt_bis: J - 1, bezahlt_am: null }) });
  await page.goto('/intern/');
  await expect(page.locator('[data-ms-badge]')).toHaveText('Beitrag offen');
  await expect(page.locator('[data-ms-stempel]')).toHaveText('Beitrag offen');
  await expect(page.locator('[data-ms-cta]')).toContainText('Der Ausweis gilt erst mit bezahltem Jahresbeitrag.');
  await expect(page.locator('[data-ms-cta]').getByRole('button', { name: /Zahlungsinfos anfragen/ })).toBeVisible();
  await expect(page.locator('[data-ms-cta-mail="offen"] [data-protected-email]')).toHaveAttribute('data-subject', 'Mitgliedsbeitrag TNDD-2019-047');
  await expect(page.getByRole('button', { name: 'Als PDF speichern' })).toBeDisabled();
  await expect(page.locator('[data-ms-handy-text]')).toHaveText(`Verfügbar, sobald dein Beitrag für ${J} eingegangen ist.`);

  for (const mitgliedschaft of [null, undefined]) {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await redaktion(page, { profil: lea, mitgliedschaft });
    await page.goto('/intern/');
    await expect(page.locator('[data-ms-badge]')).toHaveText('In Vorbereitung');
    await expect(page.locator('.ms-lead')).toContainText('Deine Mitgliedsdaten trägt der Vorstand noch ein.');
  }
});

test('Mitglieder: Vorstand pflegt die Mitgliedschaft und bucht den Beitrag', async ({ page }) => {
  const m = await redaktion(page, {
    profil: { display_name: 'Vera Vorstand', role: 'vorstand' },
    mitgliedschaften: [ms({ person: 'm2', bezahlt_bis: J - 1, bezahlt_am: null })],
    verzeichnis: [
      { id: 'u1', display_name: 'Vera Vorstand', role: 'vorstand', ags: [] },
      { id: 'm2', display_name: 'Lea Sommer', role: 'mitglied', ags: [] },
    ],
  });
  await page.goto('/intern/mitglieder/');
  const karte = page.locator('.dir__card', { hasText: 'Lea Sommer' });
  await expect(karte.locator('.dir__ms-status')).toHaveText('TNDD-2019-047 · Beitrag offen');
  await karte.locator('.dir__ms summary').click();
  await karte.getByRole('button', { name: `Beitrag ${J} bezahlt` }).click();
  await expect(karte.locator('.dir__ms-status')).toHaveText('TNDD-2019-047 · aktiv');
  expect(m.mitgliedschaftGespeichert.at(-1)).toMatchObject({ person: 'm2', bezahlt_bis: J });
  await expect(karte.getByRole('button', { name: `Beitrag ${J} bezahlt` })).toBeHidden();

  // noch ohne Mitgliedschaft: anlegen, die Nummer vergibt die Datenbank
  const vera = page.locator('.dir__card', { hasText: 'Vera Vorstand' });
  await expect(vera.locator('.dir__ms-status')).toHaveText('noch nicht angelegt');
  await vera.locator('.dir__ms summary').click();
  await vera.getByLabel('Mitglied seit').fill('2018-01-01');
  await vera.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.locator('[data-dir-msg]')).toContainText('gespeichert (TNDD-2026-001)');
  expect(m.mitgliedschaftGespeichert.at(-1)).toMatchObject({ person: 'u1', nummer: null, seit: '2018-01-01' });
});

test('Ausweis prüfen: QR-Code führt zur Prüfseite', async ({ page }) => {
  await redaktion(page, { profil: lea, mitgliedschaft: ms() });
  await page.goto(`/mitglied/pruefen/?c=${CODE}`);
  await expect(page.locator('[data-pr-status]')).toHaveText('Gültig');
  await expect(page.locator('[data-pr-name]')).toHaveText('Lea Sommer');
  await expect(page.locator('[data-pr-bis]')).toHaveText(`31.12.${J}`);
  await page.goto('/mitglied/pruefen/?c=11111111-1111-4111-8111-111111111111');
  await expect(page.getByText('Nicht gefunden')).toBeVisible();
  await page.goto('/mitglied/pruefen/');
  await expect(page.getByText('Nicht gefunden')).toBeVisible();
});

test('Login auf der Website: Blende in den internen Bereich, ohne Blende bei „Bewegung reduzieren“', async ({ page, isMobile }) => {
  await redaktion(page, { profil: lea, mitgliedschaft: ms() });
  await page.goto('/');
  if (isMobile) await page.getByRole('button', { name: 'Menü' }).click();
  await page.locator('[data-login]').click();
  await expect(page.locator('[data-login-blende]')).toBeVisible();
  await page.waitForURL(/\/intern\/$/);
  await expect(page.getByRole('heading', { name: 'Mein Status' })).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/blende/, { timeout: 4000 });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  if (isMobile) await page.getByRole('button', { name: 'Menü' }).click();
  await page.locator('[data-login]').click();
  await page.waitForURL(/\/intern\/$/);
  await expect(page.locator('html')).not.toHaveClass(/blende/);
});

test.describe('Funktion „ausweis“ (Google Wallet)', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'ohne Browser, einmal reicht'));
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const env: Env = {
    issuerId: '3388000000012345678', saEmail: 'wallet@tndd.iam.gserviceaccount.com',
    saKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(), siteUrl: 'https://tanznetzdresden.de/',
    supabaseUrl: 'https://sb.test', anonKey: 'anon',
  };
  const supa = (zeile: Record<string, unknown> | null) =>
    (async (input: RequestInfo | URL) => {
      const u = new URL(String(input));
      const j = (b: unknown) => new Response(JSON.stringify(b), { headers: { 'Content-Type': 'application/json' } });
      if (u.pathname === '/auth/v1/user') return j({ id: 'u1' });
      if (u.pathname === '/rest/v1/profiles') return j([{ display_name: 'Lea Sommer' }]);
      if (u.pathname === '/rest/v1/mitgliedschaften') return j(zeile ? [zeile] : []);
      return new Response('?', { status: 404 });
    }) as typeof fetch;
  const req = () => new Request('https://fn.test/ausweis', { method: 'POST', headers: { Authorization: 'Bearer t' }, body: '{}' });

  test('signierter Link mit Name, Nummer und Prüf-QR', async () => {
    const res = await handle(req(), env, supa(ms()));
    expect(res.status).toBe(200);
    const { url } = (await res.json()) as { url: string };
    expect(url).toMatch(/^https:\/\/pay\.google\.com\/gp\/v\/save\//);
    const jwt = url.split('/').pop()!;
    const [kopf, inhalt, sig] = jwt.split('.');
    expect(createVerify('RSA-SHA256').update(`${kopf}.${inhalt}`).verify(publicKey, Buffer.from(sig, 'base64url'))).toBe(true);
    const p = JSON.parse(Buffer.from(inhalt, 'base64url').toString());
    expect(p).toMatchObject({ iss: env.saEmail, aud: 'google', typ: 'savetowallet', origins: ['https://tanznetzdresden.de'] });
    const o = p.payload.genericObjects[0];
    expect(o.header.defaultValue.value).toBe('Lea Sommer');
    expect(o.textModulesData).toContainEqual({ id: 'nummer', header: 'Mitgliedsnummer', body: 'TNDD-2019-047' });
    expect(o.barcode.value).toBe(`https://tanznetzdresden.de/mitglied/pruefen/?c=${CODE}`);
  });

  test('nur mit bezahltem Beitrag, eingerichtet und angemeldet', async () => {
    expect((await handle(req(), env, supa(ms({ bezahlt_bis: J - 1 })))).status).toBe(409);
    expect((await handle(req(), env, supa(null))).status).toBe(404);
    expect((await handle(req(), { ...env, saKey: '' }, supa(ms()))).status).toBe(503);
    expect((await handle(new Request('https://fn.test/ausweis', { method: 'POST' }), env, supa(ms()))).status).toBe(401);
  });
});
