-- =====================================================================
-- Mediathek der Redaktion und Newsletter-Vormerkung
--
-- news_medien: Angaben zu jedem Foto im Bucket „newsbilder“ – Bildbeschreibung (de/en), Fotonachweis und
-- Bildausschnitt. Sie gelten überall, wo das Foto verwendet wird: Die Website übernimmt sie beim Build
-- (src/lib/news.ts), der Editor zeigt sie an. Gepflegt unter Intern → Redaktion → Medien und im Editor.
-- news_posts.newsletter: Beitrag für den nächsten Newsletter vormerken (nur intern sichtbar).
--
-- Einspielen: nach den anderen Migrationen im SQL-Editor ausführen (Rolle oben rechts: postgres).
-- Mehrfaches Ausführen schadet nicht.
-- =====================================================================

create table if not exists public.news_medien (
  datei       text primary key check (datei ~ '^[a-z0-9][a-z0-9_.-]*(/[a-z0-9][a-z0-9_.-]*)*$' and char_length(datei) <= 200),
  alt         text not null default '' check (char_length(alt) <= 300),
  alt_en      text not null default '' check (char_length(alt_en) <= 300),
  credit      text not null default '' check (char_length(credit) <= 120),
  focus       text check (focus ~ '^\d{1,3}% \d{1,3}%$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null default auth.uid()
);

comment on table public.news_medien is 'Mediathek: Bildbeschreibung, Fotonachweis und Ausschnitt je Foto im Bucket newsbilder. Öffentlich lesbar (steht ohnehin auf der Website).';

create or replace function public.news_medien_before_write()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists news_medien_before_write on public.news_medien;
create trigger news_medien_before_write
  before insert or update on public.news_medien
  for each row execute function public.news_medien_before_write();

alter table public.news_medien enable row level security;

drop policy if exists "Alle lesen Medienangaben" on public.news_medien;
create policy "Alle lesen Medienangaben"
  on public.news_medien for select to anon, authenticated using (true);
drop policy if exists "Redaktion legt Medien an" on public.news_medien;
create policy "Redaktion legt Medien an"
  on public.news_medien for insert to authenticated with check (public.is_redaktion());
drop policy if exists "Redaktion bearbeitet Medien" on public.news_medien;
create policy "Redaktion bearbeitet Medien"
  on public.news_medien for update to authenticated using (public.is_redaktion()) with check (public.is_redaktion());
drop policy if exists "Redaktion löscht Medien" on public.news_medien;
create policy "Redaktion löscht Medien"
  on public.news_medien for delete to authenticated using (public.is_redaktion());

grant select on public.news_medien to anon, authenticated;
grant insert, update, delete on public.news_medien to authenticated;

alter table public.news_posts
  add column if not exists newsletter boolean not null default false;

-- Die Mediathek listet alle Fotos im Bucket (auch solche, die noch in keinem Beitrag stehen)
drop policy if exists "Redaktion listet News-Fotos" on storage.objects;
create policy "Redaktion listet News-Fotos"
  on storage.objects for select to authenticated
  using (bucket_id = 'newsbilder' and public.is_redaktion());
