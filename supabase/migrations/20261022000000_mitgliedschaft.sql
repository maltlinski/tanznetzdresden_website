-- =====================================================================
-- Mitgliedschaft und Mitgliedsausweis (Intern → Mein Status)
--
-- mitgliedschaften: eine Zeile je Mitglied mit Mitgliedsnummer, Art, Eintritt, bis wann der Beitrag bezahlt ist
-- und ggf. dem Ende der Mitgliedschaft. Jedes Mitglied sieht nur die eigene Zeile, der Vorstand alle.
-- Pflegen kann nur der Vorstand (Intern → Mitglieder, Bereich „Mitgliedschaft“ auf jeder Karte).
--
-- Status (gleiche Regel in src/lib/mitgliedschaft.ts):
--   abgelaufen  Ende eingetragen und vorbei
--   aktiv       Beitrag für das laufende Jahr bezahlt (bezahlt_bis >= Jahr)
--   offen       sonst
--
-- ausweis_pruefen(code): der QR-Code auf der Rückseite des Ausweises führt auf /mitglied/pruefen/?c=<code>.
-- Die Funktion verrät nur Name, Nummer, Art, Status und „gültig bis“, und nur mit dem zufälligen Prüfcode.
--
-- Einspielen: nach den anderen Migrationen im SQL-Editor ausführen (Rolle oben rechts: postgres).
-- Mehrfaches Ausführen schadet nicht.
-- =====================================================================

create sequence if not exists public.mitgliedsnummer_seq;

create table if not exists public.mitgliedschaften (
  person       uuid primary key references public.profiles (id) on delete cascade,
  nummer       text unique check (nummer ~ '^[A-Z0-9][A-Z0-9-]{0,29}$'),
  art          text not null default 'Ordentliches Mitglied' check (char_length(art) <= 80),
  seit         date,
  bezahlt_bis  int check (bezahlt_bis between 2000 and 2100),
  bezahlt_am   date,
  ende         date,
  pruefcode    uuid not null default gen_random_uuid() unique,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users (id) on delete set null default auth.uid()
);

comment on table public.mitgliedschaften is 'Mitgliedschaft je Mitglied (Nummer, Art, Eintritt, Beitrag bezahlt bis, Ende). Lesen: das Mitglied selbst und der Vorstand. Schreiben: Vorstand.';
comment on column public.mitgliedschaften.bezahlt_bis is 'Letztes Jahr, für das der Beitrag bezahlt ist. Aktiv, solange es mindestens das laufende Jahr ist.';
comment on column public.mitgliedschaften.ende is 'Ende der Mitgliedschaft (Austritt). Danach gilt der Ausweis als abgelaufen.';
comment on column public.mitgliedschaften.pruefcode is 'Zufälliger Code im QR-Code des Ausweises. Neu würfeln, wenn ein Ausweis verloren geht: update … set pruefcode = gen_random_uuid().';

-- Nummer vergeben (TNDD-<Jahr des Eintritts>-<laufende Nummer>), Bearbeitung festhalten
create or replace function public.mitgliedschaften_before_write()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.nummer is null or new.nummer = '' then
    new.nummer := 'TNDD-' || extract(year from coalesce(new.seit, current_date))::int || '-' || lpad(nextval('public.mitgliedsnummer_seq')::text, 3, '0');
  end if;
  new.nummer := upper(new.nummer);
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists mitgliedschaften_before_write on public.mitgliedschaften;
create trigger mitgliedschaften_before_write
  before insert or update on public.mitgliedschaften
  for each row execute function public.mitgliedschaften_before_write();

alter table public.mitgliedschaften enable row level security;

drop policy if exists "Eigene Mitgliedschaft lesen" on public.mitgliedschaften;
create policy "Eigene Mitgliedschaft lesen"
  on public.mitgliedschaften for select to authenticated using (person = auth.uid() or public.is_vorstand());
drop policy if exists "Vorstand legt Mitgliedschaften an" on public.mitgliedschaften;
create policy "Vorstand legt Mitgliedschaften an"
  on public.mitgliedschaften for insert to authenticated with check (public.is_vorstand());
drop policy if exists "Vorstand bearbeitet Mitgliedschaften" on public.mitgliedschaften;
create policy "Vorstand bearbeitet Mitgliedschaften"
  on public.mitgliedschaften for update to authenticated using (public.is_vorstand()) with check (public.is_vorstand());
drop policy if exists "Vorstand löscht Mitgliedschaften" on public.mitgliedschaften;
create policy "Vorstand löscht Mitgliedschaften"
  on public.mitgliedschaften for delete to authenticated using (public.is_vorstand());

grant select, insert, update, delete on public.mitgliedschaften to authenticated;
grant usage on sequence public.mitgliedsnummer_seq to authenticated;

-- Ausweis prüfen (öffentlich, nur mit Prüfcode)
create or replace function public.ausweis_pruefen(code uuid)
returns table (name text, nummer text, art text, status text, gueltig_bis date)
language sql stable security definer set search_path = public
as $$
  select p.display_name,
         m.nummer,
         m.art,
         case
           when m.ende is not null and m.ende < current_date then 'abgelaufen'
           when m.bezahlt_bis >= extract(year from current_date)::int then 'aktiv'
           else 'offen'
         end,
         coalesce(m.ende, make_date(m.bezahlt_bis, 12, 31))
  from public.mitgliedschaften m
  join public.profiles p on p.id = m.person
  where m.pruefcode = code;
$$;

revoke all on function public.ausweis_pruefen(uuid) from public;
grant execute on function public.ausweis_pruefen(uuid) to anon, authenticated;
