/**
 * Intern → Open Calls im Browser (views/intern/OpenCallsView.astro, Entwurf design/entwuerfe/2026-10-open-calls/).
 *
 *  - Ansichten: Aktuell (mit Zeitleiste der nächsten 12 Wochen), Gemerkt, Meine Bewerbungen (Spalten nach Stand),
 *    Archiv (Frist vorbei) und für die Redaktion „Zu prüfen“.
 *  - Je Call: merken, Stand setzen, Unterlagen abhaken, Erinnerung per Mail (wenn eingerichtet), Kalenderdatei,
 *    „Aus dem Netzwerk“ (mitmachen, Erfahrungen teilen).
 *  - Mitglieder melden Calls zur Prüfung; die Redaktion trägt ein, bearbeitet, gibt frei oder lehnt ab.
 * Rechte prüft die Datenbank (supabase/migrations/20261027000000_open_calls.sql), Logik in src/lib/open-calls.ts.
 */
import { initIntern, errorText, showMessage } from './session';
import { h } from './news/dom';
import { sprache, t } from './sprache';
import { badge, initialen, toast } from './keep-up';
import { gsap, EASE, motionOk } from '../gsap';
import { photoUrl } from '../../lib/supabase';
import {
  ARTEN, REICHWEITEN, STAENDE, SPALTEN, FILTER_LEER, abgelaufen, datumKurz, datumLang, datumMittel, fristenIcs, jetztDresden,
  monatKurz, monatName, nachFrist, neuesteZuerst, passt, restText, tageBis, ton, uhr, zeitleiste,
  type Art, type Filter, type Netz, type OpenCall, type Reichweite, type Stand, type StandId,
} from '../../lib/open-calls';

/** ab so vielen Tagen vor der Frist: magenta und Hinweis oben */
const DRINGEND = 7;

const ctx = await initIntern(true);
const $ = <T extends HTMLElement = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector<T>(s)!;
const root = $('[data-oc]');
const msg = $('[data-msg]');
const erinnerungenAn = root.dataset.erinnerungen === 'an';
const netzwerkUrl = root.dataset.netzwerk ?? '/netzwerk/';
const wort = (w: { de: string; en: string }) => w[sprache];

/**
 * Meldung unten links. Ist eine Schublade offen, erscheint sie darin (sonst läge sie unter dem Abdunkeln);
 * dort = root, wenn die Schublade gerade zugeht.
 */
function melde(text: string, dort?: HTMLElement) {
  const el = document.querySelector<HTMLElement>('[data-ku-toast]');
  if (el) (dort ?? document.querySelector<HTMLElement>('dialog[open]') ?? root).append(el);
  toast(text);
}
/** Fehler: oben auf der Seite, bei offener Schublade unten links */
const meldung = (text: string) => (document.querySelector('dialog[open]') ? melde(text) : showMessage(msg, text));

const FEHLT = t(
  'Open Calls gibt es, sobald die Migration supabase/migrations/20261027000000_open_calls.sql im SQL-Editor ausgeführt ist (docs/open-calls.md).',
  'Open calls are not set up yet. Please ask the board to run the database migration (docs/open-calls.md).',
);
const tabelleFehlt = (e: { message?: string; code?: string }) => /open_call|does not exist|schema cache|PGRST20[05]|42P01/i.test(`${e.message ?? ''} ${e.code ?? ''}`);

interface Person { name: string; slug: string | null; verified: boolean; photo_path: string | null }
let calls: OpenCall[] = [];
const staende = new Map<string, Stand>();
let netz: Netz[] = [];
const leute = new Map<string, Person>();
type Tab = 'aktuell' | 'gemerkt' | 'bewerbungen' | 'archiv' | 'pruefen';
let tab: Tab = 'aktuell';
let filter: Filter = { ...FILTER_LEER };
let sortierung: 'frist' | 'neu' = 'frist';
let offen: string | null = null;
const bewegung = motionOk();

const istFrei = (c: OpenCall) => c.status === 'frei';
const istMeins = (c: OpenCall) => !!ctx && c.gemeldet_von === ctx.user.id;
const standDaten = (c: OpenCall) => staende.get(c.id);
const standVon = (c: OpenCall) => standDaten(c)?.stand ?? null;
const nameVon = (id: string | null) => (id && leute.get(id)?.name) || t('einem Mitglied', 'a member');
const seiteUrl = (c: OpenCall) => `${location.origin}${location.pathname}#call-${c.id}`;
const uhrText = (c: OpenCall) => (sprache === 'en' ? uhr(c.uhrzeit) : `${uhr(c.uhrzeit)} Uhr`);

async function start() {
  $('[data-oc-melden]').textContent = ctx!.isRedaktion ? t('Call eintragen', 'Add a call') : t('Call melden', 'Report a call');
  const ok = await laden();
  $('[data-oc-laden]').hidden = true;
  if (!ok) return;
  $('[data-oc-bereich]').hidden = false;
  statischeFilter();
  zeichnen(true);
  // geteilter Link: #call-<id> öffnet den Call (auch, wenn die Seite schon offen ist)
  const ausAdresse = () => {
    const m = /^#call-(.+)$/.exec(location.hash);
    if (m && m[1] !== offen && calls.some((c) => c.id === m[1])) oeffnen(m[1]);
  };
  ausAdresse();
  addEventListener('hashchange', ausAdresse);
}

async function laden(): Promise<boolean> {
  const sb = ctx!.sb;
  const [a, b, c] = await Promise.all([
    sb.from('open_calls').select(SPALTEN).order('frist'),
    sb.from('open_call_stand').select('call_id,stand,unterlagen,erinnerung,sprache,erinnert'),
    sb.from('open_call_netz').select('call_id,person,art'),
  ]);
  if (a.error) {
    meldung(tabelleFehlt(a.error) ? FEHLT : errorText(a.error));
    return false;
  }
  calls = (a.data ?? []) as unknown as OpenCall[];
  staende.clear();
  for (const s of (b.data ?? []) as Stand[]) staende.set(s.call_id, s);
  netz = (c.data ?? []) as Netz[];
  await leuteLaden();
  return true;
}

/** Namen (und Profiladresse) der Personen, die gemeldet haben oder im Netzwerk stehen */
async function leuteLaden() {
  const ids = [...new Set([...netz.map((n) => n.person), ...calls.map((c) => c.gemeldet_von)].filter((x): x is string => !!x && !leute.has(x)))];
  if (!ids.length) return;
  const { data } = await ctx!.sb.from('profiles').select('id,display_name,slug,verified,photo_path').in('id', ids);
  for (const p of (data ?? []) as { id: string; display_name: string; slug: string | null; verified: boolean; photo_path: string | null }[]) {
    leute.set(p.id, { name: p.display_name || t('Ohne Namen', 'No name'), slug: p.slug, verified: p.verified, photo_path: p.photo_path });
  }
}

// ---------- Gruppen ----------
function gruppen() {
  const j = jetztDresden();
  const frei = calls.filter(istFrei);
  const laufend = frei.filter((c) => !abgelaufen(c, j));
  const archiv = frei.filter((c) => abgelaufen(c, j)).sort((a, b) => nachFrist(b, a));
  const zuPruefen = calls.filter((c) => !istFrei(c));
  const meineMeldungen = zuPruefen.filter(istMeins);
  const gemerkt = laufend.filter((c) => standVon(c));
  const bewerbungen = frei.filter((c) => ['arbeit', 'eingereicht', 'zusage', 'absage'].includes(standVon(c) ?? ''));
  return { j, laufend, archiv, zuPruefen, meineMeldungen, gemerkt, bewerbungen };
}
type Gruppen = ReturnType<typeof gruppen>;

function basis(g: Gruppen): OpenCall[] {
  if (tab === 'gemerkt') return g.gemerkt;
  if (tab === 'archiv') return g.archiv;
  if (tab === 'pruefen') return g.zuPruefen;
  // eigene Meldungen stehen bis zur Freigabe mit „In Prüfung“ dabei (die Redaktion sieht sie unter „Zu prüfen“)
  return ctx!.isRedaktion ? g.laufend : [...g.laufend, ...g.meineMeldungen];
}

// ---------- Zeichnen ----------
function zeichnen(auftritt = false) {
  // Fokus behalten, wenn das fokussierte Element neu gezeichnet wird
  const fokus = (document.activeElement as HTMLElement | null)?.dataset?.fokus;
  const g = gruppen();
  baender(g);
  zeitleisteZeichnen(g);
  tabsZeichnen(g);
  const board = tab === 'bewerbungen';
  $('[data-oc-suche]').hidden = board;
  $('[data-oc-filter]').hidden = board;
  $('[data-oc-liste]').hidden = board;
  $('[data-oc-board]').hidden = !board;
  if (board) boardZeichnen(g);
  else listeZeichnen(g);
  if (offen) detailZeichnen();
  if (fokus && (document.activeElement === document.body || !document.activeElement?.isConnected)) {
    document.querySelector<HTMLElement>(`[data-fokus="${CSS.escape(fokus)}"]`)?.focus();
  }
  if (auftritt && bewegung) {
    gsap.from('[data-oc-liste] > *, [data-oc-zeit]', { y: 18, opacity: 0, duration: 0.6, ease: EASE, stagger: 0.03, clearProps: 'transform,opacity' });
  }
}

function baender(g: Gruppen) {
  const pruefen = $('[data-oc-pruefen]');
  const n = g.zuPruefen.length;
  pruefen.hidden = !ctx!.isRedaktion || !n || tab === 'pruefen';
  if (!pruefen.hidden) {
    $('[data-oc-pruefen-titel]').textContent = n === 1
      ? t('Ein gemeldeter Call wartet auf Prüfung.', 'One reported call is waiting for review.')
      : t(`${n} gemeldete Calls warten auf Prüfung.`, `${n} reported calls are waiting for review.`);
    $('[data-oc-pruefen-namen]').textContent = g.zuPruefen.map((c) => `${c.titel} (${t('von', 'by')} ${nameVon(c.gemeldet_von)})`).join(' · ');
    const b = $<HTMLButtonElement>('[data-oc-pruefen-knopf]');
    b.textContent = t('Prüfen', 'Review');
    b.onclick = () => { tab = 'pruefen'; zeichnen(); };
  }

  const dringend = g.laufend
    .filter((c) => ['gemerkt', 'arbeit'].includes(standVon(c) ?? '') && tageBis(c.frist, g.j.datum) <= DRINGEND)
    .sort(nachFrist);
  const box = $('[data-oc-dringend]');
  box.hidden = !dringend.length;
  if (!dringend.length) return;
  const erste = dringend[0];
  const tage = tageBis(erste.frist, g.j.datum);
  $('[data-oc-dringend-titel]').textContent = dringend.length === 1
    ? tage === 0 ? t('Eine deiner Fristen läuft heute ab.', 'One of your deadlines ends today.')
      : tage === 1 ? t('Eine deiner Fristen läuft morgen ab.', 'One of your deadlines ends tomorrow.')
        : t(`Eine deiner Fristen läuft in ${tage} Tagen ab.`, `One of your deadlines ends in ${tage} days.`)
    : t(`${dringend.length} deiner Fristen laufen in den nächsten ${DRINGEND} Tagen ab.`, `${dringend.length} of your deadlines end in the next ${DRINGEND} days.`);
  $('[data-oc-dringend-namen]').textContent = dringend.map((c) => `${c.titel} (${datumKurz(c.frist, sprache)})`).join(' · ');
  const b = $<HTMLButtonElement>('[data-oc-dringend-knopf]');
  b.textContent = t('Nächste öffnen', 'Open next');
  b.onclick = () => oeffnen(erste.id);
}

function zeitleisteZeichnen(g: Gruppen) {
  const box = $('[data-oc-zeit]');
  box.hidden = tab !== 'aktuell' || !g.laufend.length;
  if (box.hidden) return;
  const z = zeitleiste(g.laufend, g.j.datum);
  $('[data-oc-spaeter]').textContent = z.spaeter ? t(`+ ${z.spaeter} später`, `+ ${z.spaeter} later`) : '';
  $('[data-oc-bahn]').replaceChildren(
    h('div', { class: 'oc-zeit__linie', 'aria-hidden': 'true' }),
    ...z.monate.map((m) => h('div', { class: 'oc-zeit__monat', 'aria-hidden': 'true', style: `left:${m.x.toFixed(2)}%`, text: monatName(m.monat, sprache) })),
    h('div', { class: 'oc-zeit__heute', 'aria-hidden': 'true' }),
    h('span', { class: 'oc-zeit__heute-t', 'aria-hidden': 'true', text: t('Heute', 'Today') }),
    ...z.marken.map(({ call: c, x, reihe }) => {
      const versatz = x < 3 ? ' + 14px' : x > 97 ? ' - 14px' : '';
      const tip = `${restText(c, sprache, g.j)}: ${c.titel}`;
      return h('button', {
        type: 'button', class: `oc-marke oc-ton--${ton(c, g.j, DRINGEND)}`, style: `left:calc(${x.toFixed(2)}%${versatz});top:${reihe * 22}px`,
        title: tip, 'aria-label': `${datumLang(c.frist, sprache)}, ${tip}`, 'data-fokus': `marke-${c.id}`, onclick: () => oeffnen(c.id),
      },
      h('span', { class: 'oc-marke__tag', text: datumKurz(c.frist, sprache) }),
      h('span', { class: 'oc-marke__stiel', style: `height:${72 - reihe * 22 - 18}px` }));
    }),
  );
}

function tabsZeichnen(g: Gruppen) {
  const tabs: [Tab, string, number][] = [
    ['aktuell', t('Aktuell', 'Current'), g.laufend.length],
    ['gemerkt', t('Gemerkt', 'Saved'), g.gemerkt.length],
    ['bewerbungen', t('Meine Bewerbungen', 'My applications'), g.bewerbungen.length],
    ['archiv', t('Archiv', 'Archive'), g.archiv.length],
    ...(ctx!.isRedaktion ? [['pruefen', t('Zu prüfen', 'To review'), g.zuPruefen.length] as [Tab, string, number]] : []),
  ];
  $('[data-oc-tabs]').replaceChildren(
    ...tabs.map(([id, label, n]) =>
      h('button', { type: 'button', 'aria-pressed': String(tab === id), 'data-fokus': `tab-${id}`, onclick: () => { tab = id; zeichnen(); } },
        label, h('span', { class: 'oc-zahl', text: String(n) })),
    ),
  );
}

/** Reichweite und Eigenschaften (ohne Zahlen): einmal anlegen */
function statischeFilter() {
  const seg = $('[data-oc-reichweiten]');
  const reichweiten: [Reichweite | 'alle', string][] = [['alle', t('Überall', 'Anywhere')], ...Object.entries(REICHWEITEN).map(([k, v]) => [k as Reichweite, wort(v)] as [Reichweite, string])];
  seg.replaceChildren(
    ...reichweiten.map(([id, label]) =>
      h('button', { type: 'button', 'aria-pressed': String(filter.reichweite === id), 'data-reichweite': id, onclick: () => { filter.reichweite = id; zeichnen(); } }, label),
    ),
  );
  const flags: [keyof Pick<Filter, 'honoriert' | 'englisch' | 'netzwerk'>, string][] = [
    ['honoriert', t('Honoriert', 'Paid')], ['englisch', t('Auch auf Englisch', 'Also in English')], ['netzwerk', t('Aus dem Netzwerk', 'From the network')],
  ];
  $('[data-oc-flags]').replaceChildren(
    ...flags.map(([k, label]) =>
      h('label', { class: 'oc-check oc-check--klein' },
        h('input', { type: 'checkbox', 'data-flag': k, onchange: (e: Event) => { filter[k] = (e.target as HTMLInputElement).checked; zeichnen(); } }),
        h('span', { text: label })),
    ),
  );
  const q = $<HTMLInputElement>('[data-oc-q]');
  q.addEventListener('input', () => { filter.suche = q.value; zeichnen(); });
  const sort = $<HTMLSelectElement>('[data-oc-sort]');
  sort.addEventListener('change', () => { sortierung = sort.value === 'neu' ? 'neu' : 'frist'; zeichnen(); });
}

function filterZuruecksetzen() {
  filter = { ...FILTER_LEER };
  $<HTMLInputElement>('[data-oc-q]').value = '';
  root.querySelectorAll<HTMLInputElement>('[data-flag]').forEach((i) => (i.checked = false));
  zeichnen();
}

function listeZeichnen(g: Gruppen) {
  const base = basis(g);
  root.querySelectorAll<HTMLButtonElement>('[data-reichweite]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.reichweite === filter.reichweite)));
  const arten: [Art | 'alle', string][] = [['alle', t('Alle', 'All')], ...Object.entries(ARTEN).map(([k, v]) => [k as Art, wort(v)] as [Art, string])];
  $('[data-oc-arten]').replaceChildren(
    ...arten.map(([id, label]) => {
      const n = id === 'alle' ? base.length : base.filter((c) => c.art === id).length;
      return h('button', {
        type: 'button', class: n ? '' : 'is-leer', 'aria-pressed': String(filter.art === id), 'data-fokus': `art-${id}`,
        onclick: () => { filter.art = id; zeichnen(); },
      }, h('span', { class: 'oc-mk', 'data-art': id, 'aria-hidden': 'true' }), label, h('span', { class: 'oc-zahl', text: String(n) }));
    }),
  );
  const liste = base.filter((c) => passt(c, filter)).sort(tab === 'archiv' && sortierung === 'frist' ? (a, b) => nachFrist(b, a) : sortierung === 'neu' ? neuesteZuerst : nachFrist);
  const el = $('[data-oc-liste]');
  if (!liste.length) {
    const leer = tab === 'gemerkt' && !base.length ? t('Noch nichts gemerkt.', 'Nothing saved yet.')
      : tab === 'archiv' && !base.length ? t('Das Archiv ist leer.', 'The archive is empty.')
        : tab === 'pruefen' && !base.length ? t('Gerade wartet nichts auf Prüfung.', 'Nothing is waiting for review.')
          : !base.length ? t('Gerade gibt es keine Open Calls. Melde einen, wenn du von einem weißt.', 'There are no open calls right now. Report one if you know of one.')
            : t('Kein Call passt zu diesen Filtern.', 'No call matches these filters.');
    el.replaceChildren(h('div', { class: 'oc-leer' },
      h('span', { class: 'oc-leer__t', text: leer }),
      base.length ? h('button', { type: 'button', class: 'ku-linie', onclick: filterZuruecksetzen }, t('Filter zurücksetzen', 'Reset filters')) : null));
    return;
  }
  el.replaceChildren(...liste.map((c) => zeile(c, g)));
}

function meta(c: OpenCall) {
  return h('span', { class: 'oc-meta' },
    h('span', { class: 'oc-meta__art' }, h('span', { class: 'oc-mk', 'data-art': c.art, 'aria-hidden': 'true' }), wort(ARTEN[c.art])),
    h('span', { text: wort(REICHWEITEN[c.reichweite]) }),
    ...flagsVon(c).map(([cls, text]) => h('span', { class: `oc-flag ${cls}`, text })));
}

function flagsVon(c: OpenCall): [string, string][] {
  const f: [string, string][] = [];
  if (!istFrei(c)) f.push(['', t('In Prüfung', 'Under review')]);
  if (c.vom_netzwerk) f.push(['oc-flag--netzwerk', t('Vom Netzwerk', 'By the network')]);
  else if (c.gemeldet_von) f.push(['oc-flag--mitglied', t('Von Mitglied', 'From a member')]);
  if (c.wiederkehrend) f.push(['oc-flag--wieder', t('Wiederkehrend', 'Recurring')]);
  if (erinnerungenAn && istFrei(c) && standDaten(c)?.erinnerung) f.push(['oc-flag--erinnerung', t('Erinnerung an', 'Reminder on')]);
  return f;
}

function zeile(c: OpenCall, g: Gruppen) {
  const vorbei = abgelaufen(c, g.j);
  const st = STAENDE.find((x) => x.id === standVon(c));
  const rest = restText(c, sprache, g.j);
  const auf = h('button', { type: 'button', class: 'oc-zeile__auf', 'data-fokus': `auf-${c.id}`, onclick: () => oeffnen(c.id) },
    h('span', { class: `oc-datum oc-ton--${ton(c, g.j, DRINGEND)}`, 'aria-hidden': 'true' },
      h('span', { class: 'oc-datum__mon', text: monatKurz(c.frist, sprache) }),
      h('span', { class: 'oc-datum__tag', text: String(Number(c.frist.slice(8))) }),
      h('span', { class: 'oc-datum__rest', text: rest })),
    h('span', { class: 'oc-zeile__text' },
      meta(c),
      h('span', { class: 'oc-zeile__titel', text: c.titel }),
      h('span', { class: 'oc-zeile__org', text: [c.anbieter, c.leistung, c.ort].filter(Boolean).join(' · ') }),
      h('span', { class: 'visually-hidden', text: `${t('Frist', 'Deadline')}: ${datumLang(c.frist, sprache)}, ${uhrText(c)}. ${rest}.` })));
  const rechts = h('div', { class: 'oc-zeile__rechts' });
  if (st && st.id !== 'gemerkt') rechts.append(badge(wort(st), st.badge));
  if (!vorbei && istFrei(c)) rechts.append(merkenKnopf(c));
  return h('div', { class: `oc-zeile${vorbei ? ' is-vorbei' : ''}`, 'data-call': c.id }, auf, rechts);
}

function merkenKnopf(c: OpenCall) {
  const an = !!standVon(c);
  const label = an ? t('Gemerkt', 'Saved') : t('Merken', 'Save');
  return h('button', {
    type: 'button', class: `oc-merken${an ? ' is-an' : ''}`, 'aria-pressed': String(an), 'aria-label': `${label}: ${c.titel}`, 'data-fokus': `merken-${c.id}`,
    onclick: () => merken(c),
  }, h('span', { class: 'oc-mk', 'aria-hidden': 'true' }), label);
}

async function merken(c: OpenCall) {
  const an = !!standVon(c);
  if (await standSetzen(c, { stand: an ? null : 'gemerkt' })) {
    melde(an ? t('Aus der Merkliste entfernt.', 'Removed from your saved calls.') : t('Gemerkt. Du findest den Call unter „Gemerkt“.', 'Saved. You will find the call under “Saved”.'));
  }
}

function boardZeichnen(g: Gruppen) {
  $('[data-oc-board]').replaceChildren(
    ...STAENDE.slice(1).map((st) => {
      const karten = g.bewerbungen.filter((c) => standVon(c) === st.id).sort(nachFrist).map((c) => {
        const vorbei = abgelaufen(c, g.j);
        const s = standDaten(c);
        const fertig = (s?.unterlagen ?? []).filter(Boolean).length;
        const alle = c.unterlagen.length;
        return h('button', { type: 'button', class: 'oc-karte', 'data-fokus': `karte-${c.id}`, onclick: () => oeffnen(c.id) },
          h('span', { class: 'oc-meta' }, h('span', { class: 'oc-meta__art' }, h('span', { class: 'oc-mk', 'data-art': c.art, 'aria-hidden': 'true' }), wort(ARTEN[c.art]))),
          h('span', { class: 'oc-karte__titel', text: c.titel }),
          h('span', {
            class: `oc-karte__rest${!vorbei && tageBis(c.frist, g.j.datum) <= DRINGEND ? ' is-bald' : ''}`,
            text: vorbei ? t(`Frist war ${datumMittel(c.frist, sprache)}`, `Deadline was ${datumMittel(c.frist, sprache)}`) : `${restText(c, sprache, g.j)} · ${datumMittel(c.frist, sprache)}`,
          }),
          st.id === 'arbeit' && alle
            ? h('span', { class: 'oc-karte__docs' },
              h('span', { class: 'oc-balken', 'aria-hidden': 'true' }, h('span', { style: `width:${Math.round((fertig / alle) * 100)}%` })),
              h('span', { text: `${fertig}/${alle}`, 'aria-label': t(`${fertig} von ${alle} Unterlagen erledigt`, `${fertig} of ${alle} documents done`) }))
            : null);
      });
      return h('section', { class: `oc-spalte oc-spalte--${st.id}`, 'aria-labelledby': `oc-sp-${st.id}` },
        h('div', { class: 'oc-spalte__kopf' }, h('h2', { class: 'oc-spalte__name', id: `oc-sp-${st.id}`, text: wort(st) }), h('span', { class: 'oc-spalte__zahl', text: String(karten.length) })),
        ...(karten.length ? karten : [h('div', { class: 'oc-spalte__leer', text: t('Noch nichts hier', 'Nothing here yet') })]));
    }),
  );
}

// ---------- Eigener Stand ----------
async function standSetzen(c: OpenCall, patch: Partial<Stand>): Promise<boolean> {
  const alt = staende.get(c.id);
  const neu: Stand = { call_id: c.id, stand: null, unterlagen: [], erinnerung: false, sprache, erinnert: [], ...alt, ...patch };
  if (patch.erinnerung) neu.sprache = sprache;
  staende.set(c.id, neu);
  zeichnen();
  const { error } = await ctx!.sb.from('open_call_stand').upsert(
    { person: ctx!.user.id, call_id: c.id, stand: neu.stand, unterlagen: neu.unterlagen, erinnerung: neu.erinnerung, sprache: neu.sprache },
    { onConflict: 'person,call_id' },
  );
  if (error) {
    if (alt) staende.set(c.id, alt);
    else staende.delete(c.id);
    zeichnen();
    meldung(errorText(error));
    return false;
  }
  return true;
}

async function netzSetzen(c: OpenCall, art: Netz['art'], an: boolean) {
  const sb = ctx!.sb;
  const ich = ctx!.user.id;
  const vorher = netz;
  netz = an ? [...netz, { call_id: c.id, person: ich, art }] : netz.filter((n) => !(n.call_id === c.id && n.person === ich && n.art === art));
  if (an && !leute.has(ich)) leute.set(ich, { name: ctx!.profile?.display_name || t('Du', 'You'), slug: ctx!.profile?.slug ?? null, verified: !!ctx!.profile?.verified, photo_path: ctx!.profile?.photo_path ?? null });
  zeichnen();
  const { error } = an
    ? await sb.from('open_call_netz').insert({ call_id: c.id, person: ich, art })
    : await sb.from('open_call_netz').delete().eq('call_id', c.id).eq('person', ich).eq('art', art);
  if (error) {
    netz = vorher;
    zeichnen();
    return meldung(errorText(error));
  }
  if (an) melde(art === 'mitmachen' ? t('Dein Interesse ist für andere Mitglieder sichtbar.', 'Other members can now see that you are interested.') : t('Andere Mitglieder sehen jetzt, dass sie dich fragen können.', 'Other members can now see that they can ask you.'));
}

// ---------- Detail ----------
const dlg = $<HTMLDialogElement>('[data-oc-detail]');
const panel = $('[data-oc-panel]');

function oeffnen(id: string) {
  offen = id;
  detailZeichnen();
  if (!dlg.open) {
    dlg.showModal();
    if (bewegung) gsap.fromTo(panel, { xPercent: 100 }, { xPercent: 0, duration: 0.6, ease: EASE });
  }
  history.replaceState(null, '', `#call-${id}`);
  $('[data-fokus="zu"]', panel).focus();
}
function detailSchliessen() {
  if (!dlg.open) return;
  offen = null;
  history.replaceState(null, '', location.pathname + location.search);
  if (!bewegung) return dlg.close();
  gsap.to(panel, { xPercent: 100, duration: 0.3, ease: 'power3.in', onComplete: () => { dlg.close(); gsap.set(panel, { clearProps: 'transform' }); } });
}
dlg.addEventListener('cancel', (e) => { e.preventDefault(); detailSchliessen(); });
dlg.addEventListener('click', (e) => { if (e.target === dlg) detailSchliessen(); });

function person(id: string) {
  const p = leute.get(id);
  const name = p?.name ?? t('Mitglied', 'Member');
  const foto = photoUrl(p?.photo_path ?? null);
  const avatar = h('span', { class: 'ku-avatar', 'aria-hidden': 'true' }, foto ? h('img', { src: foto, alt: '' }) : initialen(name));
  if (p?.verified && p.slug) return h('a', { class: 'oc-person', href: `${netzwerkUrl}${p.slug}/`, target: '_blank', rel: 'noopener' }, avatar, name);
  return h('span', { class: 'oc-person' }, avatar, name);
}

function detailZeichnen() {
  const c = calls.find((x) => x.id === offen);
  if (!c) return;
  const j = jetztDresden();
  const s = standDaten(c);
  const vorbei = abgelaufen(c, j);
  const frei = istFrei(c);
  const extra = [c.start ? t(`Antragstellung ab ${datumMittel(c.start, 'de')}.`, `Applications from ${datumMittel(c.start, 'en')}.`) : '', c.wiederkehrend].filter(Boolean).join(' ');

  const kopf = h('div', { class: 'oc-schublade__kopf' },
    h('div', {}, meta(c), h('h2', { id: 'oc-d-titel', class: 'oc-schublade__h', text: c.titel }), h('span', { class: 'oc-schublade__org', text: c.anbieter })),
    h('button', { type: 'button', class: 'oc-zu', 'aria-label': t('Schließen', 'Close'), 'data-fokus': 'zu', onclick: detailSchliessen }, '×'));

  const teile: (Node | null)[] = [];
  teile.push(h('div', { class: `oc-frist oc-ton--${ton(c, j, DRINGEND)}` },
    h('span', { class: 'oc-frist__l', text: vorbei ? t('Abgelaufen', 'Closed') : t('Bewerbungsfrist', 'Deadline') }),
    h('div', { class: 'oc-frist__zeile' },
      h('span', { class: 'oc-frist__wann', text: `${datumLang(c.frist, sprache)} · ${uhrText(c)}` }),
      h('span', { class: 'oc-frist__rest', text: restText(c, sprache, j) })),
    extra ? h('span', { class: 'oc-frist__extra', text: extra }) : null));

  teile.push(h('div', { class: 'oc-aktionen' },
    c.link ? h('a', { class: 'btn btn--primary btn--marker', href: c.link, target: '_blank', rel: 'noopener', 'data-fokus': 'link' }, t('Zur Ausschreibung ↗', 'Open the call ↗')) : null,
    !vorbei ? h('button', { type: 'button', class: 'ku-linie', 'data-fokus': 'ics', onclick: () => { herunterladen([c], `frist-${c.id.slice(0, 8)}.ics`); melde(t('Kalendereintrag mit Erinnerungen heruntergeladen.', 'Calendar entry with reminders downloaded.')); } }, t('In Kalender ↓', 'Add to calendar ↓')) : null,
    frei ? h('button', { type: 'button', class: 'ku-linie', 'data-fokus': 'teilen', onclick: () => linkKopieren(c) }, t('Link kopieren', 'Copy link')) : null));

  if (frei) {
    const mein = h('div', { class: 'oc-block' },
      h('p', { class: 'oc-block__l', id: 'oc-d-stand', text: t('Mein Stand', 'My status') }),
      h('div', { class: 'oc-schritte', role: 'group', 'aria-labelledby': 'oc-d-stand' },
        ...STAENDE.map((st) => h('button', {
          type: 'button', 'aria-pressed': String(s?.stand === st.id), 'data-fokus': `stand-${st.id}`,
          onclick: () => void standSetzen(c, { stand: s?.stand === st.id ? null : (st.id as StandId) }),
        }, wort(st)))));
    if (erinnerungenAn && !vorbei) {
      mein.append(h('label', { class: 'oc-check' },
        h('input', {
          type: 'checkbox', checked: !!s?.erinnerung, 'data-fokus': 'erinnerung',
          onchange: async (e: Event) => {
            const an = (e.target as HTMLInputElement).checked;
            if (await standSetzen(c, { erinnerung: an, stand: s?.stand ?? 'gemerkt' })) {
              melde(an ? t('Erinnerung an. Du bekommst 7 Tage und 1 Tag vorher eine Mail.', 'Reminder on. You will get an email 7 days and 1 day before.') : t('Erinnerung aus.', 'Reminder off.'));
            }
          },
        }),
        h('span', { text: t('Erinnere mich 7 Tage und 1 Tag vor der Frist per Mail', 'Remind me by email 7 days and 1 day before the deadline') })));
    }
    teile.push(mein);
  }

  const fakten: [string, string][] = ([
    [t('Leistung', 'Funding'), c.leistung], [t('Zeitraum', 'Period'), c.zeitraum], [t('Ort', 'Place'), c.ort],
    [t('Für wen', 'Who for'), c.zielgruppe], [t('Sprache', 'Language'), c.sprache],
  ] as [string, string][]).filter(([, v]) => v);
  if (fakten.length) teile.push(h('dl', { class: 'oc-fakten' }, ...fakten.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })])));
  if (c.beschreibung) teile.push(h('p', { class: 'oc-text', text: c.beschreibung }));

  if (c.unterlagen.length) {
    const haken = s?.unterlagen ?? [];
    const fertig = c.unterlagen.filter((_, i) => haken[i]).length;
    teile.push(h('div', { class: 'oc-block' },
      h('div', { class: 'oc-block__kopf' },
        h('p', { class: 'oc-block__l', id: 'oc-d-docs', text: t('Unterlagen', 'Documents') }),
        h('span', { class: 'oc-block__zahl', text: t(`${fertig} von ${c.unterlagen.length} erledigt`, `${fertig} of ${c.unterlagen.length} done`) })),
      h('div', { class: 'oc-docs', role: 'group', 'aria-labelledby': 'oc-d-docs' },
        ...c.unterlagen.map((label, i) => h('label', { class: 'oc-check' },
          h('input', {
            type: 'checkbox', checked: !!haken[i], disabled: !frei, 'data-fokus': `doc-${i}`,
            onchange: (e: Event) => {
              const neu = c.unterlagen.map((_, k) => (k === i ? (e.target as HTMLInputElement).checked : !!haken[k]));
              void standSetzen(c, { unterlagen: neu, stand: s?.stand && s.stand !== 'gemerkt' ? s.stand : 'arbeit' });
            },
          }),
          h('span', { text: label }))))));
  }

  if (frei) teile.push(netzBox(c));
  const red = redaktionBox(c);
  if (red) teile.push(red);
  teile.push(h('p', { class: 'oc-quelle', text: quelleText(c) }));

  panel.replaceChildren(kopf, h('div', { class: 'oc-schublade__inhalt' }, ...teile));
}

function netzBox(c: OpenCall) {
  const ich = ctx!.user.id;
  const von = (art: Netz['art']) => netz.filter((n) => n.call_id === c.id && n.art === art).map((n) => n.person);
  const erfahrung = von('erfahrung');
  const mitmachen = von('mitmachen');
  const box = h('div', { class: 'oc-netz' }, h('p', { class: 'oc-block__l', text: t('Aus dem Netzwerk', 'From the network') }));
  if (c.hinweis) box.append(h('p', { text: c.hinweis }));
  if (erfahrung.length) {
    box.append(h('p', {
      text: erfahrung.length === 1
        ? t('Hat sich hier schon beworben und teilt Erfahrungen:', 'Has applied here before and shares their experience:')
        : t(`${erfahrung.length} Mitglieder haben sich hier schon beworben und teilen Erfahrungen:`, `${erfahrung.length} members have applied here before and share their experience:`),
    }), h('div', { class: 'oc-leute' }, ...erfahrung.map(person)));
  }
  if (mitmachen.length) {
    box.append(h('p', { text: c.gemeinsam ? t('Beim gemeinsamen Antrag dabei:', 'In on the joint application:') : t('Suchen Mitstreiter:innen:', 'Looking for partners:') }),
      h('div', { class: 'oc-leute' }, ...mitmachen.map(person)));
  }
  const n = mitmachen.length;
  const dabei = n ? t(` · ${n} ${n === 1 ? 'Person' : 'Personen'} dabei`, ` · ${n} ${n === 1 ? 'person' : 'people'} in`) : '';
  const schalter = (art: Netz['art'], text: string) => h('label', { class: 'oc-check' },
    h('input', { type: 'checkbox', checked: von(art).includes(ich), 'data-fokus': `netz-${art}`, onchange: (e: Event) => void netzSetzen(c, art, (e.target as HTMLInputElement).checked) }),
    h('span', { text }));
  box.append(
    schalter('mitmachen', (c.gemeinsam ? t('Ich mache beim gemeinsamen Antrag mit', 'I am in on the joint application') : t('Ich suche Mitstreiter:innen für diesen Call', 'I am looking for partners for this call')) + dabei),
    schalter('erfahrung', t('Ich habe mich hier schon beworben und teile meine Erfahrungen', 'I have applied here before and am happy to share my experience')),
  );
  return box;
}

function redaktionBox(c: OpenCall) {
  const knopf = (text: string, cls: string, fokus: string, klick: () => void) => h('button', { type: 'button', class: cls, 'data-fokus': fokus, onclick: klick }, text);
  if (ctx!.isRedaktion) {
    const box = h('div', { class: 'oc-redaktion' });
    if (!istFrei(c)) {
      box.append(
        h('p', { text: t(`Gemeldet von ${nameVon(c.gemeldet_von)} am ${datumMittel(c.created_at.slice(0, 10), 'de')}. Alle Mitglieder sehen den Call erst nach der Freigabe. Vorher am besten Link und Frist prüfen.`, `Reported by ${nameVon(c.gemeldet_von)} on ${datumMittel(c.created_at.slice(0, 10), 'en')}. Members only see the call once it is approved. Check the link and deadline first.`) }),
        knopf(t('Freigeben', 'Approve'), 'btn btn--primary btn--sm', 'freigeben', () => void freigeben(c)),
        knopf(t('Bearbeiten', 'Edit'), 'ku-linie', 'bearbeiten', () => formOeffnen(c)),
        knopf(t('Ablehnen', 'Reject'), 'oc-loeschen', 'ablehnen', () => void entfernen(c, 'ablehnen')),
      );
    } else {
      box.append(knopf(t('Bearbeiten', 'Edit'), 'ku-linie', 'bearbeiten', () => formOeffnen(c)));
    }
    return box;
  }
  if (!istFrei(c) && istMeins(c)) {
    return h('div', { class: 'oc-redaktion' },
      h('p', { text: t('Von dir gemeldet. Die Redaktion prüft den Eintrag, meist innerhalb von zwei Werktagen. Bis dahin siehst nur du ihn.', 'Reported by you. The editorial team checks the entry, usually within two working days. Until then only you can see it.') }),
      knopf(t('Meldung zurückziehen', 'Withdraw'), 'oc-loeschen', 'zurueckziehen', () => void entfernen(c, 'zurueckziehen')));
  }
  return null;
}

function quelleText(c: OpenCall) {
  if (!istFrei(c)) {
    return istMeins(c)
      ? t('Von dir gemeldet · wartet auf Prüfung durch die Redaktion', 'Reported by you · waiting for review by the editorial team')
      : t(`Gemeldet von ${nameVon(c.gemeldet_von)} · wartet auf Prüfung`, `Reported by ${nameVon(c.gemeldet_von)} · waiting for review`);
  }
  const quelle = [c.quelle, c.gemeldet_von ? t(`gemeldet von ${nameVon(c.gemeldet_von)}`, `reported by ${nameVon(c.gemeldet_von)}`) : ''].filter(Boolean).join(' · ') || 'TanzNetzDresden';
  const geprueft = c.geprueft_am ? t(`Geprüft von der Redaktion am ${datumMittel(c.geprueft_am, 'de')}`, `Checked by the editorial team on ${datumMittel(c.geprueft_am, 'en')}`) : t('Von der Redaktion', 'By the editorial team');
  return `${geprueft} · ${t('Quelle', 'Source')}: ${quelle}`;
}

async function linkKopieren(c: OpenCall) {
  const adresse = seiteUrl(c);
  try {
    await navigator.clipboard.writeText(adresse);
    melde(t('Link kopiert. Er öffnet den Call für angemeldete Mitglieder.', 'Link copied. It opens the call for logged-in members.'));
  } catch {
    melde(adresse);
  }
}

function herunterladen(liste: OpenCall[], datei: string) {
  const blob = new Blob([fristenIcs(liste, { sprache, seite: seiteUrl })], { type: 'text/calendar;charset=utf-8' });
  const a = h('a', { href: URL.createObjectURL(blob), download: datei });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

$('[data-oc-export]').addEventListener('click', () => {
  const liste = gruppen().gemerkt;
  if (!liste.length) return melde(t('Merke dir zuerst einen Call.', 'Save a call first.'));
  herunterladen(liste, 'tanznetz-fristen.ics');
  melde(liste.length === 1 ? t('Eine Frist als Kalenderdatei heruntergeladen.', 'One deadline downloaded as a calendar file.') : t(`${liste.length} Fristen als Kalenderdatei heruntergeladen.`, `${liste.length} deadlines downloaded as a calendar file.`));
});

// ---------- Redaktion: freigeben, ablehnen, löschen; Mitglieder: zurückziehen ----------
async function freigeben(c: OpenCall) {
  const { data, error } = await ctx!.sb.from('open_calls').update({ status: 'frei' }).eq('id', c.id).select(SPALTEN).single();
  if (error) return meldung(errorText(error));
  ersetzen(data as unknown as OpenCall);
  melde(t('Freigegeben. Alle Mitglieder sehen den Call jetzt.', 'Approved. All members can see the call now.'));
}

async function entfernen(c: OpenCall, wie: 'ablehnen' | 'loeschen' | 'zurueckziehen'): Promise<boolean> {
  const frage = {
    ablehnen: t(`Die Meldung „${c.titel}“ ablehnen? Sie wird gelöscht. Sag der Person am besten kurz Bescheid, warum.`, `Reject “${c.titel}”? It will be deleted. Best let the person know why.`),
    loeschen: t(`„${c.titel}“ löschen? Gemerkte Stände und Unterlagen der Mitglieder gehen dabei verloren.`, `Delete “${c.titel}”? Members lose their saved status and documents for it.`),
    zurueckziehen: t(`Deine Meldung „${c.titel}“ zurückziehen?`, `Withdraw your report “${c.titel}”?`),
  }[wie];
  if (!confirm(frage)) return false;
  const { error } = await ctx!.sb.from('open_calls').delete().eq('id', c.id);
  if (error) {
    meldung(errorText(error));
    return false;
  }
  calls = calls.filter((x) => x.id !== c.id);
  detailSchliessen();
  zeichnen();
  melde({ ablehnen: t('Meldung abgelehnt.', 'Report rejected.'), loeschen: t('Gelöscht.', 'Deleted.'), zurueckziehen: t('Meldung zurückgezogen.', 'Report withdrawn.') }[wie], root);
  return true;
}

function ersetzen(neu: OpenCall) {
  calls = calls.some((x) => x.id === neu.id) ? calls.map((x) => (x.id === neu.id ? neu : x)) : [...calls, neu];
  zeichnen();
}

// ---------- Melden, eintragen, bearbeiten ----------
const fdlg = $<HTMLDialogElement>('[data-oc-form-dlg]');
const form = $<HTMLFormElement>('[data-oc-form]');
const feld = <T extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement>(k: string) => $<T>(`[data-f="${k}"]`, form);
const check = (k: string) => $<HTMLInputElement>(`[data-f-check="${k}"]`, form);
const hint = $('[data-f-hint]', form);
const TEXTFELDER = ['titel', 'anbieter', 'frist', 'uhrzeit', 'link', 'leistung', 'beschreibung', 'ort', 'start', 'zeitraum', 'zielgruppe', 'sprache', 'quelle', 'wiederkehrend', 'hinweis'] as const;
const KAESTCHEN = ['nur_mitglieder', 'honoriert', 'englisch', 'vom_netzwerk', 'gemeinsam'] as const;
let bearbeitet: OpenCall | null = null;
let fArt: Art = 'residenz';
let fReichweite: Reichweite = 'dd';
let versucht = false;

function formChips() {
  $('[data-f-arten]', form).replaceChildren(
    ...Object.entries(ARTEN).map(([k, v]) => h('button', { type: 'button', 'aria-pressed': String(fArt === k), onclick: () => { fArt = k as Art; formChips(); } },
      h('span', { class: 'oc-mk', 'data-art': k, 'aria-hidden': 'true' }), wort(v))),
  );
  $('[data-f-reichweiten]', form).replaceChildren(
    ...Object.entries(REICHWEITEN).map(([k, v]) => h('button', { type: 'button', 'aria-pressed': String(fReichweite === k), onclick: () => { fReichweite = k as Reichweite; formChips(); } }, wort(v))),
  );
}

function formOeffnen(c?: OpenCall) {
  const red = ctx!.isRedaktion;
  bearbeitet = c ?? null;
  versucht = false;
  $('[data-f-tag]', form).textContent = red ? t('Redaktion', 'Editorial') : t('Für die Redaktion', 'For the editorial team');
  $('[data-f-titel]', form).textContent = c ? t('Call bearbeiten', 'Edit call') : red ? t('Call eintragen', 'Add a call') : t('Call melden', 'Report a call');
  $('[data-f-lead]', form).textContent = red
    ? t('Erscheint sofort für alle Mitglieder. Ohne Frist kein Eintrag: Das Ablaufdatum steuert, wann der Call ins Archiv geht.', 'Visible to all members straight away. No entry without a deadline: it decides when the call moves to the archive.')
    : t('Die Redaktion prüft den Eintrag, meist innerhalb von zwei Werktagen. Ohne Frist kein Eintrag: Das Ablaufdatum steuert, wann der Call ins Archiv geht.', 'The editorial team checks the entry, usually within two working days. No entry without a deadline: it decides when the call moves to the archive.');
  const mehr = $<HTMLDetailsElement>('[data-f-mehr]', form);
  mehr.hidden = !red;
  mehr.open = !!c;
  for (const k of TEXTFELDER) {
    const v = c ? (c[k] ?? '') : k === 'uhrzeit' ? '23:59' : '';
    feld(k).value = k === 'uhrzeit' ? uhr(String(v)) : String(v);
    feld(k).removeAttribute('aria-invalid');
  }
  feld<HTMLTextAreaElement>('unterlagen').value = (c?.unterlagen ?? []).join('\n');
  for (const k of KAESTCHEN) check(k).checked = !!c?.[k];
  fArt = c?.art ?? 'residenz';
  fReichweite = c?.reichweite ?? 'dd';
  formChips();
  // Mitglieder melden nur Calls, die noch laufen
  feld('frist').min = red ? '' : jetztDresden().datum;
  $('[data-f-senden]', form).textContent = c ? (istFrei(c) ? t('Speichern', 'Save') : t('Speichern und freigeben', 'Save and approve')) : red ? t('Veröffentlichen', 'Publish') : t('Zur Prüfung senden', 'Send for review');
  $('[data-f-loeschen]', form).hidden = !c;
  hinweisZeigen();
  if (!fdlg.open) {
    fdlg.showModal();
    if (bewegung) gsap.fromTo(form, { xPercent: 100 }, { xPercent: 0, duration: 0.6, ease: EASE });
  }
  feld('titel').focus();
}

function formSchliessen() {
  if (!fdlg.open) return;
  if (!bewegung) return fdlg.close();
  gsap.to(form, { xPercent: 100, duration: 0.3, ease: 'power3.in', onComplete: () => { fdlg.close(); gsap.set(form, { clearProps: 'transform' }); } });
}
$('[data-zu]', form).addEventListener('click', formSchliessen);
fdlg.addEventListener('cancel', (e) => { e.preventDefault(); formSchliessen(); });
fdlg.addEventListener('click', (e) => { if (e.target === fdlg) formSchliessen(); });
$('[data-oc-melden]').addEventListener('click', () => formOeffnen());
$('[data-f-loeschen]', form).addEventListener('click', async () => {
  if (bearbeitet && (await entfernen(bearbeitet, 'loeschen'))) formSchliessen();
});

/** Fehlende Pflichtfelder (und ein Link ohne https://) */
function fehler(): string {
  const leer = (['titel', 'anbieter', 'frist', 'link'] as const).filter((k) => !feld(k).value.trim() || (k === 'titel' && feld(k).value.trim().length < 3));
  for (const k of ['titel', 'anbieter', 'frist', 'link'] as const) {
    const falsch = versucht && (leer.includes(k) || (k === 'link' && !!feld(k).value.trim() && !/^https?:\/\/\S+\.\S+/.test(feld(k).value.trim())));
    if (falsch) feld(k).setAttribute('aria-invalid', 'true');
    else feld(k).removeAttribute('aria-invalid');
  }
  if (leer.length) return t('Bitte Titel, Anbieter, Frist und Link ausfüllen.', 'Please fill in title, organiser, deadline and link.');
  if (!/^https?:\/\/\S+\.\S+/.test(feld('link').value.trim())) return t('Der Link muss mit https:// beginnen.', 'The link has to start with https://.');
  if (!ctx!.isRedaktion && feld('frist').value < jetztDresden().datum) return t('Die Frist liegt in der Vergangenheit.', 'The deadline is in the past.');
  if (feld('start').value && feld('start').value > feld('frist').value) return t('„Antragstellung ab“ liegt nach der Frist.', '“Applications from” is after the deadline.');
  return '';
}

function hinweisZeigen() {
  const f = versucht ? fehler() : '';
  const frist = feld('frist').value;
  hint.textContent = f || (frist
    ? t(`Geht am ${datumMittel(frist, 'de')} nach ${uhr(feld('uhrzeit').value || '23:59')} Uhr ins Archiv.`, `Moves to the archive on ${datumMittel(frist, 'en')} after ${uhr(feld('uhrzeit').value || '23:59')}.`)
    : t('Felder mit * sind Pflicht.', 'Fields marked * are required.'));
  hint.classList.toggle('is-fehler', !!f);
}
form.addEventListener('input', hinweisZeigen);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  versucht = true;
  const f = fehler();
  hinweisZeigen();
  if (f) return form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  const red = ctx!.isRedaktion;
  const wert = (k: (typeof TEXTFELDER)[number]) => feld(k).value.trim();
  const daten: Record<string, unknown> = {
    art: fArt, reichweite: fReichweite, titel: wert('titel'), anbieter: wert('anbieter'), frist: wert('frist'), uhrzeit: wert('uhrzeit') || '23:59',
    link: wert('link'), leistung: wert('leistung'), beschreibung: wert('beschreibung'), nur_mitglieder: check('nur_mitglieder').checked,
  };
  if (red) {
    Object.assign(daten, {
      ort: wert('ort'), start: wert('start') || null, zeitraum: wert('zeitraum'), zielgruppe: wert('zielgruppe'), sprache: wert('sprache'),
      quelle: wert('quelle'), wiederkehrend: wert('wiederkehrend'), hinweis: wert('hinweis'),
      unterlagen: feld<HTMLTextAreaElement>('unterlagen').value.split('\n').map((x) => x.trim()).filter(Boolean),
      honoriert: check('honoriert').checked, englisch: check('englisch').checked, vom_netzwerk: check('vom_netzwerk').checked, gemeinsam: check('gemeinsam').checked,
      status: 'frei',
    });
  }
  const knopf = $<HTMLButtonElement>('[data-f-senden]', form);
  knopf.disabled = true;
  const sb = ctx!.sb;
  const war = bearbeitet;
  const { data, error } = war
    ? await sb.from('open_calls').update(daten).eq('id', war.id).select(SPALTEN).single()
    : await sb.from('open_calls').insert({ ...daten, ...(red ? {} : { status: 'pruefung', gemeldet_von: ctx!.user.id }) }).select(SPALTEN).single();
  knopf.disabled = false;
  if (error) {
    hint.textContent = errorText(error);
    hint.classList.add('is-fehler');
    return;
  }
  const neu = data as unknown as OpenCall;
  if (!war && !red) tab = 'aktuell';
  ersetzen(neu);
  formSchliessen();
  melde(war ? (istFrei(war) ? t('Gespeichert.', 'Saved.') : t('Gespeichert und freigegeben.', 'Saved and approved.'))
    : red ? t('Veröffentlicht. Alle Mitglieder sehen den Call jetzt.', 'Published. All members can see the call now.')
      : t('Danke! Dein Call ist bei der Redaktion. Bis zur Freigabe siehst nur du ihn.', 'Thank you! Your call is with the editorial team. Until it is approved only you can see it.'), offen ? undefined : root);
  if (offen === neu.id) detailZeichnen();
});

if (ctx) await start();
