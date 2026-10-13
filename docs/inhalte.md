# Inhalte bearbeiten

Alle Inhalte liegen als Dateien im Repository. Es gibt drei Wege, sie zu ändern.

## A) Im internen Bereich: Redaktion (empfohlen)

*Intern → Redaktion* ist für Mitglieder mit der Rolle Presse, Vorstand oder Admin. Termine, News, Formate,
Profitraining, Personen, Partner, Startseiten-Texte, Vereinsdaten und Textseiten lassen sich dort in Formularen
anlegen, sortieren, bearbeiten und löschen. Ein GitHub-Konto ist nicht nötig. Anleitung und Einrichtung:
[redaktion.md](redaktion.md).

## B) Im Browser mit dem CMS (für Admins)

Unter `https://<website>/admin/` läuft [Sveltia CMS](https://github.com/sveltia/sveltia-cms). Jede Änderung wird als
Commit gespeichert, die Website baut sich danach in 1–2 Minuten neu.

**Einmalige Einrichtung (Admin):**

1. Alle Redakteur:innen brauchen ein GitHub-Konto mit Schreibrechten auf das Repository.
2. Login ohne Netlify: [Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth) kostenlos auf
   Cloudflare Workers einrichten (eine GitHub-OAuth-App anlegen, ca. 10 Minuten).
3. Die Worker-Adresse in `public/admin/config.yml` bei `backend.base_url` eintragen.

Alternativ geht der Login auch mit einem persönlichen GitHub-Token (Option „Sign in with Token“ auf der Login-Seite).

## C) Direkt in den Dateien

| Was | Datei | Hinweis |
|---|---|---|
| News | am einfachsten im internen Bereich: *Intern → Redaktion → News schreiben* | als Datei: `src/content/news/de/` + `en/`, siehe docs/news.md |
| Termin | `src/content/termine/JJJJ-MM-TT-titel.md` | Pflichtfelder siehe unten |
| Format | `src/content/formate/name.md` | `order` bestimmt die Reihenfolge, `seite` verlinkt eine eigene Seite |
| KEEP UP: Trainingsplan | `src/content/keep-up/wochen.yaml` | eine Zeile pro Woche, siehe unten |
| KEEP UP: Dozent:innen im Kartenstapel | `src/content/keep-up/dozentinnen.yaml` | Reihenfolge = Stapel; Name und Foto aus dem Profil |
| KEEP UP: Seitentexte, Kopf-Foto | `src/settings/keep-up.json` | Platzhalterfotos und Stapel-Bewegung in `keep-up.ts` |
| Personen | `src/content/personen.yaml` | Reihenfolge = Anzeige |
| Vereinsdaten, Impressum-Angaben, Training, Newsletter | `src/settings/verein.json` | |
| Kooperationspartner: Orte auf der Karte | `src/content/kooperation/orte.yaml` | Koordinaten + `verbunden` für die Linien |
| Kooperationspartner: Gruppen und Partner | `src/content/kooperation/gruppen.yaml` | Reihenfolge = Anzeige |
| Spenden: Bankverbindung, Beträge, Wirkung, Steuerbescheid | `src/settings/verein.json` → `donation`, `taxExemption` | GiroCode entsteht automatisch |
| Arbeitsgruppen | `src/settings/arbeitsgruppen.json` | |
| Startseite: „Tanz für …“, Haltung & Wirkung | `src/settings/hero.json`, `src/settings/haltung.json` | |
| Impressum-Zusatztext, Datenschutz, Transparenz … | `src/content/seiten/*.md` (englisch: `seiten/en/`) | |
| Fotos | `src/assets/photos/` | werden automatisch verkleinert |
| Fotos im Hero der Startseite | `src/settings/hero.ts` | Ausschnitt und Position je Foto, eines pro Besuch |
| PDFs (Antrag, Satzung) | `public/downloads/` | Pfad in `verein.json` eintragen |

### Beispiel: neuer Termin

```markdown
---
title: "POP UP #12"
start: "2027-02-20 20:00"
end: "2027-02-20 22:00"          # optional
venue: "Zentralwerk"
timeLabel: "20:00 Uhr, Einlass 19:30"   # optional
category: Bühne                  # Bühne | Training | Diskurs
teaser: "Neue Kurzstücke aus dem Netzwerk"
link: "https://tickets.example"  # optional
draft: false                     # true = noch nicht anzeigen
---
```

### Ein Kalender für alles

Der Tanzkalender (`/termine/`) und das Profitraining (`/profitraining/`) nutzen denselben Monatskalender
(`src/components/Kalender.astro`, Daten aus `src/lib/kalender.ts`):

- **Tanzkalender:** alle Termine aus `src/content/termine/` und jeder Trainingstag von KEEP UP, Filter nach Kategorie
  (Bühne, Training, Diskurs). Auch das Kalender-Abo (`/termine.ics`) enthält die Trainingstage.
- **Profitraining:** nur Trainingstage und KEEP UP-Workshops, Filter nach Dozent:in.

Das Training also **nicht** zusätzlich als Termin eintragen. Es kommt aus dem Trainingsplan. Workshops dagegen sind
Termine (mit `format: keep-up`) und erscheinen in beiden Kalendern.

### KEEP UP · Profitraining (`/profitraining/`)

Der Kalender auf der Seite entsteht aus drei Quellen:

```yaml
# src/content/keep-up/wochen.yaml – eine Zeile pro Woche (id = Montag der Woche)
- { id: "2027-01-11", dozent: alexandre-may, tage: [mo, di, mi, do, fr] }
- { id: "2027-01-18", dozent: aurora-fradella, tage: [mo, mi, fr], zeit: "09:30–11:00" }   # zeit/ort optional
```

- `dozent` ist ein Kürzel aus `src/content/keep-up/dozentinnen.yaml`. Dort stehen Stil und ein kurzer Text zum
  Unterricht. Name, Foto und Profil-Link kommen aus dem Profil der Person (gleiches Kürzel, aus `personen.yaml` oder
  ein freigegebenes Mitgliederprofil, docs/profile.md). Lädt die Person im internen Bereich ein Foto hoch, steht es
  nach der Freigabe auch auf ihrer Karte. Ohne Foto erscheint ein Platzhalter (`platzhalterFotos` in
  `src/settings/keep-up.ts`).
- Workshops sind normale Termine mit `format: keep-up` (und `people: [kürzel]` für die Dozent:in). Sie stehen
  dann im Tanzkalender und im Profitrainings-Kalender (magenta).
- Ort und Beitrag kommen aus `src/settings/verein.json` (`training`).

Zeiten sind immer Dresdner Ortszeit. Vergangene Termine verschwinden automatisch (nächtlicher Neubau und zusätzlich im
Browser). Fehlt ein Pflichtfeld oder ist ein Datum falsch geschrieben, bricht der Build mit einer verständlichen
Meldung ab. So landet nichts Kaputtes online.

## Schreibstil (aus dem Designsystem)

- Wir-Form, konkrete Zahlen und Orte, ein Gedanke pro Absatz.
- Gendern mit Doppelpunkt: Tänzer:innen, Akteur:innen.
- Keine Emojis, kein Behördendeutsch, keine Werbefloskeln.
- Datumsformat: „Sa · 14. Juni 2026“, Trenner ist der Mittelpunkt „·“.
