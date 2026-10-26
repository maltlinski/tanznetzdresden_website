# Open Calls · Interner Bereich – Entwurf Oktober 2026

Aus Claude Design: `open-calls.dc.html`. Eine neue Seite im internen Bereich für Ausschreibungen (Förderungen,
Residenzen, Auditions, Jobs …) mit Merkliste, Bewerbungsstand und Meldung neuer Calls an die Redaktion.

Umgesetzt in `src/views/intern/OpenCallsView.astro` (Seiten `src/pages/intern/open-calls/` und
`src/pages/en/intern/open-calls/`), Skript `src/scripts/intern/open-calls.ts`, Logik `src/lib/open-calls.ts`.
Daten: `supabase/migrations/20261027000000_open_calls.sql`. Anleitung: `docs/open-calls.md`.

Umgesetzt wie im Entwurf: Kopf mit „Gemerkte Fristen in Kalender“ und „Call melden“, Hinweis auf eigene Fristen
der nächsten 7 Tage, Zeitleiste der nächsten 12 Wochen (drei Reihen, Monate, „+ n später“), Ansichten Aktuell,
Gemerkt, Meine Bewerbungen (Spalten In Arbeit, Eingereicht, Zusage, Absage mit Fortschritt der Unterlagen), Archiv;
Suche, Sortierung, Filter nach Art (mit Zahlen), Reichweite und Eigenschaften; Zeilen mit Datumsblock in der Farbe
der Dringlichkeit, Markierungen (Vom Netzwerk, Von Mitglied, Wiederkehrend, In Prüfung), Stand und Merken;
Schublade mit Frist, Zur Ausschreibung, Kalenderdatei mit Erinnerungen, Link kopieren, Mein Stand, Fakten,
Beschreibung, Unterlagen zum Abhaken, „Aus dem Netzwerk“ und Quelle; Schublade „Call melden“ mit denselben Feldern.

Abweichungen:
- Echte Daten statt Beispielen: Calls in Supabase. Mitglieder melden, die Redaktion prüft. Dafür gibt es für Presse,
  Vorstand und Admin die Ansicht **Zu prüfen** (Freigeben, Bearbeiten, Ablehnen), einen Hinweis oben und unter
  *Redaktion → Freigaben*, und „Call eintragen“ mit *Mehr Angaben* (Ort, Zeitraum, Unterlagen, Hinweis, gemeinsamer
  Antrag …). Mitglieder können eine wartende Meldung zurückziehen.
- „Erinnere mich … per Mail“ erscheint erst, wenn die Funktion `erinnerungen` mit dem Mailserver eingerichtet ist
  (`erinnerungen: true` in `src/settings/supabase.ts`). Bis dahin erinnert die Kalenderdatei.
- „Aus dem Netzwerk“: zusätzlich „Ich habe mich hier schon beworben und teile meine Erfahrungen“ – daraus entsteht
  die Liste der Mitglieder mit Erfahrung. Wer mitmacht, steht mit Namen da (nicht nur als Zahl), damit man sich findet.
  Namen verlinken auf das öffentliche Profil, wenn es freigegeben ist.
- Kästchen sind echte Checkboxen, Ansichten und Filter Knöpfe mit `aria-pressed`, Schubladen `<dialog>`.
- Leere Arten sind gestrichelt statt blass (Kontrast). In der Zeitleiste sind späte Fristen Cyan mit lila Schrift
  statt Weiß auf Cyan (Kontrast). Auf schmalen Bildschirmen keine Zeitleiste (zu eng; die Liste ist nach Frist sortiert).
- Mitglied seit, Foto und Menü kommen aus dem gemeinsamen Rahmen des internen Bereichs. Deutsch und Englisch.
- „Nur für Mitglieder sichtbar“ ist gespeichert, aber es gibt noch keine öffentliche Liste auf der Website.
