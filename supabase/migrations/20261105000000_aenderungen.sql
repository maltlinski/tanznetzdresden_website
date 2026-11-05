-- =====================================================================
-- Änderungen: Verlauf für alles, was die Redaktion in der Datenbank ändert
--
-- Beiträge (news_posts), Termine (kalender_termine), KEEP UP (keepup_termine), Mediathek (news_medien),
-- Freigaben von Profilen und Fotos sowie Rollen (profiles) schreiben bei jeder Änderung eine Zeile in
-- public.aenderungen: wer, wann, was – und nur die geänderten Felder vorher/nachher.
-- Änderungen an den Dateien (Texte, Seiten, Formate …) stehen im Git-Verlauf; die Seite
-- Intern → Website-Inhalte → Änderungen zeigt beides zusammen (src/scripts/intern/redaktion/aenderungen.ts).
--
-- Mehrere Änderungen derselben Person am selben Eintrag innerhalb von 15 Minuten werden zu einer Zeile
-- zusammengefasst (vorher = Stand vor der ersten, nachher = Stand nach der letzten).
-- Eigene Profiländerungen der Mitglieder (Bio, Website …) werden nicht protokolliert, nur Freigaben und Rollen.
-- Ein Fehler beim Protokollieren verhindert nie das Speichern selbst.
--
-- Einspielen: im SQL-Editor ausführen (Rolle oben rechts: postgres). Mehrfaches Ausführen schadet nicht.
-- =====================================================================

create table if not exists public.aenderungen (
  id        bigint generated always as identity primary key,
  zeit      timestamptz not null default now(),
  -- beitraege | termine | keepup | medien | freigaben | rollen
  bereich   text not null,
  eintrag   text not null,
  titel     text not null default '',
  aktion    text not null check (aktion in ('angelegt', 'geaendert', 'geloescht')),
  von       uuid,
  von_name  text not null default '',
  vorher    jsonb,
  nachher   jsonb
);
create index if not exists aenderungen_zeit on public.aenderungen (zeit desc);
create index if not exists aenderungen_eintrag on public.aenderungen (bereich, eintrag, zeit desc);

comment on table public.aenderungen is 'Verlauf der Redaktion (Datenbank-Teil). Schreibt nur der Trigger aenderung_merken(); lesen: Presse, Vorstand, Admin (Rollen nur Vorstand/Admin).';

alter table public.aenderungen enable row level security;
grant select on public.aenderungen to authenticated;
revoke insert, update, delete, truncate on public.aenderungen from anon, authenticated;

drop policy if exists "Redaktion liest Änderungen" on public.aenderungen;
create policy "Redaktion liest Änderungen"
  on public.aenderungen for select to authenticated
  using (public.is_redaktion() and (bereich <> 'rollen' or public.is_vorstand()));
-- keine Policies für insert/update/delete: nur der Trigger (security definer) schreibt

-- Argumente: bereich, Spalte der Kennung, Spalte des Titels, optional beobachtete Spalten (Komma-getrennt;
-- dann nur Änderungen, kein Anlegen/Löschen)
create or replace function public.aenderung_merken()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  bereich_  text := tg_argv[0];
  id_spalte text := tg_argv[1];
  titel_sp  text := tg_argv[2];
  nur       text[] := case when tg_nargs > 3 then string_to_array(tg_argv[3], ',') end;
  ohne      text[] := array['created_at', 'created_by', 'updated_at', 'updated_by', 'erinnert_am', 'google_event_id', 'veroeffentlicht', 'id'];
  alt       jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  neu       jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v         jsonb := '{}';
  n         jsonb := '{}';
  k         text;
  aktion_   text;
  wer       uuid := auth.uid();
  name_     text := '';
  eintrag_  text;
  titel_    text;
  frueher   public.aenderungen;
begin
  begin
    if nur is not null and tg_op <> 'UPDATE' then
      return null;
    end if;
    if tg_op = 'UPDATE' then
      aktion_ := 'geaendert';
      for k in select jsonb_object_keys(neu) loop
        if (nur is null and not (k = any(ohne))) or k = any(nur) then
          if (alt -> k) is distinct from (neu -> k) then
            v := v || jsonb_build_object(k, alt -> k);
            n := n || jsonb_build_object(k, neu -> k);
          end if;
        end if;
      end loop;
      if n = '{}'::jsonb then
        return null;
      end if;
    elsif tg_op = 'INSERT' then
      aktion_ := 'angelegt';
      n := neu - ohne;
      v := null;
    else
      aktion_ := 'geloescht';
      v := alt - ohne;
      n := null;
    end if;

    eintrag_ := coalesce(neu ->> id_spalte, alt ->> id_spalte, '');
    titel_ := left(coalesce(nullif(neu ->> titel_sp, ''), nullif(alt ->> titel_sp, ''), eintrag_), 200);
    if wer is not null then
      select display_name into name_ from public.profiles where id = wer;
    end if;

    -- dieselbe Person, derselbe Eintrag, vor kurzem: zusammenfassen
    if aktion_ = 'geaendert' then
      select * into frueher from public.aenderungen a
        where a.bereich = bereich_ and a.eintrag = eintrag_ and a.von is not distinct from wer
          and a.zeit > now() - interval '15 minutes'
        order by a.zeit desc limit 1;
      if found and frueher.aktion <> 'geloescht' then
        update public.aenderungen set
          zeit = now(),
          titel = titel_,
          vorher = case when frueher.aktion = 'angelegt' then null else v || coalesce(frueher.vorher, '{}') end,
          nachher = coalesce(frueher.nachher, '{}') || n
          where id = frueher.id;
        return null;
      end if;
    end if;

    insert into public.aenderungen (bereich, eintrag, titel, aktion, von, von_name, vorher, nachher)
      values (bereich_, eintrag_, titel_, aktion_, wer, coalesce(name_, ''), v, n);
  exception when others then
    raise warning 'aenderung_merken: %', sqlerrm;
  end;
  return null;
end;
$$;

revoke all on function public.aenderung_merken() from anon, authenticated, public;

drop trigger if exists aenderung_beitraege on public.news_posts;
create trigger aenderung_beitraege after insert or update or delete on public.news_posts
  for each row execute function public.aenderung_merken('beitraege', 'slug', 'title');

drop trigger if exists aenderung_termine on public.kalender_termine;
create trigger aenderung_termine after insert or update or delete on public.kalender_termine
  for each row execute function public.aenderung_merken('termine', 'slug', 'titel');

drop trigger if exists aenderung_keepup on public.keepup_termine;
create trigger aenderung_keepup after insert or update or delete on public.keepup_termine
  for each row execute function public.aenderung_merken('keepup', 'id', 'titel');

drop trigger if exists aenderung_medien on public.news_medien;
create trigger aenderung_medien after insert or update or delete on public.news_medien
  for each row execute function public.aenderung_merken('medien', 'datei', 'datei');

-- Profile: nur Freigaben (Profil, Foto) und Rollen, nicht die eigenen Angaben der Mitglieder
drop trigger if exists aenderung_freigaben on public.profiles;
create trigger aenderung_freigaben after update on public.profiles
  for each row execute function public.aenderung_merken('freigaben', 'id', 'display_name', 'verified,photo_path');

drop trigger if exists aenderung_rollen on public.profiles;
create trigger aenderung_rollen after update on public.profiles
  for each row execute function public.aenderung_merken('rollen', 'id', 'display_name', 'role');
