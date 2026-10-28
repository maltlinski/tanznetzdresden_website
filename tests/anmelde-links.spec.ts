/**
 * Links aus E-Mails (Einladung des Vorstands, Login-Link, Passwort vergessen) – auch in einem anderen Browser
 * als dem, in dem sie angefordert wurden. Supabase ist nachgebaut; im Browser liegt vorher keine Anmeldung.
 */
import { test, expect, type Page } from '@playwright/test';
import { supabase } from '../src/settings/supabase';

const SB = supabase.url.replace(/\/+$/, '');
const b64 = (x: object) => Buffer.from(JSON.stringify(x)).toString('base64url');
const TOKEN = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u9', role: 'authenticated', exp: 4102444800 })}.x`;
const USER = { id: 'u9', aud: 'authenticated', role: 'authenticated', email: 'neu@example.org', app_metadata: {}, user_metadata: {}, created_at: '2026-10-01T00:00:00Z' };
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };

async function nachbau(page: Page) {
  const aufrufe = { verify: [] as Record<string, unknown>[], passwort: [] as Record<string, unknown>[] };
  await page.addInitScript(() => localStorage.setItem('tndd-consent', JSON.stringify({ v: 1, date: '2026-10-15T00:00:00Z', categories: { notwendig: true } })));
  await page.route(`${SB}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: cors });
    if (req.method() === 'OPTIONS') return json({});
    if (url.pathname === '/auth/v1/user' && req.method() === 'GET') {
      return req.headers()['authorization'] === `Bearer ${TOKEN}` ? json(USER) : json({ code: 401, msg: 'invalid JWT' }, 401);
    }
    if (url.pathname === '/auth/v1/user' && req.method() === 'PUT') {
      aufrufe.passwort.push(req.postDataJSON());
      return json(USER);
    }
    if (url.pathname === '/auth/v1/verify') {
      const body = req.postDataJSON() as Record<string, unknown>;
      aufrufe.verify.push(body);
      if (body.token_hash !== 'gut') return json({ code: 403, error_code: 'otp_expired', msg: 'Email link is invalid or has expired' }, 403);
      return json({ access_token: TOKEN, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, user: USER });
    }
    if (url.pathname === '/rest/v1/profiles') return json(req.headers()['accept']?.includes('vnd.pgrst.object') ? { id: 'u9', display_name: 'Neu', role: 'mitglied' } : []);
    return json([]);
  });
  return aufrufe;
}

const hash = (typ: string) => `#access_token=${TOKEN}&expires_at=4102444800&expires_in=3600&refresh_token=r&token_type=bearer&type=${typ}`;

test('Einladung: Link führt zu „Passwort festlegen“, Passwort wird gespeichert', async ({ page }) => {
  const aufrufe = await nachbau(page);
  await page.goto(`/intern/passwort/${hash('invite')}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Passwort festlegen' })).toBeVisible();
  // Supabase entfernt die Schlüssel aus der Adresse (übrig bleibt höchstens ein leeres #)
  await expect(page).toHaveURL(/\/intern\/passwort\/#?$/);
  await expect(page.locator('[data-pw-user]')).toHaveValue('neu@example.org');
  await page.getByLabel('Neues Passwort').fill('ein-gutes-passwort');
  await page.getByLabel('Wiederholen').fill('ein-gutes-passwort');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByText('Gespeichert. Du wirst weitergeleitet …')).toBeVisible();
  expect(aufrufe.passwort).toEqual([expect.objectContaining({ password: 'ein-gutes-passwort' })]);
});

test('Login-Link aus der E-Mail meldet an (anderer Browser, englisch)', async ({ page }) => {
  await nachbau(page);
  await page.goto(`/en/intern/${hash('magiclink')}`);
  await expect(page.locator('[data-intern]')).toHaveAttribute('data-state', 'ready');
  await expect(page.getByRole('heading', { level: 1, name: 'Log in' })).toBeHidden();
});

test('Link mit token_hash wird auf der Seite eingelöst', async ({ page }) => {
  const aufrufe = await nachbau(page);
  await page.goto('/intern/passwort/?token_hash=gut&type=recovery');
  await expect(page.getByRole('heading', { level: 1, name: 'Passwort festlegen' })).toBeVisible();
  await expect(page).toHaveURL(/\/intern\/passwort\/$/);
  expect(aufrufe.verify).toEqual([expect.objectContaining({ token_hash: 'gut', type: 'recovery' })]);
});

test('Abgelaufener Link: Anmeldeseite erklärt, was zu tun ist', async ({ page }) => {
  await nachbau(page);
  await page.goto('/intern/passwort/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  await page.waitForURL(/\/intern\/\?weiter=/);
  await expect(page.getByRole('alert')).toContainText('Der Link aus der E-Mail ist abgelaufen oder wurde schon benutzt.');
  await expect(page.getByRole('heading', { level: 1, name: 'Anmelden' })).toBeVisible();

  await page.goto('/en/intern/passwort/?token_hash=alt&type=invite');
  await page.waitForURL(/\/en\/intern\/\?weiter=/);
  await expect(page.getByRole('alert')).toContainText('The link from the email has expired or was already used.');
});

test('Link landet auf der Startseite (Redirect URLs fehlen): weiter in den internen Bereich', async ({ page }) => {
  await nachbau(page);
  await page.goto(`/${hash('invite')}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Passwort festlegen' })).toBeVisible();
  await expect(page.locator('[data-pw-user]')).toHaveValue('neu@example.org');
});

test('Abgelaufener Link auf der englischen Startseite: Hinweis bei „Log in“', async ({ page }) => {
  await nachbau(page);
  await page.goto('/en/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  await page.waitForURL(/\/en\/intern\//);
  await expect(page.getByRole('alert')).toContainText('The link from the email has expired or was already used.');
});
