/**
 * Kopf mit Foto unter der Kopfleiste (Klasse `unter-leiste`, Stile in global.css): meldet die genaue Höhe der Leiste
 * (`--kopfleiste-h`) und macht sie nur ganz oben durchsichtig (`ist-gescrollt` ab 24 px). Genutzt vom Vollbild-Kopf
 * der Beiträge und vom Kopf der Netzwerk-Seite.
 */
export function unterLeiste(): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header || !document.querySelector('.unter-leiste')) return;
  const leiste = () => {
    if (!header.classList.contains('is-open')) document.documentElement.style.setProperty('--kopfleiste-h', `${Math.round(header.getBoundingClientRect().height)}px`);
    header.classList.toggle('ist-gescrollt', scrollY >= 24);
  };
  addEventListener('scroll', leiste, { passive: true });
  addEventListener('resize', leiste);
  leiste();
}
