-- =====================================================================
-- News aus dem internen Bereich
-- Mitglieder mit der Rolle „presse“, „vorstand“ oder „admin“ schreiben Beiträge
-- unter Intern → News. Veröffentlichte Beiträge holt die Website beim Build
-- über die Ansicht public_news (nächtlich bzw. sofort per Webhook „news-updated“).
-- =====================================================================

-- Neue Rolle: Presse (darf News schreiben, sonst wie Mitglied)
alter type public.member_role add value if not exists 'presse';

-- Wer darf News schreiben? (Vergleich als Text, damit die neue Rolle in derselben
-- Transaktion verwendet werden kann.)
create or replace function public.is_redaktion()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role::text in ('presse', 'vorstand', 'admin')
  );
$$;

create table if not exists public.news_posts (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique
                check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 80),
  status        text not null default 'entwurf' check (status in ('entwurf', 'veroeffentlicht')),
  category      text not null default 'Netzwerk'
                check (category in ('Netzwerk', 'Ausschreibung', 'Training', 'Verein', 'Rückblick', 'Stimme')),
  date          date not null default current_date,
  author        text not null default '' check (char_length(author) <= 120),
  featured      boolean not null default false,
  deadline      date,

  title         text not null check (char_length(title) between 3 and 160),
  teaser        text not null default '' check (char_length(teaser) <= 400),
  body          text not null default '' check (char_length(body) <= 30000),
  facts         jsonb not null default '[]'::jsonb check (jsonb_typeof(facts) = 'array'),

  image_path    text,
  image_alt     text check (char_length(image_alt) <= 300),
  image_credit  text check (char_length(image_credit) <= 120),

  quote_text    text check (char_length(quote_text) <= 400),
  quote_who     text check (char_length(quote_who) <= 120),
  quote_role    text check (char_length(quote_role) <= 160),

  -- Englische Fassung (optional – fehlt sie, erscheint der deutsche Text)
  title_en      text check (char_length(title_en) <= 160),
  teaser_en     text check (char_length(teaser_en) <= 400),
  body_en       text check (char_length(body_en) <= 30000),
  facts_en      jsonb not null default '[]'::jsonb check (jsonb_typeof(facts_en) = 'array'),
  image_alt_en  text check (char_length(image_alt_en) <= 300),
  quote_text_en text check (char_length(quote_text_en) <= 400),
  quote_role_en text check (char_length(quote_role_en) <= 160),

  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_by    uuid references auth.users (id) on delete set null,
  updated_at    timestamptz not null default now(),
  published_at  timestamptz,

  -- Ein Foto braucht eine Bildbeschreibung (Barrierefreiheit)
  constraint news_image_alt check (image_path is null or coalesce(image_alt, '') <> '')
);

comment on table public.news_posts is 'News/Journal-Beiträge aus dem internen Bereich. Öffentlich über die Ansicht public_news.';

create or replace function public.news_before_write()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if new.status = 'veroeffentlicht' and (tg_op = 'INSERT' or old.status is distinct from 'veroeffentlicht') then
    new.published_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists news_before_write on public.news_posts;
create trigger news_before_write
  before insert or update on public.news_posts
  for each row execute function public.news_before_write();

alter table public.news_posts enable row level security;

create policy "Redaktion liest alle Beiträge"
  on public.news_posts for select to authenticated using (public.is_redaktion());
create policy "Redaktion legt Beiträge an"
  on public.news_posts for insert to authenticated with check (public.is_redaktion());
create policy "Redaktion bearbeitet Beiträge"
  on public.news_posts for update to authenticated using (public.is_redaktion()) with check (public.is_redaktion());
create policy "Redaktion löscht Beiträge"
  on public.news_posts for delete to authenticated using (public.is_redaktion());

-- Öffentlich: nur veröffentlichte Beiträge, ohne interne Felder
drop view if exists public.public_news;
create view public.public_news
with (security_invoker = false) as
  select slug, category, date, author, featured, deadline,
         title, teaser, body, facts, image_path, image_alt, image_credit,
         quote_text, quote_who, quote_role,
         title_en, teaser_en, body_en, facts_en, image_alt_en, quote_text_en, quote_role_en,
         updated_at
  from public.news_posts
  where status = 'veroeffentlicht';

grant select on public.public_news to anon, authenticated;

-- Fotos zu Beiträgen: öffentlich lesbar, schreiben nur die Redaktion
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('newsbilder', 'newsbilder', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Redaktion lädt News-Fotos hoch"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'newsbilder' and public.is_redaktion());
create policy "Redaktion ersetzt News-Fotos"
  on storage.objects for update to authenticated
  using (bucket_id = 'newsbilder' and public.is_redaktion());
create policy "Redaktion löscht News-Fotos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'newsbilder' and public.is_redaktion());
