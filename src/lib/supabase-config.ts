/**
 * Supabase-Adresse und öffentlicher Schlüssel – aus src/settings/supabase.ts,
 * Umgebungsvariablen (PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY) haben Vorrang.
 * Die Adresse wird bereinigt: aus Versehen kopiertes /rest/v1/ oder ein Schrägstrich am Ende stören nicht.
 */
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from 'astro:env/client';
import { supabase } from '../settings/supabase';

const cleanUrl = (u: string) =>
  u
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/(rest|auth|storage)\/v1$/, '');

export const SUPABASE_URL = cleanUrl(PUBLIC_SUPABASE_URL || supabase.url);
export const SUPABASE_ANON_KEY = (PUBLIC_SUPABASE_ANON_KEY || supabase.anonKey).trim();
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
