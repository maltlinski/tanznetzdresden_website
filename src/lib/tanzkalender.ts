/**
 * Daten für den Tanzkalender (/termine/): Termine (Dateien und Intern → Kalender), KEEP UP-Trainings und
 * Fristen aus Ausschreibungen (News mit `deadline`). Darstellung im Browser: src/scripts/tanzkalender.ts,
 * Filter und Bündeln: src/lib/tanzkalender-modell.ts.
 */
import { categoryLabel, getOrte, getTermine } from './content';
import { getKeepUp } from './keep-up';
import { getNews } from './news';
import { loc, url, type Lang } from './i18n';
import { fuellen, texte } from './texte';
import { nachZeit, norm, type KTermin } from './tanzkalender-modell';
import { KALENDER, kopfNetz } from './kopf-netz';

/** Route zu einem Ort (Koordinaten aus Kooperationen → Orte); ein einfacher Link, nichts wird nachgeladen */
const route = (lat: number, lon: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

export async function getTanzkalenderDaten(lang: Lang): Promise<KTermin[]> {
  const t = texte(lang, 'termine', 'eintrag');
  const a = texte(lang, 'termine', 'ansicht');
  const orte = await getOrte();
  /** Ort aus Kooperationen → Orte, wenn der Name (oder Kurzname) passt */
  const ortVon = (name: string) => {
    const n = norm(name.trim());
    const o = orte.find((x) => norm(x.data.name) === n || (x.data.kurz && norm(x.data.kurz) === n));
    return { adresse: o?.data.adresse ?? '', route: o ? route(o.data.lat, o.data.lon) : '' };
  };
  const out: KTermin[] = [];

  for (const termin of await getTermine()) {
    const d = termin.data;
    const [datum, von] = d.start.split(' ');
    const bis = d.end?.split(' ')[1] ?? '';
    const workshop = d.format?.id === 'keep-up';
    out.push({
      id: termin.id,
      datum,
      von,
      bis,
      zeit: loc(d, 'timeLabel', lang)?.replace(/\s*Uhr$/, '') ?? (bis ? `${von}–${bis}` : von),
      titel: loc(d, 'title', lang),
      wer: '',
      ort: d.venue,
      ...ortVon(d.venue),
      kat: d.category,
      badge: workshop ? 'Workshop' : categoryLabel[lang][d.category],
      text: loc(d, 'teaser', lang),
      eintritt: loc(d, 'eintritt', lang) ?? '',
      link: url(lang, 'termine', `${termin.id}/`),
      linkText: t.zumTermin,
      training: false,
    });
  }

  const { trainings } = await getKeepUp(lang);
  for (const e of trainings) {
    const [von, bis = ''] = e.time.split('–');
    const ws = e.art === 'workshop';
    out.push({
      id: `keep-up-${e.date}-${von.replace(':', '')}`,
      datum: e.date,
      von,
      bis,
      zeit: e.time,
      titel: ws ? t.workshop : t.profitraining,
      wer: e.dozentin.name,
      ort: e.where,
      ...ortVon(e.where),
      kat: 'Training',
      badge: ws ? 'Workshop' : categoryLabel[lang].Training,
      text: [e.titel, e.kurz].filter(Boolean).join(': ') || (ws ? t.workshopInfo : t.trainingInfo),
      eintritt: '',
      link: url(lang, 'profitraining', '#kalender'),
      linkText: t.zumTraining,
      training: !ws,
    });
  }

  for (const p of await getNews(lang)) {
    if (!p.deadline) continue;
    out.push({
      id: `frist-${p.id}`,
      datum: p.deadline,
      von: '',
      bis: '',
      zeit: '',
      titel: p.title,
      wer: '',
      ort: '',
      adresse: '',
      route: '',
      kat: 'Frist',
      badge: a.frist,
      text: p.teaser,
      eintritt: '',
      link: url(lang, 'news', `${p.id}/`),
      linkText: t.zumCall,
      training: false,
    });
  }
  return out.sort(nachZeit);
}

/** „19:30 Uhr“ bzw. „19:30“ */
export const uhrzeit = (lang: Lang, zeit: string) => fuellen(texte(lang, 'termine', 'eintrag').uhr, { zeit });

/** Das Netz im Kopf (wie im Entwurf): Grundform aus src/lib/kopf-netz.ts, die auch die übrigen Unterseiten nutzen */
export const netz = (dichte = 0.7) => kopfNetz({ ...KALENDER, dichte });
