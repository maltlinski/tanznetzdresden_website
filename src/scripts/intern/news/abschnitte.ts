/**
 * Abschnitts-Editor für den News-Text (Intern → News → Beitrag): Text, Bilder und Hinweiskasten als Karten,
 * die sich verschieben, einfügen und löschen lassen. Gespeichert wird Markdown (src/lib/news-bloecke.ts).
 *
 * Bilder: mehrere Fotos auf einmal auswählen oder hineinziehen, Reihenfolge ändern, drehen, Ausschnitt per
 * Klick ins Foto, Format und Spalten wählen. Das Raster im Editor sieht aus wie auf der Website.
 */
import { fokusAusKlick } from './fotos';
import { newsBildUrl } from '../../../lib/markdown';
import { FORMATE, type Bild, type BilderBlock, type Block, type Format, type TextBlock } from '../../../lib/news-bloecke';

/** Bild im Editor: während des Hochladens mit lokaler Vorschau */
type EBild = Bild & { lokal?: string; laedt?: boolean };
type EBlock = TextBlock | (Omit<BilderBlock, 'bilder'> & { bilder: EBild[] });

export interface AbschnittOptionen {
  start: Block[];
  /** Foto hochladen → Pfad im Bucket */
  hochladen: (f: File) => Promise<string>;
  /** Foto drehen → neuer Pfad */
  drehen: (datei: string) => Promise<string>;
  /** etwas wurde geändert (für „ungespeichert“) */
  geaendert: () => void;
  /** Fehlermeldung zeigen */
  fehler: (text: string) => void;
}

const FORMAT_LABEL: Record<Format, string> = { original: 'Original (nicht zuschneiden)', quer: 'Querformat 3 : 2', hoch: 'Hochformat 3 : 4', quadrat: 'Quadrat' };
const TYP_LABEL = { text: 'Text', bilder: 'Bilder', hinweis: 'Hinweiskasten' } as const;
const WERKZEUGE = [
  { cmd: 'h2', label: 'Zwischenüberschrift', icon: 'H2' },
  { cmd: 'h3', label: 'Unterüberschrift', icon: 'H3' },
  { cmd: 'b', label: 'Fett', icon: 'B' },
  { cmd: 'list', label: 'Aufzählung', icon: '•' },
  { cmd: 'quote', label: 'Zitat', icon: '„' },
  { cmd: 'link', label: 'Link', icon: '↗' },
];

const bildUrl = (datei: string) => newsBildUrl(datei, import.meta.env.BASE_URL);
let zaehler = 0;
const neueId = () => `ab-${++zaehler}`;

/** Kleiner DOM-Baukasten */
function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, unknown> = {}, ...kinder: (Node | string | null | false | undefined)[]) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'text') el.textContent = String(v);
    else if (k === 'value') (el as HTMLInputElement).value = String(v);
    else if (k === 'class') el.className = String(v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k in el && typeof v !== 'string') (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  el.append(...kinder.filter((x): x is Node | string => !!x));
  return el;
}

/** Werkzeugleiste: Markdown-Zeichen um die Auswahl bzw. vor die Zeilen setzen */
function werkzeuge(ta: HTMLTextAreaElement, label: string) {
  const melden = () => {
    ta.focus();
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const umschliessen = (vor: string, nach: string, platzhalter: string) => {
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e) || platzhalter;
    ta.setRangeText(vor + sel + nach, s, e, 'select');
    ta.setSelectionRange(s + vor.length, s + vor.length + sel.length);
    melden();
  };
  const zeilen = (prefix: string, platzhalter: string) => {
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const start = value.lastIndexOf('\n', s - 1) + 1;
    const nl = value.indexOf('\n', e);
    const end = nl === -1 ? value.length : nl;
    const liste = (value.slice(start, end) || platzhalter).split('\n').map((l) => l.replace(/^(#+ |> ?|- )/, '')).filter((l) => l.trim());
    // Zitat: jede Zeile ein eigener Absatz („Zitat“, darunter „— Name“)
    const block = prefix === '> ' ? liste.map((l) => `> ${l}`).join('\n>\n') : liste.map((l) => prefix + l).join('\n');
    const davor = value.slice(0, start);
    const luecke = start > 0 && davor.trimEnd() !== '' && !davor.endsWith('\n\n') ? '\n' : '';
    ta.setRangeText(luecke + block, start, end, 'end');
    melden();
  };
  const tun: Record<string, () => void> = {
    h2: () => zeilen('## ', 'Zwischenüberschrift'),
    h3: () => zeilen('### ', 'Unterüberschrift'),
    b: () => umschliessen('**', '**', 'fetter Text'),
    list: () => zeilen('- ', 'Punkt'),
    quote: () => zeilen('> ', 'Zitat'),
    link: () => {
      const url = prompt('Adresse des Links (z. B. https://… oder /kontakt/ für eine Seite der Website):', 'https://');
      if (url && url !== 'https://') umschliessen('[', `](${url.trim()})`, 'Linktext');
    },
  };
  return h('div', { class: 'ab-tools', role: 'toolbar', 'aria-label': `${label}: Formatierung` },
    ...WERKZEUGE.map((w) => h('button', { type: 'button', title: w.label, 'aria-label': w.label, onclick: tun[w.cmd] }, h('span', { 'aria-hidden': 'true', text: w.icon }))));
}

/** Textfeld, das mit dem Inhalt wächst */
function wachsend(ta: HTMLTextAreaElement) {
  const fit = () => {
    ta.style.height = 'auto';
    ta.style.height = `${Math.max(ta.scrollHeight + 2, 120)}px`;
  };
  ta.addEventListener('input', fit);
  requestAnimationFrame(fit);
  return ta;
}

export function abschnittEditor(root: HTMLElement, opt: AbschnittOptionen) {
  let bloecke: EBlock[] = opt.start.length ? structuredClone(opt.start) : [{ typ: 'text', de: '', en: '' }];
  /** gewähltes Foto je Bilder-Abschnitt (Index im Abschnitt) */
  const gewaehlt = new WeakMap<EBlock, number>();
  let letzterFotonachweis = bloecke.find((b): b is EBlock & { typ: 'bilder' } => b.typ === 'bilder' && !!b.foto)?.foto ?? '';

  const geaendert = () => opt.geaendert();
  const neu = (typ: Block['typ']): EBlock =>
    typ === 'bilder'
      ? { typ: 'bilder', darstellung: 'raster', format: 'quer', spalten: 4, text: '', text_en: '', foto: letzterFotonachweis, bilder: [] }
      : { typ, de: '', en: '' };

  function einfuegen(i: number, typ: Block['typ'], fokus = true) {
    const b = neu(typ);
    bloecke.splice(i, 0, b);
    zeichnen();
    geaendert();
    if (fokus) {
      const karte = root.querySelectorAll<HTMLElement>('.ab-block')[i];
      karte?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      (karte?.querySelector<HTMLElement>('textarea, .fb-plus input') ?? karte)?.focus();
    }
    return b;
  }

  /** „+ Abschnitt“ zwischen den Karten: klappt drei Knöpfe aus */
  function einfuegeLeiste(i: number, offen = false) {
    const menue = h('div', { class: 'ab-plus__menue', hidden: !offen },
      ...(['text', 'bilder', 'hinweis'] as const).map((t) => h('button', { type: 'button', class: 'ab-plus__opt', text: `+ ${TYP_LABEL[t]}`, onclick: () => einfuegen(i, t) })));
    const knopf = h('button', {
      type: 'button', class: 'ab-plus__btn', 'aria-expanded': String(offen), text: '+ Abschnitt einfügen',
      onclick: () => {
        menue.hidden = !menue.hidden;
        knopf.setAttribute('aria-expanded', String(!menue.hidden));
      },
    });
    return h('div', { class: `ab-plus${offen ? ' ab-plus--ende' : ''}` }, offen ? null : knopf, menue);
  }

  function verschieben(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= bloecke.length) return;
    [bloecke[i], bloecke[j]] = [bloecke[j], bloecke[i]];
    zeichnen();
    geaendert();
    root.querySelectorAll<HTMLElement>('.ab-block')[j]?.querySelector<HTMLButtonElement>(`[data-schieben="${d}"]`)?.focus();
  }

  function loeschen(i: number) {
    const b = bloecke[i];
    const leer = b.typ === 'bilder' ? !b.bilder.length : !b.de.trim() && !b.en.trim();
    if (!leer && !confirm(`Diesen Abschnitt (${TYP_LABEL[b.typ]}) löschen?`)) return;
    bloecke.splice(i, 1);
    if (!bloecke.length) bloecke.push(neu('text'));
    zeichnen();
    geaendert();
  }

  // ---------- Text und Hinweis ----------
  function textKarte(b: TextBlock, i: number) {
    const id = neueId();
    const label = b.typ === 'hinweis' ? 'Hinweiskasten' : `Text, Abschnitt ${i + 1}`;
    const ta = wachsend(h('textarea', {
      id, class: 'ab-ta', rows: 6, value: b.de, 'aria-label': label, 'data-key': `${i}-de`,
      placeholder: b.typ === 'hinweis'
        ? 'z. B. Förderhinweis: »…« wurde gefördert von …'
        : 'Absätze mit einer Leerzeile trennen. Text markieren und oben Überschrift, Fett, Liste, Zitat oder Link wählen.',
      oninput: () => { b.de = ta.value; geaendert(); },
    }) as HTMLTextAreaElement);
    const taEn = wachsend(h('textarea', {
      class: 'ab-ta ab-ta--en', rows: 4, value: b.en, lang: 'en', 'aria-label': `${label}: Englisch`, 'data-key': `${i}-en`,
      placeholder: 'English version (optional). Leer = deutscher Text.',
      oninput: () => { b.en = taEn.value; geaendert(); enStatus(); },
    }) as HTMLTextAreaElement);
    const status = h('span', { class: 'ab-en__status' });
    const enStatus = () => (status.textContent = b.en.trim() ? '· übersetzt' : '');
    enStatus();
    const en = h('details', { class: 'ab-en', open: !!b.en.trim() },
      h('summary', {}, 'Englisch ', status),
      werkzeuge(taEn, `${label} Englisch`), taEn);
    en.addEventListener('toggle', () => en.open && taEn.dispatchEvent(new Event('input')));
    return [werkzeuge(ta, label), ta, en];
  }

  // ---------- Bilder ----------
  function bilderKarte(b: EBlock & { typ: 'bilder' }, i: number) {
    const sel = Math.min(gewaehlt.get(b) ?? 0, Math.max(0, b.bilder.length - 1));
    const n = b.bilder.length;
    const datei = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: true, 'aria-label': `Fotos hinzufügen (Abschnitt ${i + 1})` }) as HTMLInputElement;
    datei.addEventListener('change', () => {
      if (datei.files?.length) void dateienDazu(b, [...datei.files]);
      datei.value = '';
    });

    // Raster wie auf der Website
    const raster = h('div', {
      class: `fb-raster fb--${b.format}${n === 1 && b.darstellung === 'neben' ? ' fb--neben' : ''}`,
      style: `--sp:${n > 1 ? b.spalten : 1}`,
    });
    b.bilder.forEach((x, j) => {
      const src = x.lokal ?? bildUrl(x.datei);
      const fehlt = !x.alt.trim() && !x.laedt;
      raster.append(h('div', { class: `fb-bild${j === sel ? ' is-sel' : ''}${x.laedt ? ' is-laedt' : ''}${fehlt ? ' is-fehlt' : ''}` },
        h('button', {
          type: 'button', class: 'fb-bild__wahl', 'aria-pressed': String(j === sel),
          'aria-label': `Foto ${j + 1} bearbeiten${x.alt ? `: ${x.alt}` : ''}${fehlt ? ' (Bildbeschreibung fehlt)' : ''}`,
          onclick: () => { gewaehlt.set(b, j); zeichnen(); root.querySelectorAll<HTMLElement>('.ab-block')[i]?.querySelector<HTMLElement>('.fb-detail input')?.focus(); },
        }, h('img', { src, alt: '', style: x.fokus ? `object-position:${x.fokus}` : undefined, loading: 'lazy' })),
        x.laedt ? h('span', { class: 'fb-bild__laedt', text: 'lädt …' }) : null,
        fehlt ? h('span', { class: 'fb-bild__warn', 'aria-hidden': 'true', text: 'Beschreibung fehlt' }) : null,
      ));
    });
    raster.append(h('label', { class: 'fb-plus' }, h('span', { 'aria-hidden': 'true', text: '+' }), h('span', { text: n ? 'Fotos hinzufügen' : 'Fotos auswählen oder hierher ziehen' }), datei));

    // gewähltes Foto bearbeiten
    let detail: HTMLElement | null = null;
    const x = b.bilder[sel];
    if (x) {
      const altId = neueId();
      const zugeschnitten = b.format !== 'original';
      const marker = h('span', { class: 'fb-fokus__punkt', style: `left:${(x.fokus ?? '50% 50%').split(' ')[0]};top:${(x.fokus ?? '50% 50%').split(' ')[1]}`, 'aria-hidden': 'true' });
      const bild = h('img', { src: x.lokal ?? bildUrl(x.datei), alt: '' });
      const fokus = h('div', {
        class: `fb-fokus${zugeschnitten ? ' is-aktiv' : ''}`,
        title: zugeschnitten ? 'Klick ins Foto: Diese Stelle bleibt beim Zuschnitt sichtbar.' : undefined,
        onclick: (e: MouseEvent) => {
          if (!zugeschnitten) return;
          x.fokus = fokusAusKlick(e, bild as HTMLElement);
          zeichnen();
          geaendert();
        },
      }, bild, zugeschnitten ? marker : null);
      const knopf = (text: string, label: string, fn: () => void, aus = false) => h('button', { type: 'button', class: 'i-linkbtn', text, 'aria-label': label, disabled: aus, onclick: fn });
      detail = h('div', { class: 'fb-detail' },
        fokus,
        h('div', { class: 'fb-detail__seite' },
          h('p', { class: 'fb-detail__h', text: `Foto ${sel + 1} von ${n}` }),
          h('div', { class: 'i-field' },
            h('label', { for: altId, text: 'Bildbeschreibung' }),
            h('input', { id: altId, 'data-key': `${i}-alt-${sel}`, value: x.alt, maxLength: 300, placeholder: 'Was ist zu sehen? z. B. Gruppenfoto der Residenzkünstler:innen auf der Bühne', oninput: (e: Event) => { x.alt = (e.target as HTMLInputElement).value; geaendert(); } }),
            h('span', { class: 'i-hint', text: 'Für Menschen, die das Foto nicht sehen können. Pflicht zum Veröffentlichen.' })),
          h('details', { class: 'ab-en', open: !!x.alt_en },
            h('summary', { text: 'Englisch' }),
            h('input', { class: 'fb-en', 'data-key': `${i}-alten-${sel}`, value: x.alt_en ?? '', lang: 'en', maxLength: 300, 'aria-label': 'Bildbeschreibung Englisch', placeholder: 'Image description', oninput: (e: Event) => { x.alt_en = (e.target as HTMLInputElement).value; geaendert(); } })),
          zugeschnitten
            ? h('p', { class: 'i-hint', text: 'Bildausschnitt: Klick ins Foto links. Diese Stelle bleibt sichtbar, wenn das Foto zugeschnitten wird.' })
            : null,
          h('div', { class: 'fb-detail__knoepfe' },
            knopf('← Nach vorn', `Foto ${sel + 1} nach vorn`, () => fotoSchieben(b, sel, -1), sel === 0),
            knopf('Nach hinten →', `Foto ${sel + 1} nach hinten`, () => fotoSchieben(b, sel, 1), sel === n - 1),
            knopf('↻ Drehen', `Foto ${sel + 1} drehen`, () => void fotoDrehen(x), !!x.laedt),
            knopf('Entfernen', `Foto ${sel + 1} entfernen`, () => fotoEntfernen(b, sel)),
          ),
        ),
      );
    }

    // Darstellung
    const optionen = h('div', { class: 'fb-optionen' });
    if (n === 1) {
      const name = neueId();
      optionen.append(h('fieldset', { class: 'fb-wahl' },
        h('legend', { text: 'Darstellung' }),
        ...([['raster', 'Groß in Textbreite'], ['neben', 'Neben dem Text (halbe Breite)']] as const).map(([v, l]) =>
          h('label', { class: 'i-check' }, h('input', { type: 'radio', name, value: v, checked: b.darstellung === v, onchange: () => { b.darstellung = v; zeichnen(); geaendert(); } }), l)),
      ));
    }
    if (n >= 1) {
      const fId = neueId();
      optionen.append(h('div', { class: 'i-field' },
        h('label', { for: fId, text: 'Format' }),
        h('select', { id: fId, onchange: (e: Event) => { b.format = (e.target as HTMLSelectElement).value as Format; zeichnen(); geaendert(); } },
          ...FORMATE.map((f) => h('option', { value: f, text: FORMAT_LABEL[f], selected: b.format === f })))));
    }
    if (n > 1) {
      const sId = neueId();
      optionen.append(h('div', { class: 'i-field' },
        h('label', { for: sId, text: 'Fotos pro Reihe' }),
        h('select', { id: sId, onchange: (e: Event) => { b.spalten = Number((e.target as HTMLSelectElement).value) as 2 | 3 | 4; zeichnen(); geaendert(); } },
          ...[2, 3, 4].map((s) => h('option', { value: String(s), text: String(s), selected: b.spalten === s }))),
        h('span', { class: 'i-hint', text: 'Auf dem Handy höchstens zwei.' })));
    }
    const capId = neueId();
    const fotoId = neueId();
    const unterschrift = h('div', { class: 'fb-texte' },
      h('div', { class: 'i-field' },
        h('label', { for: capId, text: 'Bildunterschrift (optional)' }),
        h('input', { id: capId, 'data-key': `${i}-cap`, value: b.text, maxLength: 300, placeholder: 'z. B. Die Teilnehmenden von »re-preview« · 14.11.2024 · villa/wigman', oninput: (e: Event) => { b.text = (e.target as HTMLInputElement).value; geaendert(); } }),
        h('details', { class: 'ab-en', open: !!b.text_en },
          h('summary', { text: 'Englisch' }),
          h('input', { class: 'fb-en', 'data-key': `${i}-capen`, value: b.text_en, lang: 'en', maxLength: 300, 'aria-label': 'Bildunterschrift Englisch', oninput: (e: Event) => { b.text_en = (e.target as HTMLInputElement).value; geaendert(); } }))),
      h('div', { class: 'i-field' },
        h('label', { for: fotoId, text: n > 1 ? 'Fotos von' : 'Foto von' }),
        h('input', { id: fotoId, 'data-key': `${i}-foto`, value: b.foto, maxLength: 120, placeholder: 'Name der Fotograf:in', oninput: (e: Event) => { b.foto = (e.target as HTMLInputElement).value; letzterFotonachweis = b.foto; geaendert(); } })),
    );

    const ziel = h('div', { class: 'fb' }, raster, detail, n ? optionen : null, n ? unterschrift : null);
    // Fotos hineinziehen
    ziel.addEventListener('dragover', (e) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        ziel.classList.add('is-drop');
      }
    });
    ziel.addEventListener('dragleave', () => ziel.classList.remove('is-drop'));
    ziel.addEventListener('drop', (e) => {
      e.preventDefault();
      ziel.classList.remove('is-drop');
      const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/'));
      if (files.length) void dateienDazu(b, files);
    });
    return [ziel];
  }

  async function dateienDazu(b: EBlock & { typ: 'bilder' }, files: File[]) {
    const neue: EBild[] = files.map((f) => ({ datei: '', alt: '', lokal: URL.createObjectURL(f), laedt: true }));
    const vorher = b.bilder.length;
    b.bilder.push(...neue);
    if (vorher === 0 && b.bilder.length === 1) b.format = 'original';
    if (vorher <= 1 && b.bilder.length > 1) {
      b.format = 'quer';
      b.spalten = Math.min(4, b.bilder.length) as 2 | 3 | 4;
    }
    gewaehlt.set(b, vorher);
    zeichnen();
    geaendert();
    await Promise.all(files.map(async (f, k) => {
      const x = neue[k];
      try {
        x.datei = await opt.hochladen(f);
      } catch (err) {
        opt.fehler(`„${f.name}“: ${(err as Error).message || 'Hochladen hat nicht geklappt.'}`);
        b.bilder.splice(b.bilder.indexOf(x), 1);
      }
      x.laedt = false;
      zeichnen();
    }));
    neue.forEach((x) => x.lokal && URL.revokeObjectURL(x.lokal));
    neue.forEach((x) => delete x.lokal);
    zeichnen();
  }

  function fotoSchieben(b: EBlock & { typ: 'bilder' }, j: number, d: number) {
    const k = j + d;
    if (k < 0 || k >= b.bilder.length) return;
    [b.bilder[j], b.bilder[k]] = [b.bilder[k], b.bilder[j]];
    gewaehlt.set(b, k);
    zeichnen();
    geaendert();
  }

  function fotoEntfernen(b: EBlock & { typ: 'bilder' }, j: number) {
    b.bilder.splice(j, 1);
    gewaehlt.set(b, Math.max(0, j - 1));
    zeichnen();
    geaendert();
  }

  async function fotoDrehen(x: EBild) {
    x.laedt = true;
    zeichnen();
    try {
      x.datei = await opt.drehen(x.datei);
      x.fokus = undefined;
      geaendert();
    } catch (err) {
      opt.fehler((err as Error).message || 'Drehen hat nicht geklappt.');
    }
    x.laedt = false;
    zeichnen();
  }

  // ---------- Zeichnen ----------
  function zeichnen() {
    // Eingabe mit Cursor behalten, wenn neu gezeichnet wird (z. B. Foto fertig hochgeladen)
    const aktiv = document.activeElement as HTMLInputElement | null;
    const key = aktiv && root.contains(aktiv) ? aktiv.dataset.key : undefined;
    const [s0, s1] = key ? [aktiv!.selectionStart, aktiv!.selectionEnd] : [null, null];
    root.replaceChildren();
    bloecke.forEach((b, i) => {
      if (i > 0) root.append(einfuegeLeiste(i));
      const titel = b.typ === 'bilder' ? `Bilder${b.bilder.length ? ` · ${b.bilder.length}` : ''}` : TYP_LABEL[b.typ];
      const kopf = h('div', { class: 'ab-block__kopf' },
        h('span', { class: 'ab-block__typ', text: `${i + 1} · ${titel}` }),
        h('div', { class: 'ab-block__knoepfe' },
          h('button', { type: 'button', 'data-schieben': '-1', 'aria-label': `Abschnitt ${i + 1} nach oben`, title: 'Nach oben', disabled: i === 0, onclick: () => verschieben(i, -1), text: '↑' }),
          h('button', { type: 'button', 'data-schieben': '1', 'aria-label': `Abschnitt ${i + 1} nach unten`, title: 'Nach unten', disabled: i === bloecke.length - 1, onclick: () => verschieben(i, 1), text: '↓' }),
          h('button', { type: 'button', 'aria-label': `Abschnitt ${i + 1} löschen`, title: 'Löschen', onclick: () => loeschen(i), text: '✕' })));
      const inhalt = b.typ === 'bilder' ? bilderKarte(b, i) : textKarte(b, i);
      root.append(h('section', { class: `ab-block ab-block--${b.typ}`, 'aria-label': `Abschnitt ${i + 1}: ${titel}`, tabindex: -1 }, kopf, ...inhalt));
    });
    root.append(einfuegeLeiste(bloecke.length, true));
    if (key) {
      const el = root.querySelector<HTMLInputElement>(`[data-key="${key}"]`);
      el?.closest('details')?.setAttribute('open', '');
      el?.focus();
      if (el && s0 !== null) el.setSelectionRange(s0, s1);
    }
  }
  zeichnen();

  return {
    /** Abschnitte zum Speichern (ohne Fotos, die noch hochladen) */
    bloecke(): Block[] {
      return bloecke.map((b) =>
        b.typ === 'bilder'
          ? { ...b, bilder: b.bilder.filter((x) => x.datei && !x.laedt).map(({ datei, alt, alt_en, fokus }) => ({ datei, alt, alt_en, fokus })) }
          : { ...b },
      );
    },
    /** Was fehlt noch? (zum Veröffentlichen) */
    probleme(veroeffentlichen: boolean): string[] {
      const p: string[] = [];
      if (bloecke.some((b) => b.typ === 'bilder' && b.bilder.some((x) => x.laedt))) p.push('Fotos werden noch hochgeladen. Bitte kurz warten.');
      if (veroeffentlichen) {
        bloecke.forEach((b, i) => {
          if (b.typ !== 'bilder') return;
          const ohne = b.bilder.map((x, j) => (!x.alt.trim() ? j + 1 : 0)).filter(Boolean);
          if (ohne.length) p.push(`Abschnitt ${i + 1}: Bildbeschreibung fehlt bei Foto ${ohne.join(', ')}.`);
        });
      }
      return p;
    },
  };
}
