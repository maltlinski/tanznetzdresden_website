# Weiterentwickeln

## Grundsätze

- **Inhalte gehören nicht in den Code.** Neue Inhaltstypen als Content Collection in `src/content.config.ts`
  anlegen (mit Schema) und in der Redaktion (`src/scripts/intern/redaktion/bereiche.ts`, siehe
  [redaktion.md](redaktion.md#für-entwicklerinnen)) sowie im CMS (`public/admin/config.yml`) ergänzen. Texte, die
  die Redaktion ändern soll, gehören in JSON-Dateien unter `src/settings/` (wie `haltung.json`), nicht in `.ts`.
- **Statisch zuerst.** Seiten werden beim Build erzeugt. JavaScript nur dort, wo Interaktion nötig ist (Astro-Skripte
  in der jeweiligen Komponente).
- **Links zu Seiten immer über `url(lang, 'route')`** aus `src/lib/i18n.ts` (kennt beide Sprachen und den
  Unterpfad), zu Dateien über `href()` aus `src/lib/url.ts`.
- **Texte immer zweisprachig** mit `tr(lang, { de, en })`, siehe [mehrsprachigkeit.md](mehrsprachigkeit.md).
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

Der lila Kopf jeder Unterseite ist so hoch wie der Kopf der Startseite: `--buehne-h` (Bildschirm minus
Kopfleiste, 560–940 px) in `src/styles/global.css`, erste Zeile im Abstand `--buehne-oben`. `PageIntro` nutzt
das von selbst; eigene Köpfe (Kooperationen, News, Profitraining, Spenden, Profil, 404) setzen
`min-height: var(--buehne-h)`. Rechtstexte bekommen `<PageIntro kompakt>`, Beiträge und Termine behalten
ihren kurzen Kopf. Im Test „Lila Kopf der Unterseiten …“ (tests/site.spec.ts) wird die Höhe verglichen.

Bewusste Abweichungen stehen gesammelt in `src/styles/overrides.css` (derzeit nur `--ink-muted`, dunkler für
WCAG-Kontrast).

## Neue Seite anlegen

Siehe [mehrsprachigkeit.md](mehrsprachigkeit.md#neue-seite-in-beiden-sprachen): View in `src/views/`, Route in
`src/lib/i18n.ts`, je eine Seite unter `src/pages/` und `src/pages/en/`. Danach ggf. in Header (`nav` in
`src/components/sections/Header.astro`) und Footer verlinken.

## Scrollen

Weiches Scrollen mit [Lenis](https://github.com/darkroomengineering/lenis) (npm-Paket, wird mit der Website
ausgeliefert, kein externer Dienst): `src/scripts/smooth-scroll.ts`, eingebunden in `src/layouts/Base.astro`.
Mausrad und Trackpad gleiten nach, Touch bleibt nativ, Sprungmarken (`#termine`) gleiten unter den Header und nehmen
den Fokus mit. Bei „Bewegung reduzieren“ bleibt es beim normalen Scrollen. Stellschrauben: `LERP` und
`ANCHOR_DURATION`. Eigene Scroll-Bereiche scrollen weiter selbst; falls nicht, `data-lenis-prevent` ans Element.
Programmatisch scrollen: `getLenis()?.scrollTo(ziel)` statt `window.scrollTo`.

## Animationen mit GSAP

[GSAP](https://gsap.com) mit ScrollTrigger ist installiert (npm-Paket, kostenlos auch mit allen Plugins, kein
externer Dienst). Immer über `src/scripts/gsap.ts` importieren: dort ist ScrollTrigger registriert und mit Lenis
verbunden. Nur in den Komponenten importieren, die es brauchen, dann lädt GSAP nur auf diesen Seiten.

```ts
import { gsap, EASE, motionOk } from '../scripts/gsap';
if (motionOk()) {
  gsap.from('.formats .format', { x: -48, opacity: 0, stagger: 0.06, ease: EASE, scrollTrigger: { trigger: '.formats', start: 'top 80%' } });
}
```

Regeln: `EASE` (= `--ease-out`, schnell, kein Federn), nichts bei „Bewegung reduzieren“, Inhalte müssen ohne
JavaScript sichtbar bleiben (`gsap.from` statt Elemente per CSS zu verstecken). Die bestehenden Auftritte
(`intro-text.ts`, `reveal.ts`) und der Text links im Netz-Abschnitt laufen ohne GSAP. Weitere Plugins (Flip, SplitText …)
direkt aus `gsap/…` importieren und dort registrieren, wo sie gebraucht werden.

Wo GSAP läuft:

| Stelle | Datei | Was passiert |
|---|---|---|
| Überschriften der Startseite | `scripts/split-text.ts` (SplitText) | `data-split`: Wörter gleiten nacheinander von links herein; „Eine Stadt. Ein Netz.“ steigt Wort für Wort aus einer Maske; „Tanz für …“ wechselt Buchstabe für Buchstabe |
| „Wer im Netz tanzt“ (Startseite) | `sections/Netz.astro` | Namen gleiten Reihe für Reihe von links herein, das magentafarbene Quadrat dahinter setzt kurz danach ein |
| Formate (Startseite) | `sections/Formats.astro` | Karten im Streifen laufen nacheinander ein; Pfeile blättern um eine Karte |
| Terminlisten (Startseite, Terminseite, Tanzkalender ohne JavaScript) | `EventList.astro` | Termine laufen gruppenweise beim Scrollen ein (`ScrollTrigger.batch`), das Datum steigt nach |
| Kategorie-Filter | `EventFilter.astro` | Liste gleitet in die neue Ordnung (Flip) |
| Kalender (Tanzkalender und Profitraining) | `Kalender.astro` | Tage laufen ein, Monatswechsel in Blätterrichtung, Filter-Markierungen animiert; in der Tagesansicht steigt das Datum aus einer Maske, Texte folgen, das Bild der KEEP UP-Beschreibung zoomt hinein |
| Intern → KEEP UP | `pages/intern/keep-up/` | Wochen und Karten laufen ein, Schublade zum Einplanen gleitet von rechts, Bild im Editor wischt auf, Balken beim Veröffentlichen |
| Profitraining: Dozent:innen | `keep-up/Mosaik.astro` | Foto-Mosaik, das endlos nach rechts läuft (GSAP); läuft auch unter der Maus weiter, hält nur über den Knopf „Anhalten“ oder bei Tastatur-Fokus; Klick filtert den Kalender, „Zur Dozent:in →“ holt die Kachel ins Bild; Tempo in `src/settings/keep-up.ts`; bei „Bewegung reduzieren“ ein Streifen zum Wischen |
| Profitraining: Kopf | `views/ProfitrainingView.astro` | Überschrift mit SplitText (Buchstaben aus einer Maske), Foto als Keil |
| Menü im Kopf | `sections/Header.astro` (Web Animations, ohne GSAP) | Ein magentafarbener Strich unter dem aktiven Punkt gleitet beim Wechsel zum neuen Punkt, auch über den Seitenwechsel (Lage beim Klick in `sessionStorage`); im aufklappbaren Menü und bei „Bewegung reduzieren“ die einfache Unterstreichung |
| „Login“ → interner Bereich | `scripts/blende.ts` (Web Animations, ohne GSAP) | Blende aus Magenta und Lila wischt über die Website; im internen Bereich (`layouts/Intern.astro`) schrumpft sie auf die Seitenleiste, Logo und Schriftzug gleiten an ihren Platz; verbunden über `sessionStorage` |

## Netz-Animation

`src/scripts/hero-net.ts`, Einstellungen in `src/settings/hero.ts` (Wörter und Standzeit in `hero.json`): die drei Fotos (links hinten, Mitte vorn,
rechts hinten; auf dem Handy nur die ersten beiden), die Wörter für „Tanz für …“, Standzeit pro Wort, Knotendichte und
ob die Fotos beim Scrollen wegziehen (seit Entwurf v5 aus: „ruhig“). Die Fotos müssen einen dunklen Bühnenhintergrund
haben, weil Schwarz ausgestanzt wird. Das Netz sammelt sich um den nächsten Termin („Upcoming“).

Die Startseite (Entwurf v5, `src/views/HomeView.astro`): Hero mit drei Einstiegen, „Demnächst“ (Termine und News
nebeneinander, `sections/Demnaechst.astro`), Formate als Streifen, „Eine Stadt. Ein Netz.“ mit den Namen aus dem Netz
(`sections/Netz.astro`), Mitglied werden und Newsletter. Unter dem Kopf läuft ab dem Ende des Hero ein Fortschrittsbalken
(`<Page fortschritt>`).

Der Abschnitt „Haltung & Wirkung“ steht auf „Über uns“ (`/verein/`) und liest seine Texte aus
`src/settings/haltung.json`, die Partnerliste aus `src/settings/verein.json` (`partners`).

## Ideen für die nächsten Schritte

- Einzelseiten für weitere Formate (wie `/profitraining/`: Route in `src/lib/i18n.ts`, `seite:` im Format). Termine haben schon eigene Seiten (`src/views/TerminView.astro`).
- Pressebereich mit Download-Paket.
- Ausschreibungen & Open Calls als eigene Sammlung mit Ablaufdatum.
- Interner Bereich auf Englisch.
- Statistik ohne Cookies (z. B. selbst gehostetes Matomo/Plausible) über die Kategorie „statistik“.
