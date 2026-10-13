/**
 * Seite „KEEP UP · Profitraining“ (/profitraining/, /en/training/): Texte und Fotos.
 * Die Texte und das Kopffoto stehen in keep-up.json (bearbeitbar unter Intern → Redaktion → Profitraining).
 * Trainingsplan und Dozent:innen liegen in src/content/keep-up/, Workshops in src/content/termine/
 * (mit `format: keep-up`), Ort und Beitrag in src/settings/verein.json (training).
 */
import data from './keep-up.json';

export const keepUp = { de: data.de, en: data.en };

/** Foto im Kopfbereich (src/assets/photos/) */
export const keepUpFoto = data.foto;

/**
 * PLATZHALTER: Fotos für Dozent:innen ohne eigenes Porträt (der Reihe nach, src/assets/photos/).
 * Sobald alle ein Foto haben (keep-up/dozentinnen.yaml oder Profil), wird diese Liste nicht mehr gebraucht.
 */
export const platzhalterFotos = ['solo-blau.jpg', 'sprung.jpg', 'duo-rot.jpg', 'kopfstand.jpg', 'duo-orange-blue.jpg', 'duo-silhouette-stage.jpg'];

/** Bewegung des Kartenstapels: 'stapel' = gerade übereinander, 'fächer' = leicht gedreht */
export const stapelBewegung: 'stapel' | 'fächer' = 'fächer';
