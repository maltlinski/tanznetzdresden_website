# Hinweise für KI-Assistenten und Entwickler:innen

Website des TanzNetzDresden e.V. – Astro 7, TypeScript (strict), statischer Build. Sprache der Inhalte und Kommentare: Deutsch.

- Lies zuerst `docs/entwicklung.md` (Konventionen, Designsystem-Regeln).
- Inhalte liegen in `src/content/` und `src/settings/`, nicht im Code. Schemas in `src/content.config.ts`.
- Links nur über `href()` aus `src/lib/url.ts` (Seite läuft auch unter einem Unterpfad).
- E-Mail-Adressen nur über `<ProtectedEmail>`. Externe Dienste nur mit Einwilligung (`src/settings/consent.ts`).
- Designsystem: liegt in `design/system/` (nicht von Hand ändern, sondern `npm run design:import`). Immer Tokens statt fester Farben/Werte; Abweichungen nur in `src/styles/overrides.css`. Radius 0, keine Schatten/Verläufe, Magenta nur als Akzent.
- Texte: Wir-Form, Doppelpunkt-Gendern (Tänzer:innen), keine Emojis.
- Vor dem Commit: `npm run build && npm test` (Playwright; lokal ggf. `PW_CHROMIUM=/pfad/zu/chrome`).
