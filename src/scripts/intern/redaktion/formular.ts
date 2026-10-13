/**
 * Formulare der Redaktion: baut aus den Felddefinitionen (bereiche.ts) die Eingabefelder,
 * bindet sie an den Eintrag und prüft sie vor dem Speichern.
 */
import { renderMarkdown } from '../../../lib/markdown';
import { slugify } from '../../../lib/supabase';
import type { Bereich, Feld, Option } from './bereiche';
import { aufloesen, holen, leer, relativ, setzen, type Daten, type Eintrag } from './daten';

export interface FormKontext {
  vorstand: boolean;
  neu: boolean;
  /** JSON-Einstellungen: leere Pflichttexte bleiben als '' stehen */
  json: boolean;
  /** Pfad der Inhaltsdatei (für relative Bildpfade) */
  dateiPfad: string;
  optionen(quelle: string): Option[];
  /** vorhandene Dateien eines Ordners (Fotos, Downloads), inkl. neu hochgeladener */
  dateien(ordner: string): string[];
  /** Vorschau-Adresse eines Fotos (lädt bei Bedarf über die Redaktion) */
  vorschau(pfad: string): Promise<string | null>;
  /** Datei vormerken (wird mit dem Eintrag gespeichert); gibt den Pfad im Repository zurück */
  hochladen(ordner: string, datei: File): Promise<string>;
  geaendert(): void;
}

interface Bindung {
  lesen(): any;
  schreiben(v: any): void;
}
interface Baustein {
  el: HTMLElement;
  /** Fehlermeldung oder null; zeigt den Fehler am Feld */
  pruefen(): string | null;
  fokus(): void;
}

let zaehler = 0;
const neueId = () => `rf-${++zaehler}`;

function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, any> = {}, ...kinder: (Node | string | null | undefined | false)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k in el && typeof v !== 'string') (el as any)[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kinder) if (c) el.append(c);
  return el;
}

const URL_OK = (s: string) => /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(s);
const MAIL_OK = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/** Rahmen eines Feldes: Label, Hilfe, Fehlerzeile */
function rahmen(f: Feld, id: string, steuer: HTMLElement, opts: { en?: boolean; fieldset?: boolean; gesperrt?: boolean } = {}) {
  const fehler = h('p', { class: 'rf-fehler', id: `${id}-f`, hidden: true });
  const hilfe = !opts.en && f.hilfe ? h('span', { class: 'i-hint', id: `${id}-h`, text: f.hilfe }) : null;
  const pflicht = !opts.en && 'pflicht' in f && !!f.pflicht;
  // „Pflicht“ sagen Screenreader über aria-required an (bei Gruppen über die Legende)
  const titel = [
    f.label,
    opts.en ? ' ' : null,
    opts.en ? h('span', { class: 'rf-lang', text: 'Englisch' }) : null,
    pflicht ? ' ' : null,
    pflicht ? h('span', { class: 'rf-pflicht', text: 'Pflicht', 'aria-hidden': opts.fieldset ? undefined : 'true' }) : null,
  ];
  const el = opts.fieldset
    ? h('fieldset', { class: 'i-field rf-feld rf-set' }, h('legend', { class: 'i-legend' }, ...titel), steuer, hilfe, fehler)
    : h('div', { class: 'i-field rf-feld' }, h('label', { for: id }, ...titel), steuer, hilfe, fehler);
  if (opts.en) el.classList.add('rf-feld--en');
  if (pflicht && !opts.fieldset) steuer.querySelectorAll('input:not([type=file]), textarea, select').forEach((x) => x.setAttribute('aria-required', 'true'));
  if (pflicht && !opts.fieldset && steuer.matches('input, textarea, select')) steuer.setAttribute('aria-required', 'true');
  const beschrieben = [hilfe && `${id}-h`, `${id}-f`].filter(Boolean).join(' ');
  const zeigen = (text: string | null) => {
    fehler.textContent = text ?? '';
    fehler.hidden = !text;
    el.querySelectorAll('input, textarea, select').forEach((x) => {
      if (text) x.setAttribute('aria-invalid', 'true');
      else x.removeAttribute('aria-invalid');
    });
  };
  return { el, zeigen, beschrieben };
}

/** Wert schreiben: leere optionale Werte verschwinden aus der Datei (JSON: bleiben, wenn sie schon da waren) */
function schreibe(bind: Bindung, f: Feld, v: any, k: FormKontext) {
  if (f.typ === 'janein') {
    const vorher = bind.lesen();
    bind.schreiben(vorher === undefined && v === (f.standard ?? false) ? undefined : v);
    return;
  }
  if (leer(v)) {
    const vorher = bind.lesen();
    bind.schreiben(k.json && vorher !== undefined ? (Array.isArray(vorher) ? [] : '') : undefined);
    return;
  }
  bind.schreiben(v);
}

function textPruefen(f: Feld, v: string): string | null {
  if (!v) return 'pflicht' in f && f.pflicht ? 'Bitte ausfüllen.' : null;
  if (f.typ === 'url' && !URL_OK(v)) return 'Bitte eine vollständige Adresse mit https:// eintragen.';
  if (f.typ === 'email' && !MAIL_OK(v)) return 'Das sieht nicht wie eine E-Mail-Adresse aus.';
  if ((f.typ === 'text' || f.typ === 'textlang') && f.max && v.length > f.max) return `Höchstens ${f.max} Zeichen (jetzt ${v.length}).`;
  if (f.typ === 'text' && f.muster && !f.muster[0].test(v)) return f.muster[1];
  if (/<\/?[a-z][a-z0-9-]*(\s[^>]*)?\/?>/i.test(v.replace(/<!--[\s\S]*?-->/g, ''))) return 'Eigenes HTML ist nicht erlaubt.';
  return null;
}

// ---------- einzelne Feldtypen ----------

function textFeld(f: Feld, bind: Bindung, k: FormKontext, en: boolean, gesperrt: boolean): Baustein {
  const id = neueId();
  const lang = f.typ === 'textlang';
  const typ = f.typ === 'url' ? 'url' : f.typ === 'email' ? 'email' : 'text';
  const wert = bind.lesen();
  const steuer = lang
    ? h('textarea', { id, rows: (f.typ === 'textlang' && f.zeilen) || 3, disabled: gesperrt })
    : h('input', { id, type: typ, disabled: gesperrt, autocomplete: 'off', spellcheck: typ === 'text' ? 'true' : 'false' });
  steuer.value = f.typ === 'schlagworte' ? (Array.isArray(wert) ? wert.join(', ') : '') : wert == null ? '' : String(wert);
  if ('platzhalter' in f && f.platzhalter && !en) steuer.placeholder = f.platzhalter;
  if (en) steuer.lang = 'en';
  const r = rahmen(f, id, steuer, { en });
  steuer.setAttribute('aria-describedby', r.beschrieben);
  const lesen = () => {
    const v = steuer.value.trim();
    return f.typ === 'schlagworte' ? v.split(',').map((x) => x.trim()).filter(Boolean) : v;
  };
  steuer.addEventListener('input', () => {
    schreibe(bind, f, lesen(), k);
    k.geaendert();
  });
  return {
    el: r.el,
    pruefen: () => {
      const v = steuer.value.trim();
      const fehler = en ? (v ? textPruefen({ ...f, pflicht: false } as Feld, v) : null) : f.typ === 'schlagworte' ? null : textPruefen(f, v);
      r.zeigen(fehler);
      return fehler;
    },
    fokus: () => steuer.focus(),
  };
}

function markdownFeld(f: Feld, bind: Bindung, k: FormKontext, en: boolean, gesperrt: boolean): Baustein {
  const id = neueId();
  const ta = h('textarea', { id, class: 'rf-md__ta', rows: 14, disabled: gesperrt, lang: en ? 'en' : undefined });
  ta.value = bind.lesen() ?? '';
  const vorschau = h('div', { class: 'rf-md__preview', hidden: true });
  const knopf = (cmd: string, label: string, icon: string) => h('button', { type: 'button', 'data-cmd': cmd, title: label, 'aria-label': label, disabled: gesperrt }, h('span', { 'aria-hidden': 'true', text: icon }));
  const tabs = ['Schreiben', 'Vorschau'].map((t, i) => h('button', { type: 'button', class: 'rf-md__tab', 'aria-pressed': String(i === 0), text: t }));
  const leiste = h('div', { class: 'rf-md__tools', role: 'toolbar', 'aria-label': `${f.label}: Formatierung` },
    knopf('h', 'Zwischenüberschrift', 'H'), knopf('b', 'Fett', 'B'), knopf('list', 'Aufzählung', '•'), knopf('quote', 'Zitat', '„'), knopf('link', 'Link', '↗'),
    h('span', { class: 'rf-md__sep' }), ...tabs);
  const steuer = h('div', { class: 'rf-md' }, leiste, ta, vorschau);
  const r = rahmen(f, id, steuer, { en });
  ta.setAttribute('aria-describedby', r.beschrieben);
  const geaendert = () => {
    schreibe(bind, f, ta.value.replace(/\s+$/, ''), k);
    k.geaendert();
  };
  ta.addEventListener('input', geaendert);
  const wrap = (vor: string, nach: string, ph: string) => {
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e) || ph;
    ta.setRangeText(vor + sel + nach, s, e, 'select');
    ta.setSelectionRange(s + vor.length, s + vor.length + sel.length);
    ta.focus();
    geaendert();
  };
  const zeilen = (prefix: string, ph: string) => {
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const start = value.lastIndexOf('\n', s - 1) + 1;
    const nl = value.indexOf('\n', e);
    const ende = nl === -1 ? value.length : nl;
    const teile = (value.slice(start, ende) || ph).split('\n').map((l) => l.replace(/^(#+ |> ?|- )/, '')).filter((l) => l.trim());
    const block = prefix === '> ' ? teile.map((l) => `> ${l}`).join('\n>\n') : teile.map((l) => prefix + l).join('\n');
    const luecke = start > 0 && value.slice(0, start).trimEnd() !== '' && !value.slice(0, start).endsWith('\n\n') ? '\n' : '';
    ta.setRangeText(luecke + block, start, ende, 'end');
    ta.focus();
    geaendert();
  };
  leiste.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!b) return;
    const cmd = b.dataset.cmd;
    if (cmd === 'b') wrap('**', '**', 'fetter Text');
    if (cmd === 'h') zeilen('## ', 'Zwischenüberschrift');
    if (cmd === 'list') zeilen('- ', 'Punkt');
    if (cmd === 'quote') zeilen('> ', 'Zitat');
    if (cmd === 'link') {
      const url = prompt('Adresse des Links (https://… oder /kontakt/ für eine Seite der Website):', 'https://');
      if (url && url !== 'https://') wrap('[', `](${url.trim()})`, 'Linktext');
    }
    if (tabs.includes(b)) {
      const zeige = b === tabs[1];
      tabs.forEach((t) => t.setAttribute('aria-pressed', String(t === b)));
      if (zeige) vorschau.innerHTML = renderMarkdown(ta.value.replace(/<!--[\s\S]*?-->/g, ''), import.meta.env.BASE_URL) || '<p class="i-hint">Noch kein Text.</p>';
      vorschau.hidden = !zeige;
      ta.hidden = zeige;
    }
  });
  return {
    el: r.el,
    pruefen: () => {
      const v = ta.value.trim();
      const fehler = !v && !en && 'pflicht' in f && f.pflicht ? 'Bitte ausfüllen.' : v ? textPruefen({ ...f, typ: 'textlang', pflicht: false } as Feld, v) : null;
      r.zeigen(fehler);
      return fehler;
    },
    fokus: () => ta.focus(),
  };
}

function auswahlFeld(f: Extract<Feld, { typ: 'auswahl' | 'verweis' }>, optionen: Option[], bind: Bindung, k: FormKontext, gesperrt: boolean): Baustein {
  const id = neueId();
  const wert = bind.lesen() ?? '';
  const sel = h('select', { id, disabled: gesperrt },
    h('option', { value: '', text: f.pflicht ? '– bitte wählen –' : '– keine –' }),
    ...optionen.map((o) => h('option', { value: o.wert, text: o.label })));
  // Unbekannter Wert (z. B. Verweis auf gelöschten Eintrag) bleibt sichtbar
  if (wert && !optionen.some((o) => o.wert === wert)) sel.append(h('option', { value: wert, text: `${wert} (unbekannt)` }));
  sel.value = wert;
  const r = rahmen(f, id, sel);
  sel.setAttribute('aria-describedby', r.beschrieben);
  sel.addEventListener('change', () => {
    schreibe(bind, f, sel.value, k);
    k.geaendert();
  });
  return {
    el: r.el,
    pruefen: () => {
      const fehler = f.pflicht && !sel.value ? 'Bitte auswählen.' : null;
      r.zeigen(fehler);
      return fehler;
    },
    fokus: () => sel.focus(),
  };
}

function mehrfachFeld(f: Extract<Feld, { typ: 'mehrfach' | 'verweis' }>, optionen: Option[], bind: Bindung, k: FormKontext, gesperrt: boolean): Baustein {
  const id = neueId();
  const gewaehlt = new Set<string>((bind.lesen() as string[] | undefined) ?? []);
  const viele = optionen.length > 12;
  const boxen = optionen.map((o) =>
    h('label', { class: 'i-check rf-opt' }, h('input', { type: 'checkbox', value: o.wert, checked: gewaehlt.has(o.wert), disabled: gesperrt }), h('span', { text: o.label })),
  );
  for (const w of gewaehlt) if (!optionen.some((o) => o.wert === w)) boxen.push(h('label', { class: 'i-check rf-opt' }, h('input', { type: 'checkbox', value: w, checked: true }), h('span', { text: `${w} (unbekannt)` })));
  const zahl = h('span', { class: 'rf-anzahl', 'aria-live': 'polite' });
  const suche = viele ? h('input', { type: 'search', class: 'rf-suche', placeholder: 'Namen suchen …', 'aria-label': `${f.label}: suchen`, disabled: gesperrt }) : null;
  const liste = h('div', { class: viele ? 'rf-opts rf-opts--viele' : 'rf-opts' }, ...boxen);
  const steuer = h('div', {}, suche, liste, viele ? zahl : null);
  const r = rahmen(f, id, steuer, { fieldset: true });
  const werte = () => boxen.map((b) => b.querySelector('input')!).filter((i) => i.checked).map((i) => i.value);
  const zaehlen = () => (zahl.textContent = `${werte().length} ausgewählt`);
  zaehlen();
  liste.addEventListener('change', () => {
    // Reihenfolge wie in den Optionen
    schreibe(bind, f, werte(), k);
    zaehlen();
    k.geaendert();
  });
  suche?.addEventListener('input', () => {
    const q = suche.value.trim().toLowerCase();
    boxen.forEach((b) => (b.hidden = !!q && !b.textContent!.toLowerCase().includes(q)));
  });
  const min = f.typ === 'mehrfach' ? (f.min ?? 0) : 0;
  return {
    el: r.el,
    pruefen: () => {
      const n = werte().length;
      const fehler = f.pflicht && n < Math.max(1, min) ? `Bitte mindestens ${Math.max(1, min) === 1 ? 'eins' : Math.max(1, min)} auswählen.` : null;
      r.zeigen(fehler);
      return fehler;
    },
    fokus: () => (suche ?? boxen[0]?.querySelector('input'))?.focus(),
  };
}

function janeinFeld(f: Extract<Feld, { typ: 'janein' }>, bind: Bindung, k: FormKontext, gesperrt: boolean): Baustein {
  const box = h('input', { type: 'checkbox', checked: bind.lesen() ?? f.standard ?? false, disabled: gesperrt });
  box.addEventListener('change', () => {
    schreibe(bind, f, box.checked, k);
    k.geaendert();
  });
  const el = h('div', { class: 'rf-feld' }, h('label', { class: 'i-check' }, box, h('span', { text: f.label })), f.hilfe ? h('span', { class: 'i-hint', text: f.hilfe }) : null);
  return { el, pruefen: () => null, fokus: () => box.focus() };
}

function zahlFeld(f: Extract<Feld, { typ: 'zahl' }>, bind: Bindung, k: FormKontext, gesperrt: boolean): Baustein {
  const id = neueId();
  const inp = h('input', { id, type: 'number', step: f.schritt ?? 'any', min: f.min, max: f.max, disabled: gesperrt, inputmode: 'decimal' });
  inp.value = bind.lesen() ?? '';
  const r = rahmen(f, id, inp);
  inp.setAttribute('aria-describedby', r.beschrieben);
  inp.addEventListener('input', () => {
    schreibe(bind, f, inp.value === '' ? undefined : Number(inp.value), k);
    k.geaendert();
  });
  return {
    el: r.el,
    pruefen: () => {
      const v = inp.value === '' ? null : Number(inp.value);
      const fehler =
        v === null ? (f.pflicht ? 'Bitte eine Zahl eintragen.' : null)
        : Number.isNaN(v) ? 'Das ist keine Zahl.'
        : f.min !== undefined && v < f.min ? `Mindestens ${f.min}.`
        : f.max !== undefined && v > f.max ? `Höchstens ${f.max}.`
        : null;
      r.zeigen(fehler);
      return fehler;
    },
    fokus: () => inp.focus(),
  };
}

function datumFeld(f: Extract<Feld, { typ: 'datum' }>, bind: Bindung, k: FormKontext, gesperrt: boolean): Baustein {
  const id = neueId();
  const inp = h('input', { id, type: 'date', disabled: gesperrt });
  inp.value = String(bind.lesen() ?? '').slice(0, 10);
  const r = rahmen(f, id, inp);
  inp.setAttribute('aria-describedby', r.beschrieben);
  inp.addEventListener('input', () => {
    schreibe(bind, f, inp.value, k);
    k.geaendert();
  });
  return {
    el: r.el,
    pruefen: () => {
      const v = inp.value;
      const fehler = !v ? (f.pflicht ? 'Bitte ein Datum wählen.' : null) : f.montag && new Date(`${v}T12:00:00Z`).getUTCDay() !== 1 ? 'Bitte den Montag der Woche wählen.' : null;
      r.zeigen(fehler);
      return fehler;
    },
    fokus: () => inp.focus(),
  };
}

function datumZeitFeld(f: Extract<Feld, { typ: 'datumzeit' }>, bind: Bindung, k: FormKontext, gesperrt: boolean): Baustein {
  const id = neueId();
  const [d0, t0] = String(bind.lesen() ?? '').split(/[ T]/);
  const datum = h('input', { id, type: 'date', disabled: gesperrt, 'aria-label': `${f.label}: Datum` });
  const zeit = h('input', { type: 'time', disabled: gesperrt, 'aria-label': `${f.label}: Uhrzeit` });
  datum.value = d0 ?? '';
  zeit.value = t0?.slice(0, 5) ?? '';
  const steuer = h('div', { class: 'rf-dz' }, datum, zeit);
  const r = rahmen(f, id, steuer, { fieldset: true });
  [datum, zeit].forEach((x) => {
    x.setAttribute('aria-describedby', r.beschrieben);
    x.addEventListener('input', () => {
      schreibe(bind, f, datum.value && zeit.value ? `${datum.value} ${zeit.value}` : datum.value || zeit.value ? `${datum.value} ${zeit.value}`.trim() : '', k);
      k.geaendert();
    });
  });
  return {
    el: r.el,
    pruefen: () => {
      const fehler = !datum.value && !zeit.value ? (f.pflicht ? 'Bitte Datum und Uhrzeit eintragen.' : null) : !datum.value || !zeit.value ? 'Bitte Datum und Uhrzeit eintragen.' : null;
      r.zeigen(fehler);
      return fehler;
    },
    fokus: () => datum.focus(),
  };
}

const ORDNER: Record<string, string> = { photos: 'src/assets/photos', personen: 'src/assets/personen', foerderer: 'src/assets/foerderer', downloads: 'public/downloads' };

function dateiFeld(f: Extract<Feld, { typ: 'bild' | 'pdf' }>, bind: Bindung, k: FormKontext, gesperrt: boolean): Baustein {
  const id = neueId();
  const ordnerKey = f.typ === 'pdf' ? 'downloads' : f.ordner;
  const ordner = ORDNER[ordnerKey];
  const bild = f.typ === 'bild';
  // Wert → Pfad im Repository
  const zuPfad = (v: string | undefined): string | null => {
    if (!v) return null;
    if (!bild) return `public/${v}`;
    return f.form === 'name' ? `${ordner}/${v}` : aufloesen(k.dateiPfad, v);
  };
  const zuWert = (pfad: string | null) => {
    if (!pfad) return '';
    if (!bild) return pfad.replace(/^public\//, '');
    return f.form === 'name' ? pfad.split('/').pop()! : relativ(k.dateiPfad, pfad);
  };
  let pfad = zuPfad(bind.lesen());
  const sel = h('select', { id, disabled: gesperrt });
  const img = h('img', { alt: '', hidden: true });
  const leerText = h('span', { text: bild ? 'Kein Foto' : 'Keine Datei' });
  const rahmenBild = bild ? h('div', { class: 'rf-bild__frame' }, img, leerText) : null;
  const eingabe = h('input', { type: 'file', accept: bild ? 'image/jpeg,image/png,image/webp' : 'application/pdf', disabled: gesperrt });
  const hochladen = h('label', { class: 'btn btn--secondary btn--sm rf-upload' }, bild ? 'Neues Foto hochladen' : 'PDF hochladen', eingabe);
  const status = h('span', { class: 'i-hint', 'aria-live': 'polite' });
  const fuellen = () => {
    const namen = k.dateien(ordnerKey);
    sel.replaceChildren(h('option', { value: '', text: bild ? '– kein Foto –' : '– keine Datei –' }), ...namen.map((n) => h('option', { value: `${ordner}/${n}`, text: n })));
    if (pfad && !namen.includes(pfad.split('/').pop()!)) sel.append(h('option', { value: pfad, text: `${pfad.split('/').pop()} (fehlt)` }));
    sel.value = pfad ?? '';
  };
  const zeigen = async () => {
    if (!bild) return;
    leerText.textContent = pfad ? 'Vorschau lädt …' : 'Kein Foto';
    img.hidden = true;
    const src = pfad ? await k.vorschau(pfad) : null;
    if (src && sel.value === (pfad ?? '')) {
      img.src = src;
      img.hidden = false;
    } else if (pfad) leerText.textContent = 'Keine Vorschau';
  };
  const setze = (p: string | null) => {
    pfad = p;
    schreibe(bind, f, zuWert(p), k);
    k.geaendert();
    void zeigen();
  };
  fuellen();
  void zeigen();
  sel.addEventListener('change', () => setze(sel.value || null));
  eingabe.addEventListener('change', async () => {
    const datei = eingabe.files?.[0];
    if (!datei) return;
    status.textContent = 'Wird vorbereitet …';
    try {
      const p = await k.hochladen(ordnerKey, datei);
      fuellen();
      sel.value = p;
      setze(p);
      status.textContent = `„${p.split('/').pop()}“ wird beim Speichern hochgeladen.`;
    } catch (e) {
      status.textContent = String((e as Error).message ?? e);
    }
    eingabe.value = '';
  });
  const seite = h('div', { class: 'rf-bild__side' }, sel, hochladen, status);
  const steuer = h('div', { class: bild ? 'rf-bild' : 'rf-bild rf-bild--pdf' }, rahmenBild, seite);
  const r = rahmen(f, id, steuer);
  sel.setAttribute('aria-describedby', r.beschrieben);
  return {
    el: r.el,
    pruefen: () => {
      const fehler = f.pflicht && !pfad ? (bild ? 'Bitte ein Foto wählen.' : 'Bitte eine Datei wählen.') : null;
      r.zeigen(fehler);
      return fehler;
    },
    fokus: () => sel.focus(),
  };
}

/** Liste einfacher Werte (Wörter, Beträge) */
function werteFeld(f: Extract<Feld, { typ: 'werte' }>, bind: Bindung, k: FormKontext, en: boolean, gesperrt: boolean): Baustein {
  const id = neueId();
  let werte: (string | number)[] = [...((bind.lesen() as (string | number)[] | undefined) ?? [])];
  const liste = h('ol', { class: 'rf-werte' });
  const neu = h('button', { type: 'button', class: 'i-linkbtn', text: `+ ${f.neu}`, disabled: gesperrt });
  const fehlerZeile = { set: (_: string | null) => {} };
  const speichern = () => {
    schreibe(bind, f, werte.filter((w) => w !== '' && !(typeof w === 'number' && Number.isNaN(w))), k);
    k.geaendert();
  };
  const render = (fokusIndex?: number, fokusAuf?: string) => {
    liste.replaceChildren(
      ...werte.map((w, i) => {
        const inp = h('input', { type: f.art === 'zahl' ? 'number' : 'text', 'aria-label': `${f.label}${en ? ' (Englisch)' : ''} ${i + 1}`, disabled: gesperrt, lang: en ? 'en' : undefined });
        inp.value = String(w ?? '');
        inp.addEventListener('input', () => {
          werte[i] = f.art === 'zahl' ? (inp.value === '' ? '' : Number(inp.value)) : inp.value.trim();
          speichern();
        });
        const knopf = (text: string, label: string, fn: () => void, aus = false) =>
          h('button', { type: 'button', class: 'rf-mini', 'aria-label': `${label}: ${w || i + 1}`, title: label, disabled: gesperrt || aus, onclick: fn, 'data-k': text }, text);
        return h('li', {}, inp,
          knopf('↑', 'Nach oben', () => { [werte[i - 1], werte[i]] = [werte[i], werte[i - 1]]; speichern(); render(i - 1, '↑'); }, i === 0),
          knopf('↓', 'Nach unten', () => { [werte[i + 1], werte[i]] = [werte[i], werte[i + 1]]; speichern(); render(i + 1, '↓'); }, i === werte.length - 1),
          knopf('✕', 'Entfernen', () => { werte.splice(i, 1); speichern(); render(Math.min(i, werte.length - 1), 'input'); }));
      }),
    );
    if (fokusIndex !== undefined && fokusIndex >= 0) {
      const li = liste.children[fokusIndex];
      const ziel = fokusAuf === 'input' ? li?.querySelector('input') : li?.querySelector<HTMLButtonElement>(`[data-k="${fokusAuf}"]:not(:disabled)`) ?? li?.querySelector('input');
      ziel?.focus();
    }
    neu.disabled = gesperrt || (f.max !== undefined && werte.length >= f.max);
  };
  neu.addEventListener('click', () => {
    werte.push('');
    render(werte.length - 1, 'input');
  });
  render();
  const steuer = h('div', {}, liste, neu);
  const r = rahmen(f, id, steuer, { en, fieldset: true });
  fehlerZeile.set = r.zeigen;
  return {
    el: r.el,
    pruefen: () => {
      const fehler = !en && f.pflicht && !werte.some((w) => w !== '') ? 'Bitte mindestens einen Eintrag.' : null;
      r.zeigen(fehler);
      return fehler;
    },
    fokus: () => (liste.querySelector('input') ?? neu).focus(),
  };
}

/** Liste von Einträgen mit eigenen Feldern (Fakten, Partner, Säulen …) */
function listenFeld(f: Extract<Feld, { typ: 'liste' }>, bind: Bindung, k: FormKontext, en: boolean, gesperrt: boolean, bereich: Bereich): Baustein {
  const id = neueId();
  const items: Daten[] = ((bind.lesen() as Daten[] | undefined) ?? []).map((x) => ({ ...x }));
  const box = h('div', { class: 'rf-liste' });
  const neu = h('button', { type: 'button', class: 'i-linkbtn', text: `+ ${f.neu}`, disabled: gesperrt });
  let bausteine: Baustein[] = [];
  const speichern = () => {
    schreibe(bind, f, items.map((x) => ({ ...x })), k);
    k.geaendert();
  };
  const render = (fokus?: { i: number; k: string }) => {
    bausteine = [];
    box.replaceChildren(
      ...items.map((item, i) => {
        const titel = h('span', { class: 'rf-item__t', text: `${i + 1}. ${f.titel(item) || f.label}` });
        const kinder = f.felder.map((sf) => {
          const b = baue(sf, { lesen: () => holen(item, sf.key ?? ''), schreiben: (v) => setzen(item, sf.key!, v) }, { ...k, geaendert: () => { titel.textContent = `${i + 1}. ${f.titel(item) || f.label}`; speichern(); } }, bereich, { gesperrt, enKey: en ? undefined : (key) => `${key}_en`, item });
          bausteine.push(...b);
          return b.map((x) => x.el);
        });
        const knopf = (text: string, label: string, fn: () => void, aus = false) =>
          h('button', { type: 'button', class: 'rf-mini', title: label, 'aria-label': `${label}: ${f.titel(item) || i + 1}`, disabled: gesperrt || aus, onclick: fn, 'data-k': text }, text);
        return h('fieldset', { class: 'rf-item' },
          h('legend', { class: 'rf-item__head' }, titel),
          h('div', { class: 'rf-item__btns' },
            knopf('↑', 'Nach oben', () => { [items[i - 1], items[i]] = [items[i], items[i - 1]]; speichern(); render({ i: i - 1, k: '↑' }); }, i === 0),
            knopf('↓', 'Nach unten', () => { [items[i + 1], items[i]] = [items[i], items[i + 1]]; speichern(); render({ i: i + 1, k: '↓' }); }, i === items.length - 1),
            knopf('✕', 'Entfernen', () => { items.splice(i, 1); speichern(); render(); neu.focus(); })),
          ...kinder.flat());
      }),
    );
    if (fokus) box.children[fokus.i]?.querySelector<HTMLButtonElement>(`[data-k="${fokus.k}"]:not(:disabled)`)?.focus();
  };
  neu.addEventListener('click', () => {
    items.push({});
    speichern();
    render();
    box.lastElementChild?.querySelector<HTMLElement>('input, textarea, select')?.focus();
  });
  render();
  const steuer = h('div', {}, box, neu);
  const r = rahmen(f, id, steuer, { en, fieldset: true });
  r.el.classList.add('rf-feld--liste');
  return {
    el: r.el,
    pruefen: () => {
      const eigen = !en && f.pflicht && items.length === 0 ? 'Bitte mindestens einen Eintrag.' : null;
      r.zeigen(eigen);
      const innen = bausteine.map((b) => b.pruefen()).find(Boolean) ?? null;
      return eigen ?? innen;
    },
    fokus: () => (box.querySelector<HTMLElement>('[aria-invalid="true"]') ?? box.querySelector<HTMLElement>('input, textarea, select') ?? neu).focus(),
  };
}

interface BauOpts {
  gesperrt: boolean;
  /** wie heißt das englische Gegenstück eines Schlüssels (innerhalb eines Listeneintrags) */
  enKey?: (key: string) => string;
  item?: Daten;
}

/** Baut ein Feld (und ggf. sein englisches Gegenstück) */
function baue(f: Feld, bind: Bindung, k: FormKontext, bereich: Bereich, o: BauOpts, enBind?: Bindung): Baustein[] {
  if (f.typ === 'abschnitt') return [];
  const gesperrt = o.gesperrt || (!!f.nurNeu && !k.neu) || (!!f.nurVorstand && !k.vorstand);
  const de = einzeln(f, bind, k, bereich, false, gesperrt);
  if (!f.en) return [de];
  const eb = enBind ?? (o.enKey && o.item ? { lesen: () => holen(o.item, o.enKey!(f.key)), schreiben: (v: any) => setzen(o.item!, o.enKey!(f.key), v) } : null);
  if (!eb) return [de];
  // Listen und lange Texte: englische Fassung aufklappbar darunter, sonst zweispaltig
  if (f.typ === 'liste' || f.typ === 'werte' || f.typ === 'markdown') {
    const en = f.typ === 'liste' ? listenFeld(f, eb, k, true, gesperrt, bereich) : einzeln(f, eb, k, bereich, true, gesperrt);
    const details = h('details', { class: 'rf-en' }, h('summary', { text: `${f.label}: englische Fassung` }), en.el);
    if (leer(eb.lesen()) === false) details.open = true;
    return [de, { el: details, pruefen: () => { const x = en.pruefen(); if (x) details.open = true; return x; }, fokus: () => { details.open = true; en.fokus(); } }];
  }
  const en = einzeln(f, eb, k, bereich, true, gesperrt);
  const paar = h('div', { class: 'rf-paar' }, de.el, en.el);
  return [{ el: paar, pruefen: () => de.pruefen() ?? en.pruefen(), fokus: () => (de.pruefen() ? de.fokus() : en.fokus()) }];
}

function einzeln(f: Feld, bind: Bindung, k: FormKontext, bereich: Bereich, en: boolean, gesperrt: boolean): Baustein {
  switch (f.typ) {
    case 'markdown':
      return markdownFeld(f, bind, k, en, gesperrt);
    case 'auswahl':
      return auswahlFeld(f, f.optionen, bind, k, gesperrt);
    case 'verweis': {
      const optionen = k.optionen(f.quelle);
      return f.mehrfach ? mehrfachFeld(f, optionen, bind, k, gesperrt) : auswahlFeld(f, optionen, bind, k, gesperrt);
    }
    case 'mehrfach':
      return mehrfachFeld(f, f.optionen, bind, k, gesperrt);
    case 'janein':
      return janeinFeld(f, bind, k, gesperrt);
    case 'zahl':
      return zahlFeld(f, bind, k, gesperrt);
    case 'datum':
      return datumFeld(f, bind, k, gesperrt);
    case 'datumzeit':
      return datumZeitFeld(f, bind, k, gesperrt);
    case 'bild':
    case 'pdf':
      return dateiFeld(f, bind, k, gesperrt);
    case 'werte':
      return werteFeld(f, bind, k, en, gesperrt);
    case 'liste':
      return listenFeld(f, bind, k, en, gesperrt, bereich);
    case 'abschnitt':
      throw new Error('abschnitt');
    default:
      return textFeld(f, bind, k, en, gesperrt);
  }
}

/** Bindung eines Feldes an den Eintrag (und an die englische Fassung) */
function bindungen(b: Bereich, e: Eintrag, f: Exclude<Feld, { typ: 'abschnitt' }>): { de: Bindung; en?: Bindung } {
  const key = f.key!;
  const de: Bindung =
    key === 'id' ? { lesen: () => e.id, schreiben: (v) => (e.id = v ?? '') }
    : key === 'body' ? { lesen: () => e.body ?? '', schreiben: (v) => (e.body = v ?? '') }
    : { lesen: () => holen(e.data, key), schreiben: (v) => setzen(e.data, key, v) };
  if (!f.en) return { de };
  if (typeof f.en === 'string') {
    const p = f.en;
    return { de, en: { lesen: () => holen(e.data, p), schreiben: (v) => setzen(e.data, p, v) } };
  }
  if (b.art === 'ordner' && b.uebersetzung) {
    e.en ??= { data: {}, body: '' };
    const en = e.en;
    return {
      de,
      en: key === 'body' ? { lesen: () => en.body, schreiben: (v) => (en.body = v ?? '') } : { lesen: () => holen(en.data, key), schreiben: (v) => setzen(en.data, key, v) },
    };
  }
  return { de, en: { lesen: () => holen(e.data, `${key}_en`), schreiben: (v) => setzen(e.data, `${key}_en`, v) } };
}

export interface Formular {
  el: HTMLElement;
  /** alle Felder prüfen; gibt die Anzahl der Fehler zurück und setzt den Fokus auf den ersten */
  pruefen(extra?: Record<string, string>): number;
}

export function formular(b: Bereich, e: Eintrag, k: FormKontext): Formular {
  const el = h('div', { class: 'rf-form' });
  const alle: { key?: string; baustein: Baustein }[] = [];
  let abschnitt: HTMLElement = el;
  let abschnittVorstand = false;
  const gesperrtGanz = !!b.nurVorstand?.(e.id) && !k.vorstand;
  for (const f of b.felder) {
    if (f.typ === 'abschnitt') {
      abschnittVorstand = !!f.nurVorstand;
      abschnitt = h('fieldset', { class: 'rf-abschnitt' }, h('legend', { class: 'rf-abschnitt__h', text: f.label }), f.hilfe ? h('p', { class: 'i-hint', text: f.hilfe }) : null);
      el.append(abschnitt);
      continue;
    }
    const { de, en } = bindungen(b, e, f);
    const gesperrt = gesperrtGanz || (abschnittVorstand && !k.vorstand);
    for (const baustein of baue(f, de, k, b, { gesperrt }, en)) {
      abschnitt.append(baustein.el);
      alle.push({ key: f.key, baustein });
    }
  }
  return {
    el,
    pruefen(extra = {}) {
      let erster: Baustein | null = null;
      let n = 0;
      for (const { key, baustein } of alle) {
        let fehler = baustein.pruefen();
        if (!fehler && key && extra[key]) {
          fehler = extra[key];
          const zeile = baustein.el.querySelector<HTMLElement>('.rf-fehler');
          if (zeile) {
            zeile.textContent = fehler;
            zeile.hidden = false;
          }
        }
        if (fehler) {
          n++;
          erster ??= baustein;
        }
      }
      erster?.fokus();
      return n;
    },
  };
}

/** Foto im Browser verkleinern (max. 2400 px, JPEG), damit Upload und Website schnell bleiben */
export async function verkleinern(datei: File): Promise<{ blob: Blob; endung: string }> {
  const bmp = await createImageBitmap(datei).catch(() => null);
  if (!bmp) throw new Error('Das Foto lässt sich nicht lesen. Bitte JPG, PNG oder WebP nehmen.');
  const png = datei.type === 'image/png';
  const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  if (scale === 1 && datei.size < 2_500_000) return { blob: datei, endung: png ? 'png' : datei.type === 'image/webp' ? 'webp' : 'jpg' };
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  // Logos (PNG) behalten Transparenz
  const typ = png ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('Das Foto ließ sich nicht verkleinern.'))), typ, 0.86));
  return { blob, endung: png ? 'png' : 'jpg' };
}

export const dateiName = (name: string, endung: string) => `${slugify(name.replace(/\.[^.]+$/, '')) || 'datei'}.${endung}`;

export async function base64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

export { h };
