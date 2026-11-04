-- =====================================================================
-- Ausblenden in der Mediathek („Auf der Website anzeigen“)
--
-- news_medien.sichtbar: false = das Foto erscheint nirgends auf der Website (Bildstrecken, Bildpaare, Schritte,
-- Titelbilder), bleibt aber in der Mediathek und in den Beiträgen erhalten und lässt sich wieder einblenden.
-- Der Build liest das Feld (src/lib/news.ts, src/lib/news-bloecke.ts). Ohne diese Migration ist alles sichtbar.
--
-- Bestehende Fotos: Standard true, es verschwindet also nichts. Inhalte als Dateien (Termine, Formate, Personen …)
-- brauchen keine Migration: Fehlt dort das Feld „sichtbar“, gilt der Eintrag als sichtbar (src/content.config.ts).
--
-- Einspielen: im Supabase-SQL-Editor ausführen (Rolle oben rechts: postgres). Mehrfaches Ausführen schadet nicht.
-- =====================================================================

alter table public.news_medien add column if not exists sichtbar boolean not null default true;

comment on column public.news_medien.sichtbar is 'Auf der Website anzeigen (Redaktion → Medien). false = Foto erscheint nirgends auf der Website.';

-- Lesen, Schreiben und Rechte wie die übrigen Spalten (Migration 20261016000000_mediathek.sql):
-- alle lesen, nur die Redaktion (is_redaktion) schreibt.
