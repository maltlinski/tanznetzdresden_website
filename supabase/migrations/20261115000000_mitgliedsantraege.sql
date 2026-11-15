-- =====================================================================
-- Mitgliedsanträge von der Seite „Mitglied werden“
--
-- mitgliedsantraege: eine Zeile je Antrag aus dem Formular (Name, E-Mail, Art, ein paar Sätze zur Person).
-- Besucher:innen der Website können nichts lesen und nicht direkt in die Tabelle schreiben. Das Formular ruft
-- die Funktion mitgliedsantrag_stellen() auf; sie prüft die Angaben und bremst Massen-Einsendungen
-- (höchstens 30 Anträge je Stunde, dann öffnet das Formular stattdessen eine vorbereitete E-Mail).
-- Lesen, als erledigt markieren und löschen kann nur der Vorstand (Intern → Mitglieder, „Anträge“).
--
-- Ohne diese Migration funktioniert das Formular trotzdem: Es öffnet dann eine vorbereitete E-Mail an den Vorstand.
--
-- Einspielen: nach den anderen Migrationen im SQL-Editor ausführen (Rolle oben rechts: postgres).
-- Mehrfaches Ausführen schadet nicht.
-- =====================================================================

create table if not exists public.mitgliedsantraege (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 2 and 80),
  email        text not null check (char_length(email) <= 200 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  art          text not null default 'Ordentliches Mitglied' check (art in ('Ordentliches Mitglied', 'Fördermitglied')),
  nachricht    text not null default '' check (char_length(nachricht) <= 2000),
  sprache      text not null default 'de' check (sprache in ('de', 'en')),
  erledigt_am  timestamptz,
  created_at   timestamptz not null default now()
);

comment on table public.mitgliedsantraege is 'Anträge aus dem Formular „Mitglied werden“. Schreiben nur über mitgliedsantrag_stellen(), lesen und löschen nur der Vorstand.';
comment on column public.mitgliedsantraege.erledigt_am is 'Vom Vorstand als erledigt markiert (eingeladen oder abgesagt). Erledigte Anträge bitte bald löschen.';

alter table public.mitgliedsantraege enable row level security;

drop policy if exists "Vorstand liest Anträge" on public.mitgliedsantraege;
create policy "Vorstand liest Anträge"
  on public.mitgliedsantraege for select to authenticated using (public.is_vorstand());

drop policy if exists "Vorstand markiert Anträge" on public.mitgliedsantraege;
create policy "Vorstand markiert Anträge"
  on public.mitgliedsantraege for update to authenticated
  using (public.is_vorstand()) with check (public.is_vorstand());

drop policy if exists "Vorstand löscht Anträge" on public.mitgliedsantraege;
create policy "Vorstand löscht Anträge"
  on public.mitgliedsantraege for delete to authenticated using (public.is_vorstand());

revoke all on public.mitgliedsantraege from anon, public;
grant select, update, delete on public.mitgliedsantraege to authenticated;

-- Antrag aus dem Formular eintragen (auch ohne Anmeldung)
create or replace function public.mitgliedsantrag_stellen(
  p_name text, p_email text, p_art text default 'Ordentliches Mitglied', p_nachricht text default '', p_sprache text default 'de'
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if (select count(*) from public.mitgliedsantraege where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Zu viele Anträge in kurzer Zeit. Bitte später noch einmal versuchen.' using errcode = 'P0001';
  end if;
  insert into public.mitgliedsantraege (name, email, art, nachricht, sprache)
  values (
    btrim(p_name), lower(btrim(p_email)),
    case when p_art = 'Fördermitglied' then 'Fördermitglied' else 'Ordentliches Mitglied' end,
    left(btrim(coalesce(p_nachricht, '')), 2000),
    case when p_sprache = 'en' then 'en' else 'de' end
  );
end;
$$;

revoke all on function public.mitgliedsantrag_stellen(text, text, text, text, text) from public;
grant execute on function public.mitgliedsantrag_stellen(text, text, text, text, text) to anon, authenticated;
