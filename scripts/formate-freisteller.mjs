/**
 * Freisteller für den Kopf der Formate-Seite (Entwurf Formate, „Bühne mit Ausbruch“): Aus dem Foto eines
 * Formats wird ein Ausschnitt genommen, der dunkle Bühnenhintergrund wird durchsichtig, kleine Flecken
 * (Scheinwerfer, Technik) fallen weg – übrig bleiben die Körper. Ergebnis: src/assets/formate/freisteller/<id>.webp
 *
 *   npm run formate:freisteller            nur fehlende Freisteller
 *   npm run formate:freisteller -- --neu   alle neu
 *
 * Neues Format: unten in AUSSCHNITTE eintragen (Ausschnitt im Originalfoto: x, y, Breite, Höhe). Formate ohne
 * Freisteller zeigen im Kopf ihr Foto im Keil-Rahmen.
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ZIEL = join(WURZEL, 'src/assets/formate/freisteller');
const alle = process.argv.includes('--neu');

/**
 * Ausschnitt [x, y, Breite, Höhe] im Foto; `boden` (Anteil der Höhe) und `weg` entfernen unterhalb davon
 * Bühnenboden in Blau oder Grau; `foto` nimmt ein anderes Foto als das des Formats.
 */
const AUSSCHNITTE = {
  'studio-round': { ausschnitt: [0, 540, 610, 780], boden: 0.8, weg: 'blau', foto: 'ensemble-curtain-call.jpg' },
  'pop-up': { ausschnitt: [0, 480, 2000, 853] },
  'keep-up': { ausschnitt: [295, 0, 1210, 1333] },
  'vision-danceable': { ausschnitt: [60, 120, 1560, 1000], boden: 0.4, weg: 'blau' },
  welttanztag: { ausschnitt: [240, 60, 820, 900] },
  'bodies-and-textiles': { ausschnitt: [0, 60, 1333, 1466] },
  dresdance: { ausschnitt: [678, 330, 745, 820], boden: 0.86, weg: 'grau' },
  'tanzpakt-in-residence': { ausschnitt: [250, 0, 1100, 1333] },
};

/** Foto aus dem Format (Feld image in src/content/formate/<id>.md) */
function fotoVon(id) {
  const md = readFileSync(join(WURZEL, 'src/content/formate', `${id}.md`), 'utf8');
  const name = md.match(/^image:\s*["']?[^\n"']*\/([^/\n"']+)["']?\s*$/m)?.[1];
  if (!name) throw new Error(`${id}: kein Foto`);
  return name;
}

async function freistellen(id, o) {
  const [x, y, w, h] = o.ausschnitt;
  const k = Math.min(1, 900 / h);
  const W = Math.round(w * k);
  const H = Math.round(h * k);
  const quelle = join(WURZEL, 'src/assets/photos', o.foto ?? fotoVon(id));
  const { data: d } = await sharp(quelle).extract({ left: x, top: y, width: w, height: h }).resize(W, H).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  // dunkel = Hintergrund: unter 60 durchsichtig, bis 120 weich auslaufend
  for (let j = 0; j < d.length; j += 4) {
    const mx = Math.max(d[j], d[j + 1], d[j + 2]);
    let al = mx < 60 ? 0 : mx < 120 ? ((mx - 60) / 60) * 255 : 255;
    if (o.boden && al && ((j / 4 / W) | 0) > o.boden * H) {
      const mn = Math.min(d[j], d[j + 1], d[j + 2]);
      if (o.weg === 'blau' && d[j] < 0.62 * Math.max(d[j + 1], d[j + 2])) al = 0;
      if (o.weg === 'grau' && mx - mn < 45 && mx < 215) al = 0;
    }
    d[j + 3] = al;
  }
  // nur große zusammenhängende Flächen behalten (Körper), Licht und Technik fallen weg
  const N = W * H;
  const lab = new Uint8Array(N);
  const st = new Int32Array(N);
  const minA = N * 0.012;
  for (let p = 0; p < N; p++) {
    if (lab[p] || d[p * 4 + 3] < 40) continue;
    let sp = 0;
    const liste = [];
    st[sp++] = p;
    lab[p] = 1;
    while (sp) {
      const q = st[--sp];
      liste.push(q);
      const qx = q % W;
      for (const r of [qx > 0 ? q - 1 : -1, qx < W - 1 ? q + 1 : -1, q - W, q + W]) {
        if (r >= 0 && r < N && !lab[r] && d[r * 4 + 3] >= 40) {
          lab[r] = 1;
          st[sp++] = r;
        }
      }
    }
    if (liste.length < minA) for (const q of liste) d[q * 4 + 3] = 0;
  }
  for (let p = 0; p < N; p++) if (!lab[p]) d[p * 4 + 3] = 0;

  await sharp(d, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 86, alphaQuality: 90 }).toFile(join(ZIEL, `${id}.webp`));
  console.log(`✓ ${id} (${W}×${H})`);
}

mkdirSync(ZIEL, { recursive: true });
for (const [id, o] of Object.entries(AUSSCHNITTE)) {
  if (!alle && existsSync(join(ZIEL, `${id}.webp`))) continue;
  await freistellen(id, o);
}
