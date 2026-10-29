/**
 * Bilder und Dateien der alten Website laden und für die neue aufbereiten.
 *
 * - Titelbilder → src/assets/news/<jahr>/<name>.webp (höchstens 1600 px; Astro erzeugt daraus die Größen)
 * - Bilder im Text → public/news/archiv/<jahr>/<name>.webp (1600 px) und <name>-800.webp
 *   (schon fertig verkleinert, damit der Build nicht hunderte Fotos umrechnen muss)
 * - PDFs → public/news/archiv/dateien/<name>.pdf
 *
 * Geladen wird mit curl (nutzt einen eingestellten Proxy); Originale landen im Zwischenspeicher und werden nur einmal
 * geladen. Fehlt eine Datei, bleibt sie weg und steht im Bericht.
 */
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join, extname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { adresse } from './zuordnen.mjs';

const exec = promisify(execFile);

export class Medien {
  constructor({ wurzel, cache, laden = true }) {
    this.wurzel = wurzel;
    this.cache = cache;
    this.laden = laden;
    this.namen = new Set();
    this.fertig = new Map();
    this.fehler = new Map();
  }

  async holen(url) {
    const datei = join(this.cache, createHash('sha1').update(url).digest('hex').slice(0, 16) + extname(new URL(url).pathname).toLowerCase());
    if (existsSync(datei) && statSync(datei).size > 0) return datei;
    if (!this.laden) throw new Error('nicht im Zwischenspeicher (Laden ausgeschaltet)');
    mkdirSync(this.cache, { recursive: true });
    await exec('curl', ['-sSfL', '--retry', '2', '--max-time', '120', '-o', datei, url]);
    return datei;
  }

  name(url, ordner, endung) {
    const teile = new URL(url).pathname.match(/uploads\/(\d{4})\/(\d{2})\/([^/]+)$/);
    const jahr = teile?.[1] ?? 'ohne-jahr';
    const roh = adresse(basename(teile?.[3] ?? url, extname(url)));
    let n = `${jahr}/${roh}`;
    for (let i = 2; this.namen.has(`${ordner}:${n}`); i++) n = `${jahr}/${roh}-${i}`;
    this.namen.add(`${ordner}:${n}`);
    return `${n}${endung}`;
  }

  /** art: 'titel' | 'text' | 'datei' → { pfad, breite, hoehe } oder null */
  async aufbereiten(url, art) {
    const key = `${art}:${url}`;
    if (this.fertig.has(key)) return this.fertig.get(key);
    const p = this.#aufbereiten(url, art).catch((e) => {
      this.fehler.set(url, String(e.message ?? e).split('\n')[0].slice(0, 160));
      return null;
    });
    this.fertig.set(key, p);
    return p;
  }

  async #aufbereiten(url, art) {
    const quelle = await this.holen(url);
    if (art === 'datei') {
      const ziel = `news/archiv/dateien/${this.name(url, 'datei', extname(url).toLowerCase())}`;
      const voll = join(this.wurzel, 'public', ziel);
      mkdirSync(dirname(voll), { recursive: true });
      await exec('cp', [quelle, voll]);
      return { pfad: `/${ziel}` };
    }
    if (/\.svg$/i.test(url)) throw new Error('SVG (Logo) nicht übernommen');
    const bild = sharp(quelle, { animated: false }).rotate();
    const { width = 0 } = await bild.metadata();
    if (!width) throw new Error('kein lesbares Bild');
    if (art === 'titel') {
      const rel = this.name(url, 'titel', '.webp');
      const voll = join(this.wurzel, 'src/assets/news', rel);
      mkdirSync(dirname(voll), { recursive: true });
      const info = await bild.clone().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(voll);
      return { pfad: rel, breite: info.width, hoehe: info.height };
    }
    const rel = this.name(url, 'text', '');
    const voll = join(this.wurzel, 'public/news/archiv', rel);
    mkdirSync(dirname(voll), { recursive: true });
    const gross = await bild.clone().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(`${voll}.webp`);
    await bild.clone().resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toFile(`${voll}-800.webp`);
    return { pfad: `/news/archiv/${rel}.webp`, breite: gross.width, hoehe: gross.height };
  }
}
