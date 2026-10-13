-- =====================================================================
-- Freigaben: Profile und Fotos gibt die Redaktion frei (Presse, Vorstand, Admin)
--
-- Mitglieder pflegen ihr Profil selbst. Auf der Website erscheint es erst nach der Freigabe.
-- Neu:
--  - Ein neues Foto wartet als photo_pending, bis die Redaktion es freigibt. Bis dahin bleibt
--    das bisherige Foto (photo_path) online. Textänderungen brauchen keine neue Freigabe.
--  - Freigeben dürfen jetzt auch Mitglieder mit der Rolle Presse (vorher nur der Vorstand).
--    Das geht über die Funktion freigabe(), nicht über direkte Änderungen fremder Profile.
-- Einspielen: nach den anderen Migrationen im SQL-Editor ausführen (Rolle oben rechts: postgres).
-- Mehrfaches Ausführen schadet nicht.
-- =====================================================================

alter table public.profiles add column if not exists photo_pending text;
comment on column public.profiles.photo_pending is 'Neues Porträt, wartet auf Freigabe durch die Redaktion (dann → photo_path).';
comment on column public.profiles.verified is 'Von der Redaktion (Presse, Vorstand, Admin) für die öffentliche Website freigegeben.';

-- Prüfungen beim Ändern eines Profils. Gleiche Fassung in 20261008000000 und 20261010000000,
-- damit erneutes Ausführen einer älteren Migration nichts zurücksetzt. Ohne Anmeldung
-- (Supabase-Dashboard) gibt es keine Prüfung, anonyme Zugriffe verhindert Row Level Security.
create or replace function public.profiles_before_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  rolle text;
begin
  if auth.uid() is not null then
    select role::text into rolle from public.profiles where id = auth.uid();
    rolle := coalesce(rolle, '');
    if new.role is distinct from old.role then
      if rolle not in ('vorstand', 'admin') then
        raise exception 'Nur der Vorstand kann Rollen ändern.';
      end if;
      if 'admin' in (new.role::text, old.role::text) and rolle <> 'admin' then
        raise exception 'Die Rolle Admin vergeben und entziehen nur Admins.';
      end if;
    end if;
    if rolle not in ('presse', 'vorstand', 'admin') then
      if new.verified is distinct from old.verified then
        raise exception 'Nur Presse und Vorstand geben Profile frei.';
      end if;
      -- eigenes Foto entfernen geht, ein neues kommt über photo_pending
      if new.photo_path is distinct from old.photo_path and new.photo_path is not null then
        raise exception 'Neue Fotos gibt die Redaktion frei.';
      end if;
      if new.slug is distinct from old.slug then
        new.verified := false;
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Freigeben, ablehnen, zurückziehen. Gibt den Pfad eines Fotos zurück, das nicht mehr
-- gebraucht wird (die Oberfläche löscht es dann aus dem Bucket).
--   profil         Profil freigeben (ein wartendes Foto gleich mit)
--   foto           wartendes Foto freigeben
--   foto_ablehnen  wartendes Foto verwerfen
--   foto_entfernen freigegebenes Foto von der Website nehmen
--   zurueckziehen  Profil wieder von der Website nehmen
create or replace function public.freigabe(person uuid, aktion text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  p public.profiles;
  frei text;
begin
  if not public.is_redaktion() then
    raise exception 'Nur Presse und Vorstand geben Profile frei.';
  end if;
  select * into p from public.profiles where id = person for update;
  if not found then
    raise exception 'Profil nicht gefunden.';
  end if;
  if aktion = 'profil' then
    update public.profiles
      set verified = true, photo_path = coalesce(p.photo_pending, p.photo_path), photo_pending = null
      where id = person;
    if p.photo_pending is not null then frei := p.photo_path; end if;
  elsif aktion = 'foto' then
    if p.photo_pending is null then return null; end if;
    update public.profiles set photo_path = p.photo_pending, photo_pending = null where id = person;
    frei := p.photo_path;
  elsif aktion = 'foto_ablehnen' then
    update public.profiles set photo_pending = null where id = person;
    frei := p.photo_pending;
  elsif aktion = 'foto_entfernen' then
    update public.profiles set photo_path = null where id = person;
    frei := p.photo_path;
  elsif aktion = 'zurueckziehen' then
    update public.profiles set verified = false where id = person;
  else
    raise exception 'Unbekannte Aktion: %', aktion;
  end if;
  return frei;
end;
$$;

revoke all on function public.freigabe(uuid, text) from anon, public;
grant execute on function public.freigabe(uuid, text) to authenticated;

-- Abgelehnte und ersetzte Fotos löscht die Redaktion aus dem Bucket
drop policy if exists "Redaktion löscht Porträts" on storage.objects;
create policy "Redaktion löscht Porträts"
  on storage.objects for delete to authenticated
  using (bucket_id = 'profilbilder' and public.is_redaktion());
