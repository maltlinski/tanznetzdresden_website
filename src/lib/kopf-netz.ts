/**
 * Netz im lila Kopf (wie im Entwurf des Kalenders): Punkte mit Mindestabstand, mit ihren nächsten Nachbarn
 * verbunden, einzelne Linien dicker, Quadrate in Cyan und Magenta. Fest gesetzt (gleicher Startwert = gleiches
 * Netz bei jedem Build); Linien und Quadrate zeichnet der Browser ein (src/scripts/kopf-netz.ts bzw. tanzkalender.ts).
 *
 * - `kopfNetz(KALENDER)`: das Netz des Kalenders (über den ganzen Kopf, dicht, mit Querverbindungen).
 * - `unterseitenNetz(schluessel)`: verwandt, aber ruhiger, für Unterseiten ohne eigene Gestaltung
 *   (src/components/KopfNetz.astro): je Seite eigene Struktur, Linien kreuzen sich nie (jede Verzweigung ist ein
 *   Quadrat), keine überlangen Linien, und der Bereich von Headline und Text links bleibt frei – das Netz spannt
 *   sich rechts und oben auf.
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
}

export const KALENDER: NetzForm = { seed: 27, dichte: 0.7, nachbarn: 3, quer: 0.3 };

export interface Netz {
  breite: number;
  hoehe: number;
  linien: { x1: number; y1: number; x2: number; y2: number; dick: boolean }[];
  punkte: { x: number; y: number; s: number; magenta: boolean }[];
}

/** Startwert aus einem Text (z. B. der Route), damit jede Seite ihr eigenes Netz hat – auf Deutsch und Englisch gleich */
export function seedAus(text: string) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) % 100000;
}

/** fester Zufall in [0, 1) */
function zufall(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (v: number) => +v.toFixed(1);

export function kopfNetz(form: NetzForm = KALENDER): Netz {
  const W = 1600;
  const H = 640;
  const r = zufall(form.seed);
  const ar = Math.sqrt((W * H) / (840 * 1188));
  const kq = Math.max(0.5, ar * 1.4);
  const n = Math.max(10, Math.round(30 * form.dichte * ar * 1.3));
  const md = (120 * ar * 1.05) / Math.sqrt(form.dichte);
  const P: [number, number][] = [];
  for (let tries = 0; P.length < n && tries < 4000; tries++) {
    let x = r() * W;
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
  const naechste = (i: number) =>
    P.map((q, j) => [Math.hypot(q[0] - P[i][0], q[1] - P[i][1]), j] as const)
      .filter((x) => x[1] !== i)
      .sort((x, y) => x[0] - y[0])
      .slice(0, form.nachbarn);
  P.forEach((_, i) => {
    naechste(i).forEach((x) => link(i, x[1]));
    if (r() < form.quer) link(i, Math.floor(r() * P.length));
  });
  E.sort((e1, e2) => Math.min(P[e1[0]][0], P[e1[1]][0]) - Math.min(P[e2[0]][0], P[e2[1]][0]));
  const linien = E.map(([i, j, dick]) => ({ x1: f(P[i][0]), y1: f(P[i][1]), x2: f(P[j][0]), y2: f(P[j][1]), dick }));
  const punkte = P.map((_, i) => i)
    .sort((i, j) => P[i][0] - P[j][0])
    .map((i) => {
      const mg = r() < 0.35;
      const s = (mg ? (r() < 0.2 ? 22 : 13) : 7) * kq;
      return { x: f(P[i][0] - s / 2), y: f(P[i][1] - s / 2), s: f(s), magenta: mg };
    });
  return { breite: W, hoehe: H, linien, punkte };
}

/** Bereich von Headline und Text (Anteile des Bildes, gezeichnet mit preserveAspectRatio="xMaxYMid slice"):
 *  oben Kicker und Headline (bis 66 % der Breite), darunter der kürzere Einleitungstext und der Keil (bis 50 %) */
const FREI = [
  { x: 0.66, y0: -0.02, y1: 0.56 },
  { x: 0.5, y0: 0.56, y1: 1.02 },
];

export function unterseitenNetz(schluessel: string): Netz {
  const W = 1600;
  const H = 900;
  const r = zufall(seedAus(schluessel));
  const kq = 1.45;
  const md = 150;
  const frei = (x: number, y: number) => FREI.some((z) => x < W * z.x && y > H * z.y0 && y < H * z.y1);

  // Punkte mit Mindestabstand außerhalb des Textbereichs; einige auf dem Rand rechts, oben und unten,
  // damit Linien aus dem Bild laufen (nie links: von dort führten sie durch den Text)
  const P: [number, number][] = [];
  for (let tries = 0; P.length < 34 && tries < 6000; tries++) {
    let x = r() * W;
    let y = r() * H;
    if (r() < 0.2) {
      const e = Math.floor(r() * 3);
      if (e === 0) x = W + 3;
      else if (e === 1) y = -3;
      else y = H + 3;
    }
    if (frei(x, y)) continue;
    if (P.every((p) => Math.hypot(p[0] - x, p[1] - y) > md)) P.push([x, y]);
  }

  // Linien: je Punkt die drei nächsten, kürzeste zuerst; keine Kreuzung, nicht zu lang, nicht durch den Text
  const kreuzt = (a: number, b: number, c: number, d: number) => {
    if (a === c || a === d || b === c || b === d) return false;
    const o = (p: number[], q: number[], s: number[]) => Math.sign((q[0] - p[0]) * (s[1] - p[1]) - (q[1] - p[1]) * (s[0] - p[0]));
    return o(P[a], P[b], P[c]) !== o(P[a], P[b], P[d]) && o(P[c], P[d], P[a]) !== o(P[c], P[d], P[b]);
  };
  const durchText = (a: number, b: number) => {
    for (let t = 0.04; t < 1; t += 0.04) if (frei(P[a][0] + (P[b][0] - P[a][0]) * t, P[a][1] + (P[b][1] - P[a][1]) * t)) return true;
    return false;
  };
  const kandidaten = new Map<string, [number, number, number]>();
  P.forEach((p, i) => {
    P.map((q, j) => [Math.hypot(q[0] - p[0], q[1] - p[1]), j] as const)
      .filter(([d, j]) => j !== i && d < md * 2.3)
      .sort((x, y) => x[0] - y[0])
      .slice(0, 3)
      .forEach(([d, j]) => kandidaten.set(i < j ? `${i}-${j}` : `${j}-${i}`, [Math.min(i, j), Math.max(i, j), d]));
  });
  const E: [number, number, boolean][] = [];
  for (const [i, j] of [...kandidaten.values()].sort((x, y) => x[2] - y[2])) {
    if (durchText(i, j) || E.some(([c, d]) => kreuzt(i, j, c, d))) continue;
    E.push([i, j, r() < 0.08]);
  }

  // nur verbundene Punkte bekommen ein Quadrat (keine losen Quadrate)
  const verbunden = new Set(E.flat().filter((x): x is number => typeof x === 'number'));
  E.sort((e1, e2) => Math.min(P[e1[0]][0], P[e1[1]][0]) - Math.min(P[e2[0]][0], P[e2[1]][0]));
  const linien = E.map(([i, j, dick]) => ({ x1: f(P[i][0]), y1: f(P[i][1]), x2: f(P[j][0]), y2: f(P[j][1]), dick }));
  const punkte = P.map((_, i) => i)
    .filter((i) => verbunden.has(i))
    .sort((i, j) => P[i][0] - P[j][0])
    .map((i) => {
      const mg = r() < 0.35;
      const s = (mg ? (r() < 0.2 ? 22 : 13) : 7) * kq;
      return { x: f(P[i][0] - s / 2), y: f(P[i][1] - s / 2), s: f(s), magenta: mg };
    });
  return { breite: W, hoehe: H, linien, punkte };
}
