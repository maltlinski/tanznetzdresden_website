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
  // öffentliches Profil (Migration 20261008000000)
  slug: string | null;
  bio_en: string | null;
  tags: string[];
  photo_path: string | null;
  photo_credit: string | null;
  vimeo: string | null;
  verified: boolean;
}

export interface DirectoryEntry extends Pick<Profile, 'id' | 'display_name' | 'pronouns' | 'bio' | 'website' | 'instagram' | 'is_trainer' | 'ags' | 'role' | 'slug' | 'public_listing' | 'verified'> {
  email: string | null;
  phone: string | null;
}

/** Öffentliche Adresse eines Porträts im Bucket „profilbilder“. */
export function photoUrl(path: string | null): string | null {
  return path && PUBLIC_SUPABASE_URL ? `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/profilbilder/${path}` : null;
}

/** Kürzel aus einem Namen: „Aurélie Lafaye“ → „aurelie-lafaye“ (wie in personen.yaml). */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, 'und')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
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
