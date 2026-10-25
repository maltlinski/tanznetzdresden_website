# KEEP UP · Profitraining planen und beschreiben

Entwürfe: `design/entwuerfe/2026-10-keep-up/` (Intern und Website).

Der Vorstand plant im internen Bereich, wer wann unterrichtet. Die Dozent:innen beschreiben ihr Training selbst und
veröffentlichen es. Auf `/profitraining/` steht die Beschreibung dann in der Tagesansicht des Kalenders, mit
Schwerpunkten, „Mitbringen“ und einem Bild.

| Wer | Wo | Was |
|---|---|---|
| Vorstand, Admin | *Intern → KEEP UP → Planung* | Trainingswochen und Workshops einplanen, ändern, löschen; an fehlende Beschreibungen erinnern; jede Beschreibung bearbeiten |
| Dozent:in | *Intern → KEEP UP → Meine Trainings* | eigene Einplanungen sehen, beschreiben, ein Bild hinzufügen, veröffentlichen oder offline nehmen |
| alle | `/profitraining/`, Tanzkalender, Kalender-Abo | Trainingstage und veröffentlichte Beschreibungen |

## Einrichten (einmalig)

1. Im Supabase-SQL-Editor `supabase/migrations/20261025000000_keepup.sql` ausführen (Rolle oben rechts: `postgres`).
   Das legt die Tabelle `keepup_termine`, die öffentliche Ansicht `public_keepup` und den Bilder-Bucket `keepup` an.
2. Damit eine Dozent:in ihre Trainings sieht, braucht sie ein Konto im internen Bereich (*Authentication → Users →
   Invite*). In *Mein Profil* trägt sie als **Adresse** genau ihr Kürzel aus `src/content/keep-up/dozentinnen.yaml` ein
   (z. B. `aurora-fradella`), und die Redaktion gibt das Profil frei (*Redaktion → Freigaben*). Die Freigabe ist die
   Sicherung: Nur ein freigegebenes Profil mit dieser Adresse darf die Trainings bearbeiten.
3. Neue Dozent:innen kommen wie bisher unter *Redaktion → Website-Inhalte → Dozent:innen* dazu (Stil, kurzer Text).
   Erst dann stehen sie in der Planung zur Auswahl.

Ohne die Migration zeigen Planung und „Meine Trainings“ einen Hinweis, und die Website nimmt weiter den Plan aus
`src/content/keep-up/wochen.yaml`.

## Planung (Vorstand)

- Pro Woche eine Zeile mit den sieben Tagen (cyan = Profitraining, magenta = Workshop, Rahmen = heute) und rechts den
  Einplanungen mit Status: **Ohne Beschreibung**, **Entwurf**, **Online**, **Änderungen offen**.
- **Training einplanen** oder ein freier Tag öffnet die Schublade: Art, Dozent:in, Woche und Tage, Uhrzeit, Ort und
  eine **Notiz an die Dozent:in** (nur intern sichtbar). Überschneidungen mit einer anderen Einplanung gleicher Art
  werden angezeigt. Löschen fragt einmal nach und lässt sich in der Meldung rückgängig machen.
- **Erinnern:** Termine der nächsten drei Wochen ohne veröffentlichte Beschreibung stehen oben im lila Kasten.
  „Alle erinnern“ öffnet eine vorbereitete Mail im eigenen Mailprogramm (Adressen im Bcc) und merkt sich das Datum.
  Dozent:innen ohne Konto werden genannt; sie erinnert man direkt. Die Website verschickt selbst keine Mails.

## Meine Trainings und Editor (Dozent:in)

- „Meine Trainings“ zeigt anstehende Termine als Karten (mit Notiz vom Vorstand und kleiner Prüfliste) und darunter
  vergangene.
- Im Editor: **Titel** (bis 60 Zeichen), **Kurzbeschreibung** (bis 240 Zeichen, Pflicht zum Veröffentlichen),
  **ausführliche Beschreibung** (Leerzeile = neuer Absatz), **Schwerpunkte** (Vorschläge oder eigene mit Enter),
  **Bitte mitbringen** und **ein Bild** (hochladen, hineinziehen oder aus den Fotos der Website wählen; die
  Bildbeschreibung ist freiwillig). Rechts steht die Vorschau so, wie die Website den Tag zeigt.
- Alles speichert von selbst. **Veröffentlichen** übernimmt den Stand auf die Website und stößt den Neubau an
  (wenige Minuten). Spätere Änderungen bleiben ein Entwurf („Änderungen offen“), bis man erneut veröffentlicht.
  **Offline nehmen** nimmt die Beschreibung von der Website.
- „Von einem früheren Training übernehmen“ kopiert Text und Bild einer älteren Einplanung derselben Person.

## Website

- `src/lib/keep-up.ts` holt beim Build die Ansicht `public_keepup` (Planung und veröffentlichter Text, keine Notizen,
  keine Entwürfe). Eine Woche mit einem Training aus dem internen Bereich ersetzt dieselbe Woche aus `wochen.yaml`.
  Ist Supabase nicht erreichbar, baut die Website nur mit der Datei.
- Die Tagesansicht (`src/components/Kalender.astro`, auf `/profitraining/` mit `breit`) zeigt Uhrzeit und Ort, Name
  und Stil, dann Titel, Kurzbeschreibung, Absätze, Schwerpunkte und „Mitbringen“, rechts das Bild mit Keil. Ohne
  Beschreibung steht der Name da und „Die Beschreibung zu diesem Training folgt.“ (nur bei Einplanungen aus dem
  internen Bereich). Die Pfeile springen zum vorigen und nächsten Termin, auch über den Monat hinaus.
- Die Beschreibungen sind nur auf Deutsch; die englische Seite zeigt sie mit `lang="de"`.

## Google Kalender

**Heute schon:** Die Website erzeugt zwei Kalender-Abos, die sich in Google Kalender einbinden lassen
(*Weitere Kalender → Per URL*):

- `https://<website>/profitraining.ics`: nur KEEP UP (Trainings und Workshops, mit Titel und Kurzbeschreibung),
- `https://<website>/termine.ics`: der ganze Tanzkalender, KEEP UP eingeschlossen.

So steht alles, was im internen Bereich geplant wird, nach dem nächsten Website-Update auch im Google Kalender des
Vereins. Google holt Abos selbst nur alle paar Stunden neu; in Google bearbeiten lassen sich abonnierte Termine nicht.

**Später (echte Synchronisierung):** Die Tabelle hat dafür schon die Spalte `google_event_id`. Geplant ist eine
Supabase-Funktion `kalender`, die mit einem Google-Dienstkonto (Schlüssel nur als Supabase-Secret, wie bei Google Wallet)
in den Vereinskalender schreibt: neue oder geänderte Einplanung → Termin in Google anlegen bzw. ändern, gelöscht →
entfernen. Vorher zu klären:

1. Welcher Kalender führt? Website/interner Bereich (Vorschlag: ja, Google bekommt eine Kopie) oder Google (dann
   holt die Website beim Build die Termine von dort).
2. Welcher Google-Kalender (Adresse) und wer gibt dem Dienstkonto Schreibrechte?
3. Datenschutz: Die Termine sind öffentlich; Notizen und Entwürfe gehen nicht an Google. Ein Absatz zu Google als
   Empfänger gehört trotzdem in die Datenschutzerklärung. Ein eingebettetes Google-Kalender-Fenster auf der Website
   bräuchte eine Einwilligung (`src/settings/consent.ts`) und ist nicht geplant.

## Dateien

| Datei | Inhalt |
|---|---|
| `supabase/migrations/20261025000000_keepup.sql` | Tabelle, Rechte (RLS), Trigger fürs Veröffentlichen, `keepup_ich()`, `keepup_kontakte()`, Ansicht, Bucket |
| `src/lib/keep-up-plan.ts` | Typen, Status, Datums-Helfer (Website und interner Bereich) |
| `src/lib/keep-up.ts` | Build: Supabase + `wochen.yaml` + Workshops → Kalendertage |
| `src/pages/intern/keep-up/` | Planung, `meine/`, `beschreiben/` |
| `src/scripts/intern/keep-up.ts`, `src/components/intern/KeepUpDaten.astro` | gemeinsame Helfer, Daten aus dem Build, Meldung |
| `src/pages/profitraining.ics.ts`, `src/lib/ics.ts` | Kalender-Abo |
| `tests/keep-up.spec.ts` | Tests mit nachgebautem Supabase |
