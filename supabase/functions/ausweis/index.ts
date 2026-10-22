/**
 * Supabase Edge Function „ausweis“ – Mitgliedsausweis für Google Wallet (Intern → Mein Status).
 *
 * Für die angemeldete Person: liest Profil und Mitgliedschaft (mit deren eigener Anmeldung, also unter
 * Row Level Security), baut daraus einen Google-Wallet-Pass („Generic Pass“) und gibt den Link
 * „Zu Google Wallet hinzufügen“ zurück. Der Pass enthält Name, Mitgliedsnummer, „gültig bis“ und als
 * QR-Code die öffentliche Prüfseite (/mitglied/pruefen/?c=…). Nur bei bezahltem Beitrag.
 *
 * Der Link ist ein mit dem Dienstkonto signiertes JWT (RS256); der private Schlüssel liegt nur hier
 * (Supabase-Secret). An Google geht der Pass erst, wenn die Person den Link öffnet und speichert.
 *
 * Einrichtung: docs/intern.md (Abschnitt „Google Wallet“). Secrets: WALLET_ISSUER_ID, WALLET_SA_EMAIL,
 * WALLET_SA_KEY (privater Schlüssel des Dienstkontos, PEM), SITE_URL (Adresse der Website mit Unterpfad),
 * optional WALLET_LOGO_URL (PNG). SUPABASE_URL und SUPABASE_ANON_KEY setzt Supabase selbst.
 *
 * Bewusst eine einzige Datei ohne Importe (wie „inhalte“): lässt sich im Dashboard hineinkopieren.
 */

export interface Env {
  issuerId: string;
  saEmail: string;
  /** privater Schlüssel des Dienstkontos (PEM, „-----BEGIN PRIVATE KEY-----“) */
  saKey: string;
  /** Adresse der Website, z. B. https://tanznetzdresden.de/ */
  siteUrl: string;
  logoUrl?: string;
  supabaseUrl: string;
  anonKey: string;
}

interface Mitgliedschaft {
  person: string;
  nummer: string | null;
  art: string;
  bezahlt_bis: number | null;
  ende: string | null;
  pruefcode: string;
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

const b64url = (bytes: Uint8Array) => {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const text64 = (s: string) => b64url(new TextEncoder().encode(s));

/** JWT mit RS256 signieren (privater Schlüssel als PKCS#8-PEM) */
export async function signieren(payload: Record<string, unknown>, pem: string): Promise<string> {
  const roh = pem.replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(roh), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const kopf = `${text64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${text64(JSON.stringify(payload))}`;
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(kopf)));
  return `${kopf}.${b64url(sig)}`;
}

const heute = () => new Date().toISOString().slice(0, 10);
export const aktiv = (m: Pick<Mitgliedschaft, 'bezahlt_bis' | 'ende'>, jetzt = new Date()) =>
  !(m.ende && m.ende < jetzt.toISOString().slice(0, 10)) && m.bezahlt_bis != null && m.bezahlt_bis >= jetzt.getUTCFullYear();

/** Inhalt des Passes (Google Wallet API, genericClasses/genericObjects) */
export function pass(env: Env, name: string, m: Mitgliedschaft, jetzt = new Date()) {
  const jahr = jetzt.getUTCFullYear();
  const bis = m.ende && m.ende < `${jahr}-12-31` ? m.ende : `${jahr}-12-31`;
  const [y, mo, d] = bis.split('-');
  const site = env.siteUrl.replace(/\/?$/, '/');
  const classId = `${env.issuerId}.tndd-mitglied`;
  const t = (value: string) => ({ defaultValue: { language: 'de', value } });
  return {
    iss: env.saEmail,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(jetzt.getTime() / 1000),
    origins: [new URL(site).origin],
    payload: {
      genericClasses: [{ id: classId }],
      genericObjects: [
        {
          id: `${env.issuerId}.m-${m.person.replace(/[^a-zA-Z0-9]/g, '')}-${jahr}`,
          classId,
          state: 'ACTIVE',
          cardTitle: t('TanzNetzDresden e.V.'),
          subheader: t(`Mitgliedsausweis ${jahr}`),
          header: t(name),
          hexBackgroundColor: '#2E1A4D',
          ...(env.logoUrl ? { logo: { sourceUri: { uri: env.logoUrl } } } : {}),
          textModulesData: [
            { id: 'nummer', header: 'Mitgliedsnummer', body: m.nummer ?? '' },
            { id: 'gueltig', header: 'Gültig bis', body: `${d}.${mo}.${y}` },
            { id: 'art', header: 'Art', body: m.art },
          ],
          barcode: { type: 'QR_CODE', value: `${site}mitglied/pruefen/?c=${m.pruefcode}`, alternateText: m.nummer ?? '' },
          validTimeInterval: { end: { date: `${bis}T23:59:59Z` } },
        },
      ],
    },
  };
}

async function laden(req: Request, env: Env, f: typeof fetch) {
  const auth = req.headers.get('Authorization') ?? '';
  if (!/^Bearer\s+\S+/.test(auth)) throw new Fehler(401, 'Bitte melde dich an.');
  const h = { apikey: env.anonKey, Authorization: auth };
  const u = await f(`${env.supabaseUrl}/auth/v1/user`, { headers: h });
  if (!u.ok) throw new Fehler(401, 'Deine Anmeldung ist abgelaufen. Bitte melde dich neu an.');
  const { id } = (await u.json()) as { id: string };
  const q = encodeURIComponent(id);
  const [p, m] = await Promise.all([
    f(`${env.supabaseUrl}/rest/v1/profiles?select=display_name&id=eq.${q}`, { headers: h }),
    f(`${env.supabaseUrl}/rest/v1/mitgliedschaften?select=person,nummer,art,bezahlt_bis,ende,pruefcode&person=eq.${q}`, { headers: h }),
  ]);
  const [profil] = p.ok ? ((await p.json()) as { display_name: string }[]) : [];
  const [ms] = m.ok ? ((await m.json()) as Mitgliedschaft[]) : [];
  if (!ms) throw new Fehler(404, 'Für dich sind noch keine Mitgliedsdaten eingetragen.');
  return { name: profil?.display_name || 'Mitglied', ms };
}

export async function handle(req: Request, env: Env, f: typeof fetch = fetch): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ fehler: 'Nur POST.' }, 405);
  try {
    if (!env.issuerId || !env.saEmail || !env.saKey || !env.siteUrl) {
      throw new Fehler(503, 'Google Wallet ist noch nicht eingerichtet (docs/intern.md).');
    }
    const { name, ms } = await laden(req, env, f);
    if (!aktiv(ms)) throw new Fehler(409, `Der Ausweis gilt erst mit bezahltem Beitrag (Stand ${heute()}).`);
    const jwt = await signieren(pass(env, name, ms), env.saKey);
    return json({ url: `https://pay.google.com/gp/v/save/${jwt}` });
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
      issuerId: e('WALLET_ISSUER_ID'),
      saEmail: e('WALLET_SA_EMAIL'),
      saKey: e('WALLET_SA_KEY'),
      siteUrl: e('SITE_URL'),
      logoUrl: e('WALLET_LOGO_URL') || undefined,
      supabaseUrl: e('SUPABASE_URL'),
      anonKey: e('SUPABASE_ANON_KEY'),
    }),
  );
}
