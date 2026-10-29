-- =====================================================================
-- News: Kopf der Beitragsseite wählbar (Entwurf News v3 / Redaktion v2)
--
--  - hero:        auto | vollbild | hochkant | split | typo (Beiträge mit Titelbild;
--                 auto = Vollbild, Hochkant-Fotos bekommen den Hochkant-Kopf)
--  - hero_theme:  purple | cyan | tint – Farbfläche des Netz-Kopfs (Beiträge ohne Titelbild)
--  - node_*:      Angabe am Magenta-Knoten im Netz-Kopf (kleine Zeile + Angabe), auch Englisch.
--                 Bei Ausschreibungen zeigt der Knoten automatisch die Frist.
-- Bildpaar, Bildstrecke und Bild & Text stehen im Text (body / body_en, src/lib/news-bloecke.ts) –
-- dafür braucht es keine neuen Spalten.
-- Einspielen: nach den anderen Migrationen im SQL-Editor ausführen (Rolle oben rechts: postgres).
-- Mehrfaches Ausführen schadet nicht.
-- =====================================================================

alter table public.news_posts
  add column if not exists hero text not null default 'auto'
    check (hero in ('auto', 'vollbild', 'hochkant', 'split', 'typo')),
  add column if not exists hero_theme text not null default 'purple'
    check (hero_theme in ('purple', 'cyan', 'tint')),
  add column if not exists node_kicker text check (char_length(node_kicker) <= 60),
  add column if not exists node_value text check (char_length(node_value) <= 80),
  add column if not exists node_kicker_en text check (char_length(node_kicker_en) <= 60),
  add column if not exists node_value_en text check (char_length(node_value_en) <= 80);

drop view if exists public.public_news;
create view public.public_news
with (security_invoker = false) as
  select slug, category, date, author, featured, deadline,
         title, teaser, body, facts, image_path, image_alt, image_credit, image_focus,
         quote_text, quote_who, quote_role,
         title_en, teaser_en, body_en, facts_en, image_alt_en, quote_text_en, quote_role_en,
         hero, hero_theme, node_kicker, node_value, node_kicker_en, node_value_en,
         updated_at
  from public.news_posts
  where status = 'veroeffentlicht';

grant select on public.public_news to anon, authenticated;
