/**
 * Nachgebautes Supabase für die Redaktions-Tests (Beiträge, Editor, Mediathek, Mein Profil, Freigaben):
 * Anmeldung als Pia (Presse), Tabellen news_posts, news_medien, profiles und mitgliedschaften, Buckets newsbilder
 * und profilbilder, Funktionen „inhalte“, „ausweis“, galerie_freigabe und ausweis_pruefen.
 * Hochgeladene Fotos werden aus dem Speicher wieder ausgeliefert (echte Fotos aus src/assets/photos/).
 */
import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { supabase } from '../src/settings/supabase';

export const SB = supabase.url.replace(/\/+$/, '');
export const FOTOS = ['solo-blau.jpg', 'sprung.jpg', 'duo-rot.jpg'].map((n) => `src/assets/photos/${n}`);

export interface Mock {
  /** jede Speicherung (insert/update) von news_posts */
  gespeichert: Record<string, unknown>[];
  hochgeladen: string[];
  geloescht: string[][];
  /** Tabelle news_medien (datei → Zeile) */
  medien: Map<string, Record<string, unknown>>;
  neubau: number;
  /** jede Änderung am eigenen Profil (PATCH profiles) */
  profilGespeichert: Record<string, unknown>[];
  /** Aufrufe von rpc/galerie_freigabe */
  galerieFreigaben: Record<string, unknown>[];
  /** Speicherungen in mitgliedschaften (Vorstand) */
  mitgliedschaftGespeichert: Record<string, unknown>[];
  /** Aufrufe der Funktion „ausweis“ (Google Wallet) */
  wallet: number;
}

export interface MockOptionen {
  /** vorhandener Beitrag für ?id=n1 */
  zeile?: Record<string, unknown>;
  /** weitere Beiträge (Liste, Mediathek) */
  andere?: Record<string, unknown>[];
  /** Zeilen in news_medien */
  medien?: Record<string, unknown>[];
  /** Tabelle news_medien fehlt (Migration nicht eingespielt) */
  ohneMediathek?: boolean;
  /** Felder des eigenen Profils (Pia); ohne „gallery“ = Migration 20261020 fehlt */
  profil?: Record<string, unknown>;
  /** Mitgliederprofile für Redaktion → Freigaben */
  freigaben?: Record<string, unknown>[];
  /** eigene Zeile in mitgliedschaften; null = noch nicht angelegt; undefined = Tabelle fehlt (Migration 20261022) */
  mitgliedschaft?: Record<string, unknown> | null;
  /** weitere Zeilen in mitgliedschaften (Vorstand sieht alle) */
  mitgliedschaften?: Record<string, unknown>[];
  /** Mitgliederliste (rpc/member_directory) */
  verzeichnis?: Record<string, unknown>[];
}

export async function redaktion(page: Page, o: MockOptionen = {}): Promise<Mock> {
  const ref = new URL(SB).hostname.split('.')[0];
  const m: Mock = { gespeichert: [], hochgeladen: [], geloescht: [], medien: new Map((o.medien ?? []).map((r) => [String(r.datei), r])), neubau: 0, profilGespeichert: [], galerieFreigaben: [], mitgliedschaftGespeichert: [], wallet: 0 };
  const mitglieder = new Map<string, Record<string, unknown>>([...(o.mitgliedschaft ? [o.mitgliedschaft] : []), ...(o.mitgliedschaften ?? [])].map((z) => [String(z.person), z]));
  let profil: Record<string, unknown> = { id: 'u1', display_name: 'Pia Presse', role: 'presse', verified: false, public_listing: false, tags: [], ags: [], ...o.profil };
  const dateien = new Map<string, Buffer>();
  let zeile = o.zeile;
  const b64 = (x: object) => Buffer.from(JSON.stringify(x)).toString('base64url');
  const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp: 4102444800 })}.x`;
  const session = {
    access_token: token, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800,
    user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'pia@example.org', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
  };
  await page.addInitScript(([k, v]) => {
    localStorage.setItem(k, v);
    localStorage.setItem('tndd-consent', JSON.stringify({ v: 1, date: '2026-10-15T00:00:00Z', categories: { notwendig: true } }));
  }, [`sb-${ref}-auth-token`, JSON.stringify(session)]);
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Expose-Headers': 'Content-Range' };
  await page.route(`${SB}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: { ...cors, ...headers } });
    const einzeln = req.headers()['accept']?.includes('vnd.pgrst.object');
    if (req.method() === 'OPTIONS') return json({});
    if (url.pathname === '/rest/v1/profiles') {
      if (req.method() === 'HEAD') return route.fulfill({ status: 200, headers: { ...cors, 'Content-Range': '0-0/0' } });
      if (req.method() === 'PATCH') {
        const body = req.postDataJSON() as Record<string, unknown>;
        if ('gallery' in body && !('gallery' in profil)) return json({ message: 'column "gallery" does not exist', code: '42703' }, 400);
        m.profilGespeichert.push(body);
        // wie der Trigger profiles_galerie: nur schon freigegebene Fotos bleiben frei
        if (Array.isArray(body.gallery)) {
          const frei = new Set(((profil.gallery ?? []) as { path: string; frei?: boolean }[]).filter((g) => g.frei).map((g) => g.path));
          body.gallery = (body.gallery as { path: string }[]).map((g) => ({ ...g, frei: frei.has(g.path) }));
        }
        profil = { ...profil, ...body };
        return json(einzeln ? profil : [profil]);
      }
      // eigenes Profil (id=eq.u1, auch per maybeSingle als Liste), sonst die Liste für die Freigaben
      if (o.freigaben && url.searchParams.get('id') !== 'eq.u1') return json(o.freigaben);
      return json(einzeln ? profil : [profil]);
    }
    if (url.pathname === '/rest/v1/rpc/galerie_freigabe') {
      const body = req.postDataJSON() as Record<string, unknown>;
      m.galerieFreigaben.push(body);
      return json(body.ok ? [] : body.pfad ? [body.pfad] : []);
    }
    if (url.pathname === '/rest/v1/news_posts') {
      const alle = [...(zeile ? [zeile] : []), ...(o.andere ?? [])];
      if (req.method() === 'HEAD') return route.fulfill({ status: 200, headers: { ...cors, 'Content-Range': `0-0/${alle.length}` } });
      if (req.method() === 'GET') return json(einzeln ? (zeile ?? null) : alle);
      if (req.method() === 'DELETE') return json([]);
      const body = req.postDataJSON();
      m.gespeichert.push(body);
      zeile = { id: 'n1', updated_at: '2026-10-15T10:00:00Z', newsletter: false, ...zeile, ...body };
      return json(zeile);
    }
    if (url.pathname === '/rest/v1/news_medien') {
      if (o.ohneMediathek) return json({ message: 'relation "public.news_medien" does not exist', code: '42P01' }, 404);
      if (req.method() === 'HEAD') return route.fulfill({ status: 200, headers: { ...cors, 'Content-Range': `0-0/${m.medien.size}` } });
      if (req.method() === 'GET') {
        const nur = url.searchParams.get('datei')?.match(/^in\.\((.*)\)$/)?.[1].split(',').map((x) => x.replace(/^"|"$/g, ''));
        return json([...m.medien.values()].filter((r) => !nur || nur.includes(String(r.datei))));
      }
      if (req.method() === 'DELETE') {
        m.medien.delete(url.searchParams.get('datei')!.replace(/^eq\./, ''));
        return json([]);
      }
      const body = req.postDataJSON();
      const nurNeu = req.headers()['prefer']?.includes('ignore-duplicates');
      for (const r of Array.isArray(body) ? body : [body]) {
        const alt = m.medien.get(r.datei);
        if (alt && nurNeu) continue;
        m.medien.set(r.datei, { alt: '', alt_en: '', credit: '', focus: null, ...alt, ...r });
      }
      return json([], 201);
    }
    let t: RegExpMatchArray | null;
    if ((t = url.pathname.match(/^\/storage\/v1\/object\/list\/newsbilder$/))) {
      const prefix = (req.postDataJSON()?.prefix ?? '') as string;
      const namen = [...dateien.keys()];
      if (!prefix) return json([...new Set(namen.map((n) => n.split('/')[0]))].map((name) => ({ name, id: null })));
      return json(namen.filter((n) => n.startsWith(`${prefix}/`)).map((n) => ({ name: n.slice(prefix.length + 1), id: n, created_at: '2026-10-15T10:00:00Z' })));
    }
    if ((t = url.pathname.match(/^\/storage\/v1\/object\/(newsbilder|profilbilder)\/(.+)$/)) && req.method() === 'POST') {
      const pfad = decodeURIComponent(t[2]);
      // supabase-js schickt das Foto als Formular; ausgeliefert wird einfach ein echtes Foto
      dateien.set(pfad, readFileSync(FOTOS[m.hochgeladen.length % FOTOS.length]));
      m.hochgeladen.push(pfad);
      return json({ Key: `newsbilder/${pfad}` });
    }
    if (/^\/storage\/v1\/object\/(newsbilder|profilbilder)$/.test(url.pathname) && req.method() === 'DELETE') {
      m.geloescht.push(req.postDataJSON().prefixes);
      return json([]);
    }
    if ((t = url.pathname.match(/^\/storage\/v1\/object\/public\/(newsbilder|profilbilder)\/(.+)$/))) {
      const pfad = decodeURIComponent(t[2]);
      const inhalt = dateien.get(pfad) ?? (/^(vorhanden|u1|m1)\//.test(pfad) ? readFileSync(FOTOS[0]) : undefined);
      if (!inhalt) return route.fulfill({ status: 404, headers: cors });
      return route.fulfill({ status: 200, contentType: 'image/jpeg', body: inhalt, headers: cors });
    }
    if (url.pathname === '/functions/v1/inhalte') {
      m.neubau++;
      return json({ ok: true });
    }
    if (url.pathname === '/rest/v1/mitgliedschaften') {
      if (o.mitgliedschaft === undefined && !o.mitgliedschaften) return json({ message: 'relation "public.mitgliedschaften" does not exist', code: '42P01' }, 404);
      if (req.method() === 'GET') {
        const nur = url.searchParams.get('person')?.replace(/^eq\./, '');
        const zeilen = [...mitglieder.values()].filter((z) => !nur || z.person === nur);
        return json(einzeln ? (zeilen[0] ?? null) : zeilen);
      }
      const body = req.postDataJSON() as Record<string, unknown>;
      m.mitgliedschaftGespeichert.push(body);
      const neu = { pruefcode: '6f1c2b3a-0000-4000-8000-000000000001', ...mitglieder.get(String(body.person)), ...body, nummer: body.nummer ?? 'TNDD-2026-001' };
      mitglieder.set(String(body.person), neu);
      return json(einzeln ? neu : [neu], 201);
    }
    if (url.pathname === '/rest/v1/rpc/ausweis_pruefen') {
      const code = (req.postDataJSON() as { code: string }).code;
      const z = [...mitglieder.values()].find((x) => x.pruefcode === code);
      return json(z ? [{ name: profil.display_name, nummer: z.nummer, art: z.art, status: Number(z.bezahlt_bis) >= new Date().getFullYear() ? 'aktiv' : 'offen', gueltig_bis: `${z.bezahlt_bis}-12-31` }] : []);
    }
    if (url.pathname === '/rest/v1/rpc/member_directory') return json(o.verzeichnis ?? []);
    if (url.pathname === '/functions/v1/ausweis') {
      m.wallet++;
      return json({ url: 'https://pay.google.com/gp/v/save/test-jwt' });
    }
    if (url.pathname === '/rest/v1/rpc/offene_freigaben' || url.pathname === '/rest/v1/profiles_pending') return json([]);
    return json({ message: 'nicht nachgebaut' }, 404);
  });
  return m;
}
