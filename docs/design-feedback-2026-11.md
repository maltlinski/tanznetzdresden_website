# Design-Feedback vom 1. November 2026

Ein Design-Feedback zur Entwurfs-Website (Typografie, Layout, UX, UI) mit sieben Punkten. Alle sind umgesetzt.
Jeder Punkt ist eine Regel und hat einen Test, damit er auch bei späteren Änderungen und neuen Entwürfen hält.

| Nr. | Bereich | Feedback | Umsetzung | Regel und Test |
|---|---|---|---|---|
| 01 | Startseite · Layout | Mehr Raum, die Schriftblöcke (Einstiege unten im Hero) auf dem Desktop weiter nach oben | Einstiege stehen mit Luft über dem Keil, der nächste Termin rückt mit nach oben (`src/components/sections/Hero.astro`) | `--kopf-unten`, `tests/koepfe.spec.ts` |
| 02 | Kalender · Typografie | Zu viele Schriften für dieselbe Information, Kalenderschrift für alle Datumsangaben | Alle Datums-, Uhrzeit- und Terminangaben in JetBrains Mono | Regel „Datumsschrift“, `tests/datum-schrift.spec.ts` |
| 02 | Kalender · Layout | Hellila Fläche des ausgewählten Tages bis zur Tageszahl | Ein geöffneter Termin hinterlegt den ganzen Tag bis zur Tageszahl (`src/scripts/tanzkalender.ts`, `src/views/TermineView.astro`) | [kalender.md](kalender.md), `tests/tanzkalender.spec.ts` „Geöffneter Termin …“ |
| 02 | Kalender · UI | Die dunkle Markierung im Mini-Monat springt auf den letzten Tag der Reihe | Angeklickter Tag dunkellila, die übrigen Tage der Reihe hellila; Scrollen verschiebt die Markierung nicht, solange der Termin offen ist | wie oben |
| 03 | Training · UI | Im Mosaik „Wer unterrichtet“ sind Kacheln ab einer Stelle nicht klickbar, weiter rechts verschwinden die Bilder | Kopien für die Endlosschleife waren `inert` (nicht klickbar), und eine Kopie reichte für breite Bildschirme nicht. Jetzt so viele Kopien wie nötig, alle anklickbar (`src/components/keep-up/Mosaik.astro`) | docs/entwicklung.md, `tests/site.spec.ts` „Mosaik …“ |
| 04 | Allgemein · UX | Headlines im Kopf auf gleiche Höhe, schneller lesbar beim Wechsel zwischen den Menüpunkten | Alle Köpfe beginnen oben, Kicker und Headline in festem Abstand | Regel „Köpfe“, `tests/koepfe.spec.ts` |
| 05 | Mobil · Typografie | Zeilenabstand im Fließtext (dunkel auf hell) verringern | `--lh-text` (1,5 / Handy 1,45) und `--lh-lesetext` (1,6 / 1,55) statt fester Werte | Regel „Zeilenabstand“, `tests/zeilenabstand.spec.ts` |
| 06 | Menü mobil · UX | Unterstrich näher an den ausgewählten Menüpunkt | Unterstrich direkt unter der Schrift, so breit wie das Wort (`src/components/sections/Header.astro`) | `tests/site.spec.ts` „Menü auf dem Handy …“ |
| 07 | Mobil und Desktop · UX | Weniger Weißraum zwischen Kopf und erstem Textblock, auf allen Menüseiten gleich (wie im Kalender) | Der erste Abschnitt nach dem Kopf beginnt überall `--nach-kopf` darunter (24–40 px) | Regel „Köpfe“, `tests/koepfe.spec.ts` |

Die Regeln sind in [entwicklung.md](entwicklung.md#designsystem) beschrieben, in Kurzform auch in `CLAUDE.md`.
In `design/README.md` steht, dass sie auch für neue Entwürfe aus Claude Design gelten.
