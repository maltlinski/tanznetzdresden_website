/**
 * Seitenplan der Redaktion: Seite → Abschnitt → Element, so wie die Website aufgebaut ist.
 *
 * Quelle ist src/settings/texte.json: Jede Seite dort hat ihre Abschnitte in der Reihenfolge auf der Website,
 * jeder Abschnitt seine Texte und unter „auch“ die Inhalte, die anderswo gepflegt werden (Bereiche der
 * Redaktion wie „redaktion:formate“ oder Seiten im internen Bereich wie „intern/kalender/“).
 * Daraus entstehen die Seite „Seiten“, die Breadcrumbs und „Erscheint auf …“ an jedem Bereich.
 *
 * Ohne Imports von JSON: Die Seiten bauen den Plan beim Build (Astro) und geben ihn als kleines JSON mit.
 * Neuer Bereich in bereiche.ts → in texte.json beim passenden Abschnitt unter „auch“ eintragen
 * (sonst findet ihn die Redaktion unter „Seiten“ nicht; tests/redaktion-struktur.spec.ts prüft das).
 */
import type { TextSeite } from '../../../lib/texte-regeln';

export interface PlanZiel {
  text: string;
  ziel: string;
}
export interface PlanAbschnitt {
  id: string;
  titel: string;
  /** Anzahl der Texte */
  texte: number;
  /** die ersten Textstellen („wo“), damit man den Abschnitt wiedererkennt */
  beispiele: string[];
  auch: PlanZiel[];
}
export interface PlanSeite {
  id: string;
  titel: string;
  gruppe: string;
  pfad: string;
  nurVorstand: boolean;
  abschnitte: PlanAbschnitt[];
}
export interface Ort {
  seite: PlanSeite;
  abschnitt: PlanAbschnitt;
}

/** Seiten des internen Bereichs, auf die Abschnitte verweisen */
export const INTERN_ZIELE: Record<string, string> = {
  'intern/kalender/': 'Termine',
  'intern/news/': 'Beiträge',
  'intern/redaktion/freigaben/': 'Freigaben',
  'intern/news/medien/': 'Medien',
};

export function seitenplan(datei: Record<string, unknown>): PlanSeite[] {
  return (Object.entries(datei).filter(([k]) => !k.startsWith('_')) as [string, TextSeite][]).map(([id, s]) => ({
    id,
    titel: s.titel,
    gruppe: s.gruppe,
    pfad: s.pfad,
    nurVorstand: !!s.nurVorstand,
    abschnitte: Object.entries(s.abschnitte).map(([aid, a]) => ({
      id: aid,
      titel: a.titel,
      texte: Object.keys(a.texte).length,
      beispiele: Object.values(a.texte).slice(0, 3).map((t) => t.wo),
      auch: a.auch ?? [],
    })),
  }));
}

/** Wo ein Bereich („redaktion:<id>“) oder eine interne Seite auf der Website erscheint */
export function orte(plan: PlanSeite[], ziel: string): Ort[] {
  const out: Ort[] = [];
  for (const seite of plan) for (const abschnitt of seite.abschnitte) if (abschnitt.auch.some((x) => x.ziel === ziel)) out.push({ seite, abschnitt });
  return out;
}

/** „startseite.kopf“ → Ort (aus dem Parameter ?von=, damit die Breadcrumbs zeigen, woher man kommt) */
export function ortNach(plan: PlanSeite[], von: string | null): Ort | null {
  if (!von) return null;
  const [s, a] = von.split('.');
  const seite = plan.find((x) => x.id === s);
  const abschnitt = seite?.abschnitte.find((x) => x.id === a);
  return seite && abschnitt ? { seite, abschnitt } : null;
}

/** Plan als JSON für ein <script type="application/json"> (sicher im HTML) */
export const planJson = (plan: PlanSeite[]) => JSON.stringify(plan).replace(/</g, '\\u003c');

/** Plan aus der Seite lesen (siehe planJson) */
export function planLesen(): PlanSeite[] {
  const el = document.querySelector('script[data-seitenplan]');
  try {
    return el?.textContent ? (JSON.parse(el.textContent) as PlanSeite[]) : [];
  } catch {
    return [];
  }
}
