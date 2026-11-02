# Formate

Die Seite **Formate** (`/formate/`, englisch `/en/formats/`) zeigt, was der Verein macht: oben die Formate als
Bühne zum Durchschalten, darunter jedes Format im Detail mit dem nächsten Termin, die Chronik, das Archiv
abgeschlossener Projekte und „Mitmachen“. Dazu gehört das **Tanzkalender-Archiv** (`/formate/tanzkalender/`)
mit allen Ausgaben des Monatsplakats 2024–2026. Entwurf: `design/entwuerfe/2026-11-formate/`.

## Was steht wo?

| Was | Redaktion | Datei |
|---|---|---|
| Formate (Name, Rubriken, Texte, Foto, Eckdaten, Links, beendet) | *Formate* | `src/content/formate/<adresse>.md` |
| Nächster Termin eines Formats | *Intern → Kalender*: Feld „Gehört zum Format“ (KEEP UP: die Trainings) | `src/content/termine/` |
| Abgeschlossene Projekte | *Archiv der Formate* | `src/content/formate-archiv/projekte.yaml` |
| Chronik „Seit 2010 in Bewegung“ | *Chronik der Formate* | `src/content/formate-archiv/chronik.yaml` |
| Ausgaben des Tanzkalenders | *Tanzkalender-Archiv* | `src/content/formate-archiv/tanzkalender.yaml` |
| Arbeitsgruppen unter „Mitmachen“ | *Arbeitsgruppen* | `src/settings/arbeitsgruppen.json` |
| Feste Texte (Überschriften, Filter, Knöpfe) | *Texte → Formate*, *Texte → Tanzkalender-Archiv* | `src/settings/texte.json` |

Die Startseite zeigt dieselben Formate als Streifen; jede Karte führt zum Format auf der Formate-Seite (oder zur
eigenen Seite, Feld `seite`, z. B. KEEP UP → Profitraining). Im Menü führt „Formate“ zur Formate-Seite.

## Ein Format

- **Rubriken**: Bühne, Training, Diskurs, Stadtraum, Residenz. Die erste steht als Badge am Format; der Filter
  „Ich möchte …“ fasst sie zusammen (Tanz sehen = Bühne, Trainieren = Training, Mitreden = Diskurs, Draußen
  tanzen = Stadtraum). Filter ohne passendes Format verschwinden.
- **Kurzbeschreibung** (Startseite, Kopf der Formate-Seite) und **Beschreibung** (ausführlich, sonst die kurze).
- **Eckdaten**: Bezeichnung und Angabe, z. B. Ort, Partner, Projektleitung. „Seit“ steht immer zuerst.
- **Links**: Text und genau ein Ziel – ein Journal-Beitrag, eine Seite der Website, eine Datei (PDF) oder eine
  Adresse. Unter laufenden Formaten steht zusätzlich „Alle Termine →“.
- **Nächster Termin**: Termine im Kalender mit „Gehört zum Format“ (bei KEEP UP auch die Trainings). Der Browser
  wählt beim Öffnen den nächsten ab heute; ohne Termin steht „Termin folgt“ mit Link zum Newsletter.
- **Beendet** (z. B. TANZPAKT in residence): „Laufzeit“ statt „Seit“ und statt des Termins der **Rückblick**
  (Journal-Beitrag).

### Freisteller im Kopf

Im Kopf bricht ein freigestellter Körper aus dem Bild. Die Freisteller entstehen einmal aus den Fotos:

```bash
npm run formate:freisteller          # nur fehlende
npm run formate:freisteller -- --neu # alle neu (z. B. nach neuem Foto)
```

Das Skript (`scripts/formate-freisteller.mjs`) schneidet einen Ausschnitt aus dem Foto, macht den dunklen
Bühnenhintergrund durchsichtig und lässt nur große zusammenhängende Flächen (Körper) stehen. Für ein neues Format
dort den Ausschnitt eintragen. Gut geeignet sind Fotos mit dunklem Hintergrund. Ohne Freisteller zeigt der Kopf
das Foto im Keil-Rahmen.

## Archiv und Dateien der alten Website

Das Archiv verlinkt einige Dateien der alten Website (Pressespiegel LINIE 08, Plakate und PDFs des
Tanzkalenders). Damit sie nach dem Umzug erhalten bleiben, **vor dem Abschalten der alten Website** übernehmen:

```bash
npm run archiv:laden                              # aus dem Netz (tanznetzdresden.de muss erreichbar sein)
npm run archiv:laden -- --uploads <wp-content/uploads>  # oder aus einem entpackten Ordner vom Webhoster
```

Plakate landen als WebP in `src/assets/tanzkalender/<id>.webp` (Astro erzeugt daraus die Größen), PDFs in
`public/downloads/tanzkalender/` bzw. `public/downloads/archiv/`. Vorhandene Dateien bleiben. Solange eine Datei
fehlt, zeigt die Seite die Fassung der alten Website. Danach Build, Commit.

Alte Adressen (`/tanzkalender/`, `/studio-round/`, `/tanzpakt-in-residence/`, `/linie-8/` …) leiten auf die
Formate-Seite bzw. das Tanzkalender-Archiv weiter (`src/content/news/weiterleitungen.json`).

## Technik

- Seite: `src/views/FormateView.astro`, Daten `src/lib/formate.ts` (auch Netz, Archiv, Ausgaben), nächster Termin
  `src/lib/formate-termin.ts` (läuft auch im Browser), Bewegung und Filter `src/scripts/formate.ts`.
- Archiv-Seite: `src/views/TanzkalenderArchivView.astro`, Großansicht `src/scripts/tanzkalender-archiv.ts`.
- Bewegung: Die Formate wechseln alle 6,5 s; Pause mit „Anhalten“, bei Maus oder Fokus auf der Bühne, wenn der
  Kopf nicht zu sehen ist oder der Tab im Hintergrund liegt. Bei „Bewegung reduzieren“ kein Wechsel und keine
  Animationen. Ein vom Menschen gewählter Wechsel wird Screenreadern angesagt, der automatische nicht.
- Tests: `tests/formate.spec.ts`.
