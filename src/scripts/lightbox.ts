/**
 * Großansicht für Fotos in News-Beiträgen (Links mit `data-lightbox`, src/lib/markdown.ts).
 * Pfeile und Pfeiltasten blättern innerhalb einer Galerie, Esc oder ✕ schließt.
 * Ohne JavaScript öffnet der Link einfach das große Foto.
 */
export function initLightbox(root: ParentNode = document) {
  const TEXTE = {
    de: { close: 'Schließen', prev: 'Vorheriges Foto', next: 'Nächstes Foto', of: 'von', label: 'Foto' },
    en: { close: 'Close', prev: 'Previous photo', next: 'Next photo', of: 'of', label: 'Photo' },
  };
  // Sprache der Seite beim Öffnen (die Vorschau kann sie wechseln)
  let t = TEXTE.de;
  let dlg: HTMLDialogElement | null = null;
  let liste: HTMLAnchorElement[] = [];
  let i = 0;

  const knopf = (text: string, label: string, fn: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.setAttribute('aria-label', label);
    b.addEventListener('click', fn);
    return b;
  };

  function bauen() {
    dlg = document.createElement('dialog');
    dlg.className = 'lb';
    dlg.setAttribute('aria-label', t.label);
    const bar = document.createElement('div');
    bar.className = 'lb__bar';
    const n = document.createElement('span');
    n.className = 'lb__n';
    n.setAttribute('aria-live', 'polite');
    bar.append(n, knopf('✕', t.close, () => dlg!.close()));
    const stage = document.createElement('div');
    stage.className = 'lb__stage';
    const fig = document.createElement('figure');
    fig.className = 'lb__fig';
    const img = document.createElement('img');
    img.className = 'lb__img';
    fig.append(img);
    stage.append(knopf('←', t.prev, () => zeigen(i - 1)), fig, knopf('→', t.next, () => zeigen(i + 1)));
    const cap = document.createElement('p');
    cap.className = 'lb__cap';
    dlg.append(bar, stage, cap);
    // Klick neben das Foto schließt
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target === stage || e.target === fig) dlg!.close();
    });
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') zeigen(i + 1);
      if (e.key === 'ArrowLeft') zeigen(i - 1);
    });
    document.body.append(dlg);
  }

  function zeigen(k: number) {
    if (!dlg || !liste.length) return;
    i = (k + liste.length) % liste.length;
    const a = liste[i];
    const quelle = a.querySelector('img');
    const img = dlg.querySelector<HTMLImageElement>('.lb__img')!;
    img.src = a.href;
    img.alt = quelle?.alt ?? '';
    const fig = a.closest('figure');
    const teile = [quelle?.alt, ...[...(fig?.querySelectorAll('.nb__text, .nb__credit') ?? [])].map((s) => s.textContent?.trim())];
    dlg.querySelector('.lb__cap')!.textContent = teile.filter(Boolean).join(' · ');
    dlg.querySelector('.lb__n')!.textContent = liste.length > 1 ? `${i + 1} ${t.of} ${liste.length}` : '';
    dlg.querySelectorAll<HTMLButtonElement>('.lb__stage > button').forEach((b) => (b.hidden = liste.length < 2));
  }

  root.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-lightbox]');
    if (!a || (e as MouseEvent).metaKey || (e as MouseEvent).ctrlKey) return;
    e.preventDefault();
    const neu = document.documentElement.lang === 'en' ? TEXTE.en : TEXTE.de;
    if (neu !== t) {
      t = neu;
      dlg?.remove();
      dlg = null;
    }
    if (!dlg) bauen();
    liste = [...(a.closest('figure')?.querySelectorAll<HTMLAnchorElement>('a[data-lightbox]') ?? [a])];
    zeigen(liste.indexOf(a));
    dlg!.showModal();
  });
}
