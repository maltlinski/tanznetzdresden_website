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
- **Feste Texte (Überschriften, Knöpfe, Hinweise) in `src/settings/texte.json`**, gelesen mit `texte(lang, seite, abschnitt)`
  aus `src/lib/texte.ts`. Die Pressestelle ändert sie unter *Intern → Redaktion → Texte* ([texte.md](texte.md)).
  Alle öffentlichen Seiten sind umgezogen; Seiten mit `"nurVorstand": true` (Rechtliches) prüft auch die Funktion `inhalte`.
- **Texte immer zweisprachig**: in `texte.json` mit `de`/`en`; nur Beschriftungen für Screenreader und der interne
  Bereich bleiben mit `tr(lang, { de, en })` im Code, siehe [mehrsprachigkeit.md](mehrsprachigkeit.md).
- **Keine Drittanbieter ohne Einwilligung.** Neue externe Dienste in `src/settings/consent.ts` eintragen, über
  `ConsentEmbed` oder `<script type="text/plain" data-consent="…">` einbinden und in der Datenschutzerklärung
  beschreiben.
- **E-Mail-Adressen nie im Klartext** ausgeben, sondern mit `<ProtectedEmail email={…} />`.
- **Daten aus Supabase beim Build:** Lädt ein Lader nichts, ruft er `supabaseFehlt()` aus `src/lib/supabase-config.ts`
  auf. Lokal baut die Website dann mit Warnung ohne diese Daten weiter; auf GitHub (`CI`) bricht der Build ab, damit
  der letzte gute Stand online bleibt statt einer Website ohne Profile, News oder Termine. Neuer Lader → genauso.
- **Text in eigenem HTML** (Beiträge, Feed, Vorschau) immer mit `escapeHtml()` aus `src/lib/news-format.ts`.
- **Links aus Profilen** nur mit `webLink()` aus `src/lib/profil-ansicht.ts` (nur `http(s)`).
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
- **Datumsschrift:** jedes Datum, jede Uhrzeit, jede Terminangabe in der Schrift des Kalenders (siehe unten).
- **Köpfe:** Kicker und Headline stehen auf allen Seiten an derselben Stelle, der erste Textblock danach im
  gleichen Abstand (siehe unten).
- **Zeilenabstand:** Fließtext dunkel auf hell mit `--lh-text`, lange Lesetexte mit `--lh-lesetext`, nie feste
  Werte (siehe unten).
- Der „Keil“ (diagonaler Schnitt) als Abschluss von Bändern und Fotos.
- Bewegung schnell und entschieden (`--ease-out`), kein Federn.

Bausteine: `Tag`, `Button`, `Badge`, `KeilBar`, `Logo` in `src/components/ui/`, `PageIntro` und `Prose` für
Unterseiten.

Der lila Kopf jeder Unterseite ist so hoch wie der Kopf der Startseite: `--buehne-h` (Bildschirm minus
Kopfleiste, 560–940 px) in `src/styles/global.css`. `PageIntro` nutzt das von selbst; eigene Köpfe
(Kooperationen, News, Profitraining, Spenden, Profil, 404) setzen `min-height: var(--buehne-h)`. Rechtstexte
bekommen `<PageIntro kompakt>`, Beiträge und Termine behalten ihren kurzen Kopf. Im Test „Lila Kopf der
Unterseiten …“ (tests/site.spec.ts) wird die Höhe verglichen. Wo darin Kicker und Headline stehen, regelt die
Regel „Köpfe“.

### Köpfe (Regel)

Beim Wechsel zwischen den Menüpunkten steht alles an derselben Stelle – man findet sich schneller zurecht
(Design-Feedback vom 1. November 2026). Die Werte stehen als Tokens in `src/styles/global.css`:

| Token | Wert | Bedeutung |
|---|---|---|
| `--buehne-oben` | 28–72 px (6 vh) | Kopfleiste → erste Zeile des Kopfs (Kicker; auf der Startseite der Claim) |
| `--kopf-kicker` | 24 px | Kicker → Headline |
| `--nach-kopf` | 24–40 px (3 vw) | Unterkante des Kopfs → erster Textblock danach |
| `--kopf-unten` | 32 px | mindestens zwischen letzter Zeile im Kopf und dem Keil |

- Jeder lila Kopf trägt die Klasse **`kopf`**, der Kicker die Klasse **`kopf__kicker`** (macht ihn zum eigenen
  Block mit `--kopf-kicker` Abstand). Der Inhalt beginnt **oben**, nicht senkrecht mittig: kein
  `margin-block: auto`, `align-content: center` oder `justify-content: center` für den Textblock. Bilder,
  Kästen und Listen daneben dürfen anders stehen (z. B. „Als Nächstes“ im Kalender unten in der Zeile).
- Den Abstand zum ersten Abschnitt danach setzt `global.css` selbst (`main > .kopf + …`, mit `!important`):
  der Abschnitt darf oben keinen eigenen Abstand haben. Eine mitlaufende Leiste direkt am Kopf trägt
  `kopf-leiste` (Kalender) und rückt mit dem Außenabstand ab. Folgt ein dunkles Band (Über uns: Haltung), gilt
  derselbe Abstand bis zu dessen erstem Text.
- Ausnahme `data-kopf-frei`: Profilseiten (der Name steht unten am Porträt) – dort gelten nur erste Zeile und
  Abstand danach.
- Auftritt beim Aufrufen: überall gleich (`data-kopf-auftritt`, siehe [Auftritt der Köpfe](#auftritt-der-köpfe)).
- Geprüft in `tests/koepfe.spec.ts` auf allen Menüseiten und den Seiten der Sitemap (Deutsch, Englisch,
  Desktop, Handy): erste Zeile, Abstand Kicker → Headline, Headline auf allen Seiten auf gleicher Höhe, Abstand
  zum ersten Textblock und zum Keil. Neue Seite mit Kopf: Klassen setzen, Test laufen lassen.

### Zeilenabstand (Regel)

Fließtext – dunkle Schrift auf hellem Grund (Weiß, Tint, Cyan) – steht kompakt: besser lesbar und
platzsparend, vor allem auf dem Handy (Design-Feedback vom 1. November 2026).

| Token | Desktop | Handy (≤ 700 px) | für |
|---|---|---|---|
| `--lh-text` | 1,5 | 1,45 | Absätze, Anreißer, Beschreibungen, Listen, Bildunterschriften |
| `--lh-lesetext` | 1,6 | 1,55 | lange Lesetexte: Beitragstext (`.ab__text`), Rechtstexte (`.prose`), Termintext, Profil-Bio |

- Immer `line-height: var(--lh-text)` (bzw. `--lh-lesetext`), nie feste Werte wie `1.6`. Überschriften,
  Knöpfe, Kicker und Zahlen haben ihre eigenen, engeren Werte.
- Heller Text auf dunklem Grund (lila Köpfe und Bänder, Fuß) ist ausgenommen und behält etwas mehr Luft.
- Geprüft in `tests/zeilenabstand.spec.ts`: jeder mehrzeilige Absatz in Open Sans auf den Seiten der Sitemap
  und im aufgeklappten Kalendertermin, Desktop und Handy.

### Weitere Festlegungen aus dem Design-Feedback (1. November 2026)

- **Menü auf dem Handy:** Der Unterstrich des aktiven Punkts sitzt direkt unter der Schrift und ist so breit
  wie das Wort (`src/components/sections/Header.astro`, Test „Menü auf dem Handy: Unterstrich …“).
- **Kalender:** Ein geöffneter Termin hinterlegt den ganzen Tag bis zur Tageszahl; im Mini-Monat ist der
  angeklickte Tag dunkel, die übrigen Tage der Reihe hell ([kalender.md](kalender.md), Test „Geöffneter Termin …“
  in `tests/tanzkalender.spec.ts`).
- **Startseite:** Die drei Einstiege unten im Hero stehen mit Luft über dem Keil (`--kopf-unten`).
- **Laufende Streifen (Mosaik):** Für eine Endlosschleife so viele Kopien anlegen, dass der Streifen immer
  breiter ist als der Bildschirm, und Kopien nie `inert` machen – mit der Maus müssen sie funktionieren wie das
  Original (für Tastatur und Screenreader: `aria-hidden` und `tabindex="-1"`). Test „… auf breiten Bildschirmen
  ist das Mosaik voll …“ in `tests/site.spec.ts`.
- Übersicht aller Punkte und wo sie umgesetzt sind: [design-feedback-2026-11.md](design-feedback-2026-11.md).

### Datumsschrift (Regel)

Gleiche Information, gleiche Schrift: Datums-, Uhrzeit- und Terminangaben stehen überall – Website, interner
Bereich, Redaktion – in der Schrift des Kalenders, **JetBrains Mono** (Token `--font-datum`). So erfasst man
Termine schneller, und die Seiten sehen einheitlich aus. Der Schnitt darf dünner sein als im Kalender (Regular
im Text, 500–600 in Listen und Kästen), nie Open Sans oder Work Sans.

- Umsetzen: Klasse `datum` (oder `<time>`) setzen; beides bekommt die Schrift aus `src/styles/global.css`, Größe
  0,92 em, Schnitt und Farbe von der Umgebung. Eigene Größen in Komponenten mit `font-family: var(--font-datum)`.
  Frei eingegebene Werte (z. B. Eckdaten der Formate) prüft `istDatum()` aus `src/lib/datum-schrift.ts`.
- Ausnahmen, wie im Kalender selbst: **große Tageszahlen, Monats- und Jahresköpfe** („14“, „November 2026“,
  „2010“) bleiben Work Sans fett. Ein Datum **im Titel** (Beitrag, Ausgabe) oder **mitten im Satz** (Fließtext,
  Anreißer) behält die Schrift des Titels bzw. Satzes.
- Geprüft wird das in `tests/datum-schrift.spec.ts`: Der Test liest alle sichtbaren Datumsangaben der Seiten aus
  der Sitemap (je Bereich bis zu drei, Desktop und Handy) und des internen Bereichs und meldet jede, die nicht
  in JetBrains Mono steht. Die Muster und die Liste der Titel- und Fließtext-Stellen liegen in
  `src/lib/datum-schrift.ts`; eine neue Ausnahme dort nur mit Begründung eintragen.
- **Neue Entwürfe aus Claude Design:** Datumsangaben beim Umsetzen auf die Datumsschrift bringen, auch wenn der
  Entwurf eine andere Schrift zeigt, und die Abweichung in der README des Entwurfs notieren. Das gilt genauso
  für die Regeln „Köpfe“ und „Zeilenabstand“.

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
(`reveal.ts`) und der Text links im Netz-Abschnitt laufen ohne GSAP. Weitere Plugins (Flip, SplitText …)
direkt aus `gsap/…` importieren und dort registrieren, wo sie gebraucht werden.

### Auftritt der Köpfe

Jede Unterseite tritt beim Aufrufen gleich auf – nach dem Muster von Kalender und Formate:
`src/scripts/kopf-auftritt.ts`, Takt in `KOPF` (einmal festgelegt, überall gleich). Ausnahmen: die Startseite
(eigener Hero) und Profitraining/KEEP UP (eigene Bewegung).

| Zeit | Was | Markierung |
|---|---|---|
| 0 s | Kicker, Zurück-Link, Pfad, Datum gleiten von links herein | `.kopf__kicker`, `data-kopf-vor` |
| 0,15 s | Headline Wort für Wort von links (je 0,08 s) | `h1` im Kopf oder `data-kopf-titel`; schon geteilt: `data-kopf-wort` (Zahl = feste Stelle) |
| 0,25 s | Netz im Hintergrund zeichnet sich ein, Quadrate springen auf | `KopfNetz`, Kalender (`netzBewegen()` in `kopf-netz.ts`) |
| 0,45 s | Einleitung, Knöpfe, Kästen, Fotos nacheinander (je 0,1 s) | `data-kopf-folgt` |

Alles gleitet 60 px mit `EASE` in 1,1 s (bewusst ruhiger als die übrigen Bewegungen). Danach werden die Wörter wieder zusammengesetzt (Trennung und Umbruch
wie ohne Bewegung). Neuer Kopf: `data-kopf-auftritt` an den Kopf, die Teile markieren, `initKopfAuftritt()` im
Skript der Seite (`PageIntro` macht das selbst); eine zweite Spalte startet später mit `data-kopf-auftritt="0.12"`
(404). Eigene Bewegung einer Seite hängt sich an die zurückgegebene Zeitleiste von `kopfAuftritt()`. Die Vorschau
der Redaktion zeigt alles ohne Auftritt. Geprüft in `tests/koepfe.spec.ts`.

Wo GSAP läuft:

| Stelle | Datei | Was passiert |
|---|---|---|
| Köpfe aller Unterseiten (außer Profitraining) | `scripts/kopf-auftritt.ts` (SplitText) | Auftritt wie oben: Kicker, Headline Wort für Wort, Folgendes, Netz |
| Überschriften der Startseite | `scripts/split-text.ts` (SplitText) | `data-split`: Wörter gleiten nacheinander von links herein; „Eine Stadt. Ein Netz.“ steigt Wort für Wort aus einer Maske; „Tanz für …“ wechselt Buchstabe für Buchstabe |
| „Wer im Netz tanzt“ (Startseite) | `sections/Netz.astro` | Namen gleiten Reihe für Reihe von links herein, das magentafarbene Quadrat dahinter setzt kurz danach ein |
| Formate (Startseite) | `sections/Formats.astro` | Karten im Streifen laufen nacheinander ein; Pfeile blättern um eine Karte |
| Terminlisten (Startseite, Terminseite, Tanzkalender ohne JavaScript) | `EventList.astro` | Termine laufen gruppenweise beim Scrollen ein (`ScrollTrigger.batch`), das Datum steigt nach |
| Kategorie-Filter | `EventFilter.astro` | Liste gleitet in die neue Ordnung (Flip) |
| Kalender (Tanzkalender und Profitraining) | `Kalender.astro` | Tage laufen ein, Monatswechsel in Blätterrichtung, Filter-Markierungen animiert; in der Tagesansicht steigt das Datum aus einer Maske, Texte folgen, das Bild der KEEP UP-Beschreibung zoomt hinein |
| Intern → KEEP UP | `pages/intern/keep-up/` | Wochen und Karten laufen ein, Schublade zum Einplanen gleitet von rechts, Bild im Editor wischt auf, Balken beim Veröffentlichen |
| Profitraining: Dozent:innen | `keep-up/Mosaik.astro` | Foto-Mosaik, das endlos nach rechts läuft (GSAP, so viele Kopien wie der Bildschirm braucht, alle anklickbar); läuft auch unter der Maus weiter, hält nur über den Knopf „Anhalten“ oder bei Tastatur-Fokus; Klick filtert den Kalender, „Zur Dozent:in →“ holt die Kachel ins Bild; Tempo in `src/settings/keep-up.ts`; bei „Bewegung reduzieren“ ein Streifen zum Wischen |
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

**Netz im Kopf der Unterseiten:** Unterseiten ohne eigene Gestaltung (Über uns, Spenden, Kontakt, Mitglied werden,
Netzwerk, Textseiten wie Impressum und Datenschutz, 404) haben hinter dem lila Kopf ein Netz wie der Kalender:
`src/components/KopfNetz.astro` (steckt in `PageIntro`, Spenden und 404 binden es selbst ein), Form in
`src/lib/kopf-netz.ts`, Bewegung in `src/scripts/kopf-netz.ts` (Linien zeichnen sich ein, Quadrate springen auf,
Scrollen und Maus verschieben es; still bei „Bewegung reduzieren“). Jede Seite hat ihre eigene, verwandte Struktur
(Startwert aus der Route, `netz="…"` an `PageIntro`, Funktion `unterseitenNetz()`): ruhiger als im Kalender – Linien
kreuzen sich nie (jede Verzweigung ist ein Quadrat, nur verbundene Punkte haben eines), keine überlangen Linien, und
der Bereich von Kicker, Headline und Einleitung links bleibt frei (`FREI`); das Netz spannt sich rechts auf und ist
rechts verankert (`xMaxYMid slice`). Der Kalender nutzt dieselbe Datei mit seiner Grundform (`kopfNetz(KALENDER)`).
Neue einfache Unterseite → `PageIntro` mit `netz="<route>"`.

Der Abschnitt „Haltung & Wirkung“ steht auf „Über uns“ (`/verein/`) und liest seine Texte aus
`src/settings/haltung.json`, die Partnerliste aus `src/settings/verein.json` (`partners`).

## Ideen für die nächsten Schritte

- Einzelseiten für weitere Formate (wie `/profitraining/`: Route in `src/lib/i18n.ts`, `seite:` im Format). Termine haben schon eigene Seiten (`src/views/TerminView.astro`).
- Pressebereich mit Download-Paket.
- Ausschreibungen & Open Calls als eigene Sammlung mit Ablaufdatum.
- Statistik ohne Cookies (z. B. selbst gehostetes Matomo/Plausible) über die Kategorie „statistik“.
