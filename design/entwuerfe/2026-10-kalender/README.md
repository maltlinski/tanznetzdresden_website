# Tanzkalender – Entwurf Oktober 2026

Aus Claude Design: `kalender.dc.html`. Neue Gestaltung der Seite Kalender (`/termine/`, englisch `/en/events/`).

Umgesetzt in `src/views/TermineView.astro`, Skript `src/scripts/tanzkalender.ts`, Daten `src/lib/tanzkalender.ts`,
Filter/Bündeln/Kalenderdatei `src/lib/tanzkalender-modell.ts` (läuft im Build und im Browser). Anleitung: `docs/kalender.md`.

Umgesetzt wie im Entwurf:
- Kopf mit Netz (fest gesetzter Zufall wie im Entwurf, Linien zeichnen sich ein, Punkte springen auf, Maus und
  Scrollen verschieben es leicht), Überschrift Wort für Wort, Kasten „Als Nächstes“ mit den nächsten drei Terminen
  ohne Training. Ein Klick öffnet den Termin in der Liste.
- Leiste unter dem Menü: Liste/Monat, Filter Alle/Bühne/Training/Diskurs mit Zahlen, Suche, Heute.
- Liste: Mini-Monat mit Punkten je Kategorie und Scroll-Spion, Legende, „Auswahl als .ics laden“, „Termin einreichen“;
  Monate mit klebender Überschrift und Anzahl, Tage mit Datumsblock und „Heute“, „Heute ist nichts eingetragen.“,
  Vergangene zeigen/ausblenden, Profitraining unter „Alle“ je Woche gebündelt; Aufklappen mit Text, Trainingstagen,
  Wann/Wo/Eintritt, „In Kalender speichern“, Route und Link. Keine Treffer: „Filter zurücksetzen“.
- Monat: großes Raster mit bis zu drei Einträgen je Tag und „+ n weitere“, Tagesansicht daneben mit „Nächster Termin“.
- Fristen: Ausschreibungen aus den News (Beitrag mit Bewerbungsfrist) stehen als „Frist“ im Kalender.

Abweichungen:
- **Eintritt und Adresse sind echte Angaben:** neues Feld `eintritt` bei Terminen (Datei und Intern → Kalender,
  Migration `20261028000000_kalender_eintritt.sql`); die Adresse kommt aus Kooperationen → Orte (`adresse`), wenn der
  Ort eines Termins dort so heißt. Route führt mit den Koordinaten des Orts zum Kartendienst (ein Link, nichts lädt nach).
- **Kalender-Abo bleibt:** In der linken Spalte steht zusätzlich „Kalender abonnieren (.ics)“. „Termin einreichen“
  führt zum Kontaktformular statt zu einer E-Mail.
- **Kalenderdateien** tragen dieselben Kennungen wie das Abo, damit nichts doppelt im Kalender landet.
- **Kontrast:** Grauer Text in Ink-Soft statt Ink-Muted; vergangene Tage mit grauer Schrift statt halber Deckkraft;
  „Heute“ in Magenta-2. Die Frist-Markierung ist ein Rahmen (outline) statt eines Schattens.
- **Handy:** Die Leiste scrollt mit (sonst bliebe wenig Platz), Uhrzeit über dem Titel, ohne Kategorie-Etikett in der
  Zeile; im Monatsraster nur Punkte statt Titel.
- **Monate:** Blättern geht vom ersten bis zum letzten Monat mit Terminen (der Entwurf blättert endlos).
- **Ohne JavaScript** erscheint die einfache Liste aller kommenden Termine.
- Die Ansicht Liste/Monat sind echte Tabs (Pfeiltasten wechseln), Tage im Mini-Monat ohne Termin sind gesperrt.
