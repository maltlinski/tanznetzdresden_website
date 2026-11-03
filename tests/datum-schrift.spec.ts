/**
 * Regel „Datumsschrift“ (docs/entwicklung.md, src/lib/datum-schrift.ts): Datums-, Uhrzeit- und Terminangaben stehen
 * auf allen Seiten in der Schrift des Kalenders (JetBrains Mono). Erlaubt in Work Sans: nur große Tageszahlen,
 * Monats- und Jahresköpfe. Titel und Fließtext sind ausgenommen.
 *
 * Geprüft werden alle Seiten der Sitemap, je Bereich (z. B. news/, termine/, en/netzwerk/) bis zu drei Seiten, und
 * der interne Bereich mit nachgebautem Supabase – so fällt eine neue Gestaltung mit falscher Datumsschrift beim
 * nächsten `npm test` auf.
 */
import { test, expect, type Page } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { DATUM_AUSNAHMEN, DATUM_MUSTER, ZAHL_ODER_KOPF } from '../src/lib/datum-schrift';
import { montag, plusTage } from '../src/lib/keep-up-plan';
import { redaktion } from './redaktion-mock';

function seiten(): string[] {
  const datei = 'dist/sitemap-0.xml';
  if (!existsSync(datei)) return ['/'];
  const pfade = [...readFileSync(datei, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const je: Record<string, string[]> = {};
  for (const p of pfade) {
    const teile = p.split('/').filter(Boolean);
    if (teile.includes('intern') || teile.includes('admin')) continue;
    const bereich = teile[0] === 'en' ? teile.slice(0, 2).join('/') : (teile[0] ?? '');
    (je[bereich] ??= []).push(p);
  }
  return Object.values(je).flatMap((l) => l.slice(0, 3));
}

interface Verstoss { seite: string; stelle: string; text: string; schrift: string }

async function pruefen(page: Page, seite: string): Promise<Verstoss[]> {
  return page.evaluate(
    ({ muster, kopf, ausnahmen, seite }) => {
      const datum = new RegExp(muster);
      const zahl = new RegExp(kopf);
      const aus = ausnahmen.join(', ');
      const raus: Verstoss[] = [];
      const gesehen = new Set<Element>();
      const w = document.createTreeWalker(document.querySelector('main') ?? document.body, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const el = n.parentElement;
        const t = n.textContent?.trim() ?? '';
        if (!el || !t || gesehen.has(el) || !datum.test(t)) continue;
        gesehen.add(el);
        if (el.closest('script, style, svg, .visually-hidden, .sr-only, [aria-hidden="true"] .visually-hidden')) continue;
        if (!el.checkVisibility({ opacityProperty: false, visibilityProperty: true })) continue;
        if (el.closest(aus)) continue;
        const schrift = getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim();
        if (schrift === 'JetBrains Mono') continue;
        if (zahl.test(el.textContent ?? '')) continue;
        const pfad: string[] = [];
        for (let e: Element | null = el, k = 0; e && k < 3; e = e.parentElement, k++) pfad.unshift(e.tagName.toLowerCase() + (e.classList[0] ? '.' + e.classList[0] : ''));
        raus.push({ seite, stelle: pfad.join(' > '), text: t.slice(0, 60), schrift });
      }
      return raus;
    },
    { muster: DATUM_MUSTER.source, kopf: ZAHL_ODER_KOPF.source, ausnahmen: [...DATUM_AUSNAHMEN.titel, ...DATUM_AUSNAHMEN.fliesstext], seite },
  );
}

test('Datumsschrift: Datum und Uhrzeit überall in der Schrift des Kalenders', async ({ page }) => {
  test.setTimeout(240_000);
  const verstoesse: Verstoss[] = [];
  for (const seite of seiten()) {
    await page.goto(seite);
    await page.evaluate(() => document.fonts.ready);
    verstoesse.push(...(await pruefen(page, seite)));
  }
  // Monatsansicht des Kalenders (sonst verborgen)
  await page.goto('/termine/');
  const monat = page.getByRole('tab', { name: 'Monat' });
  if (await monat.isVisible()) {
    await monat.click();
    verstoesse.push(...(await pruefen(page, '/termine/ (Monat)')));
  }
  expect(liste(verstoesse)).toEqual([]);
});

const liste = (v: Verstoss[]) => v.map((x) => `${x.seite} · ${x.stelle} · „${x.text}“ (${x.schrift})`);
const heute = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
const mo = montag(heute);
const J = Number(heute.slice(0, 4));
const keepup = [
  { id: 'k1', dozent: 'aurora-fradella', woche: mo, tage: [1, 2, 3, 4, 5], ort: 'TENZA Schmiede', titel: 'Spiralen', kurz: 'Rein und raus.' },
  { id: 'k2', dozent: 'aurora-fradella', woche: plusTage(mo, 28), tage: [6], art: 'workshop', zeit: '11:00–15:00', titel: 'Floor', kurz: 'Am Boden.' },
  { id: 'k3', dozent: 'aurora-fradella', woche: plusTage(mo, -21), tage: [1, 2], titel: 'Release', kurz: 'Gewicht abgeben.' },
];
const daten = {
  mitgliedschaft: { person: 'u1', nummer: 'TNDD-2019-047', art: 'Ordentliches Mitglied', seit: '2019-03-01', bezahlt_bis: J, bezahlt_am: `${J}-02-14`, ende: null, pruefcode: '6f1c2b3a-0000-4000-8000-000000000001', updated_at: `${J}-01-06T10:00:00Z` },
  openCalls: [
    { id: 'a', art: 'audition', titel: 'Audition Stadtraum', anbieter: 'Kollektiv', frist: plusTage(heute, 9), uhrzeit: '18:00:00', link: 'https://example.org/a' },
    { id: 'b', art: 'foerderung', titel: 'Projektförderung', anbieter: 'Stiftung', frist: plusTage(heute, 60), start: plusTage(heute, 3), link: 'https://example.org/b' },
  ],
  kalender: [{
    id: 't1', slug: `${plusTage(heute, 2)}-showing`, titel: 'Showing', titel_en: '', datum: plusTage(heute, 2), von: '19:30:00', bis: '21:00:00', zeit_text: '',
    ort: 'Villa Wigman für Tanz', kategorie: 'Diskurs', kurz: 'Showing und Gespräch.', kurz_en: '', text: '', link: '', format: '', personen: [], news: '', sichtbar: true,
  }],
  keepup,
};

async function intern(page: Page, pfade: string[]): Promise<Verstoss[]> {
  const raus: Verstoss[] = [];
  for (const pfad of pfade) {
    await page.goto(pfad);
    await page.waitForLoadState('networkidle');
    // Daten aus dem nachgebauten Supabase sind da (sonst prüft der Test nichts)
    await expect(page.locator('main')).toContainText(/\d{1,2}\.\s?\p{L}{3}|\d\d:\d\d/u);
    await page.evaluate(() => document.fonts.ready);
    raus.push(...(await pruefen(page, pfad)));
  }
  return raus;
}

test('Datumsschrift im internen Bereich: Status, Open Calls, Kalender, KEEP UP', async ({ page }) => {
  await redaktion(page, { profil: { display_name: 'Vera Vorstand', role: 'vorstand' }, ...daten });
  expect(liste(await intern(page, ['/intern/', '/intern/open-calls/', '/intern/kalender/', '/intern/keep-up/']))).toEqual([]);
});

test('Datumsschrift im internen Bereich: Meine Trainings und Vorschau', async ({ page }) => {
  await redaktion(page, { profil: { display_name: 'Aurora Fradella', role: 'mitglied', slug: 'aurora-fradella', verified: true }, keepup, keepupIch: 'aurora-fradella' });
  expect(liste(await intern(page, ['/intern/keep-up/meine/', '/intern/keep-up/beschreiben/?id=k1']))).toEqual([]);
});
