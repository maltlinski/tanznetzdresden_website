#!/usr/bin/env node
/**
 * Übernimmt ein Designsystem aus einem Claude-Design-Export nach design/system/.
 *
 *   npm run design:import -- <pfad>
 *
 * <pfad> darf sein:
 *   - der entpackte Export (Ordner mit project/_ds/… oder _ds/…)
 *   - direkt der Designsystem-Ordner (enthält tokens/ und readme.md)
 *
 * Danach läuft automatisch `design:check`. Die Website übernimmt die neuen
 * Farben, Schriften und Abstände beim nächsten Build bzw. sofort im Dev-Server.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(import.meta.dirname, '..');
const TARGET = join(ROOT, 'design/system');

const src = process.argv[2];
if (!src) {
  console.error('Bitte den Pfad zum Claude-Design-Export angeben:\n  npm run design:import -- ../mein-export');
  process.exit(1);
}

/** Designsystem-Ordner im Export finden (der erste Ordner mit tokens/ + readme.md). */
function findSystem(dir, depth = 0) {
  if (existsSync(join(dir, 'tokens')) && readdirSync(dir).some((f) => /^readme\.md$/i.test(f))) return dir;
  if (depth > 4) return null;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === 'node_modules' || name.startsWith('.') || !statSync(p).isDirectory()) continue;
    const hit = findSystem(p, depth + 1);
    if (hit) return hit;
  }
  return null;
}

const system = findSystem(resolve(src));
if (!system) {
  console.error(`Kein Designsystem gefunden in ${src} (gesucht: Ordner mit tokens/ und readme.md).`);
  process.exit(1);
}
console.log(`Designsystem gefunden: ${system}`);

// Logos bleiben erhalten, falls der Export keine mitbringt
const keepLogo = join(TARGET, 'assets/logo');
const logoBackup = existsSync(keepLogo) ? readdirSync(keepLogo).map((f) => [f, readFileSync(join(keepLogo, f))]) : [];

rmSync(TARGET, { recursive: true, force: true });
mkdirSync(TARGET, { recursive: true });
cpSync(system, TARGET, { recursive: true, filter: (p) => !basename(p).startsWith('.') });

// Logos aus dem Komponenten-Bundle extrahieren (Logo.jsx enthält die Pfade als MARK/WORD)
mkdirSync(keepLogo, { recursive: true });
const bundlePath = join(TARGET, '_ds_bundle.js');
let extracted = false;
if (existsSync(bundlePath)) {
  const bundle = readFileSync(bundlePath, 'utf8');
  const grab = (name) => {
    const m = bundle.match(new RegExp(`const ${name} = ("(?:[^"\\\\]|\\\\.)*");`));
    return m ? JSON.parse(m[1]) : null;
  };
  const mark = grab('MARK');
  const word = grab('WORD');
  if (mark && word) {
    writeFileSync(join(keepLogo, 'tndd-logo.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 572.94" fill="currentColor">\n${mark}\n${word}\n</svg>\n`);
    writeFileSync(join(keepLogo, 'tndd-word.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="130 445 920 80" fill="currentColor">\n${word}\n</svg>\n`);
    writeFileSync(join(keepLogo, 'tndd-mark.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="45 48 1010 378" fill="currentColor">\n${mark}\n</svg>\n`);
    extracted = true;
  }
}
if (!extracted) for (const [f, buf] of logoBackup) if (!existsSync(join(keepLogo, f))) writeFileSync(join(keepLogo, f), buf);

writeFileSync(
  join(TARGET, 'IMPORT.md'),
  `# Herkunft\n\nImportiert am ${new Date().toISOString().slice(0, 10)} aus \`${basename(system)}\`.\n` +
    'Nicht von Hand bearbeiten – Änderungen in Claude Design machen und neu importieren (siehe design/README.md).\n',
);

console.log(`Übernommen nach design/system/${extracted ? ' (Logos aus dem Bundle extrahiert)' : ''}.`);
execFileSync(process.execPath, [join(ROOT, 'scripts/design-check.mjs')], { stdio: 'inherit' });
