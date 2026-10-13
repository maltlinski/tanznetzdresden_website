/**
 * Edge Function „inhalte“ (supabase/functions/inhalte/index.ts) gegen ein nachgebautes GitHub und Supabase.
 * Läuft ohne Browser, deshalb nur im Projekt „desktop“.
 */
import { test, expect } from '@playwright/test';
import { handle, textPruefen, vereinPruefen, type Env } from '../supabase/functions/inhalte/index';

test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'ohne Browser, einmal reicht'));

const env: Env = { githubToken: 'gh-test', repo: 'tnd/website', branch: 'main', supabaseUrl: 'https://sb.test', anonKey: 'anon' };
const enc = (s: string) => Buffer.from(s, 'utf8').toString('base64');
const dec = (s: string) => Buffer.from(s, 'base64').toString('utf8');

/** Minimales Git im Speicher: Blobs, Bäume (flach: Pfad → Blob), Commits, ein Branch. */
function fakeGitHub(start: Record<string, string>, rolle = 'presse') {
  let n = 0;
  const id = (p: string) => `${p}${(++n).toString(16).padStart(6, '0')}`;
  const blobs = new Map<string, string>();
  const trees = new Map<string, Map<string, string>>();
  const commits = new Map<string, { tree: string; parents: string[]; message: string }>();
  const t0 = new Map<string, string>();
  for (const [p, text] of Object.entries(start)) {
    const b = id('b');
    blobs.set(b, enc(text));
    t0.set(p, b);
  }
  const tree0 = id('t');
  trees.set(tree0, t0);
  let head = id('c');
  commits.set(head, { tree: tree0, parents: [], message: 'Start' });
  const log: string[] = [];
  /** wird vor dem Ref-Update ausgeführt (z. B. um gleichzeitiges Speichern zu simulieren) */
  let vorRefUpdate: (() => void) | null = null;

  const res = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const f = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? 'GET';
    const body = init.body ? JSON.parse(String(init.body)) : null;
    const auth = new Headers(init.headers).get('Authorization');
    if (url.host === 'sb.test') {
      if (auth !== 'Bearer gut') return res({ msg: 'invalid' }, 401);
      if (url.pathname === '/auth/v1/user') return res({ id: 'u1' });
      if (url.pathname === '/rest/v1/profiles') return res([{ role: rolle, display_name: 'Pia Presse' }]);
    }
    expect(auth).toBe('Bearer gh-test');
    const p = url.pathname.replace('/repos/tnd/website', '');
    log.push(`${method} ${p}`);
    let m: RegExpMatchArray | null;
    if (method === 'GET' && p === '/git/ref/heads/main') return res({ object: { sha: head } });
    if (method === 'GET' && (m = p.match(/^\/git\/commits\/(\w+)$/))) return res({ tree: { sha: commits.get(m[1])!.tree } });
    if (method === 'GET' && (m = p.match(/^\/git\/trees\/(\w+)$/))) {
      return res({ truncated: false, tree: [...trees.get(m[1])!].map(([path, sha]) => ({ path, sha, type: 'blob', size: dec(blobs.get(sha)!).length })) });
    }
    if (method === 'GET' && (m = p.match(/^\/git\/blobs\/(\w+)$/))) return res({ content: blobs.get(m[1]), encoding: 'base64' });
    if (method === 'POST' && p === '/git/blobs') {
      const b = id('b');
      blobs.set(b, body.content);
      return res({ sha: b }, 201);
    }
    if (method === 'POST' && p === '/git/trees') {
      const t = new Map(trees.get(body.base_tree));
      for (const e of body.tree) e.sha === null ? t.delete(e.path) : t.set(e.path, e.sha);
      const s = id('t');
      trees.set(s, t);
      return res({ sha: s }, 201);
    }
    if (method === 'POST' && p === '/git/commits') {
      const c = id('c');
      commits.set(c, { tree: body.tree, parents: body.parents, message: body.message });
      return res({ sha: c, html_url: `https://github.test/commit/${c}` }, 201);
    }
    if (method === 'PATCH' && p === '/git/refs/heads/main') {
      vorRefUpdate?.();
      vorRefUpdate = null;
      if (!commits.get(body.sha)!.parents.includes(head)) return res({ message: 'Update is not a fast forward' }, 422);
      head = body.sha;
      return res({ object: { sha: head } });
    }
    if (method === 'GET' && p.startsWith('/actions/workflows/deploy.yml/runs')) {
      return res({ workflow_runs: [{ status: 'in_progress', conclusion: null, created_at: '', updated_at: '2026-10-13T10:00:00Z', html_url: 'https://github.test/run/1', head_sha: head }] });
    }
    if (method === 'POST' && p === '/dispatches') {
      expect(body).toEqual({ event_type: 'profile-updated' });
      return new Response(null, { status: 204 });
    }
    if (method === 'GET' && p === '/commits') {
      const c = commits.get(head)!;
      return res([{ sha: head, html_url: 'https://github.test/c', commit: { message: c.message, author: { date: '2026-10-13T10:00:00Z' } } }]);
    }
    return res({ message: `nicht nachgebaut: ${method} ${p}` }, 500);
  }) as typeof fetch;

  const dateien = () => Object.fromEntries([...trees.get(commits.get(head)!.tree)!].map(([p, b]) => [p, dec(blobs.get(b)!)]));
  return {
    f,
    log,
    dateien,
    head: () => head,
    commit: () => commits.get(head)!,
    /** simuliert einen fremden Commit kurz vor dem eigenen Ref-Update */
    fremderCommit(pfad: string, text: string) {
      vorRefUpdate = () => {
        const b = id('b');
        blobs.set(b, enc(text));
        const t = new Map(trees.get(commits.get(head)!.tree));
        t.set(pfad, b);
        const ts = id('t');
        trees.set(ts, t);
        const c = id('c');
        commits.set(c, { tree: ts, parents: [head], message: 'fremd' });
        head = c;
      };
    },
  };
}

const call = (gh: ReturnType<typeof fakeGitHub>, body: unknown, token = 'gut') =>
  handle(new Request('https://fn.test/inhalte', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }), env, gh.f);

const start = {
  'src/content/termine/2026-10-15-a.md': '---\ntitle: A\n---\n',
  'src/content/personen.yaml': '- id: a\n  name: A\n',
  'src/settings/verein.json': JSON.stringify({ name: 'TND', phone: '1', training: { fee: '9 €' } }),
  'src/assets/photos/x.jpg': '\xff\xd8\xff',
  'src/pages/index.astro': '---\n---\n',
  '.github/workflows/deploy.yml': 'on: push',
};

test('Stand: nur erlaubte Dateien, Rolle und Name', async () => {
  const gh = fakeGitHub(start);
  const r = await call(gh, { aktion: 'stand' });
  expect(r.status).toBe(200);
  const j = await r.json();
  expect(j.rolle).toBe('presse');
  expect(j.name).toBe('Pia Presse');
  expect(j.dateien.map((d: { pfad: string }) => d.pfad).sort()).toEqual(
    ['src/assets/photos/x.jpg', 'src/content/personen.yaml', 'src/content/termine/2026-10-15-a.md', 'src/settings/verein.json'],
  );
});

test('Ohne Anmeldung oder als Mitglied kein Zugriff', async () => {
  expect((await call(fakeGitHub(start), { aktion: 'stand' }, 'falsch')).status).toBe(401);
  const r = await call(fakeGitHub(start, 'mitglied'), { aktion: 'stand' });
  expect(r.status).toBe(403);
  expect((await r.json()).fehler).toMatch(/Presse, Vorstand oder Admin/);
});

test('Lesen und Speichern als ein Commit (anlegen, ändern, löschen, Foto)', async () => {
  const gh = fakeGitHub(start);
  const lesen = await (await call(gh, { aktion: 'lesen', pfade: ['src/content/personen.yaml', 'src/pages/index.astro', 'src/content/fehlt.md'] })).json();
  expect(lesen.dateien['src/content/personen.yaml'].text).toContain('name: A');
  expect(lesen.dateien['src/pages/index.astro']).toBeNull();
  expect(lesen.dateien['src/content/fehlt.md']).toBeNull();

  const sha = lesen.dateien['src/content/personen.yaml'].sha;
  const r = await call(gh, {
    aktion: 'speichern',
    nachricht: 'Person „B“ angelegt',
    aenderungen: [
      { pfad: 'src/content/personen.yaml', text: '- id: a\n  name: A\n- id: b\n  name: B\n', alt: sha },
      { pfad: 'src/content/termine/2026-11-01-neu.md', text: '---\ntitle: Neu\n---\n', alt: null },
      { pfad: 'src/content/termine/2026-10-15-a.md', loeschen: true },
      { pfad: 'src/assets/photos/neu.png', base64: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0]).toString('base64') },
    ],
  });
  expect(r.status, await r.clone().text()).toBe(200);
  const d = gh.dateien();
  expect(d['src/content/personen.yaml']).toContain('id: b');
  expect(d['src/content/termine/2026-11-01-neu.md']).toContain('title: Neu');
  expect(d['src/content/termine/2026-10-15-a.md']).toBeUndefined();
  expect(d['src/assets/photos/neu.png']).toBeDefined();
  expect(gh.commit().message).toMatch(/^Redaktion: Person „B“ angelegt\n\nGeändert von Pia Presse/);

  const st = await (await call(gh, { aktion: 'status' })).json();
  expect(st.website.status).toBe('in_progress');
  expect(st.verlauf[0]).toMatchObject({ titel: 'Person „B“ angelegt', von: 'Pia Presse' });
});

test('Code, Workflows und HTML werden abgelehnt', async () => {
  const gh = fakeGitHub(start);
  for (const pfad of ['src/pages/index.astro', '.github/workflows/deploy.yml', 'src/content/../pages/x.md', 'src/settings/hero.ts', 'public/admin/config.yml']) {
    const r = await call(gh, { aktion: 'speichern', aenderungen: [{ pfad, text: 'x' }] });
    expect(r.status, pfad).toBe(400);
  }
  const html = await call(gh, { aktion: 'speichern', aenderungen: [{ pfad: 'src/content/seiten/transparenz.md', text: '---\ntitle: T\n---\n<script>alert(1)</script>' }] });
  expect((await html.json()).fehler).toMatch(/HTML/);
  const js = await call(gh, { aktion: 'speichern', aenderungen: [{ pfad: 'src/content/termine/x.md', text: 'link: "javascript:alert(1)"' }] });
  expect(js.status).toBe(400);
  const foto = await call(gh, { aktion: 'speichern', aenderungen: [{ pfad: 'src/assets/photos/y.jpg', base64: enc('<svg onload=x>') }] });
  expect((await foto.json()).fehler).toMatch(/Dateiendung/);
  expect(gh.commit().message).toBe('Start');
  // Kommentare in Textseiten bleiben erlaubt
  expect(textPruefen('a.md', '<!-- Hinweis -->\n## Text mit a < b und <3')).toBeNull();
});

test('Konflikt: veralteter Stand wird nicht überschrieben, fremder Commit beim Speichern wird nachgezogen', async () => {
  const gh = fakeGitHub(start);
  const r = await call(gh, { aktion: 'speichern', aenderungen: [{ pfad: 'src/content/personen.yaml', text: '[]', alt: 'veraltet' }] });
  expect(r.status).toBe(409);

  const neu = await call(gh, { aktion: 'speichern', aenderungen: [{ pfad: 'src/content/termine/2026-10-15-a.md', text: '---\ntitle: B\n---\n', alt: null }] });
  expect(neu.status).toBe(409);

  gh.fremderCommit('src/content/formate/f.md', '---\ntitle: F\n---\n');
  const ok = await call(gh, { aktion: 'speichern', aenderungen: [{ pfad: 'src/content/personen.yaml', text: '- id: a\n  name: A2\n' }] });
  expect(ok.status).toBe(200);
  const d = gh.dateien();
  expect(d['src/content/formate/f.md']).toContain('title: F');
  expect(d['src/content/personen.yaml']).toContain('A2');
});

test('Rechtliches nur für den Vorstand', async () => {
  const presse = fakeGitHub(start);
  const imp = await call(presse, { aktion: 'speichern', aenderungen: [{ pfad: 'src/content/seiten/impressum.md', text: '---\ntitle: I\n---\n' }] });
  expect(imp.status).toBe(403);
  const tel = await call(presse, { aktion: 'speichern', aenderungen: [{ pfad: 'src/settings/verein.json', text: JSON.stringify({ name: 'TND', phone: '2', training: { fee: '9 €' } }) }] });
  expect((await tel.json()).fehler).toMatch(/nur der Vorstand: phone/);
  const fee = await call(presse, { aktion: 'speichern', aenderungen: [{ pfad: 'src/settings/verein.json', text: JSON.stringify({ name: 'TND', phone: '1', training: { fee: '10 €' } }, null, 2) }] });
  expect(fee.status).toBe(200);

  const vorstand = fakeGitHub(start, 'vorstand');
  expect((await call(vorstand, { aktion: 'speichern', aenderungen: [{ pfad: 'src/content/seiten/impressum.md', text: '---\ntitle: I\n---\n' }] })).status).toBe(200);
  expect(vereinPruefen('{"register":{"number":"1"}}', '{"register":{"number":"2"}}')).toMatch(/register/);
});

test('neu_bauen stößt den Deploy-Workflow an (repository_dispatch), nur für die Redaktion', async () => {
  const gh = fakeGitHub({});
  const r = await call(gh, { aktion: 'neu_bauen' });
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({ ok: true });
  expect(gh.log).toEqual(['POST /dispatches']);

  const mitglied = fakeGitHub({}, 'mitglied');
  expect((await call(mitglied, { aktion: 'neu_bauen' })).status).toBe(403);
  expect(mitglied.log).toEqual([]);
});
