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
(`intro-text.ts`, `reveal.ts`) und die Netz-Animationen laufen ohne GSAP. Weitere Plugins (Flip, SplitText …)
direkt aus `gsap/…` importieren und dort registrieren, wo sie gebraucht werden.

Wo GSAP läuft:

| Stelle | Datei | Was passiert |
|---|---|---|
| Formate (Startseite) | `sections/Formats.astro` | Zeilen laufen nacheinander ein, Bildrahmen öffnet sich als Keil, Foto mit leichter Parallaxe, neues Foto wischt über das alte, Beschreibung klappt auf |
| Terminlisten (Startseite, Tanzkalender, Terminseite) | `EventList.astro` | Termine laufen gruppenweise beim Scrollen ein (`ScrollTrigger.batch`), das Datum steigt nach |
| Kategorie-Filter | `EventFilter.astro` | Liste gleitet in die neue Ordnung (Flip) |
| Profitraining: Kalender | `keep-up/Kalender.astro` | Tage laufen ein, Monatswechsel in Blätterrichtung, Tagesansicht und Filter-Markierungen animiert |
| Profitraining: Dozent:innen | `keep-up/Stapel.astro` | Kartenstapel zum Durchblättern (Pfeile, Punkte, Wischen, Pfeiltasten – nicht durch Scrollen): die nächste Karte kommt von rechts, die vorigen rücken nach links; Bewegung „stapel“/„fächer“ in `src/settings/keep-up.ts` |
| Profitraining: Kopf | `views/ProfitrainingView.astro` | Überschrift mit SplitText (Buchstaben aus einer Maske), Foto als Keil |

## Netz-Animation

`src/scripts/hero-net.ts`, Einstellungen in `src/settings/hero.ts` (Wörter und Standzeit in `hero.json`): die drei Fotos (links hinten, Mitte vorn,
rechts hinten; auf dem Handy nur die ersten beiden), die Wörter für „Tanz für …“, Standzeit pro Wort, Knotendichte und
ob die Fotos beim Scrollen wegziehen. Die Fotos müssen einen dunklen Bühnenhintergrund haben, weil Schwarz ausgestanzt
wird. Das Netz sammelt sich um den nächsten Termin („Upcoming“).

Der Abschnitt „Haltung & Wirkung“ liest seine Texte aus `src/settings/haltung.json`, die Partnerliste aus
`src/settings/verein.json` (`partners`).

## Ideen für die nächsten Schritte

- Einzelseiten für weitere Formate (wie `/profitraining/`: Route in `src/lib/i18n.ts`, `seite:` im Format). Termine haben schon eigene Seiten (`src/views/TerminView.astro`).
- Pressebereich mit Download-Paket.
- Ausschreibungen & Open Calls als eigene Sammlung mit Ablaufdatum.
- Interner Bereich auf Englisch.
- Statistik ohne Cookies (z. B. selbst gehostetes Matomo/Plausible) über die Kategorie „statistik“.
