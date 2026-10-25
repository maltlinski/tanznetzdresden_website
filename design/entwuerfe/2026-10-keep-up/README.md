# KEEP UP · Intern und Profitraining – Entwurf Oktober 2026

Aus Claude Design. Zwei Seiten:

- `keep-up-intern.dc.html`: der Vorstand plant das Profitraining (Kalender mit Wochenzeilen, Schublade zum
  Einplanen, Erinnern), die Dozent:innen sehen „Meine Trainings“ und beschreiben ihr Training im Editor mit Vorschau.
- `keep-up-profitraining.dc.html`: die überarbeitete Seite `/profitraining/`. Die Tagesansicht im Kalender zeigt
  die Beschreibung der Dozent:in mit Bild, Pfeile springen von Termin zu Termin. Löst den Entwurf in
  `../2026-10-profitraining/` ab.

Umgesetzt in `src/pages/intern/keep-up/` (Planung, `meine/`, `beschreiben/`), `src/components/Kalender.astro`
(Tagesansicht) und `src/lib/keep-up.ts` (Build). Daten: `supabase/migrations/20261025000000_keepup.sql`.
Anleitung: `docs/keep-up.md`.

Umgesetzt wie im Entwurf: Wochenzeilen mit Tagen und Einplanungen, Status (Ohne Beschreibung, Entwurf, Online,
Änderungen offen), Filter, Hinweis auf Termine der nächsten drei Wochen ohne Beschreibung, Schublade mit Art,
Dozent:in, Woche, Tagen, Zeit, Ort, Notiz, Überschneidungs-Hinweis, Löschen mit Rückfrage und „Rückgängig“;
„Meine Trainings“ mit Karten, Notiz vom Vorstand, Prüfliste, Vergangen; Editor mit Titel, Kurzbeschreibung
(Zähler 240), Text, Schwerpunkten, „Bitte mitbringen“, einem Bild, Übernahme von einem früheren Training,
Speichern von selbst, Veröffentlichen, Offline nehmen, Vorschau; auf der Website die Tagesansicht mit Titel,
Kurztext, Absätzen, Schwerpunkten, „Mitbringen“, Bild mit Keil und den GSAP-Bewegungen.

Abweichungen:
- Kein Umschalter „Angemeldet als Vorstand / Dozent:in“ und kein „Demo zurücksetzen“: Die Rolle kommt aus dem
  Konto. Der Vorstand sieht *Planung*, eingeplante Dozent:innen *Meine Trainings* (wer beides ist, beides).
  Zuordnung über die Profiladresse = Kürzel in `keep-up/dozentinnen.yaml`, nur bei freigegebenem Profil.
- Alles im gemeinsamen Rahmen des internen Bereichs (Seitenleiste mit Gruppe „KEEP UP“), nicht in eigener Leiste.
- „Erinnern“ verschickt nichts selbst: Es öffnet eine vorbereitete Mail im eigenen Mailprogramm (Bcc) und merkt sich
  das Datum. Dozent:innen ohne Konto werden genannt.
- „Aus Mediathek“ bietet die Fotos der Website an (die News-Mediathek gehört der Redaktion). Hochgeladene Bilder
  liegen im Bucket `keepup`, je Dozent:in ein Ordner. Bildbeschreibung freiwillig.
- „Online“ heißt: nach dem nächsten Website-Update (wenige Minuten), nicht sofort.
- Ringe und Unterstriche als Rahmen bzw. Linie statt `box-shadow` (keine Schatten im Designsystem).
- Mosaik: läuft auch unter der Maus weiter (Wunsch); Anhalten über den Knopf.
- Die Pfeile „Vorheriger/Nächster Termin“ gibt es auch im Tanzkalender.
- Unter „Anmeldung“ zusätzlich „Kalender abonnieren (.ics)“ (`/profitraining.ics`, z. B. für Google Kalender).
- Beschreibungen nur auf Deutsch (die englische Seite zeigt sie mit `lang="de"`).
