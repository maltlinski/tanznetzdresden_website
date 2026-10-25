/**
 * KEEP UP (Entwurf „KEEP UP Intern“ und „KEEP UP Profitraining“): Planung im Kalender (Redaktion, Vorstand), „Meine Trainings“
 * und Editor für Dozent:innen, Beschreibung in der Tagesansicht der Profitrainings-Seite.
 * Supabase ist nachgebaut (tests/redaktion-mock.ts). Die Daten liegen in dieser Woche, damit sie immer zu sehen sind.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { redaktion } from './redaktion-mock';
import { montag, plusTage, status, inhalt, bereit, zeitNorm, kalenderwoche, type KeepUpTermin } from '../src/lib/keep-up-plan';

const heute = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
const mo = montag(heute);
const ALLE = [1, 2, 3, 4, 5, 6, 7];
const pub = (z: Record<string, unknown>) => ({ titel: '', kurz: '', text: '', schwerpunkte: [], mitbringen: '', bild: null, bild_alt: '', ...z });
const zeilen = () => [
  { id: 'k1', dozent: 'aurora-fradella', woche: mo, tage: ALLE, notiz: 'Bitte bis Freitag beschreiben.', ort: 'TENZA Schmiede' },
  { id: 'k2', dozent: 'charles-washington', woche: mo, tage: ALLE, art: 'workshop', zeit: '11:00–15:00', titel: 'Release', kurz: 'Gewicht abgeben.' },
  { id: 'k3', dozent: 'aurora-fradella', woche: plusTage(mo, 28), tage: [6], art: 'workshop', titel: 'Floor', kurz: 'Am Boden.', veroeffentlicht: pub({ titel: 'Floor', kurz: 'Am Boden.' }) },
  { id: 'k4', dozent: 'aurora-fradella', woche: plusTage(mo, -21), tage: [1, 2], titel: 'Spiralen', kurz: 'Rein und raus.', schwerpunkte: ['Floorwork'], mitbringen: 'Knieschoner' },
];
const vorstand = { display_name: 'Vera Vorstand', role: 'vorstand' };
const aurora = { display_name: 'Aurora Fradella', role: 'mitglied', slug: 'aurora-fradella', verified: true };
const nav = (page: Page) => page.getByRole('navigation', { name: 'Interner Bereich' });

test('Planung: Wochen mit Einplanungen, Hinweis auf fehlende Beschreibungen, Filter', async ({ page }) => {
  const m = await redaktion(page, { profil: vorstand, keepup: zeilen(), keepupKontakte: [{ dozent: 'aurora-fradella', name: 'Aurora Fradella', email: 'aurora@example.org' }] });
  // die alte Adresse der Planung führt in den Kalender
  await page.goto('/intern/keep-up/');
  await expect(page).toHaveURL(/\/intern\/kalender\/$/);
  await expect(nav(page).getByRole('link', { name: /^Kalender/ })).toHaveAttribute('aria-current', 'page');
  await expect(nav(page).getByRole('link', { name: /^Kalender/ })).toContainText('2');
  await expect(nav(page).getByRole('link', { name: /Meine Trainings/ })).toBeHidden();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kalender');

  // diese Woche: Aurora (ohne Beschreibung) und Charles (Entwurf)
  const woche = page.locator(`[data-woche="${mo}"]`);
  await expect(woche.locator('.pl-kw__nr')).toHaveText(`KW ${kalenderwoche(mo)}`);
  const ku = woche.locator('.pl-block:not(.pl-block--termin)');
  await expect(ku).toHaveCount(2);
  await expect(ku.first()).toContainText('Aurora Fradella');
  await expect(ku.first()).toContainText('Ohne Beschreibung');
  await expect(ku.nth(1)).toContainText('Entwurf');
  await expect(woche.locator('.pl-tag.is-heute')).toHaveCount(1);

  // Hinweis: zwei Termine ohne veröffentlichte Beschreibung; erinnern merkt sich das Datum
  await expect(page.locator('[data-erinnern-titel]')).toContainText('KEEP UP: 2 Trainings bis');
  await expect(page.locator('[data-erinnern-namen]')).toContainText('Aurora Fradella');
  await page.getByRole('button', { name: 'Alle erinnern' }).click();
  await expect(page.locator('[data-ku-toast]')).toContainText('Ohne Konto, bitte direkt erinnern: Charles Washington.');
  await expect.poll(() => m.keepupAenderungen.find((a) => a.methode === 'PATCH')?.body).toEqual({ erinnert_am: heute });
  await expect(page.getByRole('button', { name: 'Erneut erinnern' })).toHaveCount(0);

  // Filter: nur Entwürfe, die anderen werden blass
  await page.locator('.pl-chip', { hasText: 'Entwürfe' }).click();
  await expect(ku.first()).toHaveClass(/is-blass/);
  await expect(ku.nth(1)).not.toHaveClass(/is-blass/);
});

test('Planung: einplanen, Überschneidung, bearbeiten, löschen und rückgängig', async ({ page }) => {
  const m = await redaktion(page, { profil: vorstand, keepup: zeilen() });
  await page.goto('/intern/kalender/');
  await page.getByRole('button', { name: 'KEEP UP einplanen' }).click();
  // der Name des Dialogs ist die gewählte Person
  await expect(page.getByRole('dialog', { name: 'Wer unterrichtet?' })).toBeVisible();
  const dlg = page.locator('[data-schublade]');
  await expect(dlg.getByRole('button', { name: 'Einplanen' })).toBeDisabled();
  await dlg.getByRole('button', { name: /Laura Gary/ }).click();
  await expect(page.getByRole('dialog', { name: 'Laura Gary' })).toBeVisible();
  // Mo–Fr sind vorgewählt, Aurora trainiert schon die ganze Woche
  await expect(dlg.locator('[data-s-konflikt]')).toHaveText('Überschneidung: Aurora Fradella ist am Mo, Di, Mi, Do, Fr schon eingeplant.');
  await dlg.locator('[data-s-woche="7"]').click();
  await expect(dlg.locator('[data-s-konflikt]')).toBeHidden();
  await dlg.getByLabel('Notiz an die Dozent:in').fill('Raum 2');
  await dlg.getByRole('button', { name: 'Einplanen' }).click();
  await expect(dlg).toBeHidden();
  await expect(page.locator('[data-ku-toast]')).toContainText('Eingeplant. Laura Gary sieht den Termin jetzt und kann ihn beschreiben.');
  const neu = m.keepupAenderungen.find((a) => a.methode === 'POST')!.body;
  expect(neu).toEqual({ art: 'training', dozent: 'laura-gary', woche: plusTage(mo, 7), tage: [1, 2, 3, 4, 5], zeit: '10:00–11:30', ort: 'TENZA Schmiede', notiz: 'Raum 2' });

  // bestehende Einplanung: Workshop-Umschalter setzt Samstag und andere Zeit; dann löschen mit Rückfrage
  const ku = page.locator(`[data-woche="${mo}"] .pl-block:not(.pl-block--termin)`);
  await ku.first().click();
  const bearb = page.getByRole('dialog', { name: 'Aurora Fradella' });
  await expect(bearb.locator('[data-s-tag]')).toHaveText('KEEP UP bearbeiten');
  await expect(bearb.locator('[data-s-text]')).toHaveText('Noch nichts geschrieben.');
  await expect(bearb.getByRole('link', { name: 'Beschreibung öffnen →' })).toHaveAttribute('href', /beschreiben\/\?id=k1&von=plan$/);
  await bearb.getByRole('button', { name: 'Löschen' }).click();
  await bearb.getByRole('button', { name: 'Wirklich löschen?' }).click();
  await expect(bearb).toBeHidden();
  await expect(ku).toHaveCount(1);
  await page.locator('[data-ku-toast]').getByRole('button', { name: 'Rückgängig' }).click();
  await expect(ku).toHaveCount(2);
  expect(m.keepupAenderungen.map((a) => a.methode)).toEqual(['POST', 'DELETE', 'POST']);
});

test('Planung: nur für Redaktion und Vorstand, Hinweis ohne Migration', async ({ page }) => {
  await redaktion(page, { profil: aurora, keepup: zeilen(), keepupIch: 'aurora-fradella' });
  await page.goto('/intern/kalender/');
  await expect(page.locator('[data-msg]')).toContainText('Den Kalender pflegen Presse, Vorstand und Admin.');
  await expect(page.locator('[data-plan]')).toBeHidden();

  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await redaktion(page, { profil: vorstand });
  await page.goto('/intern/kalender/');
  await expect(page.locator('[data-msg]')).toContainText('20261025000000_keepup.sql');
  await expect(page.locator('[data-msg]')).toContainText('20261026000000_kalender.sql');
  await expect(page.getByRole('button', { name: 'Termin eintragen', exact: true })).toBeDisabled();
});

test('Meine Trainings: anstehend mit Notiz und Prüfliste, vergangen, ohne Zuordnung', async ({ page }) => {
  await redaktion(page, { profil: aurora, keepup: zeilen(), keepupIch: 'aurora-fradella' });
  await page.goto('/intern/keep-up/meine/');
  await expect(nav(page).getByRole('link', { name: /Meine Trainings/ })).toHaveAttribute('aria-current', 'page');
  await expect(nav(page).getByRole('link', { name: /^Kalender/ })).toBeHidden();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hallo Aurora.');
  await expect(page.locator('[data-todo-text]')).toHaveText('Ein Termin braucht noch eine Beschreibung.');
  const karten = page.locator('.mt-karte');
  await expect(karten).toHaveCount(2);
  await expect(karten.first()).toContainText('Bitte bis Freitag beschreiben.');
  await expect(karten.first().locator('.ku-check')).toHaveText(['Titel', 'Kurzbeschreibung', 'Bild (optional)']);
  await expect(karten.first().getByRole('link', { name: 'Beschreiben' })).toHaveAttribute('href', /beschreiben\/\?id=k1$/);
  await expect(karten.nth(1)).toContainText('Online');
  await expect(karten.nth(1).getByRole('link', { name: 'Bearbeiten' })).toBeVisible();
  await expect(page.locator('.mt-zeile')).toHaveCount(1);
  await expect(page.locator('.mt-zeile')).toContainText('Spiralen');

  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await redaktion(page, { profil: { display_name: 'Lea Sommer' }, keepup: zeilen(), keepupIch: null });
  await page.goto('/intern/keep-up/meine/');
  await expect(page.locator('[data-ohne]')).toContainText('Du bist noch für kein KEEP UP-Training eingeplant.');
  await expect(nav(page).getByRole('link', { name: /Meine Trainings/ })).toBeHidden();
});

test('Editor: schreiben speichert von selbst, Vorschau, Bild, veröffentlichen und offline nehmen', async ({ page, isMobile }) => {
  const m = await redaktion(page, { profil: aurora, keepup: zeilen(), keepupIch: 'aurora-fradella' });
  await page.goto('/intern/keep-up/beschreiben/?id=k1');
  await expect(page.locator('[data-was-name]')).toContainText('Aurora Fradella');
  await expect(page.locator('[data-notiz]')).toHaveText('Bitte bis Freitag beschreiben.');
  await expect(page.locator('[data-als-vorstand]')).toBeHidden();
  const veroeffentlichen = page.locator('[data-veroeffentlichen]');
  await expect(veroeffentlichen).toBeDisabled();
  await expect(page.locator('[data-pv-text]')).toContainText('Die Beschreibung zu diesem Training folgt.');

  // von einem früheren Training übernehmen und wieder zurück
  await page.getByRole('button', { name: /Spiralen/ }).click();
  await expect(page.getByPlaceholder('Worum geht es in dieser Woche?')).toHaveValue('Spiralen');
  await page.locator('[data-ku-toast]').getByRole('button', { name: 'Rückgängig' }).click();
  await expect(page.getByPlaceholder('Worum geht es in dieser Woche?')).toHaveValue('');

  await page.getByPlaceholder('Worum geht es in dieser Woche?').fill('Boden und Bögen');
  await page.getByPlaceholder(/Zwei, drei Sätze/).fill('Wir rollen, schieben und landen weich.');
  await page.getByPlaceholder(/Ablauf, Musik/).fill('Erst warm.\n\nDann Phrasen.');
  await page.getByRole('button', { name: 'Floorwork', exact: true }).click();
  await page.getByLabel('Eigenen Schwerpunkt hinzufügen').fill('Spiraldynamik');
  await page.getByLabel('Eigenen Schwerpunkt hinzufügen').press('Enter');
  await page.getByPlaceholder(/Knieschoner/).fill('Socken');
  await expect(page.locator('[data-kurz-zahl]')).toHaveText('38 / 240');
  await expect(page.locator('[data-speicher]')).toHaveText('Gespeichert');
  const letzte = () => m.keepupAenderungen.filter((a) => a.methode === 'PATCH').at(-1)?.body ?? {};
  expect(letzte()).toMatchObject({ titel: 'Boden und Bögen', kurz: 'Wir rollen, schieben und landen weich.', schwerpunkte: ['Floorwork', 'Spiraldynamik'], mitbringen: 'Socken' });

  // Vorschau wie auf der Website
  const pv = page.locator('.pv');
  await expect(pv.locator('.pv__titel')).toHaveText('Boden und Bögen');
  await expect(pv.locator('.pv__absatz')).toHaveText(['Erst warm.', 'Dann Phrasen.']);
  await expect(pv.locator('.pv__fokus span')).toHaveText(['Floorwork', 'Spiraldynamik']);
  await expect(pv.locator('.pv__bring')).toHaveText('MitbringenSocken');
  await expect(page.locator('.ed-pruef .is-ok')).toHaveCount(2);

  // Bild hochladen (Ordner der Dozent:in), dann eins aus der Mediathek
  await page.locator('[data-datei]').setInputFiles('src/assets/photos/sprung.jpg');
  await expect(page.locator('[data-bild]')).toBeVisible();
  expect(m.hochgeladen[0]).toMatch(/^aurora-fradella\/\w+\.jpg$/);
  await expect(page.locator('[data-pv-bild]')).toBeVisible();
  await page.getByRole('button', { name: 'Bild entfernen' }).click();
  await page.getByRole('button', { name: 'Aus Mediathek' }).click();
  await page.getByRole('dialog', { name: 'Bild wählen' }).getByRole('button', { name: 'Foto solo-blau.jpg wählen' }).click();
  await expect(page.locator('[data-bild-zahl]')).toHaveText('1 / 1');
  await page.getByLabel('Bildbeschreibung').fill('Tänzerin in Blau');
  await expect.poll(() => letzte()).toMatchObject({ bild: 'assets/photos/solo-blau.jpg', bild_alt: 'Tänzerin in Blau' });

  // veröffentlichen: übernimmt den Text und lässt die Website neu bauen
  await expect(veroeffentlichen).toBeEnabled();
  await veroeffentlichen.click();
  await expect(veroeffentlichen).toHaveText('Online');
  await expect(veroeffentlichen).toBeDisabled();
  await expect(page.locator('[data-status-badge]')).toHaveText('Online');
  await expect(page.locator('[data-ku-toast]')).toContainText('Online. Die Beschreibung steht jetzt im Kalender auf der Website.');
  await expect.poll(() => m.neubau).toBe(1);
  expect(m.keepup.find((z) => z.id === 'k1')!.veroeffentlicht).toMatchObject({ titel: 'Boden und Bögen', bild: 'assets/photos/solo-blau.jpg' });

  // weiter schreiben: Änderungen offen, dann offline nehmen
  await page.getByPlaceholder('Worum geht es in dieser Woche?').fill('Boden, Bögen, Bälle');
  await expect(page.locator('[data-status-badge]')).toHaveText('Änderungen offen');
  await expect(veroeffentlichen).toHaveText('Änderungen veröffentlichen');
  await page.getByRole('button', { name: 'Offline nehmen' }).click();
  await expect(page.locator('[data-status-badge]')).toHaveText('Entwurf');
  expect(m.keepup.find((z) => z.id === 'k1')!.veroeffentlicht).toBeNull();
  if (!isMobile) await expect(page.locator('.ed-vorschau')).toBeInViewport();
});

test('Editor: Vorstand bearbeitet fremde Beschreibung, unbekannte Einplanung', async ({ page }) => {
  await redaktion(page, { profil: vorstand, keepup: zeilen() });
  await page.goto('/intern/keep-up/beschreiben/?id=k2&von=plan');
  await expect(page.locator('[data-als-vorstand]')).toBeVisible();
  await expect(page.getByRole('link', { name: '← Kalender' })).toHaveAttribute('href', /\/intern\/kalender\/$/);
  await expect(page.locator('[data-status-badge]')).toHaveText('Entwurf');

  await page.goto('/intern/keep-up/beschreiben/?id=gibtsnicht');
  await expect(page.locator('[data-fehler]')).toContainText('Diese Einplanung gibt es nicht');
});

test('Profitraining: Tagesansicht zeigt die Beschreibung mit Bild, Pfeile springen von Termin zu Termin', async ({ page }) => {
  // Beschreibung in die Kalenderdaten der fertigen Seite schreiben (beim Build kommt sie aus Supabase)
  let tag = '';
  await page.route('**/profitraining/', async (route) => {
    const res = await route.fetch();
    const html = (await res.text()).replace(/(<script type="application\/json" data-kcal-data>)([\s\S]*?)(<\/script>)/, (_, a: string, json: string, c: string) => {
      const d = JSON.parse(json) as { days: Record<string, Record<string, unknown>[]> };
      tag = Object.keys(d.days).sort().find((k) => k >= heute && d.days[k].some((e) => e.beschreibung))!;
      const e = d.days[tag].find((x) => x.beschreibung)!;
      e.beschreibung = {
        titel: 'Boden und Bögen', kurz: 'Wir rollen und landen weich.', absaetze: ['Erst warm.', 'Dann Phrasen.'], schwerpunkte: ['Floorwork'],
        mitbringen: 'Socken', bild: { src: '/favicon.svg', alt: 'Tänzerin am Boden' }, folgt: '', bringLabel: 'Mitbringen',
      };
      return a + JSON.stringify(d).replace(/</g, '\\u003c') + c;
    });
    await route.fulfill({ response: res, body: html });
  });
  await page.goto('/profitraining/');
  const panel = page.locator('.kcal__panel');
  await panel.scrollIntoViewIfNeeded();
  await expect(page.locator(`.kcal__day[data-date="${tag}"]`)).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.locator('.kcal__titel')).toHaveText('Boden und Bögen');
  await expect(panel.locator('.kcal__kurz')).toHaveText('Wir rollen und landen weich.');
  await expect(panel.locator('.kcal__absatz')).toHaveText(['Erst warm.', 'Dann Phrasen.']);
  await expect(panel.locator('.kcal__fokus span')).toHaveText(['Floorwork']);
  await expect(panel.locator('.kcal__bring')).toHaveText('MitbringenSocken');
  await expect(panel.locator('.kcal__wer')).toHaveText(/ · /);
  await expect(panel.getByRole('img', { name: 'Tänzerin am Boden' })).toBeVisible();
  await expect(panel.getByRole('link', { name: 'Zur Dozent:in →' })).toBeVisible();

  // Pfeile: zum nächsten und wieder zurück; dort ohne Beschreibung nur der Name
  await panel.getByRole('button', { name: 'Nächster Termin' }).click();
  await expect(page.locator(`.kcal__day[data-date="${tag}"]`)).toHaveAttribute('aria-pressed', 'false');
  await expect(panel.locator('.kcal__titel')).toHaveCount(0);
  await expect(panel.locator('.kcal__text .kcal__who')).toHaveCount(1);
  await expect(panel.locator('[data-kcal-bild]')).toBeHidden();
  await panel.getByRole('button', { name: 'Vorheriger Termin' }).click();
  await expect(panel.locator('.kcal__titel')).toHaveText('Boden und Bögen');
});

test('Barrierefreiheit: Planung mit Schublade, Meine Trainings, Editor', async ({ page }) => {
  const pruefen = async () => {
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`);
  };
  await redaktion(page, { profil: { ...aurora, role: 'vorstand' }, keepup: zeilen(), keepupIch: 'aurora-fradella' });
  await page.goto('/intern/kalender/');
  await expect(page.locator('.pl-block').first()).toBeVisible();
  await page.waitForTimeout(1200);
  expect(await pruefen()).toEqual([]);
  await page.locator('.pl-block:not(.pl-block--termin)').first().click();
  await expect(page.locator('[data-schublade]')).toBeVisible();
  await page.waitForTimeout(800);
  expect(await pruefen()).toEqual([]);
  await page.goto('/intern/keep-up/meine/');
  await expect(page.locator('.mt-karte').first()).toBeVisible();
  await page.waitForTimeout(1000);
  expect(await pruefen()).toEqual([]);
  await page.goto('/intern/keep-up/beschreiben/?id=k4');
  await expect(page.locator('.pv__titel')).toHaveText('Spiralen');
  await page.waitForTimeout(800);
  expect(await pruefen()).toEqual([]);
});

test('Logik: Status, Veröffentlichen nur mit Titel und Kurzbeschreibung, Zeitangaben', async ({}, info) => {
  test.skip(info.project.name !== 'desktop', 'ohne Browser, einmal reicht');
  const t = (z: Partial<KeepUpTermin>) => ({ ...inhalt(pub({}) as unknown as KeepUpTermin), veroeffentlicht: null, ...z }) as unknown as KeepUpTermin;
  expect(status(t({}))).toBe('offen');
  expect(status(t({ mitbringen: 'Socken' }))).toBe('entwurf');
  expect(status(t({ titel: 'A', kurz: 'B', veroeffentlicht: pub({ titel: 'A', kurz: 'B' }) }))).toBe('online');
  expect(status(t({ titel: 'A2', kurz: 'B', veroeffentlicht: pub({ titel: 'A', kurz: 'B' }) }))).toBe('geaendert');
  expect(bereit(t({ titel: 'A', kurz: '' }))).toBe(false);
  expect(bereit(t({ titel: 'A', kurz: 'x'.repeat(241) }))).toBe(false);
  expect(bereit(t({ titel: 'A', kurz: 'x'.repeat(240) }))).toBe(true);
  expect(zeitNorm('10:00 - 11:30')).toBe('10:00–11:30');
  expect(montag('2026-11-01')).toBe('2026-10-26');
  expect(kalenderwoche('2026-10-26')).toBe(44);
  expect(kalenderwoche('2027-01-01')).toBe(53);
});
