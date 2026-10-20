-- =====================================================================
-- Profilseite, zweite Fassung: mehr Angaben, Galerie und Arbeiten
--
-- Neue Felder für das öffentliche Profil (alle freiwillig):
--  profession     Tätigkeit, z. B. „Tänzerin und Choreografin“ (+ _en)
--  base           Basis, z. B. „Dresden-Neustadt“
--  pitch          ein Satz über die eigene Arbeit (+ _en)
--  open_for       offen für: Kooperationen, Engagements, Workshops, Unterricht, Aufträge
--  works          Arbeiten: [{ year, title, place }]
--  education, techniques, languages, regions, height, available   Angaben im Abschnitt „Über“
--  public_email   öffentliche Kontaktadresse (auf der Website gegen Spam geschützt)
--  gallery        Fotos: [{ path, caption, caption_en, credit, frei }]
--  gallery_layout filmstreifen | mosaik | raster
--
-- Galeriefotos brauchen wie das Porträt eine Freigabe: Neue Fotos stehen mit frei = false in der
-- Liste, bis Presse, Vorstand oder Admin sie unter Redaktion → Freigaben freigeben (galerie_freigabe).
-- Die öffentliche Ansicht zeigt nur freigegebene Fotos.
--
-- Einspielen: nach den anderen Migrationen im SQL-Editor ausführen. Mehrfaches Ausführen schadet nicht.
-- =====================================================================

alter table public.profiles
  add column if not exists profession text check (char_length(profession) <= 80),
  add column if not exists profession_en text check (char_length(profession_en) <= 80),
  add column if not exists base text check (char_length(base) <= 60),
  add column if not exists pitch text check (char_length(pitch) <= 200),
  add column if not exists pitch_en text check (char_length(pitch_en) <= 200),
  add column if not exists open_for text[] not null default '{}'
    check (open_for <@ array['kooperationen', 'engagements', 'workshops', 'unterricht', 'auftraege']),
  add column if not exists works jsonb not null default '[]'
    check (jsonb_typeof(works) = 'array' and jsonb_array_length(works) <= 20 and char_length(works::text) <= 8000),
  add column if not exists education text check (char_length(education) <= 200),
  add column if not exists techniques text check (char_length(techniques) <= 200),
  add column if not exists languages text check (char_length(languages) <= 120),
  add column if not exists regions text check (char_length(regions) <= 120),
  add column if not exists height text check (char_length(height) <= 20),
  add column if not exists available text check (char_length(available) <= 80),
  add column if not exists public_email text
    check (char_length(public_email) <= 120 and public_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add column if not exists gallery jsonb not null default '[]'
    check (jsonb_typeof(gallery) = 'array' and jsonb_array_length(gallery) <= 12 and char_length(gallery::text) <= 6000),
  add column if not exists gallery_layout text not null default 'filmstreifen'
    check (gallery_layout in ('filmstreifen', 'mosaik', 'raster'));

-- Wartet ein Galeriefoto auf Freigabe? (für Zähler und Filter der Redaktion)
alter table public.profiles
  add column if not exists gallery_offen boolean generated always as (gallery @> '[{"frei": false}]') stored;

comment on column public.profiles.gallery is 'Galeriefotos [{path, caption, caption_en, credit, frei}]; frei setzt nur die Redaktion.';
comment on column public.profiles.public_email is 'Öffentliche Kontaktadresse auf der Profilseite.';

-- Galerie prüfen: Mitglieder legen nur Fotos aus ihrem eigenen Ordner ab, und nur die Redaktion
-- gibt frei. Ein Foto, das schon freigegeben war, bleibt es (auch wenn die Bildunterschrift sich ändert).
-- Eigener Trigger neben profiles_before_update, damit ältere Migrationen ihn nicht überschreiben.
create or replace function public.profiles_galerie_pruefen()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  frei_alt text[];
begin
  if jsonb_typeof(new.gallery) <> 'array' then
    raise exception 'Galerie muss eine Liste sein.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(new.gallery) g
    where jsonb_typeof(g) <> 'object' or coalesce(g->>'path', '') !~ ('^' || new.id::text || '/[A-Za-z0-9._-]+$')
  ) then
    raise exception 'Galeriefotos müssen im eigenen Ordner liegen.';
  end if;
  if auth.uid() is null or public.is_redaktion() then
    return new;
  end if;
  select coalesce(array_agg(g->>'path'), '{}') into frei_alt
    from jsonb_array_elements(case when tg_op = 'UPDATE' then old.gallery else '[]'::jsonb end) g
    where (g->>'frei')::boolean is true;
  new.gallery := coalesce((
    select jsonb_agg(g || jsonb_build_object('frei', (g->>'path') = any(frei_alt)) order by i)
    from jsonb_array_elements(new.gallery) with ordinality as t(g, i)
  ), '[]'::jsonb);
  return new;
end;
$$;

drop trigger if exists profiles_galerie on public.profiles;
create trigger profiles_galerie
  before insert or update of gallery on public.profiles
  for each row execute function public.profiles_galerie_pruefen();

-- Galeriefotos freigeben oder ablehnen (Presse, Vorstand, Admin).
-- pfad = null: alle wartenden Fotos der Person. Gibt die Pfade abgelehnter Fotos zurück,
-- die Oberfläche löscht sie dann aus dem Bucket.
create or replace function public.galerie_freigabe(person uuid, pfad text default null, ok boolean default true)
returns text[]
language plpgsql security definer set search_path = public
as $$
declare
  p public.profiles;
  weg text[];
begin
  if not public.is_redaktion() then
    raise exception 'Nur Presse und Vorstand geben Fotos frei.';
  end if;
  select * into p from public.profiles where id = person for update;
  if not found then
    raise exception 'Profil nicht gefunden.';
  end if;
  if ok then
    update public.profiles set gallery = coalesce((
      select jsonb_agg(case when not coalesce((g->>'frei')::boolean, false) and (pfad is null or g->>'path' = pfad)
                            then g || '{"frei": true}'::jsonb else g end order by i)
      from jsonb_array_elements(p.gallery) with ordinality as t(g, i)
    ), '[]'::jsonb) where id = person;
    return '{}';
  end if;
  select coalesce(array_agg(g->>'path'), '{}') into weg
    from jsonb_array_elements(p.gallery) g
    where not coalesce((g->>'frei')::boolean, false) and (pfad is null or g->>'path' = pfad);
  update public.profiles set gallery = coalesce((
    select jsonb_agg(g order by i)
    from jsonb_array_elements(p.gallery) with ordinality as t(g, i)
    where not (g->>'path' = any(weg))
  ), '[]'::jsonb) where id = person;
  return weg;
end;
$$;

revoke all on function public.galerie_freigabe(uuid, text, boolean) from anon, public;
grant execute on function public.galerie_freigabe(uuid, text, boolean) to authenticated;

-- Öffentliche Ansicht: neue Felder, nur freigegebene Galeriefotos (ohne Merker „frei“)
drop view if exists public.public_profiles;
create view public.public_profiles
with (security_invoker = false) as
  select p.slug, p.display_name, p.pronouns, p.bio, p.bio_en, p.tags, p.website, p.instagram, p.vimeo,
         p.is_trainer, p.ags, p.photo_path, p.photo_credit, p.updated_at,
         p.profession, p.profession_en, p.base, p.pitch, p.pitch_en, p.open_for, p.works,
         p.education, p.techniques, p.languages, p.regions, p.height, p.available, p.public_email,
         coalesce((
           select jsonb_agg(g - 'frei' order by i)
           from jsonb_array_elements(p.gallery) with ordinality as t(g, i)
           where (g->>'frei')::boolean is true
         ), '[]'::jsonb) as gallery,
         p.gallery_layout
  from public.profiles p
  where p.public_listing and p.verified and p.slug is not null;

grant select on public.public_profiles to anon, authenticated;
