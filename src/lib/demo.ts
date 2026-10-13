/**
 * Demo-Ansicht zum Weiterentwickeln: Leere Profile bekommen Beispielfoto, -text und Schwerpunkte.
 * Die Beispiele stehen versteckt im HTML (Klasse `demo-an`) und erscheinen nur, wenn im Browser die
 * Demo-Ansicht an ist (Schalter unter Intern → Übersicht oder `?demo=1`, aus mit `?demo=0`).
 * Echte Angaben werden nie ersetzt. Suchmaschinen und Besucher:innen sehen die Beispiele nicht.
 */
import type { ImageMetadata } from 'astro';
import type { Lang } from './i18n';
import type { PublicProfile } from './profiles';

/** Speicherort im Browser (localStorage) und Klasse am <html>-Element */
export const DEMO_KEY = 'tndd-demo';

const fotos = Object.entries(import.meta.glob<{ default: ImageMetadata }>('../assets/photos/*.{jpg,jpeg,png,webp}', { eager: true }))
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, m]) => m.default);

const TAGS = [
  ['Contemporary', 'Improvisation', 'Partnering'],
  ['Choreografie', 'Release', 'Somatics'],
  ['Floorwork', 'Performance'],
  ['Tanzvermittlung', 'Community Dance', 'Inklusion'],
  ['Ballett', 'Contemporary', 'Repertoire'],
  ['Urban Dance', 'Choreografie'],
];

const BIOS: Record<Lang, string[][]> = {
  de: [
    ['Beispieltext: Tänzerin und Choreografin aus Dresden. Arbeitet an der Schnittstelle von Tanz, Raum und Klang.', 'Seit 2019 eigene Stücke in der freien Szene, zuletzt im Zentralwerk. Unterrichtet Contemporary und Improvisation.'],
    ['Beispieltext: Tänzer und Tanzpädagoge. Ausbildung in Rotterdam, seitdem in Ensembles und eigenen Projekten unterwegs.', 'Interessiert an Körperwissen, Berührung und den Momenten zwischen den Bewegungen.'],
    ['Beispieltext: Performerin mit Schwerpunkt Floorwork und Partnering. Entwickelt Formate für Kinder und Jugendliche.', 'Im Netzwerk aktiv in der AG Training.'],
    ['Beispieltext: Choreograf:in und Dramaturg:in. Arbeitet mit Laien und Profis an Stücken über Stadt und Erinnerung.'],
  ],
  en: [
    ['Example text: dancer and choreographer based in Dresden, working where dance, space and sound meet.', 'Making work in the independent scene since 2019, most recently at Zentralwerk. Teaches contemporary and improvisation.'],
    ['Example text: dancer and dance teacher. Trained in Rotterdam, since then working with ensembles and on own projects.', 'Interested in body knowledge, touch and the moments between movements.'],
    ['Example text: performer focusing on floorwork and partnering. Develops formats for children and young people.', 'Active in the training working group.'],
    ['Example text: choreographer and dramaturg. Makes pieces about the city and memory with amateurs and professionals.'],
  ],
};

/** stabiler Index aus dem Kürzel, damit eine Person immer dasselbe Beispiel bekommt */
const nr = (id: string) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Beispielinhalte für alles, was im Profil fehlt (undefined = echte Angabe vorhanden) */
export function demoFuer(p: PublicProfile, lang: Lang) {
  const i = nr(p.id);
  return {
    photo: p.photo ? undefined : fotos[i % fotos.length],
    bio: p.bio ? undefined : BIOS[lang][i % BIOS[lang].length],
    tags: p.tags.length ? undefined : TAGS[i % TAGS.length],
  };
}
