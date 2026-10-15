-- =====================================================================
-- News mit Bildern im Text (Galerien, Einzelfotos, Hinweiskästen)
--
-- Der Editor (Intern → News) speichert Bilder als Abschnitte im Text (body / body_en,
-- siehe src/lib/news-bloecke.ts). Dafür:
--  - längere Texte erlaubt (Rückblicke mit vielen Abschnitten und Bildern),
--  - Bildausschnitt des Titelfotos (image_focus, z. B. „50% 30%“),
--  - die öffentliche Ansicht public_news gibt image_focus mit aus.
-- Einspielen: nach den anderen Migrationen im SQL-Editor ausführen (Rolle oben rechts: postgres).
-- Mehrfaches Ausführen schadet nicht.
-- =====================================================================

alter table public.news_posts
  add column if not exists image_focus text check (image_focus ~ '^\d{1,3}% \d{1,3}%$');

alter table public.news_posts drop constraint if exists news_posts_body_check;
alter table public.news_posts add constraint news_posts_body_check check (char_length(body) <= 100000);
alter table public.news_posts drop constraint if exists news_posts_body_en_check;
alter table public.news_posts add constraint news_posts_body_en_check check (char_length(body_en) <= 100000);

drop view if exists public.public_news;
create view public.public_news
with (security_invoker = false) as
  select slug, category, date, author, featured, deadline,
         title, teaser, body, facts, image_path, image_alt, image_credit, image_focus,
         quote_text, quote_who, quote_role,
         title_en, teaser_en, body_en, facts_en, image_alt_en, quote_text_en, quote_role_en,
         updated_at
  from public.news_posts
  where status = 'veroeffentlicht';

grant select on public.public_news to anon, authenticated;
