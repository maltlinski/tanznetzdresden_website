/**
 * Gemeinsame Logik aller internen Seiten:
 * prüft die Anmeldung, lädt das eigene Profil und schaltet die Ansicht um.
 *
 * Zustände am Element [data-intern] → data-state:
 *   loading · setup (Supabase fehlt) · login (nicht angemeldet) · ready
 */
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getSupabase, type Profile } from '../../lib/supabase';

export interface InternContext {
  sb: SupabaseClient;
  user: User;
  profile: Profile | null;
  isVorstand: boolean;
  /** darf News schreiben (Presse, Vorstand, Admin) */
  isRedaktion: boolean;
}

const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
export const internUrl = (path = '') => `${base}intern/${path}`;

const root = () => document.querySelector<HTMLElement>('[data-intern]');
export const setState = (state: 'loading' | 'setup' | 'login' | 'ready') => {
  const el = root();
  if (el) el.dataset.state = state;
};

/** Deutsche Fehlermeldungen für die häufigsten Supabase-Fehler. */
export function errorText(err: unknown): string {
  const msg = String((err as { message?: string })?.message ?? err ?? '');
  if (/invalid login credentials/i.test(msg)) return 'E-Mail oder Passwort stimmt nicht.';
  if (/email not confirmed/i.test(msg)) return 'Bitte bestätige zuerst deine E-Mail-Adresse.';
  // eigene Meldungen der Datenbank-Trigger (supabase/migrations) sind schon verständlich
  if (/^(Nur der Vorstand|Die Rolle Admin)/.test(msg)) return msg;
  if (/rate limit|too many/i.test(msg)) return 'Zu viele Versuche. Bitte warte kurz und versuche es dann erneut.';
  if (/password should be at least|weak password/i.test(msg)) return 'Das Passwort ist zu kurz oder zu schwach (mindestens 10 Zeichen).';
  if (/signups not allowed|user not found/i.test(msg)) return 'Für diese Adresse gibt es kein Konto. Zugänge vergibt der Vorstand.';
  if (/network|fetch/i.test(msg)) return 'Keine Verbindung. Bitte prüfe deine Internetverbindung.';
  return 'Das hat nicht geklappt. Bitte versuche es erneut.';
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
  return { sb, user, profile: profile ?? null, isVorstand, isRedaktion };
}
