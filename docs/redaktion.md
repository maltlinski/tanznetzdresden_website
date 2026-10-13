# Redaktion (Intern → Redaktion)

Mit der Redaktion pflegen Presse und Vorstand die Website selbst, im Browser und ohne GitHub-Konto. Jede Änderung
landet als Commit im Repository. Danach baut sich die Website neu und ist nach 2–3 Minuten online.

## Für die Redaktion

### Wer darf was?

| Rolle | darf |
|---|---|
| Presse | alles in der Redaktion (auch Profile und Fotos freigeben), außer Impressum, Datenschutz und den rechtlichen Vereinsdaten |
| Vorstand, Admin | alles |
| Mitglied | nichts in der Redaktion (eigenes Profil wie bisher) |

Die Rolle vergibt der Vorstand unter *Intern → Mitglieder*.

### Was steht wo?

| Bereich | Was | Sortieren |
|---|---|---|
| **News schreiben** | neue Beiträge mit Foto, Frist oder Zitat (docs/news.md) | nach Datum |
| **Termine** | Tanzkalender, Startseite, eigene Terminseite | nach Datum, automatisch |
| **Freigaben** | Profile und Fotos, die Mitglieder selbst pflegen (docs/profile.md) | – |
| **Formate** | KEEP UP, POP UP … auf der Startseite | von Hand |
| **News-Archiv** | ältere Beiträge, die als Datei vorliegen | nach Datum |
| **Trainingsplan** | KEEP UP: wer wann unterrichtet (Kalender auf /profitraining/ und im Tanzkalender) | nach Datum, automatisch |
| **Dozent:innen** | die Karten im Stapel auf /profitraining/ (Name und Foto aus dem Profil) | von Hand = Reihenfolge im Stapel |
| **Seite Profitraining** | Überschrift, Einleitung, Infos, Kopffoto | – |
| **Personen** | Mitglieder:innen und Trainer:innen mit Profil | von Hand = Anzeige |
| **Orte auf der Karte**, **Partner** | Kooperationsseite | von Hand |
| **Arbeitsgruppen** | Vereinsseite | im Formular |
| **Startseite: Kopf**, **Startseite: Haltung** | „Tanz für …“, Säulen, Auszeichnungen, Foto | im Formular |
| **Vereinsdaten** | Claim, Zahlen, Training, Mitgliedschaft, Presse, Partner, Förderer, Spenden, Rechtliches | im Formular |
| **Textseiten** | Transparenz, Barrierefreiheit, Leichte Sprache, Impressum, Datenschutz | – |

### So geht's

- **Neu:** In der Liste oben rechts „… anlegen“. Pflichtfelder sind markiert. Fehlt etwas, springt der Cursor
  dorthin und die Meldung steht direkt am Feld.
- **Bearbeiten:** Eintrag in der Liste anklicken, ändern, „Speichern“.
- **Kopieren:** Bei Terminen legt „Kopieren“ einen neuen Termin mit denselben Angaben an, zunächst als Entwurf.
  So geht eine Reihe (z. B. Studio Round) schnell.
- **Sortieren:** Mit ↑ und ↓ oder per Ziehen mit der Maus, danach „Reihenfolge speichern“.
- **Löschen:** ✕ in der Liste oder „Löschen“ im Formular, mit Rückfrage. Wird ein Eintrag noch woanders gebraucht,
  zum Beispiel eine Person in einem Termin, sagt die Redaktion wo. Dann zuerst dort entfernen.
- **Englisch:** Neben vielen Feldern steht ein englisches Feld (hell hinterlegt, „Englisch“). Es ist freiwillig.
  Fehlt es, zeigt die englische Seite den deutschen Text. Lange Texte haben darunter „englische Fassung“ zum
  Aufklappen.
- **Fotos:** „Neues Foto hochladen“ verkleinert das Foto im Browser und lädt es beim Speichern mit hoch. Vorhandene
  Fotos stehen in der Auswahl daneben. Eine Bildbeschreibung ist Pflicht, weil sie für Barrierefreiheit gebraucht
  wird.
- **Text formatieren:** Über dem Textfeld setzen die Knöpfe Zwischenüberschrift, Fett, Aufzählung, Zitat und Link.
  „Vorschau“ zeigt das Ergebnis. Eigenes HTML ist aus Sicherheitsgründen nicht erlaubt.
- **Entwurf:** Termine und News mit dem Haken „Entwurf“ erscheinen nicht auf der Website.
- **Personen auswählen:** Bei *Mitwirkende* (Termine) und *Person* (Dozent:innen) stehen auch freigegebene
  Mitgliederprofile zur Auswahl, gekennzeichnet als „(Mitgliederprofil)“. Eine Person muss also nicht doppelt unter
  *Personen* angelegt werden.

### Freigaben

Mitglieder pflegen ihr Profil und Foto unter *Mein Profil*. Unter *Redaktion → Freigaben* steht, was wartet:

- **Profil freigeben:** Das Profil erscheint unter Netzwerk, ein mitgeschicktes Foto gleich mit.
- **Foto freigeben** oder **Foto ablehnen:** für neue Fotos schon freigegebener Profile. Bis zur Freigabe bleibt
  das bisherige Foto online.
- **Auf der Website:** Foto entfernen oder die Freigabe zurückziehen.
- Steht ein Name schon mit einer anderen Adresse auf der Website, warnt die Seite vor einem doppelten Profil.

Nach jeder Freigabe baut sich die Website neu (2–3 Minuten). Das funktioniert auch, wenn sonst nichts in der Redaktion
gespeichert wird. Auf der Übersicht im internen Bereich und unter *Mitglieder* steht, wie viel wartet.

### Wann ist es online?

Oben rechts steht der Zustand der Website:

- **Wird gerade aktualisiert:** Die Änderung ist gespeichert, die Website baut sich neu (2–3 Minuten).
- **Aktuell:** Alles ist online.
- **Fehlgeschlagen:** Die Website zeigt noch den vorherigen Stand. Bitte dem Vorstand oder Admin Bescheid geben.
  Meist passt ein Wert nicht zu den Regeln der Website. Die Fehlermeldung steht im Build-Log auf GitHub (*Actions*).

Auf der Übersicht steht unter „Zuletzt geändert“, wer wann was gespeichert hat.

### Zwei Leute gleichzeitig

Speichert jemand anderes dieselbe Datei, während du noch tippst, sagt die Redaktion beim Speichern Bescheid, statt
die andere Änderung zu überschreiben. Dann die Seite neu laden und die eigene Änderung noch einmal eintragen.

### Rückgängig machen

Jede Änderung ist ein Commit mit deinem Namen. Ein Admin kann sie auf GitHub zurücknehmen (*Commits →* Commit
öffnen *→ Revert* bzw. die alte Fassung wieder einsetzen).

## Einrichten (einmalig, Admin)

Voraussetzung: Der interne Bereich läuft schon (docs/intern.md).

### 1. GitHub-Schlüssel anlegen

Auf GitHub (Konto mit Schreibrechten auf das Repository): *Settings → Developer settings → Personal access tokens →
Fine-grained tokens → Generate new token*.

- **Repository access:** *Only select repositories* → `tanznetzdresden_website`
- **Permissions → Repository:** *Contents: Read and write* (speichern und die Website nach Freigaben und News neu
  bauen lassen), *Actions: Read-only* (für den Website-Status).
  *Metadata: Read-only* kommt automatisch dazu.
- **Expiration:** so lang wie möglich, und einen Kalendereintrag zum Erneuern machen. Läuft der Schlüssel ab,
  meldet die Redaktion „Der GitHub-Schlüssel der Redaktion ist ungültig oder abgelaufen“.

Den Schlüssel (`github_pat_…`) kopieren. Er kommt **nur** in Supabase, nie ins Repository.

### 2. Funktion in Supabase anlegen

*Supabase → Edge Functions → Deploy a new function → Via Editor*:

- Name: **`inhalte`**
- Inhalt: die Datei `supabase/functions/inhalte/index.ts` aus dem Repository vollständig hineinkopieren.
- *Deploy*. Die Einstellung „Verify JWT“ bleibt an. Nur angemeldete Mitglieder kommen durch, die Rolle prüft die
  Funktion selbst.

Alternativ mit der Supabase-CLI: `supabase functions deploy inhalte --project-ref <projekt>`.

### 3. Secrets eintragen

*Edge Functions → Secrets* (bzw. *Project Settings → Edge Functions*):

| Name | Wert |
|---|---|
| `GITHUB_TOKEN` | der Schlüssel aus Schritt 1 |
| `GITHUB_REPO` | `maltlinski/tanznetzdresden_website` |
| `GITHUB_BRANCH` | optional, Standard `main` |

`SUPABASE_URL` und `SUPABASE_ANON_KEY` setzt Supabase selbst.

### 4. Testen

Mit Rolle Presse oder Vorstand anmelden, *Intern → Redaktion* öffnen. Die Kacheln zeigen Zahlen, oben rechts steht
„Die Website ist aktuell“. Einen Entwurfs-Termin anlegen, speichern, auf GitHub unter *Commits* nachsehen und wieder
löschen.

### Wenn es nicht klappt

| Meldung | Ursache und Lösung |
|---|---|
| „Die Supabase-Funktion „inhalte“ fehlt“ | Schritt 2. Der Name muss genau `inhalte` sein. |
| „GITHUB_TOKEN oder GITHUB_REPO fehlt“ | Schritt 3. Nach dem Eintragen etwa eine Minute warten. |
| „Der GitHub-Schlüssel … ist ungültig oder abgelaufen“ | Neuen Schlüssel anlegen (Schritt 1) und `GITHUB_TOKEN` ersetzen. |
| „GitHub verweigert den Zugriff (403/404)“ | Schlüssel hat keine Rechte auf das Repository oder `GITHUB_REPO` ist falsch geschrieben. |
| „Die Redaktion ist für Mitglieder mit der Rolle …“ | Rolle unter *Intern → Mitglieder* auf Presse oder Vorstand setzen. |
| Status bleibt „nicht abrufbar“ | Schlüssel ohne *Actions: Read-only*. Speichern geht trotzdem. |
| Freigabe oder News: „erscheint … spätestens morgen früh“ | Die Funktion `inhalte` ist nicht eingerichtet oder der Schlüssel darf nicht schreiben. Schritte 1–3. |
| Gespeichert, aber die Website ändert sich nicht | Unter *Actions* auf GitHub nachsehen. Rot = Build-Fehler, Meldung lesen und den Wert in der Redaktion korrigieren. |

## Sicherheit

- Der GitHub-Schlüssel liegt nur als Supabase-Secret. Der Browser kennt ihn nicht.
- Die Funktion prüft bei jedem Aufruf die Anmeldung und die Rolle in `public.profiles`.
- Schreiben darf sie nur Inhalte: `src/content/**` (Markdown, YAML), `src/settings/*.json`, Fotos in
  `src/assets/{photos,personen,foerderer}/` und PDFs in `public/downloads/`. Code, Workflows und Konfiguration sind
  ausgeschlossen.
- Eigenes HTML, `javascript:`-Links und Dateien, deren Inhalt nicht zur Endung passt, lehnt sie ab.
- Impressum, Datenschutz und die rechtlichen Angaben in `verein.json` (Anschrift, E-Mail-Adressen, Register, Steuer,
  Bankverbindung) ändert nur Vorstand/Admin. Das prüft die Funktion, nicht nur das Formular.
- Konflikte: Jede Änderung trägt den Stand mit, auf dem sie beruht. Hat sich die Datei inzwischen geändert, wird
  nichts überschrieben.
- Kaputte Inhalte gehen nicht online: Der Build prüft alle Schemas und bricht sonst ab. Die Website zeigt dann
  weiter den vorherigen Stand.

## Für Entwickler:innen

| Was | Wo |
|---|---|
| Funktion (GitHub-Commits, Rollen, Prüfungen) | `supabase/functions/inhalte/index.ts`, Tests: `tests/redaktion-funktion.spec.ts` |
| Bereiche und Felder | `src/scripts/intern/redaktion/bereiche.ts` |
| Lesen/Schreiben von Markdown, YAML, JSON (Kommentare bleiben erhalten) | `src/scripts/intern/redaktion/daten.ts` |
| Formularbausteine | `src/scripts/intern/redaktion/formular.ts` |
| Seiten | `src/pages/intern/redaktion/` (Übersicht, `liste/`, `eintrag/`, `freigaben/`), Stil: `src/styles/redaktion.css` |
| Freigaben (Datenbank) | `supabase/migrations/20261013000000_freigaben.sql` (Funktion `freigabe()`), Zähler: `src/scripts/intern/freigaben.ts` |
| Browser-Tests (Supabase und Funktion nachgebaut) | `tests/redaktion.spec.ts` |

**Neues Feld in einem Schema** (`src/content.config.ts`, `src/lib/settings.ts`): in `bereiche.ts` beim passenden
Bereich ergänzen. Felder, die dort fehlen, bleiben beim Speichern unverändert erhalten, sind aber nicht bearbeitbar.

**Neuer Inhaltstyp:** Collection anlegen, dann in `bereiche.ts` einen Bereich (`art: 'ordner'` für einen Ordner mit
Markdown-Dateien, `'liste'` für eine YAML-Liste mit `id`, `'einstellung'` für eine JSON-Datei). Verweise auf andere
Bereiche (`typ: 'verweis'`) schützen automatisch vor dem Löschen verwendeter Einträge.

**Texte aus `.ts`-Dateien:** Die Redaktion kann nur Markdown, YAML und JSON schreiben. Texte, die sie ändern soll,
gehören in eine JSON-Datei unter `src/settings/`, die `.ts`-Datei liest sie ein (siehe `haltung.ts`).

**Funktion ändern:** Danach in Supabase neu einspielen (Schritt 2), sonst läuft die alte Fassung weiter. Seit den
Freigaben kennt sie die Aktion `neu_bauen`. Wer die Funktion vorher angelegt hat, spielt sie einmal neu ein.
