# News („Aus dem Netz“)

Die News erscheinen an drei Stellen:

- **Startseite:** „Aus dem Netz“ neben den Terminen: das Titelthema mit Foto, darunter offene Ausschreibungen und das Neueste.
- **`/news/`:** Übersicht mit Titelthema, offenen Fristen und der Chronik nach Monaten mit Filter. Englisch unter `/en/news/`.
- **`/news/<adresse>/`:** der einzelne Beitrag (Entwurf News v3, `design/entwuerfe/2026-10-news/`):
  - **Kopf** in fünf Varianten: *Vollbild* (Foto über die ganze Breite, Titel auf einem lila Band), *Hochkant*
    (Text links, hohes Foto rechts), *Split* (halb Text, halb Foto mit schräger Kante), *Typo* (großer Titel, Foto
    darunter). Ohne Titelbild zeigt der Kopf **das Netz** auf einer Farbfläche (Lila, Cyan oder Hell); ein
    Magenta-Knoten trägt die wichtigste Angabe, bei Ausschreibungen den Countdown zur Frist.
  - darunter eine Zeile mit Autor:in, Datum, „Link kopieren“ und „E-Mail“, die **Eckdaten** als Infokasten (bei
    Ausschreibungen zuerst der Countdown), dann der Text in einer Spalte. Fotos gibt es in drei Breiten (Textbreite,
    weit mit Keil-Ecke, randlos), als Galerie, **Bildpaar**, **Bildstrecke** (lila Band zum seitlichen Blättern) und
    **Bild & Text** (das Bild bleibt stehen, die Texte laufen daneben vorbei).
  - Jedes Foto hat eine Nummer („Abb. 03“). Am Ende stehen die **Bildnachweise**, darunter „Mehr aus dem Netz“.
  - Ein Klick auf ein Foto öffnet die **Großansicht** mit allen Fotos des Beitrags (Pfeile, Pfeiltasten, Wischen,
    Vorschaubilder).

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
  Eckdaten und die Blöcke an. Graue Hinweise sagen, was hineingehört.
- **Rubrik** als Knöpfe. Bei *Ausschreibung* erscheint die **Bewerbungsfrist** (Countdown auf der Website), bei
  *Stimme* das **Zitat für die Übersicht** (Zitatkarte). Steht schon etwas darin, bleibt das Feld sichtbar, damit es
  sich leeren lässt.
- **Titel** und **Teaser** (Zähler bis 220 Zeichen, mehr geht, ist aber nicht empfohlen).
- **Titelbild:** hineinziehen, **Aus Mediathek** oder **Vom Computer**. Ein Klick ins Bild setzt den
  **Fokuspunkt**. Darunter steht, wie das Foto in der Übersicht (4 : 3), auf der Startseite (16 : 9) und im Artikel
  (21 : 9) zugeschnitten wird. Dazu kommen die Bildbeschreibung (freiwillig, empfohlen) und der Fotonachweis.
- **Kopfbereich:** Mit Titelbild zeigen kleine Skizzen die Varianten *Automatisch*, *Vollbild*, *Hochkant*, *Split*
  und *Typo* („Automatisch“: Querformat wird Vollbild, Hochkant-Fotos bekommen den Hochkant-Kopf; daneben steht, was
  der Beitrag gerade zeigt). Ohne Titelbild: Farbfläche des Netzes (Lila, Cyan, Hell) und die Angabe am Knoten
  (kleine Zeile und Angabe, z. B. „Ausgabe“ · „#6 · 26. November“). Bei Ausschreibungen zeigt der Knoten die Frist.
- **Eckdaten:** Zeilen wie „Wann · Do · 26. November 2026 · 20:00 Uhr“, mit „+ Eckdatum“ dazu. Sie stehen als
  Infokasten oben im Beitrag.
- **Inhalt** aus Blöcken: **Absatz**, **Zwischentitel**, **Zitat** (mit „Name · Rolle“), **Bild**, **Bildpaar**,
  **Bildstrecke**, **Bild & Text** und **Hinweiskasten**, dazu die **Bausteine** (z. B. Förderhinweise, gepflegt unter *Website-Inhalte →
  News-Bausteine*, `src/settings/news-bausteine.json`).
  - „Block hinzufügen“ steht unten. „+ Hier einfügen“ zwischen zwei Blöcken fügt an dieser Stelle ein.
  - Verschieben geht durch **Ziehen am Griff ⠿** oder mit ↑ ↓.
  - **Absatz:** Die Knöpfe setzen Fett, Kursiv, Aufzählung, kleine Überschrift (H3) und **Link einfügen (↗)**:
    Personen, Termine, News und Seiten der Website suchen oder eine andere Website eintragen.
  - **Personenkarten** (z. B. Resident:innen, Vorstand): eine Aufzählung, deren Punkte mit einem fetten Namen beginnen.
  - **Bild:** Ein leerer Bild-Block nimmt Fotos per Ziehen, aus der **Mediathek** oder per **Hochladen**.
    - Ein Foto zeigt Fokuspunkt, Bildbeschreibung, Bildunterschrift und Fotonachweis direkt. Darunter die
      **Breite**: Textbreite, Weit (etwas breiter als der Text, mit Keil-Ecke), Randlos (ganze Seitenbreite) oder
      Neben dem Text.
    - **„+ Weitere Fotos“** macht daraus eine **Galerie**. In der Galerie öffnet ein Klick auf ein Foto dessen
      Angaben (Fokus, Beschreibung, Drehen, Reihenfolge, Entfernen), „Fertig“ schließt sie. Reihenfolge auch durch
      Ziehen.
    - **Darstellung** (eingeklappt): Format (Original, Quer 3 : 2, Hoch 3 : 4, Quadrat) und Fotos pro Reihe (2–4,
      auf dem Handy höchstens zwei).
  - **Bildpaar:** genau zwei Fotos, auf der Website gleich hoch (auch Hoch- neben Querformat). Jedes Foto hat
    Bildbeschreibung und eine eigene Unterschrift; Reihenfolge durch Ziehen, × entfernt.
  - **Bildstrecke:** Titel und 3 bis 12 Fotos, jedes mit eigener Unterschrift. Auf der Website ein lila Band über die
    ganze Breite zum seitlichen Blättern, „Vollbild“ öffnet die Großansicht.
  - **Bild & Text:** Titel und 2 bis 6 Schritte, jeder mit Bild, kurzem Titel, zwei, drei Sätzen und
    Bildbeschreibung. Auf der Website bleibt das Bild stehen und wechselt, während die Texte daneben vorbeilaufen.
  - **Englisch** steht bei jedem Block zum Aufklappen.
- **Englische Fassung** (auch die Angabe am Knoten) und **Weitere Angaben** (Text von, Datum, Titelthema,
  Adresse, Vorschau-Link, Löschen) sind eingeklappt.
- **Live-Vorschau** rechts (ab etwa 1180 px Breite): zeigt den Beitrag beim Schreiben genau wie auf der Website,
  Desktop oder Mobil, Deutsch oder Englisch. Ein Klick in die Vorschau springt zum Block, beim Schreiben scrollt sie
  mit und markiert die Stelle. Auf kleinen Bildschirmen öffnet „Vorschau“ sie groß.

**Speichern:** Entwürfe speichert der Editor selbst, sobald ein Titel da ist („Gespeichert · 14:32“). Änderungen an
Beiträgen, die schon online sind, gehen erst mit **Aktualisieren → Änderungen veröffentlichen** raus. Bis dahin
sichert der Browser sie auf dem Gerät. Schließt sich die Seite oder stürzt der Browser ab, bietet der Editor beim
nächsten Öffnen „Wiederherstellen“ an.

**Veröffentlichen** öffnet ein Seitenpanel:

- **Checkliste:** *Pflicht* sind Titel, Teaser, bei Ausschreibungen die Frist und keine Emoji. *Empfohlen* sind ein
  Teaser bis 220 Zeichen, Titelbild, Bildbeschreibungen, Fotonachweise, keine leeren oder unvollständigen Blöcke
  (Bildpaar mit zwei Fotos, Bildstrecke ab drei, Bild & Text mit Bild und Text in jedem Schritt) und die englische
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
hero: auto                     # Kopf mit Foto: auto · vollbild · hochkant · split · typo
heroTheme: purple              # ohne Foto: Fläche des Netzes · purple · cyan · tint
nodeKicker: Ausgabe            # ohne Foto: Angabe am Knoten (kleine Zeile …
nodeValue: '#6 · 26. November' #  … und Angabe); bei Ausschreibungen die Frist
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
breite: weit          # nur ein Foto: text · weit · randlos
text: Bildunterschrift
foto: Name Fotograf:in
bilder:
  - datei: ../../../assets/photos/foto.jpg
    alt: Was auf dem Foto zu sehen ist
    fokus: 50% 30%    # optional: Bildausschnitt beim Zuschneiden
:::

::: bilder
darstellung: strecke  # paar (genau 2 Fotos) · strecke (Bildstrecke, 3–12) · neben (ein Foto neben dem Text)
titel: Der Tag in Bildern
bilder:
  - datei: ../../../assets/photos/foto.jpg
    alt: Was zu sehen ist
    text: Unterschrift nur für dieses Foto
:::

::: schritte          # Bild & Text
titel: Ein Tag in der Stadt
schritte:
  - datei: ../../../assets/photos/foto.jpg
    alt: Was zu sehen ist
    titel: Raus aus dem Studio
    text: Zwei, drei Sätze zu diesem Bild.
:::

::: hinweis
Förderhinweis oder anderer abgesetzter Text.
:::
```

Die englische Datei braucht nur, was übersetzt ist: `title`, `teaser`, `alt`, `facts`, `quote`, `nodeKicker`,
`nodeValue` und den Text.
Alles andere kommt aus der deutschen Datei.

**Beide Wege gleichzeitig:** Die Website führt Dateien und Beiträge aus dem internen Bereich zusammen und sortiert
nach Datum. Hat ein Beitrag aus dem internen Bereich dieselbe Adresse wie eine Datei, gewinnt die Datei, und das
Build-Log warnt.

## Zweisprachig

Englisch ist überall freiwillig. Fehlt ein englisches Feld, steht auf der englischen Seite das deutsche. Fehlt der
englische Haupttext, steht über dem deutschen Text der Hinweis „This post is only available in German so far.“

## Alte Beiträge aus WordPress

Die Beiträge der alten Website (2021–2026) sind als Dateien übernommen: `src/content/news/de/` (englische Fassungen
in `en/`). Sie lassen sich wie alle Datei-Beiträge im CMS oder direkt bearbeiten. Der Bericht
[wordpress-import.md](wordpress-import.md) listet jeden Beitrag mit Rubrik, Frist, englischer Fassung und Hinweisen
(fehlende Bilder, entfernte Links); er ist zum Durchsehen gedacht.

**So wurde übernommen** (`scripts/wordpress-import/`, einmalige Migration, kann beliebig oft wiederholt werden):

- **Text:** Absätze, Zwischentitel, Listen, Zitate, Fett/Kursiv und Links wie im Original. Reste des alten
  Seitenbaukastens und Shortcodes fallen weg. Video-Adressen (YouTube, Vimeo) werden Links „Video auf … ansehen ↗“,
  eingebettet würde der Dienst ohne Einwilligung laden.
- **Förderhinweis** am Ende (nach der letzten Trennlinie, „Gefördert durch …“) wird ein Hinweiskasten.
- **Auf einen Blick:** Stehen am Stück beschriftete Zeilen wie „**Datum:** …“, „**Ort:** …“, „**Eintritt:** …“
  im Text, wandern sie in den Kasten neben dem Text.
- **Teaser:** Auszug aus WordPress, sonst der erste Absatz (gekürzt auf etwa 220 Zeichen).
- **Rubrik** am Titel erkannt: Ausschreibung (Open Call, Bewerbung, Deadline …), Training (KEEP UP, Workshop …),
  Verein (Vorstand, Jubiläum …), Rückblick, Stimme (Interview, Zitat als Titel), sonst Netzwerk.
  **Frist** bei Ausschreibungen aus dem Titel oder der Zeile „Deadline/Frist“.
- **Englisch:** Beiträge mit dem Schlagwort „english“, die auf Englisch geschrieben sind und ein deutsches
  Gegenstück (höchstens vier Tage auseinander, ähnlicher Titel oder gleiches Titelbild) haben, sind dessen englische
  Fassung. Gemischte Beiträge (deutsch und englisch in einem) bleiben, wie sie sind.
- **Bilder:** Titelbild nach `src/assets/news/<jahr>/` (Astro erzeugt die Größen), Bilder im Text und Galerien
  fertig verkleinert nach `public/news/archiv/<jahr>/` (1600 px und 800 px, Maße in
  `src/content/news/archiv-bilder.json`), damit der Build nicht hunderte Fotos umrechnet. Bildbeschreibung und
  Bildunterschrift aus der Mediathek der alten Website, „Foto: …“ wird Fotonachweis. Das Titelbild steht nicht noch
  einmal im Text.
- **PDFs** aus dem Text nach `public/news/archiv/dateien/`.
- **E-Mail-Adressen** im Text werden beim Build geschützt wie `<ProtectedEmail>` (`src/lib/news-email.ts`), das gilt
  für alle News.
- **Links** auf andere Beiträge zeigen auf deren neue Adresse, Links auf alte Seiten auf die passende neue Seite
  (Tabelle `SEITEN` im Skript), unbekannte alte Seiten werden zu Text.
- **Alte Adressen** (`tanznetzdresden.de/<beitrag>/`) leiten auf den Beitrag weiter: `src/pages/[...alt].astro` mit
  der Liste `src/content/news/weiterleitungen.json`. Die Seiten haben `noindex` und stehen nicht in der Sitemap.
- E-Mail-Adressen der WordPress-Konten werden nicht übernommen. Autor:in ist „TanzNetzDresden“ (Konto „Presse“) oder
  der Anzeigename.

**Noch einmal übernehmen** (z. B. mit einem neueren Export): ersetzt **alle** Datei-Beiträge und Archivbilder.

```bash
node scripts/wordpress-import/index.mjs export.xml --medien medien.csv
```

`export.xml` aus *Werkzeuge → Daten exportieren → Beiträge*, `medien.csv` (freiwillig) aus dem Medien-Export mit
Alternativtexten. Geladen wird von der alten Website, die dafür noch erreichbar sein muss. Alternativ den Ordner
`wp-content/uploads` (z. B. vom Webhoster als ZIP) entpacken und mit `--uploads <ordner>` angeben; fehlt dort ein
Original, nimmt das Skript `-scaled` oder die größte vorhandene Fassung. Ist ein Original nicht zu laden (z. B. als
BMP hochgeladen, nur die verkleinerten JPGs gibt es), nimmt es die Fassung aus dem Text oder die „Große URL“ der
Medienliste. SVG-Logos werden nicht übernommen. Originale landen in
`.cache/wordpress/` (nicht im Repository) und werden nur einmal geladen. Mit `--ohne-laden` nur aus diesem
Zwischenspeicher.

## Sofort online statt nachts

Nach Veröffentlichen, Offline nehmen und Löschen stößt der Editor über die Funktion `inhalte` einen Neubau an
(`repository_dispatch` mit `profile-updated`, darauf reagiert `.github/workflows/deploy.yml`). Ein eigener
Supabase-Webhook ist dafür nicht mehr nötig.

## Datenbank

Migrationen `supabase/migrations/20261009000000_news.sql`, `20261015000000_news_bilder.sql`,
`20261016000000_mediathek.sql` und `20261029000000_news_kopf.sql` im SQL-Editor ausführen.

- Die zweite erlaubt längere Texte (bis 100.000 Zeichen), speichert den Bildausschnitt des Titelfotos und macht die
  Bildbeschreibung zum Titelfoto freiwillig.
- Die dritte legt die Mediathek an (Tabelle `news_medien`, öffentlich lesbar, schreiben nur die Redaktion; Leserecht
  der Redaktion auf den Bucket, damit die Mediathek alle Fotos auflisten kann) und die Spalte `newsletter`. Ohne sie
  funktioniert der Editor weiter, nur Mediathek-Angaben und Newsletter-Vormerkung lassen sich nicht speichern.
- Die vierte speichert den **Kopfbereich** (`hero`, `hero_theme`) und die Angabe am Knoten (`node_kicker`,
  `node_value`, auch `_en`) und gibt sie in `public_news` mit aus. Ohne sie zeigt der Editor die Wahl trotzdem; wer
  etwas anderes als „Automatisch“, Lila und keinen Knoten wählt, bekommt beim Speichern den Hinweis auf die Migration.
  Bildpaar, Bildstrecke und Bild & Text stehen im Text und brauchen keine neuen Spalten.

Die erste legt an:

- die Rolle `presse`,
- die Tabelle `news_posts` (Lesen und Schreiben nur für die Redaktion),
- die öffentliche Ansicht `public_news` (nur veröffentlichte Beiträge),
- den Bucket `newsbilder` (öffentlich lesbar, Schreiben nur für die Redaktion).

## Für Entwickler:innen

| Was | Wo |
|---|---|
| Zusammenführen, Datumsformate, Fristen | `src/lib/news.ts` |
| Markdown sicher in HTML (ohne eigenes HTML, nur sichere Links), Bilder-, Schritte- und Hinweis-Abschnitte, Bildnummern | `src/lib/markdown.ts` |
| Blöcke ↔ Markdown (Zwischentitel `##`, Zitat `>`, Bilder-, Schritte- und Hinweis-Abschnitte), Mediathek-Angaben beim Build | `src/lib/news-bloecke.ts` |
| Fotos im Text beim Build optimieren | `bilderOptimieren()` in `src/lib/news.ts` |
| Gerüst des Beitrags (Kopf-Varianten, Zeile, Eckdaten, Bildnachweise) für Seite und Vorschau | `src/lib/news-artikel.ts` |
| Netz-Kopf, Bildstrecke, Bild & Text, Aufwischen der Fotos, Link kopieren | `src/scripts/news-artikel.ts` |
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
| E-Mail-Adressen im Text schützen | `src/lib/news-email.ts` |
| Import der alten Website, Weiterleitungen | `scripts/wordpress-import/`, `src/pages/[...alt].astro` |
| Übersicht / Beitrag | `src/views/NewsView.astro`, `src/views/NewsArticleView.astro` |
| Editor | `src/pages/intern/news/bearbeiten/` |
| Countdown im Browser | `src/scripts/deadline.ts` |
| Auftritt der Überschriften | `src/scripts/intro-text.ts` (`data-sweep`, `data-rise`) |

Alle Farben, Schriften und Abstände kommen aus den Design-Tokens. Ein neuer Import des Designsystems wirkt also
auch hier.
