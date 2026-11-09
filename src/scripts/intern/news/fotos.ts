/**
 * Fotos für News (Bucket „newsbilder“): verkleinern (foto-datei.ts), hochladen, drehen.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { newsPhotoUrl } from '../../../lib/supabase';
import { endung, verkleinern } from '../foto-datei';

export const BUCKET = 'newsbilder';

const name = (slug: string, blob: Blob) =>
  `${new Date().getFullYear()}/${slug || 'beitrag'}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${endung(blob)}`;

/** Foto verkleinern und hochladen; gibt den Pfad im Bucket zurück */
export async function hochladen(sb: SupabaseClient, file: Blob, slug: string, drehen = 0): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Bitte ein Foto als JPG, PNG oder WebP wählen.');
  const blob = await verkleinern(file, drehen);
  const path = name(slug, blob);
  const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw error;
  return path;
}

/** Foto um 90° im Uhrzeigersinn drehen: als neue Datei hochladen, gibt den neuen Pfad zurück */
export async function drehen(sb: SupabaseClient, path: string, slug: string): Promise<string> {
  const res = await fetch(newsPhotoUrl(path)!, { cache: 'no-store' });
  if (!res.ok) throw new Error('Das Foto ließ sich nicht laden.');
  return hochladen(sb, await res.blob(), slug, 90);
}
