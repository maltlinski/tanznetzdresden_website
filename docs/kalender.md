# Kalender: Termine im internen Bereich eintragen

Unter *Intern → Kalender* tragen Presse, Vorstand und Admin alles ein, was im Tanzkalender der Website steht:
**Termine** (Bühne, Training, Diskurs) und **KEEP UP** (Trainingswochen und Workshops, siehe [keep-up.md](keep-up.md)).
Der Google Kalender des Vereins kann den Kalender abonnieren.

## Die Seite Kalender (/termine/)

Entwurf: `design/entwuerfe/2026-10-kalender/`. Im Kopf stehen die nächsten drei Termine (ohne Training). Darunter
wählt man **Liste** oder **Monat**, filtert nach Bühne, Training oder Diskurs, sucht nach Titel, Ort oder Name und
springt mit **Heute** zum heutigen Tag.

- **Liste:** nach Monaten und Tagen, vergangene Termine auf Knopfdruck. Unter „Alle“ steht das Profitraining einer
  Woche in einer Zeile. Aufklappen zeigt Text, Wann, Wo (mit Adresse), Eintritt, „In Kalender speichern“, Route und
  den Link zur Terminseite. Links der Mini-Monat (Klick springt zum Tag), die Legende, „Auswahl als .ics laden“
  (alle gezeigten kommenden Termine), das Kalender-Abo und „Termin einreichen“.
- **Monat:** Raster mit bis zu drei Einträgen je Tag, daneben der gewählte Tag.
- **Fristen:** Ein News-Beitrag mit Bewerbungsfrist (Ausschreibung) steht am Tag der Frist als „Frist“ im Kalender.
- **Eintritt:** Feld „Eintritt“ beim Termin (Intern → Kalender unter *Mehr Angaben*, in Dateien `eintritt`/`eintritt_en`).
  Für Termine aus Intern → Kalender braucht es die Migration `20261028000000_kalender_eintritt.sql`; vorher fehlt
  das Feld im Formular, sonst geht alles.
- **Adresse und Route:** Heißt der Ort eines Termins wie ein Ort unter *Redaktion → Website-Inhalte → Kooperationen →
  Orte* (Name oder Kurzname), zeigt der Kalender dessen Adresse und eine Route (Link zum Kartendienst mit den
  Koordinaten).

## Einrichten (einmalig)

Im Supabase-SQL-Editor `supabase/migrations/20261026000000_kalender.sql` ausführen (Rolle oben rechts: `postgres`),
nach `20261025000000_keepup.sql`. Das legt die Tabelle `kalender_termine` und die öffentliche Ansicht
`public_kalender` an und erlaubt Presse und Admin, KEEP UP zu planen. Danach `20261028000000_kalender_eintritt.sql`
(Eintritt bei Terminen).

Damit neue Termine nach wenigen Minuten online sind, muss die Redaktion eingerichtet sein (Funktion `inhalte` mit
GitHub-Schlüssel, [redaktion.md](redaktion.md#einrichten-einmalig-admin)). Sonst erscheinen sie mit dem nächtlichen Update.

## So geht's

- **Übersicht:** pro Woche eine Zeile mit den Tagen und rechts allen Einträgen. Farbige Striche im Tag zeigen Termine
  (magenta Bühne, lila Diskurs, cyan Training), cyan hinterlegte Tage KEEP UP. Filter: Alle, Termine, KEEP UP,
  Ohne Beschreibung (KEEP UP), Entwürfe.
- **Eintragen:** einen Tag anklicken (oder „Termin eintragen“). Nötig sind Titel, Datum, Beginn, Kategorie, Ort und
  eine Kurzbeschreibung (bis 240 Zeichen). Ende und ein Link zu Tickets oder Anmeldung sind freiwillig. Unter
  **Mehr Angaben** stehen Text für die Terminseite, Mitwirkende aus dem Netzwerk (der Termin erscheint dann auch auf
  ihrem Profil), Format, eine eigene Zeitangabe, Eintritt und Titel/Kurzbeschreibung auf Englisch.
- **Auf der Website zeigen:** abgehakt (Standard) = online nach dem nächsten Update; ohne Haken = Entwurf, nur im
  internen Bereich zu sehen.
- **Bearbeiten, Kopie, Löschen:** Eintrag anklicken. „Kopie anlegen“ legt denselben Termin eine Woche später an
  (praktisch für wiederkehrende Termine). Löschen fragt einmal nach und lässt sich in der Meldung rückgängig machen.
- **Termine aus Dateien:** Ältere Termine aus `src/content/termine/` stehen mit „Datei“ im Kalender. Anklicken und
  „In den Kalender übernehmen“: Danach gilt die Fassung aus dem Kalender (gleiche Adresse der Terminseite). Die Datei
  kann später unter *Redaktion → Website-Inhalte → Termine* gelöscht werden.
- **KEEP UP einplanen:** Knopf oben rechts oder im Fenster oben „KEEP UP“ wählen. Alles Weitere in [keep-up.md](keep-up.md).

Die Adresse einer Terminseite entsteht beim Eintragen aus Datum und Titel (`/termine/2026-11-20-studio-round-10/`)
und bleibt danach gleich, auch wenn sich Titel oder Datum ändern.

## Google Kalender abonnieren

Die Website erzeugt beim Bauen das Kalender-Abo `/termine.ics` (alle Termine und KEEP UP, ohne Entwürfe) und
`/profitraining.ics` (nur KEEP UP). So bindet ihr es im Google Kalender des Vereins ein:

1. Google Kalender öffnen (mit dem Vereinskonto), links bei **Weitere Kalender** auf **+** klicken, **Per URL** wählen.
2. Die Adresse einfügen. Sie steht unten im internen Kalender unter „Im Google Kalender abonnieren“ (Knopf
   „Adresse kopieren“), z. B. `https://tanznetzdresden.de/termine.ics`. **Kalender hinzufügen**.
3. Fertig. Der Kalender heißt „TanzNetzDresden · Tanzkalender“ und lässt sich in Google ein- und ausblenden.

Gut zu wissen:

- Google holt abonnierte Kalender selbst neu, meist alle paar Stunden (das lässt sich nicht beschleunigen).
- In Google sind die Termine nur zu lesen. Geändert wird im internen Kalender.
- Vorstandstermine tragt ihr weiter in einem eigenen Google-Kalender ein; sie landen nie auf der Website.
- Es geht nichts von der Website an Google: Google ruft die öffentliche Datei ab, wie jede Kalender-App.

## Technik

| Datei | Inhalt |
|---|---|
| `supabase/migrations/20261026000000_kalender.sql` | Tabelle `kalender_termine` (RLS: Presse, Vorstand, Admin), Ansicht `public_kalender` |
| `supabase/migrations/20261028000000_kalender_eintritt.sql` | Spalten `eintritt`, `eintritt_en` |
| `src/views/TermineView.astro`, `src/scripts/tanzkalender.ts` | die Seite Kalender (Liste, Monat, Kopf mit Netz) |
| `src/lib/tanzkalender.ts`, `src/lib/tanzkalender-modell.ts` | Daten (Termine, KEEP UP, Fristen), Filter, Wochen bündeln, Kalenderdatei |
| `src/lib/kalender-intern.ts` | Typen, Adresse (`slugAus`), Umwandlung in Termin-Daten wie aus einer Datei |
| `src/lib/content.ts` | `getTermine()` führt Dateien und `public_kalender` zusammen (Kalender gewinnt bei gleicher Adresse); ohne Supabase nur Dateien |
| `src/pages/intern/kalender/` | die Seite; Daten aus dem Build über `components/intern/KeepUpDaten.astro` (`kalender`) |
| `src/lib/ics.ts`, `src/pages/termine.ics.ts`, `src/pages/profitraining.ics.ts` | Kalender-Abos |
| `tests/kalender.spec.ts` | Tests mit nachgebautem Supabase |
| `tests/tanzkalender.spec.ts` | Tests der Seite Kalender |
