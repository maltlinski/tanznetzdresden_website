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

const PITCHES: Record<Lang, string[]> = {
  de: [
    'Beispielsatz: Ich bringe Tanz an Orte, an denen ihn niemand erwartet: Höfe, Haltestellen, leere Läden.',
    'Beispielsatz: Ich arbeite mit dem, was zwischen zwei Körpern passiert: Gewicht, Vertrauen, Zufall.',
    'Beispielsatz: Meine Stücke fragen, wie sich eine Stadt bewegt, wenn niemand hinsieht.',
  ],
  en: [
    'Example: I bring dance to places where nobody expects it: courtyards, tram stops, empty shops.',
    'Example: I work with what happens between two bodies: weight, trust, chance.',
    'Example: My pieces ask how a city moves when nobody is watching.',
  ],
};

const PROFESSIONS: Record<Lang, string[]> = {
  de: ['Tänzerin und Choreografin', 'Tänzer und Tanzpädagoge', 'Performerin', 'Choreograf:in'],
  en: ['Dancer and choreographer', 'Dancer and dance teacher', 'Performer', 'Choreographer'],
};

const WORKS = [
  { year: '2026', title: 'Beispiel: Echo, draußen', place: 'Welttanztag · Öffentlicher Raum Dresden' },
  { year: '2025', title: 'Beispiel: Bodenhaftung', place: 'vision:danceable · Societaetstheater' },
  { year: '2024', title: 'Beispiel: Kreide', place: 'POP UP · TENZA' },
];

const ANGABEN: Record<Lang, { k: string; v: string }[]> = {
  de: [
    { k: 'Ausbildung', v: 'Beispiel: Palucca Hochschule für Tanz Dresden, BA Tanz' },
    { k: 'Techniken', v: 'Release, Contact Improvisation, Floorwork' },
    { k: 'Sprachen', v: 'Deutsch, Englisch' },
    { k: 'Arbeitsorte', v: 'Dresden, Leipzig, Berlin · reisebereit' },
  ],
  en: [
    { k: 'Training', v: 'Example: Palucca University of Dance Dresden, BA Dance' },
    { k: 'Techniques', v: 'Release, contact improvisation, floorwork' },
    { k: 'Languages', v: 'German, English' },
    { k: 'Works in', v: 'Dresden, Leipzig, Berlin · willing to travel' },
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
    pitch: p.pitch ? undefined : PITCHES[lang][i % PITCHES[lang].length],
    profession: p.profession ? undefined : PROFESSIONS[lang][i % PROFESSIONS[lang].length],
    works: p.works.length ? undefined : WORKS,
    /** vier Fotos ab einer stabilen Stelle, ohne das Beispielporträt */
    gallery: p.gallery.length ? undefined : [1, 2, 3, 4].map((k) => fotos[(i + k) % fotos.length]),
    openFor: p.openFor.length ? undefined : (['kooperationen', 'engagements', 'workshops'] as const),
    /** Angaben neben „Über“, nur wenn keine einzige echte da ist */
    angaben: p.education || p.techniques || p.languages || p.regions || p.height || p.available ? undefined : ANGABEN[lang],
  };
}
