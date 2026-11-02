/**
 * Dateien der alten Website für das Archiv der Formate-Seite übernehmen (docs/formate.md):
 *
 * - Plakate des Tanzkalenders → src/assets/tanzkalender/<id>.webp (höchstens 2560 px hoch; Astro erzeugt die Größen)
 * - PDFs des Tanzkalenders     → public/downloads/tanzkalender/<id>.pdf
 * - Dateien in Links des Archivs (src/content/formate-archiv/projekte.yaml, Adressen unter wp-content/uploads/)
 *                              → public/downloads/archiv/<name>
 *
 *   npm run archiv:laden                       lädt aus dem Netz (curl, nutzt einen eingestellten Proxy)
 *   npm run archiv:laden -- --uploads <ordner> nimmt die Dateien aus einem entpackten Ordner wp-content/uploads
 *
 * Vorhandene Dateien bleiben, wie sie sind. Solange eine Datei fehlt, verlinkt die Seite die alte Adresse.
 */
import { existsSync, mkdirSync, readFileSync, copyFileSync, rmSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { parse } from 'yaml';

const exec = promisify(execFile);
const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv.indexOf('--uploads');
const uploads = arg > -1 ? resolve(process.argv[arg + 1]) : null;
const lesen = (p) => parse(readFileSync(join(WURZEL, p), 'utf8'));

/** Datei holen: aus dem Ordner uploads oder per curl in eine Zwischendatei */
async function holen(url) {
  if (uploads) {
    const rel = decodeURIComponent(new URL(url).pathname).match(/uploads\/(.+)$/)?.[1];
    const p = rel && join(uploads, rel);
    if (!p || !existsSync(p)) throw new Error('nicht im Ordner uploads');
    return p;
  }
  const ziel = join(tmpdir(), `archiv-${basename(new URL(url).pathname)}`);
  await exec('curl', ['-fsSL', '--retry', '3', '-o', ziel, url]);
  return ziel;
}

const fehler = [];
let neu = 0;
async function uebernehmen(url, ziel, umwandeln) {
  const pfad = join(WURZEL, ziel);
  if (existsSync(pfad)) return;
  mkdirSync(dirname(pfad), { recursive: true });
  try {
    const quelle = await holen(url);
    if (umwandeln) await umwandeln(quelle, pfad);
    else copyFileSync(quelle, pfad);
    if (!uploads) rmSync(quelle, { force: true });
    neu++;
    console.log(`✓ ${ziel}`);
  } catch (e) {
    fehler.push(`${url}: ${e.message.split('\n')[0]}`);
  }
}

const plakat = (quelle, ziel) =>
  sharp(quelle).resize({ height: 2560, withoutEnlargement: true }).webp({ quality: 82 }).toFile(ziel);

for (const a of lesen('src/content/formate-archiv/tanzkalender.yaml')) {
  await uebernehmen(a.bild, `src/assets/tanzkalender/${a.id}.webp`, plakat);
  await uebernehmen(a.pdf, `public/downloads/tanzkalender/${a.id}.pdf`);
}
for (const p of lesen('src/content/formate-archiv/projekte.yaml')) {
  for (const l of p.links ?? []) {
    if (l.url?.includes('/wp-content/uploads/')) await uebernehmen(l.url, `public/downloads/archiv/${basename(new URL(l.url).pathname)}`);
  }
}

console.log(`${neu} Dateien übernommen.`);
if (fehler.length) {
  console.error(`${fehler.length} fehlen noch:\n  ${fehler.join('\n  ')}`);
  process.exitCode = 1;
}
