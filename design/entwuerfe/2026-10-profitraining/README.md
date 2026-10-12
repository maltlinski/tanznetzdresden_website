# KEEP UP · Profitraining – Entwurf Oktober 2026

Aus Claude Design. Umgesetzt in `src/views/ProfitrainingView.astro` (`/profitraining/`, `/en/training/`) mit
`src/components/keep-up/Kalender.astro` und `src/components/keep-up/Stapel.astro`. Inhalte siehe `docs/inhalte.md`
(Abschnitt KEEP UP).

Umgesetzt wie im Entwurf: lila Kopf mit Foto und „Nächste Einheit“, Monatskalender mit Filter nach Dozent:in und
Tagesansicht, Dozent:innen als Kartenstapel (Variante „fächer“), Infos, Mitglieds-Band in Cyan,
Überschrift mit SplitText.

Abweichungen:
- Kopf- und Fußzeile der Website statt eigener KEEP-UP-Leiste; „Training“ im Menü führt auf die Seite.
- Trainingsplan aus Dateien (`src/content/keep-up/`), Workshops sind normale Termine mit `format: keep-up`
  und verlinken auf ihre Terminseite.
- Tage ohne Training sind im Kalender nicht anklickbar; beim Filtern werden fremde Tage gesperrt statt nur blass.
  Pfeiltasten wandern durch die Trainingstage, nur ein Tag ist per Tab erreichbar.
- „Heute“ als Rahmen (outline) statt Schatten.
- SplitText nur für die Hauptüberschrift; die übrigen Überschriften gleiten wie überall auf der Website ein.
- Infos zusätzlich mit Beitrag (aus `verein.json`); Karten zusätzlich mit Link zum Profil.
- Kartenstapel wird nicht durch Scrollen bewegt, sondern durchgeblättert (Pfeile, Punkte, Wischen, Pfeiltasten):
  die nächste Karte kommt von rechts, die vorigen rücken nach links.
- Ohne JavaScript: Liste der Trainingswochen statt Kalender, Karten untereinander. Bei „Bewegung reduzieren“
  wechseln die Karten ohne Animation.
- Platzhalter: Fotos der Dozent:innen (`src/settings/keep-up.ts`), Texte und Plan (`src/content/keep-up/`).
