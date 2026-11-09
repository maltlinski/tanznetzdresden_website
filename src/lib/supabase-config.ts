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

/**
 * Daten aus Supabase beim Build holen? Nicht im Testlauf auf GitHub (Workflow „CI“, .github/workflows/ci.yml):
 * die Tests rechnen mit den Dateien in src/content/, echte Beiträge und Termine würden ihre Zahlen verschieben.
 */
export const datenAusSupabase =
  !!SUPABASE_URL && !!SUPABASE_ANON_KEY && !(typeof process !== 'undefined' && process.env.GITHUB_WORKFLOW === 'CI');

/**
 * Beim Build ließen sich Daten aus Supabase nicht laden. Lokal: Warnung und ohne sie weiterbauen.
 * Auf GitHub (CI): abbrechen – sonst ginge eine Website ohne Profile, News oder Termine online;
 * so bleibt der letzte gute Stand stehen, und der fehlgeschlagene Lauf fällt auf.
 */
export function supabaseFehlt(was: string, err: unknown, ersatz: string): never[] {
  if (typeof process !== 'undefined' && process.env.CI) {
    throw new Error(`${was} (${String(err)}). Build abgebrochen, die Website bleibt auf dem letzten Stand.`);
  }
  console.warn(`${was} (${String(err)}) – ${ersatz}.`);
  return [];
}
