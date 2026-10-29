/**
 * Block-Editor für den News-Text (Redaktion → Beitrag): Absatz, Zwischentitel, Zitat, Bild (ein Foto in drei
 * Breiten oder Galerie), Bildpaar, Bildstrecke, Bild & Text und Hinweiskasten als Karten, die sich verschieben
 * (Ziehen am Griff oder ↑ ↓), einfügen und löschen lassen. Gespeichert wird Markdown (src/lib/news-bloecke.ts).
 *
 * Bewusst ruhig: Englisch und Darstellung sind eingeklappt; in Galerien erscheinen die Angaben eines Fotos
 * erst nach Klick darauf. Bildbeschreibung und Ausschnitt gehören zum Foto (Mediathek) und gelten überall.
 */
import { h } from './dom';
import { fokusFlaeche } from './medien';
import { newsBildUrl } from '../../../lib/markdown';
import { FORMATE, type Bild, type BilderBlock, type Block, type Breite, type Format, type Schritt, type SchritteBlock, type TextBlock } from '../../../lib/news-bloecke';

export { h };

/** Bild im Editor: während des Hochladens mit lokaler Vorschau */
type EBild = Bild & { lokal?: string; laedt?: boolean };
type EBilder = Omit<BilderBlock, 'bilder'> & { bilder: EBild[] };
type ESchritt = Schritt & { lokal?: string; laedt?: boolean };
type ESchritte = Omit<SchritteBlock, 'schritte'> & { schritte: ESchritt[] };
/** `platzhalter`: Hinweis aus einer Vorlage (wird nicht gespeichert) */
export type EBlock = (TextBlock | EBilder | ESchritte) & { platzhalter?: string };
type Typ = EBlock['typ'];
/** Was sich einfügen lässt (Bild, Bildpaar und Bildstrecke sind Bilder-Blöcke mit eigener Darstellung) */
type Art = Exclude<Typ, 'bilder'> | 'bild' | 'paar' | 'strecke';
/** Mindest- und Höchstzahl der Fotos bzw. Schritte */
const GRENZEN = { paar: [2, 2], strecke: [3, 12], schritte: [2, 6] } as const;

export interface Baustein {
  name: string;
  typ: 'text' | 'hinweis';
  text: string;
  text_en?: string;
}
/** Foto aus der Mediathek mit seinen Angaben */
export interface Gewaehlt {
  datei: string;
  alt: string;
  alt_en: string;
  credit: string;
  focus: string | null;
}

export interface AbschnittOptionen {
  start: EBlock[];
  /** Foto hochladen → Pfad im Bucket */
  hochladen: (f: File) => Promise<string>;
  /** Foto drehen → neuer Pfad */
  drehen: (datei: string) => Promise<string>;
  /** Link auswählen (Seiten, Personen, Termine, News oder eigene Adresse) */
  linkWaehlen: (text: string) => Promise<{ href: string; text: string } | null>;
  /** Mediathek: ein oder mehrere Fotos wählen (auch neu hochgeladene) */
  mediathek: (mehrere: boolean) => Promise<Gewaehlt[]>;
  bausteine: Baustein[];
  /** etwas wurde geändert (für „ungespeichert“, Vorschau, Sicherung) */
  geaendert: () => void;
  /** ein Abschnitt wird bearbeitet (Vorschau scrollt mit) */
  aktiv?: (i: number) => void;
  /** Fehlermeldung zeigen */
  fehler: (text: string) => void;
}

export const TYP_LABEL: Record<Typ, string> = { text: 'Absatz', zwischentitel: 'Zwischentitel', zitat: 'Zitat', bilder: 'Bild', schritte: 'Bild & Text', hinweis: 'Hinweiskasten' };
const ART_LABEL: Record<Art, string> = { text: 'Absatz', zwischentitel: 'Zwischentitel', zitat: 'Zitat', bild: 'Bild', paar: 'Bildpaar', strecke: 'Bildstrecke', schritte: 'Bild & Text', hinweis: 'Hinweiskasten' };
const BREITE_LABEL: [Breite | 'neben', string][] = [['text', 'Textbreite'], ['weit', 'Weit'], ['randlos', 'Randlos'], ['neben', 'Neben dem Text']];
const FORMAT_LABEL: Record<Format, string> = { original: 'Original (nicht zuschneiden)', quer: 'Querformat 3 : 2', hoch: 'Hochformat 3 : 4', quadrat: 'Quadrat' };
const FORMAT_KURZ: Record<Format, string> = { original: 'Original', quer: 'Querformat', hoch: 'Hochformat', quadrat: 'Quadrat' };
const WERKZEUGE = [
  { cmd: 'b', label: 'Fett', icon: 'B' },
  { cmd: 'i', label: 'Kursiv', icon: 'I' },
  { cmd: 'list', label: 'Aufzählung', icon: '•' },
  { cmd: 'h3', label: 'Kleine Überschrift', icon: 'H3' },
  { cmd: 'link', label: 'Link einfügen', icon: '↗' },
];

const bildUrl = (datei: string) => newsBildUrl(datei, import.meta.env.BASE_URL);
let zaehler = 0;
const neueId = () => `ab-${++zaehler}`;

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
    const davor = value.slice(0, start);
    const luecke = start > 0 && davor.trimEnd() !== '' && !davor.endsWith('\n\n') ? '\n' : '';
    ta.setRangeText(luecke + liste.map((l) => prefix + l).join('\n'), start, end, 'end');
    melden();
  };
  const tun: Record<string, () => void> = {
    b: () => umschliessen('**', '**', 'fetter Text'),
    i: () => umschliessen('*', '*', 'kursiver Text'),
    list: () => zeilen('- ', 'Punkt'),
    h3: () => zeilen('### ', 'Kleine Überschrift'),
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
function wachsend<T extends HTMLTextAreaElement>(ta: T, min = 60) {
  const fit = () => {
    ta.style.height = 'auto';
    ta.style.height = `${Math.max(ta.scrollHeight + 2, min)}px`;
  };
  ta.addEventListener('input', fit);
  ta.addEventListener('groesse', fit);
  requestAnimationFrame(fit);
  return ta;
}

export function abschnittEditor(root: HTMLElement, opt: AbschnittOptionen) {
  let bloecke: EBlock[] = [];
  /** gewähltes Foto je Galerie (nur dann erscheinen dessen Angaben) */
  const gewaehlt = new WeakMap<EBlock, number>();
  /** aufgeklappte Bereiche je Abschnitt, damit sie beim Neuzeichnen offen bleiben */
  const offen = new WeakMap<object, Set<string>>();
  let letzterFotonachweis = '';
  let gezogen: { art: 'block'; i: number } | { art: 'bild'; b: EBilder; j: number } | null = null;

  const geaendert = () => opt.geaendert();
  const neuerSchritt = (): ESchritt => ({ datei: '', alt: '', titel: '', text: '' });
  const neu = (art: Art): EBlock => {
    if (art === 'bild' || art === 'paar' || art === 'strecke') {
      return {
        typ: 'bilder', darstellung: art === 'bild' ? 'raster' : art, breite: 'weit', format: 'original', spalten: 3,
        titel: '', titel_en: '', text: '', text_en: '', foto: letzterFotonachweis, bilder: [],
      };
    }
    if (art === 'schritte') return { typ: 'schritte', titel: '', titel_en: '', foto: '', schritte: [neuerSchritt(), neuerSchritt()] };
    return art === 'zitat' ? { typ: art, de: '', en: '', wer: '' } : { typ: art, de: '', en: '' };
  };

  /** Aufklappbarer Bereich, der sich merkt, ob er offen ist */
  function klappe(besitzer: object, name: string, cls: string, summary: (Node | string)[], inhalt: (Node | null)[]) {
    const set = offen.get(besitzer) ?? new Set<string>();
    offen.set(besitzer, set);
    const d = h('details', { class: cls, open: set.has(name) }, h('summary', {}, ...summary), ...inhalt);
    d.addEventListener('toggle', () => (d.open ? set.add(name) : set.delete(name)));
    return d;
  }

  function einfuegen(i: number, b: EBlock) {
    bloecke.splice(i, 0, b);
    zeichnen();
    geaendert();
    springen(i);
    return b;
  }

  const TYPEN: Art[] = ['text', 'zwischentitel', 'zitat', 'bild', 'paar', 'strecke', 'schritte', 'hinweis'];
  const bausteinKnoepfe = (i: number) =>
    opt.bausteine.map((bs) => h('button', {
      type: 'button', class: 'ab-plus__opt ab-plus__opt--leise', text: bs.name, title: 'Baustein einfügen',
      onclick: () => einfuegen(i, { typ: bs.typ, de: bs.text, en: bs.text_en ?? '' }),
    }));

  /** zwischen den Karten: „+“ klappt die Auswahl aus */
  function einfuegeLeiste(i: number) {
    const menue = h('div', { class: 'ab-plus__menue', hidden: true },
      ...TYPEN.map((t) => h('button', { type: 'button', class: 'ab-plus__opt', text: `+ ${ART_LABEL[t]}`, onclick: () => einfuegen(i, neu(t)) })),
      ...bausteinKnoepfe(i));
    const knopf = h('button', {
      type: 'button', class: 'ab-plus__btn', 'aria-expanded': 'false', text: '+ Hier einfügen', 'aria-label': `Block an Stelle ${i + 1} einfügen`,
      onclick: () => {
        menue.hidden = !menue.hidden;
        knopf.setAttribute('aria-expanded', String(!menue.hidden));
      },
    });
    return h('div', { class: 'ab-plus' }, knopf, menue);
  }

  /** unten: „Block hinzufügen“ */
  function endeLeiste() {
    const i = bloecke.length;
    return h('div', { class: 'ab-ende' },
      h('span', { class: 'ab-ende__k', text: 'Block hinzufügen' }),
      ...TYPEN.map((t) => h('button', { type: 'button', class: 'ab-plus__opt', text: `+ ${ART_LABEL[t]}`, onclick: () => einfuegen(i, neu(t)) })),
      opt.bausteine.length ? h('span', { class: 'ab-ende__k ab-ende__k--bs', text: 'Baustein' }) : null,
      ...bausteinKnoepfe(i));
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
    const leer = b.typ === 'bilder' ? !b.bilder.length : b.typ === 'schritte' ? !b.schritte.some((x) => x.datei || x.titel || x.text) : !b.de.trim() && !b.en.trim();
    if (!leer && !confirm(`Diesen Block (${titelVon(b)}) löschen?`)) return;
    bloecke.splice(i, 1);
    if (!bloecke.length) bloecke.push(neu('text'));
    zeichnen();
    geaendert();
  }

  /** „Englisch“ zum Aufklappen */
  function englisch(besitzer: EBlock, felder: (Node | null)[], uebersetzt: () => boolean) {
    const status = h('span', { class: 'ab-en__status', text: uebersetzt() ? '· übersetzt' : '' });
    const d = klappe(besitzer, 'en', 'ab-en', ['Englisch ', status], felder);
    d.addEventListener('input', () => (status.textContent = uebersetzt() ? '· übersetzt' : ''));
    return d;
  }

  // ---------- Text, Zwischentitel, Zitat, Hinweis ----------
  function textKarte(b: EBlock & TextBlock, i: number) {
    const label = `${TYP_LABEL[b.typ]}, Block ${i + 1}`;
    const setze = (k: 'de' | 'en' | 'wer') => (e: Event) => {
      b[k] = (e.target as HTMLInputElement).value;
      geaendert();
    };
    if (b.typ === 'zwischentitel') {
      const de = h('input', { class: 'ab-zt', value: b.de, maxLength: 160, 'aria-label': label, 'data-key': `${i}-de`, placeholder: b.platzhalter ?? 'Zwischentitel', oninput: setze('de') });
      const en = h('input', { class: 'ab-zt ab-zt--en', value: b.en, maxLength: 160, lang: 'en', 'aria-label': `${label}: Englisch`, 'data-key': `${i}-en`, placeholder: 'Heading (optional)', oninput: setze('en') });
      return [de, englisch(b, [en], () => !!b.en.trim())];
    }
    if (b.typ === 'zitat') {
      const de = wachsend(h('textarea', { class: 'ab-zitat', rows: 2, value: b.de, 'aria-label': label, 'data-key': `${i}-de`, placeholder: b.platzhalter ?? 'Zitat ohne Anführungszeichen', oninput: setze('de') }) as HTMLTextAreaElement, 56);
      const wer = h('input', { class: 'ab-wer', value: b.wer ?? '', maxLength: 160, 'aria-label': `${label}: Wer sagt das?`, 'data-key': `${i}-wer`, placeholder: 'Name · Rolle', oninput: setze('wer') });
      const en = wachsend(h('textarea', { class: 'ab-ta ab-ta--en', rows: 2, value: b.en, lang: 'en', 'aria-label': `${label}: Englisch`, 'data-key': `${i}-en`, placeholder: 'Quote in English (optional)', oninput: setze('en') }) as HTMLTextAreaElement, 56);
      return [de, wer, englisch(b, [en], () => !!b.en.trim())];
    }
    const ta = wachsend(h('textarea', {
      id: neueId(), class: 'ab-ta', rows: 3, value: b.de, 'aria-label': label, 'data-key': `${i}-de`,
      placeholder: b.platzhalter ?? (b.typ === 'hinweis' ? 'z. B. Förderhinweis: »…« wurde gefördert von …' : 'Text schreiben …'),
      oninput: setze('de'),
    }) as HTMLTextAreaElement, b.typ === 'hinweis' ? 60 : 76);
    const taEn = wachsend(h('textarea', {
      class: 'ab-ta ab-ta--en', rows: 3, value: b.en, lang: 'en', 'aria-label': `${label}: Englisch`, 'data-key': `${i}-en`,
      placeholder: 'English version (optional). Leer = deutscher Text.', oninput: setze('en'),
    }) as HTMLTextAreaElement, 60);
    const en = englisch(b, [werkzeuge(taEn, `${label} Englisch`, opt.linkWaehlen), taEn], () => !!b.en.trim());
    en.addEventListener('toggle', () => en.open && taEn.dispatchEvent(new Event('groesse')));
    return [werkzeuge(ta, label, opt.linkWaehlen), ta, en];
  }

  // ---------- Bilder ----------
  const imBucket = (d: string) => !/^(\/|https:|\.\.)/.test(d);
  const dateiInput = (b: EBilder, label: string, mehrere = true) => {
    const input = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: mehrere, 'aria-label': label }) as HTMLInputElement;
    input.addEventListener('change', () => {
      if (input.files?.length) void dateienDazu(b, [...input.files]);
      input.value = '';
    });
    return input;
  };
  const feld = (id: string, label: string, input: HTMLElement, hinweis?: string) =>
    h('div', { class: 'i-field' }, h('label', { for: id, text: label }), input, hinweis ? h('span', { class: 'i-hint', text: hinweis }) : null);
  const eingabe = (key: string, wert: string, setzen: (v: string) => void, extra: Record<string, unknown> = {}) => {
    const id = neueId();
    return [id, h('input', { id, 'data-key': key, value: wert, oninput: (e: Event) => { setzen((e.target as HTMLInputElement).value); geaendert(); }, ...extra })] as const;
  };

  /** Angaben eines Fotos: Bildbeschreibung (optional) – gilt überall, wo das Foto steht */
  function fotoAngaben(x: EBild, key: string) {
    const [altId, alt] = eingabe(`${key}-alt`, x.alt, (v) => (x.alt = v), { maxLength: 300, placeholder: 'Was ist zu sehen?' });
    return feld(altId, 'Bildbeschreibung (optional)', alt, 'Hilft Menschen, die das Foto nicht sehen können. Gilt überall, wo das Foto steht.');
  }

  /** Breite eines einzelnen Fotos: Textbreite, weit, randlos oder neben dem Text */
  function breite(b: EBilder) {
    const aktuell = b.darstellung === 'neben' ? 'neben' : b.breite;
    return h('div', { class: 'fb-breite', role: 'group', 'aria-label': 'Breite' },
      h('span', { class: 'fb-breite__k', text: 'Breite' }),
      ...BREITE_LABEL.map(([v, l]) => h('button', {
        type: 'button', class: 'fb-breite__b', text: l, 'aria-pressed': String(aktuell === v),
        onclick: () => {
          if (v === 'neben') b.darstellung = 'neben';
          else {
            b.darstellung = 'raster';
            b.breite = v;
          }
          zeichnen();
          geaendert();
        },
      })));
  }

  /** Darstellung (eingeklappt), die Zusammenfassung zeigt den Stand */
  function darstellung(b: EBilder) {
    const n = b.bilder.length;
    const optionen = h('div', { class: 'fb-optionen' });
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
    const stand = [FORMAT_KURZ[b.format], n > 1 ? `${b.spalten} pro Reihe` : ''].filter(Boolean).join(' · ');
    return klappe(b, 'mehr', 'ab-en fb-mehr', ['Darstellung ', h('span', { class: 'fb-mehr__stand', text: stand })], [optionen]);
  }

  /** Bildunterschrift und Fotonachweis (für den ganzen Block) */
  function unterschrift(b: EBilder, i: number) {
    const n = b.bilder.length;
    const [capId, cap] = eingabe(`${i}-cap`, b.text, (v) => (b.text = v), { maxLength: 300, placeholder: 'optional, z. B. Die Teilnehmenden von »re-preview« · 14.11.2024' });
    const [fotoId, foto] = eingabe(`${i}-foto`, b.foto, (v) => { b.foto = v; letzterFotonachweis = v; }, { maxLength: 120, placeholder: 'Name der Fotograf:in' });
    return h('div', { class: 'fb-texte' },
      feld(capId, 'Bildunterschrift', cap),
      feld(fotoId, n > 1 ? 'Fotos von' : 'Fotonachweis', foto));
  }

  function bilderEnglisch(b: EBilder, i: number, x?: EBild) {
    const felder: HTMLElement[] = [];
    if (x) {
      const [id, alt] = eingabe(`${i}-alten`, x.alt_en ?? '', (v) => (x.alt_en = v), { maxLength: 300, lang: 'en', class: 'fb-en', placeholder: 'Image description' });
      felder.push(feld(id, 'Bildbeschreibung (Englisch)', alt));
    }
    const [id, cap] = eingabe(`${i}-capen`, b.text_en, (v) => (b.text_en = v), { maxLength: 300, lang: 'en', class: 'fb-en', placeholder: 'Caption' });
    felder.push(feld(id, 'Bildunterschrift (Englisch)', cap));
    return englisch(b, felder, () => !!(b.text_en || x?.alt_en));
  }

  function bilderKarte(b: EBlock & EBilder, i: number) {
    if (b.darstellung === 'paar' || b.darstellung === 'strecke') return mehrereKarte(b, i);
    const n = b.bilder.length;
    const ziel = h('div', { class: `fb${n === 0 ? ' fb--leer' : ''}` });
    const mediathek = (mehrere: boolean, text: string, cls = 'md-knopf') =>
      h('button', { type: 'button', class: cls, text, onclick: () => void ausMediathek(b, mehrere && n !== 0 ? 'dazu' : n === 1 && !mehrere ? 'ersetzen' : 'dazu', mehrere) });

    if (n === 0) {
      ziel.append(
        h('span', { class: 'fb-leer__text', text: 'Bild hierher ziehen oder' }),
        h('button', { type: 'button', class: 'md-knopf md-knopf--voll', text: 'Mediathek', onclick: () => void ausMediathek(b, 'dazu', true) }),
        h('label', { class: 'md-knopf' }, 'Hochladen', dateiInput(b, `Fotos hochladen (Block ${i + 1})`)),
      );
    } else if (n === 1) {
      // Ein Foto: links das Foto (Klick setzt den Ausschnitt), rechts die Angaben
      const x = b.bilder[0];
      const bild = x.laedt
        ? h('div', { class: 'md-fokus fb-einzel__bild is-laedt' }, h('img', { src: x.lokal ?? bildUrl(x.datei), alt: '' }), h('span', { class: 'fb-bild__laedt', text: 'lädt …' }))
        : imBucket(x.datei)
          ? fokusFlaeche(bildUrl(x.datei), x.fokus ?? null, (f) => { x.fokus = f; geaendert(); })
          : h('div', { class: 'md-fokus' }, h('img', { src: bildUrl(x.datei), alt: '' }));
      bild.classList.add('fb-einzel__bild');
      ziel.append(h('div', { class: 'fb-einzel' },
        bild,
        h('div', { class: 'fb-einzel__seite' },
          fotoAngaben(x, `${i}-0`),
          unterschrift(b, i),
          h('div', { class: 'fb-knoepfe' },
            mediathek(false, 'Bild ändern'),
            h('button', { type: 'button', class: 'md-knopf', text: '↻ Drehen', disabled: !!x.laedt || !imBucket(x.datei), onclick: () => void fotoDrehen(x) }),
            h('label', { class: 'md-knopf', title: 'Aus einem Foto wird eine Galerie' }, '+ Weitere Fotos', dateiInput(b, `Weitere Fotos hochladen (Block ${i + 1})`)),
            mediathek(true, '+ Aus Mediathek', 'md-leise'),
          ))));
      ziel.append(breite(b), darstellung(b), bilderEnglisch(b, i, x));
    } else {
      ziel.append(galerie(b, i), unterschrift(b, i), darstellung(b), bilderEnglisch(b, i));
    }

    // Fotos von außen hineinziehen
    ziel.addEventListener('dragover', (e) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        ziel.classList.add('is-drop');
      }
    });
    ziel.addEventListener('dragleave', (e) => !ziel.contains(e.relatedTarget as Node) && ziel.classList.remove('is-drop'));
    ziel.addEventListener('drop', (e) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      ziel.classList.remove('is-drop');
      const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/'));
      if (files.length) void dateienDazu(b, files);
    });
    return [ziel];
  }

  /** Galerie: Raster wie auf der Website; Fotos lassen sich ziehen, Klick zeigt ihre Angaben */
  function galerie(b: EBilder, i: number) {
    const n = b.bilder.length;
    const sel = gewaehlt.get(b as EBlock);
    const raster = h('div', { class: `fb-raster fb--${b.format}`, style: `--sp:${b.spalten}` });
    b.bilder.forEach((x, j) => {
      const karte = h('div', { class: `fb-bild${j === sel ? ' is-sel' : ''}${x.laedt ? ' is-laedt' : ''}`, draggable: 'true' },
        h('button', {
          type: 'button', class: 'fb-bild__wahl', 'aria-pressed': String(j === sel),
          'aria-label': `Foto ${j + 1} bearbeiten${x.alt ? `: ${x.alt}` : ''}`,
          onclick: () => {
            if (sel === j) gewaehlt.delete(b as EBlock);
            else gewaehlt.set(b as EBlock, j);
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
        gewaehlt.delete(b as EBlock);
        gezogen = null;
        zeichnen();
        geaendert();
      });
      raster.append(karte);
    });
    raster.append(h('div', { class: 'fb-plus' },
      h('label', { class: 'fb-plus__hoch' }, h('span', { 'aria-hidden': 'true', text: '+' }), h('span', { text: 'Fotos hinzufügen' }), dateiInput(b, `Fotos hinzufügen (Block ${i + 1})`)),
      h('button', { type: 'button', class: 'md-leise', text: 'Aus Mediathek', onclick: () => void ausMediathek(b, 'dazu', true) })));

    // gewähltes Foto bearbeiten (nur nach Klick)
    const x = sel !== undefined ? b.bilder[sel] : undefined;
    let detail: HTMLElement | null = null;
    if (x && sel !== undefined) {
      const knopf = (text: string, label: string, fn: () => void, aus = false) => h('button', { type: 'button', class: 'md-knopf', text, 'aria-label': label, disabled: aus, onclick: fn });
      const bild = imBucket(x.datei) && !x.laedt
        ? fokusFlaeche(bildUrl(x.datei), x.fokus ?? null, (f) => {
            x.fokus = f;
            raster.querySelectorAll<HTMLImageElement>('.fb-bild img')[sel]?.style.setProperty('object-position', f);
            geaendert();
          })
        : h('div', { class: 'md-fokus' }, h('img', { src: x.lokal ?? bildUrl(x.datei), alt: '' }));
      const [enId, en] = eingabe(`${i}-alten-${sel}`, x.alt_en ?? '', (v) => (x.alt_en = v), { maxLength: 300, lang: 'en', class: 'fb-en', placeholder: 'Image description (optional)' });
      detail = h('div', { class: 'fb-detail' },
        bild,
        h('div', { class: 'fb-detail__seite' },
          h('div', { class: 'fb-detail__kopf' },
            h('p', { class: 'fb-detail__h', text: `Foto ${sel + 1} von ${n}` }),
            h('button', { type: 'button', class: 'btn btn--secondary btn--sm', 'data-fertig': '', text: 'Fertig', onclick: () => { gewaehlt.delete(b as EBlock); zeichnen(); } })),
          h('p', { class: 'i-hint', text: 'Klick ins Foto setzt den Ausschnitt: Diese Stelle bleibt sichtbar, wenn das Foto zugeschnitten wird.' }),
          fotoAngaben(x, `${i}-${sel}`),
          feld(enId, 'Bildbeschreibung (Englisch)', en),
          h('div', { class: 'fb-knoepfe' },
            knopf('↻ Drehen', `Foto ${sel + 1} drehen`, () => void fotoDrehen(x), !!x.laedt || !imBucket(x.datei)),
            knopf('← Nach vorn', `Foto ${sel + 1} nach vorn`, () => fotoSchieben(b, sel, -1), sel === 0),
            knopf('Nach hinten →', `Foto ${sel + 1} nach hinten`, () => fotoSchieben(b, sel, 1), sel === n - 1),
            knopf('Entfernen', `Foto ${sel + 1} entfernen`, () => fotoEntfernen(b, sel)),
          ),
        ),
      );
    }
    return h('div', { class: 'fb-galerie' }, raster, detail);
  }

  function layoutNachZahl(b: EBilder, vorher: number) {
    if (b.darstellung === 'paar' || b.darstellung === 'strecke') return;
    if (vorher === 0 && b.bilder.length === 1) b.format = 'original';
    if (vorher <= 1 && b.bilder.length > 1) {
      b.format = 'quer';
      b.darstellung = 'raster';
      b.spalten = Math.min(4, b.bilder.length) as 2 | 3 | 4;
    }
  }

  /** Bildpaar und Bildstrecke: nicht mehr Fotos als erlaubt */
  function platz<T>(b: EBilder, liste: T[]): T[] {
    if (b.darstellung !== 'paar' && b.darstellung !== 'strecke') return liste;
    const frei = Math.max(0, GRENZEN[b.darstellung][1] - b.bilder.length);
    if (liste.length > frei) opt.fehler(b.darstellung === 'paar' ? 'Ein Bildpaar hat genau 2 Bilder.' : `Höchstens 12 Bilder pro Bildstrecke. ${liste.length - frei} nicht übernommen.`);
    return liste.slice(0, frei);
  }

  async function dateienDazu(b: EBilder, alle: File[]) {
    const files = platz(b, alle);
    if (!files.length) return;
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

  /** Mediathek: Fotos hinzufügen oder das eine Foto ersetzen */
  async function ausMediathek(b: EBilder, art: 'dazu' | 'ersetzen', mehrere: boolean) {
    const gewaehlte = await opt.mediathek(mehrere);
    const fotos = art === 'ersetzen' ? gewaehlte : platz(b, gewaehlte);
    if (!fotos.length) return;
    const bilder: EBild[] = fotos.map((f) => ({ datei: f.datei, alt: f.alt, ...(f.alt_en ? { alt_en: f.alt_en } : {}), ...(f.focus ? { fokus: f.focus } : {}) }));
    if (art === 'ersetzen') b.bilder.splice(0, 1, bilder[0]);
    else {
      const vorher = b.bilder.length;
      b.bilder.push(...bilder);
      layoutNachZahl(b, vorher);
    }
    if (!b.foto && b.bilder.length === 1 && fotos[0].credit) b.foto = fotos[0].credit;
    zeichnen();
    geaendert();
  }

  function fotoSchieben(b: EBilder, j: number, d: number) {
    const k = j + d;
    if (k < 0 || k >= b.bilder.length) return;
    [b.bilder[j], b.bilder[k]] = [b.bilder[k], b.bilder[j]];
    gewaehlt.set(b as EBlock, k);
    zeichnen();
    geaendert();
  }

  function fotoEntfernen(b: EBilder, j: number) {
    b.bilder.splice(j, 1);
    gewaehlt.delete(b as EBlock);
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

  // ---------- Bildpaar und Bildstrecke ----------
  /** Kachel eines Fotos: Klick ins Foto setzt den Ausschnitt, × entfernt, darunter Beschreibung und Unterschrift */
  function bildKachel(b: EBilder, j: number, i: number) {
    const x = b.bilder[j];
    const bild = x.laedt || !imBucket(x.datei)
      ? h('div', { class: `md-fokus${x.laedt ? ' is-laedt' : ''}` }, h('img', { src: x.lokal ?? bildUrl(x.datei), alt: '' }), x.laedt ? h('span', { class: 'fb-bild__laedt', text: 'lädt …' }) : null)
      : fokusFlaeche(bildUrl(x.datei), x.fokus ?? null, (f) => { x.fokus = f; geaendert(); }, 'Klick ins Foto setzt den Ausschnitt.');
    const [altId, alt] = eingabe(`${i}-${j}-alt`, x.alt, (v) => (x.alt = v), { maxLength: 300, placeholder: 'Was ist zu sehen?', class: `fm-alt${x.alt.trim() ? '' : ' is-leer'}` });
    const [capId, cap] = eingabe(`${i}-${j}-cap`, x.text ?? '', (v) => (x.text = v), { maxLength: 300, placeholder: 'Bildunterschrift', class: 'fm-cap' });
    const karte = h('div', { class: 'fm-kachel', draggable: 'true' },
      h('div', { class: 'fm-kachel__bild' },
        bild,
        h('span', { class: 'fm-kachel__nr', text: String(j + 1).padStart(2, '0'), 'aria-hidden': 'true' }),
        h('button', { type: 'button', class: 'fm-kachel__weg', text: '×', 'aria-label': `Foto ${j + 1} entfernen`, onclick: () => fotoEntfernen(b, j) })),
      h('label', { class: 'visually-hidden', for: altId, text: `Foto ${j + 1}: Bildbeschreibung` }), alt,
      h('label', { class: 'visually-hidden', for: capId, text: `Foto ${j + 1}: Bildunterschrift` }), cap);
    // Reihenfolge per Ziehen
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
      gezogen = null;
      zeichnen();
      geaendert();
    });
    return karte;
  }

  function mehrereKarte(b: EBlock & EBilder, i: number) {
    const paar = b.darstellung === 'paar';
    const [min, max] = GRENZEN[paar ? 'paar' : 'strecke'];
    const n = b.bilder.length;
    const ziel = h('div', { class: 'fb fm' });
    if (!paar) {
      ziel.append(h('input', {
        class: 'ab-zt fm-titel', value: b.titel, maxLength: 120, 'data-key': `${i}-titel`, 'aria-label': `Titel der Bildstrecke (Block ${i + 1})`,
        placeholder: 'Titel der Bildstrecke', oninput: (e: Event) => { b.titel = (e.target as HTMLInputElement).value; geaendert(); },
      }));
    }
    const raster = h('div', { class: 'fm-raster' }, ...b.bilder.map((_, j) => bildKachel(b, j, i)));
    if (n < max) {
      raster.append(h('div', { class: 'fm-plus' },
        h('span', { text: n ? 'Weitere Bilder hierher ziehen' : 'Bilder hierher ziehen' }),
        h('button', { type: 'button', class: 'md-knopf md-knopf--voll', text: 'Mediathek', onclick: () => void ausMediathek(b, 'dazu', true) }),
        h('label', { class: 'md-knopf' }, 'Hochladen', dateiInput(b, `Fotos hochladen (Block ${i + 1})`))));
    }
    const hinweis = paar
      ? n === 2 ? 'Hoch- und Querformat werden auf der Website gleich hoch gesetzt.' : 'Ein Bildpaar braucht genau 2 Bilder.'
      : n < min ? 'Mindestens 3, höchstens 12 Bilder.' : `${n} Bilder · auf der Website seitlich zum Blättern.`;
    const [fotoId, foto] = eingabe(`${i}-foto`, b.foto, (v) => { b.foto = v; letzterFotonachweis = v; }, { maxLength: 120, placeholder: 'leer = Angaben aus der Mediathek' });
    const enFelder: HTMLElement[] = [];
    if (!paar) {
      const [id, t] = eingabe(`${i}-titelen`, b.titel_en, (v) => (b.titel_en = v), { maxLength: 120, lang: 'en', class: 'fb-en', placeholder: 'Title' });
      enFelder.push(feld(id, 'Titel (Englisch)', t));
    }
    b.bilder.forEach((x, j) => {
      const [aId, a] = eingabe(`${i}-${j}-alten`, x.alt_en ?? '', (v) => (x.alt_en = v), { maxLength: 300, lang: 'en', class: 'fb-en', placeholder: 'Image description' });
      const [cId, c] = eingabe(`${i}-${j}-capen`, x.text_en ?? '', (v) => (x.text_en = v), { maxLength: 300, lang: 'en', class: 'fb-en', placeholder: 'Caption' });
      enFelder.push(h('div', { class: 'ne-row' }, feld(aId, `Foto ${j + 1}: Bildbeschreibung (Englisch)`, a), feld(cId, `Foto ${j + 1}: Bildunterschrift (Englisch)`, c)));
    });
    ziel.append(
      raster,
      h('span', { class: `i-hint fm-hinweis${n < min ? ' is-offen' : ''}`, text: hinweis }),
      feld(fotoId, 'Fotos von', foto),
      englisch(b, enFelder, () => !!(b.titel_en || b.bilder.some((x) => x.alt_en || x.text_en))),
    );
    // Fotos von außen hineinziehen
    ziel.addEventListener('dragover', (e) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        ziel.classList.add('is-drop');
      }
    });
    ziel.addEventListener('dragleave', (e) => !ziel.contains(e.relatedTarget as Node) && ziel.classList.remove('is-drop'));
    ziel.addEventListener('drop', (e) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      ziel.classList.remove('is-drop');
      const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/'));
      if (files.length) void dateienDazu(b, files);
    });
    return [ziel];
  }

  // ---------- Bild & Text ----------
  async function schrittBild(st: ESchritt, quelle: File | 'mediathek') {
    if (quelle === 'mediathek') {
      const [m] = await opt.mediathek(false);
      if (!m) return;
      Object.assign(st, { datei: m.datei, alt: m.alt, ...(m.alt_en ? { alt_en: m.alt_en } : {}), fokus: m.focus ?? undefined });
      zeichnen();
      geaendert();
      return;
    }
    st.lokal = URL.createObjectURL(quelle);
    st.laedt = true;
    zeichnen();
    try {
      st.datei = await opt.hochladen(quelle);
      st.alt = '';
      st.fokus = undefined;
    } catch (err) {
      opt.fehler(`„${quelle.name}“: ${(err as Error).message || 'Hochladen hat nicht geklappt.'}`);
    }
    URL.revokeObjectURL(st.lokal);
    delete st.lokal;
    st.laedt = false;
    zeichnen();
    geaendert();
  }

  function schritteKarte(b: EBlock & ESchritte, i: number) {
    const n = b.schritte.length;
    const ziel = h('div', { class: 'fs' });
    ziel.append(h('input', {
      class: 'ab-zt fm-titel', value: b.titel, maxLength: 120, 'data-key': `${i}-titel`, 'aria-label': `Titel (Bild & Text, Block ${i + 1})`,
      placeholder: 'Titel, z. B. Ein Tag in der Stadt', oninput: (e: Event) => { b.titel = (e.target as HTMLInputElement).value; geaendert(); },
    }));
    const tauschen = (j: number, k: number) => {
      if (k < 0 || k >= n) return;
      [b.schritte[j], b.schritte[k]] = [b.schritte[k], b.schritte[j]];
      zeichnen();
      geaendert();
    };
    b.schritte.forEach((st, j) => {
      const nr = String(j + 1).padStart(2, '0');
      const datei = (label: string) => {
        const input = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', 'aria-label': `${label} (Schritt ${j + 1})` }) as HTMLInputElement;
        input.addEventListener('change', () => {
          const f = input.files?.[0];
          input.value = '';
          if (f) void schrittBild(st, f);
        });
        return input;
      };
      const bild = st.datei || st.laedt
        ? h('div', { class: 'fs-bild' },
            st.laedt || !imBucket(st.datei)
              ? h('div', { class: `md-fokus${st.laedt ? ' is-laedt' : ''}` }, h('img', { src: st.lokal ?? bildUrl(st.datei), alt: '' }))
              : fokusFlaeche(bildUrl(st.datei), st.fokus ?? null, (f) => { st.fokus = f; geaendert(); }, 'Klick ins Foto setzt den Ausschnitt.'),
            h('button', { type: 'button', class: 'fs-bild__aendern', text: 'Ändern', onclick: () => void schrittBild(st, 'mediathek') }))
        : h('div', { class: 'fs-leer' },
            h('button', { type: 'button', class: 'md-knopf md-knopf--voll', text: 'Bild wählen', onclick: () => void schrittBild(st, 'mediathek') }),
            h('label', { class: 'md-knopf' }, 'Hochladen', datei('Bild hochladen')));
      bild.addEventListener('dragover', (e) => {
        if (!e.dataTransfer?.types.includes('Files')) return;
        e.preventDefault();
        bild.classList.add('is-drop');
      });
      bild.addEventListener('dragleave', () => bild.classList.remove('is-drop'));
      bild.addEventListener('drop', (e) => {
        const f = [...(e.dataTransfer?.files ?? [])].find((x) => x.type.startsWith('image/'));
        if (!f) return;
        e.preventDefault();
        e.stopPropagation();
        bild.classList.remove('is-drop');
        void schrittBild(st, f);
      });
      const [tId, titel] = eingabe(`${i}-${j}-titel`, st.titel, (v) => (st.titel = v), { maxLength: 120, placeholder: 'Kurzer Titel', class: 'fs-titel' });
      const text = wachsend(h('textarea', {
        class: 'fs-text', rows: 2, value: st.text, 'data-key': `${i}-${j}-text`, 'aria-label': `Schritt ${j + 1}: Text`,
        placeholder: 'Zwei, drei Sätze zu diesem Bild', oninput: (e: Event) => { st.text = (e.target as HTMLTextAreaElement).value; geaendert(); },
      }) as HTMLTextAreaElement, 54);
      const [aId, alt] = eingabe(`${i}-${j}-alt`, st.alt, (v) => (st.alt = v), { maxLength: 300, placeholder: 'Bildbeschreibung: Was ist zu sehen?', class: `fm-alt${st.alt.trim() ? '' : ' is-leer'}` });
      ziel.append(h('div', { class: 'fs-schritt' },
        bild,
        h('div', { class: 'fs-seite' },
          h('div', { class: 'fs-kopf' },
            h('span', { class: 'fs-nr', text: `Schritt ${nr}` }),
            h('div', { class: 'ab-block__knoepfe' },
              h('button', { type: 'button', text: '↑', title: 'Nach oben', 'aria-label': `Schritt ${j + 1} nach oben`, disabled: j === 0, onclick: () => tauschen(j, j - 1) }),
              h('button', { type: 'button', text: '↓', title: 'Nach unten', 'aria-label': `Schritt ${j + 1} nach unten`, disabled: j === n - 1, onclick: () => tauschen(j, j + 1) }),
              h('button', { type: 'button', class: 'ab-block__del', text: 'Löschen', 'aria-label': `Schritt ${j + 1} löschen`, disabled: n <= 1, onclick: () => { b.schritte.splice(j, 1); zeichnen(); geaendert(); } }))),
          h('label', { class: 'visually-hidden', for: tId, text: `Schritt ${j + 1}: Titel` }), titel,
          text,
          st.datei ? h('label', { class: 'visually-hidden', for: aId, text: `Schritt ${j + 1}: Bildbeschreibung` }) : null,
          st.datei ? alt : null)));
    });
    const enFelder: HTMLElement[] = [];
    {
      const [id, t] = eingabe(`${i}-titelen`, b.titel_en, (v) => (b.titel_en = v), { maxLength: 120, lang: 'en', class: 'fb-en', placeholder: 'Title' });
      enFelder.push(feld(id, 'Titel (Englisch)', t));
    }
    b.schritte.forEach((st, j) => {
      const [tId, t] = eingabe(`${i}-${j}-titelen`, st.titel_en ?? '', (v) => (st.titel_en = v), { maxLength: 120, lang: 'en', class: 'fb-en', placeholder: 'Title' });
      const [xId, x] = eingabe(`${i}-${j}-texten`, st.text_en ?? '', (v) => (st.text_en = v), { maxLength: 600, lang: 'en', class: 'fb-en', placeholder: 'Text' });
      const [aId, a] = eingabe(`${i}-${j}-alten`, st.alt_en ?? '', (v) => (st.alt_en = v), { maxLength: 300, lang: 'en', class: 'fb-en', placeholder: 'Image description' });
      enFelder.push(h('div', { class: 'ne-row' }, feld(tId, `Schritt ${j + 1}: Titel (Englisch)`, t), feld(xId, `Schritt ${j + 1}: Text (Englisch)`, x), feld(aId, `Schritt ${j + 1}: Bildbeschreibung (Englisch)`, a)));
    });
    const voll = n >= GRENZEN.schritte[1];
    ziel.append(
      h('div', { class: 'fs-fuss' },
        h('button', { type: 'button', class: 'md-knopf', text: '+ Schritt', disabled: voll, onclick: () => { b.schritte.push(neuerSchritt()); zeichnen(); geaendert(); } }),
        h('span', { class: 'i-hint', text: 'Das Bild bleibt auf der Website stehen, die Texte laufen daneben vorbei. 2 bis 6 Schritte.' })),
      englisch(b, enFelder, () => !!(b.titel_en || b.schritte.some((x) => x.titel_en || x.text_en || x.alt_en))),
    );
    return [ziel];
  }

  function titelVon(b: EBlock) {
    if (b.typ !== 'bilder') return TYP_LABEL[b.typ];
    const n = b.bilder.length;
    if (b.darstellung === 'paar') return 'Bildpaar';
    if (b.darstellung === 'strecke') return `Bildstrecke · ${n} ${n === 1 ? 'Bild' : 'Bilder'}`;
    return n > 1 ? `Galerie · ${n} Fotos` : 'Bild';
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
      const titel = titelVon(b);
      const griff = h('span', { class: 'ab-block__griff', title: 'Zum Verschieben ziehen', 'aria-hidden': 'true', draggable: 'true', text: '⠿' });
      const kopf = h('div', { class: 'ab-block__kopf' },
        griff,
        h('span', { class: 'ab-block__typ', text: titel }),
        h('div', { class: 'ab-block__knoepfe' },
          h('button', { type: 'button', 'aria-label': `Block ${i + 1} nach oben`, title: 'Nach oben', disabled: i === 0, onclick: () => verschieben(i, i - 1), text: '↑' }),
          h('button', { type: 'button', 'aria-label': `Block ${i + 1} nach unten`, title: 'Nach unten', disabled: i === bloecke.length - 1, onclick: () => verschieben(i, i + 1), text: '↓' }),
          h('button', { type: 'button', class: 'ab-block__del', 'aria-label': `Block ${i + 1} löschen`, onclick: () => loeschen(i), text: 'Löschen' })));
      const inhalt = b.typ === 'bilder' ? bilderKarte(b, i) : b.typ === 'schritte' ? schritteKarte(b, i) : textKarte(b, i);
      const karte = h('section', { class: `ab-block ab-block--${b.typ}${b.typ === 'bilder' && b.darstellung !== 'raster' ? ` ab-block--${b.darstellung}` : ''}`, 'aria-label': `Block ${i + 1}: ${titel}`, tabindex: -1, 'data-i': String(i) }, kopf, ...inhalt);

      // Ziehen am Griff (nur dort, damit Text markieren weiter geht)
      griff.addEventListener('dragstart', (e) => {
        gezogen = { art: 'block', i };
        e.dataTransfer?.setData('text/plain', `block-${i}`);
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
    root.append(endeLeiste());
    if (key) {
      const el = root.querySelector<HTMLInputElement>(`[data-key="${key}"]`);
      el?.closest('details')?.setAttribute('open', '');
      el?.focus();
      if (el && s0 !== null) el.setSelectionRange(s0, s1);
    }
  }

  /** Zu einem Block springen und ihn bearbeiten */
  function springen(i: number) {
    const karte = root.querySelectorAll<HTMLElement>('.ab-block')[i];
    if (!karte) return;
    karte.scrollIntoView({ block: 'center', behavior: 'smooth' });
    (karte.querySelector<HTMLElement>('.ab-ta:not(.ab-ta--en), .ab-zt:not(.ab-zt--en), .ab-zitat, .fb input[data-key], .fb button, .fs input[data-key]') ?? karte).focus({ preventScroll: true });
    karte.classList.remove('is-markiert');
    void karte.offsetWidth;
    karte.classList.add('is-markiert');
  }

  function setzen(neue: EBlock[]) {
    bloecke = neue.length ? structuredClone(neue) : [neu('text')];
    letzterFotonachweis = bloecke.find((b): b is EBlock & EBilder => b.typ === 'bilder' && !!b.foto)?.foto ?? '';
    // ältere Stände (Sicherung auf dem Gerät) kennen Breite und Titel noch nicht
    for (const b of bloecke) if (b.typ === 'bilder') Object.assign(b, { breite: b.breite ?? 'text', titel: b.titel ?? '', titel_en: b.titel_en ?? '' });
    zeichnen();
  }
  setzen(opt.start);

  const alleBilder = (): { x: EBild | ESchritt; b: EBlock }[] =>
    bloecke.flatMap((b): { x: EBild | ESchritt; b: EBlock }[] =>
      b.typ === 'bilder' ? b.bilder.map((x) => ({ x, b })) : b.typ === 'schritte' ? b.schritte.filter((x) => x.datei || x.laedt).map((x) => ({ x, b })) : [],
    );

  /** Block noch unvollständig? (leer, Bildpaar ohne 2 Bilder, Bildstrecke unter 3, Bild & Text ohne Bild oder Text) */
  const unvollstaendig = (b: EBlock) =>
    b.typ === 'bilder'
      ? b.darstellung === 'paar' || b.darstellung === 'strecke' ? b.bilder.length < GRENZEN[b.darstellung][0] : !b.bilder.length
      : b.typ === 'schritte'
        ? b.schritte.length < GRENZEN.schritte[0] || b.schritte.some((x) => !x.datei || !x.text.trim())
        : !b.de.trim();

  return {
    /** Blöcke zum Speichern (ohne Fotos, die noch hochladen) */
    bloecke(): Block[] {
      return bloecke.map(({ platzhalter: _p, ...b }) =>
        b.typ === 'bilder'
          ? { ...b, bilder: b.bilder.filter((x) => x.datei && !x.laedt).map(({ datei, alt, alt_en, fokus, text, text_en }) => ({ datei, alt, alt_en, fokus, text, text_en })) }
          : b.typ === 'schritte'
            ? { ...b, schritte: b.schritte.map(({ lokal: _l, laedt, ...x }) => ({ ...x, datei: laedt ? '' : x.datei })) }
            : { ...b },
      );
    },
    /** Blöcke ersetzen (Vorlage, Wiederherstellen) */
    setzen,
    springen,
    /** Lädt gerade noch ein Foto hoch? */
    laedt: () => alleBilder().some(({ x }) => x.laedt),
    /** Fotos ohne Bildbeschreibung (für die Checkliste, keine Pflicht) */
    ohneBeschreibung: () => alleBilder().filter(({ x }) => !x.alt.trim()).length,
    /** Bilder-Blöcke ohne Fotonachweis */
    ohneNachweis: () => bloecke.filter((b) => b.typ === 'bilder' && b.bilder.length && !b.foto.trim()).length,
    /** Index des ersten leeren oder unvollständigen Blocks (oder -1); ein einzelner leerer Absatz zählt nicht */
    leer: () => (bloecke.length > 1 || bloecke[0]?.typ !== 'text' ? bloecke.findIndex(unvollstaendig) : -1),
    /** Gibt es schon Text? */
    hatText: () => bloecke.some((b) => (b.typ === 'bilder' ? b.bilder.length : b.typ === 'schritte' ? b.schritte.some((x) => x.datei || x.text) : b.de.trim())),
    /** Alle Fotos mit Angaben (für die Mediathek beim Speichern) */
    fotos: () =>
      alleBilder()
        .filter(({ x }) => x.datei && !x.laedt && imBucket(x.datei))
        .map(({ x, b }) => ({ datei: x.datei, alt: x.alt, alt_en: x.alt_en ?? '', focus: x.fokus ?? null, credit: b.typ === 'bilder' && b.bilder.length === 1 ? b.foto : '' })),
    /** Angaben eines Fotos aus der Mediathek übernehmen (z. B. nach dem Laden) */
    angabenSetzen(medien: Map<string, Gewaehlt>) {
      for (const { x } of alleBilder()) {
        const m = medien.get(x.datei);
        if (!m) continue;
        if (m.alt) x.alt = m.alt;
        if (m.alt_en) x.alt_en = m.alt_en;
        if (m.focus) x.fokus = m.focus;
      }
      zeichnen();
    },
  };
}
