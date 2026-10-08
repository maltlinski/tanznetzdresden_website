# Kooperationspartner – Entwurf Oktober 2026

Aus Claude Design. Umgesetzt in `src/views/KooperationenView.astro` und `src/scripts/partner-net.ts`.
Die Datei ist eine Referenz und läuft hier nicht eigenständig.

Abweichungen bei der Umsetzung:
- Leaflet ist lokal installiert statt von unpkg geladen.
- Die OpenStreetMap-Kacheln laden erst nach Einwilligung („Externe Medien“). Ohne Einwilligung sind Netz,
  Orte und Beschriftungen auf Lila sichtbar, die Stadtkarte fehlt.
- Orte, Verbindungen und Partnergruppen stehen in `src/content/kooperation/` (auch im CMS) statt im Code.
- Kontakt-Button nutzt die geschützte E-Mail (Bot-Schutz), Header/Footer sind die der Website.
