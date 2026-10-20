/**
 * Sichtbarkeit in einer EventList: ausgefiltert (data-aus, Kategorie-Filter) und Höchstzahl (data-max an der Liste).
 * Gibt zurück, wie viele Termine sichtbar sind.
 */
export function begrenzen(list: HTMLElement): number {
  const max = list.dataset.max ? Number(list.dataset.max) : Infinity;
  let n = 0;
  list.querySelectorAll<HTMLElement>('.event').forEach((li) => {
    const zeigen = !li.hasAttribute('data-aus') && n < max;
    li.hidden = !zeigen;
    if (zeigen) n++;
  });
  return n;
}
