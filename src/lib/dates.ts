/** Datums-Helfer. Termine werden als Dresdner Ortszeit "JJJJ-MM-TT HH:MM" gepflegt. */

export interface LocalParts { y: number; m: number; d: number; hh: number; mm: number }

export function parseLocal(s: string): LocalParts {
  const [date, time = '00:00'] = s.split(/[ T]/);
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return { y, m, d, hh, mm };
}

const fmt = (opts: Intl.DateTimeFormatOptions, p: LocalParts) =>
  new Intl.DateTimeFormat('de-DE', { ...opts, timeZone: 'UTC' }).format(new Date(Date.UTC(p.y, p.m - 1, p.d)));

export function dateParts(s: string) {
  const p = parseLocal(s);
  return {
    iso: `${s.replace(' ', 'T')}`,
    dow: fmt({ weekday: 'short' }, p).replace('.', ''),
    day: String(p.d).padStart(2, '0'),
    month: fmt({ month: 'short' }, p).replace('.', ''),
    monthLong: fmt({ month: 'long', year: 'numeric' }, p),
    /** „Sa · 14. Juni 2026“ – Hausformat */
    long: `${fmt({ weekday: 'short' }, p).replace('.', '')} · ${fmt({ day: 'numeric', month: 'long', year: 'numeric' }, p)}`,
    time: `${String(p.hh).padStart(2, '0')}:${String(p.mm).padStart(2, '0')} Uhr`,
  };
}

/** Sortier- und Vergleichsschlüssel, z. B. 202610151930 */
export const sortKey = (s: string) => Number(s.replace(/\D/g, '').padEnd(12, '0'));
