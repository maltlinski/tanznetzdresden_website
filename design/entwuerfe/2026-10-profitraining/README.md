# KEEP UP · Profitraining – Entwurf Oktober 2026

Aus Claude Design. Umgesetzt in `src/views/ProfitrainingView.astro` (`/profitraining/`, `/en/training/`) mit
`src/components/Kalender.astro` und `src/components/keep-up/Mosaik.astro`. Inhalte siehe `docs/inhalte.md`
(Abschnitt KEEP UP).

Umgesetzt wie im Entwurf: lila Kopf mit Foto und „Nächste Einheit“, Monatskalender mit Filter nach Dozent:in und
Tagesansicht, Dozent:innen als laufendes Foto-Mosaik (zweite Runde des Entwurfs, vorher Kartenstapel), Infos,
Mitglieds-Band in Cyan,
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
- Mosaik: zusätzlich ein Knopf „Anhalten“ und Pause, solange der Fokus darin liegt (WCAG 2.2.2: laufende Inhalte
  müssen sich stoppen lassen, Hover allein reicht auf dem Handy nicht). Reihenfolge wie in der Redaktion statt
  zufällig. Die Kurzbiografien zeigt das Mosaik wie im Entwurf nicht mehr; sie bleiben in der Redaktion gespeichert.
- „Zur Dozent:in →“ im Kalender holt die Kachel ins Bild und hebt sie drei Sekunden hervor.
- Ohne JavaScript: Liste der Trainingswochen statt Kalender. Ohne JavaScript oder bei „Bewegung reduzieren“ ist das
  Mosaik ein Streifen zum Wischen.
- Platzhalter: Fotos der Dozent:innen (`src/settings/keep-up.ts`), Texte und Plan (`src/content/keep-up/`).
