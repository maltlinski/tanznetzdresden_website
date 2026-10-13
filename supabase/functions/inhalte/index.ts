/**
 * Supabase Edge Function „inhalte“ – die Redaktion im internen Bereich (Intern → Redaktion).
 *
 * Liest und speichert die Inhalte der Website (Markdown, YAML, Einstellungen, Fotos) direkt im
 * GitHub-Repository. Jede Änderung ist ein Commit auf `main`; danach baut die Website von selbst neu.
 * Der GitHub-Schlüssel liegt nur hier (Supabase-Secret), nie im Browser.
 *
 * Wer darf was?
 *   - Presse, Vorstand, Admin (Rolle in public.profiles): alles unter src/content/, die Einstellungen
 *     (src/settings/*.json), Fotos und Downloads.
 *   - Nur Vorstand/Admin: Impressum, Datenschutz und die rechtlichen Angaben in verein.json
 *     (Anschrift, E-Mail-Adressen, Register, Steuer, Bankverbindung).
 *   - Code, Workflows und alles andere: niemand. Eigenes HTML in Texten wird abgelehnt.
 *
 * Einrichtung: docs/redaktion.md (Abschnitt „Einrichten“). Secrets: GITHUB_TOKEN, GITHUB_REPO,
 * optional GITHUB_BRANCH (Standard main). SUPABASE_URL und SUPABASE_ANON_KEY setzt Supabase selbst.
 *
 * Bewusst eine einzige Datei ohne Importe: Sie lässt sich im Supabase-Dashboard
 * (Edge Functions → Deploy a new function → Via Editor) einfach hineinkopieren.
 */

export interface Env {
  githubToken: string;
  /** „besitzer/repository“ */
  repo: string;
  branch: string;
  supabaseUrl: string;
  anonKey: string;
  /** Workflow-Datei, deren Läufe als „Website wird aktualisiert“ gelten */
  workflow?: string;
}

type Rolle = 'mitglied' | 'presse' | 'vorstand' | 'admin';
interface Person {
  rolle: Rolle;
  name: string;
}
interface Aenderung {
  pfad: string;
  /** neuer Inhalt als Text (Markdown, YAML, JSON) */
  text?: string;
  /** neuer Inhalt als Base64 (Fotos, PDF) */
  base64?: string;
  loeschen?: boolean;
  /** erwarteter Stand (Blob-SHA) beim Lesen; null = Datei darf noch nicht existieren */
  alt?: string | null;
}

const TEXT = /^(src\/content\/[a-z0-9][a-z0-9/_-]*\.(md|ya?ml)|src\/settings\/[a-z0-9-]+\.json)$/;
const BILD = /^src\/assets\/(photos|personen|foerderer)\/[a-z0-9][a-z0-9._-]*\.(jpe?g|png|webp)$/;
const PDF = /^public\/downloads\/[a-z0-9][a-z0-9._-]*\.pdf$/;
const NUR_VORSTAND = /^src\/content\/seiten\/(en\/)?(impressum|datenschutz)\.md$/;
/** Teile von verein.json, die nur Vorstand/Admin ändern */
const VEREIN = 'src/settings/verein.json';
const VEREIN_GESCHUETZT = [
  'legalName', 'address', 'phone', 'emails', 'register', 'taxExemption', 'analytics', 'newsletter',
  'donation.accountHolder', 'donation.iban', 'donation.bic', 'donation.bank', 'donation.onlineUrl', 'donation.onlineProvider',
  'en.register',
];
const MAX_TEXT = 300_000;
const MAX_DATEI = 8_000_000;
const MAX_AENDERUNGEN = 60;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

class Fehler extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });

export const istText = (p: string) => TEXT.test(p);
export const istErlaubt = (p: string) => !p.includes('..') && (TEXT.test(p) || BILD.test(p) || PDF.test(p));
export const nurVorstand = (p: string) => NUR_VORSTAND.test(p);

const b64 = {
  encode(text: string) {
    const bytes = new TextEncoder().encode(text);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  },
  bytes(base64: string) {
    const s = atob(base64.replace(/\s/g, ''));
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  },
  decode(base64: string) {
    return new TextDecoder().decode(b64.bytes(base64));
  },
};

/** Prüft Texte: keine Skripte, kein eigenes HTML (Kommentare <!-- … --> sind erlaubt). */
export function textPruefen(pfad: string, text: string): string | null {
  if (text.length > MAX_TEXT) return `${pfad}: Der Text ist zu lang.`;
  if (/javascript:|vbscript:|data:text\/html/i.test(text)) return `${pfad}: Links mit „javascript:“ oder „data:“ sind nicht erlaubt.`;
  const ohneKommentare = text.replace(/<!--[\s\S]*?-->/g, '');
  if (/<\/?[a-z][a-z0-9-]*(\s[^>]*)?\/?>/i.test(ohneKommentare)) return `${pfad}: Eigenes HTML ist im Text nicht erlaubt. Bitte die Knöpfe für Fett, Liste oder Link nutzen.`;
  if (pfad.endsWith('.json')) {
    try {
      JSON.parse(text);
    } catch {
      return `${pfad}: Die Einstellungen sind kein gültiges JSON.`;
    }
  }
  return null;
}

/** Prüft Fotos und PDFs anhand der ersten Bytes. */
export function dateiPruefen(pfad: string, bytes: Uint8Array): string | null {
  if (bytes.length > MAX_DATEI) return `${pfad}: Die Datei ist größer als 8 MB.`;
  const ist =(sig: number[], ab = 0) => sig.every((b, i) => bytes[ab + i] === b);
  const ok = /\.jpe?g$/.test(pfad)
    ? ist([0xff, 0xd8, 0xff])
    : pfad.endsWith('.png')
      ? ist([0x89, 0x50, 0x4e, 0x47])
      : pfad.endsWith('.webp')
        ? ist([0x52, 0x49, 0x46, 0x46]) && ist([0x57, 0x45, 0x42, 0x50], 8)
        : pfad.endsWith('.pdf')
          ? ist([0x25, 0x50, 0x44, 0x46])
          : false;
  return ok ? null :`${pfad}: Der Inhalt passt nicht zur Dateiendung.`;
}

const holen = (o: unknown, pfad: string) => pfad.split('.').reduce<unknown>((v, k) => (v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined), o);

/** Presse darf die rechtlichen Angaben in verein.json nicht ändern. */
export function vereinPruefen(alt: string, neu: string): string | null {
  const a = JSON.parse(alt);
  const n = JSON.parse(neu);
  const geaendert = VEREIN_GESCHUETZT.filter((p) => JSON.stringify(holen(a, p)) !== JSON.stringify(holen(n, p)));
  return geaendert.length ? `Diese Angaben ändert nur der Vorstand: ${geaendert.join(', ')}.` : null;
}

function github(env: Env, f: typeof fetch) {
  const api = `https://api.github.com/repos/${env.repo}`;
  return async function gh<T = any>(pfad: string, init: RequestInit = {}): Promise<T> {
    const res = await f(`${api}${pfad}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${env.githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'tanznetzdresden-redaktion',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      if (res.status === 422 && pfad.includes('/git/refs/')) throw new Fehler(409, 'nicht-vorspulbar');
      if (res.status === 401) throw new Fehler(502, 'Der GitHub-Schlüssel der Redaktion ist ungültig oder abgelaufen (docs/redaktion.md).');
      if (res.status === 403 || res.status === 404) throw new Fehler(502, `GitHub verweigert den Zugriff (${res.status}). Hat der Schlüssel Lese- und Schreibrechte für ${env.repo}?`);
      throw new Fehler(502, `GitHub antwortet mit ${res.status}: ${text.slice(0, 200)}`);
    }
    return (res.status === 204 ? null : await res.json()) as T;
  };
}

async function person(req: Request, env: Env, f: typeof fetch): Promise<Person> {
  const auth = req.headers.get('Authorization') ?? '';
  if (!/^Bearer\s+\S+/.test(auth)) throw new Fehler(401, 'Bitte melde dich an.');
  const h = { apikey: env.anonKey, Authorization: auth };
  const u = await f(`${env.supabaseUrl}/auth/v1/user`, { headers: h });
  if (!u.ok) throw new Fehler(401, 'Deine Anmeldung ist abgelaufen. Bitte melde dich neu an.');
  const { id } = (await u.json()) as { id: string };
  const p = await f(`${env.supabaseUrl}/rest/v1/profiles?select=role,display_name&id=eq.${encodeURIComponent(id)}`, { headers: h });
  const [row] = p.ok ? ((await p.json()) as { role: Rolle; display_name: string }[]) : [];
  if (!row || !['presse', 'vorstand', 'admin'].includes(row.role)) {
    throw new Fehler(403, 'Die Redaktion ist für Mitglieder mit der Rolle Presse, Vorstand oder Admin.');
  }
  return { rolle: row.role, name: row.display_name || 'Redaktion' };
}

interface Baum {
  head: string;
  /** Pfad → Blob-SHA (nur erlaubte Dateien) */
  dateien: Map<string, { sha: string; groesse: number }>;
}

async function baum(gh: ReturnType<typeof github>, env: Env): Promise<Baum> {
  const ref = await gh<{ object: { sha: string } }>(`/git/ref/heads/${env.branch}`);
  const commit = await gh<{ tree: { sha: string } }>(`/git/commits/${ref.object.sha}`);
  const tree = await gh<{ tree: { path: string; type: string; sha: string; size?: number }[]; truncated: boolean }>(
    `/git/trees/${commit.tree.sha}?recursive=1`,
  );
  const dateien = new Map<string, { sha: string; groesse: number }>();
  for (const e of tree.tree) if (e.type === 'blob' && istErlaubt(e.path)) dateien.set(e.path, { sha: e.sha, groesse: e.size ?? 0 });
  return { head: ref.object.sha, dateien };
}

async function parallel<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

async function speichern(gh: ReturnType<typeof github>, env: Env, wer: Person, body: { nachricht?: string; aenderungen?: Aenderung[] }) {
  const aenderungen = body.aenderungen ?? [];
  if (!aenderungen.length) throw new Fehler(400, 'Es gibt nichts zu speichern.');
  if (aenderungen.length > MAX_AENDERUNGEN) throw new Fehler(400, 'Zu viele Änderungen auf einmal.');
  const vorstand = wer.rolle === 'vorstand' || wer.rolle === 'admin';
  const pfade = new Set<string>();

  for (const a of aenderungen) {
    if (typeof a.pfad !== 'string' || !istErlaubt(a.pfad)) throw new Fehler(400, `„${a.pfad}“ darf die Redaktion nicht bearbeiten.`);
    if (pfade.has(a.pfad)) throw new Fehler(400, `„${a.pfad}“ steht doppelt in den Änderungen.`);
    pfade.add(a.pfad);
    if (nurVorstand(a.pfad) && !vorstand) throw new Fehler(403, 'Impressum und Datenschutz ändert nur der Vorstand.');
    if (a.loeschen) continue;
    if (istText(a.pfad)) {
      if (typeof a.text !== 'string') throw new Fehler(400, `${a.pfad}: Inhalt fehlt.`);
      const f = textPruefen(a.pfad, a.text);
      if (f) throw new Fehler(400, f);
    } else {
      if (typeof a.base64 !== 'string') throw new Fehler(400, `${a.pfad}: Datei fehlt.`);
      const f = dateiPruefen(a.pfad, b64.bytes(a.base64));
      if (f) throw new Fehler(400, f);
    }
  }

  const nachricht = String(body.nachricht ?? 'Inhalte geändert').replace(/\s+/g, ' ').trim().slice(0, 160) || 'Inhalte geändert';

  for (let versuch = 0; versuch < 2; versuch++) {
    const stand = await baum(gh, env);
    for (const a of aenderungen) {
      const jetzt = stand.dateien.get(a.pfad)?.sha ?? null;
      if (a.alt !== undefined && a.alt !== jetzt) {
        throw new Fehler(409, 'Jemand hat das inzwischen geändert. Bitte lade die Seite neu und übernimm deine Änderung noch einmal.');
      }
      if (a.loeschen && !jetzt) throw new Fehler(409, `„${a.pfad}“ gibt es nicht mehr.`);
    }
    // Rechtliche Angaben in verein.json: Vergleich mit dem aktuellen Stand
    const verein = aenderungen.find((a) => a.pfad === VEREIN);
    if (verein && !vorstand) {
      if (verein.loeschen) throw new Fehler(403, 'Die Einstellungen kann man nicht löschen.');
      const altSha = stand.dateien.get(VEREIN)?.sha;
      const alt = altSha ? b64.decode((await gh<{ content: string }>(`/git/blobs/${altSha}`)).content) : '{}';
      const f = vereinPruefen(alt, verein.text!);
      if (f) throw new Fehler(403, f);
    }

    const eintraege = await parallel(aenderungen, 4, async (a) => {
      if (a.loeschen) return { path: a.pfad, mode: '100644', type: 'blob', sha: null };
      const blob = await gh<{ sha: string }>('/git/blobs', {
        method: 'POST',
        body: JSON.stringify({ content: a.text !== undefined ? b64.encode(a.text) : a.base64, encoding: 'base64' }),
      });
      return { path: a.pfad, mode: '100644', type: 'blob', sha: blob.sha };
    });
    const headCommit = await gh<{ tree: { sha: string } }>(`/git/commits/${stand.head}`);
    const tree = await gh<{ sha: string }>('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: headCommit.tree.sha, tree: eintraege }) });
    const commit = await gh<{ sha: string; html_url: string }>('/git/commits', {
      method: 'POST',
      body: JSON.stringify({ message: `Redaktion: ${nachricht}\n\nGeändert von ${wer.name.slice(0, 80)} (Intern → Redaktion)`, tree: tree.sha, parents: [stand.head] }),
    });
    try {
      await gh(`/git/refs/heads/${env.branch}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) });
      return { commit: commit.sha, url: commit.html_url };
    } catch (e) {
      // Gleichzeitig hat jemand anderes gespeichert: einmal auf dem neuen Stand wiederholen
      if (e instanceof Fehler && e.message === 'nicht-vorspulbar' && versuch === 0) continue;
      if (e instanceof Fehler && e.message === 'nicht-vorspulbar') throw new Fehler(409, 'Gerade speichert jemand anderes. Bitte versuche es gleich noch einmal.');
      throw e;
    }
  }
  throw new Fehler(409, 'Gerade speichert jemand anderes. Bitte versuche es gleich noch einmal.');
}

async function status(gh: ReturnType<typeof github>, env: Env) {
  const [runs, commits] = await Promise.all([
    gh<{ workflow_runs: { status: string; conclusion: string | null; created_at: string; updated_at: string; html_url: string; head_sha: string }[] }>(
      `/actions/workflows/${env.workflow ?? 'deploy.yml'}/runs?branch=${env.branch}&per_page=3`,
    ).catch(() => ({ workflow_runs: [] })),
    gh<{ sha: string; html_url: string; commit: { message: string; author: { date: string } } }[]>(`/commits?sha=${env.branch}&per_page=12`),
  ]);
  const lauf = runs.workflow_runs[0];
  return {
    website: lauf
      ? { status: lauf.status, ergebnis: lauf.conclusion, zeit: lauf.updated_at, url: lauf.html_url, commit: lauf.head_sha }
      : null,
    verlauf: commits.map((c) => {
      const [titel, ...rest] = c.commit.message.split('\n');
      const von = rest.join('\n').match(/Geändert von (.+?) \(Intern/)?.[1] ?? null;
      return { sha: c.sha, url: c.html_url, zeit: c.commit.author.date, titel: titel.replace(/^Redaktion: /, ''), von };
    }),
  };
}

export async function handle(req: Request, env: Env, f: typeof fetch = fetch): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ fehler: 'Nur POST.' }, 405);
  try {
    if (!env.githubToken || !env.repo) throw new Fehler(503, 'Die Redaktion ist noch nicht eingerichtet: GITHUB_TOKEN oder GITHUB_REPO fehlt (docs/redaktion.md).');
    const wer = await person(req, env, f);
    const body = (await req.json().catch(() => ({}))) as Record<string, any>;
    const gh = github(env, f);

    switch (body.aktion) {
      case 'stand': {
        const s = await baum(gh, env);
        return json({ head: s.head, rolle: wer.rolle, name: wer.name, dateien: [...s.dateien].map(([pfad, d]) => ({ pfad, ...d })) });
      }
      case 'lesen': {
        const pfade: string[] = Array.isArray(body.pfade) ? body.pfade.slice(0, 300) : [];
        const s = await baum(gh, env);
        const inhalte = await parallel(pfade, 6, async (p) => {
          const d = istText(p) ? s.dateien.get(p) : undefined;
          if (!d) return [p, null] as const;
          const blob = await gh<{ content: string }>(`/git/blobs/${d.sha}`);
          return [p, { sha: d.sha, text: b64.decode(blob.content) }] as const;
        });
        return json({ head: s.head, dateien: Object.fromEntries(inhalte) });
      }
      case 'datei': {
        // Foto für die Vorschau im Editor
        const p = String(body.pfad ?? '');
        if (!istErlaubt(p) || istText(p)) throw new Fehler(400, 'Unbekannte Datei.');
        const s = await baum(gh, env);
        const d = s.dateien.get(p);
        if (!d) throw new Fehler(404, 'Die Datei gibt es nicht.');
        const blob = await gh<{ content: string }>(`/git/blobs/${d.sha}`);
        return json({ sha: d.sha, base64: blob.content.replace(/\s/g, '') });
      }
      case 'speichern':
        return json(await speichern(gh, env, wer, body));
      case 'status':
        return json(await status(gh, env));
      default:
        throw new Fehler(400, 'Unbekannte Aktion.');
    }
  } catch (e) {
    if (e instanceof Fehler) return json({ fehler: e.message }, e.status);
    console.error(e);
    return json({ fehler: 'Interner Fehler in der Redaktion. Bitte später erneut versuchen.' }, 500);
  }
}

declare const Deno: { env: { get(k: string): string | undefined }; serve(h: (r: Request) => Promise<Response>): void } | undefined;
if (typeof Deno !== 'undefined') {
  const e = (k: string) => Deno!.env.get(k) ?? '';
  Deno.serve((req) =>
    handle(req, {
      githubToken: e('GITHUB_TOKEN'),
      repo: e('GITHUB_REPO'),
      branch: e('GITHUB_BRANCH') || 'main',
      supabaseUrl: e('SUPABASE_URL'),
      anonKey: e('SUPABASE_ANON_KEY'),
      workflow: e('GITHUB_WORKFLOW') || 'deploy.yml',
    }),
  );
}
