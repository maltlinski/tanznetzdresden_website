/**
 * Texte für Bewerbungsfristen („noch 38 Tage“). Wird beim Build und im Browser
 * benutzt – im Browser, damit die Zahl auch zwischen zwei Builds stimmt.
 */
export type DeadlinePart = 'n' | 'unit' | 'label';

export function deadlineText(days: number, part: DeadlinePart, lang: 'de' | 'en'): string {
  const over = days < 0;
  if (part === 'n') return over ? '—' : String(days);
  if (lang === 'en') {
    if (over) return 'closed';
    const unit = days === 1 ? 'day' : 'days';
    return part === 'unit' ? unit : `${days} ${unit} left`;
  }
  if (over) return 'abgelaufen';
  const unit = days === 1 ? 'Tag' : 'Tage';
  return part === 'unit' ? unit : `noch ${days} ${unit}`;
}
