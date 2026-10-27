/**
 * Tanzkalender im Browser (src/views/TermineView.astro): Liste mit Mini-Monat oder Monatsraster mit
 * Tagesansicht, Filter, Suche, Vergangene, Aufklappen, Kalenderdateien und die Bewegung aus dem Entwurf.
 * Die Daten kommen beim Build als JSON in die Seite; „heute“ rechnet der Browser (Ortszeit Dresden),
 * damit die Seite auch zwischen zwei Builds stimmt.
 */
import { gsap, ScrollTrigger, EASE, motionOk } from './gsap';
import { ueberschriften } from './split-text';
import { getLenis } from './smooth-scroll';
import { h } from './dom';
import { fuellen } from '../lib/texte-regeln';
import {
  buendeln, ics, monate, monatPlus, norm, passt, raster, type Kat, type KTermin, type Zeile,
} from '../lib/tanzkalender-modell';

type Texte = Record<string, string> & { kat: Record<string, string> };
interface Daten {
  termine: KTermin[];
  locale: string;
  texte: Texte;
}
type Ansicht = 'liste' | 'monat';

export function initTanzkalender(): void {
  const main = document.querySelector<HTMLElement>('[data-tk-main]');
  const datenEl = document.querySelector('[data-tk-daten]');
  if (!main || !datenEl) return;
  const { termine, locale, texte: T } = JSON.parse(datenEl.textContent ?? '{}') as Daten;
  const $ = <E extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<E>(sel)!;
  const bewegung = motionOk();
  const de = locale.startsWith('de');
  const heute = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());

  // ---------- Datumstexte ----------
  const utc = (d: string) => new Date(`${d}T00:00:00Z`);
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { ...o, timeZone: 'UTC' });
  const ohnePunkt = (s: string) => s.replace(/\.$/, '');
  const wtKurz = (d: string) => ohnePunkt(fmt({ weekday: 'short' }).format(utc(d)));
  const moKurz = (d: string) => ohnePunkt(fmt({ month: 'short' }).format(utc(d)));
  const tagNr = (d: string) => String(utc(d).getUTCDate());
  const datumLang = (d: string) => fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(utc(d));
  const datumMittel = (d: string) => fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(utc(d));
  const datumKurz = (d: string) => (de ? `${wtKurz(d)} ${tagNr(d)}. ${moKurz(d)}` : `${wtKurz(d)} ${tagNr(d)} ${moKurz(d)}`);
  const monatName = (key: string) => fmt({ month: 'long', year: 'numeric' }).format(utc(`${key}-01`));
  const uhr = (zeit: string) => fuellen(T.uhr, { zeit });
  const anzahl = (n: number) => (n === 1 ? T.treffer1 : fuellen(T.treffer, { zahl: n }));

  // ---------- Zustand ----------
  let ansicht: Ansicht = 'liste';
  let kat = '';
  let suche = '';
  let vergangene = false;
  let offen: string | null = null;
  const heuteMonat = heute.slice(0, 7);
  let mm = heuteMonat;
  let vm = heuteMonat;
  let sel = heute;
  let spy: string | null = null;
  const monatsKeys = termine.map((t) => t.datum.slice(0, 7));
  const erster = [heuteMonat, ...monatsKeys].sort()[0];
  const letzter = [heuteMonat, ...monatsKeys].sort().at(-1)!;

  const gezeigt = () => termine.filter((e) => passt(e, kat, suche));
  const zukunft = termine.filter((e) => e.datum >= heute);

  // ---------- Höhe von Kopf und Leiste (für die klebenden Überschriften) ----------
  const leiste = $('[data-tk-leiste]');
  const kopfzeile = document.querySelector<HTMLElement>('.site-header');
  const messen = () => {
    const kh = Math.round(kopfzeile?.getBoundingClientRect().height ?? 70);
    const lh = Math.round(leiste.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--tk-kopf-h', `${kh}px`);
    // auf dem Handy klebt die Leiste nicht (TermineView.astro)
    const klebt = getComputedStyle(leiste).position === 'sticky';
    document.documentElement.style.setProperty('--tk-oben', `${klebt ? kh + lh : kh}px`);
  };
  messen();
  new ResizeObserver(messen).observe(leiste);
  addEventListener('resize', messen);
  if (kopfzeile) new ResizeObserver(messen).observe(kopfzeile);
  const oben = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tk-oben')) || 136;

  function scrollenZu(el: Element | null, abstand = 70) {
    if (!el) return;
    const y = el.getBoundingClientRect().top + scrollY - (oben() + abstand);
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(y, { immediate: !bewegung });
    else scrollTo({ top: y, behavior: bewegung ? 'smooth' : 'auto' });
  }

  // ---------- Kalenderdatei ----------
  const host = (() => {
    try {
      return new URL(document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? location.href).host;
    } catch {
      return location.host;
    }
  })();
  function herunterladen(list: KTermin[], name: string) {
    const a = h('a', { href: URL.createObjectURL(new Blob([ics(list, { seite: location.href, host })], { type: 'text/calendar;charset=utf-8' })), download: `${name}.ics` });
    document.body.append(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  }

  // ---------- Bausteine eines Termins ----------
  const badgeKlasse = (k: Kat) => `badge${k === 'Bühne' ? '' : k === 'Training' ? ' badge--cyan' : k === 'Diskurs' ? ' badge--purple' : ' badge--outline'}`;
  const zeitSpalte = (e: KTermin) => (e.kat === 'Frist' ? T.frist : e.zeit || T.ganztaegig);
  const mit = (e: KTermin) => (e.wer ? fuellen(T.mit, { name: e.wer }) : '');
  function zeile2(e: Zeile) {
    const tage = e.sitzungen ? e.sitzungen.map((s) => wtKurz(s.datum)).join(' · ') : '';
    return [tage, mit(e), e.ort].filter(Boolean).join(' · ');
  }
  function wann(e: Zeile) {
    if (e.sitzungen) {
      const s = e.sitzungen;
      const spanne = s.length > 1 ? fmt({ day: 'numeric', month: 'long' }).formatRange(utc(s[0].datum), utc(s[s.length - 1].datum)) : datumMittel(s[0].datum);
      return `${spanne} · ${uhr(e.zeit)}`;
    }
    return [datumLang(e.datum), e.kat === 'Frist' ? T.frist : e.zeit ? uhr(e.zeit) : ''].filter(Boolean).join(' · ');
  }
  function fakten(e: Zeile) {
    const dl = h('dl', { class: 'tk-fakten' }, h('div', {}, h('dt', { text: T.wann }), h('dd', { text: wann(e) })));
    if (e.ort) dl.append(h('div', {}, h('dt', { text: T.ort }), h('dd', { text: e.ort }), e.adresse && h('dd', { text: e.adresse })));
    if (e.eintritt) dl.append(h('div', {}, h('dt', { text: T.eintritt }), h('dd', { text: e.eintritt })));
    return dl;
  }
  function links(e: Zeile) {
    return h(
      'div',
      { class: 'tk-links' },
      h('button', { type: 'button', class: 'btn btn--primary btn--sm btn--marker', text: T.speichern, onclick: () => herunterladen(e.sitzungen ?? [e], `tanznetzdresden-${e.id}`) }),
      e.route && h('a', { class: 'tk-mono', href: e.route, target: '_blank', rel: 'noopener', text: T.route }),
      e.link && h('a', { class: 'tk-mono', href: e.link, text: e.linkText }),
    );
  }

  // ---------- Liste ----------
  const monateEl = $('[data-tk-monate]');
  const trefferEl = $('[data-tk-treffer]');
  const pastKnopf = $<HTMLButtonElement>('[data-tk-past]');
  const leerEl = $('[data-tk-leer]');

  function eintrag(e: Zeile) {
    const id = `tk-d-${e.id}`;
    const auf = offen === e.id;
    const knopf = h(
      'button',
      { type: 'button', class: 'tk-ev__knopf', 'aria-expanded': String(auf), 'aria-controls': id, 'data-fokus': `ev-${e.id}`, onclick: () => umschalten(e.id) },
      h('span', { class: 'tk-zeit', text: zeitSpalte(e) }),
      h('span', { class: 'tk-ev__titel' }, h('strong', { text: e.titel }), h('span', { class: 'tk-zeile2', text: zeile2(e) })),
      h('span', { class: badgeKlasse(e.kat), text: e.badge }),
      h('span', { class: 'tk-plus', 'aria-hidden': 'true', text: '+' }),
    );
    const box = h('div', { class: 'tk-ev', 'data-ev': e.id }, knopf);
    if (auf) {
      box.append(
        h(
          'div',
          { class: 'tk-detail', id, 'data-detail': e.id },
          h(
            'div',
            { class: 'tk-detail__in' },
            e.text && h('p', { class: 'tk-text', text: e.text }),
            e.sitzungen && h('div', { class: 'tk-tage' }, ...e.sitzungen.map((s) => h('span', { text: datumKurz(s.datum) }))),
            fakten(e),
            links(e),
          ),
        ),
      );
    }
    return box;
  }

  function listeZeichnen(auftritt = false) {
    const fokus = (document.activeElement as HTMLElement | null)?.dataset.fokus;
    const alle = gezeigt();
    let zeilen: Zeile[] = alle.filter((e) => vergangene || e.datum >= heute);
    if (!kat) zeilen = buendeln(zeilen);
    const n = zeilen.length;
    const ms = n ? monate(zeilen, suche.trim() ? undefined : heute) : [];
    monateEl.replaceChildren(
      ...ms.map((m) =>
        h(
          'div',
          { class: 'tk-mo' },
          h('div', { class: 'tk-mo__kopf' }, h('h2', { text: monatName(m.key) }), h('span', { text: anzahl(m.anzahl) })),
          ...m.tage.map((t) => {
            const istHeute = t.datum === heute;
            return h(
              'div',
              { class: `tk-tagzeile${istHeute ? ' is-heute' : ''}${t.datum < heute ? ' is-vergangen' : ''}`, 'data-day': t.datum },
              h(
                'div',
                { class: 'tk-tagzeile__in' },
                h(
                  'div',
                  { class: 'tk-datum' },
                  h('span', { class: 'tk-datum__wt', text: wtKurz(t.datum) }),
                  h('span', { class: 'tk-datum__n', text: tagNr(t.datum) }),
                  istHeute && h('span', { class: 'tk-heute-mk', text: T.heute }),
                ),
                h('div', { class: 'tk-items' }, ...(t.zeilen.length ? t.zeilen.map(eintrag) : [h('p', { class: 'tk-items__leer', text: T.heuteLeer })])),
              ),
            );
          }),
        ),
      ),
    );
    const q = suche.trim();
    trefferEl.textContent = [anzahl(n), vergangene ? '' : T.abHeute, q ? fuellen(T.fuer, { suche: q }) : ''].filter(Boolean).join(' ');
    const davor = alle.filter((e) => e.datum < heute).length;
    pastKnopf.textContent = vergangene ? T.ausblenden : fuellen(T.zeigen, { zahl: davor });
    pastKnopf.hidden = !vergangene && !davor;
    leerEl.hidden = n > 0;
    if (fokus) document.querySelector<HTMLElement>(`[data-fokus="${fokus}"]`)?.focus({ preventScroll: true });
    if (auftritt && bewegung) {
      gsap.fromTo(monateEl.querySelectorAll('.tk-tagzeile'), { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.5, ease: EASE, stagger: 0.02, clearProps: 'opacity,transform' });
    }
    beobachten();
    miniZeichnen();
  }

  function umschalten(id: string) {
    const zu = offen ? monateEl.querySelector<HTMLElement>(`[data-detail="${CSS.escape(offen)}"]`) : null;
    const auf = () => {
      offen = offen === id ? null : id;
      listeZeichnen();
      const d = offen ? monateEl.querySelector<HTMLElement>(`[data-detail="${CSS.escape(offen)}"]`) : null;
      if (d && bewegung) gsap.from(d, { height: 0, opacity: 0, duration: 0.5, ease: EASE, clearProps: 'height,opacity' });
      ScrollTrigger.refresh();
    };
    if (zu && bewegung) gsap.to(zu, { height: 0, opacity: 0, duration: 0.26, ease: 'power3.in', onComplete: offen === id ? () => { offen = null; listeZeichnen(); } : auf });
    else if (offen === id) {
      offen = null;
      listeZeichnen();
    } else auf();
  }

  // Scroll-Spion: der Tag in der Mitte des Fensters ist im Mini-Monat markiert
  let spion: IntersectionObserver | undefined;
  function beobachten() {
    spion?.disconnect();
    spion = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (!e.isIntersecting) continue;
          const key = (e.target as HTMLElement).dataset.day!;
          if (key === spy) continue;
          spy = key;
          const neu = key.slice(0, 7);
          const wechsel = neu !== mm;
          mm = neu;
          miniZeichnen(wechsel ? 1 : 0);
        }
      },
      { rootMargin: '-45% 0px -54% 0px' },
    );
    monateEl.querySelectorAll('[data-day]').forEach((el) => spion!.observe(el));
  }

  function hinGleiten(el: Element, dir: number) {
    if (bewegung && dir) gsap.fromTo(el, { x: dir * 36, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: EASE, clearProps: 'transform,opacity' });
  }

  // ---------- Mini-Monat ----------
  const miniEl = $('[data-tk-mini]');
  const miniVor = $<HTMLButtonElement>('[data-tk-mini-vor]');
  const miniNach = $<HTMLButtonElement>('[data-tk-mini-nach]');
  function proTag(list: KTermin[]) {
    const m = new Map<string, KTermin[]>();
    for (const e of list) m.set(e.datum, [...(m.get(e.datum) ?? []), e]);
    return m;
  }
  function miniZeichnen(dir = 0) {
    const tage = proTag(gezeigt());
    $('[data-tk-mini-label]').textContent = monatName(mm);
    miniVor.disabled = mm <= erster;
    miniNach.disabled = mm >= letzter;
    miniEl.replaceChildren(
      ...raster(mm).map(({ datum, imMonat }) => {
        if (!imMonat) return h('span', { class: 'leer', 'aria-hidden': 'true' });
        const list = tage.get(datum) ?? [];
        const kats = [...new Set(list.map((e) => e.kat))].slice(0, 3);
        const cls = [datum === heute && 'is-heute', datum < heute && 'is-vergangen', datum === spy && 'is-an'].filter(Boolean).join(' ');
        return h(
          'button',
          {
            type: 'button', class: cls || undefined, disabled: !list.length,
            'aria-label': `${datumLang(datum)}, ${list.length ? anzahl(list.length) : T.keine}`,
            onclick: () => miniWaehlen(datum),
          },
          h('span', { text: tagNr(datum) }),
          h('span', { class: 'punkte', 'aria-hidden': 'true' }, ...kats.map((k) => h('span', { class: 'tk-sq', 'data-kat': k }))),
        );
      }),
    );
    hinGleiten(miniEl, dir);
  }
  function miniWaehlen(datum: string) {
    if (datum < heute && !vergangene) {
      vergangene = true;
      listeZeichnen();
    }
    zumTag(datum);
  }
  function zumTag(datum: string) {
    const alle = [...monateEl.querySelectorAll<HTMLElement>('[data-day]')];
    const el = alle.find((x) => (x.dataset.day ?? '') >= datum) ?? alle.at(-1);
    if (!el) return;
    scrollenZu(el);
    if (bewegung) gsap.fromTo(el, { backgroundColor: 'rgba(72,198,215,0.22)' }, { backgroundColor: 'rgba(72,198,215,0)', duration: 1.4, delay: 0.45, ease: 'power2.out', clearProps: 'backgroundColor' });
  }
  miniVor.addEventListener('click', () => { mm = monatPlus(mm, -1); miniZeichnen(-1); });
  miniNach.addEventListener('click', () => { mm = monatPlus(mm, 1); miniZeichnen(1); });

  // ---------- Monatsansicht ----------
  const rasterEl = $('[data-tk-raster]');
  const tagEl = $('[data-tk-tag]');
  const vmVor = $<HTMLButtonElement>('[data-tk-vm-vor]');
  const vmNach = $<HTMLButtonElement>('[data-tk-vm-nach]');
  const kurzTitel = (e: KTermin) => (e.kat === 'Training' ? (e.training ? 'KEEP UP' : 'Workshop') : e.titel);

  function monatZeichnen(dir = 0) {
    const fokus = (document.activeElement as HTMLElement | null)?.dataset.fokus;
    const tage = proTag(gezeigt());
    $('[data-tk-vm-label]').textContent = monatName(vm);
    vmVor.disabled = vm <= erster;
    vmNach.disabled = vm >= letzter;
    rasterEl.replaceChildren(
      ...raster(vm).map(({ datum, imMonat }) => {
        const list = tage.get(datum) ?? [];
        const cls = [!imMonat && 'is-aussen', datum === heute && 'is-heute', datum < heute && 'is-vergangen'].filter(Boolean).join(' ');
        return h(
          'button',
          {
            type: 'button', class: cls || undefined, 'aria-pressed': String(datum === sel), 'data-fokus': `tag-${datum}`,
            'aria-label': `${datumLang(datum)}, ${list.length ? anzahl(list.length) : T.keine}`,
            onclick: () => { if (sel !== datum) { sel = datum; monatZeichnen(); tagIn(); } },
          },
          h('span', { class: 'n', text: tagNr(datum) }),
          h(
            'span',
            { class: 'chips', 'aria-hidden': 'true' },
            ...list.slice(0, 3).map((e) =>
              h('span', { class: 'chip1' }, h('span', { class: 'tk-sq', 'data-kat': e.kat }), h('span', {}, h('b', { text: e.kat === 'Frist' ? T.frist : e.von }), ` ${kurzTitel(e)}`)),
            ),
            list.length > 3 && h('span', { class: 'mehr', text: fuellen(T.weitere, { zahl: list.length - 3 }) }),
          ),
        );
      }),
    );
    if (fokus) document.querySelector<HTMLElement>(`[data-fokus="${fokus}"]`)?.focus({ preventScroll: true });
    hinGleiten(rasterEl, dir);
    tagZeichnen();
  }

  function tagZeichnen() {
    const list = gezeigt();
    const items = list.filter((e) => e.datum === sel);
    const nx = list.find((e) => e.datum > sel);
    tagEl.replaceChildren(
      h('span', { class: 'tk-tag__k', text: sel === heute ? T.heute : sel < heute ? T.vergangen : T.ausgewaehlt }),
      h('h3', { text: datumMittel(sel) }),
      ...items.map((e) =>
        h(
          'div',
          { class: 'tk-pitem', 'data-pitem': '' },
          h('div', { class: 'tk-pitem__top' }, h('span', { class: 'tk-zeit', text: zeitSpalte(e) }), h('span', { class: badgeKlasse(e.kat), text: e.badge })),
          h('strong', { text: e.titel }),
          h('span', { class: 'tk-zeile2', text: zeile2(e) }),
          e.text && h('p', { class: 'tk-text', text: e.text }),
          e.adresse && h('span', { class: 'tk-zeile2', text: e.adresse }),
          e.eintritt && h('span', { class: 'tk-eintritt', text: e.eintritt }),
          links(e),
        ),
      ),
    );
    if (!items.length) {
      tagEl.append(
        h(
          'div',
          { class: 'tk-tag__leer' },
          h('p', { text: T.tagLeer }),
          nx && h('button', {
            type: 'button', class: 'tk-mono tk-mono--magenta', text: fuellen(T.naechster, { termin: `${datumKurz(nx.datum)} · ${nx.titel}` }),
            onclick: () => {
              const neu = nx.datum.slice(0, 7);
              const dir = neu > vm ? 1 : 0;
              sel = nx.datum;
              vm = neu;
              monatZeichnen(dir);
              tagIn();
            },
          }),
        ),
      );
    }
  }
  function tagIn() {
    if (bewegung) gsap.from(tagEl.querySelectorAll('h3, [data-pitem]'), { x: -24, opacity: 0, duration: 0.45, ease: EASE, stagger: 0.05, clearProps: 'transform,opacity' });
  }
  function monatBlaettern(dir: number) {
    vm = monatPlus(vm, dir);
    const erst = gezeigt().find((e) => e.datum.startsWith(vm));
    sel = vm === heuteMonat ? heute : erst ? erst.datum : `${vm}-01`;
    monatZeichnen(dir);
    tagIn();
  }
  vmVor.addEventListener('click', () => monatBlaettern(-1));
  vmNach.addEventListener('click', () => monatBlaettern(1));

  // ---------- Leiste ----------
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('[data-tk-ansicht]')];
  const panels = [...document.querySelectorAll<HTMLElement>('[data-tk-panel]')];
  function ansichtSetzen(v: Ansicht, fokus = false) {
    if (v === ansicht) return;
    ansicht = v;
    offen = null;
    tabs.forEach((t) => {
      const an = t.dataset.tkAnsicht === v;
      t.setAttribute('aria-selected', String(an));
      t.tabIndex = an ? 0 : -1;
      if (an && fokus) t.focus();
    });
    panels.forEach((p) => (p.hidden = p.dataset.tkPanel !== v));
    zeichnen();
    if (bewegung) gsap.fromTo(main, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, ease: EASE, clearProps: 'transform,opacity' });
    ScrollTrigger.refresh();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => ansichtSetzen(t.dataset.tkAnsicht as Ansicht));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      ansichtSetzen(n.dataset.tkAnsicht as Ansicht, true);
    });
  });

  const chips = [...document.querySelectorAll<HTMLButtonElement>('[data-tk-chips] button')];
  chips.forEach((c) => {
    const k = c.dataset.kat ?? '';
    c.querySelector('[data-n]')!.textContent = String(k ? zukunft.filter((e) => e.kat === k).length : zukunft.length);
    c.addEventListener('click', () => katSetzen(k));
  });
  function katSetzen(k: string, auftritt = true) {
    if (k === kat && auftritt) return;
    kat = k;
    offen = null;
    chips.forEach((c) => c.setAttribute('aria-pressed', String((c.dataset.kat ?? '') === k)));
    zeichnen(auftritt);
  }

  const qEl = $<HTMLInputElement>('[data-tk-q]');
  qEl.addEventListener('input', () => {
    suche = qEl.value;
    offen = null;
    zeichnen();
  });

  $('[data-tk-heute]').addEventListener('click', () => {
    if (ansicht === 'monat') {
      const dir = vm > heuteMonat ? -1 : vm < heuteMonat ? 1 : 0;
      vm = heuteMonat;
      sel = heute;
      monatZeichnen(dir);
      tagIn();
    } else {
      const dir = mm > heuteMonat ? -1 : mm < heuteMonat ? 1 : 0;
      mm = heuteMonat;
      miniZeichnen(dir);
      zumTag(heute);
    }
  });
  pastKnopf.addEventListener('click', () => {
    vergangene = !vergangene;
    offen = null;
    listeZeichnen(true);
  });
  $('[data-tk-reset]').addEventListener('click', () => {
    suche = '';
    qEl.value = '';
    katSetzen('', false);
  });
  $('[data-tk-ics-alle]').addEventListener('click', () => herunterladen(gezeigt().filter((e) => e.datum >= heute), 'tanznetzdresden-kalender'));

  function zeichnen(auftritt = false) {
    if (ansicht === 'liste') listeZeichnen(auftritt);
    else monatZeichnen();
  }

  // ---------- Kopf: „Als Nächstes“ (neu gerechnet, die Seite kann älter sein) ----------
  const nextEl = $('[data-tk-next]');
  function nextZeichnen() {
    const list = zukunft.filter((e) => e.kat !== 'Training').slice(0, 3);
    $('[data-tk-next-box]').hidden = !list.length;
    nextEl.replaceChildren(
      ...list.map((e) =>
        h(
          'li',
          {},
          h(
            'a',
            { href: e.link, 'data-id': e.id },
            h('span', { class: 'tk-next__d' }, h('span', { text: wtKurz(e.datum) }), h('strong', { text: tagNr(e.datum) }), h('span', { text: moKurz(e.datum) })),
            h('span', { class: 'tk-next__t' }, h('strong', { text: e.titel }), h('span', { text: [e.kat === 'Frist' ? T.frist : uhr(e.von), e.ort].filter(Boolean).join(' · ') })),
            h('span', { class: 'tk-next__pfeil', 'aria-hidden': 'true', text: '→' }),
          ),
        ),
      ),
    );
  }
  nextEl.addEventListener('click', (ev) => {
    const a = (ev.target as Element).closest<HTMLAnchorElement>('a[data-id]');
    if (!a) return;
    ev.preventDefault();
    oeffnen(a.dataset.id!);
  });
  /** Termin in der Liste aufklappen und hinscrollen */
  function oeffnen(id: string) {
    const e = termine.find((x) => x.id === id);
    if (!e) return;
    suche = '';
    qEl.value = '';
    if (e.datum < heute) vergangene = true;
    kat = '';
    chips.forEach((c) => c.setAttribute('aria-pressed', String(!c.dataset.kat)));
    if (ansicht !== 'liste') ansichtSetzen('liste');
    offen = id;
    listeZeichnen();
    requestAnimationFrame(() => {
      const el = monateEl.querySelector(`[data-ev="${CSS.escape(id)}"]`);
      scrollenZu(el);
      el?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
      const d = monateEl.querySelector<HTMLElement>(`[data-detail="${CSS.escape(id)}"]`);
      if (d && bewegung) gsap.from(d, { height: 0, opacity: 0, duration: 0.6, delay: 0.3, ease: EASE, clearProps: 'height,opacity' });
    });
  }

  // ---------- Start ----------
  // #kategorie-buhne o. ä. wählt einen Filter vor
  const vorwahl = location.hash.match(/^#kategorie-([\w-]+)/)?.[1];
  const chip = vorwahl ? chips.find((c) => c.dataset.kat && norm(c.dataset.kat) === norm(vorwahl)) : undefined;
  if (chip) {
    kat = chip.dataset.kat!;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
  }
  nextZeichnen();
  listeZeichnen();
  kopfBewegen();
}

/** Netz im Kopf: Linien zeichnen sich ein, Punkte springen auf, Maus und Scrollen verschieben es leicht */
function kopfBewegen() {
  const kopf = document.querySelector<HTMLElement>('[data-tk-kopf]');
  const svg = kopf?.querySelector<SVGSVGElement>('[data-tk-netz]');
  if (!kopf || !svg) return;
  svg.classList.add('is-da');
  if (!motionOk()) return;
  gsap.fromTo(svg.querySelectorAll('line'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.2, ease: EASE, stagger: 0.0035 });
  gsap.fromTo(svg.querySelectorAll('rect'), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.6, ease: EASE, stagger: 0.005, delay: 0.3, clearProps: 'transform' });
  gsap.to(svg, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: kopf, start: 'top top', end: 'bottom top', scrub: true } });
  const qx = gsap.quickTo(svg, 'x', { duration: 1.4, ease: EASE });
  const qy = gsap.quickTo(svg, 'y', { duration: 1.4, ease: EASE });
  kopf.addEventListener('pointermove', (e) => {
    const r = kopf.getBoundingClientRect();
    qx(((e.clientX - r.left) / r.width - 0.5) * -24);
    qy(((e.clientY - r.top) / r.height - 0.5) * -14);
  });
  ueberschriften(kopf);
  gsap.from(kopf.querySelectorAll('[data-tk-rise]:not([hidden])'), { x: -40, opacity: 0, duration: 0.8, ease: EASE, stagger: 0.1, delay: 0.35, clearProps: 'transform,opacity' });
}
