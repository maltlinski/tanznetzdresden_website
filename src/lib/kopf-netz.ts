/**
 * Netz im lila Kopf (wie im Entwurf des Kalenders): Punkte mit Mindestabstand, mit ihren nächsten Nachbarn
 * verbunden, einzelne Linien dicker, Quadrate in Cyan und Magenta. Fest gesetzt (gleicher Startwert = gleiches
 * Netz bei jedem Build); Linien und Quadrate zeichnet der Browser ein (src/scripts/kopf-netz.ts).
 *
 * Der Kalender nutzt die Grundform (`KALENDER`). Die übrigen Unterseiten (src/components/KopfNetz.astro) bekommen
 * eine verwandte Struktur: je Seite ein eigener Startwert, nur zwei nächste Nachbarn und dafür längere Brücken,
 * Punkte nach rechts hin dichter und keine Quadrate unter dem Text links, damit die Headline ruhiger steht.
 */
export interface NetzForm {
  /** Startwert des Zufalls */
  seed: number;
  /** wie viele Punkte (0.7 = Kalender) */
  dichte: number;
  /** mit wie vielen nächsten Nachbarn jeder Punkt verbunden ist */
  nachbarn: number;
  /** Anteil der Punkte mit einer zusätzlichen Linie zu einem beliebigen anderen */
  quer: number;
  /** Schwerpunkt nach rechts: 1 = gleichmäßig, kleiner = rechts dichter */
  rechts: number;
  /** keine Quadrate links unter der Headline (Anteil der Breite), damit der Text gut lesbar bleibt */
  textFrei?: number;
}

export const KALENDER: NetzForm = { seed: 27, dichte: 0.7, nachbarn: 3, quer: 0.3, rechts: 1 };
const UNTERSEITE: Omit<NetzForm, 'seed'> = { dichte: 0.8, nachbarn: 2, quer: 0.45, rechts: 0.8, textFrei: 0.48 };

/** Startwert aus einem Text (z. B. der Route), damit jede Seite ihr eigenes Netz hat – auf Deutsch und Englisch gleich */
export function seedAus(text: string) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) % 100000;
}

export const unterseitenForm = (schluessel: string): NetzForm => ({ ...UNTERSEITE, seed: seedAus(schluessel) });

export function kopfNetz(form: NetzForm = KALENDER) {
  const W = 1600;
  const H = 640;
  let a = form.seed;
  const r = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const ar = Math.sqrt((W * H) / (840 * 1188));
  const kq = Math.max(0.5, ar * 1.4);
  const n = Math.max(10, Math.round(30 * form.dichte * ar * 1.3));
  const md = (120 * ar * 1.05) / Math.sqrt(form.dichte);
  const P: [number, number][] = [];
  for (let tries = 0; P.length < n && tries < 4000; tries++) {
    let x = (form.rechts === 1 ? r() : 1 - Math.pow(r(), 1 / form.rechts)) * W;
    let y = r() * H;
    if (r() < 0.25) {
      const e = Math.floor(r() * 4);
      if (e === 0) x = -3;
      else if (e === 1) x = W + 3;
      else if (e === 2) y = -3;
      else y = H + 3;
    }
    if (P.every((p) => Math.hypot(p[0] - x, p[1] - y) > md)) P.push([x, y]);
  }
  const seen = new Set<string>();
  const E: [number, number, boolean][] = [];
  const link = (i: number, j: number) => {
    if (i === j) return;
    const k = i < j ? `${i}-${j}` : `${j}-${i}`;
    if (seen.has(k)) return;
    seen.add(k);
    E.push([i, j, r() < 0.08]);
  };
  P.forEach((p, i) => {
    P.map((q, j) => [Math.hypot(q[0] - p[0], q[1] - p[1]), j] as const)
      .filter((x) => x[1] !== i)
      .sort((x, y) => x[0] - y[0])
      .slice(0, form.nachbarn)
      .forEach((x) => link(i, x[1]));
    if (r() < form.quer) link(i, Math.floor(r() * P.length));
  });
  E.sort((e1, e2) => Math.min(P[e1[0]][0], P[e1[1]][0]) - Math.min(P[e2[0]][0], P[e2[1]][0]));
  const f = (v: number) => +v.toFixed(1);
  const linien = E.map(([i, j, dick]) => ({ x1: f(P[i][0]), y1: f(P[i][1]), x2: f(P[j][0]), y2: f(P[j][1]), dick }));
  const punkte = P.map((_, i) => i)
    .sort((i, j) => P[i][0] - P[j][0])
    .map((i) => {
      const mg = r() < 0.35;
      const s = (mg ? (r() < 0.2 ? 22 : 13) : 7) * kq;
      return { x: f(P[i][0] - s / 2), y: f(P[i][1] - s / 2), s: f(s), magenta: mg, i };
    })
    .filter((q) => !form.textFrei || !(P[q.i][0] > 0 && P[q.i][0] < W * form.textFrei && P[q.i][1] > H * 0.12))
    .map(({ i: _, ...q }) => q);
  return { breite: W, hoehe: H, linien, punkte };
}
