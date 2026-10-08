# Startseite – Entwurf Oktober 2026 (Runde 4)

Aus Claude Design. Umgesetzt in `src/views/HomeView.astro` und `src/components/sections/`.
Die Datei ist eine Referenz und läuft hier nicht eigenständig (sie braucht die Claude-Design-Umgebung `support.js`).
Die vorige Runde (3a) steht in der Git-Historie.

Entscheidungen aus dem Entwurfsprozess:
- Header: TNDD-Zeichen statt Wortmarke; beim Überfahren läuft ein Regenbogen durch das Zeichen
  (`--logo-rainbow` in `src/styles/overrides.css`, Zeichen aus `design/system/assets/logo/tndd-mark.svg`).
- Navigation: Kalender · News · Formate · Training · Netzwerk · Über uns.
- Hero: Überschrift erscheint mit Farbbalken (Cyan, Magenta), der Rest gleitet von links herein
  (`src/scripts/intro-text.ts`).
- Ein Bühnenfoto pro Besuch (vier zur Auswahl, `src/settings/hero.ts`), „Netz neu knüpfen“ zeigt das nächste.
  Ein diagonaler Keil wischt von links nach rechts und öffnet Netz und Foto; das Netz läuft nach rechts aus.
- Neuer Abschnitt „Aus dem Netz“ nach den Terminen.

Abweichungen in der Umsetzung:
- Das Foto wird zufällig gewählt statt reihum, damit nichts auf dem Gerät gespeichert werden muss (TDDDG).
- Auf schmalen Bildschirmen, wo das Foto neben der Überschrift keinen Platz hat, zeigt der Hero nur das Netz.
- Navigation behält „Intern“ und den Sprachumschalter; „Partner“ steht im Footer.
