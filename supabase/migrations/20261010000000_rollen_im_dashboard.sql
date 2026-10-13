-- Rollen und Freigaben auch im Supabase-Dashboard (Table Editor, SQL-Editor) ändern können.
--
-- Bisher prüfte der Trigger immer, ob die angemeldete Person Vorstand ist. Im Dashboard
-- gibt es keine angemeldete Person (auth.uid() ist leer), daher kam auch dort
-- „Nur der Vorstand kann Rollen ändern.“ – und der erste Vorstand ließ sich nicht ernennen.
--
-- Jetzt gilt die Prüfung nur für Änderungen über die Website (angemeldete Mitglieder).
-- Anonyme Zugriffe können Profile weiterhin gar nicht ändern (Row Level Security).
-- Neu: Die Rolle „admin“ vergeben oder entziehen nur Admins (vorher nur in der Oberfläche).
-- Die Fassung unten ist die aktuelle aus 20261013000000_freigaben.sql (Freigaben durch die Redaktion).

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
