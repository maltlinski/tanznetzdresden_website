# Redaktion (Intern → Website-Inhalte)

Mit der Redaktion pflegen Presse und Vorstand die Website selbst, im Browser und ohne GitHub-Konto. Jede Änderung
landet als Commit im Repository. Danach baut sich die Website neu und ist nach 2–3 Minuten online.

Alles, was auf der Website steht, liegt im internen Bereich unter **Website-Inhalte** (nur Presse, Vorstand, Admin):

```
Website-Inhalte
├─ Übersicht        „Was möchtest du ändern?“: große Kacheln, Seiten zum Hinspringen, Zustand, Zuletzt geändert
├─ Seiten           die Website Seite für Seite: Seite › Abschnitt › Element (Texte und was dort sonst steht)
├─ Texte            alle festen Texte mit Suche und Filtern, dazu das Textbuch (docs/texte.md)
├─ Medien           Fotos hochladen, beschreiben, sehen, wo sie verwendet werden
├─ Beiträge         News schreiben (docs/news.md); ältere Beiträge und Bausteine sind dort verlinkt
├─ Termine          Kalender: Termine und KEEP UP (docs/kalender.md); ältere Termine sind dort verlinkt
├─ Freigaben        Profile und Fotos der Mitglieder
└─ Änderungen       wer wann was geändert hat, mit vorher/nachher (Dateien und Datenbank zusammen)
Verwaltung (nur Vorstand/Admin, ganz unten): Impressum, Datenschutz, rechtliche Vereinsdaten, Mitglieder und Rollen,
Zustand und Verlauf, Demo-Ansicht, Datenbank
```

Jede Seite zeigt oben Breadcrumbs („Website-Inhalte › Seiten › Startseite › Kopf › …“), jeder Bereich, wo er auf der
Website erscheint („Erscheint auf der Website: …“). Selten gebrauchte Felder stehen im Formular unter **Erweitert**,
die englischen Felder blendet „Englische Fassung zeigen“ ein (die Wahl merkt sich der Browser).

**Seitenplan:** Seiten und Abschnitte kommen aus `src/settings/texte.json` (Reihenfolge wie auf der Website), was in
einem Abschnitt sonst steht, aus dessen Liste `auch` (`redaktion:<bereich>` oder ein Pfad wie `intern/kalender/`).
Logik in `src/scripts/intern/redaktion/seitenplan.ts`. **Neuer Bereich in `bereiche.ts` → beim passenden Abschnitt in
`texte.json` unter `auch` eintragen**, sonst ist er unter „Seiten“ nicht zu finden (`tests/redaktion.spec.ts` prüft das).

## Für die Redaktion

### Wer darf was?

| Rolle | darf |
|---|---|
| Presse | alles in der Redaktion (auch Profile und Fotos freigeben), außer Impressum, Datenschutz und den rechtlichen Vereinsdaten |
| Vorstand, Admin | alles |
| Mitglied | nichts in der Redaktion (eigenes Profil wie bisher) |

Die Rolle vergibt der Vorstand unter *Intern → Mitglieder*.

### Was steht wo?

| Bereich | Was | Wo in der Redaktion |
|---|---|---|
| **Beiträge** | neue Beiträge mit Titelbild, Blöcken, Frist oder Zitat (docs/news.md) | Website-Inhalte → Beiträge |
| **Ältere Beiträge**, **Bausteine für Beiträge** | Beiträge von der früheren Website (nur bearbeiten), wiederkehrende Texte wie Förderhinweise | Seiten → News, Links unter Beiträge |
| **Termine** | Tanzkalender, Startseite, Terminseiten, KEEP UP (docs/kalender.md) | Website-Inhalte → Termine |
| **Ältere Termine**, **Älterer Trainingsplan** | Termine und KEEP UP-Wochen aus der Zeit vor dem Kalender: bearbeiten und löschen, nichts Neues | Seiten → Tanzkalender bzw. Profitraining |
| **Freigaben** | Profile und Fotos, die Mitglieder selbst pflegen (docs/profile.md) | Website-Inhalte → Freigaben |
| **Formate**, **Archiv**, **Chronik**, **Tanzkalender-Archiv** | Formate-Seite und Startseite (docs/formate.md) | Seiten → Formate |
| **Dozent:innen**, **Seite Profitraining** | Foto-Mosaik, Überschrift, Einleitung, Infos, Kopffoto | Seiten → Profitraining |
| **Personen** | Mitglieder:innen und Trainer:innen mit Profil | Seiten → Netzwerk, Über uns |
| **Orte auf der Karte**, **Partner** | Kooperationsseite | Seiten → Kooperationen |
| **Arbeitsgruppen**, **Über uns: Haltung** | Vereinsseite | Seiten → Über uns |
| **Startseite: Kopf** | „Tanz für …“ mit den wechselnden Wörtern | Seiten → Startseite → Kopf |
| **Vereinsdaten** | Claim, Zahlen, Training, Mitgliedschaft, Presse, Partner, Förderer, Spenden; Rechtliches nur Vorstand | Seiten → Auf jeder Seite, Verwaltung |
| **Textseiten** | Transparenz, Barrierefreiheit, Leichte Sprache; Impressum und Datenschutz (nur Vorstand) | Seiten → Barrierefreiheit und Textseiten, Verwaltung |
| **Texte** | Überschriften, Knöpfe und Hinweise aller Seiten, Deutsch und Englisch, Textbuch ([texte.md](texte.md)) | Website-Inhalte → Texte |

### So geht's

- **Neu:** In der Liste oben rechts „… anlegen“ (nicht bei älteren Terminen und Wochen: die entstehen im Kalender). Pflichtfelder sind markiert. Fehlt etwas, springt der Cursor
  dorthin und die Meldung steht direkt am Feld.
- **Bearbeiten:** Eintrag in der Liste anklicken, ändern, „Speichern“.
- **Sortieren:** Mit ↑ und ↓ oder per Ziehen mit der Maus, danach „Reihenfolge speichern“.
- **Löschen:** ✕ in der Liste oder „Löschen“ im Formular, mit Rückfrage. Wird ein Eintrag noch woanders gebraucht,
  zum Beispiel eine Person in einem Termin, sagt die Redaktion wo. Dann zuerst dort entfernen.
- **Englisch:** „Englische Fassung zeigen“ oben im Formular blendet die englischen Felder ein (hell hinterlegt, „Englisch“). Sie sind freiwillig.
  Fehlt es, zeigt die englische Seite den deutschen Text. Lange Texte haben darunter „englische Fassung“ zum
  Aufklappen.
- **Fotos:** „Neues Foto hochladen“ verkleinert das Foto im Browser und lädt es beim Speichern mit hoch. Vorhandene
  Fotos stehen in der Auswahl daneben. Eine Bildbeschreibung ist Pflicht, weil sie für Barrierefreiheit gebraucht
  wird.
- **Text formatieren:** Lange Texte schreibst du wie in einem Textprogramm: Zwischenüberschrift, Fett, Kursiv, Liste
  und Link über die Knöpfe, ohne Sonderzeichen. Bei Beiträgen fügt „Bild“ ein Foto aus den Medien ein (die
  Bildbeschreibung ist Pflicht). Tabellen, Notizen und Bilder-Abschnitte stehen als Kasten im Text und bleiben, wie
  sie sind. Enthält ein Text etwas, das der Editor nicht kennt, öffnet er im Textmodus mit den bisherigen Knöpfen.
- **Vorschau:** Neben dem Formular (auf Tablet und Handy über den Knopf „Vorschau“) steht die Seite der Website.
  Was du tippst oder ausblendest, siehst du dort sofort, bevor du speicherst; beim Bearbeiten springt sie zur Stelle.
  Oben: Desktop, Tablet, Handy, Deutsch/Englisch, „Ausgeblendetes markiert zeigen“. Neue Einträge und neue Fotos
  zeigt sie erst nach dem Speichern. Jede Seite ansehen: *Website-Inhalte → Übersicht → Vorschau öffnen*.
  Mehr Platz: Der Knopf oben in der Seitenleiste klappt sie ein (bleibt so, bis du ihn wieder drückst). Den
  Trenner zwischen Formular und Vorschau ziehst du nach links oder rechts (oder Pfeiltasten; Doppelklick: zurück).
  „Vollbild“ legt die Vorschau über das ganze Fenster, Esc schließt.
- **Medien:** drei Reiter. *Fotos für Beiträge* (Mediathek: hochladen per Ziehen, verkleinert automatisch,
  Bildbeschreibung Pflicht, Fotonachweis, Ausschnitt, ausblenden). *Fotos der Seiten* (Formate, Personen, Förderer)
  und *Dokumente (PDF)* (hochladen per Ziehen, höchstens 8 MB). Jede Datei zeigt „Wird verwendet auf …“; löschen
  lässt sich nur, was nirgends verwendet wird.
- **Entwurf:** Termine und News mit dem Haken „Entwurf“ erscheinen nicht auf der Website.
- **Personen auswählen:** Bei *Mitwirkende* (Termine) und *Person* (Dozent:innen) stehen auch freigegebene
  Mitgliederprofile zur Auswahl, gekennzeichnet als „(Mitgliederprofil)“. Eine Person muss also nicht doppelt unter
  *Personen* angelegt werden.

### Ausblenden

Statt zu löschen lässt sich fast alles **ausblenden**: Schalter „Auf der Website anzeigen“ aus, speichern. Ausgeblendetes
bleibt in der Redaktion erhalten und bearbeitbar, ist dort ausgegraut und mit „Ausgeblendet“ markiert, und lässt sich
jederzeit wieder einblenden. Auf der Website fehlt es ganz, auch im Quelltext der Seiten. Listen haben den Filter
„Alle / Sichtbar / Ausgeblendet“.

| Was | Wo der Schalter steht |
|---|---|
| Einträge: Termine, ältere Beiträge, Formate, Archiv, Chronik, Tanzkalender-Ausgaben, Dozent:innen, Trainingswochen, Personen, Orte, Partnergruppen | oben im Formular |
| Listeneinträge: Eckdaten und Links der Formate, Galerie und Arbeiten einer Person, Partner, Säulen, Zahlen, Förderer, Spenden-Formate, Arbeitsgruppen | im jeweiligen Listeneintrag |
| einzelne Wörter: wechselnde Wörter, Auszeichnungen, Partner auf der Startseite, Ereignisse der Chronik | „Ausblenden“ neben dem Wort (gilt je Sprache) |
| Texte: Einleitungen und Hinweise, z. B. der Text unter einer Überschrift | Texte → am Text |
| ganze Abschnitte: Startseite (Netz, Mitglied werden), Formate (Chronik, Archiv, Mitmachen), Über uns (Das Netz), Spenden (Fragen), Kooperationen (Anfrage) | Texte → am Abschnitt |
| Fotos der Mediathek | Medien → am Foto: fehlt dann in allen Beiträgen |

Nicht ausblenden lassen sich Überschriften, Menüpunkte und Knöpfe (die Seite sähe sonst kaputt aus), Impressum,
Datenschutz und die übrigen Pflichtseiten. Ein ausgeblendeter Termin ist dasselbe wie ein Entwurf.

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

### Änderungen

*Website-Inhalte → Änderungen* zeigt alles, was über den internen Bereich gespeichert wurde, nach Tagen geordnet:
Texte, Seiten und Listen, Fotos der Seiten und PDFs ebenso wie Beiträge, Termine, KEEP UP, Fotos für Beiträge,
Freigaben und (nur für Vorstand/Admin) Rollen. Filter: Bereich, Person, Zeitraum (7 Tage bis 1 Jahr), Suche.
**Was wurde geändert?** klappt auf, was vorher und was danach dastand (lange Texte nur die geänderten Zeilen).
Die Übersicht zeigt unter „Zuletzt geändert“ die letzten acht davon. Wiederherstellen geht hier nicht (siehe unten).

Nicht im Verlauf: was Mitglieder in ihrem eigenen Profil ändern (nur die Freigabe durch die Redaktion steht drin),
Änderungen direkt im Supabase-Dashboard erscheinen mit „Datenbank“ statt einem Namen.

**Einrichten:** `supabase/migrations/20261105000000_aenderungen.sql` im SQL-Editor ausführen (Tabelle `aenderungen`
und Trigger) und die Funktion `inhalte` neu einspielen. Ohne Migration zeigt die Seite nur die Dateien und einen
Hinweis; erfasst wird ab dem Einspielen, ältere Änderungen an Beiträgen und Terminen gibt es nicht.

**Für Entwickler:innen:** Logik `src/scripts/intern/redaktion/aenderungen.ts`, Seite
`src/pages/intern/redaktion/aenderungen/`. Dateien: Aktion `verlauf` (nur Commits mit „Geändert von … (Intern →
Redaktion)“, die Commits der Entwicklung bleiben draußen; neue Commits tragen zusätzlich `Dateien: …`) und
`aenderung` (geänderte Zeilen eines Commits). Datenbank: Trigger `aenderung_merken()` schreibt nur geänderte Felder,
fasst Änderungen derselben Person am selben Eintrag innerhalb von 15 Minuten zusammen und verhindert nie das Speichern.
Neue Tabelle mit Redaktionsinhalten → Trigger in einer Migration ergänzen und den Bereich in `DB_ORT` eintragen.

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

**Vorschau:** `src/scripts/intern/redaktion/vorschau.ts` lädt die echte Seite (gleiche Adresse) in einen Rahmen und
ändert sie im Browser: Texte ersetzen, `html` für lange Texte, Ausgeblendetes mit `data-vs-aus` markieren, `springen()`
zur Stelle. Leiste und Rahmen: `src/components/intern/VorschauPanel.astro` (mit Trenner `--r-form` in `.r-split` und
Vollbild; gemerkt in `localStorage`, Seitenleiste eingeklappt über `html.leiste-zu` in `src/layouts/Intern.astro`). Welche Seite und Stelle: in `bereiche.ts`
`seite()`, `anker()` (CSS-Selektor) und `textSelektor` (wo der lange Text steht), Zustand aus dem Formular in
`vorschau-eintrag.ts`. Ausblendbare Abschnitte tragen auf der Website `data-abschnitt="seite.abschnitt"`,
Chronik-Jahre `data-inhalt`. Die Website selbst bleibt unverändert, nur unsichtbare `data-`Attribute kommen dazu.

**Text-Editor:** TipTap (`@tiptap/core`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-link`, feste
Versionen), nur im internen Bereich geladen. `src/scripts/intern/redaktion/richtext.ts` wandelt Markdown → Editor →
Markdown; gespeichert wird weiter Markdown. Bevor der Editor ein Feld übernimmt, prüft er den Hin- und Rückweg
(gleiche Ausgabe auf der Website, Notizen erhalten), sonst bleibt das Feld im Textmodus. Bilder-Abschnitte, Tabellen,
Notizen und Code sind geschützte Kästen (`roh`). „Bild aus Medien“ nur bei Feldern mit `bilder: true`.

**Medien:** Mediathek `src/pages/intern/news/medien/` (Supabase), *Fotos der Seiten* und *Dokumente*
`src/pages/intern/redaktion/medien/?art=…` (Repository über die Funktion `inhalte`), Reiter
`src/components/intern/MedienReiter.astro`. „Wird verwendet auf“ liest die Dateien, in denen Fotos und PDFs stehen
können (Formate, Personen, Listen, Einstellungen); die Bühnenfotos der Startseite sind fest eingebaut.

**Ausblenden (Regel):** Feld `sichtbar` (Standard `true`, fehlt = sichtbar) in Schemas und Listeneinträgen; Termine und
News nutzen `draft`. Gefiltert wird **in den Ladern** (`src/lib/content.ts`, `formate.ts`, `keep-up.ts`, `settings.ts`,
`src/settings/*.ts`, `news.ts`), nie erst in der Ansicht, damit nichts im HTML landet; Regeln in `src/lib/sichtbar.ts`.
Wortlisten: Text oder `{ text, sichtbar: false }`. Texte und Abschnitte in `texte.json`: `ausblendbar` legt die
Entwicklung fest (die Funktion `inhalte` lehnt anderes ab), `aus` setzt die Redaktion; `texte()` liefert dann `''`,
`abschnittZeigen()` false, die Ansicht lässt das Element samt Abständen weg. Neuer ausblendbarer Abschnitt: in
`texte.json` `ausblendbar: true` und in der Ansicht `abschnittZeigen('seite', 'abschnitt')` (`tests/sichtbar.spec.ts`
prüft beides). Neues Schema mit Einträgen: `sichtbar` ins Schema, Lader filtern, in `bereiche.ts` das Feld `SICHTBAR`.
Mediathek: Spalte `news_medien.sichtbar` (Migration `20261104000000_sichtbar.sql`), ausgeblendete Fotos fallen in
`medienAnwenden()` heraus. Die Datei eines ausgeblendeten Fotos bleibt über ihre direkte Adresse erreichbar.


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
