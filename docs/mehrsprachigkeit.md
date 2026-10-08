# Deutsch und Englisch

Deutsch ist die Hauptsprache (`/termine/`), Englisch liegt unter `/en/` mit englischen Adressen (`/en/events/`).
Oben rechts im Header wechselt `EN`/`DE` zur selben Seite in der anderen Sprache. Suchmaschinen bekommen die
Verknüpfung über `hreflang`.

## Was wird wo übersetzt?

| Was | Wo | Fehlt die Übersetzung … |
|---|---|---|
| Texte der Oberfläche (Buttons, Überschriften …) | direkt in der Komponente: `tr(lang, { de: {…}, en: {…} })` | erscheint Deutsch |
| Termine | `title_en`, `teaser_en`, `timeLabel_en` in der Termin-Datei | erscheint Deutsch |
| News | Datei `src/content/news/en/<name>.md` oder im Editor „Englische Fassung“ | erscheint Deutsch, beim Text mit Hinweis |
| Formate | `title_en`, `since_en`, `summary_en`, `alt_en` | erscheint Deutsch |
| Personen | `bio_en`, `vorstand_en` (oder selbst im internen Bereich) | erscheint Deutsch |
| Arbeitsgruppen | `text_en` in `src/settings/arbeitsgruppen.ts` | – |
| Vereinsdaten | Block `"en"` in `src/settings/verein.json` | erscheint Deutsch |
| Textseiten (Impressum, Datenschutz, Transparenz, Barrierefreiheit) | `src/content/seiten/en/<name>.md` | deutsche Seite mit Hinweis |
| Einwilligungs-Dialog | `label_en`, `description_en` in `src/settings/consent.ts` | – |

Bei Rechtstexten gilt die deutsche Fassung. Die englischen Seiten weisen darauf hin. Ändert sich die deutsche
Datenschutzerklärung, bitte die englische Fassung mitziehen.

**Nur auf Deutsch:** interner Bereich, Leichte Sprache, Kalender-Abo (`.ics`), Newsletter.

## Neue Seite in beiden Sprachen

1. Inhalt als View anlegen: `src/views/ResidenzenView.astro`. Texte mit `tr()`, Sprache mit `getLang(Astro)`.
2. Route in `src/lib/i18n.ts` → `routes` eintragen: `residenzen: { de: 'residenzen/', en: 'residencies/' }`.
3. Zwei Seiten, die den View einbinden:
   `src/pages/residenzen/index.astro` und `src/pages/en/residencies/index.astro`:

   ```astro
   ---
   import ResidenzenView from '../../views/ResidenzenView.astro';
   ---
   <ResidenzenView />
   ```
4. Im View `<Page route="residenzen" …>` setzen, dann funktionieren Umschalter und hreflang.
5. Links immer mit `url(lang, 'residenzen')`.

Weitere Sprache (z. B. Französisch): `locales` in `astro.config.mjs` und `src/lib/i18n.ts` ergänzen, `fr`-Blöcke
in `tr()` hinzufügen (TypeScript zeigt fehlende Stellen nicht an, weil sie auf Deutsch zurückfallen) und
`src/pages/fr/` anlegen.
