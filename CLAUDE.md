# Hinweise für KI-Assistenten und Entwickler:innen

Website des TanzNetzDresden e.V. – Astro 7, TypeScript (strict), statischer Build. Sprache der Inhalte und Kommentare: Deutsch.

- Lies zuerst `docs/entwicklung.md` (Konventionen, Designsystem-Regeln).
- Inhalte liegen in `src/content/` und `src/settings/`, nicht im Code. Schemas in `src/content.config.ts`.
- Zweisprachig (de ohne Präfix, en unter /en/): Seiteninhalt in `src/views/`, Seiten in `src/pages/` + `src/pages/en/`. Texte mit `tr(lang, {de, en})`, Inhaltsfelder `*_en` mit `loc()`. Siehe `docs/mehrsprachigkeit.md`.
- Links zu Seiten nur über `url(lang, 'route')` aus `src/lib/i18n.ts`, zu Dateien über `href()` (Seite läuft auch unter einem Unterpfad).
- Profile: `src/lib/profiles.ts` führt `personen.yaml` und freigegebene Supabase-Profile zusammen (docs/profile.md).
- News: `src/lib/news.ts` führt `src/content/news/{de,en}/` und im internen Bereich veröffentlichte Beiträge zusammen (docs/news.md). Text immer über `renderMarkdown()` (sicher, Basis-Pfad).
- E-Mail-Adressen nur über `<ProtectedEmail>`. Externe Dienste nur mit Einwilligung (`src/settings/consent.ts`).
- Designsystem: liegt in `design/system/` (nicht von Hand ändern, sondern `npm run design:import`). Immer Tokens statt fester Farben/Werte; Abweichungen nur in `src/styles/overrides.css`. Radius 0, keine Schatten/Verläufe, Magenta nur als Akzent.
- Texte: Wir-Form, Doppelpunkt-Gendern (Tänzer:innen), keine Emojis.
- Vor dem Commit: `npm run build && npm test` (Playwright; lokal ggf. `PW_CHROMIUM=/pfad/zu/chrome`).
