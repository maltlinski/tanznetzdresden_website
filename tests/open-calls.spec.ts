/**
 * Intern → Open Calls (Entwurf design/entwuerfe/2026-10-open-calls/): Liste, Zeitleiste, Filter, Merken, Stand,
 * Unterlagen, Netzwerk, Kalenderdatei, Melden; Redaktion prüft und trägt ein; englische Seite.
 * Ohne Browser: Fristen und Kalenderdatei (src/lib/open-calls.ts) und die Funktion „erinnerungen“.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { redaktion } from './redaktion-mock';
import { abgelaufen, fristenIcs, restText, tageBis, zeitleiste, type OpenCall } from '../src/lib/open-calls';
import { faellig, handle, mailText, nachricht, smtpSenden, type Env, type Leitung } from '../supabase/functions/erinnerungen/index';

// Stichtag wie im Entwurf: Montag, 26. Oktober 2026, mittags in Dresden
const JETZT = new Date('2026-10-26T12:00:00+01:00');

const CALLS = [
  { id: 'cme', art: 'residenz', titel: 'Culture Moves Europe · Individuelle Mobilität', anbieter: 'Goethe-Institut · Creative Europe', reichweite: 'int', ort: 'Creative-Europe-Länder', frist: '2026-10-31', leistung: 'Reise- und Aufenthaltspauschale', honoriert: true, englisch: true, wiederkehrend: 'Monatliche Fristen bis April 2027', unterlagen: ['Projektbeschreibung (Englisch)', 'Lebenslauf', 'Einladung oder Absprache mit Gastgeber:in', 'Reiseplan'], quelle: 'on-the-move.org', geprueft_am: '2026-10-20', link: 'https://on-the-move.org', created_at: '2026-10-02T10:00:00Z' },
  { id: 'artex', art: 'residenz', titel: 'Art Explora · Residenzprogramm 2027', anbieter: 'Cité internationale des arts, Paris', reichweite: 'int', ort: 'Paris', frist: '2026-10-30', leistung: 'Atelierwohnung und Stipendium', honoriert: true, englisch: true, link: 'https://www.lbk-sachsen.de/ausschreibungen', created_at: '2026-09-12T10:00:00Z' },
  { id: 'aud', art: 'audition', titel: 'Audition: zwei Tänzer:innen für eine Stadtraum-Produktion', anbieter: 'Kollektiv Fliehkraft', reichweite: 'dd', ort: 'Dresden-Neustadt', frist: '2026-11-06', uhrzeit: '18:00:00', leistung: 'Gage nach Honoraruntergrenze', honoriert: true, englisch: true, unterlagen: ['Kurzvita', 'Foto', 'Videolink (max. 3 Min.)'], gemeldet_von: 'm2', link: 'https://example.org/audition', created_at: '2026-10-22T10:00:00Z' },
  { id: 'cdf', art: 'festival', titel: 'CircusDanceFestival 2027 · 360° Shorts', anbieter: 'CircusDanceFestival, Köln', reichweite: 'bund', ort: 'Köln', frist: '2026-11-08', leistung: 'Honorar und Reisekosten laut Ausschreibung', honoriert: true, englisch: true, zeitraum: 'Festival 2027', beschreibung: 'Gesucht werden kurze Arbeiten für eine Bühnensituation, die von allen Seiten einsehbar ist.', unterlagen: ['Stückbeschreibung', 'Video (max. 10 Min.)', 'Technische Angaben', 'Besetzung'], link: 'https://on-the-move.org', created_at: '2026-09-30T10:00:00Z' },
  { id: 'schaufler', art: 'residenz', titel: 'Schaufler Residency@TU Dresden 2027', anbieter: 'Schaufler Lab@TU Dresden', reichweite: 'dd', ort: 'Dresden', frist: '2026-11-10', honoriert: true, englisch: true, link: 'https://www.lbk-sachsen.de/ausschreibungen', created_at: '2026-09-25T10:00:00Z' },
  { id: 'keepup', art: 'job', titel: 'KEEP UP 2027 · Dozent:innen fürs Profitraining', anbieter: 'TanzNetzDresden e.V.', reichweite: 'dd', ort: 'Dresden', frist: '2026-11-15', honoriert: true, vom_netzwerk: true, link: 'https://tanznetzdresden.de/profitraining/', created_at: '2026-10-14T10:00:00Z' },
  { id: 'assist', art: 'job', titel: 'Projektassistenz Tanzvermittlung · Minijob', anbieter: 'TanzNetzDresden e.V.', reichweite: 'dd', frist: '2026-11-20', uhrzeit: '12:00:00', honoriert: true, vom_netzwerk: true, link: 'https://tanznetzdresden.de/', created_at: '2026-10-24T10:00:00Z' },
  { id: 'ksfs', art: 'foerderung', titel: 'Kulturstiftung des Freistaates Sachsen · Projektförderung', anbieter: 'Kulturstiftung des Freistaates Sachsen', reichweite: 'sn', frist: '2027-03-01', honoriert: true, link: 'https://www.kdfs.de', created_at: '2026-09-02T10:00:00Z' },
  { id: 'tanzpakt', art: 'foerderung', titel: 'TANZPAKT Stadt-Land-Bund · 5. Ausschreibung', anbieter: 'Bundesverband Freie Darstellende Künste', reichweite: 'bund', frist: '2027-04-05', uhrzeit: '18:00:00', start: '2026-11-05', honoriert: true, gemeinsam: true, hinweis: 'Der Vorstand prüft einen gemeinsamen Antrag des Netzwerks. Wer mitmachen will, setzt bis 30. November den Haken unten.', link: 'https://example.org/tanzpakt', created_at: '2026-10-08T10:00:00Z' },
  { id: 'fontevraud', art: 'residenz', titel: 'Maison Ackerman · Residenz für immersive Projekte 2027', anbieter: 'Abbaye Royale de Fontevraud', reichweite: 'int', frist: '2026-10-18', link: 'https://on-the-move.org' },
  { id: 'broellin', art: 'residenz', titel: 'Residenzen Schloss Bröllin 2027', anbieter: 'schloss bröllin e.V.', reichweite: 'bund', frist: '2026-10-01', unterlagen: ['Projektskizze', 'Vita'], link: 'https://example.org/broellin' },
  { id: 'hzt', art: 'weiterbildung', titel: 'Master Choreografie', anbieter: 'HZT Berlin', reichweite: 'bund', frist: '2026-09-30', link: 'https://example.org/hzt' },
  { id: 'k3', art: 'residenz', titel: 'Choreografische Residenzen 2027/28', anbieter: 'K3 · Tanzplan Hamburg', reichweite: 'bund', frist: '2026-08-12', link: 'https://example.org/k3' },
];
const STAND = [
  { person: 'u1', call_id: 'cme', stand: 'gemerkt', unterlagen: [], erinnerung: false, sprache: 'de', erinnert: [] },
  { person: 'u1', call_id: 'aud', stand: 'arbeit', unterlagen: [true, true, false], erinnerung: false, sprache: 'de', erinnert: [] },
  { person: 'u1', call_id: 'broellin', stand: 'zusage', unterlagen: [true, true], erinnerung: false, sprache: 'de', erinnert: [] },
  { person: 'u1', call_id: 'k3', stand: 'absage', unterlagen: [], erinnerung: false, sprache: 'de', erinnert: [] },
];
const NETZ = [
  { call_id: 'cme', person: 'm3', art: 'erfahrung' },
  { call_id: 'cme', person: 'm4', art: 'erfahrung' },
  { call_id: 'tanzpakt', person: 'm3', art: 'mitmachen' },
];
const PERSONEN = [
  { id: 'm2', display_name: 'Kollektiv Fliehkraft', slug: 'fliehkraft', verified: false, photo_path: null },
  { id: 'm3', display_name: 'Jonas Brandt', slug: 'jonas-brandt', verified: true, photo_path: null },
  { id: 'm4', display_name: 'Mira Okafor', slug: 'mira-okafor', verified: false, photo_path: null },
];
const lea = { display_name: 'Lea Sommer', role: 'mitglied' };

async function seite(page: Page, o: Parameters<typeof redaktion>[1] = {}, pfad = '/intern/open-calls/') {
  await page.clock.install({ time: JETZT });
  const m = await redaktion(page, { profil: lea, openCalls: CALLS, ocStand: STAND, ocNetz: NETZ, personen: PERSONEN, ...o });
  await page.goto(pfad);
  if (pfad.includes('open-calls')) await expect(page.locator('[data-oc-bereich]')).toBeVisible();
  return m;
}
const zeilen = (page: Page) => page.locator('.oc-zeile');
const tab = (page: Page, name: RegExp) => page.locator('[data-oc-tabs] button').filter({ hasText: name });

test('Mitglied: laufende Calls nach Frist, Zeitleiste, Hinweis auf eigene Frist, Filter und Suche', async ({ page }) => {
  await seite(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Open Calls' })).toBeVisible();
  await expect(page.locator('[data-nav-n="opencalls"]')).toHaveText('9');
  await expect(tab(page, /^Aktuell/)).toHaveText('Aktuell9');
  await expect(tab(page, /^Gemerkt/)).toHaveText('Gemerkt2');
  await expect(tab(page, /^Archiv/)).toHaveText('Archiv4');
  await expect(page.locator('[data-oc-tabs] button')).toHaveCount(4);

  // nach Frist: Art Explora (30.10.) vor Culture Moves (31.10.)
  await expect(zeilen(page)).toHaveCount(9);
  await expect(zeilen(page).first()).toContainText('Art Explora');
  await expect(zeilen(page).first().locator('.oc-datum')).toContainText('Okt 2630Noch 4 Tage');
  await expect(zeilen(page).first().locator('.oc-datum')).toHaveClass(/oc-ton--dringend/);
  await expect(zeilen(page).filter({ hasText: 'TANZPAKT' }).locator('.oc-datum')).toHaveClass(/oc-ton--spaeter/);
  await expect(zeilen(page).filter({ hasText: 'Audition' })).toContainText('In Arbeit');
  await expect(zeilen(page).filter({ hasText: 'Audition' })).toContainText('Von Mitglied');
  await expect(zeilen(page).filter({ hasText: 'KEEP UP 2027' })).toContainText('Vom Netzwerk');

  // eigene Frist in den nächsten 7 Tagen (Culture Moves, gemerkt)
  await expect(page.locator('[data-oc-dringend-titel]')).toHaveText('Eine deiner Fristen läuft in 5 Tagen ab.');
  await expect(page.locator('[data-oc-dringend-namen]')).toHaveText('Culture Moves Europe · Individuelle Mobilität (31.10.)');

  // Zeitleiste: sieben Fristen in 12 Wochen, zwei später
  await expect(page.locator('.oc-marke')).toHaveCount(7);
  await expect(page.locator('[data-oc-spaeter]')).toHaveText('+ 2 später');
  await expect(page.locator('.oc-zeit__monat')).toHaveText(['November', 'Dezember', 'Januar']);

  // Filter: Art, Reichweite, Eigenschaften, Suche
  await page.locator('[data-oc-arten] button').filter({ hasText: 'Residenz' }).click();
  await expect(zeilen(page)).toHaveCount(3);
  await page.locator('[data-oc-reichweiten] button').filter({ hasText: 'Dresden' }).click();
  await expect(zeilen(page)).toHaveCount(1);
  await expect(zeilen(page)).toContainText('Schaufler');
  await page.locator('[data-oc-arten] button').filter({ hasText: 'Alle' }).click();
  await page.locator('[data-oc-reichweiten] button').filter({ hasText: 'Überall' }).click();
  await page.locator('[data-oc-flags]').getByLabel('Aus dem Netzwerk').check();
  await expect(zeilen(page)).toHaveCount(3);
  await page.getByLabel('Open Calls durchsuchen').fill('köln');
  await expect(page.locator('.oc-leer')).toContainText('Kein Call passt zu diesen Filtern.');
  await page.getByRole('button', { name: 'Filter zurücksetzen' }).click();
  await expect(zeilen(page)).toHaveCount(9);
  await page.getByLabel('Sortierung').selectOption('neu');
  await expect(zeilen(page).first()).toContainText('Projektassistenz');

  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id} ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});

test('Mitglied: merken, Stand und Unterlagen, Netzwerk, Bewerbungen, Archiv, Kalenderdatei', async ({ page }) => {
  const m = await seite(page);
  const artex = zeilen(page).filter({ hasText: 'Art Explora' });
  await artex.getByRole('button', { name: 'Merken: Art Explora · Residenzprogramm 2027' }).click();
  await expect(page.locator('[data-ku-toast]')).toContainText('Gemerkt.');
  await expect(artex.getByRole('button', { name: /^Gemerkt/ })).toHaveAttribute('aria-pressed', 'true');
  expect(m.ocAenderungen.at(-1)).toMatchObject({ tabelle: 'open_call_stand', body: { person: 'u1', call_id: 'artex', stand: 'gemerkt' } });
  await expect(tab(page, /^Gemerkt/)).toHaveText('Gemerkt3');

  // Detail: Stand, Unterlagen abhaken setzt „In Arbeit“
  await zeilen(page).filter({ hasText: 'CircusDance' }).locator('.oc-zeile__auf').click();
  const d = page.getByRole('dialog', { name: 'CircusDanceFestival 2027 · 360° Shorts' });
  await expect(d).toBeVisible();
  await expect(page).toHaveURL(/#call-cdf$/);
  await expect(d.locator('.oc-frist')).toContainText('8. November 2026 · 23:59 Uhr');
  await expect(d.locator('.oc-frist')).toContainText('Noch 13 Tage');
  await expect(d.getByRole('link', { name: 'Zur Ausschreibung ↗' })).toHaveAttribute('href', 'https://on-the-move.org');
  await expect(d.locator('.oc-fakten')).toContainText('Festival 2027');
  // ohne eingerichtete Mail-Erinnerung kein Häkchen dafür
  await expect(d.getByText('Erinnere mich')).toHaveCount(0);
  await expect(d.locator('.oc-block__zahl')).toHaveText('0 von 4 erledigt');
  await d.getByLabel('Stückbeschreibung').check();
  await expect(d.locator('.oc-block__zahl')).toHaveText('1 von 4 erledigt');
  await expect(d.getByRole('button', { name: 'In Arbeit' })).toHaveAttribute('aria-pressed', 'true');
  expect(m.ocAenderungen.at(-1)!.body).toMatchObject({ call_id: 'cdf', stand: 'arbeit', unterlagen: [true, false, false, false] });
  await d.getByRole('button', { name: 'Eingereicht' }).click();
  await expect(d.getByRole('button', { name: 'Eingereicht' })).toHaveAttribute('aria-pressed', 'true');
  await expect(d.getByRole('button', { name: 'Eingereicht' })).toBeFocused();
  await d.getByRole('button', { name: 'Schließen' }).click();
  await expect(d).toBeHidden();
  await expect(page).not.toHaveURL(/#/);

  // Netzwerk: Erfahrungen und gemeinsamer Antrag
  await zeilen(page).filter({ hasText: 'Culture Moves' }).locator('.oc-zeile__auf').click();
  const cme = page.getByRole('dialog', { name: /Culture Moves/ });
  await expect(cme.locator('.oc-netz')).toContainText('2 Mitglieder haben sich hier schon beworben und teilen Erfahrungen:');
  await expect(cme.getByRole('link', { name: 'Jonas Brandt' })).toHaveAttribute('href', '/netzwerk/jonas-brandt/');
  await expect(cme.locator('.oc-person')).toHaveText(['JBJonas Brandt', 'MOMira Okafor']);
  await expect(cme.locator('.oc-quelle')).toHaveText('Geprüft von der Redaktion am 20.10.2026 · Quelle: on-the-move.org');
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(cme).toBeHidden();

  await zeilen(page).filter({ hasText: 'TANZPAKT' }).locator('.oc-zeile__auf').click();
  const tp = page.getByRole('dialog', { name: /TANZPAKT/ });
  await expect(tp.locator('.oc-frist')).toContainText('Antragstellung ab 5.11.2026.');
  await expect(tp.locator('.oc-netz')).toContainText('Der Vorstand prüft einen gemeinsamen Antrag');
  await expect(tp.locator('.oc-netz')).toContainText('Beim gemeinsamen Antrag dabei:');
  // die Beschriftung zählt mit: danach „2 Personen“
  await tp.getByLabel(/Ich mache beim gemeinsamen Antrag mit · 1 Person dabei/).click();
  await expect(tp.getByLabel(/Ich mache beim gemeinsamen Antrag mit · 2 Personen dabei/)).toBeChecked();
  await expect(tp.locator('.oc-person')).toHaveCount(2);
  expect(m.ocNetz).toContainEqual({ erinnert: [], call_id: 'tanzpakt', person: 'u1', art: 'mitmachen' });
  await expect(tp.locator('[data-ku-toast]')).toContainText('Dein Interesse ist für andere Mitglieder sichtbar.');

  // Kalenderdatei des Calls
  const [datei] = await Promise.all([page.waitForEvent('download'), tp.getByRole('button', { name: 'In Kalender ↓' }).click()]);
  const ics = readFileSync((await datei.path())!, 'utf8');
  expect(ics).toContain('DTEND;TZID=Europe/Berlin:20270405T180000');
  expect(ics).toContain('TRIGGER:-P7D');
  await tp.getByRole('button', { name: 'Schließen' }).click();

  // Meine Bewerbungen: Spalten nach Stand
  await tab(page, /^Meine Bewerbungen/).click();
  await expect(page.locator('[data-oc-zeit]')).toBeHidden();
  const spalte = (n: string) => page.locator('.oc-spalte').filter({ has: page.getByRole('heading', { name: n }) });
  await expect(spalte('In Arbeit').locator('.oc-karte')).toHaveCount(1);
  await expect(spalte('In Arbeit').locator('.oc-karte__docs')).toContainText('2/3');
  await expect(spalte('Eingereicht').locator('.oc-karte')).toContainText('CircusDance');
  await expect(spalte('Zusage').locator('.oc-karte')).toContainText('Frist war 1.10.2026');
  await expect(spalte('Absage').locator('.oc-karte')).toHaveCount(1);

  // Archiv: abgelaufene, ohne Merken
  await tab(page, /^Archiv/).click();
  await expect(zeilen(page)).toHaveCount(4);
  await expect(zeilen(page).first()).toContainText('Maison Ackerman');
  await expect(zeilen(page).first()).toContainText('Abgelaufen');
  await expect(page.locator('.oc-merken')).toHaveCount(0);

  // alle gemerkten Fristen als eine Datei
  const [alle] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Gemerkte Fristen in Kalender ↓' }).click()]);
  expect(alle.suggestedFilename()).toBe('tanznetz-fristen.ics');
  const text = readFileSync((await alle.path())!, 'utf8');
  expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(4);
  expect(text).toContain('SUMMARY:Frist: Culture Moves Europe · Individuelle Mobilität');
});

test('Mitglied meldet einen Call: Pflichtfelder, Prüfung, zurückziehen; Link öffnet den Call', async ({ page }) => {
  const m = await seite(page);
  await page.getByRole('button', { name: 'Call melden' }).click();
  const f = page.getByRole('dialog', { name: 'Call melden' });
  await expect(f.locator('[data-f-mehr]')).toBeHidden();
  await f.getByRole('button', { name: 'Zur Prüfung senden' }).click();
  await expect(f.locator('[data-f-hint]')).toHaveText('Bitte Titel, Anbieter, Frist und Link ausfüllen.');
  await expect(f.getByLabel('Titel')).toBeFocused();
  await f.getByLabel('Titel').fill('Residenz Herbst 2027');
  await f.getByLabel('Anbieter').fill('Festspielhaus Hellerau');
  await f.getByRole('button', { name: 'Audition' }).click();
  await f.getByRole('button', { name: 'Sachsen' }).click();
  await f.getByLabel('Frist · Ablaufdatum').fill('2026-12-01');
  await f.getByLabel('Link zur Ausschreibung').fill('hellerau.org');
  await f.getByRole('button', { name: 'Zur Prüfung senden' }).click();
  await expect(f.locator('[data-f-hint]')).toHaveText('Der Link muss mit https:// beginnen.');
  await f.getByLabel('Link zur Ausschreibung').fill('https://www.hellerau.org/open-call');
  await f.getByLabel('Leistung / Honorar').fill('1.500 €');
  await expect(f.locator('[data-f-hint]')).toHaveText('Geht am 1.12.2026 nach 23:59 Uhr ins Archiv.');
  await f.getByRole('button', { name: 'Zur Prüfung senden' }).click();
  await expect(f).toBeHidden();
  await expect(page.locator('[data-ku-toast]')).toContainText('Danke! Dein Call ist bei der Redaktion.');
  expect(m.ocAenderungen.at(-1)).toMatchObject({
    tabelle: 'open_calls', methode: 'POST',
    body: { art: 'audition', reichweite: 'sn', titel: 'Residenz Herbst 2027', anbieter: 'Festspielhaus Hellerau', frist: '2026-12-01', uhrzeit: '23:59', link: 'https://www.hellerau.org/open-call', leistung: '1.500 €', status: 'pruefung', gemeldet_von: 'u1' },
  });
  expect(m.ocAenderungen.at(-1)!.body).not.toHaveProperty('hinweis');
  // eigene Meldung steht mit „In Prüfung“ dabei, zählt aber nicht mit
  const meine = zeilen(page).filter({ hasText: 'Residenz Herbst 2027' });
  await expect(meine).toContainText('In Prüfung');
  await expect(meine.locator('.oc-merken')).toHaveCount(0);
  await expect(tab(page, /^Aktuell/)).toHaveText('Aktuell9');
  await meine.locator('.oc-zeile__auf').click();
  const d = page.getByRole('dialog', { name: 'Residenz Herbst 2027' });
  await expect(d.locator('.oc-quelle')).toHaveText('Von dir gemeldet · wartet auf Prüfung durch die Redaktion');
  await expect(d.getByRole('group', { name: 'Mein Stand' })).toHaveCount(0);
  page.once('dialog', (x) => x.accept());
  await d.getByRole('button', { name: 'Meldung zurückziehen' }).click();
  await expect(d).toBeHidden();
  await expect(zeilen(page).filter({ hasText: 'Residenz Herbst 2027' })).toHaveCount(0);
  expect(m.ocAenderungen.at(-1)).toMatchObject({ tabelle: 'open_calls', methode: 'DELETE' });

  // geteilter Link öffnet den Call direkt
  await page.goto('/intern/open-calls/#call-schaufler');
  await expect(page.getByRole('dialog', { name: 'Schaufler Residency@TU Dresden 2027' })).toBeVisible();
});

test('Redaktion: Meldungen prüfen und freigeben, Call eintragen mit allen Angaben, bearbeiten, ablehnen', async ({ page }) => {
  const gemeldet = [
    { id: 'neu1', art: 'audition', titel: 'Audition Tanzcompany Görlitz', anbieter: 'Theater Görlitz', reichweite: 'sn', frist: '2026-11-30', status: 'pruefung', gemeldet_von: 'm2', link: 'https://example.org/goerlitz', created_at: '2026-10-25T09:00:00Z' },
    { id: 'neu2', art: 'job', titel: 'Spam-Angebot', anbieter: 'Irgendwer', frist: '2026-12-01', status: 'pruefung', gemeldet_von: 'm4', link: 'https://example.org/spam', created_at: '2026-10-25T10:00:00Z' },
  ];
  const m = await seite(page, { profil: { display_name: 'Pia Presse', role: 'presse' }, openCalls: [...CALLS, ...gemeldet], freigaben: [] }, '/intern/redaktion/freigaben/');
  await expect(page.locator('[data-calls]')).toHaveText('2 gemeldete Open Calls warten auf Prüfung →');
  await page.locator('[data-calls] a').click();
  await expect(page.locator('[data-oc-bereich]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Call eintragen' })).toBeVisible();
  await expect(page.locator('[data-oc-pruefen-titel]')).toHaveText('2 gemeldete Calls warten auf Prüfung.');
  await expect(zeilen(page)).toHaveCount(9);
  await page.locator('[data-oc-pruefen-knopf]').click();
  await expect(tab(page, /^Zu prüfen/)).toHaveAttribute('aria-pressed', 'true');
  await expect(zeilen(page)).toHaveCount(2);
  await expect(page.locator('[data-oc-pruefen]')).toBeHidden();

  await zeilen(page).filter({ hasText: 'Görlitz' }).locator('.oc-zeile__auf').click();
  const d = page.getByRole('dialog', { name: 'Audition Tanzcompany Görlitz' });
  await expect(d.locator('.oc-redaktion')).toContainText('Gemeldet von Kollektiv Fliehkraft am 25.10.2026.');
  await d.getByRole('button', { name: 'Freigeben' }).click();
  await expect(d.locator('[data-ku-toast]')).toContainText('Freigegeben.');
  expect(m.ocAenderungen.at(-1)).toMatchObject({ tabelle: 'open_calls', methode: 'PATCH', body: { status: 'frei' }, query: expect.stringContaining('id=eq.neu1') });
  await expect(d.getByRole('group', { name: 'Mein Stand' })).toBeVisible();
  await expect(d.locator('.oc-quelle')).toHaveText('Geprüft von der Redaktion am 26.10.2026 · Quelle: gemeldet von Kollektiv Fliehkraft');
  await d.getByRole('button', { name: 'Schließen' }).click();
  await expect(tab(page, /^Zu prüfen/)).toHaveText('Zu prüfen1');

  page.once('dialog', (x) => x.accept());
  await zeilen(page).filter({ hasText: 'Spam' }).locator('.oc-zeile__auf').click();
  await page.getByRole('dialog', { name: 'Spam-Angebot' }).getByRole('button', { name: 'Ablehnen' }).click();
  await expect(page.locator('.oc-leer')).toContainText('Gerade wartet nichts auf Prüfung.');

  // selbst eintragen: sofort frei, mit Unterlagen und Hinweis
  await tab(page, /^Aktuell/).click();
  await page.getByRole('button', { name: 'Call eintragen' }).click();
  const f = page.getByRole('dialog', { name: 'Call eintragen' });
  await f.getByLabel('Titel').fill('Tanzstipendium der Stadt Dresden 2027');
  await f.getByLabel('Anbieter').fill('Landeshauptstadt Dresden');
  await f.getByRole('button', { name: 'Stipendium & Preis' }).click();
  await f.getByLabel('Frist · Ablaufdatum').fill('2027-01-15');
  await f.getByLabel('Uhrzeit').fill('12:00');
  await f.getByLabel('Link zur Ausschreibung').fill('https://www.dresden.de/kultur');
  await f.getByText('Mehr Angaben').click();
  await f.getByLabel('Unterlagen').fill('Lebenslauf\n\nProjektskizze  \n');
  await f.getByLabel('Honoriert').check();
  await f.getByLabel(/Gemeinsamer Antrag/).check();
  await f.getByLabel('Hinweis aus dem Netzwerk').fill('Wir beraten am 3. Dezember im Netzwerktreffen.');
  await f.getByRole('button', { name: 'Veröffentlichen' }).click();
  await expect(f).toBeHidden();
  expect(m.ocAenderungen.at(-1)).toMatchObject({
    tabelle: 'open_calls', methode: 'POST',
    body: { art: 'stipendium', reichweite: 'dd', uhrzeit: '12:00', unterlagen: ['Lebenslauf', 'Projektskizze'], honoriert: true, gemeinsam: true, englisch: false, status: 'frei', start: null, hinweis: 'Wir beraten am 3. Dezember im Netzwerktreffen.' },
  });
  expect(m.ocAenderungen.at(-1)!.body).not.toHaveProperty('gemeldet_von');
  await expect(tab(page, /^Aktuell/)).toHaveText('Aktuell11');

  // bearbeiten
  await zeilen(page).filter({ hasText: 'Tanzstipendium' }).locator('.oc-zeile__auf').click();
  await page.getByRole('dialog', { name: /Tanzstipendium/ }).getByRole('button', { name: 'Bearbeiten' }).click();
  const e = page.getByRole('dialog', { name: 'Call bearbeiten' });
  await expect(e.getByLabel('Unterlagen')).toHaveValue('Lebenslauf\nProjektskizze');
  await expect(e.getByLabel('Uhrzeit')).toHaveValue('12:00');
  await e.getByLabel('Titel').fill('Tanzstipendium Dresden 2027');
  await e.getByRole('button', { name: 'Speichern' }).click();
  await expect(e).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Tanzstipendium Dresden 2027' })).toBeVisible();
  expect(m.ocAenderungen.at(-1)).toMatchObject({ methode: 'PATCH', body: { titel: 'Tanzstipendium Dresden 2027' } });
});

test('Open Calls auf Englisch, Hinweis ohne Tabelle', async ({ page }) => {
  await seite(page, {}, '/en/intern/open-calls/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('button', { name: 'Report a call' })).toBeVisible();
  await expect(tab(page, /^Current/)).toHaveText('Current9');
  await expect(zeilen(page).first().locator('.oc-datum')).toContainText('Oct 26304 days left');
  await expect(page.locator('[data-oc-dringend-titel]')).toHaveText('One of your deadlines ends in 5 days.');
  await expect(page.locator('.oc-zeit__monat').first()).toHaveText('November');
  await zeilen(page).filter({ hasText: 'TANZPAKT' }).locator('.oc-zeile__auf').click();
  const d = page.getByRole('dialog', { name: /TANZPAKT/ });
  await expect(d.locator('.oc-frist')).toContainText('5 April 2027 · 18:00');
  await expect(d.locator('.oc-frist')).toContainText('Applications from 5 Nov 2026.');
  await expect(d.getByRole('button', { name: 'Submitted' })).toBeVisible();
  await expect(page.locator('a[data-intern-sprache="de"]')).toHaveAttribute('href', '/intern/open-calls/');

  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await redaktion(page, { profil: lea });
  await page.goto('/intern/open-calls/');
  await expect(page.locator('[data-msg]')).toContainText('Open Calls gibt es, sobald die Migration');
  await expect(page.locator('[data-oc-bereich]')).toBeHidden();
});

test.describe('Fristen, Kalenderdatei und Erinnerungen (ohne Browser)', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'ohne Browser, einmal reicht'));
  const call = (z: Partial<OpenCall>): OpenCall => ({
    id: 'x', art: 'residenz', titel: 'Residenz, mit; Zeichen', anbieter: 'Haus', reichweite: 'dd', ort: '', frist: '2026-10-31', uhrzeit: '23:59:00', start: null,
    link: 'https://example.org', leistung: '', honoriert: false, englisch: false, zeitraum: '', zielgruppe: '', sprache: '', wiederkehrend: '', beschreibung: '',
    unterlagen: [], hinweis: '', gemeinsam: false, vom_netzwerk: false, nur_mitglieder: false, quelle: '', status: 'frei', gemeldet_von: null, geprueft_am: null,
    created_at: '2026-10-01T00:00:00Z', ...z,
  });

  test('Fristen in Dresdner Zeit, Rest-Text, Zeitleiste, Kalenderdatei', () => {
    const c = call({ frist: '2026-10-26', uhrzeit: '18:00:00' });
    // 17:59 in Dresden = 16:59 UTC (Winterzeit)
    expect(abgelaufen(c, { datum: '2026-10-26', zeit: '17:59' })).toBe(false);
    expect(abgelaufen(c, { datum: '2026-10-26', zeit: '18:01' })).toBe(true);
    expect(restText(c, 'de', { datum: '2026-10-26', zeit: '12:00' })).toBe('Endet heute');
    expect(restText(call({ frist: '2026-10-27' }), 'en', { datum: '2026-10-26', zeit: '12:00' })).toBe('Ends tomorrow');
    expect(restText(call({ status: 'pruefung' }), 'de')).toBe('In Prüfung');
    expect(tageBis('2027-01-01', '2026-12-31')).toBe(1);

    const z = zeitleiste([call({ id: 'a', frist: '2026-10-30' }), call({ id: 'b', frist: '2026-10-31' }), call({ id: 'c', frist: '2027-03-01' })], '2026-10-26');
    expect(z.marken.map((x) => x.reihe)).toEqual([0, 1]);
    expect(z.spaeter).toBe(1);
    expect(z.monate.map((x) => x.monat)).toEqual([10, 11, 0]);

    const ics = fristenIcs([call({ frist: '2026-11-01', uhrzeit: '00:15:00' })], { sprache: 'de', seite: () => 'https://tanznetzdresden.de/intern/open-calls/#call-x', jetzt: new Date('2026-10-26T12:00:00Z') });
    expect(ics).toContain('DTSTART;TZID=Europe/Berlin:20261031T234500');
    expect(ics).toContain('DTEND;TZID=Europe/Berlin:20261101T001500');
    expect(ics).toContain('SUMMARY:Frist: Residenz\\, mit\\; Zeichen');
    expect(ics).toContain('BEGIN:VTIMEZONE');
    expect(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });

  const env: Env = { siteUrl: 'https://tanznetzdresden.de', supabaseUrl: 'https://sb.test', serviceKey: 'service', smtp: { host: 'mail.test', port: 465, user: 'post@tanznetzdresden.de', pass: 'geheim', from: 'post@tanznetzdresden.de' } };

  /** Mailserver zum Mitlesen */
  const server = () => {
    const befehle: string[] = [];
    let raus = ['220 mail.test ESMTP\r\n'];
    const leitung: Leitung = {
      async lesen() { return raus.shift() ?? ''; },
      async schreiben(text) {
        befehle.push(text);
        const z = text.split('\r\n')[0];
        raus.push(/^EHLO/.test(z) ? '250-mail.test\r\n250 AUTH PLAIN LOGIN\r\n' : /^AUTH/.test(z) ? '235 ok\r\n' : z === 'DATA' ? '354 go\r\n' : z === 'QUIT' ? '221 bye\r\n' : '250 ok\r\n');
      },
      schliessen() { raus = []; },
    };
    return { befehle, leitung };
  };

  test('SMTP: Anmeldung, Umlaute im Betreff, Punkte am Zeilenanfang', async () => {
    const s = server();
    await smtpSenden(s.leitung, env.smtp, [{ an: 'lea@example.org', betreff: 'Noch 7 Tage: Förderung', text: 'Hallo\n.\nEnde' }]);
    expect(s.befehle[0]).toBe('EHLO tanznetzdresden.de\r\n');
    expect(s.befehle[1]).toBe(`AUTH PLAIN ${Buffer.from('\0post@tanznetzdresden.de\0geheim').toString('base64')}\r\n`);
    expect(s.befehle.slice(2, 5)).toEqual(['MAIL FROM:<post@tanznetzdresden.de>\r\n', 'RCPT TO:<lea@example.org>\r\n', 'DATA\r\n']);
    const daten = s.befehle[5];
    expect(daten).toContain(`Subject: =?UTF-8?B?${Buffer.from('Noch 7 Tage: Förderung').toString('base64')}?=`);
    expect(daten.endsWith('\r\n.\r\n')).toBe(true);
    const body = daten.split('\r\n\r\n')[1].replace(/\r\n\.\r\n$/, '').replace(/\r\n/g, '');
    expect(Buffer.from(body, 'base64').toString('utf8')).toBe('Hallo\r\n.\r\nEnde');
    expect(s.befehle.at(-1)).toBe('QUIT\r\n');
    expect(nachricht({ an: 'a@b.de', betreff: 'Hi', text: 'x' }, 'post@tanznetzdresden.de')).toContain('Subject: Hi\r\n');
  });

  test('Erinnerungen: fällig 7 Tage und 1 Tag vorher, nur einmal, nur mit Service-Schlüssel', async () => {
    expect(faellig({ stand: 'gemerkt', erinnert: [], frist: '2026-11-02' }, '2026-10-26')).toBe('7');
    expect(faellig({ stand: 'arbeit', erinnert: ['7'], frist: '2026-11-02' }, '2026-10-26')).toBe(null);
    expect(faellig({ stand: 'arbeit', erinnert: ['7'], frist: '2026-10-27' }, '2026-10-26')).toBe('1');
    expect(faellig({ stand: 'gemerkt', erinnert: [], frist: '2026-11-10' }, '2026-10-26')).toBe(null);
    expect(faellig({ stand: 'eingereicht', erinnert: [], frist: '2026-10-27' }, '2026-10-26')).toBe(null);
    expect(faellig({ stand: 'gemerkt', erinnert: [], frist: '2026-10-25' }, '2026-10-26')).toBe(null);
    const en = mailText({ titel: 'Residency', anbieter: 'Haus', frist: '2026-10-27', uhrzeit: '18:00:00', link: 'https://example.org', status: 'frei' }, { name: 'Lea', sprache: 'en', seite: 'https://x/', heute: '2026-10-26' });
    expect(en.betreff).toBe('Ends tomorrow: Residency');
    expect(en.text).toContain('ends tomorrow: 27 October 2026, 18:00.');

    const aufrufe: { url: string; methode: string; body: unknown }[] = [];
    const f = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const u = new URL(String(input));
      aufrufe.push({ url: u.pathname + u.search, methode: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : null });
      const j = (b: unknown) => new Response(JSON.stringify(b), { headers: { 'Content-Type': 'application/json' } });
      if (u.pathname === '/rest/v1/open_call_stand' && !init?.method) {
        return j([
          { person: 'p1', call_id: 'c1', stand: 'gemerkt', sprache: 'de', erinnert: [], open_calls: { titel: 'Förderung Sachsen', anbieter: 'Kulturstiftung', frist: '2026-11-02', uhrzeit: '23:59:00', link: 'https://kdfs.de', status: 'frei' } },
          { person: 'p2', call_id: 'c1', stand: 'arbeit', sprache: 'en', erinnert: ['7'], open_calls: { titel: 'Förderung Sachsen', anbieter: 'Kulturstiftung', frist: '2026-11-02', uhrzeit: '23:59:00', link: '', status: 'frei' } },
          { person: 'p3', call_id: 'c2', stand: 'gemerkt', sprache: 'en', erinnert: [], open_calls: { titel: 'Audition', anbieter: 'Kollektiv', frist: '2026-10-27', uhrzeit: '18:00:00', link: '', status: 'frei' } },
        ]);
      }
      if (u.pathname === '/auth/v1/admin/users') return j({ users: [{ id: 'p1', email: 'p1@example.org' }, { id: 'p2', email: 'p2@example.org' }, { id: 'p3', email: 'p3@example.org' }] });
      if (u.pathname === '/rest/v1/profiles') return j([{ id: 'p1', display_name: 'Lea' }, { id: 'p3', display_name: 'Tom' }]);
      return j([]);
    }) as typeof fetch;
    const s = server();
    const req = (auth: string) => new Request('https://fn.test/erinnerungen', { method: 'POST', headers: { Authorization: auth } });
    expect((await handle(req('Bearer falsch'), env, f, async () => s.leitung)).status).toBe(401);
    expect((await handle(req('Bearer service'), { ...env, smtp: { ...env.smtp, pass: '' } }, f, async () => s.leitung)).status).toBe(503);
    const res = await handle(req('Bearer service'), env, f, async () => s.leitung, JETZT);
    expect(await res.json()).toEqual({ verschickt: 2 });
    expect(s.befehle.filter((b) => b.startsWith('RCPT'))).toEqual(['RCPT TO:<p1@example.org>\r\n', 'RCPT TO:<p3@example.org>\r\n']);
    const mails = s.befehle.filter((b) => b.includes('Content-Transfer-Encoding')).map((d) => Buffer.from(d.split('\r\n\r\n')[1].replace(/\r\n\.\r\n$/, '').replace(/\r\n/g, ''), 'base64').toString('utf8'));
    expect(mails[0]).toContain('Hallo Lea,');
    expect(mails[0]).toContain('die Frist für „Förderung Sachsen“ (Kulturstiftung) endet in 7 Tagen: am 2. November 2026 um 23:59 Uhr.');
    expect(mails[0]).toContain('https://tanznetzdresden.de/intern/open-calls/#call-c1');
    expect(mails[1]).toContain('https://tanznetzdresden.de/en/intern/open-calls/#call-c2');
    const vermerkt = aufrufe.filter((a) => a.methode === 'PATCH');
    expect(vermerkt.map((a) => [a.url, a.body])).toEqual([
      ['/rest/v1/open_call_stand?person=eq.p1&call_id=eq.c1', { erinnert: ['7'] }],
      ['/rest/v1/open_call_stand?person=eq.p3&call_id=eq.c2', { erinnert: ['1', '7'] }],
    ]);
    // Adressen nur für Personen mit fälliger Erinnerung nachgeschlagen
    expect(aufrufe.find((a) => a.url.startsWith('/rest/v1/profiles'))!.url).toBe('/rest/v1/profiles?select=id,display_name&id=in.(p1,p3)');
  });
});
