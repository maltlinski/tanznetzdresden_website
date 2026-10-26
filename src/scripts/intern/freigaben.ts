/** Wie viele Mitgliederprofile oder Fotos warten auf Freigabe? (Redaktion → Freigaben) */
import type { SupabaseClient } from '@supabase/supabase-js';
import { internUrl } from './session';
import { t } from './sprache';

export async function offeneFreigaben(sb: SupabaseClient): Promise<number> {
  const zaehlen = (oder: string) =>
    sb.from('profiles').select('id', { count: 'exact', head: true }).eq('public_listing', true).not('slug', 'is', null).or(oder);
  // gallery_offen gibt es ab Migration 20261020000000_profil_seite.sql
  let { count, error } = await zaehlen('verified.eq.false,photo_pending.not.is.null,gallery_offen.eq.true');
  if (error) ({ count, error } = await zaehlen('verified.eq.false,photo_pending.not.is.null'));
  return error ? 0 : (count ?? 0);
}

/** Hinweis „n warten auf Freigabe →“ in ein Element schreiben (bleibt versteckt, wenn nichts wartet). */
export async function freigabenHinweis(sb: SupabaseClient, el: HTMLElement | null) {
  if (!el) return;
  const n = await offeneFreigaben(sb);
  el.hidden = n === 0;
  if (!n) return;
  const a = document.createElement('a');
  a.href = internUrl('redaktion/freigaben/');
  a.textContent = t(
    `${n} ${n === 1 ? 'Profil oder Foto wartet' : 'Profile oder Fotos warten'} auf Freigabe →`,
    `${n} ${n === 1 ? 'profile or photo is' : 'profiles or photos are'} waiting for approval →`,
  );
  el.replaceChildren(a);
}
