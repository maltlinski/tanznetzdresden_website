/**
 * Verbindung zur Edge Function „inhalte“ (supabase/functions/inhalte/index.ts).
 * Sie liest und speichert die Inhalte im GitHub-Repository; der Browser kennt keinen GitHub-Schlüssel.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../../../lib/supabase-config';

export interface DateiInfo {
  pfad: string;
  sha: string;
  groesse: number;
}
export interface Stand {
  head: string;
  rolle: 'presse' | 'vorstand' | 'admin';
  name: string;
  dateien: DateiInfo[];
}
export interface Gelesen {
  sha: string;
  text: string;
}
export interface Aenderung {
  pfad: string;
  text?: string;
  base64?: string;
  loeschen?: boolean;
  /** Stand beim Lesen; null = Datei ist neu */
  alt?: string | null;
}
export interface WebsiteStatus {
  website: { status: string; ergebnis: string | null; zeit: string; url: string; commit: string } | null;
  verlauf: { sha: string; url: string; zeit: string; titel: string; von: string | null }[];
}

export class ApiFehler extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function api(sb: SupabaseClient) {
  async function call<T>(aktion: string, daten: Record<string, unknown> = {}): Promise<T> {
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new ApiFehler(401, 'Deine Anmeldung ist abgelaufen. Bitte melde dich neu an.');
    let res: Response;
    try {
      res = await fetch(`${SUPABASE_URL}/functions/v1/inhalte`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ aktion, ...daten }),
      });
    } catch {
      throw new ApiFehler(0, 'Keine Verbindung zur Redaktion. Bitte prüfe deine Internetverbindung. Ist die Funktion „inhalte“ in Supabase eingerichtet?');
    }
    const body = (await res.json().catch(() => null)) as (T & { fehler?: string }) | null;
    if (!res.ok || !body) {
      if (res.status === 404 && !body?.fehler) throw new ApiFehler(404, 'Die Redaktion ist noch nicht eingerichtet: Die Supabase-Funktion „inhalte“ fehlt (docs/redaktion.md).');
      throw new ApiFehler(res.status, body?.fehler ?? `Die Redaktion antwortet mit Fehler ${res.status}.`);
    }
    return body;
  }
  return {
    stand: () => call<Stand>('stand'),
    lesen: (pfade: string[]) => call<{ head: string; dateien: Record<string, Gelesen | null> }>('lesen', { pfade }),
    datei: (pfad: string) => call<{ sha: string; base64: string }>('datei', { pfad }),
    speichern: (nachricht: string, aenderungen: Aenderung[]) => call<{ commit: string; url: string }>('speichern', { nachricht, aenderungen }),
    status: () => call<WebsiteStatus>('status'),
  };
}
export type Api = ReturnType<typeof api>;
