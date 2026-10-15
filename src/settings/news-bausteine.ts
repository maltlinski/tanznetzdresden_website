/**
 * Textbausteine für News (z. B. Förderhinweise), im Editor unter „+ Abschnitt einfügen → Baustein“.
 * Die Liste steht in news-bausteine.json (bearbeitbar unter Intern → Redaktion → News-Bausteine).
 * typ: hinweis = abgesetzter Kasten, text = normaler Text. text_en = englische Fassung (optional).
 */
import data from './news-bausteine.json';

export const newsBausteine: { name: string; typ: 'text' | 'hinweis'; text: string; text_en?: string }[] = data.map((b) => ({
  ...b,
  typ: b.typ === 'text' ? 'text' : 'hinweis',
}));
