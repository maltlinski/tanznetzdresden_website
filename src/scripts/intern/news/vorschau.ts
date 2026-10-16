/**
 * Vorschau im News-Editor: neben dem Editor (große Bildschirme) und als Vollbild (Knopf „Vorschau“).
 * Beide zeigen src/pages/intern/news/vorschau/ in einem Rahmen und bekommen den Stand per postMessage.
 * Klick in der Vorschau springt im Editor an die Stelle; beim Schreiben scrollt die Vorschau mit.
 */
export type Geraet = 'computer' | 'handy';
export type Sprache = 'de' | 'en';
/** Wohin ein Klick in der Vorschau springt */
export type Sprungziel = { ziel: 'abschnitt'; i: number } | { ziel: 'titel' | 'kurztext' | 'titelfoto' | 'fakten' | 'frist' };

export interface Vorschau {
  /** neuen Stand schicken (gebündelt) */
  neu(): void;
  /** Block i (oder Titel, Teaser, Titelbild) in der Vorschau zeigen und markieren */
  zeigen(i: number | 'titel' | 'kurztext' | 'titelfoto'): void;
}

/** Breite, in der „Computer“ dargestellt und dann verkleinert wird */
const COMPUTER = 1280;
const HANDY = 390;

export function vorschau(opt: {
  url: string;
  /** aktueller Stand für eine Sprache */
  daten: (lang: Sprache) => unknown;
  springen: (z: Sprungziel) => void;
}): Vorschau {
  const panel = document.querySelector<HTMLElement>('[data-vp]');
  const dlg = document.querySelector<HTMLDialogElement>('[data-vorschau]');
  const rahmen: { frame: HTMLIFrameElement; buehne: HTMLElement; geraet: Geraet; sprache: Sprache; geladen: boolean; sichtbar: () => boolean }[] = [];

  function einrichten(root: HTMLElement, sichtbar: () => boolean) {
    const frame = root.querySelector<HTMLIFrameElement>('iframe')!;
    const buehne = frame.parentElement as HTMLElement;
    const r = { frame, buehne, geraet: (root.dataset.geraet as Geraet) ?? 'computer', sprache: 'de' as Sprache, geladen: false, sichtbar };
    rahmen.push(r);
    frame.addEventListener('load', () => {
      r.geladen = true;
      senden(r);
    });
    root.querySelectorAll<HTMLButtonElement>('[data-geraet]').forEach((b) =>
      b.addEventListener('click', () => {
        root.querySelectorAll('[data-geraet]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        r.geraet = b.dataset.geraet === 'handy' ? 'handy' : 'computer';
        buehne.dataset.geraet = r.geraet;
        groesse(r);
      }),
    );
    root.querySelectorAll<HTMLButtonElement>('[data-sprache]').forEach((b) =>
      b.addEventListener('click', () => {
        root.querySelectorAll('[data-sprache]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        r.sprache = b.dataset.sprache === 'en' ? 'en' : 'de';
        senden(r);
      }),
    );
    new ResizeObserver(() => groesse(r)).observe(buehne);
    return r;
  }

  /** Rahmen in Computer- oder Handybreite darstellen und auf den Platz verkleinern */
  function groesse(r: (typeof rahmen)[number]) {
    const breite = r.geraet === 'handy' ? HANDY : COMPUTER;
    const platz = r.buehne.clientWidth - (r.geraet === 'handy' ? 24 : 0);
    const hoehe = r.buehne.clientHeight - (r.geraet === 'handy' ? 24 : 0);
    const s = Math.min(1, platz / breite);
    r.frame.style.width = `${breite}px`;
    r.frame.style.height = `${Math.max(200, hoehe / s)}px`;
    r.frame.style.transform = s < 1 ? `scale(${s})` : '';
  }

  function senden(r: (typeof rahmen)[number]) {
    if (!r.geladen || !r.sichtbar()) return;
    r.frame.contentWindow?.postMessage({ typ: 'news-vorschau', lang: r.sprache, beitrag: opt.daten(r.sprache) }, location.origin);
  }

  const laden = (r: (typeof rahmen)[number]) => {
    if (!r.frame.src) r.frame.src = opt.url;
    groesse(r);
  };

  // neben dem Editor
  const seite = panel ? einrichten(panel, () => !panel.hidden && getComputedStyle(panel).display !== 'none') : null;
  if (panel && seite) {
    const mq = matchMedia('(min-width: 1180px)');
    const an = () => {
      try {
        return localStorage.getItem('tndd-news-vorschau') !== 'aus';
      } catch {
        return true;
      }
    };
    const layout = document.querySelector<HTMLElement>('[data-layout]');
    const schalter = document.querySelector<HTMLButtonElement>('[data-vp-schalter]');
    const anwenden = () => {
      const zeigen = mq.matches && an();
      layout?.classList.toggle('mit-vorschau', zeigen);
      panel.hidden = !zeigen;
      if (schalter) {
        // schmal: der Knopf öffnet die Vorschau groß
        schalter.textContent = !mq.matches ? 'Vorschau' : zeigen ? 'Vorschau aus' : 'Vorschau an';
        if (mq.matches) schalter.setAttribute('aria-pressed', String(zeigen));
        else schalter.removeAttribute('aria-pressed');
      }
      if (zeigen) {
        laden(seite);
        senden(seite);
      }
    };
    schalter?.addEventListener('click', () => {
      if (!mq.matches) return grossOeffnen();
      try {
        localStorage.setItem('tndd-news-vorschau', an() ? 'aus' : 'an');
      } catch {
        /* nur für diese Sitzung */
      }
      anwenden();
    });
    mq.addEventListener('change', anwenden);
    anwenden();
  }

  // Vollbild
  function grossOeffnen() {
    if (!dlg || !gross) return;
    dlg.showModal();
    laden(gross);
    senden(gross);
  }
  const gross = dlg ? einrichten(dlg, () => dlg.open) : null;
  if (dlg) {
    document.querySelectorAll<HTMLButtonElement>('[data-preview-open]').forEach((b) => b.addEventListener('click', grossOeffnen));
    dlg.querySelector('[data-vorschau-zu]')?.addEventListener('click', () => dlg.close());
  }

  // Klick in der Vorschau → Editor
  addEventListener('message', (e) => {
    if (e.origin !== location.origin || e.data?.typ !== 'news-springen') return;
    if (dlg?.open) dlg.close();
    opt.springen(e.data.ziel === 'abschnitt' ? { ziel: 'abschnitt', i: Number(e.data.i) } : { ziel: e.data.ziel });
  });

  let timer = 0;
  return {
    neu() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => rahmen.forEach(senden), 250);
    },
    zeigen(i) {
      if (seite?.geladen && seite.sichtbar()) seite.frame.contentWindow?.postMessage(typeof i === 'number' ? { typ: 'news-zeigen', i } : { typ: 'news-zeigen', ziel: i }, location.origin);
    },
  };
}
