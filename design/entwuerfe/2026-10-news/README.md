# News – Entwurf Oktober 2026

Aus Claude Design. Umgesetzt in `src/views/NewsView.astro` (Übersicht) und `src/views/NewsArticleView.astro`
(Beitrag), Inhalte siehe `docs/news.md`.

Umgesetzt wie im Entwurf: Intro „Aus dem Netz.“ mit Titelthema und offenen Fristen, Chronik nach Monaten mit
Kategorie-Filter, vier Darstellungen (Foto, Text, Ausschreibung mit Countdown, Stimme), Beitragsseite mit
„Auf einen Blick“, Teilen, Lesefortschritt und „Mehr aus dem Netz“.

Abweichungen:
- Jeder Beitrag hat eine eigene Adresse (`/news/<adresse>/`) statt `#anker` – teilbar, für Suchmaschinen lesbar.
- Die Darstellung ergibt sich aus den Feldern (Frist → Ausschreibung, Zitat → Stimme, Foto → Foto), kein extra Typ.
- „Meldung einreichen“ öffnet die geschützte E-Mail-Adresse (Bot-Schutz) statt eines mailto-Links.
- Zusätzlich: RSS-Feed, englische Fassung, Editor im internen Bereich.
