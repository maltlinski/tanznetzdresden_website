/**
 * Abschnitts-Editor für den News-Text (Intern → News → Beitrag): Text, Bilder und Hinweiskasten als Karten,
 * die sich verschieben (Ziehen oder ↑ ↓), einfügen und löschen lassen. Gespeichert wird Markdown
 * (src/lib/news-bloecke.ts).
 *
 * Bewusst ruhig: Fotodetails erscheinen erst nach Klick auf ein Foto, Darstellung, Bildunterschrift,
 * Bildbeschreibung und Englisch sind eingeklappt.
 */
import { fokusAusKlick } from './fotos';
import { newsBildUrl } from '../../../lib/markdown';
import { FORMATE, type Bild, type BilderBlock, type Block, type Format, type TextBlock } from '../../../lib/news-bloecke';

/** Bild im Editor: während des Hochladens mit lokaler Vorschau */
type EBild = Bild & { lokal?: string; laedt?: boolean };
type EBilder = Omit<BilderBlock, 'bilder'> & { bilder: EBild[] };
/** `platzhalter`: Hinweis aus einer Vorlage (wird nicht gespeichert) */
export type EBlock = (TextBlock | EBilder) & { platzhalter?: string };

export interface Baustein {
  name: string;
  typ: 'text' | 'hinweis';
  text: string;
  text_en?: string;
}
export interface MediathekBild {
  datei: string;
  alt: string;
  /** Titel des Beitrags, aus dem das Foto stammt */
  aus: string;
}

export interface AbschnittOptionen {
  start: EBlock[];
  /** Foto hochladen → Pfad im Bucket */
  hochladen: (f: File) => Promise<string>;
  /** Foto drehen → neuer Pfad */
  drehen: (datei: string) => Promise<string>;
  /** Link auswählen (Seiten, Personen, Termine, News oder eigene Adresse) */
  linkWaehlen: (text: string) => Promise<{ href: string; text: string } | null>;
  /** Fotos aus früheren Beiträgen */
  mediathek: () => Promise<MediathekBild[]>;
  bausteine: Baustein[];
  /** etwas wurde geändert (für „ungespeichert“, Vorschau, Sicherung) */
  geaendert: () => void;
  /** ein Abschnitt wird bearbeitet (Vorschau scrollt mit) */
  aktiv?: (i: number) => void;
  /** Fehlermeldung zeigen */
  fehler: (text: string) => void;
}

const FORMAT_LABEL: Record<Format, string> = { original: 'Original (nicht zuschneiden)', quer: 'Querformat 3 : 2', hoch: 'Hochformat 3 : 4', quadrat: 'Quadrat' };
const FORMAT_KURZ: Record<Format, string> = { original: 'Original', quer: 'Querformat', hoch: 'Hochformat', quadrat: 'Quadrat' };
const TYP_LABEL = { text: 'Text', bilder: 'Bilder', hinweis: 'Hinweiskasten' } as const;
const WERKZEUGE = [
  { cmd: 'h2', label: 'Zwischenüberschrift', icon: 'H2' },
  { cmd: 'h3', label: 'Unterüberschrift', icon: 'H3' },
  { cmd: 'b', label: 'Fett', icon: 'B' },
  { cmd: 'list', label: 'Aufzählung', icon: '•' },
  { cmd: 'quote', label: 'Zitat', icon: '„' },
  { cmd: 'link', label: 'Link einfügen', icon: '↗' },
];

const bildUrl = (datei: string) => newsBildUrl(datei, import.meta.env.BASE_URL);
let zaehler = 0;
const neueId = () => `ab-${++zaehler}`;

/** Kleiner DOM-Baukasten */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, unknown> = {}, ...kinder: (Node | string | null | false | undefined)[]) {
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
function werkzeuge(ta: HTMLTextAreaElement, label: string, linkWaehlen: AbschnittOptionen['linkWaehlen']) {
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
    link: async () => {
      const { selectionStart: s, selectionEnd: e, value } = ta;
      const l = await linkWaehlen(value.slice(s, e));
      if (!l) return ta.focus();
      ta.setRangeText(`[${l.text}](${l.href})`, s, e, 'end');
      melden();
    },
  };
  return h('div', { class: 'ab-tools', role: 'toolbar', 'aria-label': `${label}: Formatierung` },
    ...WERKZEUGE.map((w) => h('button', { type: 'button', title: w.label, 'aria-label': w.label, onclick: tun[w.cmd] }, h('span', { 'aria-hidden': 'true', text: w.icon }))));
}

/** Textfeld, das mit dem Inhalt wächst */
function wachsend(ta: HTMLTextAreaElement, min = 120) {
  const fit = () => {
    ta.style.height = 'auto';
    ta.style.height = `${Math.max(ta.scrollHeight + 2, min)}px`;
  };
  ta.addEventListener('input', fit);
  requestAnimationFrame(fit);
  return ta;
}

export function abschnittEditor(root: HTMLElement, opt: AbschnittOptionen) {
  let bloecke: EBlock[] = [];
  /** gewähltes Foto je Bilder-Abschnitt (nur dann erscheinen die Fotodetails) */
  const gewaehlt = new WeakMap<EBlock, number>();
  /** aufgeklappte Bereiche je Abschnitt, damit sie beim Neuzeichnen offen bleiben */
  const offen = new WeakMap<object, Set<string>>();
  let letzterFotonachweis = '';
  let gezogen: { art: 'block'; i: number } | { art: 'bild'; b: EBilder; j: number } | null = null;

  const geaendert = () => opt.geaendert();
  const neu = (typ: Block['typ']): EBlock =>
    typ === 'bilder'
      ? { typ: 'bilder', darstellung: 'raster', format: 'quer', spalten: 4, text: '', text_en: '', foto: letzterFotonachweis, bilder: [] }
      : { typ, de: '', en: '' };

  /** Aufklappbarer Bereich, der sich merkt, ob er offen ist */
  function klappe(besitzer: object, name: string, cls: string, summary: (Node | string)[], inhalt: (Node | null)[], standardOffen = false) {
    const set = offen.get(besitzer) ?? new Set<string>();
    offen.set(besitzer, set);
    if (standardOffen && !set.has(`${name}:zu`)) set.add(name);
    const d = h('details', { class: cls, open: set.has(name) }, h('summary', {}, ...summary), ...inhalt);
    d.addEventListener('toggle', () => {
      if (d.open) {
        set.add(name);
        set.delete(`${name}:zu`);
      } else {
        set.delete(name);
        set.add(`${name}:zu`);
      }
    });
    return d;
  }

  function einfuegen(i: number, b: EBlock) {
    bloecke.splice(i, 0, b);
    zeichnen();
    geaendert();
    springen(i);
    return b;
  }

  /** „+ Abschnitt“ zwischen den Karten: klappt die Auswahl aus */
  function einfuegeLeiste(i: number, ende = false) {
    const bausteine = opt.bausteine.length
      ? h('div', { class: 'ab-plus__bausteine' },
          h('span', { class: 'ab-plus__k', text: 'Baustein:' }),
          ...opt.bausteine.map((bs) => h('button', {
            type: 'button', class: 'ab-plus__opt ab-plus__opt--leise', text: bs.name,
            onclick: () => einfuegen(i, { typ: bs.typ, de: bs.text, en: bs.text_en ?? '' }),
          })))
      : null;
    const menue = h('div', { class: 'ab-plus__menue', hidden: !ende },
      ...(['text', 'bilder', 'hinweis'] as const).map((t) => h('button', { type: 'button', class: 'ab-plus__opt', text: `+ ${TYP_LABEL[t]}`, onclick: () => einfuegen(i, neu(t)) })),
      bausteine);
    const knopf = h('button', {
      type: 'button', class: 'ab-plus__btn', 'aria-expanded': 'false', text: '+ Abschnitt einfügen',
      onclick: () => {
        menue.hidden = !menue.hidden;
        knopf.setAttribute('aria-expanded', String(!menue.hidden));
      },
    });
    return h('div', { class: `ab-plus${ende ? ' ab-plus--ende' : ''}` }, ende ? null : knopf, menue);
  }

  function verschieben(i: number, j: number) {
    if (j < 0 || j >= bloecke.length || i === j) return;
    const [b] = bloecke.splice(i, 1);
    bloecke.splice(j, 0, b);
    zeichnen();
    geaendert();
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
  function textKarte(b: EBlock & TextBlock, i: number) {
    const label = b.typ === 'hinweis' ? 'Hinweiskasten' : `Text, Abschnitt ${i + 1}`;
    const ta = wachsend(h('textarea', {
      id: neueId(), class: 'ab-ta', rows: 4, value: b.de, 'aria-label': label, 'data-key': `${i}-de`,
      placeholder: b.platzhalter ?? (b.typ === 'hinweis'
        ? 'z. B. Förderhinweis: »…« wurde gefördert von …'
        : 'Hier schreiben. Absätze mit einer Leerzeile trennen. Text markieren und oben formatieren.'),
      oninput: () => { b.de = ta.value; geaendert(); },
    }) as HTMLTextAreaElement, b.typ === 'hinweis' ? 80 : 120);
    const taEn = wachsend(h('textarea', {
      class: 'ab-ta ab-ta--en', rows: 3, value: b.en, lang: 'en', 'aria-label': `${label}: Englisch`, 'data-key': `${i}-en`,
      placeholder: 'English version (optional). Leer = deutscher Text.',
      oninput: () => { b.en = taEn.value; geaendert(); status.textContent = b.en.trim() ? '· übersetzt' : ''; },
    }) as HTMLTextAreaElement, 80);
    const status = h('span', { class: 'ab-en__status', text: b.en.trim() ? '· übersetzt' : '' });
    const en = klappe(b, 'en', 'ab-en', ['Englisch ', status], [werkzeuge(taEn, `${label} Englisch`, opt.linkWaehlen), taEn]);
    en.addEventListener('toggle', () => en.open && taEn.dispatchEvent(new Event('input')));
    return [werkzeuge(ta, label, opt.linkWaehlen), ta, en];
  }

  // ---------- Bilder ----------
  function bilderKarte(b: EBlock & EBilder, i: number) {
    const n = b.bilder.length;
    const sel = gewaehlt.get(b);
    const datei = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: true, 'aria-label': `Fotos hinzufügen (Abschnitt ${i + 1})` }) as HTMLInputElement;
    datei.addEventListener('change', () => {
      if (datei.files?.length) void dateienDazu(b, [...datei.files]);
      datei.value = '';
    });

    // Raster wie auf der Website; Fotos lassen sich ziehen
    const raster = h('div', {
      class: `fb-raster fb--${b.format}${n === 1 && b.darstellung === 'neben' ? ' fb--neben' : ''}`,
      style: `--sp:${n > 1 ? b.spalten : 1}`,
    });
    b.bilder.forEach((x, j) => {
      const karte = h('div', { class: `fb-bild${j === sel ? ' is-sel' : ''}${x.laedt ? ' is-laedt' : ''}`, draggable: 'true' },
        h('button', {
          type: 'button', class: 'fb-bild__wahl', 'aria-pressed': String(j === sel),
          'aria-label': `Foto ${j + 1} bearbeiten${x.alt ? `: ${x.alt}` : ''}`,
          onclick: () => {
            if (sel === j) gewaehlt.delete(b);
            else gewaehlt.set(b, j);
            zeichnen();
            if (sel !== j) root.querySelectorAll<HTMLElement>('.ab-block')[i]?.querySelector<HTMLElement>('.fb-detail [data-fertig]')?.focus();
          },
        }, h('img', { src: x.lokal ?? bildUrl(x.datei), alt: '', style: x.fokus ? `object-position:${x.fokus}` : undefined, loading: 'lazy', draggable: false })),
        x.laedt ? h('span', { class: 'fb-bild__laedt', text: 'lädt …' }) : null,
      );
      karte.addEventListener('dragstart', (e) => {
        gezogen = { art: 'bild', b, j };
        e.dataTransfer?.setData('text/plain', `foto-${j}`);
        karte.classList.add('is-gezogen');
      });
      karte.addEventListener('dragend', () => {
        gezogen = null;
        karte.classList.remove('is-gezogen');
      });
      karte.addEventListener('dragover', (e) => {
        if (gezogen?.art === 'bild' && gezogen.b === b) {
          e.preventDefault();
          karte.classList.add('is-ziel');
        }
      });
      karte.addEventListener('dragleave', () => karte.classList.remove('is-ziel'));
      karte.addEventListener('drop', (e) => {
        if (gezogen?.art !== 'bild' || gezogen.b !== b) return;
        e.preventDefault();
        e.stopPropagation();
        const [x2] = b.bilder.splice(gezogen.j, 1);
        b.bilder.splice(j, 0, x2);
        gewaehlt.delete(b);
        gezogen = null;
        zeichnen();
        geaendert();
      });
      raster.append(karte);
    });
    raster.append(h('label', { class: 'fb-plus' },
      h('span', { 'aria-hidden': 'true', text: '+' }),
      h('span', { text: n ? 'Fotos hinzufügen' : 'Fotos auswählen oder hierher ziehen' }), datei));

    const mediathek = h('button', { type: 'button', class: 'i-linkbtn fb-mediathek', text: 'Foto aus früheren Beiträgen wählen', onclick: () => void ausMediathek(b) });

    // gewähltes Foto bearbeiten (nur nach Klick)
    let detail: HTMLElement | null = null;
    const x = sel !== undefined ? b.bilder[sel] : undefined;
    if (x && sel !== undefined) {
      const zugeschnitten = b.format !== 'original';
      const [fx, fy] = (x.fokus ?? '50% 50%').split(' ');
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
      }, bild, zugeschnitten ? h('span', { class: 'fb-fokus__punkt', style: `left:${fx};top:${fy}`, 'aria-hidden': 'true' }) : null);
      const knopf = (text: string, label: string, fn: () => void, aus = false) => h('button', { type: 'button', class: 'i-linkbtn', text, 'aria-label': label, disabled: aus, onclick: fn });
      const altId = neueId();
      detail = h('div', { class: 'fb-detail' },
        fokus,
        h('div', { class: 'fb-detail__seite' },
          h('div', { class: 'fb-detail__kopf' },
            h('p', { class: 'fb-detail__h', text: `Foto ${sel + 1} von ${n}` }),
            h('button', { type: 'button', class: 'btn btn--secondary btn--sm', 'data-fertig': '', text: 'Fertig', onclick: () => { gewaehlt.delete(b); zeichnen(); } })),
          zugeschnitten ? h('p', { class: 'i-hint', text: 'Klick ins Foto: Diese Stelle bleibt sichtbar, wenn das Foto zugeschnitten wird.' }) : null,
          h('div', { class: 'fb-detail__knoepfe' },
            knopf('↻ Drehen', `Foto ${sel + 1} drehen`, () => void fotoDrehen(x), !!x.laedt),
            knopf('← Nach vorn', `Foto ${sel + 1} nach vorn`, () => fotoSchieben(b, sel, -1), sel === 0),
            knopf('Nach hinten →', `Foto ${sel + 1} nach hinten`, () => fotoSchieben(b, sel, 1), sel === n - 1),
            knopf('Entfernen', `Foto ${sel + 1} entfernen`, () => fotoEntfernen(b, sel)),
          ),
          klappe(x, 'alt', 'ab-en fb-alt', ['Bildbeschreibung ', h('span', { class: 'ab-en__status', text: x.alt ? '· vorhanden' : '(optional)' })], [
            h('div', { class: 'i-field' },
              h('label', { for: altId, class: 'visually-hidden', text: 'Bildbeschreibung' }),
              h('input', { id: altId, 'data-key': `${i}-alt-${sel}`, value: x.alt, maxLength: 300, placeholder: 'Was ist zu sehen? z. B. Gruppenfoto auf der Bühne', oninput: (e: Event) => { x.alt = (e.target as HTMLInputElement).value; geaendert(); } }),
              h('span', { class: 'i-hint', text: 'Hilft Menschen, die das Foto nicht sehen können, und Suchmaschinen.' })),
            h('input', { class: 'fb-en', 'data-key': `${i}-alten-${sel}`, value: x.alt_en ?? '', lang: 'en', maxLength: 300, 'aria-label': 'Bildbeschreibung Englisch', placeholder: 'Englisch (optional): Image description', oninput: (e: Event) => { x.alt_en = (e.target as HTMLInputElement).value; geaendert(); } }),
          ]),
        ),
      );
    }

    // Darstellung und Bildunterschrift: eingeklappt, die Zusammenfassung zeigt den Stand
    let mehr: HTMLElement | null = null;
    if (n) {
      const optionen = h('div', { class: 'fb-optionen' });
      if (n === 1) {
        const name = neueId();
        optionen.append(h('fieldset', { class: 'fb-wahl' },
          h('legend', { text: 'Darstellung' }),
          ...([['raster', 'Groß in Textbreite'], ['neben', 'Neben dem Text (halbe Breite)']] as const).map(([v, l]) =>
            h('label', { class: 'i-check' }, h('input', { type: 'radio', name, value: v, checked: b.darstellung === v, onchange: () => { b.darstellung = v; zeichnen(); geaendert(); } }), l)),
        ));
      }
      const fId = neueId();
      optionen.append(h('div', { class: 'i-field' },
        h('label', { for: fId, text: 'Format' }),
        h('select', { id: fId, onchange: (e: Event) => { b.format = (e.target as HTMLSelectElement).value as Format; zeichnen(); geaendert(); } },
          ...FORMATE.map((f) => h('option', { value: f, text: FORMAT_LABEL[f], selected: b.format === f })))));
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
      const texte = h('div', { class: 'fb-texte' },
        h('div', { class: 'i-field' },
          h('label', { for: capId, text: 'Bildunterschrift' }),
          h('input', { id: capId, 'data-key': `${i}-cap`, value: b.text, maxLength: 300, placeholder: 'z. B. Die Teilnehmenden von »re-preview« · 14.11.2024', oninput: (e: Event) => { b.text = (e.target as HTMLInputElement).value; geaendert(); } }),
          h('input', { class: 'fb-en', 'data-key': `${i}-capen`, value: b.text_en, lang: 'en', maxLength: 300, 'aria-label': 'Bildunterschrift Englisch', placeholder: 'Englisch (optional)', oninput: (e: Event) => { b.text_en = (e.target as HTMLInputElement).value; geaendert(); } })),
        h('div', { class: 'i-field' },
          h('label', { for: fotoId, text: n > 1 ? 'Fotos von' : 'Foto von' }),
          h('input', { id: fotoId, 'data-key': `${i}-foto`, value: b.foto, maxLength: 120, placeholder: 'Name der Fotograf:in', oninput: (e: Event) => { b.foto = (e.target as HTMLInputElement).value; letzterFotonachweis = b.foto; geaendert(); } })),
      );
      const stand = [
        n === 1 && b.darstellung === 'neben' ? 'neben dem Text' : FORMAT_KURZ[b.format],
        n > 1 ? `${b.spalten} pro Reihe` : '',
        b.text ? 'mit Bildunterschrift' : '',
        b.foto ? `Foto: ${b.foto}` : '',
      ].filter(Boolean).join(' · ');
      mehr = klappe(b, 'mehr', 'ab-en fb-mehr', ['Darstellung und Bildunterschrift ', h('span', { class: 'fb-mehr__stand', text: stand })], [optionen, texte]);
    }

    const ziel = h('div', { class: 'fb' }, raster, detail, mehr, mediathek);
    // Fotos von außen hineinziehen
    ziel.addEventListener('dragover', (e) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        ziel.classList.add('is-drop');
      }
    });
    ziel.addEventListener('dragleave', () => ziel.classList.remove('is-drop'));
    ziel.addEventListener('drop', (e) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      ziel.classList.remove('is-drop');
      const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/'));
      if (files.length) void dateienDazu(b, files);
    });
    return [ziel];
  }

  function layoutNachZahl(b: EBilder, vorher: number) {
    if (vorher === 0 && b.bilder.length === 1) b.format = 'original';
    if (vorher <= 1 && b.bilder.length > 1) {
      b.format = 'quer';
      b.spalten = Math.min(4, b.bilder.length) as 2 | 3 | 4;
    }
  }

  async function dateienDazu(b: EBilder, files: File[]) {
    const neue: EBild[] = files.map((f) => ({ datei: '', alt: '', lokal: URL.createObjectURL(f), laedt: true }));
    const vorher = b.bilder.length;
    b.bilder.push(...neue);
    layoutNachZahl(b, vorher);
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
    geaendert();
  }

  /** Mediathek: Fotos aus früheren Beiträgen auswählen */
  async function ausMediathek(b: EBilder) {
    const dlg = h('dialog', { class: 'fb-mt', 'aria-label': 'Fotos aus früheren Beiträgen' }) as HTMLDialogElement;
    const liste = h('div', { class: 'fb-mt__liste' }, h('p', { class: 'i-hint', text: 'Fotos werden geladen …' }));
    const gewaehlte = new Set<MediathekBild>();
    const ok = h('button', { type: 'button', class: 'btn btn--primary btn--sm', text: 'Übernehmen', disabled: true }) as HTMLButtonElement;
    dlg.append(
      h('div', { class: 'fb-mt__kopf' },
        h('strong', { text: 'Fotos aus früheren Beiträgen' }),
        h('button', { type: 'button', class: 'i-linkbtn', text: 'Abbrechen', onclick: () => dlg.close() })),
      liste,
      h('div', { class: 'fb-mt__fuss' }, ok));
    dlg.addEventListener('close', () => dlg.remove());
    document.body.append(dlg);
    dlg.showModal();
    let fotos: MediathekBild[] = [];
    try {
      fotos = await opt.mediathek();
    } catch {
      /* leer */
    }
    liste.replaceChildren(...(fotos.length
      ? fotos.map((f) => {
          const cb = h('input', { type: 'checkbox', 'aria-label': f.alt || `Foto aus „${f.aus}“` }) as HTMLInputElement;
          cb.addEventListener('change', () => {
            if (cb.checked) gewaehlte.add(f);
            else gewaehlte.delete(f);
            ok.disabled = !gewaehlte.size;
            ok.textContent = gewaehlte.size ? `${gewaehlte.size} übernehmen` : 'Übernehmen';
          });
          return h('label', { class: 'fb-mt__bild', title: f.aus }, cb, h('img', { src: bildUrl(f.datei), alt: '', loading: 'lazy' }), h('span', { text: f.aus }));
        })
      : [h('p', { class: 'i-hint', text: 'Noch keine Fotos in anderen Beiträgen.' })]));
    ok.addEventListener('click', () => {
      const vorher = b.bilder.length;
      for (const f of gewaehlte) b.bilder.push({ datei: f.datei, alt: f.alt });
      layoutNachZahl(b, vorher);
      dlg.close();
      zeichnen();
      geaendert();
    });
  }

  function fotoSchieben(b: EBilder, j: number, d: number) {
    const k = j + d;
    if (k < 0 || k >= b.bilder.length) return;
    [b.bilder[j], b.bilder[k]] = [b.bilder[k], b.bilder[j]];
    gewaehlt.set(b, k);
    zeichnen();
    geaendert();
  }

  function fotoEntfernen(b: EBilder, j: number) {
    b.bilder.splice(j, 1);
    gewaehlt.delete(b);
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
      const griff = h('span', { class: 'ab-block__griff', title: 'Zum Verschieben ziehen', 'aria-hidden': 'true', draggable: 'true', text: '⠿' });
      const kopf = h('div', { class: 'ab-block__kopf' },
        griff,
        h('span', { class: 'ab-block__typ', text: `${i + 1} · ${titel}` }),
        h('div', { class: 'ab-block__knoepfe' },
          h('button', { type: 'button', 'aria-label': `Abschnitt ${i + 1} nach oben`, title: 'Nach oben', disabled: i === 0, onclick: () => verschieben(i, i - 1), text: '↑' }),
          h('button', { type: 'button', 'aria-label': `Abschnitt ${i + 1} nach unten`, title: 'Nach unten', disabled: i === bloecke.length - 1, onclick: () => verschieben(i, i + 1), text: '↓' }),
          h('button', { type: 'button', 'aria-label': `Abschnitt ${i + 1} löschen`, title: 'Löschen', onclick: () => loeschen(i), text: '✕' })));
      const inhalt = b.typ === 'bilder' ? bilderKarte(b, i) : textKarte(b, i);
      const karte = h('section', { class: `ab-block ab-block--${b.typ}`, 'aria-label': `Abschnitt ${i + 1}: ${titel}`, tabindex: -1, 'data-i': String(i) }, kopf, ...inhalt);

      // Ziehen am Griff (nur dort, damit Text markieren weiter geht)
      griff.addEventListener('dragstart', (e) => {
        gezogen = { art: 'block', i };
        e.dataTransfer?.setData('text/plain', `abschnitt-${i}`);
        e.dataTransfer?.setDragImage(karte, 20, 20);
        karte.classList.add('is-gezogen');
      });
      griff.addEventListener('dragend', () => {
        gezogen = null;
        karte.classList.remove('is-gezogen');
        root.querySelectorAll('.is-ziel-oben, .is-ziel-unten').forEach((x) => x.classList.remove('is-ziel-oben', 'is-ziel-unten'));
      });
      karte.addEventListener('dragover', (e) => {
        if (gezogen?.art !== 'block') return;
        e.preventDefault();
        const r = karte.getBoundingClientRect();
        const oben = e.clientY < r.top + r.height / 2;
        karte.classList.toggle('is-ziel-oben', oben);
        karte.classList.toggle('is-ziel-unten', !oben);
      });
      karte.addEventListener('dragleave', () => karte.classList.remove('is-ziel-oben', 'is-ziel-unten'));
      karte.addEventListener('drop', (e) => {
        if (gezogen?.art !== 'block') return;
        e.preventDefault();
        const von = gezogen.i;
        const oben = karte.classList.contains('is-ziel-oben');
        let nach = oben ? i : i + 1;
        if (von < nach) nach--;
        gezogen = null;
        verschieben(von, nach);
      });
      karte.addEventListener('focusin', () => opt.aktiv?.(i));
      root.append(karte);
    });
    root.append(einfuegeLeiste(bloecke.length, true));
    if (key) {
      const el = root.querySelector<HTMLInputElement>(`[data-key="${key}"]`);
      el?.closest('details')?.setAttribute('open', '');
      el?.focus();
      if (el && s0 !== null) el.setSelectionRange(s0, s1);
    }
  }

  /** Zu einem Abschnitt springen und ihn bearbeiten */
  function springen(i: number) {
    const karte = root.querySelectorAll<HTMLElement>('.ab-block')[i];
    if (!karte) return;
    karte.scrollIntoView({ block: 'center', behavior: 'smooth' });
    (karte.querySelector<HTMLElement>('textarea.ab-ta:not(.ab-ta--en), .fb-plus input') ?? karte).focus({ preventScroll: true });
    karte.classList.remove('is-markiert');
    void karte.offsetWidth;
    karte.classList.add('is-markiert');
  }

  function setzen(neue: EBlock[]) {
    bloecke = neue.length ? structuredClone(neue) : [neu('text')];
    letzterFotonachweis = bloecke.find((b): b is EBlock & EBilder => b.typ === 'bilder' && !!b.foto)?.foto ?? '';
    zeichnen();
  }
  setzen(opt.start);

  return {
    /** Abschnitte zum Speichern (ohne Fotos, die noch hochladen) */
    bloecke(): Block[] {
      return bloecke.map(({ platzhalter: _p, ...b }) =>
        b.typ === 'bilder'
          ? { ...b, bilder: b.bilder.filter((x) => x.datei && !x.laedt).map(({ datei, alt, alt_en, fokus }) => ({ datei, alt, alt_en, fokus })) }
          : { ...b },
      );
    },
    /** Abschnitte ersetzen (Vorlage, Wiederherstellen) */
    setzen,
    springen,
    /** Lädt gerade noch ein Foto hoch? */
    laedt: () => bloecke.some((b) => b.typ === 'bilder' && b.bilder.some((x) => x.laedt)),
    /** Fotos ohne Bildbeschreibung (für die Checkliste, keine Pflicht) */
    ohneBeschreibung: () => bloecke.reduce((n, b) => n + (b.typ === 'bilder' ? b.bilder.filter((x) => !x.alt.trim()).length : 0), 0),
    /** Gibt es schon Text? */
    hatText: () => bloecke.some((b) => (b.typ === 'bilder' ? b.bilder.length : b.de.trim())),
  };
}
