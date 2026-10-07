/**
 * Supabase-Client für den internen Bereich (läuft nur im Browser).
 * Ohne konfigurierte Umgebungsvariablen gibt es keinen Client – der interne
 * Bereich zeigt dann einen Einrichtungs-Hinweis statt eines Fehlers.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from 'astro:env/client';

export interface Profile {
  id: string;
  display_name: string;
  pronouns: string | null;
  bio: string | null;
  website: string | null;
  instagram: string | null;
  phone: string | null;
  is_trainer: boolean;
  ags: string[];
  show_email: boolean;
  show_phone: boolean;
  public_listing: boolean;
  role: 'mitglied' | 'vorstand' | 'admin';
}

export interface DirectoryEntry extends Pick<Profile, 'id' | 'display_name' | 'pronouns' | 'bio' | 'website' | 'instagram' | 'is_trainer' | 'ags' | 'role'> {
  email: string | null;
  phone: string | null;
}

let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  client =
    PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_ANON_KEY
      ? createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
        })
      : null;
  return client;
}

export const isConfigured = () => getSupabase() !== null;
