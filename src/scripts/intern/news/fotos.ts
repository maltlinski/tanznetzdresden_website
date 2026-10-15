/**
 * Fotos für News (Bucket „newsbilder“): verkleinern, hochladen, drehen, Ausschnitt wählen.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { newsPhotoUrl } from '../../../lib/supabase';

export const BUCKET = 'newsbilder';

/** Große Fotos im Browser verkleinern (max. 2400 px), damit der Upload schnell geht. */
async function verkleinern(file: Blob, drehen = 0): Promise<Blob> {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  if (scale === 1 && file.size < 3_000_000 && !drehen) return file;
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const quer = drehen % 180 !== 0;
  const c = document.createElement('canvas');
  c.width = quer ? h : w;
  c.height = quer ? w : h;
  const g = c.getContext('2d')!;
  g.translate(c.width / 2, c.height / 2);
  g.rotate((drehen * Math.PI) / 180);
  g.drawImage(bmp, -w / 2, -h / 2, w, h);
  return new Promise((res) => c.toBlob((b) => res(b ?? file), 'image/jpeg', 0.86));
}

const name = (slug: string, typ: string) =>
  `${new Date().getFullYear()}/${slug || 'beitrag'}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${typ === 'image/png' ? 'png' : typ === 'image/webp' ? 'webp' : 'jpg'}`;

/** Foto verkleinern und hochladen; gibt den Pfad im Bucket zurück */
export async function hochladen(sb: SupabaseClient, file: Blob, slug: string, drehen = 0): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Bitte ein Foto als JPG, PNG oder WebP wählen.');
  const blob = await verkleinern(file, drehen);
  const path = name(slug, blob.type || 'image/jpeg');
  const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

/** Foto um 90° im Uhrzeigersinn drehen: als neue Datei hochladen, gibt den neuen Pfad zurück */
export async function drehen(sb: SupabaseClient, path: string, slug: string): Promise<string> {
  const res = await fetch(newsPhotoUrl(path)!, { cache: 'no-store' });
  if (!res.ok) throw new Error('Das Foto ließ sich nicht laden.');
  return hochladen(sb, await res.blob(), slug, 90);
}

/** Ausschnitt aus einem Klick ins Foto: „x% y%“ */
export function fokusAusKlick(e: MouseEvent, el: HTMLElement): string {
  const r = el.getBoundingClientRect();
  const x = Math.round(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)));
  const y = Math.round(Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)));
  return `${x}% ${y}%`;
}
