# Inhalte bearbeiten

Alle Inhalte liegen als Dateien im Repository. Es gibt zwei Wege, sie zu ändern.

## A) Im Browser mit dem CMS (empfohlen für die Redaktion)

Unter `https://<website>/admin/` läuft [Sveltia CMS](https://github.com/sveltia/sveltia-cms). Jede Änderung wird als
Commit gespeichert, die Website baut sich danach in 1–2 Minuten neu.

**Einmalige Einrichtung (Admin):**

1. Alle Redakteur:innen brauchen ein GitHub-Konto mit Schreibrechten auf das Repository.
2. Login ohne Netlify: [Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth) kostenlos auf
   Cloudflare Workers einrichten (eine GitHub-OAuth-App anlegen, ca. 10 Minuten).
3. Die Worker-Adresse in `public/admin/config.yml` bei `backend.base_url` eintragen.

Alternativ geht der Login auch mit einem persönlichen GitHub-Token (Option „Sign in with Token“ auf der Login-Seite).

## B) Direkt in den Dateien

| Was | Datei | Hinweis |
|---|---|---|
| Termin | `src/content/termine/JJJJ-MM-TT-titel.md` | Pflichtfelder siehe unten |
| Format | `src/content/formate/name.md` | `order` bestimmt die Reihenfolge |
| Personen | `src/content/personen.yaml` | Reihenfolge = Anzeige |
| Vereinsdaten, Impressum-Angaben, Training, Newsletter | `src/settings/verein.json` | |
| Kooperationspartner: Orte auf der Karte | `src/content/kooperation/orte.yaml` | Koordinaten + `verbunden` für die Linien |
| Kooperationspartner: Gruppen und Partner | `src/content/kooperation/gruppen.yaml` | Reihenfolge = Anzeige |
| Spenden: Bankverbindung, Beträge, Wirkung, Steuerbescheid | `src/settings/verein.json` → `donation`, `taxExemption` | GiroCode entsteht automatisch |
| Arbeitsgruppen | `src/settings/arbeitsgruppen.ts` | |
| Impressum-Zusatztext, Datenschutz | `src/content/seiten/*.md` | |
| Fotos | `src/assets/photos/` | werden automatisch verkleinert |
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

Zeiten sind immer Dresdner Ortszeit. Vergangene Termine verschwinden automatisch (nächtlicher Neubau und zusätzlich im
Browser). Fehlt ein Pflichtfeld oder ist ein Datum falsch geschrieben, bricht der Build mit einer verständlichen
Meldung ab. So landet nichts Kaputtes online.

## Schreibstil (aus dem Designsystem)

- Wir-Form, konkrete Zahlen und Orte, ein Gedanke pro Absatz.
- Gendern mit Doppelpunkt: Tänzer:innen, Akteur:innen.
- Keine Emojis, kein Behördendeutsch, keine Werbefloskeln.
- Datumsformat: „Sa · 14. Juni 2026“, Trenner ist der Mittelpunkt „·“.
