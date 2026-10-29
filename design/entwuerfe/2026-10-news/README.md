# News – Entwurf Oktober 2026 (Beitragsseite v3, Redaktion v2)

Aus Claude Design. `news.dc.html` ist die Fassung „Journal v3“, `redaktion.dc.html` der Editor „Redaktion v2“.
Umgesetzt in `src/views/NewsView.astro` (Übersicht), `src/views/NewsArticleView.astro` (Beitrag, Gerüst in
`src/lib/news-artikel.ts`) und `src/pages/intern/news/bearbeiten/` (Editor). Inhalte und Bedienung: `docs/news.md`.

Umgesetzt wie im Entwurf:
- Übersicht: Intro „Aus dem Netz.“ mit Titelthema und offenen Fristen, Chronik nach Monaten mit Kategorie-Filter,
  vier Darstellungen (Foto, Text, Ausschreibung mit Countdown, Stimme).
- Beitrag: Kopf als Vollbild, Hochkant, Split oder Typo; ohne Titelbild das Netz auf Lila, Cyan oder Hell mit
  Magenta-Knoten (Maus knüpft mit). Zeile mit Autor:in, Datum, „Link kopieren“, „E-Mail“; Eckdaten über dem Text,
  bei Ausschreibungen mit Countdown; Text in einer Spalte, Zitate und Namenskarten weiter; Fotos in Textbreite,
  weit (Keil-Ecke) oder randlos, Bildpaar, Bildstrecke (lila Band, Pfeile, „Vollbild“) und Bild & Text (Bild bleibt
  stehen, Texte laufen vorbei, Zähler „02 / 04“). Bildnummern („Abb. 03“), Bildnachweise am Ende, Großansicht mit
  Zähler, Titel, „Schließen · Esc“, Pfeilen, Wischen und Vorschaubildern; Foto fliegt aus dem Text hinein.
  Lesefortschritt, Titel gleitet wortweise herein, Fotos wischen auf, Titelbild zieht beim Scrollen nach oben.
  „Mehr aus dem Netz“ mit Foto oder Netz.
- Editor: Kopfbereich mit Skizzen der Varianten (Automatisch zeigt, was gilt), ohne Titelbild Farbfläche und Knoten;
  Eckdaten offen im Formular; neue Blöcke Bildpaar, Bildstrecke, Bild & Text; Breite eines Fotos; Checkliste
  meldet unvollständige Blöcke.

Abweichungen:
- Jeder Beitrag hat eine eigene Adresse (`/news/<adresse>/`) statt `#anker` – teilbar, für Suchmaschinen lesbar.
- Die Darstellung in der Übersicht ergibt sich aus den Feldern (Frist → Ausschreibung, Zitat → Stimme, Foto → Foto).
- Ohne gewählte Angabe trägt der Knoten im Netz-Kopf Rubrik und Datum (der Entwurf hat für jeden Beitrag eine).
- Typo-Kopf ohne eigene Bildunterschrift zum Titelbild (es gibt nur Bildbeschreibung und Fotonachweis).
- Die Bildbeschreibung (Alt-Text) bleibt empfohlen statt Pflicht, wie bisher in der Redaktion.
- Bewährtes bleibt: Galerie, Foto neben dem Text, Hinweiskasten und Bausteine, Englisch an jedem Block, Vorlagen,
  Link einfügen, Planen nur tageweise (Update morgens), Story-Bild zum Herunterladen statt Instagram-Vorlage.
- „Meldung einreichen“ öffnet die geschützte E-Mail-Adresse (Bot-Schutz) statt eines mailto-Links.
- Die Ansicht „Mein Profil“ im Redaktions-Entwurf ist nicht Teil dieser Umsetzung; das Profil bearbeiten Mitglieder
  unter Intern → Mein Profil (`design/entwuerfe/2026-10-profil/`).
- Zusätzlich: RSS-Feed, englische Fassung, Editor-Vorschau für Desktop und Mobil, Deutsch und Englisch.
