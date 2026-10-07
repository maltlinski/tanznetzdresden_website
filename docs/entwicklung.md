# Weiterentwickeln

## Grundsätze

- **Inhalte gehören nicht in den Code.** Neue Inhaltstypen als Content Collection in `src/content.config.ts`
  anlegen (mit Schema) und im CMS (`public/admin/config.yml`) ergänzen.
- **Statisch zuerst.** Seiten werden beim Build erzeugt. JavaScript nur dort, wo Interaktion nötig ist (Astro-Skripte
  in der jeweiligen Komponente).
- **Links immer über `href()`** aus `src/lib/url.ts`, damit die Seite unter jeder Domain und jedem Unterpfad läuft.
- **Keine Drittanbieter ohne Einwilligung.** Neue externe Dienste in `src/settings/consent.ts` eintragen, über
  `ConsentEmbed` oder `<script type="text/plain" data-consent="…">` einbinden und in der Datenschutzerklärung
  beschreiben.
- **E-Mail-Adressen nie im Klartext** ausgeben, sondern mit `<ProtectedEmail email={…} />`.
- **Tests grün halten:** `npm run build && npm test`. Die CI prüft Funktion, „keine externen Anfragen ohne
  Einwilligung“ und Barrierefreiheit (WCAG 2.1 AA).

## Designsystem

Die Tokens kommen direkt aus `design/system/` (siehe [design/README.md](../design/README.md)). Neue Styles immer mit
Tokens (`var(--purple)`, `var(--space-4)` …) statt fester Werte schreiben, dann wirken Änderungen am Designsystem
überall. `npm run design:check` findet Tokens, die es nicht gibt. Die Hausregeln in Kurzform:

- Ecken immer eckig (Radius 0), keine Schatten, keine Verläufe.
- Magenta ist Akzent (Marker-Quadrate, Linien, zweite Headline-Zeile), nie Fläche.
- Lila = Anker (Headlines, dunkle Bänder), Cyan = Auftakt (Felder, Buttons).
- Work Sans 800 für Headlines, Open Sans für Text, JetBrains Mono in Versalien für Kicker.
- Der „Keil“ (diagonaler Schnitt) als Abschluss von Bändern und Fotos.
- Bewegung schnell und entschieden (`--ease-out`), kein Federn.

Bausteine: `Tag`, `Button`, `Badge`, `KeilBar`, `Logo` in `src/components/ui/`, `PageIntro` und `Prose` für
Unterseiten.

Bewusste Abweichungen stehen gesammelt in `src/styles/overrides.css` (derzeit nur `--ink-muted`, dunkler für
WCAG-Kontrast).

## Neue Seite anlegen

```astro
---
// src/pages/residenzen/index.astro  →  /residenzen/
import Page from '../../layouts/Page.astro';
import PageIntro from '../../components/PageIntro.astro';
---
<Page title="Residenzen" description="…">
  <PageIntro kicker="Residenzen" title="Raum für" accent="neue Arbeiten." />
  <section class="section"><div class="wrap">…</div></section>
</Page>
```

Danach ggf. in `nav` (`src/lib/url.ts`) und im Footer verlinken.

## Netz-Animation

`src/scripts/hero-net.ts`. Stellschrauben: `nodeCount` (Dichte, Standard 110), `interactive` (Cursor verknüpft
sich), die Foto-Positionen in `PHOTO_DEFS` (auf einer 1280×800-Bühne). Die Fotos müssen einen dunklen Bühnenhintergrund
haben, weil Schwarz ausgestanzt wird.

## Ideen für die nächsten Schritte

- Englische Version (Astro i18n-Routing, Inhalte unter `src/content/*/en/`).
- Einzelseiten je Format und Termin (`src/pages/formate/[id].astro`).
- Pressebereich mit Download-Paket.
- Öffentliche Mitgliederprofile aus Supabase (`public_profiles`).
- Statistik ohne Cookies (z. B. selbst gehostetes Matomo/Plausible) über die Kategorie „statistik“.
