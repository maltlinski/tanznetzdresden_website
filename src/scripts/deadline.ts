/**
 * Fristen live nachrechnen: <span data-deadline="2026-11-15" data-deadline-part="n|unit|label">.
 * Elemente mit data-deadline-open verschwinden, wenn die Frist abgelaufen ist.
 */
import { deadlineText, type DeadlinePart } from '../lib/deadline-text';

const lang = document.documentElement.lang.startsWith('en') ? 'en' : 'de';
const days = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.ceil((new Date(y, m - 1, d, 23, 59, 59).getTime() - Date.now()) / 864e5);
};
document.querySelectorAll<HTMLElement>('[data-deadline]').forEach((el) => {
  const n = days(el.dataset.deadline ?? '');
  if (Number.isNaN(n)) return;
  if (el.hasAttribute('data-deadline-open')) el.hidden = n < 0;
  const part = el.dataset.deadlinePart as DeadlinePart | undefined;
  if (part) el.textContent = deadlineText(n, part, lang);
});
