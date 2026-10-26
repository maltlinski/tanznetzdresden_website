/**
 * Gemeinsame Logik aller internen Seiten:
 * prüft die Anmeldung, lädt das eigene Profil und schaltet die Ansicht um.
 *
 * Zustände am Element [data-intern] → data-state:
 *   loading · setup (Supabase fehlt) · login (nicht angemeldet) · ready
 */
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getSupabase, type Profile } from '../../lib/supabase';
import { internPfad } from '../../lib/intern-sprache';
import { sprache, t } from './sprache';

export interface InternContext {
  sb: SupabaseClient;
  user: User;
  profile: Profile | null;
  isVorstand: boolean;
  /** darf News schreiben (Presse, Vorstand, Admin) */
  isRedaktion: boolean;
}

const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
/** Adresse einer internen Seite; auf englischen Seiten die englische, wenn es sie gibt */
export const internUrl = (path = '') => `${base}${internPfad(sprache, path)}`;

let meldeBereit: (ctx: InternContext) => void = () => {};
/** Erfüllt, sobald eine Seite initIntern() erfolgreich aufgerufen hat (z. B. für die Seitenleiste der Redaktion) */
export const bereit = new Promise<InternContext>((r) => (meldeBereit = r));

export const ROLLEN: Record<Profile['role'], string> = t(
  { mitglied: 'Mitglied', presse: 'Presse', vorstand: 'Vorstand', admin: 'Admin' },
  { mitglied: 'Member', presse: 'Press', vorstand: 'Board', admin: 'Admin' },
);

const root = () => document.querySelector<HTMLElement>('[data-intern]');
export const setState = (state: 'loading' | 'setup' | 'login' | 'ready') => {
  const el = root();
  if (el) el.dataset.state = state;
};

/** Verständliche Fehlermeldungen für die häufigsten Supabase-Fehler (Deutsch oder Englisch, je nach Seite). */
export function errorText(err: unknown): string {
  const msg = String((err as { message?: string })?.message ?? err ?? '');
  if (/invalid login credentials/i.test(msg)) return t('E-Mail oder Passwort stimmt nicht.', 'Email or password is incorrect.');
  if (/email not confirmed/i.test(msg)) return t('Bitte bestätige zuerst deine E-Mail-Adresse.', 'Please confirm your email address first.');
  // eigene Meldungen der Datenbank-Trigger (supabase/migrations) sind schon verständlich
  if (sprache === 'en' && /^Neue Fotos/.test(msg)) return 'New photos are approved by the press team or the board.';
  if (sprache === 'en' && /^Profil nicht gefunden/.test(msg)) return 'Profile not found.';
  if (/^(Nur der Vorstand|Nur Presse|Die Rolle Admin|Neue Fotos|Profil nicht gefunden)/.test(msg)) return msg;
  if (/rate limit|too many/i.test(msg)) return t('Zu viele Versuche. Bitte warte kurz und versuche es dann erneut.', 'Too many attempts. Please wait a moment and try again.');
  if (/password should be at least|weak password/i.test(msg)) return t('Das Passwort ist zu kurz oder zu schwach (mindestens 10 Zeichen).', 'The password is too short or too weak (at least 10 characters).');
  if (/signups not allowed|user not found/i.test(msg)) return t('Für diese Adresse gibt es kein Konto. Zugänge vergibt der Vorstand.', 'There is no account for this address. Access is granted by the board.');
  if (/network|fetch/i.test(msg)) return t('Keine Verbindung. Bitte prüfe deine Internetverbindung.', 'No connection. Please check your internet connection.');
  return t('Das hat nicht geklappt. Bitte versuche es erneut.', 'That did not work. Please try again.');
}

export function showMessage(el: HTMLElement | null, text: string, kind: 'error' | 'ok' = 'error') {
  if (!el) return;
  el.textContent = text;
  el.dataset.kind = kind;
  el.hidden = !text;
}

/**
 * @param requireLogin true: ohne Anmeldung zur Login-Seite weiterleiten
 */
export async function initIntern(requireLogin = true): Promise<InternContext | null> {
  const sb = getSupabase();
  if (!sb) {
    setState('setup');
    return null;
  }
  const { data } = await sb.auth.getSession();
  const user = data.session?.user;
  if (!user) {
    if (requireLogin) {
      location.replace(`${internUrl()}?weiter=${encodeURIComponent(location.pathname)}`);
    } else {
      setState('login');
    }
    return null;
  }
  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle<Profile>();
  const isVorstand = profile?.role === 'vorstand' || profile?.role === 'admin';
  const isRedaktion = isVorstand || profile?.role === 'presse';

  document.querySelectorAll<HTMLElement>('[data-intern-name]').forEach((el) => (el.textContent = profile?.display_name || user.email || ''));
  document.querySelectorAll<HTMLElement>('[data-intern-rolle]').forEach((el) => (el.textContent = profile ? ROLLEN[profile.role] ?? '' : ''));
  document.querySelectorAll<HTMLElement>('[data-vorstand-only]').forEach((el) => (el.hidden = !isVorstand));
  document.querySelectorAll<HTMLElement>('[data-redaktion-only]').forEach((el) => (el.hidden = !isRedaktion));
  document.querySelectorAll<HTMLButtonElement>('[data-logout]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      await sb.auth.signOut();
      location.href = internUrl();
    }),
  );
  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') location.href = internUrl();
  });
  setState('ready');
  const ctx = { sb, user, profile: profile ?? null, isVorstand, isRedaktion };
  meldeBereit(ctx);
  return ctx;
}
