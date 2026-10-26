/**
 * Mitglieder einladen (Intern → Mitglieder, nur Vorstand): Formular, offene Einladungen, Rolle und Mitgliedschaft.
 * Die Supabase-Funktion „einladen“ wird ohne Browser mit nachgebautem Supabase geprüft.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { redaktion } from './redaktion-mock';
import { handle, zielUrl, type Env } from '../supabase/functions/einladen/index';

const vera = { display_name: 'Vera Vorstand', role: 'vorstand' };
const verzeichnis = [
  { id: 'u1', display_name: 'Vera Vorstand', role: 'vorstand', ags: [] },
  { id: 'm2', display_name: 'Lea Sommer', role: 'mitglied', ags: [] },
];
const offen = () => [{ id: 'o1', email: 'tom@example.org', name: 'Tom Tänzer', eingeladen_am: '2026-10-20T09:00:00Z' }];

test('Vorstand lädt ein: Rolle und Mitgliedschaft gleich mit, offene Einladungen erneut senden und zurücknehmen', async ({ page }) => {
  const m = await redaktion(page, { profil: vera, mitgliedschaften: [], verzeichnis, einladungen: offen() });
  await page.goto('/intern/mitglieder/');
  const box = page.locator('[data-einladen]');
  await expect(box).toBeVisible();
  await expect(box.locator('[data-ei-zahl]')).toHaveText('1 offen');
  await box.getByText('Neues Mitglied einladen').click();
  // Admin vergeben nur Admins
  await expect(box.getByLabel('Rolle').locator('option')).toHaveText(['Mitglied', 'Presse (darf News schreiben)', 'Vorstand']);
  await expect(box.getByLabel('Mitglied seit')).toHaveValue(new Date().toISOString().slice(0, 10));
  await expect(box.locator('.ei-offen__z')).toHaveCount(1);
  await expect(box.locator('.ei-offen__z')).toContainText('Tom Tänzer');
  await expect(box.locator('.ei-offen__z')).toContainText('tom@example.org · eingeladen am 20. Oktober 2026');

  await box.getByLabel('Name').fill('Nora Neu');
  await box.getByLabel('E-Mail').fill('nora@example.org');
  await box.getByLabel('Rolle').selectOption('presse');
  await box.getByLabel('Sprache der Einladung').selectOption('en');
  await box.getByLabel('Mitglied seit').fill('2026-11-01');
  await box.getByRole('button', { name: 'Einladung senden' }).click();
  await expect(page.locator('[data-dir-msg]')).toHaveText('Einladung an nora@example.org verschickt. Nora Neu steht jetzt in der Liste.');
  expect(m.einladen.find((x) => x.aktion === 'einladen')).toEqual({ aktion: 'einladen', name: 'Nora Neu', email: 'nora@example.org', sprache: 'en' });
  expect(m.profilGespeichert.at(-1)).toEqual({ id: 'neu1', role: 'presse' });
  expect(m.mitgliedschaftGespeichert.at(-1)).toEqual({ person: 'neu1', art: 'Ordentliches Mitglied', seit: '2026-11-01' });
  await expect(box.getByLabel('Name')).toHaveValue('');
  await expect(box.locator('.ei-offen__z')).toHaveCount(2);

  // schon vorhanden: Meldung der Funktion
  await box.getByLabel('Name').fill('Lea Sommer');
  await box.getByLabel('E-Mail').fill('lea@example.org');
  await box.getByRole('button', { name: 'Einladung senden' }).click();
  await expect(page.locator('[data-dir-msg]')).toHaveText('Für diese Adresse gibt es schon einen Zugang.');

  await box.getByRole('button', { name: 'Einladung erneut senden: Tom Tänzer' }).click();
  await expect(page.locator('[data-dir-msg]')).toHaveText('Einladung an tom@example.org noch einmal verschickt.');
  page.once('dialog', (d) => d.accept());
  await box.getByRole('button', { name: 'Einladung zurücknehmen: Tom Tänzer' }).click();
  await expect(page.locator('[data-dir-msg]')).toHaveText('Einladung an tom@example.org zurückgenommen.');
  await expect(box.locator('.ei-offen__z')).toHaveCount(1);
  expect(m.einladen.map((x) => x.aktion)).toContain('zuruecknehmen');

  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
});

test('Einladen: nur für den Vorstand, Hinweis ohne eingerichtete Funktion', async ({ page }) => {
  await redaktion(page, { profil: { display_name: 'Pia Presse', role: 'presse' }, verzeichnis, einladungen: offen() });
  await page.goto('/intern/mitglieder/');
  await expect(page.locator('.dir__card')).toHaveCount(2);
  await expect(page.locator('[data-einladen]')).toBeHidden();

  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await redaktion(page, { profil: vera, mitgliedschaften: [], verzeichnis });
  await page.goto('/intern/mitglieder/');
  await page.getByText('Neues Mitglied einladen').click();
  await expect(page.locator('[data-ei-fehlt]')).toBeVisible();
  await expect(page.locator('[data-ei-fehlt]')).toContainText('noch nicht eingerichtet');
});

test.describe('Funktion „einladen“', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'ohne Browser, einmal reicht'));
  const env: Env = { siteUrl: 'https://tanznetzdresden.de', supabaseUrl: 'https://sb.test', anonKey: 'anon', serviceKey: 'service' };
  const jetzt = '2026-10-20T09:00:00Z';
  const nutzer = [
    { id: 'a', email: 'alt@example.org', invited_at: jetzt, last_sign_in_at: '2026-10-21T09:00:00Z', user_metadata: { display_name: 'Alt' } },
    { id: 'b', email: 'neu@example.org', invited_at: jetzt, last_sign_in_at: null, user_metadata: { display_name: 'Neu', sprache: 'en' } },
    { id: 'c', email: 'selbst@example.org', invited_at: null, last_sign_in_at: jetzt },
  ];
  type Aufruf = { url: string; methode: string; auth: string; body: unknown };
  const supa = (rolle: string | null, vorhanden = false) => {
    const aufrufe: Aufruf[] = [];
    const f = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const u = new URL(String(input));
      const auth = new Headers(init?.headers).get('Authorization') ?? '';
      aufrufe.push({ url: u.pathname + u.search, methode: init?.method ?? 'GET', auth, body: init?.body ? JSON.parse(String(init.body)) : null });
      const j = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });
      if (u.pathname === '/auth/v1/user') return auth === 'Bearer t' ? j({ id: 'v1' }) : j({}, 401);
      if (u.pathname === '/rest/v1/profiles') return j(rolle ? [{ role: rolle }] : []);
      if (u.pathname === '/auth/v1/invite') return vorhanden ? j({ msg: 'A user with this email address has already been registered' }, 422) : j({ id: 'neu' });
      if (u.pathname === '/auth/v1/admin/users') return j({ users: nutzer });
      if (u.pathname.startsWith('/auth/v1/admin/users/')) return j({});
      return new Response('?', { status: 404 });
    }) as typeof fetch;
    return { f, aufrufe };
  };
  const req = (body: unknown, auth = 'Bearer t') =>
    new Request('https://fn.test/einladen', { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  test('lädt ein: Vorstand geprüft mit eigener Anmeldung, Einladung mit Service-Schlüssel', async () => {
    const s = supa('vorstand');
    const res = await handle(req({ aktion: 'einladen', email: ' Nora@Example.org ', name: 'Nora Neu', sprache: 'en' }), env, s.f);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'neu', email: 'nora@example.org' });
    const profil = s.aufrufe.find((a) => a.url.startsWith('/rest/v1/profiles'))!;
    expect(profil.auth).toBe('Bearer t');
    const einladung = s.aufrufe.find((a) => a.url.startsWith('/auth/v1/invite'))!;
    expect(einladung.auth).toBe('Bearer service');
    expect(einladung.url).toBe(`/auth/v1/invite?redirect_to=${encodeURIComponent('https://tanznetzdresden.de/en/intern/passwort/')}`);
    expect(einladung.body).toEqual({ email: 'nora@example.org', data: { display_name: 'Nora Neu', sprache: 'en' } });
    expect(zielUrl(env, 'de')).toBe('https://tanznetzdresden.de/intern/passwort/');
  });

  test('offene Einladungen, erneut senden, zurücknehmen nur für nicht angenommene', async () => {
    const s = supa('admin');
    expect(await (await handle(req({ aktion: 'offen' }), env, s.f)).json()).toEqual({ offen: [{ id: 'b', email: 'neu@example.org', name: 'Neu', eingeladen_am: jetzt }] });
    expect((await handle(req({ aktion: 'erneut', id: 'b' }), env, s.f)).status).toBe(200);
    expect(s.aufrufe.at(-1)!.body).toEqual({ email: 'neu@example.org', data: { display_name: 'Neu', sprache: 'en' } });
    expect((await handle(req({ aktion: 'zuruecknehmen', id: 'b' }), env, s.f)).status).toBe(200);
    expect(s.aufrufe.at(-1)).toMatchObject({ url: '/auth/v1/admin/users/b', methode: 'DELETE' });
    // angenommene Einladung und eigene Zugänge bleiben unangetastet
    expect((await handle(req({ aktion: 'zuruecknehmen', id: 'a' }), env, s.f)).status).toBe(404);
    expect((await handle(req({ aktion: 'zuruecknehmen', id: 'c' }), env, s.f)).status).toBe(404);
    expect(s.aufrufe.filter((a) => a.methode === 'DELETE')).toHaveLength(1);
  });

  test('abgelehnt: ohne Vorstand, ohne Anmeldung, falsche Angaben, schon vorhanden, nicht eingerichtet', async () => {
    const einladen = { aktion: 'einladen', email: 'x@example.org', name: 'X' };
    for (const rolle of ['mitglied', 'presse', null]) {
      const s = supa(rolle);
      expect((await handle(req(einladen), env, s.f)).status).toBe(403);
      expect(s.aufrufe.some((a) => a.auth === 'Bearer service')).toBe(false);
    }
    expect((await handle(req(einladen, ''), env, supa('vorstand').f)).status).toBe(401);
    expect((await handle(req(einladen, 'Bearer abgelaufen'), env, supa('vorstand').f)).status).toBe(401);
    expect((await handle(req({ ...einladen, email: 'keine-adresse' }), env, supa('vorstand').f)).status).toBe(400);
    expect((await handle(req({ ...einladen, name: '' }), env, supa('vorstand').f)).status).toBe(400);
    const doppelt = await handle(req(einladen), env, supa('vorstand', true).f);
    expect(doppelt.status).toBe(409);
    expect(((await doppelt.json()) as { fehler: string }).fehler).toMatch(/schon einen Zugang/);
    expect((await handle(req(einladen), { ...env, serviceKey: '' }, supa('vorstand').f)).status).toBe(503);
    expect((await handle(req({ aktion: 'loeschen' }), env, supa('vorstand').f)).status).toBe(400);
  });
});
