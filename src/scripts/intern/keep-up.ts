/**
 * Intern → KEEP UP: gemeinsame Helfer für Planung (Vorstand), „Meine Trainings“ und den Editor.
 * Daten: Tabelle keepup_termine (supabase/migrations/20261025000000_keepup.sql), Logik in src/lib/keep-up-plan.ts.
 * Dozent:innen und Fotos der Website stehen beim Build als JSON in der Seite (components/intern/KeepUpDaten.astro).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { ersterTag, letzterTag, montag, plusTage, kalenderwoche, status, type KeepUpTermin } from '../../lib/keep-up-plan';
import { h } from './news/dom';

export interface Dozentin {
  id: string;
  name: string;
  stil: string;
  /** kleines Porträt (oder leer) */
  foto: string;
}
export interface WebsiteFoto {
  /** „assets/photos/<datei>“ */
  bild: string;
  src: string;
  alt: string;
}
export interface KeepUpDaten {
  dozentinnen: Dozentin[];
  fotos: WebsiteFoto[];
  /** Standardort (verein.json → training.place) */
  ort: string;
  /** Adresse des Kalenders auf der Website */
  website: string;
}

export const daten = (): KeepUpDaten =>
  JSON.parse(document.querySelector('[data-ku-daten]')?.textContent ?? '{"dozentinnen":[],"fotos":[],"ort":"","website":"/"}');

export const SPALTEN = 'id,art,dozent,woche,tage,zeit,ort,notiz,titel,kurz,text,schwerpunkte,mitbringen,bild,bild_alt,veroeffentlicht,veroeffentlicht_am,erinnert_am';

/** Tabelle fehlt, solange die Migration nicht eingespielt ist */
export const FEHLT = 'Die Tabelle für KEEP UP fehlt noch. Bitte die Migration supabase/migrations/20261025000000_keepup.sql im SQL-Editor ausführen (docs/keep-up.md).';
export const tabelleFehlt = (e: unknown) => /keepup_termine|relation .* does not exist|schema cache|PGRST20[05]/i.test(String((e as { message?: string; code?: string })?.message ?? '') + String((e as { code?: string })?.code ?? ''));

export async function ladeTermine(sb: SupabaseClient, dozent?: string): Promise<KeepUpTermin[]> {
  let q = sb.from('keepup_termine').select(SPALTEN).order('woche');
  if (dozent) q = q.eq('dozent', dozent);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as KeepUpTermin[];
}

/** Kürzel der angemeldeten Person (Profiladresse), null = keine Dozent:in */
export async function ich(sb: SupabaseClient): Promise<string | null> {
  const { data, error } = await sb.rpc('keepup_ich');
  return error ? null : ((data as string | null) ?? null);
}

export const heute = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MOS = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];
export const DS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const DOWL = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const teile = (iso: string) => iso.split('-').map(Number) as [number, number, number];
export const monatName = (y: number, m: number) => `${MON[m]} ${y}`;
/** „26. Okt.“ */
export const tagKurz = (iso: string) => `${teile(iso)[2]}. ${MOS[teile(iso)[1] - 1]}`;
/** „26. Oktober“ */
export const tagLang = (iso: string) => `${teile(iso)[2]}. ${MON[teile(iso)[1] - 1]}`;
export const wochentag = (iso: string) => (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;

/** „26.–30. Okt.“, „30. Okt. – 3. Nov.“ oder „Sa · 14. Nov.“ */
export function zeitraum(t: Pick<KeepUpTermin, 'woche' | 'tage'>): string {
  const a = ersterTag(t);
  const z = letzterTag(t);
  if (a === z) return `${DS[wochentag(a)]} · ${tagKurz(a)}`;
  const [, ma, da] = teile(a);
  const [, mz, dz] = teile(z);
  return ma === mz ? `${da}.–${dz}. ${MOS[ma - 1]}` : `${tagKurz(a)} – ${tagKurz(z)}`;
}
export const tageText = (t: Pick<KeepUpTermin, 'tage'>) => [...t.tage].sort((a, b) => a - b).map((d) => DS[d - 1]).join(' ');
export const wocheText = (woche: string) => {
  const so = plusTage(woche, 6);
  const [, mm, dm] = teile(woche);
  const [, ms, ds] = teile(so);
  return `KW ${kalenderwoche(woche)} · ${mm === ms ? `${dm}.–${ds}. ${MOS[mm - 1]}` : `${tagKurz(woche)} – ${tagKurz(so)}`}`;
};
export const istVorbei = (t: KeepUpTermin, h0 = heute()) => letzterTag(t) < h0;
export const tageBis = (t: KeepUpTermin, h0 = heute()) => Math.round((+new Date(`${ersterTag(t)}T00:00:00Z`) - +new Date(`${h0}T00:00:00Z`)) / 86400000);
export const artText = (t: Pick<KeepUpTermin, 'art'>) => (t.art === 'workshop' ? 'Workshop' : 'Training');
export const initialen = (name: string) => name.split(/[\s&]+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
export { montag, status };

/** Status-Badge wie im Entwurf */
export function badge(text: string, variante: string) {
  const farbe = variante === 'cyan' || variante === 'purple' ? `badge--${variante}` : `ku-badge--${variante}`;
  return h('span', { class: `badge ku-badge ${farbe}`, text });
}

/** Meldung unten links, optional mit Knopf (z. B. „Rückgängig“) */
let toastZeit = 0;
export function toast(text: string, knopf?: { text: string; klick: () => void }) {
  const el = document.querySelector<HTMLElement>('[data-ku-toast]');
  if (!el) return;
  el.querySelector('[data-ku-toast-text]')!.textContent = text;
  const b = el.querySelector<HTMLButtonElement>('[data-ku-toast-knopf]')!;
  b.hidden = !knopf;
  b.textContent = knopf?.text ?? '';
  b.onclick = knopf ? () => { knopf.klick(); el.hidden = true; } : null;
  el.hidden = false;
  clearTimeout(toastZeit);
  toastZeit = window.setTimeout(() => (el.hidden = true), 5200);
}
