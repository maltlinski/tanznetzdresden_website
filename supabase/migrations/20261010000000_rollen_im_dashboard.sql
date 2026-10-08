-- Rollen und Freigaben auch im Supabase-Dashboard (Table Editor, SQL-Editor) ändern können.
--
-- Bisher prüfte der Trigger immer, ob die angemeldete Person Vorstand ist. Im Dashboard
-- gibt es keine angemeldete Person (auth.uid() ist leer), daher kam auch dort
-- „Nur der Vorstand kann Rollen ändern.“ – und der erste Vorstand ließ sich nicht ernennen.
--
-- Jetzt gilt die Prüfung nur für Änderungen über die Website (angemeldete Mitglieder).
-- Anonyme Zugriffe können Profile weiterhin gar nicht ändern (Row Level Security).
-- Neu: Die Rolle „admin“ vergeben oder entziehen nur Admins (vorher nur in der Oberfläche).

create or replace function public.profiles_before_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null then
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
    elsif new.role is distinct from old.role
      and 'admin' in (new.role::text, old.role::text)
      and not exists (select 1 from public.profiles where id = auth.uid() and role::text = 'admin') then
      raise exception 'Die Rolle Admin vergeben und entziehen nur Admins.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
