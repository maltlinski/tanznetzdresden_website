-- =====================================================================
-- Datenschutz, Freigaben und KEEP UP-Uhrzeit (Prüfung November 2026)
--
-- 1. Telefonnummern: Bisher durfte jedes angemeldete Mitglied die ganze Tabelle profiles lesen – auch die
--    Telefonnummer, wenn „Telefonnummer anzeigen“ aus war. Die Nummer liegt jetzt in profil_privat: lesen und
--    ändern nur die Person selbst, lesen auch der Vorstand. Die Mitgliederliste (member_directory) zeigt sie wie
--    bisher nur mit Häkchen. profiles.phone bleibt als leere Spalte stehen (ältere Migrationen nennen sie).
-- 2. Porträts und Galeriefotos (Bucket „profilbilder“): Ein Mitglied konnte ein freigegebenes Foto im eigenen
--    Ordner überschreiben oder löschen und unter gleichem Namen neu hochladen – ohne neue Freigabe. Überschreiben
--    geht nicht mehr (die Website lädt immer neue Dateien hoch), löschen nur Dateien, die gerade nicht als
--    freigegebenes Foto eingetragen sind. „Foto entfernen“ trägt das Foto zuerst aus und klappt weiter.
--    Neu: Lesen im eigenen Ordner (die Redaktion: alle). Supabase braucht es zum Löschen; ohne diese Regel
--    blieben verworfene Fotos im Bucket liegen.
-- 3. KEEP UP-Uhrzeit: nur noch „von–bis“ (09:00–10:30), gleiche Regel wie wochen.yaml. Ohne Ende fehlte die
--    Endzeit im Kalender-Abo, „18 Uhr“ machte den Eintrag unlesbar. Ältere Zeilen bleiben, wie sie sind.
--
-- Einspielen: erst wenn die Website mit dieser Änderung online ist (sie kennt beide Stände), dann im
-- SQL-Editor ausführen (Rolle oben rechts: postgres). Mehrfaches Ausführen schadet nicht. Wird
-- 20261008000000 noch einmal ausgeführt, danach diese Datei erneut ausführen (member_directory).
-- Prüfen: danach supabase/pruefen.sql ausführen.
-- =====================================================================

-- 1. Telefon ----------------------------------------------------------

create table if not exists public.profil_privat (
  person     uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  phone      text check (char_length(phone) <= 40),
  updated_at timestamptz not null default now()
);

comment on table public.profil_privat is 'Private Angaben je Mitglied (Telefon). Lesen und ändern: die Person selbst; lesen: Vorstand. Andere Mitglieder sehen die Nummer nur über member_directory und nur mit profiles.show_phone.';

alter table public.profil_privat enable row level security;

drop policy if exists "Eigene Angaben lesen" on public.profil_privat;
create policy "Eigene Angaben lesen"
  on public.profil_privat for select to authenticated using (person = auth.uid() or public.is_vorstand());
drop policy if exists "Eigene Angaben anlegen" on public.profil_privat;
create policy "Eigene Angaben anlegen"
  on public.profil_privat for insert to authenticated with check (person = auth.uid());
drop policy if exists "Eigene Angaben ändern" on public.profil_privat;
create policy "Eigene Angaben ändern"
  on public.profil_privat for update to authenticated using (person = auth.uid()) with check (person = auth.uid());
drop policy if exists "Eigene Angaben löschen" on public.profil_privat;
create policy "Eigene Angaben löschen"
  on public.profil_privat for delete to authenticated using (person = auth.uid());

revoke all on public.profil_privat from anon, public;
grant select, insert, update, delete on public.profil_privat to authenticated;

create or replace function public.profil_privat_before_write()
returns trigger
language plpgsql
as $$
begin
  new.phone := nullif(btrim(coalesce(new.phone, '')), '');
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profil_privat_before_write on public.profil_privat;
create trigger profil_privat_before_write before insert or update on public.profil_privat
  for each row execute function public.profil_privat_before_write();

-- vorhandene Nummern übernehmen und aus profiles entfernen; danach bleibt die Spalte leer
insert into public.profil_privat (person, phone)
  select id, phone from public.profiles where nullif(btrim(coalesce(phone, '')), '') is not null
  on conflict (person) do nothing;
update public.profiles set phone = null where phone is not null;
alter table public.profiles drop constraint if exists profiles_phone_leer;
alter table public.profiles add constraint profiles_phone_leer check (phone is null);
comment on column public.profiles.phone is 'Leer. Die Telefonnummer steht in profil_privat (Migration 20261123000000).';

-- Mitgliederliste: Telefon aus profil_privat, weiter nur mit show_phone
create or replace function public.member_directory()
returns table (
  id uuid, display_name text, pronouns text, bio text, website text, instagram text,
  is_trainer boolean, ags text[], role public.member_role, email text, phone text,
  slug text, public_listing boolean, verified boolean
)
language sql stable security definer set search_path = public
as $$
  select p.id, p.display_name, p.pronouns, p.bio, p.website, p.instagram, p.is_trainer, p.ags, p.role,
         case when p.show_email then u.email::text end,
         case when p.show_phone then pp.phone end,
         p.slug, p.public_listing, p.verified
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.profil_privat pp on pp.person = p.id
  where auth.uid() is not null
  order by p.display_name;
$$;

revoke all on function public.member_directory() from anon, public;
grant execute on function public.member_directory() to authenticated;

-- 2. Fotos ------------------------------------------------------------

-- Ist diese Datei gerade das Porträt oder ein freigegebenes Galeriefoto eines Profils?
create or replace function public.foto_freigegeben(pfad text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.photo_path = pfad
       or coalesce(p.gallery, '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('path', pfad, 'frei', true))
  );
$$;

revoke all on function public.foto_freigegeben(text) from anon, public;
grant execute on function public.foto_freigegeben(text) to authenticated;

drop policy if exists "Porträt ersetzen (eigener Ordner)" on storage.objects;

drop policy if exists "Porträt löschen (eigener Ordner oder Vorstand)" on storage.objects;
create policy "Porträt löschen (eigener Ordner oder Vorstand)"
  on storage.objects for delete to authenticated
  using (bucket_id = 'profilbilder' and (
    public.is_vorstand()
    or ((storage.foldername(name))[1] = auth.uid()::text and not public.foto_freigegeben(name))
  ));

drop policy if exists "Porträts im eigenen Ordner sehen" on storage.objects;
create policy "Porträts im eigenen Ordner sehen"
  on storage.objects for select to authenticated
  using (bucket_id = 'profilbilder' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_redaktion()));

-- 3. KEEP UP-Uhrzeit --------------------------------------------------
-- Prüft nur, wenn die Uhrzeit geschrieben wird (Redaktion plant). Dozent:innen, die ihre Beschreibung
-- veröffentlichen, ändern die Zeit nicht – auch alte Einträge mit anderer Schreibweise bleiben bearbeitbar.

create or replace function public.keepup_zeit_pruefen()
returns trigger
language plpgsql
as $$
begin
  -- wie zeitNorm() in src/lib/keep-up-plan.ts: „9:00 - 10:30“ → „09:00–10:30“
  new.zeit := regexp_replace(regexp_replace(btrim(new.zeit), '\s*[–-]\s*', '–'), '(^|–)([0-9]):', '\10\2:', 'g');
  if new.zeit !~ '^[0-9]{2}:[0-9]{2}–[0-9]{2}:[0-9]{2}$' then
    raise exception 'Bitte die Uhrzeit als „von–bis“ eintragen, z. B. 10:00–11:30.';
  end if;
  return new;
end;
$$;

drop trigger if exists keepup_zeit on public.keepup_termine;
create trigger keepup_zeit before insert or update of zeit on public.keepup_termine
  for each row execute function public.keepup_zeit_pruefen();
