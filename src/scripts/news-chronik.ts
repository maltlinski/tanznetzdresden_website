/**
 * Chronik der News-Übersicht als Archiv (Entwurf News v4): Suche, Rubriken, Jahre, Sortierung (Neueste, Älteste,
 * A–Z), Ansicht (Liste mit Bildern oder kompakte Zeilen) und „Weitere laden“. Die Beiträge stehen fertig im HTML
 * (src/views/NewsView.astro); ohne JavaScript ist einfach alles sichtbar. Hier werden sie nur gefiltert,
 * umsortiert und neu nach Jahr und Monat gruppiert.
 */
import { deadlineText } from '../lib/deadline-text';
import { fuellen } from '../lib/texte-regeln';

type Sortierung = 'neu' | 'alt' | 'az';
type Ansicht = 'liste' | 'kompakt';
interface Texte {
  post: string;
  posts: string;
  deadline: string;
  mehr: string;
  gezeigt: string;
  kategorien: Record<string, string>;
}
interface Eintrag {
  el: HTMLElement;
  datum: string;
  jahr: number;
  kat: string;
  titel: string;
  suchtext: string;
  lead: boolean;
  frist?: string;
  minuten: string;
  mo: string;
  monat: string;
}

const SCHRITT: Record<Ansicht, number> = { liste: 24, kompakt: 60 };
const tage = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.ceil((new Date(y, m - 1, d, 23, 59, 59).getTime() - Date.now()) / 864e5);
};
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = '') => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  return e;
};

export function initChronik(root: HTMLElement) {
  const t = JSON.parse(root.dataset.texte ?? '{}') as Texte;
  const lang = document.documentElement.lang.startsWith('en') ? 'en' : 'de';
  const liste = root.querySelector<HTMLElement>('[data-liste]')!;
  const leiste = root.querySelector<HTMLElement>('[data-leiste]')!;
  const suche = root.querySelector<HTMLInputElement>('[data-suche]')!;
  const leeren = root.querySelector<HTMLButtonElement>('[data-suche-leeren]')!;
  const ergebnis = root.querySelector<HTMLElement>('[data-ergebnis]')!;
  const zurueck = root.querySelector<HTMLButtonElement>('[data-zuruecksetzen]')!;
  const leer = root.querySelector<HTMLElement>('[data-leer]')!;
  const mehr = root.querySelector<HTMLElement>('[data-mehr]')!;
  const anzahl = (n: number) => `${n} ${n === 1 ? t.post : t.posts}`;

  const alle: Eintrag[] = [...liste.querySelectorAll<HTMLElement>('[data-post]')].map((e) => ({
    el: e,
    datum: e.dataset.date!,
    jahr: Number(e.dataset.date!.slice(0, 4)),
    kat: e.dataset.cat!,
    // A–Z: Anführungszeichen und Zeichen am Anfang zählen nicht („»METAMORPHOSE«“ steht unter M)
    titel: e.dataset.titel!.replace(/^[^\p{L}\p{N}]+/u, ''),
    suchtext: e.dataset.suchtext!,
    lead: e.hasAttribute('data-lead'),
    frist: e.dataset.frist,
    minuten: e.dataset.minuten ?? '',
    mo: e.dataset.mo!,
    monat: e.dataset.monat!,
  })).sort((a, b) => b.datum.localeCompare(a.datum));
  const s = { q: '', kat: 'Alle', jahr: 'alle', sort: 'neu' as Sortierung, ansicht: 'liste' as Ansicht, grenze: SCHRITT.liste };

  /** Jahr → Monat → Beiträge; bei A–Z eine einzige Gruppe ohne Überschriften */
  function gruppieren(gezeigt: Eintrag[], proJahr: Map<number, number>) {
    const frag = document.createDocumentFragment();
    let jahr: HTMLElement | null = null;
    let monat: HTMLElement | null = null;
    let jk = '';
    let mk = '';
    const az = s.sort === 'az';
    for (const p of gezeigt) {
      const j = az ? 'az' : String(p.jahr);
      const m = az ? 'az' : p.datum.slice(0, 7);
      if (j !== jk) {
        jk = j;
        mk = '';
        jahr = el('div', 'jjahr');
        if (!az) {
          const kopf = el('div', 'jjahr__kopf');
          kopf.append(el('h3', 'jjahr__zahl', String(p.jahr)), el('span', 'jjahr__n', anzahl(proJahr.get(p.jahr) ?? 0)));
          jahr.append(kopf);
        }
        frag.append(jahr);
      }
      if (m !== mk) {
        mk = m;
        monat = el('div', `jmonat${az ? ' jmonat--ohne' : ''}`);
        if (!az) {
          const label = el('div', 'jmonat__label');
          label.append(el('span', 'jmonat__punkt'), el('span', 'jmonat__mo', p.mo), el('span', 'jmonat__name', p.monat), el('span', 'jmonat__n'));
          label.querySelector('.jmonat__mo')!.setAttribute('aria-hidden', 'true');
          monat.append(label);
        }
        monat.append(el('div', 'jmonat__posts'));
        jahr!.append(monat);
      }
      p.el.hidden = false;
      monat!.querySelector('.jmonat__posts')!.append(p.el);
      // rechts in der kompakten Zeile: offene Frist, bei A–Z das Jahr, sonst die Lesezeit
      const offen = p.frist && tage(p.frist) >= 0;
      p.el.querySelector('[data-rechts]')!.textContent = offen
        ? `${t.deadline} · ${deadlineText(tage(p.frist!), 'label', lang)}`
        : az ? String(p.jahr) : p.minuten;
    }
    frag.querySelectorAll('.jmonat').forEach((m) => {
      const n = m.querySelectorAll('[data-post]').length;
      const z = m.querySelector('.jmonat__n');
      if (z) z.textContent = anzahl(n);
    });
    return frag;
  }

  function zeigen() {
    const qq = s.q.trim().toLowerCase();
    const gefiltert = !!qq || s.kat !== 'Alle' || s.jahr !== 'alle';
    // ohne Filter steht das Titelthema oben auf der Seite, nicht noch einmal in der Chronik
    let treffer = alle.filter(
      (p) => (gefiltert || !p.lead) && (!qq || qq.split(/\s+/).every((w) => p.suchtext.includes(w))) &&
        (s.kat === 'Alle' || p.kat === s.kat) && (s.jahr === 'alle' || p.jahr === Number(s.jahr)),
    );
    if (s.sort === 'alt') treffer = [...treffer].reverse();
    if (s.sort === 'az') treffer = [...treffer].sort((a, b) => a.titel.localeCompare(b.titel, lang));
    const gezeigt = treffer.slice(0, s.grenze);

    const proJahr = new Map<number, number>();
    treffer.forEach((p) => proJahr.set(p.jahr, (proJahr.get(p.jahr) ?? 0) + 1));
    root.dataset.ansicht = s.ansicht;
    liste.replaceChildren(gruppieren(gezeigt, proJahr));

    // Zahlen an Rubriken und Jahren: so viele Treffer, wie ein Klick darauf zeigt (mit Filter gehört das Titelthema dazu)
    const passt = (p: Eintrag) => !qq || qq.split(/\s+/).every((w) => p.suchtext.includes(w));
    const zaehlen = (k: string, art: 'kat' | 'jahr') => {
      const kat = art === 'kat' ? k : s.kat;
      const jahr = art === 'jahr' ? k : s.jahr;
      const filter = !!qq || kat !== 'Alle' || jahr !== 'alle';
      return alle.filter((p) => passt(p) && (filter || !p.lead) && (kat === 'Alle' || p.kat === kat) && (jahr === 'alle' || p.jahr === Number(jahr))).length;
    };
    leiste.querySelectorAll<HTMLButtonElement>('[data-kat]').forEach((b) => {
      const k = b.dataset.kat!;
      const n = zaehlen(k, 'kat');
      const an = s.kat === k;
      b.setAttribute('aria-pressed', String(an));
      b.classList.toggle('is-leer', !n && !an);
      b.querySelector('.chip__count')!.textContent = String(n);
    });
    leiste.querySelectorAll<HTMLButtonElement>('[data-jahr]').forEach((b) => {
      const k = b.dataset.jahr!;
      const n = zaehlen(k, 'jahr');
      const an = s.jahr === k;
      b.setAttribute('aria-pressed', String(an));
      b.classList.toggle('is-leer', !n && !an);
      b.querySelector('.jt__jahr-n')!.textContent = String(n);
    });
    leiste.querySelectorAll<HTMLButtonElement>('[data-sort]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sort === s.sort)));
    leiste.querySelectorAll<HTMLButtonElement>('[data-ansicht]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ansicht === s.ansicht)));
    leeren.hidden = !s.q;

    const teile = [s.kat !== 'Alle' && t.kategorien[s.kat], s.jahr !== 'alle' && s.jahr, qq && `„${s.q.trim()}“`].filter(Boolean);
    ergebnis.textContent = [anzahl(treffer.length), ...teile].join(' · ');
    zurueck.hidden = !gefiltert;
    leer.hidden = treffer.length > 0;

    const rest = treffer.length - gezeigt.length;
    mehr.hidden = rest <= 0;
    if (rest > 0) {
      mehr.querySelector('[data-mehr-text]')!.textContent = fuellen(t.gezeigt, { zahl: gezeigt.length, gesamt: treffer.length });
      mehr.querySelector<HTMLElement>('[data-mehr-balken]')!.style.width = `${Math.round((gezeigt.length / treffer.length) * 100)}%`;
      mehr.querySelector('[data-mehr-knopf]')!.textContent = fuellen(t.mehr, { zahl: Math.min(rest, SCHRITT[s.ansicht]) });
    }
  }

  /** Filter ändern; bei Rubrik, Jahr, Sortierung und Ansicht zurück an den Anfang der Chronik */
  function setzen(neu: Partial<typeof s>, nachOben = true) {
    Object.assign(s, neu, { grenze: SCHRITT[neu.ansicht ?? s.ansicht] });
    zeigen();
    const oben = root.getBoundingClientRect().top + scrollY - (document.querySelector<HTMLElement>('[data-header]')?.offsetHeight ?? 70);
    if (nachOben && scrollY > oben + 40) scrollTo({ top: oben, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  leiste.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button');
    if (!b) return;
    if (b.dataset.kat) setzen({ kat: s.kat === b.dataset.kat ? 'Alle' : b.dataset.kat });
    else if (b.dataset.jahr) setzen({ jahr: s.jahr === b.dataset.jahr && b.dataset.jahr !== 'alle' ? 'alle' : b.dataset.jahr });
    else if (b.dataset.sort) setzen({ sort: b.dataset.sort as Sortierung });
    else if (b.dataset.ansicht) setzen({ ansicht: b.dataset.ansicht as Ansicht });
    else if (b === leeren) {
      setzen({ q: '' }, false);
      suche.value = '';
      suche.focus();
    }
  });
  suche.addEventListener('input', () => setzen({ q: suche.value }, false));
  zurueck.addEventListener('click', () => {
    suche.value = '';
    setzen({ q: '', kat: 'Alle', jahr: 'alle' });
  });
  mehr.querySelector('[data-mehr-knopf]')!.addEventListener('click', () => {
    s.grenze += SCHRITT[s.ansicht];
    zeigen();
  });

  // Monatsnamen kleben unter der Leiste: ihre Höhe als --jt-h
  const messen = () => root.style.setProperty('--jt-h', `${leiste.offsetHeight}px`);
  new ResizeObserver(messen).observe(leiste);

  leiste.hidden = false;
  root.querySelector<HTMLElement>('[data-ergebnis-zeile]')!.hidden = false;
  zeigen();
  messen();
}
