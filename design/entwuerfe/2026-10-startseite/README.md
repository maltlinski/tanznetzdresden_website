# Startseite – Entwurf Oktober 2026 (v5)

Aus Claude Design. Umgesetzt in `src/views/HomeView.astro` und `src/components/sections/`.
Die Datei ist eine Referenz und läuft hier nicht eigenständig (sie braucht die Claude-Design-Umgebung `support.js`).
Die vorigen Runden (v2, 4, 3a) stehen in der Git-Historie.

Was v5 gegenüber v2 ändert:
- Navigation: Kalender, Formate, Training, Journal (= News), Über uns. Unter dem Kopf ein Fortschrittsbalken ab dem
  Ende des Hero.
- Hero: unten drei Einstiege (Tanz sehen, Mittrainieren, Teil des Netzes werden) statt der Zahlen; Fotos bleiben beim
  Scrollen stehen („ruhig“, `scrollWegziehen` in `src/settings/hero.ts`); „Tanz für …“ wechselt Buchstabe für Buchstabe.
- „Demnächst“ (`Demnaechst.astro`): Termine (vier, mit Filter) und Journal nebeneinander.
- Formate als Streifen mit Karten und Pfeilen (`Formats.astro`).
- „Eine Stadt. Ein Netz.“ und „Wer im Netz tanzt“ in einem lila Block (`Netz.astro`).
- Überschriften gleiten mit GSAP SplitText herein (Stufe „dezent“, `src/scripts/split-text.ts`).
- Die Abschnitte „Haltung & Wirkung“ und „Training“ entfallen auf der Startseite.

Abweichungen in der Umsetzung:
- „Haltung & Wirkung“ steht jetzt auf „Über uns“ (`/verein/`), damit Säulen, Auszeichnungen und Partner sichtbar und in
  der Redaktion bearbeitbar bleiben.
- „Über uns“ im Menü führt zur Vereinsseite (Entwurf: Sprung zum Netz-Block); auf Profilseiten ist „Über uns“ markiert.
  Menü behält „Intern“ und den Sprachumschalter.
- Überschrift der Seite (h1) ist „Tanz für …“ im Hero; „Eine Stadt. Ein Netz.“ ist eine Zwischenüberschrift.
- „Tanz für …“ läuft eine Runde durch und bleibt dann beim ersten Wort stehen (WCAG 2.2.2). Bei „Bewegung reduzieren“
  steht alles sofort.
- Formate ohne eigene Seite sind keine Links (Entwurf: Sprung zu den Terminen).
- Auf dem Handy stehen die Einstiege kompakt untereinander, der nächste Termin direkt darüber.
- Footer bleibt wie bisher (mit Förderhinweis und allen Seiten).
