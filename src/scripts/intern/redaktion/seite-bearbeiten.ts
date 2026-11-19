/**
 * Website-Inhalte → Seiten → „Auf der Seite bearbeiten“: die echte Seite der Website im Vollbild, ihre festen
 * Texte (src/settings/texte.json: Überschriften, Einleitungen, Knöpfe, Fuß) tippt man direkt auf der Seite.
 *
 * So funktioniert es: Die Seite wird in einem Rahmen geladen (gleiche Adresse). Danach sucht dieses Skript zu jedem
 * Text der Seite (und „Auf jeder Seite“) das Element, das genau diesen Text zeigt, und macht es beschreibbar.
 * Texte mit Platzhaltern ({zahl}), Texte in Attributen (Bildbeschreibung, Titel im Browser-Tab) und schon
 * ausgeblendete Texte stehen nicht so auf der Seite – sie bleiben unter Texte. Über dem Text mit dem Cursor steht eine
 * kleine Leiste: wo der Text steht, Zeichen, Zurücksetzen, Ausblenden (wo erlaubt).
 *
 * Gespeichert wird wie unter Texte (src/lib/texte-regeln.ts: prüfen, übernehmen, Datei schreiben) über die Funktion
 * „inhalte“; die Website zeigt die Änderung nach 2–3 Minuten. Listen und Inhalte (Partner, Personen, Formate …)
 * öffnet „Listen und Inhalte“ in der Leiste im Formular.
 */
import { alleTexte, dateiText, platzhalter, textId, textPruefen, uebernehmen, type TextEintrag, type TextSeite } from '../../../lib/texte-regeln';
import type { Redaktion } from './seite';
import { meldung, websiteUrl, zielName, zielUrl } from './seite';

const PFAD = 'src/settings/texte.json';
type Sprache = 'de' | 'en';
interface Wert {
  de: string;
  en: string;
  aus?: boolean;
}
interface Treffer {
  id: string;
  e: TextEintrag;
  els: HTMLElement[];
}

const norm = (s: string) => s.replace(/\s+/g, '');
/**
 * Text eines beschreibbaren Elements, wie er gespeichert wird: aus dem Inhalt (nicht innerText, das die
 * Großschreibung aus dem CSS übernähme); Zeilen an <br> und Blöcken (zweizeilige Überschriften).
 */
function lesen(el: HTMLElement, mehrzeilig: boolean): string {
  const teile: string[] = [];
  const gehen = (n: Node) => {
    for (const k of n.childNodes) {
      if (k.nodeType === Node.TEXT_NODE) teile.push(k.textContent ?? '');
      else if (k.nodeType === Node.ELEMENT_NODE) {
        // Element aus dem Rahmen: eigene Klassen und eigenes Fenster (kein instanceof, kein getComputedStyle von hier)
        const e = k as Element;
        if (e.tagName === 'BR') teile.push('\n');
        else {
          const block = /^(block|flex|grid|list-item|table)/.test(e.ownerDocument.defaultView?.getComputedStyle(e).display ?? 'inline');
          if (block) teile.push('\n');
          gehen(e);
          if (block) teile.push('\n');
        }
      }
    }
  };
  gehen(el);
  const text = teile.join('');
  return mehrzeilig
    ? text.split('\n').map((z) => z.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n')
    : text.replace(/\s+/g, ' ').trim();
}

const STIL = `
  [data-sb-text] { cursor: text; outline-offset: 4px; }
  [data-sb-text]:hover { outline: 1.5px dashed var(--cyan) !important; }
  [data-sb-text]:focus { outline: 2px solid var(--magenta) !important; }
  [data-sb-text].sb-geaendert:not(:focus) { outline: 2px dotted var(--magenta) !important; }
  [data-sb-aus] { opacity: 0.4; outline: 2px dashed var(--magenta) !important; }
  .sb-leiste { position: absolute; z-index: 2147483000; display: flex; flex-wrap: wrap; align-items: center; gap: 2px 8px; max-width: calc(100vw - 16px);
    padding: 4px 6px; background: var(--purple); color: #fff; font: 600 11px/1.4 var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; }
  .sb-leiste[hidden] { display: none; }
  .sb-leiste__wo { color: var(--cyan); }
  .sb-leiste__zahl[data-zu-lang] { color: var(--magenta); }
  .sb-leiste button { padding: 5px 8px; border: 0; background: transparent; color: #fff; font: inherit; letter-spacing: inherit; text-transform: inherit; cursor: pointer; }
  .sb-leiste button:hover { background: rgba(255, 255, 255, 0.14); }
  .sb-leiste button:focus-visible { outline: 2px solid var(--cyan); outline-offset: -2px; }
`;

export function seiteBearbeiten(r: Redaktion) {
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel);
  const root = $('[data-sb]')!;
  const frame = root.querySelector<HTMLIFrameElement>('iframe')!;
  const buehne = frame.parentElement as HTMLElement;
  const params = new URLSearchParams(location.search);
  let seite = params.get('s') ?? 'startseite';
  let pfad = params.get('pfad');
  let lang: Sprache = 'de';
  let geraet: 'computer' | 'handy' = 'computer';
  let datei: Record<string, unknown> = {};
  let sha: string | null = null;
  /** ungespeicherte Änderungen: id → beide Sprachen (und Ausblenden) */
  let neu = new Map<string, Wert>();
  let treffer: Treffer[] = [];
  const zurueckL: string[] = [];
  const vorL: string[] = [];
  let tippTimer = 0;
  let letzter = '[]';

  const seiteVon = (id: string) => datei[id] as TextSeite | undefined;
  const eintraege = () => alleTexte(datei).filter((x) => x.seite === seite || x.seite === 'allgemein');
  const wert = (id: string, e: TextEintrag): Wert => neu.get(id) ?? { de: e.de, en: e.en, aus: !!e.aus };
  const geaendert = (id: string, e: TextEintrag) => {
    const w = neu.get(id);
    return !!w && (w.de !== e.de || w.en !== e.en || !!w.aus !== !!e.aus);
  };
  const offen = () => eintraege().filter((x) => geaendert(textId(x.seite, x.abschnitt, x.key), x.e));

  // ---------- Leiste oben ----------
  function stand() {
    const n = offen().length;
    $('[data-sb-stand]')!.textContent = n ? `${n} ${n === 1 ? 'Änderung' : 'Änderungen'}, nicht gespeichert` : 'Alles gespeichert';
    $<HTMLButtonElement>('[data-sb-speichern]')!.disabled = !n;
    $<HTMLButtonElement>('[data-sb-verwerfen]')!.disabled = !n;
    $<HTMLButtonElement>('[data-sb-zurueck]')!.disabled = !zurueckL.length;
    $<HTMLButtonElement>('[data-sb-vor]')!.disabled = !vorL.length;
  }
  const schnappschuss = () => JSON.stringify([...neu]);
  /** Verlauf: Tippen kurz sammeln, dann ein Schritt */
  function merken(sofort = false) {
    window.clearTimeout(tippTimer);
    const tun = () => {
      const s = schnappschuss();
      if (s === letzter) return;
      zurueckL.push(letzter);
      letzter = s;
      vorL.length = 0;
      stand();
    };
    if (sofort) tun();
    else tippTimer = window.setTimeout(tun, 600);
  }
  function wiederherstellen(s: string) {
    neu = new Map(JSON.parse(s) as [string, Wert][]);
    letzter = s;
    for (const t of treffer) zeigen(t);
    stand();
  }

  function inhalteListe() {
    const ul = $('[data-sb-inhalte]')!;
    const s = seiteVon(seite);
    const ziele = s ? Object.entries(s.abschnitte).flatMap(([aid, a]) => (a.auch ?? []).map((z) => ({ ...z, von: `${seite}.${aid}` }))) : [];
    const li = (text: string, href: string) => {
      const a = Object.assign(document.createElement('a'), { href, target: '_blank', rel: 'noopener', textContent: text });
      const l = document.createElement('li');
      l.append(a);
      return l;
    };
    ul.replaceChildren(
      ...ziele.map((z) => li(`${z.text} · ${zielName(z.ziel)} ↗`, zielUrl(z.ziel, z.von))),
      li('Alle Texte dieser Seite (auch Platzhalter, Ausgeblendetes) ↗', `${location.pathname.replace(/seite-bearbeiten\/?$/, 'texte/')}?seite=${seite}`),
    );
  }

  // ---------- Rahmen ----------
  function groesse() {
    const platz = buehne.clientWidth - (geraet === 'handy' ? 24 : 0);
    const breite = geraet === 'handy' ? 390 : Math.max(1280, platz);
    const s = Math.min(1, platz / breite);
    frame.style.width = `${breite}px`;
    frame.style.height = `${Math.max(200, (buehne.clientHeight - (geraet === 'handy' ? 24 : 0)) / s)}px`;
    frame.style.transform = s < 1 ? `scale(${s})` : '';
    buehne.dataset.geraet = geraet;
  }
  new ResizeObserver(groesse).observe(buehne);

  function laden() {
    const s = seiteVon(seite);
    const p = pfad ?? s?.pfad ?? '';
    treffer = [];
    frame.src = websiteUrl(`${lang === 'en' ? 'en/' : ''}${p}`);
    $('[data-sb-titel]')!.textContent = s?.titel ?? 'Seite';
    const nurVorstand = !!s?.nurVorstand && !r.vorstand;
    meldung(nurVorstand ? 'Diese Seite ändert nur der Vorstand.' : '', 'error', $('[data-sb-meldung]'));
    root.dataset.gesperrt = String(nurVorstand);
    inhalteListe();
    groesse();
  }

  // ---------- Texte auf der Seite finden und beschreibbar machen ----------
  /** Text im Element zeigen (aus den Änderungen oder dem gespeicherten Stand) */
  function zeigen(t: Treffer) {
    const w = wert(t.id, t.e);
    const text = (lang === 'en' && w.en) || w.de;
    const anders = geaendert(t.id, t.e);
    for (const el of t.els) {
      const d = el.ownerDocument;
      if (d.activeElement !== el && lesen(el, true) !== text) {
        // Zeilen als <br>, sonst nur Text (eigene Auszeichnung der Zeilen geht dabei verloren, bis gespeichert ist)
        el.replaceChildren(...text.split('\n').flatMap((z, i) => (i ? [d.createElement('br'), d.createTextNode(z)] : [d.createTextNode(z)])));
      }
      el.classList.toggle('sb-geaendert', anders);
      if (w.aus) el.setAttribute('data-sb-aus', '');
      else el.removeAttribute('data-sb-aus');
    }
  }

  function einrichten(d: Document) {
    if (!d.body) return;
    const stil = d.createElement('style');
    stil.textContent = STIL;
    d.head.append(stil);
    // Links und Knöpfe der Seite führen beim Bearbeiten nirgendwohin
    d.addEventListener('click', (ev) => {
      const t = ev.target as Element;
      if (t.closest('.sb-leiste')) return;
      if (t.closest('a, button, label') || t.closest('[data-sb-text]')) ev.preventDefault();
    }, true);
    d.addEventListener('submit', (ev) => ev.preventDefault(), true);

    // Elemente nach Text (ohne Leerraum), nur sichtbare Inhalte
    const index = new Map<string, HTMLElement[]>();
    for (const el of d.body.querySelectorAll<HTMLElement>('*')) {
      if (/^(SCRIPT|STYLE|SVG|CANVAS|NOSCRIPT|TEMPLATE|IFRAME|IMG)$/i.test(el.tagName) || el.closest('svg')) continue;
      const k = norm(el.textContent ?? '');
      if (!k || k.length > 600) continue;
      const liste = index.get(k);
      if (liste) liste.push(el);
      else index.set(k, [el]);
    }
    const leiste = d.createElement('div');
    leiste.className = 'sb-leiste';
    leiste.hidden = true;
    d.body.append(leiste);

    treffer = [];
    for (const { seite: s, abschnitt, key, e } of eintraege()) {
      if (e.aus || platzhalter(e.de).length || /Browser-Tab|Suchmaschinen/.test(e.wo)) continue;
      const id = textId(s, abschnitt, key);
      // wie die Website den Text gerade zeigt: gespeicherter Stand oder (fester Testlauf) die ursprüngliche Fassung
      const kandidaten = lang === 'en' ? [e.en || e.de, e.ursprung?.en || e.ursprung?.de] : [e.de, e.ursprung?.de];
      let els: HTMLElement[] = [];
      for (const k of kandidaten) {
        if (!k) continue;
        const gefunden = index.get(norm(k)) ?? [];
        // das innerste Element mit genau diesem Text (nicht schon vergeben)
        els = gefunden.filter((el) => !gefunden.some((o) => o !== el && el.contains(o)) && !el.closest('[data-sb-text]'));
        if (els.length) break;
      }
      if (!els.length) continue;
      const t: Treffer = { id, e, els };
      treffer.push(t);
      const mehrzeilig = (e.zeilen ?? 1) > 1 || e.de.includes('\n');
      for (const el of els) beschreibbar(el, t, mehrzeilig, leiste);
      zeigen(t);
    }
    $('[data-sb-zahl]')!.textContent = `${treffer.length} Texte auf dieser Seite beschreibbar`;
  }

  function beschreibbar(el: HTMLElement, t: Treffer, mehrzeilig: boolean, leiste: HTMLElement) {
    if (root.dataset.gesperrt === 'true') return;
    try {
      el.contentEditable = mehrzeilig ? 'true' : 'plaintext-only';
    } catch {
      el.contentEditable = 'true';
    }
    el.setAttribute('data-sb-text', t.id);
    el.spellcheck = true;
    el.title = `${t.e.wo}: zum Bearbeiten klicken`;
    const d = el.ownerDocument;
    const leisteZeigen = () => {
      const w = wert(t.id, t.e);
      const text = lesen(el, mehrzeilig);
      const knopf = (txt: string, fn: () => void) => {
        const b = d.createElement('button');
        b.type = 'button';
        b.textContent = txt;
        b.addEventListener('mousedown', (ev) => ev.preventDefault());
        b.addEventListener('click', fn);
        return b;
      };
      const zahl = d.createElement('span');
      zahl.className = 'sb-leiste__zahl';
      zahl.textContent = t.e.max ? `${text.length} / ${t.e.max}` : `${text.length} Zeichen`;
      if (t.e.max && text.length > t.e.max) zahl.setAttribute('data-zu-lang', '');
      const wo = d.createElement('span');
      wo.className = 'sb-leiste__wo';
      wo.textContent = `${t.e.wo}${lang === 'en' ? ' · Englisch' : ''}`;
      leiste.replaceChildren(wo, zahl);
      if (geaendert(t.id, t.e)) {
        leiste.append(knopf('↺ Zurücksetzen', () => {
          neu.delete(t.id);
          el.blur();
          zeigen(t);
          merken(true);
          stand();
        }));
      }
      if (t.e.ausblendbar) {
        leiste.append(knopf(w.aus ? 'Wieder anzeigen' : 'Ausblenden', () => {
          neu.set(t.id, { ...w, de: w.de, en: w.en, aus: !w.aus });
          zeigen(t);
          merken(true);
          stand();
          leisteZeigen();
        }));
      }
      leiste.hidden = false;
      const rect = el.getBoundingClientRect();
      const top = rect.top + (d.defaultView?.scrollY ?? 0) - leiste.offsetHeight - 8;
      leiste.style.top = `${Math.max((d.defaultView?.scrollY ?? 0) + 4, top)}px`;
      leiste.style.left = `${Math.max(8, Math.min(rect.left + (d.defaultView?.scrollX ?? 0), (d.defaultView?.innerWidth ?? 800) - leiste.offsetWidth - 8))}px`;
    };
    el.addEventListener('focus', leisteZeigen);
    el.addEventListener('blur', () => {
      leiste.hidden = true;
      zeigen(t);
    });
    el.addEventListener('input', () => {
      const w = wert(t.id, t.e);
      const text = lesen(el, mehrzeilig);
      neu.set(t.id, lang === 'en' ? { ...w, en: text } : { ...w, de: text });
      // dieselbe Stelle anderswo auf der Seite (z. B. Menü und Fuß) mitziehen
      for (const o of t.els) if (o !== el) o.textContent = text;
      el.classList.toggle('sb-geaendert', geaendert(t.id, t.e));
      merken();
      stand();
      leisteZeigen();
    });
    el.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') el.blur();
      else if (ev.key === 'Enter') {
        ev.preventDefault();
        if (mehrzeilig && !ev.shiftKey) d.execCommand('insertLineBreak');
        else if (!mehrzeilig) el.blur();
      } else if ((ev.ctrlKey || ev.metaKey) && /^[biu]$/i.test(ev.key)) ev.preventDefault(); // keine Auszeichnung
    });
    el.addEventListener('paste', (ev) => {
      ev.preventDefault();
      const text = ev.clipboardData?.getData('text/plain') ?? '';
      d.execCommand('insertText', false, mehrzeilig ? text : text.replace(/\s*\n\s*/g, ' '));
    });
  }

  frame.addEventListener('load', () => {
    const d = frame.contentDocument;
    if (!d) return;
    // Rückgängig/Wiederholen auch im Rahmen (Strg+Z außerhalb eines Textes)
    d.addEventListener('keydown', tasten);
    // warten, bis der Auftritt der Köpfe die Wörter der Headline wieder zusammengesetzt hat
    const start = Date.now();
    const warten = () => (d.querySelector('.kopf-wort') && Date.now() - start < 4000 ? window.setTimeout(warten, 150) : einrichten(d));
    window.setTimeout(warten, 300);
  });

  // ---------- Knöpfe ----------
  const zurueck = () => {
    merken(true);
    if (!zurueckL.length) return;
    vorL.push(letzter);
    wiederherstellen(zurueckL.pop()!);
  };
  const vor = () => {
    merken(true);
    if (!vorL.length) return;
    zurueckL.push(letzter);
    wiederherstellen(vorL.pop()!);
  };
  function tasten(ev: KeyboardEvent) {
    if (!(ev.ctrlKey || ev.metaKey)) return;
    const k = ev.key.toLowerCase();
    if (k !== 'z' && k !== 'y') return;
    ev.preventDefault();
    (ev.target as HTMLElement | null)?.blur?.();
    if (k === 'y' || ev.shiftKey) vor();
    else zurueck();
  }
  document.addEventListener('keydown', (ev) => {
    if (!(ev.target as Element).closest('input, textarea, select')) tasten(ev);
  });
  $('[data-sb-zurueck]')!.addEventListener('click', zurueck);
  $('[data-sb-vor]')!.addEventListener('click', vor);
  root.querySelectorAll<HTMLButtonElement>('[data-sb-geraet]').forEach((b) =>
    b.addEventListener('click', () => {
      geraet = b.dataset.sbGeraet === 'handy' ? 'handy' : 'computer';
      root.querySelectorAll('[data-sb-geraet]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      groesse();
    }),
  );
  root.querySelectorAll<HTMLButtonElement>('[data-sb-sprache]').forEach((b) =>
    b.addEventListener('click', () => {
      lang = b.dataset.sbSprache === 'en' ? 'en' : 'de';
      root.querySelectorAll('[data-sb-sprache]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      laden();
    }),
  );
  const wahl = $<HTMLSelectElement>('[data-sb-seite]')!;
  wahl.value = seite;
  wahl.addEventListener('change', () => {
    if (offen().length && !confirm('Es gibt ungespeicherte Änderungen. Trotzdem die Seite wechseln? Sie gehen dann verloren.')) {
      wahl.value = seite;
      return;
    }
    seite = wahl.value;
    pfad = null;
    neu = new Map();
    zurueckL.length = 0;
    vorL.length = 0;
    letzter = '[]';
    history.replaceState(null, '', `?s=${seite}`);
    laden();
    stand();
  });
  $('[data-sb-verwerfen]')!.addEventListener('click', () => {
    if (!confirm('Alle ungespeicherten Änderungen verwerfen?')) return;
    merken(true);
    zurueckL.push(letzter);
    wiederherstellen('[]');
  });
  $<HTMLButtonElement>('[data-sb-speichern]')!.addEventListener('click', async () => {
    const liste = offen();
    for (const x of liste) {
      const id = textId(x.seite, x.abschnitt, x.key);
      const w = neu.get(id)!;
      const fehler = textPruefen(x.e, w.de, x.e.de, 'de') ?? textPruefen(x.e, w.en, x.e.en || x.e.de, 'en');
      if (fehler) {
        meldung(`${x.e.wo}: ${fehler}`, 'error', $('[data-sb-meldung]'));
        treffer.find((t) => t.id === id)?.els[0]?.focus();
        return;
      }
    }
    const kopie = structuredClone(datei);
    const n = uebernehmen(kopie, new Map(liste.map((x) => [textId(x.seite, x.abschnitt, x.key), neu.get(textId(x.seite, x.abschnitt, x.key))!])));
    if (!n) return stand();
    const knopf = $<HTMLButtonElement>('[data-sb-speichern]')!;
    knopf.disabled = true;
    try {
      const namen = [...new Set(liste.map((x) => (datei[x.seite] as TextSeite).titel))].join(', ');
      await r.a.speichern(`Texte: ${namen} (${n} ${n === 1 ? 'Text' : 'Texte'}, auf der Seite)`, [{ pfad: PFAD, text: dateiText(kopie), alt: sha }]);
      await dateiLaden();
      // neue Fassung ist jetzt der gespeicherte Stand; die Treffer zeigen auf die neuen Einträge
      const nach = new Map(alleTexte(datei).map((x) => [textId(x.seite, x.abschnitt, x.key), x.e]));
      for (const t of treffer) t.e = nach.get(t.id) ?? t.e;
      neu = new Map();
      zurueckL.length = 0;
      vorL.length = 0;
      letzter = '[]';
      for (const t of treffer) zeigen(t);
      meldung(`Gespeichert: ${n} ${n === 1 ? 'Text' : 'Texte'}. Die Website zeigt das in 2–3 Minuten.`, 'ok', $('[data-sb-meldung]'));
    } catch (e) {
      meldung((e as Error).message, 'error', $('[data-sb-meldung]'));
    } finally {
      stand();
    }
  });
  addEventListener('beforeunload', (ev) => {
    if (offen().length) ev.preventDefault();
  });

  async function dateiLaden() {
    const g = await r.a.lesen([PFAD]);
    const d = g.dateien[PFAD];
    if (!d) throw new Error('Die Datei mit den Texten gibt es im Repository noch nicht (src/settings/texte.json).');
    sha = d.sha;
    datei = JSON.parse(d.text) as Record<string, unknown>;
  }

  return (async () => {
    try {
      await dateiLaden();
      root.hidden = false;
      laden();
      stand();
    } catch (e) {
      meldung((e as Error).message);
    }
  })();
}
