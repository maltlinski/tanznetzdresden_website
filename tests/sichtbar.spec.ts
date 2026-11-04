/**
 * Ausblenden („Auf der Website anzeigen“, docs/redaktion.md#ausblenden): Regeln (src/lib/sichtbar.ts,
 * src/lib/texte-regeln.ts) und die gebaute Website. Was in den Inhalten ausgeblendet ist, darf nirgends in dist/
 * stehen – auch nicht im HTML-Quelltext. Das prüft der Test für alles, was beim Build ausgeblendet ist.
 */
import { test, expect } from '@playwright/test';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { istSichtbar, nurSichtbare, sichtbareWorte } from '../src/lib/sichtbar';
import { abschnitteUebernehmen, uebernehmen } from '../src/lib/texte-regeln';

test('Regeln: fehlendes Feld = sichtbar, Entwurf = ausgeblendet, Wortlisten', () => {
  expect(istSichtbar({ name: 'a' })).toBe(true);
  expect(istSichtbar({ sichtbar: false })).toBe(false);
  expect(istSichtbar({ data: { sichtbar: true } })).toBe(true);
  expect(istSichtbar({ data: { draft: true } })).toBe(false);
  expect(nurSichtbare([{ n: 1 }, { n: 2, sichtbar: false }, { n: 3, sichtbar: true }])).toEqual([{ n: 1 }, { n: 3, sichtbar: true }]);
  expect(nurSichtbare(undefined)).toEqual([]);
  expect(sichtbareWorte(['a', { text: 'b', sichtbar: false }, { text: 'c' }])).toEqual(['a', 'c']);
});

test('Texte: ausblenden nur, wo vorgesehen; zählt als eine Änderung', () => {
  const datei = () => ({
    s: { titel: 'S', gruppe: 'g', pfad: '', abschnitte: {
      a: { titel: 'A', ausblendbar: true, texte: { lead: { wo: 'Text', de: 'x', en: '', ausblendbar: true }, h: { wo: 'Ü', de: 'y', en: '' } } },
      b: { titel: 'B', texte: { t: { wo: 'T', de: 'z', en: '' } } },
    } },
  });
  const d = datei();
  // Text aus und gleichzeitig geändert: eine Änderung
  expect(uebernehmen(d, new Map([['s.a.lead', { de: 'x2', en: '', aus: true }]]))).toBe(1);
  expect(d.s.abschnitte.a.texte.lead).toMatchObject({ de: 'x2', aus: true });
  // nicht ausblendbarer Text bleibt sichtbar
  expect(uebernehmen(d, new Map([['s.a.h', { de: 'y', en: '', aus: true }]]))).toBe(0);
  expect('aus' in d.s.abschnitte.a.texte.h).toBe(false);
  // wieder einblenden entfernt das Feld
  expect(uebernehmen(d, new Map([['s.a.lead', { de: 'x2', en: '', aus: false }]]))).toBe(1);
  expect('aus' in d.s.abschnitte.a.texte.lead).toBe(false);
  // Abschnitte
  expect(abschnitteUebernehmen(d, new Map([['s.a', true], ['s.b', true]]))).toBe(1);
  expect(d.s.abschnitte.a).toMatchObject({ aus: true });
  expect('aus' in d.s.abschnitte.b).toBe(false);
});

test('texte.json: jeder ausblendbare Abschnitt wird auf der Website auch weggelassen', () => {
  const texte = JSON.parse(readFileSync('src/settings/texte.json', 'utf8')) as Record<string, { abschnitte?: Record<string, { ausblendbar?: boolean }> }>;
  const quellen = ['src/views', 'src/components'].flatMap(function alle(d: string): string[] {
    return readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? alle(join(d, n)) : [join(d, n)]));
  }).map((p) => readFileSync(p, 'utf8')).join('\n');
  const fehlt: string[] = [];
  for (const [s, seite] of Object.entries(texte)) {
    for (const [a, ab] of Object.entries(seite.abschnitte ?? {})) {
      if (ab.ausblendbar && !quellen.includes(`abschnittZeigen('${s}', '${a}')`)) fehlt.push(`${s}.${a}`);
    }
  }
  expect(fehlt, 'ausblendbar in texte.json, aber die Ansicht fragt abschnittZeigen() nicht').toEqual([]);
});

// ---------- gebaute Website ----------

const html = (() => {
  if (!existsSync('dist')) return '';
  const alle = (d: string): string[] => readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    if (p.startsWith('dist/intern') || p.startsWith('dist/en/intern') || p.startsWith('dist/_astro')) return [];
    return statSync(p).isDirectory() ? alle(p) : p.endsWith('.html') || p.endsWith('.xml') || p.endsWith('.ics') ? [p] : [];
  });
  return alle('dist').map((p) => readFileSync(p, 'utf8')).join('\n');
})();
const yaml = (p: string) => parse(readFileSync(p, 'utf8')) as Record<string, unknown>[];
/** Eintrag, dessen Name ausschließlich er trägt (sonst kann der Name zu Recht anderswo stehen) */
const eindeutig = (name: string, alle: string[]) => alle.filter((x) => x === name).length === 1;

test('Ausgeblendete Einträge stehen nirgends auf der Website (auch nicht im Quelltext)', () => {
  test.skip(!html, 'erst bauen (npm run build)');
  const raus: string[] = [];
  const pruefen = (datei: string, feld: string) => {
    const liste = yaml(datei);
    const namen = liste.map((x) => String(x[feld] ?? ''));
    for (const x of liste) if (x.sichtbar === false && eindeutig(String(x[feld]), namen) && html.includes(String(x[feld]))) raus.push(`${datei}: ${x[feld]}`);
  };
  pruefen('src/content/personen.yaml', 'name');
  pruefen('src/content/kooperation/orte.yaml', 'name');
  pruefen('src/content/formate-archiv/projekte.yaml', 'titel');
  // ausgeblendete Personen haben keine Profilseite
  for (const p of yaml('src/content/personen.yaml')) if (p.sichtbar === false) expect(existsSync(`dist/netzwerk/${p.id}/index.html`), String(p.id)).toBe(false);
  // Texte und Abschnitte aus texte.json
  const texte = JSON.parse(readFileSync('src/settings/texte.json', 'utf8')) as Record<string, { abschnitte?: Record<string, { aus?: boolean; texte: Record<string, { de: string; aus?: boolean }> }> }>;
  for (const seite of Object.values(texte)) {
    for (const ab of Object.values(seite.abschnitte ?? {})) {
      for (const t of Object.values(ab.texte)) if ((t.aus || ab.aus) && t.de.length > 30 && html.includes(t.de)) raus.push(`texte.json: ${t.de.slice(0, 40)}`);
    }
  }
  expect(raus).toEqual([]);
});
