/** Wie viele Mitgliederprofile oder Fotos warten auf Freigabe? (Redaktion → Freigaben) */
import type { SupabaseClient } from '@supabase/supabase-js';
import { internUrl } from './session';

export async function offeneFreigaben(sb: SupabaseClient): Promise<number> {
  const { count, error } = await sb
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('public_listing', true)
    .not('slug', 'is', null)
    .or('verified.eq.false,photo_pending.not.is.null');
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
  a.textContent = `${n} ${n === 1 ? 'Profil oder Foto wartet' : 'Profile oder Fotos warten'} auf Freigabe →`;
  el.replaceChildren(a);
}
