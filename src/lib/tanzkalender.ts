/**
 * Daten für den Tanzkalender (/termine/): Termine (Dateien und Intern → Kalender), KEEP UP-Trainings und
 * Fristen aus Ausschreibungen (News mit `deadline`). Darstellung im Browser: src/scripts/tanzkalender.ts,
 * Filter und Bündeln: src/lib/tanzkalender-modell.ts.
 */
import { categoryLabel, getOrte, getTermine } from './content';
import { getKeepUp } from './keep-up';
import { getNews } from './news';
import { loc, url, type Lang } from './i18n';
import { fuellen, texte } from './texte';
import { nachZeit, norm, type KTermin } from './tanzkalender-modell';

/** Route zu einem Ort (Koordinaten aus Kooperationen → Orte); ein einfacher Link, nichts wird nachgeladen */
const route = (lat: number, lon: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

export async function getTanzkalenderDaten(lang: Lang): Promise<KTermin[]> {
  const t = texte(lang, 'termine', 'eintrag');
  const a = texte(lang, 'termine', 'ansicht');
  const orte = await getOrte();
  /** Ort aus Kooperationen → Orte, wenn der Name (oder Kurzname) passt */
  const ortVon = (name: string) => {
    const n = norm(name.trim());
    const o = orte.find((x) => norm(x.data.name) === n || (x.data.kurz && norm(x.data.kurz) === n));
    return { adresse: o?.data.adresse ?? '', route: o ? route(o.data.lat, o.data.lon) : '' };
  };
  const out: KTermin[] = [];

  for (const termin of await getTermine()) {
    const d = termin.data;
    const [datum, von] = d.start.split(' ');
    const bis = d.end?.split(' ')[1] ?? '';
    const workshop = d.format?.id === 'keep-up';
    out.push({
      id: termin.id,
      datum,
      von,
      bis,
      zeit: loc(d, 'timeLabel', lang)?.replace(/\s*Uhr$/, '') ?? (bis ? `${von}–${bis}` : von),
      titel: loc(d, 'title', lang),
      wer: '',
      ort: d.venue,
      ...ortVon(d.venue),
      kat: d.category,
      badge: workshop ? 'Workshop' : categoryLabel[lang][d.category],
      text: loc(d, 'teaser', lang),
      eintritt: loc(d, 'eintritt', lang) ?? '',
      link: url(lang, 'termine', `${termin.id}/`),
      linkText: t.zumTermin,
      training: false,
    });
  }

  const { trainings } = await getKeepUp(lang);
  for (const e of trainings) {
    const [von, bis = ''] = e.time.split('–');
    const ws = e.art === 'workshop';
    out.push({
      id: `keep-up-${e.date}-${von.replace(':', '')}`,
      datum: e.date,
      von,
      bis,
      zeit: e.time,
      titel: ws ? t.workshop : t.profitraining,
      wer: e.dozentin.name,
      ort: e.where,
      ...ortVon(e.where),
      kat: 'Training',
      badge: ws ? 'Workshop' : categoryLabel[lang].Training,
      text: [e.titel, e.kurz].filter(Boolean).join(': ') || (ws ? t.workshopInfo : t.trainingInfo),
      eintritt: '',
      link: url(lang, 'profitraining', '#kalender'),
      linkText: t.zumTraining,
      training: !ws,
    });
  }

  for (const p of await getNews(lang)) {
    if (!p.deadline) continue;
    out.push({
      id: `frist-${p.id}`,
      datum: p.deadline,
      von: '',
      bis: '',
      zeit: '',
      titel: p.title,
      wer: '',
      ort: '',
      adresse: '',
      route: '',
      kat: 'Frist',
      badge: a.frist,
      text: p.teaser,
      eintritt: '',
      link: url(lang, 'news', `${p.id}/`),
      linkText: t.zumCall,
      training: false,
    });
  }
  return out.sort(nachZeit);
}

/** „19:30 Uhr“ bzw. „19:30“ */
export const uhrzeit = (lang: Lang, zeit: string) => fuellen(texte(lang, 'termine', 'eintrag').uhr, { zeit });

/**
 * Das Netz im Kopf (wie im Entwurf): Punkte mit Mindestabstand, je drei nächste Nachbarn verbunden,
 * fest gesetzt (gleicher Zufall bei jedem Build). Linien und Quadrate werden im Browser eingezeichnet.
 */
export function netz(dichte = 0.7) {
  const W = 1600;
  const H = 640;
  let a = 27;
  const r = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const ar = Math.sqrt((W * H) / (840 * 1188));
  const kq = Math.max(0.5, ar * 1.4);
  const n = Math.max(10, Math.round(30 * dichte * ar * 1.3));
  const md = (120 * ar * 1.05) / Math.sqrt(dichte);
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
  P.forEach((p, i) => {
    P.map((q, j) => [Math.hypot(q[0] - p[0], q[1] - p[1]), j] as const)
      .filter((x) => x[1] !== i)
      .sort((x, y) => x[0] - y[0])
      .slice(0, 3)
      .forEach((x) => link(i, x[1]));
    if (r() < 0.3) link(i, Math.floor(r() * P.length));
  });
  E.sort((e1, e2) => Math.min(P[e1[0]][0], P[e1[1]][0]) - Math.min(P[e2[0]][0], P[e2[1]][0]));
  const f = (v: number) => +v.toFixed(1);
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
