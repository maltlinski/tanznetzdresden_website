/**
 * Supabase-Client für den internen Bereich (läuft nur im Browser).
 * Ohne Zugangsdaten (src/settings/supabase.ts) gibt es keinen Client – der interne
 * Bereich zeigt dann einen Einrichtungs-Hinweis statt eines Fehlers.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase-config';

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
  role: 'mitglied' | 'presse' | 'vorstand' | 'admin';
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

/** News-Beitrag aus dem internen Bereich (Migration 20261009000000_news.sql) */
export interface NewsRow {
  id: string;
  slug: string;
  status: 'entwurf' | 'veroeffentlicht';
  category: 'Netzwerk' | 'Ausschreibung' | 'Training' | 'Verein' | 'Rückblick' | 'Stimme';
  date: string;
  author: string;
  featured: boolean;
  deadline: string | null;
  title: string;
  teaser: string;
  body: string;
  facts: { label: string; value: string }[];
  image_path: string | null;
  image_alt: string | null;
  image_credit: string | null;
  quote_text: string | null;
  quote_who: string | null;
  quote_role: string | null;
  title_en: string | null;
  teaser_en: string | null;
  body_en: string | null;
  facts_en: { label: string; value: string }[];
  image_alt_en: string | null;
  quote_text_en: string | null;
  quote_role_en: string | null;
  updated_at: string;
  published_at: string | null;
}

/** Öffentliche Adresse eines Fotos im Bucket „newsbilder“. */
export function newsPhotoUrl(path: string | null): string | null {
  return path && SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/newsbilder/${path}` : null;
}

/** Öffentliche Adresse eines Porträts im Bucket „profilbilder“. */
export function photoUrl(path: string | null): string | null {
  return path && SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/profilbilder/${path}` : null;
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
    SUPABASE_URL && SUPABASE_ANON_KEY
      ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
        })
      : null;
  return client;
}

export const isConfigured = () => getSupabase() !== null;
