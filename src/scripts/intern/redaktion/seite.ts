/**
 * Gemeinsames der Redaktionsseiten: Anmeldung und Rolle prüfen, Stand laden, Namen für Verweise,
 * Website-Status („wird aktualisiert“) und Hinweise.
 */
import { initIntern, internUrl, type InternContext } from '../session';
import { api, type Api, type Stand, type WebsiteStatus } from './api';
import { bereich as bereichNach, type Bereich, type Kontext, type Option } from './bereiche';
import { laden, verweisFelder, type Eintrag, type Geladen } from './daten';
import { INTERN_ZIELE, orte, ortNach, type Ort, type PlanSeite } from './seitenplan';

export interface Redaktion {
  ctx: InternContext;
  a: Api;
  stand: Stand;
  vorstand: boolean;
}

export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);

export function meldung(text: string, art: 'error' | 'ok' = 'error', el = $('[data-msg]')) {
  if (!el) return;
  el.textContent = text;
  el.dataset.kind = art;
  el.hidden = !text;
}

/** Anmeldung, Rolle und Stand des Repositorys; null, wenn die Seite nicht weitermachen kann */
export async function starten(): Promise<Redaktion | null> {
  const ctx = await initIntern(true);
  if (!ctx) return null;
  const ohne = $('[data-no-access]');
  const mit = $('[data-access]');
  if (!ctx.isRedaktion) {
    if (ohne) ohne.hidden = false;
    return null;
  }
  const a = api(ctx.sb);
  const laedt = $('[data-loading]');
  if (laedt) laedt.hidden = false;
  try {
    const stand = await a.stand();
    if (mit) mit.hidden = false;
    return { ctx, a, stand, vorstand: stand.rolle !== 'presse' };
  } catch (e) {
    meldung((e as Error).message);
    return null;
  } finally {
    if (laedt) laedt.hidden = true;
  }
}

export const redaktionUrl = (pfad = '', params: Record<string, string | undefined> = {}) => {
  const q = new URLSearchParams(Object.entries(params).filter((x): x is [string, string] => x[1] !== undefined));
  return `${internUrl(`redaktion/${pfad}`)}${q.size ? `?${q}` : ''}`;
};

/** Öffentliche Adresse einer Seite der Website */
export const websiteUrl = (pfad: string) => `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}${pfad}`;

/** Adresse eines Bereichs (Liste oder, bei Einstellungen, gleich das Formular); von = „seite.abschnitt“ für die Breadcrumbs */
export const bereichUrl = (b: Bereich, von?: string) =>
  b.art === 'einstellung' ? redaktionUrl('eintrag/', { b: b.id, von }) : redaktionUrl('liste/', { b: b.id, von });

/** Ziel aus dem Seitenplan („redaktion:<bereich>“ oder Pfad im internen Bereich) → Adresse */
export function zielUrl(ziel: string, von?: string): string {
  if (!ziel.startsWith('redaktion:')) return internUrl(ziel.replace(/^intern\//, ''));
  const b = bereichNach(ziel.slice(10));
  return b ? bereichUrl(b, von) : redaktionUrl();
}
/** Name des Ziels, z. B. „Formate“ oder „Termine“ */
export const zielName = (ziel: string) =>
  ziel.startsWith('redaktion:') ? (bereichNach(ziel.slice(10))?.label ?? '') : (INTERN_ZIELE[ziel] ?? 'Interner Bereich');

/** Adresse der Seite „Seiten“ (optional mit Seite und Abschnitt) */
export const seitenUrl = (seite?: string, abschnitt?: string) =>
  `${redaktionUrl('seiten/', { s: seite })}${seite && abschnitt ? `#abschnitt-${seite}-${abschnitt}` : ''}`;

// ---------- Breadcrumbs und „Erscheint auf …“ ----------

export interface Krume {
  label: string;
  href?: string;
}

/** Breadcrumbs neu setzen (Website-Inhalte kommt immer davor; components/intern/Brotkrumen.astro) */
export function brotkrumen(pfad: Krume[]) {
  const ol = document.querySelector('[data-brotkrumen] ol');
  if (!ol) return;
  const voll: Krume[] = [{ label: 'Website-Inhalte', href: redaktionUrl() }, ...pfad];
  ol.replaceChildren(
    ...voll.map((k, i) => {
      const li = document.createElement('li');
      const letzte = i === voll.length - 1;
      const el = document.createElement(!letzte && k.href ? 'a' : 'span');
      el.textContent = k.label;
      if (el instanceof HTMLAnchorElement) el.href = k.href!;
      if (letzte) el.setAttribute('aria-current', 'page');
      li.append(el);
      return li;
    }),
  );
}

/** Krumen bis zum Abschnitt: Seiten › Startseite › Kopf */
export const ortsKrumen = (o: Ort | null): Krume[] =>
  o
    ? [{ label: 'Seiten', href: seitenUrl() }, { label: o.seite.titel, href: seitenUrl(o.seite.id) }, { label: o.abschnitt.titel, href: seitenUrl(o.seite.id, o.abschnitt.id) }]
    : [{ label: 'Seiten', href: seitenUrl() }];

/** Wo ein Bereich erscheint: aus ?von= (woher man kommt), sonst die erste Stelle im Seitenplan */
export function bereichOrt(plan: PlanSeite[], b: Bereich): { ort: Ort | null; alle: Ort[]; von: string | undefined } {
  const alle = orte(plan, `redaktion:${b.id}`);
  const vonParam = new URLSearchParams(location.search).get('von');
  const gewaehlt = ortNach(plan, vonParam);
  const ort = gewaehlt && alle.some((o) => o.seite.id === gewaehlt.seite.id && o.abschnitt.id === gewaehlt.abschnitt.id) ? gewaehlt : (alle[0] ?? null);
  return { ort, alle, von: ort ? `${ort.seite.id}.${ort.abschnitt.id}` : undefined };
}

/** „Erscheint auf der Website: Startseite › Kopf · Über uns › Haltung“ mit Links in den Seitenplan */
export function erscheintAuf(el: HTMLElement | null, alle: Ort[]) {
  if (!el) return;
  el.replaceChildren();
  el.hidden = !alle.length;
  if (!alle.length) return;
  el.append('Erscheint auf der Website: ');
  alle.forEach((o, i) => {
    if (i) el.append(' · ');
    const a = document.createElement('a');
    a.href = seitenUrl(o.seite.id, o.abschnitt.id);
    a.textContent = `${o.seite.titel} › ${o.abschnitt.titel}`;
    el.append(a);
  });
}

// ---------- Namen und Optionen aus anderen Bereichen ----------

export interface Namen extends Kontext {
  optionen(quelle: string): Option[];
  /** Bereich (mit allem, was seine Titel brauchen) laden und merken */
  laden(quelle: string): Promise<Geladen | undefined>;
}

/**
 * Lädt die Bereiche, deren Namen gebraucht werden (inkl. Abhängigkeiten), dazu aus Supabase die News und
 * die freigegebenen Mitgliederprofile (auch sie lassen sich in Terminen und als Dozent:in auswählen).
 */
export async function namenLaden(r: Redaktion, quellen: string[]): Promise<Namen> {
  const cache = new Map<string, Geladen>();
  const news = new Map<string, string>();
  const mitglieder = new Map<string, string>();
  const ladeMit = async (id: string): Promise<void> => {
    if (cache.has(id)) return;
    const b = bereichNach(id);
    if (!b) return;
    for (const d of b.braucht ?? []) await ladeMit(d);
    cache.set(id, await laden(r.a, b, r.stand.dateien));
  };
  for (const q of new Set(quellen)) await ladeMit(q);
  if (quellen.includes('news')) {
    const { data } = await r.ctx.sb.from('news_posts').select('slug, title, status');
    for (const n of (data ?? []) as { slug: string; title: string; status: string }[]) news.set(n.slug, `${n.title}${n.status === 'veroeffentlicht' ? '' : ' (Entwurf)'}`);
  }
  if (cache.has('personen')) {
    const { data } = await r.ctx.sb.from('public_profiles').select('slug, display_name');
    for (const p of (data ?? []) as { slug: string; display_name: string }[]) mitglieder.set(p.slug, p.display_name);
  }
  const k: Namen = {
    name(quelle, id) {
      if (!id) return '';
      const g = cache.get(quelle);
      const e = g?.eintraege.find((x) => x.id === id);
      if (e) return g!.bereich.titel(e, k);
      return (quelle === 'personen' ? mitglieder.get(id) : news.get(id)) ?? id;
    },
    optionen(quelle) {
      const g = cache.get(quelle);
      const aus = (g?.eintraege ?? []).map((e) => ({ wert: e.id, label: g!.bereich.titel(e, k) }));
      if (quelle === 'news') for (const [slug, t] of news) if (!aus.some((o) => o.wert === slug)) aus.push({ wert: slug, label: `${t} (News schreiben)` });
      if (quelle === 'personen') for (const [slug, n] of mitglieder) if (!aus.some((o) => o.wert === slug)) aus.push({ wert: slug, label: `${n} (Mitgliederprofil)` });
      return aus.sort((x, y) => x.label.localeCompare(y.label, 'de'));
    },
    laden: async (q) => {
      await ladeMit(q);
      return cache.get(q);
    },
  };
  return k;
}

/** Alle Quellen, auf die die Felder eines Bereichs verweisen */
export function verweisQuellen(b: Bereich): string[] {
  const out = new Set<string>(b.braucht ?? []);
  const sammeln = (felder: Bereich['felder']) => {
    for (const f of felder) {
      if (f.typ === 'verweis') out.add(f.quelle);
      if (f.typ === 'liste') sammeln(f.felder);
    }
  };
  sammeln(b.felder);
  return [...out];
}

/** Wo wird ein Eintrag noch verwendet? (verhindert Löschen, das die Website kaputt machen würde) */
export async function verwendungen(r: Redaktion, b: Bereich, id: string, namen: Namen): Promise<string[]> {
  const { bereiche } = await import('./bereiche');
  const out: string[] = [];
  for (const andere of bereiche) {
    const felder = verweisFelder(andere.felder, b.id);
    if (!felder.length) continue;
    const g = (await namen.laden(andere.id))!;
    for (const e of g.eintraege) {
      if (andere.id === b.id && e.id === id) continue;
      const trifft = felder.some(({ key, inListe }) => {
        const werte = inListe ? ((e.data[inListe] ?? []) as Record<string, unknown>[]).map((x) => x[key]) : [key === 'id' ? e.id : e.data[key]];
        return werte.some((w) => w === id || (Array.isArray(w) && w.includes(id)));
      });
      if (trifft) out.push(`${andere.einzahl} „${andere.titel(e, namen)}“`);
    }
  }
  return out;
}

// ---------- Website-Status ----------

const zeit = (iso: string) => new Date(iso).toLocaleString('de-DE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Zeigt, ob die Website gerade neu gebaut wird; fragt währenddessen alle 20 Sekunden nach. */
export function statusAnzeigen(r: Redaktion, el: HTMLElement | null, verlauf?: HTMLElement | null) {
  if (!el) return;
  let timer: number | undefined;
  const text = el.querySelector<HTMLElement>('[data-status-text]')!;
  const holen = async () => {
    let s: WebsiteStatus;
    try {
      s = await r.a.status();
    } catch {
      el.dataset.zustand = 'unbekannt';
      text.textContent = 'Status der Website nicht abrufbar.';
      return;
    }
    const w = s.website;
    const laeuft = !!w && w.status !== 'completed';
    el.dataset.zustand = !w ? 'unbekannt' : laeuft ? 'laeuft' : w.ergebnis === 'success' ? 'ok' : 'fehler';
    text.textContent = !w
      ? 'Noch keine Veröffentlichung.'
      : laeuft
        ? 'Die Website wird gerade aktualisiert. Das dauert etwa 2–3 Minuten.'
        : w.ergebnis === 'success'
          ? `Die Website ist aktuell (Stand ${zeit(w.zeit)}).`
          : 'Die letzte Aktualisierung ist fehlgeschlagen. Die Website zeigt noch den vorherigen Stand. Bitte gib dem Vorstand oder Admin Bescheid.';
    if (verlauf) {
      verlauf.replaceChildren(
        ...s.verlauf.map((c) => {
          const li = document.createElement('li');
          const t = document.createElement('span');
          t.className = 'rs-verlauf__t';
          t.textContent = c.titel;
          const m = document.createElement('span');
          m.className = 'rs-verlauf__m';
          m.textContent = [zeit(c.zeit), c.von].filter(Boolean).join(' · ');
          li.append(t, m);
          return li;
        }),
      );
    }
    window.clearTimeout(timer);
    if (laeuft) timer = window.setTimeout(holen, 20_000);
  };
  void holen();
  return { neu: () => void holen() };
}

/** Titel eines Eintrags, auch wenn Namen noch fehlen */
export const titelVon = (b: Bereich, e: Eintrag, k: Kontext) => b.titel(e, k) || e.id;
