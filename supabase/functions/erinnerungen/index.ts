/**
 * Supabase Edge Function „erinnerungen“ – Fristen der Open Calls per Mail (Intern → Open Calls, docs/open-calls.md).
 *
 * Läuft einmal am Tag (Cron im Supabase-Dashboard). Wer bei einem Call „Erinnere mich“ eingeschaltet hat und noch
 * nicht eingereicht hat (Stand „gemerkt“ oder „in Arbeit“), bekommt 7 Tage und 1 Tag vor der Frist eine Mail.
 * Jede Erinnerung geht nur einmal raus (open_call_stand.erinnert).
 *
 * Verschickt wird über den eigenen Mailserver des Vereins (derselbe wie für die Login-Mails, SMTP mit SSL/TLS auf
 * Port 465 – Supabase sperrt die Ports 25 und 587). Kein weiterer Dienst.
 *
 * Aufruf nur mit dem Service-Schlüssel (Cron). Secrets: SITE_URL, SMTP_HOST, SMTP_PORT (Standard 465), SMTP_USER,
 * SMTP_PASS, SMTP_FROM (Absender-Adresse). SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY setzt Supabase selbst.
 *
 * Bewusst eine einzige Datei ohne Importe (wie „inhalte“, „einladen“, „ausweis“): lässt sich im Dashboard hineinkopieren.
 */

export interface Env {
  siteUrl: string;
  supabaseUrl: string;
  serviceKey: string;
  smtp: { host: string; port: number; user: string; pass: string; from: string };
}

/** Verbindung zum Mailserver (in Supabase: Deno.connectTls, in den Tests nachgebaut) */
export interface Leitung {
  lesen(): Promise<string>;
  schreiben(text: string): Promise<void>;
  schliessen(): void;
}
export type Verbinden = (host: string, port: number) => Promise<Leitung>;

export interface Mail {
  an: string;
  betreff: string;
  text: string;
}

interface Zeile {
  person: string;
  call_id: string;
  stand: string | null;
  sprache: string;
  erinnert: string[];
  open_calls: { titel: string; anbieter: string; frist: string; uhrzeit: string; link: string; status: string } | null;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

export const heuteDresden = (d = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(d);
const tageBis = (frist: string, heute: string) => Math.round((Date.parse(`${frist}T00:00:00Z`) - Date.parse(`${heute}T00:00:00Z`)) / 86400000);

const MONATE = {
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

/** Welche Erinnerung ist heute fällig? '7' (bis 7 Tage vorher), '1' (am Tag davor oder am Tag selbst) oder keine */
export function faellig(z: Pick<Zeile, 'stand' | 'erinnert'> & { frist: string }, heute: string): '7' | '1' | null {
  if (!['gemerkt', 'arbeit'].includes(z.stand ?? '')) return null;
  const n = tageBis(z.frist, heute);
  if (n < 0) return null;
  if (n <= 1) return z.erinnert.includes('1') ? null : '1';
  if (n <= 7) return z.erinnert.includes('7') ? null : '7';
  return null;
}

export function mailText(c: NonNullable<Zeile['open_calls']>, o: { name: string; sprache: string; seite: string; heute: string }): Omit<Mail, 'an'> {
  const n = tageBis(c.frist, o.heute);
  const [y, m, d] = c.frist.split('-').map(Number);
  const zeit = c.uhrzeit.slice(0, 5);
  if (o.sprache === 'en') {
    const wann = n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`;
    return {
      betreff: `${n <= 1 ? (n === 0 ? 'Ends today' : 'Ends tomorrow') : `${n} days left`}: ${c.titel}`,
      text: [
        `Hello ${o.name || 'there'},`, '',
        `the deadline for "${c.titel}" (${c.anbieter}) ends ${wann}: ${d} ${MONATE.en[m - 1]} ${y}, ${zeit}.`, '',
        ...(c.link ? [`Call: ${c.link}`] : []),
        `Your status and documents: ${o.seite}`, '',
        'You switched this reminder on in the members area under Open Calls. You can switch it off there as well.', '',
        'TanzNetzDresden e.V.',
      ].join('\n'),
    };
  }
  const wann = n === 0 ? 'heute' : n === 1 ? 'morgen' : `in ${n} Tagen`;
  return {
    betreff: `${n <= 1 ? (n === 0 ? 'Endet heute' : 'Endet morgen') : `Noch ${n} Tage`}: ${c.titel}`,
    text: [
      `Hallo ${o.name || ''},`.replace(' ,', ','), '',
      `die Frist für „${c.titel}“ (${c.anbieter}) endet ${wann}: am ${d}. ${MONATE.de[m - 1]} ${y} um ${zeit} Uhr.`, '',
      ...(c.link ? [`Zur Ausschreibung: ${c.link}`] : []),
      `Dein Stand und deine Unterlagen: ${o.seite}`, '',
      'Diese Erinnerung hast du im internen Bereich unter Open Calls eingeschaltet. Dort kannst du sie auch wieder ausschalten.', '',
      'TanzNetzDresden e.V.',
    ].join('\n'),
  };
}

// ---------- SMTP (RFC 5321), nur das Nötigste: EHLO, AUTH PLAIN, MAIL, RCPT, DATA ----------
const utf8 = new TextEncoder();
const base64 = (s: string) => {
  let bin = '';
  for (const b of utf8.encode(s)) bin += String.fromCharCode(b);
  return btoa(bin);
};
/** Kopfzeile mit Umlauten (RFC 2047) */
const kopf = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${base64(s)}?=`);

export function nachricht(m: Mail, from: string, jetzt = new Date()): string {
  const body = base64(m.text.replace(/\r?\n/g, '\r\n')).replace(/.{1,76}/g, '$&\r\n').trimEnd();
  return [
    `From: ${kopf('TanzNetzDresden')} <${from}>`,
    `To: <${m.an}>`,
    `Subject: ${kopf(m.betreff)}`,
    `Date: ${jetzt.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${crypto.randomUUID()}@${from.split('@')[1] ?? 'tanznetzdresden.de'}>`,
    'Auto-Submitted: auto-generated',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    body,
  ].join('\r\n');
}

export async function smtpSenden(l: Leitung, smtp: Env['smtp'], mails: Mail[]): Promise<void> {
  let puffer = '';
  const antwort = async (erwartet: number) => {
    // letzte Zeile einer Antwort: „250 …“ (mehrzeilig davor „250-…“)
    while (!/(?:^|\r\n)\d{3} [^\r\n]*\r\n$/.test(puffer)) {
      const teil = await l.lesen();
      if (!teil) throw new Error('Der Mailserver hat die Verbindung beendet.');
      puffer += teil;
    }
    const code = Number(/(?:^|\r\n)(\d{3}) [^\r\n]*\r\n$/.exec(puffer)![1]);
    const text = puffer.trim();
    puffer = '';
    if (Math.floor(code / 100) !== Math.floor(erwartet / 100)) throw new Error(`Mailserver: ${text}`);
  };
  const befehl = async (zeile: string, erwartet: number) => {
    await l.schreiben(`${zeile}\r\n`);
    await antwort(erwartet);
  };
  try {
    await antwort(220);
    await befehl(`EHLO ${smtp.from.split('@')[1] ?? 'localhost'}`, 250);
    await befehl(`AUTH PLAIN ${base64(`\0${smtp.user}\0${smtp.pass}`)}`, 235);
    for (const m of mails) {
      await befehl(`MAIL FROM:<${smtp.from}>`, 250);
      await befehl(`RCPT TO:<${m.an}>`, 250);
      await befehl('DATA', 354);
      // Punkt am Zeilenanfang verdoppeln (RFC 5321 §4.5.2)
      await befehl(`${nachricht(m, smtp.from).replace(/\r\n\./g, '\r\n..')}\r\n.`, 250);
    }
    await befehl('QUIT', 221);
  } finally {
    l.schliessen();
  }
}

export async function handle(req: Request, env: Env, f: typeof fetch = fetch, verbinden?: Verbinden, jetzt = new Date()): Promise<Response> {
  if (req.method !== 'POST') return json({ fehler: 'Nur POST.' }, 405);
  if (!env.serviceKey || req.headers.get('Authorization') !== `Bearer ${env.serviceKey}`) return json({ fehler: 'Nur für den täglichen Aufruf (Cron).' }, 401);
  if (!env.siteUrl || !env.smtp.host || !env.smtp.user || !env.smtp.pass || !env.smtp.from || !verbinden) {
    return json({ fehler: 'Erinnerungen sind noch nicht eingerichtet (docs/open-calls.md, „Erinnerungen per Mail“).' }, 503);
  }
  const h = { apikey: env.serviceKey, Authorization: `Bearer ${env.serviceKey}`, 'Content-Type': 'application/json' };
  const rest = `${env.supabaseUrl}/rest/v1`;
  const heute = heuteDresden(jetzt);

  const r = await f(`${rest}/open_call_stand?select=person,call_id,stand,sprache,erinnert,open_calls(titel,anbieter,frist,uhrzeit,link,status)&erinnerung=eq.true&stand=in.(gemerkt,arbeit)`, { headers: h });
  if (!r.ok) return json({ fehler: 'Die Erinnerungen ließen sich nicht laden.' }, 502);
  const zeilen = ((await r.json()) as Zeile[]).flatMap((z) => {
    const c = z.open_calls;
    const welche = c && c.status === 'frei' ? faellig({ ...z, frist: c.frist }, heute) : null;
    return welche && c ? [{ z, c, welche }] : [];
  });
  if (!zeilen.length) return json({ verschickt: 0 });

  // Adressen und Namen nur der Personen mit fälliger Erinnerung
  const personen = [...new Set(zeilen.map((x) => x.z.person))];
  const nutzer = await f(`${env.supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, { headers: h });
  if (!nutzer.ok) return json({ fehler: 'Die Adressen ließen sich nicht laden.' }, 502);
  const nj = (await nutzer.json()) as { users?: { id: string; email?: string }[] };
  const email = new Map((nj.users ?? []).map((u) => [u.id, u.email ?? '']));
  const p = await f(`${rest}/profiles?select=id,display_name&id=in.(${personen.join(',')})`, { headers: h });
  const namen = new Map(p.ok ? ((await p.json()) as { id: string; display_name: string }[]).map((x) => [x.id, x.display_name]) : []);

  const site = env.siteUrl.replace(/\/?$/, '/');
  const raus = zeilen.filter((x) => email.get(x.z.person));
  const mails = raus.map(({ z, c }) => ({
    an: email.get(z.person)!,
    ...mailText(c, { name: namen.get(z.person) ?? '', sprache: z.sprache, heute, seite: `${site}${z.sprache === 'en' ? 'en/' : ''}intern/open-calls/#call-${z.call_id}` }),
  }));
  await smtpSenden(await verbinden(env.smtp.host, env.smtp.port), env.smtp, mails);

  // vermerken: '1' schließt '7' ein (wer erst am Vortag einschaltet, bekommt nur eine Mail)
  for (const { z, welche } of raus) {
    const erinnert = [...new Set([...z.erinnert, welche, ...(welche === '1' ? ['7'] : [])])];
    await f(`${rest}/open_call_stand?person=eq.${z.person}&call_id=eq.${z.call_id}`, { method: 'PATCH', headers: h, body: JSON.stringify({ erinnert }) });
  }
  return json({ verschickt: mails.length });
}

// Nur in Supabase (Deno) starten, nicht in den Tests
declare const Deno: {
  env: { get(k: string): string | undefined };
  serve(h: (r: Request) => Response | Promise<Response>): void;
  connectTls(o: { hostname: string; port: number }): Promise<{ read(p: Uint8Array): Promise<number | null>; write(p: Uint8Array): Promise<number>; close(): void }>;
} | undefined;
if (typeof Deno !== 'undefined') {
  const e = (k: string) => Deno!.env.get(k) ?? '';
  const verbinden: Verbinden = async (hostname, port) => {
    const c = await Deno!.connectTls({ hostname, port });
    const dec = new TextDecoder();
    const buf = new Uint8Array(4096);
    return {
      async lesen() {
        const n = await c.read(buf);
        return n ? dec.decode(buf.subarray(0, n)) : '';
      },
      async schreiben(text) {
        const daten = utf8.encode(text);
        for (let i = 0; i < daten.length; ) i += await c.write(daten.subarray(i));
      },
      schliessen: () => c.close(),
    };
  };
  Deno.serve((req) =>
    handle(req, {
      siteUrl: e('SITE_URL'),
      supabaseUrl: e('SUPABASE_URL'),
      serviceKey: e('SUPABASE_SERVICE_ROLE_KEY'),
      smtp: { host: e('SMTP_HOST'), port: Number(e('SMTP_PORT') || 465), user: e('SMTP_USER'), pass: e('SMTP_PASS'), from: e('SMTP_FROM') },
    }, fetch, verbinden),
  );
}
