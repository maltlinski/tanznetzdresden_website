# GitHub-Workflows (noch zu aktivieren)

Diese beiden Dateien gehören nach `.github/workflows/`. Der Bot, der die Website angelegt hat, darf dort aus
Sicherheitsgründen keine Dateien anlegen. Bitte einmalig selbst verschieben:

- **Im Browser:** auf GitHub *Add file → Create new file*, als Namen `.github/workflows/deploy.yml` eingeben,
  den Inhalt von `deploy.yml` hineinkopieren, speichern. Dasselbe für `ci.yml`.
- **Oder lokal:** `git mv docs/github-workflows/*.yml .github/workflows/ && git commit -m "Workflows aktivieren" && git push`

`deploy.yml` veröffentlicht die Website auf GitHub Pages (siehe `docs/deployment.md`), `ci.yml` prüft jede Änderung
mit Build und Tests.
