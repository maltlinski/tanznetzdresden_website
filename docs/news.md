# News („Aus dem Netz“)

Die News erscheinen an drei Stellen:

- **Startseite:** Abschnitt „Aus dem Netz“ mit dem Titelthema und daneben offenen Ausschreibungen und dem Neuesten.
- **`/news/`:** Übersicht mit Titelthema, offenen Fristen und der Chronik nach Monaten mit Filter. Englisch unter `/en/news/`.
- **`/news/<adresse>/`:** der einzelne Beitrag.

Dazu kommen RSS-Feeds unter `/news.xml` und `/en/news.xml`.

## Wer schreibt? Zwei Wege

### 1. Intern → „News schreiben“ (für Presse, Vorstand und Admin)

Der einfachste Weg. Man braucht keinen GitHub-Zugang und muss kein Markdown kennen.

1. Im internen Bereich anmelden und **News schreiben → Neuer Beitrag** öffnen. Auf großen Bildschirmen steht rechts
   die **Vorschau**: Sie zeigt den Beitrag beim Schreiben genau wie auf der Website (Computer oder Handy, Deutsch
   oder Englisch). Ein Klick in die Vorschau springt im Editor an die Stelle. „Vorschau daneben ausblenden“ merkt
   sich der Browser. Auf kleinen Bildschirmen öffnet der Knopf **Vorschau** sie groß.
2. **Art wählen** – oder schneller mit einer **Vorlage** starten (*Rückblick*, *Ausschreibung*, *Veranstaltung*).
   Die Vorlage legt Art, Kategorie, „Auf einen Blick“ und die Abschnitte an; graue Hinweise sagen, was hineingehört.

   | Art | zusätzlich | erscheint als |
   |---|---|---|
   | Meldung | – | Textzeile mit Pfeil |
   | Mit Foto | Titelfoto mit Ausschnitt, Fotograf:in | Bild links, Text rechts; im Beitrag groß oben |
   | Ausschreibung | Frist | Kasten mit Countdown („noch 38 Tage“), oben auf der News-Seite als „Offene Frist“ |
   | Stimme | Zitat, Name, Funktion | Zitatkarte in Cyan |

3. **Titel, Kurztext, Text.** Der Text besteht aus **Abschnitten**. „+ Abschnitt einfügen“ fügt einen neuen ein,
   verschieben geht durch **Ziehen am Griff ⠿** oder mit ↑ ↓.
   - **Text:** Die Knöpfe setzen Zwischenüberschrift (H2), Unterüberschrift (H3), Fett, Aufzählung, Zitat und Link.
     - **Link einfügen (↗):** Personen aus dem Netzwerk, Termine, News und Seiten der Website suchen und wählen –
       oder eine andere Website eintragen. Markierter Text wird zum Linktext.
     - **Zitat mit Namen:** Das Zitat in eine Zeile schreiben, darunter „— Name · Funktion“. Dann beide Zeilen
       markieren und den Zitat-Knopf drücken.
     - **Personenkarten** (z. B. Resident:innen, Vorstand): eine Aufzählung, deren Punkte mit einem fetten Namen beginnen.
   - **Bilder:** ein Foto oder eine Galerie. Mehrere Fotos auf einmal auswählen, in den Abschnitt ziehen oder
     **aus früheren Beiträgen wählen** (Mediathek, ohne erneutes Hochladen). Reihenfolge durch Ziehen.
     - Ein Foto anklicken öffnet die Details: **Drehen**, nach vorn/hinten, Entfernen, beim Zuschneiden der
       **Bildausschnitt** per Klick ins Foto. Die **Bildbeschreibung** ist eingeklappt und freiwillig, aber
       empfohlen (für Menschen, die das Foto nicht sehen können). „Fertig“ schließt die Details.
     - **Darstellung und Bildunterschrift** (eingeklappt, die Zeile zeigt den Stand): Format (Original, Quer 3 : 2,
       Hoch 3 : 4, Quadrat), Fotos pro Reihe (2–4, auf dem Handy höchstens zwei), Bildunterschrift, Foto(s) von;
       ein einzelnes Foto groß in Textbreite oder **neben dem Text**.
     - Das Raster im Editor sieht aus wie auf der Website. Dort öffnet ein Klick die Großansicht.
   - **Hinweiskasten:** abgesetzter Kasten, z. B. für den Förderhinweis am Ende.
   - **Bausteine:** wiederkehrende Texte wie Förderhinweise stehen unter „+ Abschnitt einfügen → Baustein“. Sie werden
     unter *Redaktion → News-Bausteine* gepflegt (`src/settings/news-bausteine.json`).
   - **Englisch** steht bei jedem Abschnitt zum Aufklappen.
4. **Auf einen Blick** (aufklappen, optional): kurze Fakten wie Wann, Wo, Eintritt. Sie stehen neben dem Text.
5. **Einordnung:** Kategorie, Datum, Autor:in. Mit dem Haken **Titelthema** steht der Beitrag groß oben.
   **Planen:** Ein Datum in der Zukunft veröffentlicht den Beitrag erst an diesem Tag (mit dem Update am frühen
   Morgen). In der Liste steht dann „Geplant“.
6. **Englische Fassung** (optional): Titel, Kurztext, Fakten. Die Texte der Abschnitte stehen bei den Abschnitten.
7. **Checkliste** über den Knöpfen: zeigt, was zum Veröffentlichen noch fehlt (Titel, Kurztext, je nach Art Titelfoto,
   Frist oder Zitat) und was empfohlen ist (Text, Bildbeschreibungen, Englisch). Ein Klick springt zum Feld.
8. **Speichern oder veröffentlichen.**
   - **Als Entwurf speichern:** Den Beitrag sieht nur die Redaktion.
   - **Veröffentlichen:** Die Website baut sich neu, nach 2–3 Minuten ist der Beitrag online. Das stößt die
     Supabase-Funktion `inhalte` der Redaktion an (docs/redaktion.md). Ist sie nicht eingerichtet, erscheint der
     Beitrag mit dem nächtlichen Update.
   - **Zurückziehen:** Der Beitrag wird wieder Entwurf und verschwindet genauso schnell von der Website.
   - **Vorschau-Link kopieren:** Link zum zuletzt gespeicherten Stand, z. B. zum Gegenlesen im Vorstand (nur für
     Presse, Vorstand und Admin).

**Nichts geht verloren:** Der Browser sichert Ungespeichertes alle paar Sekunden auf diesem Gerät („Auf diesem Gerät
gesichert · 14:32“). Wird die Seite geschlossen oder stürzt der Browser ab, bietet der Editor beim nächsten Öffnen
„Wiederherstellen“ an. Nach dem Speichern wird die Sicherung gelöscht.

**Fotos** werden im Browser automatisch verkleinert (höchstens 2400 px). Die Website lädt alle Fotos beim Bauen herunter
und erzeugt passende Größen, deshalb stellen Besucher:innen keine Verbindung zu Supabase her. Fotos, die beim
Bearbeiten hochgeladen, aber nicht verwendet wurden, löscht der Editor beim Speichern wieder. Beim Löschen eines
Beitrags bleiben Fotos erhalten, die ein anderer Beitrag noch verwendet.

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

Nach Veröffentlichen, Zurückziehen und Löschen stößt der Editor über die Funktion `inhalte` einen Neubau an
(`repository_dispatch` mit `profile-updated`, darauf reagiert `.github/workflows/deploy.yml`). Ein eigener
Supabase-Webhook ist dafür nicht mehr nötig.

## Datenbank

Migrationen `supabase/migrations/20261009000000_news.sql` und `20261015000000_news_bilder.sql` im SQL-Editor
ausführen. Die zweite erlaubt längere Texte (bis 100.000 Zeichen), speichert den Bildausschnitt des Titelfotos und
macht die Bildbeschreibung zum Titelfoto freiwillig.
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
| Abschnitte ↔ Markdown (Format der Bilder-Abschnitte) | `src/lib/news-bloecke.ts` |
| Fotos im Text beim Build optimieren | `bilderOptimieren()` in `src/lib/news.ts` |
| Stile des Beitrags (Seite und Vorschau) | `src/styles/artikel.css`, Großansicht `src/scripts/lightbox.ts` |
| Abschnitts-Editor, Fotos hochladen/drehen, Mediathek | `src/scripts/intern/news/abschnitte.ts`, `fotos.ts` |
| Vorschau daneben/groß, Sprung in den Editor | `src/scripts/intern/news/vorschau.ts` |
| Link einfügen, Vorlagen | `src/scripts/intern/news/links.ts`, `vorlagen.ts` |
| Bausteine | `src/settings/news-bausteine.json` |
| Stile des Editors | `src/styles/news-editor.css` |
| Vorschau | `src/pages/intern/news/vorschau/` |
| Startseiten-Abschnitt | `src/components/sections/News.astro` |
| Übersicht / Beitrag | `src/views/NewsView.astro`, `src/views/NewsArticleView.astro` |
| Editor | `src/pages/intern/news/bearbeiten/` |
| Countdown im Browser | `src/scripts/deadline.ts` |
| Auftritt der Überschriften | `src/scripts/intro-text.ts` (`data-sweep`, `data-rise`) |

Alle Farben, Schriften und Abstände kommen aus den Design-Tokens. Ein neuer Import des Designsystems wirkt also
auch hier.
