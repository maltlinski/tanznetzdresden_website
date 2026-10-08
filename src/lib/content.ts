import { getCollection, type CollectionEntry } from 'astro:content';
import { sortKey } from './dates';
import personenRaw from '../content/personen.yaml?raw';
import orteRaw from '../content/kooperation/orte.yaml?raw';
import gruppenRaw from '../content/kooperation/gruppen.yaml?raw';

/**
 * Sammlungen aus einer YAML-Datei kommen alphabetisch nach id zurück.
 * Für die Anzeige gilt aber die Reihenfolge in der Datei – so, wie man sie dort sieht.
 */
function inFileOrder<T extends { id: string }>(entries: T[], raw: string): T[] {
  const order = [...raw.matchAll(/^-\s+id:\s*["']?([^"'\s#]+)/gm)].map((m) => m[1]);
  const pos = (id: string) => {
    const i = order.indexOf(id);
    return i === -1 ? order.length : i;
  };
  return [...entries].sort((a, b) => pos(a.id) - pos(b.id));
}

export const getPersonen = async () => inFileOrder(await getCollection('personen'), personenRaw);
export const getOrte = async () => inFileOrder(await getCollection('orte'), orteRaw);
export const getPartnergruppen = async () => inFileOrder(await getCollection('partnergruppen'), gruppenRaw);

export type Termin = CollectionEntry<'termine'>;

export const badgeVariant = { Bühne: 'magenta', Training: 'cyan', Diskurs: 'purple' } as const;
export const eventCategories = ['Bühne', 'Training', 'Diskurs'] as const;
export type EventCategory = (typeof eventCategories)[number];
/** Anzeigenamen der Kategorien je Sprache (der Wert in den Dateien bleibt deutsch). */
export const categoryLabel: Record<'de' | 'en', Record<EventCategory | 'Alle', string>> = {
  de: { Alle: 'Alle', Bühne: 'Bühne', Training: 'Training', Diskurs: 'Diskurs' },
  en: { Alle: 'All', Bühne: 'Stage', Training: 'Training', Diskurs: 'Discourse' },
};

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

/** Termine, an denen eine Person mitwirkt (Feld `people` im Termin). */
export async function getTermineFor(personId: string) {
  return (await getUpcoming()).filter((t) => t.data.people.some((p) => p.id === personId));
}
