# News („Aus dem Netz“)

Die News erscheinen an drei Stellen:

- **Startseite:** „Aus dem Netz“ neben den Terminen: das Titelthema mit Foto, darunter offene Ausschreibungen und das Neueste.
- **`/news/`:** Übersicht mit Titelthema, offenen Fristen und der Chronik nach Monaten mit Filter. Englisch unter `/en/news/`.
- **`/news/<adresse>/`:** der einzelne Beitrag.

Dazu kommen RSS-Feeds unter `/news.xml` und `/en/news.xml`.

## Wer schreibt? Zwei Wege

### 1. Intern → Redaktion (für Presse, Vorstand und Admin)

Der einfachste Weg. Man braucht keinen GitHub-Zugang und muss kein Markdown kennen. Die Redaktion hat eine eigene
Oberfläche mit lila Seitenleiste: **Beiträge**, **Medien**, **Website-Inhalte** und **Freigaben**
(`src/layouts/Redaktion.astro`).

**Beiträge** (`/intern/news/`) listet alle Beiträge aus dem internen Bereich mit Vorschaubild, Rubrik, Status
(Entwurf, Geplant, Online), Datum und Autor:in. Oben gibt es Suche und Filter. Ein Hinweis zeigt Beiträge, bei denen
eine Bildbeschreibung fehlt oder die für den Newsletter vorgemerkt sind.

**Der Editor** (`/intern/news/bearbeiten/`):

- **Kopfleiste:** „← Beiträge“, Status, Speicherstand, „Vorschau an/aus“ und **Veröffentlichen** (bei Beiträgen,
  die schon online sind: **Aktualisieren**).
- **Vorlage** (nur bei neuen Beiträgen): *Rückblick*, *Ausschreibung* oder *Veranstaltung* legen Rubrik,
  „Auf einen Blick“ und die Blöcke an. Graue Hinweise sagen, was hineingehört.
- **Rubrik** als Knöpfe. Bei *Ausschreibung* erscheint die **Bewerbungsfrist** (Countdown auf der Website), bei
  *Stimme* das **Zitat für die Übersicht** (Zitatkarte). Steht schon etwas darin, bleibt das Feld sichtbar, damit es
  sich leeren lässt.
- **Titel** und **Teaser** (Zähler bis 220 Zeichen, mehr geht, ist aber nicht empfohlen).
- **Titelbild:** hineinziehen, **Aus Mediathek** oder **Vom Computer**. Ein Klick ins Bild setzt den
  **Fokuspunkt**. Darunter steht, wie das Foto in der Übersicht (4 : 3), auf der Startseite (16 : 9) und im Artikel
  (21 : 9) zugeschnitten wird. Dazu kommen die Bildbeschreibung (freiwillig, empfohlen) und der Fotonachweis.
- **Inhalt** aus Blöcken: **Absatz**, **Zwischentitel**, **Zitat** (mit „Name · Rolle“), **Bild** und
  **Hinweiskasten**, dazu die **Bausteine** (z. B. Förderhinweise, gepflegt unter *Website-Inhalte →
  News-Bausteine*, `src/settings/news-bausteine.json`).
  - „Block hinzufügen“ steht unten. „+ Hier einfügen“ zwischen zwei Blöcken fügt an dieser Stelle ein.
  - Verschieben geht durch **Ziehen am Griff ⠿** oder mit ↑ ↓.
  - **Absatz:** Die Knöpfe setzen Fett, Kursiv, Aufzählung, kleine Überschrift (H3) und **Link einfügen (↗)**:
    Personen, Termine, News und Seiten der Website suchen oder eine andere Website eintragen.
  - **Personenkarten** (z. B. Resident:innen, Vorstand): eine Aufzählung, deren Punkte mit einem fetten Namen beginnen.
  - **Bild:** Ein leerer Bild-Block nimmt Fotos per Ziehen, aus der **Mediathek** oder per **Hochladen**.
    - Ein Foto zeigt Fokuspunkt, Bildbeschreibung, Bildunterschrift und Fotonachweis direkt.
    - **„+ Weitere Fotos“** macht daraus eine **Galerie**. In der Galerie öffnet ein Klick auf ein Foto dessen
      Angaben (Fokus, Beschreibung, Drehen, Reihenfolge, Entfernen), „Fertig“ schließt sie. Reihenfolge auch durch
      Ziehen.
    - **Darstellung** (eingeklappt): Format (Original, Quer 3 : 2, Hoch 3 : 4, Quadrat), Fotos pro Reihe (2–4, auf
      dem Handy höchstens zwei), ein einzelnes Foto groß oder **neben dem Text**.
  - **Englisch** steht bei jedem Block zum Aufklappen.
- **Auf einen Blick**, **Englische Fassung** und **Weitere Angaben** (Text von, Datum, Titelthema, Adresse,
  Vorschau-Link, Löschen) sind eingeklappt.
- **Live-Vorschau** rechts (ab etwa 1180 px Breite): zeigt den Beitrag beim Schreiben genau wie auf der Website,
  Desktop oder Mobil, Deutsch oder Englisch. Ein Klick in die Vorschau springt zum Block, beim Schreiben scrollt sie
  mit und markiert die Stelle. Auf kleinen Bildschirmen öffnet „Vorschau“ sie groß.

**Speichern:** Entwürfe speichert der Editor selbst, sobald ein Titel da ist („Gespeichert · 14:32“). Änderungen an
Beiträgen, die schon online sind, gehen erst mit **Aktualisieren → Änderungen veröffentlichen** raus. Bis dahin
sichert der Browser sie auf dem Gerät. Schließt sich die Seite oder stürzt der Browser ab, bietet der Editor beim
nächsten Öffnen „Wiederherstellen“ an.

**Veröffentlichen** öffnet ein Seitenpanel:

- **Checkliste:** *Pflicht* sind Titel, Teaser, bei Ausschreibungen die Frist und keine Emoji. *Empfohlen* sind ein
  Teaser bis 220 Zeichen, Titelbild, Bildbeschreibungen, Fotonachweise, keine leeren Blöcke und die englische
  Fassung. „Beheben“ springt zum Feld. Solange Pflichtpunkte fehlen, bleibt der Knopf gesperrt.
- **Zeitpunkt:** *Sofort* oder *Planen*. Geplante Beiträge erscheinen am gewählten Tag morgens mit dem automatischen
  Update, nicht zu einer bestimmten Uhrzeit. In der Liste steht dann „Geplant“. Beim ersten Veröffentlichen
  bekommt der Beitrag das heutige Datum, danach bleibt sein Datum.
- **Ausspielen:** Website (immer), **für den nächsten Newsletter vormerken** (Markierung in der Liste) und
  **Instagram-Story als Bild herunterladen** (1080 × 1920 mit Titelbild, Rubrik und Titel; entsteht im Browser).
- **So erscheint er in der Chronik:** Vorschau der Karte in der Übersicht.
- **Offline nehmen** macht einen veröffentlichten Beitrag wieder zum Entwurf.

Nach Veröffentlichen, Offline nehmen und Löschen baut sich die Website neu und ist nach 2–3 Minuten aktuell. Das
stößt die Supabase-Funktion `inhalte` an (docs/redaktion.md). Ist sie nicht eingerichtet, gilt das nächtliche Update.

**Medien** (`/intern/news/medien/`): alle Fotos für News an einem Ort. Mehrere Fotos auf einmal hineinziehen,
Bildbeschreibung (deutsch und englisch), Fotonachweis und Fokuspunkt pflegen. Daneben steht, **in welchen Beiträgen**
das Foto steht. Diese Angaben **gelten überall, wo das Foto verwendet wird**:

- Die Website übernimmt sie beim Build (`medienAnwenden()` in `src/lib/news-bloecke.ts`).
- Der Editor zeigt sie an und schreibt Änderungen beim Speichern zurück.
- Ändert sich ein Foto, das in einem veröffentlichten Beitrag steht, baut sich die Website neu.

Fotos, die in keinem Beitrag stehen, lassen sich dort löschen. Beim Löschen eines Beitrags bleiben seine Fotos in
der Mediathek.

**Fotos** werden im Browser automatisch verkleinert (höchstens 2400 px). Die Website lädt alle Fotos beim Bauen
herunter und erzeugt passende Größen, deshalb stellen Besucher:innen keine Verbindung zu Supabase her.

**Rolle „Presse“ vergeben:** Der Vorstand wählt unter *Intern → Mitglieder* bei der Person die Rolle
**Presse**. Presse darf News schreiben, sonst nichts Zusätzliches. Admin vergeben nur Admins.

### 2. Als Datei im Repository (CMS oder direkt)

Für Admins und Entwickler:innen. Beiträge liegen in `src/content/news/de/<adresse>.md`, die englische Fassung
mit gleichem Namen in `src/content/news/en/`. Im CMS (`/admin`) stehen sie unter **News**, beide Sprachen
nebeneinander.

```markdown
---
title: 'Open Call: POP UP Frühjahr 2027'
date: 2026-10-06
category: Ausschreibung        # Netzwerk · Ausschreibung · Training · Verein · Rückblick · Stimme
author: AG POP UP
deadline: 2026-11-15           # optional → Ausschreibung
image: ../../../assets/photos/foto.jpg   # optional → Foto-Beitrag
alt: Was auf dem Foto zu sehen ist
featured: false                # Titelthema
quote: { text: '…', who: Name, role: Funktion }   # optional → Stimme
teaser: Ein bis zwei Sätze.
facts:
  - { label: Frist, value: 15. November 2026 }
---

Text in Markdown. Links zu Seiten der Website mit /kontakt/ (der Unterpfad wird automatisch ergänzt).

## Zwischentitel

> Ein Zitat.
>
> — Name · Funktion

::: bilder
format: quer          # original · quer · hoch · quadrat
spalten: 2            # 2–4, bei mehreren Fotos
text: Bildunterschrift
foto: Name Fotograf:in
bilder:
  - datei: ../../../assets/photos/foto.jpg
    alt: Was auf dem Foto zu sehen ist
    fokus: 50% 30%    # optional: Bildausschnitt beim Zuschneiden
:::

::: hinweis
Förderhinweis oder anderer abgesetzter Text.
:::
```

Ein Beispiel steht in `src/content/news/de/keep-up-herbst.md`.

Die englische Datei braucht nur, was übersetzt ist: `title`, `teaser`, `alt`, `facts`, `quote` und den Text.
Alles andere kommt aus der deutschen Datei.

**Beide Wege gleichzeitig:** Die Website führt Dateien und Beiträge aus dem internen Bereich zusammen und sortiert
nach Datum. Hat ein Beitrag aus dem internen Bereich dieselbe Adresse wie eine Datei, gewinnt die Datei, und das
Build-Log warnt.

## Zweisprachig

Englisch ist überall freiwillig. Fehlt ein englisches Feld, steht auf der englischen Seite das deutsche. Fehlt der
englische Haupttext, steht über dem deutschen Text der Hinweis „This post is only available in German so far.“

## Sofort online statt nachts

Nach Veröffentlichen, Offline nehmen und Löschen stößt der Editor über die Funktion `inhalte` einen Neubau an
(`repository_dispatch` mit `profile-updated`, darauf reagiert `.github/workflows/deploy.yml`). Ein eigener
Supabase-Webhook ist dafür nicht mehr nötig.

## Datenbank

Migrationen `supabase/migrations/20261009000000_news.sql`, `20261015000000_news_bilder.sql` und
`20261016000000_mediathek.sql` im SQL-Editor ausführen.

- Die zweite erlaubt längere Texte (bis 100.000 Zeichen), speichert den Bildausschnitt des Titelfotos und macht die
  Bildbeschreibung zum Titelfoto freiwillig.
- Die dritte legt die Mediathek an (Tabelle `news_medien`, öffentlich lesbar, schreiben nur die Redaktion; Leserecht
  der Redaktion auf den Bucket, damit die Mediathek alle Fotos auflisten kann) und die Spalte `newsletter`. Ohne sie
  funktioniert der Editor weiter, nur Mediathek-Angaben und Newsletter-Vormerkung lassen sich nicht speichern.

Die erste legt an:

- die Rolle `presse`,
- die Tabelle `news_posts` (Lesen und Schreiben nur für die Redaktion),
- die öffentliche Ansicht `public_news` (nur veröffentlichte Beiträge),
- den Bucket `newsbilder` (öffentlich lesbar, Schreiben nur für die Redaktion).

## Für Entwickler:innen

| Was | Wo |
|---|---|
| Zusammenführen, Datumsformate, Fristen | `src/lib/news.ts` |
| Markdown sicher in HTML (ohne eigenes HTML, nur sichere Links), Bilder- und Hinweis-Abschnitte | `src/lib/markdown.ts` |
| Blöcke ↔ Markdown (Zwischentitel `##`, Zitat `>`, Bilder- und Hinweis-Abschnitte), Mediathek-Angaben beim Build | `src/lib/news-bloecke.ts` |
| Fotos im Text beim Build optimieren | `bilderOptimieren()` in `src/lib/news.ts` |
| Stile des Beitrags (Seite und Vorschau) | `src/styles/artikel.css`, Großansicht `src/scripts/lightbox.ts` |
| Rahmen der Redaktion (Seitenleiste) | `src/layouts/Redaktion.astro` |
| Block-Editor, Fotos hochladen/drehen | `src/scripts/intern/news/abschnitte.ts`, `fotos.ts` |
| Mediathek (laden, speichern, „Bild wählen“, Fokus, Zuschnitte) | `src/scripts/intern/news/medien.ts`, Seite `src/pages/intern/news/medien/` |
| Instagram-Story als Bild | `src/scripts/intern/news/story.ts` |
| Live-Vorschau daneben/groß, Sprung in den Editor | `src/scripts/intern/news/vorschau.ts` |
| Link einfügen, Vorlagen | `src/scripts/intern/news/links.ts`, `vorlagen.ts` |
| Bausteine | `src/settings/news-bausteine.json` |
| Stile des Editors und der Mediathek | `src/styles/news-editor.css`, `src/styles/mediathek.css` |
| Vorschau | `src/pages/intern/news/vorschau/` |
| Startseiten-Abschnitt | `src/components/sections/Demnaechst.astro` |
| Übersicht / Beitrag | `src/views/NewsView.astro`, `src/views/NewsArticleView.astro` |
| Editor | `src/pages/intern/news/bearbeiten/` |
| Countdown im Browser | `src/scripts/deadline.ts` |
| Auftritt der Überschriften | `src/scripts/intro-text.ts` (`data-sweep`, `data-rise`) |

Alle Farben, Schriften und Abstände kommen aus den Design-Tokens. Ein neuer Import des Designsystems wirkt also
auch hier.
