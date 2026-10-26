-- =====================================================================
-- Open Calls im internen Bereich (Intern → Open Calls, docs/open-calls.md)
--
-- open_calls:      Ausschreibungen (Förderungen, Residenzen, Auditions, Jobs …). Mitglieder melden einen Call,
--                  die Redaktion (Presse, Vorstand, Admin) prüft und gibt ihn frei oder trägt selbst ein.
--                  Nach Ablauf der Frist zeigt die Seite ihn im Archiv (kein Job nötig).
-- open_call_stand: der eigene Stand je Call (gemerkt, in Arbeit, eingereicht, Zusage, Absage), abgehakte
--                  Unterlagen, Erinnerung per Mail. Sieht nur die Person selbst.
-- open_call_netz:  „Ich mache mit / suche Mitstreiter:innen“ und „Ich teile meine Erfahrungen“. Sehen alle
--                  Mitglieder, damit sie sich zusammentun können.
--
-- Einspielen: nach 20261026000000_kalender.sql im SQL-Editor ausführen (Rolle oben rechts: postgres).
-- Mehrfaches Ausführen schadet nicht.
-- =====================================================================

create table if not exists public.open_calls (
  id             uuid primary key default gen_random_uuid(),
  art            text not null default 'residenz'
                 check (art in ('foerderung', 'residenz', 'audition', 'festival', 'job', 'stipendium', 'weiterbildung')),
  titel          text not null check (char_length(titel) between 3 and 160),
  anbieter       text not null check (char_length(anbieter) between 2 and 160),
  -- dd = Dresden, sn = Sachsen, bund = bundesweit, int = international
  reichweite     text not null default 'dd' check (reichweite in ('dd', 'sn', 'bund', 'int')),
  ort            text not null default '' check (char_length(ort) <= 160),
  -- Bewerbungsschluss (Ortszeit Dresden); danach Archiv
  frist          date not null,
  uhrzeit        time not null default '23:59',
  -- Anträge erst ab diesem Tag möglich (optional)
  start          date,
  link           text not null default '' check (link = '' or link ~ '^https?://'),
  leistung       text not null default '' check (char_length(leistung) <= 200),
  honoriert      boolean not null default false,
  englisch       boolean not null default false,
  zeitraum       text not null default '' check (char_length(zeitraum) <= 200),
  zielgruppe     text not null default '' check (char_length(zielgruppe) <= 300),
  sprache        text not null default '' check (char_length(sprache) <= 100),
  wiederkehrend  text not null default '' check (char_length(wiederkehrend) <= 200),
  beschreibung   text not null default '' check (char_length(beschreibung) <= 2000),
  unterlagen     text[] not null default '{}',
  -- „Aus dem Netzwerk“: Hinweis der Redaktion, z. B. zu einem gemeinsamen Antrag
  hinweis        text not null default '' check (char_length(hinweis) <= 600),
  -- gemeinsamer Antrag des Netzwerks: Mitglieder können „Ich mache mit“ setzen
  gemeinsam      boolean not null default false,
  -- Ausschreibung des Vereins selbst (z. B. KEEP UP-Dozent:innen)
  vom_netzwerk   boolean not null default false,
  -- nicht für eine spätere öffentliche Liste auf der Website
  nur_mitglieder boolean not null default false,
  quelle         text not null default '' check (char_length(quelle) <= 160),
  status         text not null default 'pruefung' check (status in ('pruefung', 'frei')),
  gemeldet_von   uuid references public.profiles (id) on delete set null,
  geprueft_am    date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  updated_by     uuid references public.profiles (id) on delete set null,
  check (start is null or start <= frist)
);

create index if not exists open_calls_frist on public.open_calls (frist);
comment on table public.open_calls is 'Open Calls (Intern → Open Calls, docs/open-calls.md); Mitglieder melden, die Redaktion gibt frei';

create or replace function public.open_calls_before_write()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  new.unterlagen := array(select trim(u) from unnest(new.unterlagen) u where trim(u) <> '');
  -- Mitglieder melden nur: Prüfung, ohne Angaben, die der Redaktion vorbehalten sind
  if auth.uid() is not null and not public.is_redaktion() then
    if tg_op = 'UPDATE' then
      raise exception 'Nur die Redaktion ändert Open Calls.';
    end if;
    if new.frist < (now() at time zone 'Europe/Berlin')::date then
      raise exception 'Die Frist liegt in der Vergangenheit.';
    end if;
    new.status := 'pruefung';
    new.gemeldet_von := auth.uid();
    new.vom_netzwerk := false;
    new.gemeinsam := false;
    new.hinweis := '';
    new.geprueft_am := null;
    new.honoriert := new.leistung <> '';
  end if;
  if new.status = 'frei' and (tg_op = 'INSERT' or old.status <> 'frei') then
    new.geprueft_am := (now() at time zone 'Europe/Berlin')::date;
  end if;
  return new;
end;
$$;

drop trigger if exists open_calls_before_write on public.open_calls;
create trigger open_calls_before_write before insert or update on public.open_calls
  for each row execute function public.open_calls_before_write();

alter table public.open_calls enable row level security;

drop policy if exists "Open Calls lesen" on public.open_calls;
drop policy if exists "Open Call melden" on public.open_calls;
drop policy if exists "Redaktion ändert Open Calls" on public.open_calls;
drop policy if exists "Open Call löschen" on public.open_calls;
create policy "Open Calls lesen"
  on public.open_calls for select to authenticated
  using (status = 'frei' or gemeldet_von = auth.uid() or public.is_redaktion());
create policy "Open Call melden"
  on public.open_calls for insert to authenticated
  with check (public.is_redaktion() or (status = 'pruefung' and gemeldet_von = auth.uid()));
create policy "Redaktion ändert Open Calls"
  on public.open_calls for update to authenticated
  using (public.is_redaktion()) with check (public.is_redaktion());
-- Redaktion löscht (auch „Ablehnen“), Mitglieder ziehen ihre eigene Meldung zurück, solange sie wartet
create policy "Open Call löschen"
  on public.open_calls for delete to authenticated
  using (public.is_redaktion() or (status = 'pruefung' and gemeldet_von = auth.uid()));

grant select, insert, update, delete on public.open_calls to authenticated;

-- ---------------------------------------------------------------------
-- Eigener Stand je Call (nur die Person selbst)
-- ---------------------------------------------------------------------
create table if not exists public.open_call_stand (
  person      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  call_id     uuid not null references public.open_calls (id) on delete cascade,
  -- null = nicht (mehr) gemerkt
  stand       text check (stand in ('gemerkt', 'arbeit', 'eingereicht', 'zusage', 'absage')),
  -- abgehakte Unterlagen, gleiche Reihenfolge wie open_calls.unterlagen
  unterlagen  boolean[] not null default '{}',
  -- Erinnerung 7 Tage und 1 Tag vor der Frist (Funktion „erinnerungen“), in dieser Sprache
  erinnerung  boolean not null default false,
  sprache     text not null default 'de' check (sprache in ('de', 'en')),
  -- schon verschickt: '7' und/oder '1'
  erinnert    text[] not null default '{}',
  updated_at  timestamptz not null default now(),
  primary key (person, call_id)
);

alter table public.open_call_stand enable row level security;

drop policy if exists "Eigener Stand" on public.open_call_stand;
create policy "Eigener Stand"
  on public.open_call_stand for all to authenticated
  using (person = auth.uid()) with check (person = auth.uid());

grant select, insert, update, delete on public.open_call_stand to authenticated;

-- ---------------------------------------------------------------------
-- Mitmachen und Erfahrungen teilen (sehen alle Mitglieder)
-- ---------------------------------------------------------------------
create table if not exists public.open_call_netz (
  call_id    uuid not null references public.open_calls (id) on delete cascade,
  person     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- mitmachen: beim gemeinsamen Antrag dabei bzw. sucht Mitstreiter:innen; erfahrung: hat sich beworben, teilt Erfahrungen
  art        text not null check (art in ('mitmachen', 'erfahrung')),
  created_at timestamptz not null default now(),
  primary key (call_id, person, art)
);

alter table public.open_call_netz enable row level security;

drop policy if exists "Mitglieder sehen das Netzwerk" on public.open_call_netz;
drop policy if exists "Selbst eintragen" on public.open_call_netz;
drop policy if exists "Selbst austragen" on public.open_call_netz;
create policy "Mitglieder sehen das Netzwerk"
  on public.open_call_netz for select to authenticated using (true);
create policy "Selbst eintragen"
  on public.open_call_netz for insert to authenticated with check (person = auth.uid());
create policy "Selbst austragen"
  on public.open_call_netz for delete to authenticated using (person = auth.uid());

grant select, insert, delete on public.open_call_netz to authenticated;
