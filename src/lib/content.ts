import { getCollection, type CollectionEntry } from 'astro:content';
import { sortKey } from './dates';

export type Termin = CollectionEntry<'termine'>;

export const badgeVariant = { Bühne: 'magenta', Training: 'cyan', Diskurs: 'purple' } as const;
export const eventCategories = ['Bühne', 'Training', 'Diskurs'] as const;

/** Alle veröffentlichten Termine, chronologisch. */
export async function getTermine(): Promise<Termin[]> {
  const all = await getCollection('termine', ({ data }) => !data.draft);
  return all.sort((a, b) => sortKey(a.data.start) - sortKey(b.data.start));
}

/** Kommende Termine ab Build-Zeitpunkt (der Browser blendet danach Vergangenes zusätzlich aus). */
export async function getUpcoming(limit?: number): Promise<Termin[]> {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const today = Number(`${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}0000`);
  const list = (await getTermine()).filter((t) => sortKey(t.data.end ?? t.data.start) >= today);
  return limit ? list.slice(0, limit) : list;
}

export async function getFormate() {
  return (await getCollection('formate')).sort((a, b) => a.data.order - b.data.order);
}

export async function getPersonen() {
  return getCollection('personen');
}
