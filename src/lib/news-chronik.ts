/**
 * Chronik der News-Übersicht in zwei Teilen: Die neuesten Beiträge stehen im HTML der Seite, alle älteren in
 * einer eigenen Datei (news/weitere/), die src/scripts/news-chronik.ts nachlädt. So bleibt die Übersicht klein,
 * auch wenn das Archiv wächst.
 */
import type { NewsPost } from './news';

/** So viele Beiträge zeigt die Liste zuerst (gleich SCHRITT.liste in src/scripts/news-chronik.ts) */
export const CHRONIK_ERSTE = 24;

/** `erste`: Titelthema und die neuesten Beiträge (im HTML); `rest`: alle älteren (zum Nachladen) */
export function chronikTeilen(posts: NewsPost[], lead?: NewsPost): { erste: NewsPost[]; rest: NewsPost[] } {
  const ohne = posts.filter((p) => p !== lead);
  return { erste: [...(lead ? [lead] : []), ...ohne.slice(0, CHRONIK_ERSTE)], rest: ohne.slice(CHRONIK_ERSTE) };
}
