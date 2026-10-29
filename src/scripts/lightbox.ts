/**
 * Großansicht für Fotos in News-Beiträgen (Entwurf News v3): Links mit `data-lightbox` (Titelbild und Fotos
 * im Text, src/lib/markdown.ts, src/lib/news-artikel.ts). Alle Fotos des Beitrags gehören zu einer Reihe:
 * oben Nummer, Titel des Beitrags und „Schließen · Esc“, links und rechts blättern (auch Pfeiltasten und
 * Wischen), unten Bezeichnung („Abb. 03“), Unterschrift, Nachweis und kleine Vorschaubilder.
 * Das Foto fliegt aus seiner Stelle im Text in die Großansicht. Ohne JavaScript öffnet der Link das große Foto.
 */
const TEXTE = {
  de: { label: 'Bildansicht', close: 'Schließen · Esc', prev: 'Vorheriges Bild', next: 'Nächstes Bild', credit: 'Foto' },
  en: { label: 'Image view', close: 'Close · Esc', prev: 'Previous image', next: 'Next image', credit: 'Photo' },
};
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const pad = (n: number) => String(n).padStart(2, '0');
const ruhig = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initLightbox(root: HTMLElement | Document = document) {
  let t = TEXTE.de;
  let dlg: HTMLDialogElement | null = null;
  let liste: HTMLAnchorElement[] = [];
  let i = 0;
  let richtung = 0;

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = '') => {
    const e = document.createElement(tag);
    e.className = cls;
    if (text) e.textContent = text;
    return e;
  };

  function bauen() {
    dlg = el('dialog', 'lb');
    dlg.setAttribute('aria-label', t.label);
    const bar = el('div', 'lb__bar');
    const n = el('span', 'lb__n');
    n.setAttribute('aria-live', 'polite');
    const zu = el('button', 'lb__zu', t.close);
    zu.type = 'button';
    zu.addEventListener('click', () => schliessen());
    bar.append(n, el('span', 'lb__titel'), zu);
    const buehne = el('div', 'lb__buehne');
    const flaeche = el('div', 'lb__flaeche');
    const img = el('img', 'lb__img');
    img.draggable = false;
    flaeche.append(img);
    const pfeil = (text: string, label: string, d: number, cls: string) => {
      const b = el('button', `lb__pfeil ${cls}`, text);
      b.type = 'button';
      b.setAttribute('aria-label', label);
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        zeigen(i + d, d);
      });
      return b;
    };
    buehne.append(flaeche, pfeil('←', t.prev, -1, 'lb__pfeil--zurueck'), pfeil('→', t.next, 1, 'lb__pfeil--weiter'));
    const fuss = el('div', 'lb__fuss');
    const info = el('div', 'lb__info');
    info.append(el('span', 'lb__k'), el('span', 'lb__cap'), el('span', 'lb__credit'));
    fuss.append(info, el('div', 'lb__daumen'));
    dlg.append(bar, buehne, fuss);
    // Klick neben das Foto schließt
    buehne.addEventListener('click', (e) => {
      if (e.target === buehne || e.target === flaeche) schliessen();
    });
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') zeigen(i + 1, 1);
      if (e.key === 'ArrowLeft') zeigen(i - 1, -1);
    });
    dlg.addEventListener('cancel', (e) => {
      e.preventDefault();
      schliessen();
    });
    // Wischen auf dem Handy
    let x0: number | null = null;
    flaeche.addEventListener('pointerdown', (e) => (x0 = e.clientX));
    flaeche.addEventListener('pointerup', (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) zeigen(i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
    document.body.append(dlg);
  }

  /** Vorschaubild und Angaben eines Fotos */
  const angaben = (a: HTMLAnchorElement) => {
    const quelle = a.querySelector('img');
    return { gross: a.href, klein: quelle?.currentSrc || quelle?.src || a.href, alt: quelle?.alt ?? '', k: a.dataset.k ?? '', cap: a.dataset.cap ?? '', credit: a.dataset.credit ?? '', pos: quelle?.style.objectPosition ?? '' };
  };

  function zeigen(k: number, d = 0) {
    if (!dlg || !liste.length) return;
    i = (k + liste.length) % liste.length;
    richtung = d;
    const x = angaben(liste[i]);
    const img = dlg.querySelector<HTMLImageElement>('.lb__img')!;
    img.src = x.gross;
    img.alt = x.alt;
    dlg.querySelector('.lb__n')!.textContent = `${pad(i + 1)} / ${pad(liste.length)}`;
    dlg.querySelector('.lb__k')!.textContent = x.k;
    dlg.querySelector('.lb__cap')!.textContent = x.cap || x.alt;
    dlg.querySelector('.lb__credit')!.textContent = x.credit ? `${t.credit} · ${x.credit}` : '';
    dlg.querySelectorAll<HTMLButtonElement>('.lb__pfeil').forEach((b) => (b.hidden = liste.length < 2));
    const daumen = dlg.querySelector<HTMLElement>('.lb__daumen')!;
    daumen.hidden = liste.length < 2;
    daumen.querySelectorAll('button').forEach((b, j) => {
      b.setAttribute('aria-current', String(j === i));
      if (j === i) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    if (richtung && !ruhig()) img.animate([{ opacity: 0, transform: `translateX(${richtung * 48}px)` }, { opacity: 1, transform: 'none' }], { duration: 450, easing: EASE });
  }

  function vorschaubilder() {
    const daumen = dlg!.querySelector<HTMLElement>('.lb__daumen')!;
    daumen.replaceChildren(...liste.map((a, j) => {
      const x = angaben(a);
      const b = el('button', 'lb__daumen-b');
      b.type = 'button';
      b.setAttribute('aria-label', x.alt || x.k || `${j + 1}`);
      const im = el('img', '');
      im.src = x.klein;
      im.alt = '';
      im.loading = 'lazy';
      if (x.pos) im.style.objectPosition = x.pos;
      b.append(im);
      b.addEventListener('click', () => zeigen(j, j > i ? 1 : -1));
      return b;
    }));
  }

  /** Das Foto fliegt von seiner Stelle auf der Seite in die Großansicht (und zurück) */
  function fliegen(von: Element | null, hin: boolean) {
    const img = dlg?.querySelector<HTMLImageElement>('.lb__img');
    if (!img || !von || ruhig() || !('animate' in img)) return Promise.resolve();
    const a = von.getBoundingClientRect();
    const b = img.getBoundingClientRect();
    if (!a.width || !b.width || a.bottom < 0 || a.top > innerHeight) return Promise.resolve();
    const start = `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})`;
    const frames = [{ transform: start, transformOrigin: '0 0' }, { transform: 'none', transformOrigin: '0 0' }];
    return img.animate(hin ? frames : frames.reverse(), { duration: hin ? 650 : 500, easing: EASE }).finished.catch(() => {});
  }

  async function schliessen() {
    if (!dlg?.open) return;
    const quelle = liste[i]?.querySelector('img');
    if (!ruhig()) {
      dlg.classList.add('is-zu');
      await fliegen(quelle ?? null, false);
    }
    dlg.classList.remove('is-zu');
    dlg.close();
    liste[i]?.focus({ preventScroll: true });
  }

  root.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-lightbox]');
    if (!a || (e as MouseEvent).metaKey || (e as MouseEvent).ctrlKey) return;
    e.preventDefault();
    const neu = document.documentElement.lang.startsWith('en') ? TEXTE.en : TEXTE.de;
    if (neu !== t) {
      t = neu;
      dlg?.remove();
      dlg = null;
    }
    if (!dlg) bauen();
    const bereich = (a.closest('[data-article]') ?? root) as ParentNode;
    liste = [...bereich.querySelectorAll<HTMLAnchorElement>('a[data-lightbox]')];
    dlg!.querySelector('.lb__titel')!.textContent = bereich.querySelector('h1')?.textContent?.trim() ?? '';
    vorschaubilder();
    zeigen(Math.max(0, liste.indexOf(a)));
    dlg!.showModal();
    const img = dlg!.querySelector<HTMLImageElement>('.lb__img')!;
    const los = () => void fliegen(a.querySelector('img'), true);
    if (img.complete && img.naturalWidth) los();
    else img.addEventListener('load', los, { once: true });
  });
}
