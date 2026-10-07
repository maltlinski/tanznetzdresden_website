-- =====================================================================
-- TanzNetzDresden · Interner Bereich
-- Einspielen: Supabase-Dashboard → SQL Editor → diesen Inhalt ausführen
--            (oder mit der Supabase CLI: `supabase db push`).
--
-- Sicherheitsprinzip: Jede Tabelle hat Row Level Security (RLS). Der
-- öffentliche „anon key“ im Browser darf dadurch NICHTS lesen außer der
-- Ansicht public_profiles. Alles andere nur für angemeldete Mitglieder.
-- =====================================================================

create type public.member_role as enum ('mitglied', 'vorstand', 'admin');

create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  display_name   text not null default '',
  pronouns       text,
  bio            text check (char_length(bio) <= 1200),
  website        text,
  instagram      text,
  phone          text,
  is_trainer     boolean not null default false,
  ags            text[] not null default '{}',
  show_email     boolean not null default false,
  show_phone     boolean not null default false,
  public_listing boolean not null default false,
  role           public.member_role not null default 'mitglied',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.profiles is 'Ein Profil pro Mitglied. Wird beim ersten Login automatisch angelegt.';
comment on column public.profiles.public_listing is 'Darf auf der öffentlichen Website erscheinen (Name, Website, Instagram).';

alter table public.profiles enable row level security;

-- Hilfsfunktion: Ist die angemeldete Person Vorstand oder Admin?
create or replace function public.is_vorstand()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('vorstand', 'admin'));
$$;

create policy "Mitglieder sehen alle Profile"
  on public.profiles for select to authenticated using (true);

create policy "Eigenes Profil bearbeiten"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "Vorstand bearbeitet alle Profile"
  on public.profiles for update to authenticated
  using (public.is_vorstand()) with check (public.is_vorstand());

-- Rollen darf nur der Vorstand ändern; updated_at pflegen
create or replace function public.profiles_before_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_vorstand() then
    raise exception 'Nur der Vorstand kann Rollen ändern.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_before_update();

-- Beim Anlegen eines Kontos (Einladung durch den Vorstand) Profil erzeugen
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mitgliederverzeichnis: E-Mail/Telefon nur, wenn freigegeben
create or replace function public.member_directory()
returns table (
  id uuid, display_name text, pronouns text, bio text, website text, instagram text,
  is_trainer boolean, ags text[], role public.member_role, email text, phone text
)
language sql stable security definer set search_path = public
as $$
  select p.id, p.display_name, p.pronouns, p.bio, p.website, p.instagram, p.is_trainer, p.ags, p.role,
         case when p.show_email then u.email::text end,
         case when p.show_phone then p.phone end
  from public.profiles p
  join auth.users u on u.id = p.id
  where auth.uid() is not null
  order by p.display_name;
$$;

revoke all on function public.member_directory() from anon, public;
grant execute on function public.member_directory() to authenticated;

-- Öffentliche Ansicht (für eine spätere automatische Netzwerk-Liste auf der Website)
create or replace view public.public_profiles
with (security_invoker = false) as
  select display_name, website, instagram, is_trainer
  from public.profiles
  where public_listing;

grant select on public.public_profiles to anon, authenticated;

-- ---------------------------------------------------------------------
-- Dateiablage „intern“ (Protokolle, Satzung, Vorlagen …)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('intern', 'intern', false)
on conflict (id) do nothing;

create policy "Mitglieder lesen interne Dateien"
  on storage.objects for select to authenticated
  using (bucket_id = 'intern');

create policy "Vorstand lädt Dateien hoch"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'intern' and public.is_vorstand());

create policy "Vorstand ändert Dateien"
  on storage.objects for update to authenticated
  using (bucket_id = 'intern' and public.is_vorstand());

create policy "Vorstand löscht Dateien"
  on storage.objects for delete to authenticated
  using (bucket_id = 'intern' and public.is_vorstand());
