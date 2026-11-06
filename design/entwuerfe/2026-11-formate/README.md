# Formate – Entwurf November 2026 (mit Tanzkalender-Archiv)

Aus Claude Design. `formate-v2.dc.html` ist die aktuelle Formate-Seite (siehe „Fassung 2“ unten), `formate.dc.html`
die erste Fassung, `tanzkalender-archiv.dc.html` die Unterseite mit allen
Ausgaben des Tanzkalenders. Umgesetzt in `src/views/FormateView.astro` (Bewegung `src/scripts/formate.ts`) und
`src/views/TanzkalenderArchivView.astro` (`src/scripts/tanzkalender-archiv.ts`). Inhalte und Pflege: `docs/formate.md`.

Umgesetzt wie im Entwurf:
- Kopf als Bühne: Netz (verwackeltes Raster, zeichnet sich, folgt der Maus), „Acht Formate. Ein Netz.“, große
  Nummer, Rubrik und Beginn, Titel, Kurztext, „Format entdecken ↓“ mit nächstem Termin. Die Formate laufen
  durch (6,5 s, Fortschritt in der Leiste mit acht Reitern), Ziffern und Wörter gleiten hinaus und herein, der
  freigestellte Körper öffnet sich mit einer Keil-Kante. Pause bei Maus über der Bühne, außer Sicht oder im
  Hintergrund-Tab.
- Formate im Detail: Filter „Ich möchte“ (Tanz sehen, Trainieren, Mitreden, Draußen tanzen) mit Zahlen, Leiste
  „Im Detail“ mit wachsendem Magenta-Strich, Fotos abwechselnd links/rechts im Keil-Rahmen mit Wischer, Badge der
  Rubrik, Eckdaten, Kasten „Nächster Termin“, Links, „Alle 8 Formate zeigen →“.
- Chronik „Seit 2010 in Bewegung.“ (Quadrat wächst beim Darüberfahren), Archiv „Abgeschlossene Projekte.“ zum
  Aufklappen (+/−), Mitmachen mit Ausschreibung und Arbeitsgruppen.
- Tanzkalender-Archiv: Kopf mit Pfad, drei Plakaten (wischen herein), Jahrgang-Filter mit Zahlen, Jahr klebt
  links, Doppelausgabe doppelt breit, Großansicht mit Nummer, Monat, „PDF laden“, Pfeilen, Pfeiltasten und Esc.

Abweichungen:
- Freisteller: Der Entwurf stellt die Körper im Browser frei (Canvas). Hier entstehen sie einmal mit
  `npm run formate:freisteller` (gleiches Verfahren, gleiche Ausschnitte) als WebP in
  `src/assets/formate/freisteller/` – schneller und ohne Rechenarbeit auf dem Handy. Ein neues Format ohne
  Freisteller zeigt im Kopf sein Foto im Keil-Rahmen.
- Nächster Termin kommt aus dem Kalender (Termine mit „Gehört zum Format“, bei KEEP UP auch die Trainings) und
  wird beim Öffnen neu gewählt. Ohne Termin: „Termin folgt“ mit Link zum Newsletter. Beendete Formate (TANZPAKT)
  zeigen „Programm abgeschlossen“ und den Rückblick aus dem Journal.
- Knopf „Anhalten / Weiter“ neben den Reitern (Barrierefreiheit: automatisch wechselnde Inhalte müssen sich
  anhalten lassen). Pfeiltasten wechseln die Reiter. Bei „Bewegung reduzieren“ kein automatischer Wechsel.
- Mitmachen: Statt der festen Ausschreibung die nächste noch offene aus dem Journal (Beitrag mit Frist); gibt es
  keine, ein Hinweis aufs Journal. AGs aus Redaktion → Arbeitsgruppen.
- Links zur alten Website: Seiten, die es nicht mehr gibt („Programme 2011–2018“, „Alle Projekte“ von ChanceTanz),
  entfallen; TANZPAKT und WORKING COMMUNITIES verlinken die übernommenen Journal-Beiträge. Pressespiegel und
  Tanzkalender-Plakate/PDFs übernimmt `npm run archiv:laden`; bis dahin zeigen die Links auf die alte Website.
- Archiv als `<details>` (funktioniert ohne JavaScript). Kopf und Fuß der Website wie auf allen Seiten.
- Tanzkalender: Im Entwurf waren November und Dezember 2024 mit demselben PDF verlinkt und Februar 2025 mit
  einem eigenen Bild – hier stehen die Dateien laut Medienliste der alten Website.
- Plakate im Kopf des Archivs und die Plakatbilder in der Liste öffnen die Großansicht mit der Maus; mit der
  Tastatur und für Screenreader führt „Ansehen“ dorthin (keine doppelten Tab-Stopps).

## Fassung 2 (`formate-v2.dc.html`)

Umgesetzt wie im Entwurf:
- Kopf als Netz: „Acht Formate. Ein Netz.“ groß, darunter ein Kasten (ohne gewähltes Format „Menschen · Orte ·
  Partner“, mit der Maus über einem Namen Nummer, Rubrik, Beginn und Kurzbeschreibung) und „Netz neu knüpfen“.
  Die Formate als Knoten (Quadrat, Name, Nummer · Rubrik), zufällig verteilt ohne Überlappung und ohne den Text zu
  verdecken, verbunden durch das kürzeste Netz und einige Querlinien. Knoten neigen sich der Maus zu, der gewählte
  rückt nach außen (Quadrat cyan und größer, Name cyan). Linien zeichnen sich, Namen gleiten herein.
- Formate im Detail ohne Leiste: Foto über die ganze Breite (21:9, schmal 4:3) mit Keil-Ecke, Wischer und Parallax,
  darunter links Nummer, Rubrik, Name und Beschreibung, rechts Eckdaten, „Nächster Termin“ und Links.
- Chronik, Archiv und Mitmachen unverändert.

Abweichungen:
- Ohne JavaScript steht das Netz in der festen Lage aus dem Entwurf unter dem Text (bei anderen Formaten
  gleichmäßig verteilt); der Knopf erscheint erst mit JavaScript.
- Namen werden mit ihrer echten Breite gemessen statt geschätzt; findet sich kein Platz, gilt die feste Lage. Beim
  Ändern der Fensterbreite wird neu geknüpft. Die Maus zieht nur bei Maus/Touchpad, nicht auf Touch-Geräten.
- Die beschrifteten Kanten im Entwurf (z. B. „Villa Wigman“) sind dort nicht sichtbar und entfallen.
- Die Freisteller der ersten Fassung (und `npm run formate:freisteller`) werden nicht mehr gebraucht und sind
  entfernt.
