-- =====================================================================
-- Kalender im internen Bereich (Intern → Kalender): Termine eintragen und KEEP UP planen
--
-- kalender_termine: Termine für den Tanzkalender (Bühne, Training, Diskurs), eingetragen von Presse, Vorstand
-- oder Admin. Gleiche Felder wie die Termin-Dateien in src/content/termine/; die Website holt sie beim Build
-- (Ansicht public_kalender, nur `sichtbar`) und baut daraus Tanzkalender, Terminseiten und das Kalender-Abo
-- /termine.ics, das auch der Google Kalender des Vereins abonnieren kann (docs/kalender.md).
--
-- Außerdem: KEEP UP planen dürfen jetzt auch Presse und Admin (vorher nur Vorstand), damit alles an einer Stelle
-- eingetragen werden kann.
--
-- Einspielen: nach 20261025000000_keepup.sql im SQL-Editor ausführen (Rolle oben rechts: postgres).
-- Mehrfaches Ausführen schadet nicht.
-- =====================================================================

create table if not exists public.kalender_termine (
  id          uuid primary key default gen_random_uuid(),
  -- Adresse der Terminseite: /termine/<slug>/ (wie der Dateiname, z. B. 2026-11-20-studio-round-10)
  slug        text not null unique check (slug ~ '^\d{4}-\d{2}-\d{2}-[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 90),
  titel       text not null check (char_length(titel) between 1 and 120),
  titel_en    text not null default '' check (char_length(titel_en) <= 120),
  datum       date not null,
  von         time not null,
  bis         time,
  -- eigene Anzeige der Uhrzeit, z. B. „Einlass 19:00“ (leer = von–bis)
  zeit_text   text not null default '' check (char_length(zeit_text) <= 60),
  ort         text not null check (char_length(ort) between 1 and 160),
  kategorie   text not null check (kategorie in ('Bühne', 'Training', 'Diskurs')),
  kurz        text not null check (char_length(kurz) between 1 and 400),
  kurz_en     text not null default '' check (char_length(kurz_en) <= 400),
  text        text not null default '' check (char_length(text) <= 8000),
  link        text not null default '' check (link = '' or link ~ '^https?://'),
  format      text not null default '' check (format = '' or format ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  personen    text[] not null default '{}',
  news        text not null default '' check (news = '' or news ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sichtbar    boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null
);

create index if not exists kalender_termine_datum on public.kalender_termine (datum);
comment on table public.kalender_termine is 'Termine aus Intern → Kalender (docs/kalender.md); sichtbar = auf der Website';

create or replace function public.kalender_before_write()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  new.personen := array(select distinct trim(p) from unnest(new.personen) p where trim(p) <> '');
  if new.bis is not null and new.bis <= new.von then
    raise exception 'Das Ende liegt vor dem Beginn.';
  end if;
  return new;
end;
$$;

drop trigger if exists kalender_before_write on public.kalender_termine;
create trigger kalender_before_write before insert or update on public.kalender_termine
  for each row execute function public.kalender_before_write();

alter table public.kalender_termine enable row level security;

drop policy if exists "Redaktion liest Termine" on public.kalender_termine;
drop policy if exists "Redaktion trägt Termine ein" on public.kalender_termine;
drop policy if exists "Redaktion ändert Termine" on public.kalender_termine;
drop policy if exists "Redaktion löscht Termine" on public.kalender_termine;
create policy "Redaktion liest Termine"
  on public.kalender_termine for select to authenticated using (public.is_redaktion());
create policy "Redaktion trägt Termine ein"
  on public.kalender_termine for insert to authenticated with check (public.is_redaktion());
create policy "Redaktion ändert Termine"
  on public.kalender_termine for update to authenticated using (public.is_redaktion()) with check (public.is_redaktion());
create policy "Redaktion löscht Termine"
  on public.kalender_termine for delete to authenticated using (public.is_redaktion());

grant select, insert, update, delete on public.kalender_termine to authenticated;

-- Öffentlich (Build der Website): nur sichtbare Termine
drop view if exists public.public_kalender;
create view public.public_kalender
with (security_invoker = false) as
  select slug, titel, titel_en, datum, von, bis, zeit_text, ort, kategorie, kurz, kurz_en, text, link, format, personen, news, updated_at
  from public.kalender_termine
  where sichtbar;
grant select on public.public_kalender to anon, authenticated;

-- ---------------------------------------------------------------------
-- KEEP UP: planen dürfen Presse, Vorstand und Admin
-- ---------------------------------------------------------------------
create or replace function public.keepup_before_write()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  new.schwerpunkte := array(select distinct trim(s) from unnest(new.schwerpunkte) s where trim(s) <> '');
  if tg_op = 'UPDATE' and not public.is_redaktion() and auth.uid() is not null then
    if (new.art, new.dozent, new.woche, new.tage, new.zeit, new.ort, new.notiz, new.erinnert_am, new.google_event_id)
       is distinct from (old.art, old.dozent, old.woche, old.tage, old.zeit, old.ort, old.notiz, old.erinnert_am, old.google_event_id) then
      raise exception 'Nur Redaktion und Vorstand ändern die Einplanung (Woche, Tage, Zeit, Ort, Notiz).';
    end if;
  end if;
  if new.veroeffentlicht is not null and (tg_op = 'INSERT' or old.veroeffentlicht is null
      or new.veroeffentlicht is distinct from old.veroeffentlicht) then
    if trim(new.titel) = '' or trim(new.kurz) = '' then
      raise exception 'Zum Veröffentlichen braucht es einen Titel und eine Kurzbeschreibung.';
    end if;
    new.veroeffentlicht := jsonb_build_object(
      'titel', new.titel, 'kurz', new.kurz, 'text', new.text, 'schwerpunkte', to_jsonb(new.schwerpunkte),
      'mitbringen', new.mitbringen, 'bild', new.bild, 'bild_alt', new.bild_alt);
    new.veroeffentlicht_am := now();
  end if;
  if new.veroeffentlicht is null then new.veroeffentlicht_am := null; end if;
  return new;
end;
$$;

drop policy if exists "KEEP UP lesen" on public.keepup_termine;
drop policy if exists "Vorstand plant KEEP UP" on public.keepup_termine;
drop policy if exists "KEEP UP bearbeiten" on public.keepup_termine;
drop policy if exists "Vorstand löscht KEEP UP" on public.keepup_termine;
drop policy if exists "Redaktion plant KEEP UP" on public.keepup_termine;
drop policy if exists "Redaktion löscht KEEP UP" on public.keepup_termine;
create policy "KEEP UP lesen"
  on public.keepup_termine for select to authenticated
  using (public.is_redaktion() or dozent = public.keepup_ich());
create policy "Redaktion plant KEEP UP"
  on public.keepup_termine for insert to authenticated
  with check (public.is_redaktion());
create policy "KEEP UP bearbeiten"
  on public.keepup_termine for update to authenticated
  using (public.is_redaktion() or dozent = public.keepup_ich())
  with check (public.is_redaktion() or dozent = public.keepup_ich());
create policy "Redaktion löscht KEEP UP"
  on public.keepup_termine for delete to authenticated
  using (public.is_redaktion());

create or replace function public.keepup_kontakte()
returns table (dozent text, name text, email text)
language sql stable security definer set search_path = public
as $$
  select p.slug, p.display_name, u.email::text
  from public.profiles p join auth.users u on u.id = p.id
  where public.is_redaktion() and p.verified and p.slug in (select distinct k.dozent from public.keepup_termine k);
$$;

drop policy if exists "KEEP UP-Bild hochladen" on storage.objects;
drop policy if exists "KEEP UP-Bild ersetzen" on storage.objects;
drop policy if exists "KEEP UP-Bild löschen" on storage.objects;
create policy "KEEP UP-Bild hochladen"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'keepup' and (public.is_redaktion() or (storage.foldername(name))[1] = public.keepup_ich()));
create policy "KEEP UP-Bild ersetzen"
  on storage.objects for update to authenticated
  using (bucket_id = 'keepup' and (public.is_redaktion() or (storage.foldername(name))[1] = public.keepup_ich()));
create policy "KEEP UP-Bild löschen"
  on storage.objects for delete to authenticated
  using (bucket_id = 'keepup' and (public.is_redaktion() or (storage.foldername(name))[1] = public.keepup_ich()));
