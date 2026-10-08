# News („Aus dem Netz“)

Die News erscheinen an drei Stellen:

- **Startseite:** Abschnitt „Aus dem Netz“ mit dem Titelthema und daneben offenen Ausschreibungen und dem Neuesten.
- **`/news/`:** Übersicht mit Titelthema, offenen Fristen und der Chronik nach Monaten mit Filter. Englisch unter `/en/news/`.
- **`/news/<adresse>/`:** der einzelne Beitrag.

Dazu kommen RSS-Feeds unter `/news.xml` und `/en/news.xml`.

## Wer schreibt? Zwei Wege

### 1. Intern → „News schreiben“ (für Presse, Vorstand und Admin)

Der einfachste Weg. Man braucht keinen GitHub-Zugang und muss kein Markdown kennen.

1. Im internen Bereich anmelden und **News schreiben → Neuer Beitrag** öffnen.
2. **Art wählen.** Daraus ergibt sich, welche Felder kommen und wie der Beitrag in der Übersicht aussieht:

   | Art | zusätzlich | erscheint als |
   |---|---|---|
   | Meldung | – | Textzeile mit Pfeil |
   | Mit Foto | Foto, Bildbeschreibung, Fotograf:in | Bild links, Text rechts |
   | Ausschreibung | Frist | Kasten mit Countdown („noch 38 Tage“), oben auf der News-Seite als „Offene Frist“ |
   | Stimme | Zitat, Name, Funktion | Zitatkarte in Cyan |

3. **Titel, Kurztext, Text.** Die Knöpfe über dem Textfeld setzen Zwischenüberschrift, Fett, Aufzählung, Zitat
   und Link. „Vorschau“ zeigt, wie es aussieht.
   - **Zitat mit Namen:** Das Zitat in eine Zeile schreiben, darunter „— Name · Funktion“. Dann beide Zeilen
     markieren und den Zitat-Knopf drücken.
   - **Personenkarten** (z. B. für den Vorstand): eine Aufzählung, deren Punkte mit einem fetten Namen beginnen.
4. **Auf einen Blick** (optional): kurze Fakten wie Wann, Wo, Eintritt. Sie stehen neben dem Text.
5. **Einordnung:** Kategorie, Datum, Autor:in. Mit dem Haken **Titelthema** steht der Beitrag groß oben.
6. **Englische Fassung** (optional): Alles kann auch später nachgetragen werden.
7. **Speichern oder veröffentlichen.**
   - **Als Entwurf speichern:** Den Beitrag sieht nur die Redaktion.
   - **Veröffentlichen:** Die Website baut sich neu. Mit Webhook (siehe unten) ist der Beitrag nach 1–2 Minuten
     online, sonst nach dem nächtlichen Update.
   - **Zurückziehen:** Der Beitrag wird wieder Entwurf und verschwindet beim nächsten Update.

**Fotos** werden im Browser automatisch verkleinert. Ohne Bildbeschreibung kann ein Foto nicht veröffentlicht
werden, weil sie für Barrierefreiheit Pflicht ist. Die Website lädt die Fotos beim Bauen herunter, deshalb
stellen Besucher:innen keine Verbindung zu Supabase her.

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
image: ../../../assets/photos/foto.jpg   # optional → Foto-Beitrag (dann alt Pflicht)
alt: Was auf dem Foto zu sehen ist
featured: false                # Titelthema
quote: { text: '…', who: Name, role: Funktion }   # optional → Stimme
teaser: Ein bis zwei Sätze.
facts:
  - { label: Frist, value: 15. November 2026 }
---

Text in Markdown. Links zu Seiten der Website mit /kontakt/ (der Unterpfad wird automatisch ergänzt).
```

Die englische Datei braucht nur, was übersetzt ist: `title`, `teaser`, `alt`, `facts`, `quote` und den Text.
Alles andere kommt aus der deutschen Datei.

**Beide Wege gleichzeitig:** Die Website führt Dateien und Beiträge aus dem internen Bereich zusammen und sortiert
nach Datum. Hat ein Beitrag aus dem internen Bereich dieselbe Adresse wie eine Datei, gewinnt die Datei, und das
Build-Log warnt.

## Zweisprachig

Englisch ist überall freiwillig. Fehlt ein englisches Feld, steht auf der englischen Seite das deutsche. Fehlt der
englische Haupttext, steht über dem deutschen Text der Hinweis „This post is only available in German so far.“

## Sofort online statt nachts: Webhook

Wie bei den Profilen (docs/profile.md), nur für die Tabelle `news_posts`:
*Supabase → Database → Webhooks → Create*, Tabelle `news_posts`, Ereignisse *Insert, Update, Delete*,
`POST https://api.github.com/repos/maltlinski/tanznetzdresden_website/dispatches`, Header wie dort,
Body `{"event_type":"news-updated"}`.

## Datenbank

Migration `supabase/migrations/20261009000000_news.sql` im SQL-Editor ausführen. Sie legt an:

- die Rolle `presse`,
- die Tabelle `news_posts` (Lesen und Schreiben nur für die Redaktion),
- die öffentliche Ansicht `public_news` (nur veröffentlichte Beiträge),
- den Bucket `newsbilder` (öffentlich lesbar, Schreiben nur für die Redaktion).

## Für Entwickler:innen

| Was | Wo |
|---|---|
| Zusammenführen, Datumsformate, Fristen | `src/lib/news.ts` |
| Markdown sicher in HTML (ohne eigenes HTML, nur sichere Links) | `src/lib/markdown.ts` |
| Startseiten-Abschnitt | `src/components/sections/News.astro` |
| Übersicht / Beitrag | `src/views/NewsView.astro`, `src/views/NewsArticleView.astro` |
| Editor | `src/pages/intern/news/` |
| Countdown im Browser | `src/scripts/deadline.ts` |
| Auftritt der Überschriften | `src/scripts/intro-text.ts` (`data-sweep`, `data-rise`) |

Alle Farben, Schriften und Abstände kommen aus den Design-Tokens. Ein neuer Import des Designsystems wirkt also
auch hier.
