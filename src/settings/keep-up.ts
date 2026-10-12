/**
 * Seite „KEEP UP · Profitraining“ (/profitraining/, /en/training/): Texte und Fotos.
 * Trainingsplan und Dozent:innen liegen in src/content/keep-up/, Workshops in src/content/termine/
 * (mit `format: keep-up`), Ort und Beitrag in src/settings/verein.json (training).
 */
export const keepUp = {
  de: {
    kicker: 'Profitraining',
    l1: 'KEEP UP',
    l2: 'Training.',
    lead: 'Drei- bis fünfmal pro Woche trainieren professionelle Tänzer:innen der freien Szene gemeinsam in der TENZA. Jede Woche unterrichtet eine andere Dozent:in aus Dresden oder von außerhalb. Dazu kommen Workshops am Wochenende.',
    /** Überschrift über dem Kartenstapel */
    saison: 'Herbst 2026',
    stapelText: 'Jede Woche unterrichtet eine andere Dozent:in. Scroll durch den Stapel, um alle kennenzulernen.',
    wann: 'Mo–Fr · 10:00–11:30',
    wannText: 'Drei bis fünf Einheiten pro Woche. Der Kalender zeigt, an welchen Tagen trainiert wird.',
    woText: 'Workshops finden je nach Format auch in Partnerräumen statt.',
    fuerWen: 'Professionelle Tänzer:innen',
    fuerWenText: 'Offen für Tanzschaffende der freien Szene, auch für alle, die gerade neu in Dresden sind.',
    anmeldung: 'Zum Training kommst du ohne Anmeldung. Für Workshops meldest du dich in der Telegram-Gruppe an, dort stehen auch kurzfristige Änderungen.',
    cta1: 'Günstiger trainieren',
    cta2: 'als Mitglied.',
  },
  en: {
    kicker: 'Professional training',
    l1: 'KEEP UP',
    l2: 'Training.',
    lead: 'Three to five times a week, professional dancers from the independent scene train together at TENZA. Each week a different teacher from Dresden or elsewhere leads the class. On top of that there are weekend workshops.',
    saison: 'Autumn 2026',
    stapelText: 'Each week a different teacher leads the class. Scroll through the stack to meet them all.',
    wann: 'Mon–Fri · 10:00–11:30',
    wannText: 'Three to five classes a week. The calendar shows which days we train.',
    woText: 'Depending on the format, workshops also take place at partner venues.',
    fuerWen: 'Professional dancers',
    fuerWenText: 'Open to dance artists of the independent scene, including everyone who has just arrived in Dresden.',
    anmeldung: 'No registration needed for training. For workshops, sign up in the Telegram group, where we also post short-notice changes.',
    cta1: 'Train for less',
    cta2: 'as a member.',
  },
};

/** Foto im Kopfbereich (src/assets/photos/) */
export const keepUpFoto = {
  datei: 'headstand-solo.jpg',
  alt: { de: 'Tänzerin im Kopfstand', en: 'Dancer in a headstand' },
};

/**
 * PLATZHALTER: Fotos für Dozent:innen ohne eigenes Porträt (der Reihe nach, src/assets/photos/).
 * Sobald alle ein Foto haben (keep-up/dozentinnen.yaml oder Profil), wird diese Liste nicht mehr gebraucht.
 */
export const platzhalterFotos = ['solo-blau.jpg', 'sprung.jpg', 'duo-rot.jpg', 'kopfstand.jpg', 'duo-orange-blue.jpg', 'duo-silhouette-stage.jpg'];

/** Bewegung des Kartenstapels: 'stapel' = gerade übereinander, 'fächer' = leicht gedreht */
export const stapelBewegung: 'stapel' | 'fächer' = 'fächer';
