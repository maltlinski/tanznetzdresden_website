# GitHub-Workflows (Vorlagen)

Die aktiven Workflows liegen in `.github/workflows/`. Der Bot, der an der Website mitarbeitet, darf dort aus
Sicherheitsgründen nichts ändern. Ändert sich ein Workflow, steht die neue Fassung hier und muss einmal von Hand
übernommen werden. Auf GitHub geht das so: die Datei in `.github/workflows/` öffnen, auf den Stift klicken,
den Inhalt von hier hineinkopieren und speichern.

**Offen (Oktober 2026):** In `deploy.yml` bei `repository_dispatch` den Typ `news-updated` ergänzen:

```yaml
  repository_dispatch:
    types: [profile-updated, news-updated]
```

Danach erscheinen News aus dem internen Bereich sofort statt erst nachts, sobald der Webhook eingerichtet ist
(docs/news.md).

`deploy.yml` veröffentlicht die Website auf GitHub Pages (siehe `docs/deployment.md`), `ci.yml` prüft jede Änderung
mit Build und Tests.
