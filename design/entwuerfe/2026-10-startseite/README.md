# Startseite – Entwurf Oktober 2026 (v2)

Aus Claude Design. Umgesetzt in `src/views/HomeView.astro` und `src/components/sections/`.
Die Datei ist eine Referenz und läuft hier nicht eigenständig (sie braucht die Claude-Design-Umgebung `support.js`).
Die vorigen Runden (4, 3a) stehen in der Git-Historie.

Was v2 gegenüber Runde 4 ändert:
- Hero nur Bild (`Hero.astro`, `src/scripts/hero-net.ts`, Einstellungen in `src/settings/hero.ts`):
  drei Bühnenfotos als Tiefenebenen (Solo blau links, Sprung vorn in der Mitte, Kopfstand rechts), das Netz
  dazwischen. Oben „Tanz für …“ mit wechselnden Wörtern, in der Mitte der nächste Termin („Upcoming“), um den sich
  das Netz sammelt. Beim Scrollen ziehen die Fotos nach oben weg. „Netz neu knüpfen“ oben rechts.
- Neuer Abschnitt „Intro“ (`Intro.astro`) mit der Seitenüberschrift „Eine Stadt. Ein Netz.“.
- Neuer Abschnitt „Haltung & Wirkung“ (`Haltung.astro`, Texte in `src/settings/haltung.ts`) nach den Terminen:
  vier Säulen, Auszeichnungen, Partner. Die Partnerzeile im Footer entfällt dafür.
- „Aus dem Netz“ ohne Trennlinie oben.

Abweichungen in der Umsetzung:
- Darstellung „Upcoming“: Variante „frei“ (Standard im Entwurf); Fotos in Originalfarben (Standard „original“).
- „Tanz für …“ läuft eine Runde durch und bleibt dann beim ersten Wort stehen (WCAG 2.2.2: keine endlose Bewegung).
  Bei „Bewegung reduzieren“ steht das erste Wort sofort.
- Der Termin im Hero wechselt im Browser auf den nächsten, wenn er vorbei ist (die Seite wird einmal am Tag gebaut).
- Auf dem Handy: Termin unten links statt in der Mitte, die Zahlenleiste im Hero entfällt (sie steht direkt darunter
  im Intro), „Netz neu knüpfen“ und die Wortmarke rechts unten ebenfalls.
- Foto in „Haltung & Wirkung“: vorerst der Schlussapplaus; der Entwurf wünscht sich ein Foto von Menschen im
  Austausch (z. B. Gespräch nach der Studio Round). Austauschen in `src/settings/haltung.ts`.
- Header „Über uns“ führt weiter zur Vereinsseite; Navigation behält „Intern“ und den Sprachumschalter.
