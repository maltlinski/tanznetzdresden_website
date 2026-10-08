# Design

Hier liegt das Design der Website. Die Website liest es **direkt** von hier – eine Änderung in diesem Ordner
ändert die Website mit.

```
design/
  system/       Das TNDD-Designsystem aus Claude Design (Quelle der Wahrheit)
    tokens/     Farben, Schriften, Abstände, Formen, Bewegung  → wirken auf die ganze Website
    assets/     Schriften (Open Sans) und Logos
    readme.md   Regeln des Designsystems (Farben, Typo, Keil, Tonalität)
  entwuerfe/    Seiten-Entwürfe aus Claude Design als Referenz (werden von Hand umgesetzt)
```

## Was ändert sich automatisch?

| Änderung im Designsystem | Wirkung auf der Website |
|---|---|
| Farben (`tokens/colors.css`) | überall: Flächen, Texte, Buttons, Netz-Animation, Favicon, Browser-Farbe |
| Schriftgrößen, Familien, Laufweiten (`tokens/typography.css`) | überall, wo die Tokens benutzt werden |
| Abstände, Keil-Form, Bewegung (`tokens/spacing.css`) | überall, wo die Tokens benutzt werden |
| Open-Sans-Dateien, Logo | sofort |
| **Neue** Schriftfamilie | `npm run design:check` meldet es – Schrift muss einmal in `src/styles/fonts.css` eingebunden werden (wir laden nichts von Google) |
| Aussehen einzelner Komponenten (Button, Tag …) oder neue Seitenentwürfe | nicht automatisch: Die Website hat eigene Astro-Bausteine. Entwurf in `entwuerfe/` ablegen und umsetzen lassen. |

## Neues Designsystem aus Claude Design übernehmen

1. In Claude Design das Designsystem ändern und das Projekt exportieren (Handoff an Claude Code oder ZIP).
2. Export entpacken und importieren:

   ```bash
   npm run design:import -- ../pfad/zum/export
   ```

   Das Skript findet den Designsystem-Ordner im Export, ersetzt `design/system/`, holt die Logos aus dem
   Komponenten-Bundle und prüft alles.
3. `npm run dev` ansehen, dann committen. Nach dem Push geht die Website automatisch neu online.

Kleine Änderungen (z. B. eine Farbe) kannst du auch direkt in `design/system/tokens/*.css` machen – dann bitte
dieselbe Änderung in Claude Design nachziehen, sonst überschreibt der nächste Import sie.

## Die Sicherheitsprüfung

`npm run design:check` läuft vor jedem Build. Sie bricht ab, wenn

- die Website ein Token benutzt, das es im Designsystem nicht (mehr) gibt – z. B. nach einer Umbenennung,
- eine Token-Datei fehlt.

So geht keine halb kaputte Website online. Sie zeigt außerdem an:

- **bewusste Abweichungen** der Website (`src/styles/overrides.css`). Derzeit nur `--ink-muted`: Das Grau ist
  dunkler, damit kleiner Text gut lesbar ist (WCAG AA). Am besten im Designsystem auf `#6B6484` ändern,
  dann kann die Abweichung weg.
- Schriften, die die Website noch nicht selbst hostet.

Die automatischen Tests (`npm test`) prüfen zusätzlich die Kontraste. Wird eine neue Farbe zu blass, fällt das dort auf.

## Seitenentwürfe

`entwuerfe/` ist die Ablage für Seiten- und Abschnittsentwürfe aus Claude Design, z. B.
`entwuerfe/2027-02-residenzen/`. Sie dienen als Vorlage für die Umsetzung in `src/` und werden nicht direkt
ausgeliefert. `2026-10-startseite/` ist der Entwurf der aktuellen Startseite (Runde 4), `2026-10-news/` der News-Seiten,
`2026-10-kooperationen/` der Kooperationsseite.
