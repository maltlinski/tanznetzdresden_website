/**
 * Netz der Formate im Kopf der Formate-Seite (Entwurf Formate v2): jedes Format ist ein Knoten (Quadrat + Name),
 * Linien verbinden die Knoten zu einem Netz. Läuft beim Build (feste Lage für die Ansicht ohne JavaScript) und im
 * Browser (src/scripts/formate.ts: zufällig neu knüpfen, Namen dürfen sich nicht überlappen).
 */
export type Seite = 'l' | 'r';
/** Lage eines Knotens in Prozent der Bühne; Seite = auf welcher Seite des Quadrats der Name steht */
export interface Lage {
  x: number;
  y: number;
  seite: Seite;
}
export type Kante = [number, number];

/** Lage aus dem Entwurf (breit: Text oben links frei, schmal: abwechselnd links und rechts) */
const ENTWURF: Record<string, { breit: Lage; schmal: Lage }> = {
  'studio-round': { breit: { x: 72, y: 8, seite: 'r' }, schmal: { x: 4, y: 5, seite: 'r' } },
  'keep-up': { breit: { x: 94, y: 27, seite: 'l' }, schmal: { x: 96, y: 17, seite: 'l' } },
  'tanzpakt-in-residence': { breit: { x: 80, y: 49, seite: 'l' }, schmal: { x: 96, y: 32, seite: 'l' } },
  'pop-up': { breit: { x: 44, y: 60, seite: 'r' }, schmal: { x: 4, y: 45, seite: 'r' } },
  welttanztag: { breit: { x: 6, y: 70, seite: 'r' }, schmal: { x: 96, y: 57, seite: 'l' } },
  'vision-danceable': { breit: { x: 62, y: 79, seite: 'r' }, schmal: { x: 4, y: 69, seite: 'r' } },
  'bodies-and-textiles': { breit: { x: 22, y: 92, seite: 'r' }, schmal: { x: 96, y: 82, seite: 'l' } },
  dresdance: { breit: { x: 95, y: 94, seite: 'l' }, schmal: { x: 4, y: 95, seite: 'r' } },
};

/**
 * Feste Lage für die Ansicht ohne JavaScript: wie im Entwurf, solange es genau dessen Formate sind;
 * sonst (neue oder ausgeblendete Formate) gleichmäßig von oben nach unten, abwechselnd links und rechts.
 */
export function startLage(ids: string[]): { breit: Lage[]; schmal: Lage[] } {
  if (ids.length === Object.keys(ENTWURF).length && ids.every((id) => ENTWURF[id])) {
    return { breit: ids.map((id) => ENTWURF[id].breit), schmal: ids.map((id) => ENTWURF[id].schmal) };
  }
  const n = Math.max(ids.length - 1, 1);
  const y = (i: number) => +(6 + (i * 88) / n).toFixed(1);
  return {
    breit: ids.map((_, i) => {
      const x = 6 + ((i * 37) % 88);
      return { x, y: y(i), seite: x > 60 ? 'l' : 'r' };
    }),
    schmal: ids.map((_, i) => (i % 2 ? { x: 96, y: y(i), seite: 'l' } : { x: 4, y: y(i), seite: 'r' })),
  };
}

/**
 * Kanten: kürzestes Netz, das alle Knoten verbindet (Prim), dazu bei etwa 60 % der Knoten eine Linie zum
 * zweitnächsten Nachbarn. `zufall` liefert Zahlen in [0, 1) – beim Build fest, im Browser Math.random.
 */
export function knuepfen(P: [number, number][], zufall: () => number = Math.random): Kante[] {
  if (P.length < 2) return [];
  const D = (a: number, b: number) => Math.hypot(P[a][0] - P[b][0], P[a][1] - P[b][1]);
  const seen = new Set<string>();
  const E: Kante[] = [];
  const dazu = (a: number, b: number) => {
    const k = `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (seen.has(k)) return;
    seen.add(k);
    E.push([a, b]);
  };
  const drin = [0];
  while (drin.length < P.length) {
    let best: [number, number, number] | null = null;
    for (const a of drin) {
      for (let b = 0; b < P.length; b++) {
        if (!drin.includes(b) && (!best || D(a, b) < best[2])) best = [a, b, D(a, b)];
      }
    }
    dazu(best![0], best![1]);
    drin.push(best![1]);
  }
  P.forEach((_, a) => {
    const nachbarn = P.map((_, b) => b).filter((b) => b !== a).sort((x, y) => D(a, x) - D(a, y));
    if (nachbarn[1] !== undefined && zufall() < 0.6) dazu(a, nachbarn[1]);
  });
  // von links nach rechts, damit sich das Netz beim Zeichnen von links aufbaut
  return E.sort((e1, e2) => Math.min(P[e1[0]][0], P[e1[1]][0]) - Math.min(P[e2[0]][0], P[e2[1]][0]));
}

/** fester Zufall (gleicher Startwert = gleiches Netz bei jedem Build) */
export function festerZufall(start = 41) {
  let a = start;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rechteck = [number, number, number, number];

/**
 * Knoten zufällig verteilen (im Browser, in Pixeln): Namen überlappen sich nicht, bleiben in der Bühne und meiden
 * `frei` (den Text oben links). Breite Namen zuerst; je Knoten wird unter bis zu 24 passenden Stellen die gewählt,
 * die am weitesten von den schon gesetzten entfernt ist. Ohne Lösung nach 40 Versuchen: null.
 */
export function verteilen(
  groessen: { b: number; h: number }[],
  sw: number,
  sh: number,
  frei: Rechteck | null,
  zufall: () => number = Math.random,
): Lage[] | null {
  const abstand = 20;
  const trifft = (a: Rechteck, b: Rechteck) => a[0] < b[2] + abstand && a[2] + abstand > b[0] && a[1] < b[3] + abstand && a[3] + abstand > b[1];
  const reihe = groessen.map((_, i) => i).sort((a, b) => groessen[b].b - groessen[a].b);
  for (let versuch = 0; versuch < 40; versuch++) {
    const punkte: [number, number][] = [];
    const flaechen: Rechteck[] = [];
    const lage: Lage[] = [];
    let ok = true;
    for (const i of reihe) {
      const { b: W, h: H } = groessen[i];
      let best: [number, number, Seite, Rechteck] | null = null;
      let bd = -1;
      for (let t = 0, c = 0; t < 400 && c < 24; t++) {
        const x = 10 + zufall() * (sw - 20);
        const y = H / 2 + zufall() * Math.max(sh - H, 0);
        const seite: Seite = x + 12 + W < sw ? (x - 12 - W > 0 && zufall() < 0.4 ? 'l' : 'r') : 'l';
        const rc: Rechteck = seite === 'r' ? [x - 8, y - H / 2, x + 12 + W, y + H / 2] : [x - 12 - W, y - H / 2, x + 8, y + H / 2];
        if (rc[0] < 0 || rc[2] > sw || (frei && trifft(rc, frei)) || flaechen.some((q) => trifft(rc, q))) continue;
        c++;
        const d = punkte.length ? Math.min(...punkte.map((p) => Math.hypot(p[0] - x, p[1] - y))) : zufall();
        if (d > bd) {
          bd = d;
          best = [x, y, seite, rc];
        }
      }
      if (!best) {
        ok = false;
        break;
      }
      punkte.push([best[0], best[1]]);
      flaechen.push(best[3]);
      lage[i] = { x: (best[0] / sw) * 100, y: (best[1] / sh) * 100, seite: best[2] };
    }
    if (ok) return lage;
  }
  return null;
}
