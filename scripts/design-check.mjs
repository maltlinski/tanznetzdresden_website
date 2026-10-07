#!/usr/bin/env node
/**
 * Prüft, ob die Website zum Designsystem in design/system/ passt.
 * Läuft vor jedem Build (npm run build) und nach design:import.
 *
 * Fehler (Build bricht ab):
 *   - Die Website nutzt eine CSS-Variable, die weder im Designsystem noch in
 *     src/styles definiert ist (z. B. weil ein Token umbenannt wurde).
 *   - Eine Token-Datei, die die Website einbindet, fehlt.
 * Hinweise:
 *   - Bewusste Abweichungen in src/styles/overrides.css werden aufgelistet.
 *   - Schriftfamilien im Designsystem, die die Website nicht selbst hostet.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DS = join(ROOT, 'design/system');
const REQUIRED = ['tokens/colors.css', 'tokens/typography.css', 'tokens/spacing.css', 'tokens/base.css'];

const walk = (dir, exts) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return walk(p, exts);
    return exts.some((e) => n.endsWith(e)) ? [p] : [];
  });

const defined = (css) => new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
const used = (txt) => [...txt.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);

let errors = 0;
for (const f of REQUIRED) {
  if (!existsSync(join(DS, f))) {
    console.error(`✗ design/system/${f} fehlt.`);
    errors++;
  }
}

const dsVars = new Set();
for (const f of walk(join(DS, 'tokens'), ['.css'])) defined(readFileSync(f, 'utf8')).forEach((v) => dsVars.add(v));

const siteFiles = walk(join(ROOT, 'src'), ['.css', '.astro', '.ts']);
const siteVars = new Set();
for (const f of siteFiles) defined(readFileSync(f, 'utf8')).forEach((v) => siteVars.add(v));

// Variablen, die zur Laufzeit gesetzt werden (style="--x: …" in Komponenten)
const runtime = new Set(['--tag-color']);

const missing = new Map();
for (const f of siteFiles) {
  for (const v of used(readFileSync(f, 'utf8'))) {
    if (dsVars.has(v) || siteVars.has(v) || runtime.has(v)) continue;
    if (!missing.has(v)) missing.set(v, new Set());
    missing.get(v).add(relative(ROOT, f));
  }
}
for (const [v, files] of missing) {
  console.error(`✗ ${v} wird benutzt, ist aber nirgends definiert: ${[...files].join(', ')}`);
  errors++;
}

// Bewusste Abweichungen anzeigen
const overrides = join(ROOT, 'src/styles/overrides.css');
if (existsSync(overrides)) {
  const ov = [...defined(readFileSync(overrides, 'utf8'))].filter((v) => dsVars.has(v));
  if (ov.length) console.log(`ℹ Website weicht bewusst vom Designsystem ab bei: ${ov.join(', ')} (src/styles/overrides.css)`);
}

// Schriften: Familien aus dem Designsystem, die die Website nicht lädt
const typo = existsSync(join(DS, 'tokens/typography.css')) ? readFileSync(join(DS, 'tokens/typography.css'), 'utf8') : '';
const families = [...typo.matchAll(/--font-[\w-]+:\s*'([^']+)'/g)].map((m) => m[1]);
// Selbst gehostet = @font-face in src/styles/fonts.css oder @fontsource-Import in Base.astro
const hosted = readFileSync(join(ROOT, 'src/styles/fonts.css'), 'utf8') + readFileSync(join(ROOT, 'src/layouts/Base.astro'), 'utf8');
const slug = (f) => f.toLowerCase().replace(/\s+/g, '-');
for (const fam of new Set(families)) {
  if (!hosted.includes(`font-family: '${fam}'`) && !hosted.includes(`@fontsource/${slug(fam)}/`)) {
    console.warn(`⚠ Schrift „${fam}“ aus dem Designsystem wird von der Website nicht selbst gehostet – bitte in src/styles/fonts.css ergänzen.`);
  }
}

if (errors) {
  console.error(`\nDesign-Prüfung: ${errors} Problem(e). Siehe design/README.md.`);
  process.exit(1);
}
console.log(`✓ Design-Prüfung ok (${dsVars.size} Tokens aus design/system).`);
