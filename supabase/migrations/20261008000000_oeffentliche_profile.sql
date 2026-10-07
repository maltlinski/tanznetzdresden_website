-- =====================================================================
-- Öffentliche Profile der Künstler:innen
-- Mitglieder pflegen ihr Profil im internen Bereich. Auf der öffentlichen
-- Website erscheint es, wenn (1) die Person „öffentlich zeigen“ wählt und
-- (2) der Vorstand das Profil freigegeben hat (verified).
-- Die Website holt die freigegebenen Profile beim Build (nächtlich bzw. per Webhook).
-- =====================================================================

alter table public.profiles
  add column if not exists slug text unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  add column if not exists bio_en text check (char_length(bio_en) <= 1200),
  add column if not exists tags text[] not null default '{}',
  add column if not exists photo_path text,
  add column if not exists photo_credit text,
  add column if not exists vimeo text,
  add column if not exists verified boolean not null default false;

comment on column public.profiles.slug is 'Adresse des Profils: /netzwerk/<slug>/';
comment on column public.profiles.verified is 'Vom Vorstand für die öffentliche Website freigegeben.';

-- Rolle UND Freigabe darf nur der Vorstand ändern. Ändert die Person ihr Profil
-- inhaltlich, bleibt die Freigabe bestehen; ein neuer Slug braucht neue Freigabe.
create or replace function public.profiles_before_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_vorstand() then
    if new.role is distinct from old.role then
      raise exception 'Nur der Vorstand kann Rollen ändern.';
    end if;
    if new.verified is distinct from old.verified then
      raise exception 'Nur der Vorstand kann Profile freigeben.';
    end if;
    if new.slug is distinct from old.slug then
      new.verified := false;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Öffentliche Ansicht neu: nur freigegebene, öffentlich gewünschte Profile
drop view if exists public.public_profiles;
create view public.public_profiles
with (security_invoker = false) as
  select slug, display_name, pronouns, bio, bio_en, tags, website, instagram, vimeo,
         is_trainer, ags, photo_path, photo_credit, updated_at
  from public.profiles
  where public_listing and verified and slug is not null;

grant select on public.public_profiles to anon, authenticated;

-- Verzeichnis für Mitglieder: zusätzlich Freigabe-Status (für den Vorstand)
drop function if exists public.member_directory();
create function public.member_directory()
returns table (
  id uuid, display_name text, pronouns text, bio text, website text, instagram text,
  is_trainer boolean, ags text[], role public.member_role, email text, phone text,
  slug text, public_listing boolean, verified boolean
)
language sql stable security definer set search_path = public
as $$
  select p.id, p.display_name, p.pronouns, p.bio, p.website, p.instagram, p.is_trainer, p.ags, p.role,
         case when p.show_email then u.email::text end,
         case when p.show_phone then p.phone end,
         p.slug, p.public_listing, p.verified
  from public.profiles p
  join auth.users u on u.id = p.id
  where auth.uid() is not null
  order by p.display_name;
$$;

revoke all on function public.member_directory() from anon, public;
grant execute on function public.member_directory() to authenticated;

-- Porträts: öffentlich lesbar, jede Person schreibt nur in ihren eigenen Ordner <user-id>/
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profilbilder', 'profilbilder', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Porträt hochladen (eigener Ordner)"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'profilbilder' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Porträt ersetzen (eigener Ordner)"
  on storage.objects for update to authenticated
  using (bucket_id = 'profilbilder' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Porträt löschen (eigener Ordner oder Vorstand)"
  on storage.objects for delete to authenticated
  using (bucket_id = 'profilbilder' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_vorstand()));
