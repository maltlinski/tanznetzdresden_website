/**
 * Supabase Edge Function „einladen“ – neue Mitglieder aus dem internen Bereich einladen (Intern → Mitglieder).
 *
 * Nur für Vorstand und Admin. Geprüft wird mit der Anmeldung der aufrufenden Person (Rolle in profiles);
 * erst danach nutzt die Funktion den Service-Schlüssel, und zwar nur für die Auth-Verwaltung:
 *   - einladen:      Einladung per E-Mail (Supabase schickt die Mail „Invite user“), Link führt zu /intern/passwort/
 *   - offen:         Einladungen, die noch niemand angenommen hat
 *   - erneut:        Einladung noch einmal schicken
 *   - zuruecknehmen: nicht angenommene Einladung löschen (z. B. Tippfehler in der Adresse)
 * Rolle und Mitgliedschaft setzt danach die Seite selbst, mit der Anmeldung des Vorstands (Row Level Security).
 *
 * Secrets: SITE_URL (Adresse der Website mit Unterpfad, wie bei „ausweis“). SUPABASE_URL, SUPABASE_ANON_KEY und
 * SUPABASE_SERVICE_ROLE_KEY setzt Supabase selbst – der Service-Schlüssel steht nie im Repository oder im Browser.
 *
 * Bewusst eine einzige Datei ohne Importe (wie „inhalte“ und „ausweis“): lässt sich im Dashboard hineinkopieren.
 */

export interface Env {
  /** Adresse der Website, z. B. https://tanznetzdresden.de/ */
  siteUrl: string;
  supabaseUrl: string;
  anonKey: string;
  serviceKey: string;
}

/** Eingeladene Person, die noch nicht angemeldet war */
export interface Offen {
  id: string;
  email: string;
  name: string;
  eingeladen_am: string;
}

interface AuthUser {
  id: string;
  email?: string;
  invited_at?: string | null;
  last_sign_in_at?: string | null;
  user_metadata?: { display_name?: string; sprache?: string };
}

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

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Zieladresse des Links in der Einladung: Passwort festlegen, in der Sprache der Einladung */
export const zielUrl = (env: Env, sprache: string) => `${env.siteUrl.replace(/\/?$/, '/')}${sprache === 'en' ? 'en/' : ''}intern/passwort/`;

/** Aufrufende Person muss Vorstand oder Admin sein (geprüft mit ihrer eigenen Anmeldung) */
async function vorstand(req: Request, env: Env, f: typeof fetch) {
  const auth = req.headers.get('Authorization') ?? '';
  if (!/^Bearer\s+\S+/.test(auth)) throw new Fehler(401, 'Bitte melde dich an.');
  const h = { apikey: env.anonKey, Authorization: auth };
  const u = await f(`${env.supabaseUrl}/auth/v1/user`, { headers: h });
  if (!u.ok) throw new Fehler(401, 'Deine Anmeldung ist abgelaufen. Bitte melde dich neu an.');
  const { id } = (await u.json()) as { id: string };
  const p = await f(`${env.supabaseUrl}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(id)}`, { headers: h });
  const [profil] = p.ok ? ((await p.json()) as { role: string }[]) : [];
  if (!profil || !['vorstand', 'admin'].includes(profil.role)) throw new Fehler(403, 'Einladen darf nur der Vorstand.');
  return id;
}

/** Auth-Verwaltung mit dem Service-Schlüssel */
function verwaltung(env: Env, f: typeof fetch) {
  const h = { apikey: env.serviceKey, Authorization: `Bearer ${env.serviceKey}`, 'Content-Type': 'application/json' };
  const base = `${env.supabaseUrl}/auth/v1`;
  return {
    async einladen(email: string, data: Record<string, string>) {
      const r = await f(`${base}/invite?redirect_to=${encodeURIComponent(zielUrl(env, data.sprache))}`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({ email, data }),
      });
      if (r.ok) return (await r.json()) as AuthUser;
      const t = await r.text();
      if (r.status === 422 || /already been registered|already exists/i.test(t)) {
        throw new Fehler(409, 'Für diese Adresse gibt es schon einen Zugang. Die Person kann sich anmelden oder „Passwort vergessen?“ nutzen.');
      }
      if (r.status === 429 || /rate limit/i.test(t)) throw new Fehler(429, 'Gerade wurden zu viele E-Mails verschickt. Bitte versuch es in einer Stunde noch einmal.');
      throw new Fehler(502, 'Die Einladung ließ sich nicht verschicken. Bitte später noch einmal versuchen.');
    },
    async alle(): Promise<AuthUser[]> {
      const r = await f(`${base}/admin/users?page=1&per_page=1000`, { headers: h });
      if (!r.ok) throw new Fehler(502, 'Die Liste der Zugänge ließ sich nicht laden.');
      const j = (await r.json()) as { users?: AuthUser[] } | AuthUser[];
      return Array.isArray(j) ? j : (j.users ?? []);
    },
    async loeschen(id: string) {
      const r = await f(`${base}/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE', headers: h });
      if (!r.ok) throw new Fehler(502, 'Die Einladung ließ sich nicht zurücknehmen.');
    },
  };
}

const offen = (u: AuthUser) => !!u.invited_at && !u.last_sign_in_at;
const alsOffen = (u: AuthUser): Offen => ({ id: u.id, email: u.email ?? '', name: u.user_metadata?.display_name ?? '', eingeladen_am: u.invited_at ?? '' });

export async function handle(req: Request, env: Env, f: typeof fetch = fetch): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ fehler: 'Nur POST.' }, 405);
  try {
    if (!env.serviceKey || !env.siteUrl) throw new Fehler(503, 'Einladen ist noch nicht eingerichtet (docs/intern.md, „Mitglieder einladen“).');
    await vorstand(req, env, f);
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const v = verwaltung(env, f);
    const aktion = String(b.aktion ?? 'einladen');

    if (aktion === 'einladen') {
      const email = String(b.email ?? '').trim().toLowerCase();
      const name = String(b.name ?? '').trim();
      const sprache = b.sprache === 'en' ? 'en' : 'de';
      if (!EMAIL.test(email) || email.length > 200) throw new Fehler(400, 'Bitte eine gültige E-Mail-Adresse eintragen.');
      if (!name || name.length > 80) throw new Fehler(400, 'Bitte einen Namen eintragen (höchstens 80 Zeichen).');
      const u = await v.einladen(email, { display_name: name, sprache });
      return json({ id: u.id, email });
    }
    if (aktion === 'offen') {
      const liste = (await v.alle()).filter(offen).map(alsOffen).sort((a, c) => c.eingeladen_am.localeCompare(a.eingeladen_am));
      return json({ offen: liste });
    }
    if (aktion === 'erneut' || aktion === 'zuruecknehmen') {
      const u = (await v.alle()).find((x) => x.id === b.id);
      // nur Einladungen, die noch niemand angenommen hat – bestehende Zugänge bleiben unangetastet
      if (!u || !offen(u)) throw new Fehler(404, 'Diese Einladung gibt es nicht mehr, oder sie wurde schon angenommen.');
      if (aktion === 'zuruecknehmen') {
        await v.loeschen(u.id);
        return json({ ok: true });
      }
      await v.einladen(u.email ?? '', { display_name: u.user_metadata?.display_name ?? '', sprache: u.user_metadata?.sprache === 'en' ? 'en' : 'de' });
      return json({ ok: true });
    }
    throw new Fehler(400, 'Unbekannte Aktion.');
  } catch (e) {
    const status = e instanceof Fehler ? e.status : 500;
    return json({ fehler: e instanceof Fehler ? e.message : 'Das hat nicht geklappt.' }, status);
  }
}

// Nur in Supabase (Deno) starten, nicht in den Tests
declare const Deno: { env: { get(k: string): string | undefined }; serve(h: (r: Request) => Response | Promise<Response>): void } | undefined;
if (typeof Deno !== 'undefined') {
  const e = (k: string) => Deno!.env.get(k) ?? '';
  Deno.serve((req) =>
    handle(req, {
      siteUrl: e('SITE_URL'),
      supabaseUrl: e('SUPABASE_URL'),
      anonKey: e('SUPABASE_ANON_KEY'),
      serviceKey: e('SUPABASE_SERVICE_ROLE_KEY'),
    }),
  );
}
