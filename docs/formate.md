# Formate

Die Seite **Formate** (`/formate/`, englisch `/en/formats/`) zeigt, was der Verein macht: oben die Formate als
Netz (jeder Name führt zum Format), darunter jedes Format im Detail mit großem Foto und dem nächsten Termin, die
Chronik, das Archiv abgeschlossener Projekte und „Mitmachen“. Dazu gehört das **Tanzkalender-Archiv**
(`/formate/tanzkalender/`) mit allen Ausgaben des Monatsplakats 2024–2026. Entwurf:
`design/entwuerfe/2026-11-formate/formate-v2.dc.html` (die erste Fassung daneben).

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
- **Kurzbeschreibung** (Startseite; im Kopf der Formate-Seite, wenn die Maus über dem Namen steht) und
  **Beschreibung** (ausführlich, sonst die kurze).
- **Eckdaten**: Bezeichnung und Angabe, z. B. Ort, Partner, Projektleitung. „Seit“ steht immer zuerst.
- **Links**: Text und genau ein Ziel – ein Journal-Beitrag, eine Seite der Website, eine Datei (PDF) oder eine
  Adresse. Unter laufenden Formaten steht zusätzlich „Alle Termine →“.
- **Nächster Termin**: Termine im Kalender mit „Gehört zum Format“ (bei KEEP UP auch die Trainings). Der Browser
  wählt beim Öffnen den nächsten ab heute; ohne Termin steht „Termin folgt“ mit Link zum Newsletter.
- **Beendet** (z. B. TANZPAKT in residence): „Laufzeit“ statt „Seit“ und statt des Termins der **Rückblick**
  (Journal-Beitrag).

### Netz im Kopf

Jedes Format ist ein Knoten: magenta Quadrat, Name, Nummer und Rubrik. Linien verbinden die Knoten zu einem Netz
(kürzeste Verbindung aller Knoten, dazu einige Querlinien). Beim Öffnen verteilt der Browser die Namen zufällig –
ohne Überlappung, innerhalb der Bühne und ohne den Text oben links zu verdecken; „Netz neu knüpfen“ verteilt sie
neu. Knoten in der Nähe der Maus neigen sich ihr zu; steht die Maus (oder der Fokus) auf einem Namen, rückt er nach
außen, und unter der Überschrift steht die Kurzbeschreibung des Formats. Die Texte des Kastens (ohne gewähltes
Format) und des Knopfs stehen unter *Texte → Formate → Kopf*. Neue oder ausgeblendete Formate brauchen nichts
weiter: das Netz richtet sich nach den sichtbaren Formaten.

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

- Seite: `src/views/FormateView.astro`, Daten `src/lib/formate.ts` (auch Archiv, Ausgaben), Netz im Kopf
  `src/lib/formate-netz.ts` (Verteilen und Verbinden, läuft beim Build und im Browser), nächster Termin
  `src/lib/formate-termin.ts` (läuft auch im Browser), Bewegung und Filter `src/scripts/formate.ts`.
- Archiv-Seite: `src/views/TanzkalenderArchivView.astro`, Großansicht `src/scripts/tanzkalender-archiv.ts`.
- Bewegung: Überschrift und Text gleiten herein, die Linien zeichnen sich von links, die Namen folgen; die Fotos
  der Formate wischen herein und gleiten beim Scrollen langsamer als die Seite (Parallax). Bei „Bewegung
  reduzieren“ nichts davon: das Netz steht still, „Netz neu knüpfen“ verteilt ohne Übergang.
- Ohne JavaScript steht das Netz in fester Lage (wie im Entwurf, `startLage()`) unter dem Text, der Knopf fehlt.
- Tests: `tests/formate.spec.ts`.
