-- =====================================================================
-- KEEP UP · Profitraining planen und beschreiben (Intern → KEEP UP)
--
-- keepup_termine: eine Zeile je Einplanung (eine Dozent:in, eine Woche, ein oder mehrere Tage).
--   Planung (Art, Dozent:in, Woche, Tage, Zeit, Ort, Notiz) ändert nur der Vorstand.
--   Die Beschreibung (Titel, Kurzbeschreibung, Text, Schwerpunkte, Mitbringen, Bild) schreibt die Dozent:in
--   selbst, der Vorstand kann sie auch bearbeiten.
--
-- Wer ist die Dozent:in? `dozent` ist das Kürzel aus src/content/keep-up/dozentinnen.yaml. Eine Person darf die
-- Einplanung bearbeiten, wenn ihr Profil genau diese Adresse hat (profiles.slug) und freigegeben ist (verified).
--
-- Veröffentlichen: `veroeffentlicht` ist der Stand auf der Website. Wer die Spalte auf einen Wert setzt
-- (z. B. '{}'), veröffentlicht den aktuellen Text: der Trigger kopiert ihn hinein. null = offline.
-- Status wie im Entwurf: ohne Beschreibung · Entwurf · online · Änderungen offen (src/lib/keep-up-plan.ts).
--
-- Öffentlich: Ansicht public_keepup (ohne Notiz und Entwürfe) für den Build der Website.
-- keepup_kontakte(): E-Mail-Adressen der eingeplanten Dozent:innen, nur für den Vorstand (Knopf „Erinnern“).
-- Bilder: Bucket „keepup“, je Dozent:in ein Ordner mit ihrem Kürzel.
-- google_event_id: für die geplante Synchronisierung mit dem Google Kalender des Vereins (docs/keep-up.md).
--
-- Einspielen: nach den anderen Migrationen im SQL-Editor ausführen (Rolle oben rechts: postgres).
-- Mehrfaches Ausführen schadet nicht.
-- =====================================================================

create table if not exists public.keepup_termine (
  id                 uuid primary key default gen_random_uuid(),
  art                text not null default 'training' check (art in ('training', 'workshop')),
  dozent             text not null check (dozent ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(dozent) <= 60),
  woche              date not null check (extract(isodow from woche) = 1),
  tage               smallint[] not null
                     check (cardinality(tage) between 1 and 7 and tage <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  zeit               text not null default '10:00–11:30' check (char_length(zeit) between 1 and 40),
  ort                text not null default '' check (char_length(ort) <= 120),
  notiz              text not null default '' check (char_length(notiz) <= 1000),
  titel              text not null default '' check (char_length(titel) <= 80),
  kurz               text not null default '' check (char_length(kurz) <= 400),
  text               text not null default '' check (char_length(text) <= 6000),
  schwerpunkte       text[] not null default '{}' check (cardinality(schwerpunkte) <= 12),
  mitbringen         text not null default '' check (char_length(mitbringen) <= 200),
  bild               text check (bild is null or bild ~ '^(assets/photos/|[a-z0-9-]+/)[A-Za-z0-9._-]+$'),
  bild_alt           text not null default '' check (char_length(bild_alt) <= 300),
  veroeffentlicht    jsonb,
  veroeffentlicht_am timestamptz,
  erinnert_am        date,
  google_event_id    text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  updated_by         uuid references public.profiles (id) on delete set null
);

create index if not exists keepup_termine_woche on public.keepup_termine (woche);
create index if not exists keepup_termine_dozent on public.keepup_termine (dozent);

comment on table public.keepup_termine is 'KEEP UP: Einplanungen (Vorstand) mit Beschreibung (Dozent:in), siehe docs/keep-up.md';
comment on column public.keepup_termine.dozent is 'Kürzel aus src/content/keep-up/dozentinnen.yaml = Profiladresse (profiles.slug) der Dozent:in';
comment on column public.keepup_termine.veroeffentlicht is 'Stand auf der Website; setzen = aktuellen Text veröffentlichen, null = offline';

-- Kürzel der angemeldeten Person (freigegebenes Profil mit Adresse), sonst null
create or replace function public.keepup_ich()
returns text
language sql stable security definer set search_path = public
as $$
  select slug from public.profiles where id = auth.uid() and verified and slug is not null;
$$;
grant execute on function public.keepup_ich() to authenticated;

create or replace function public.keepup_before_write()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  new.schwerpunkte := array(select distinct trim(s) from unnest(new.schwerpunkte) s where trim(s) <> '');
  if tg_op = 'UPDATE' and not public.is_vorstand() and auth.uid() is not null then
    if (new.art, new.dozent, new.woche, new.tage, new.zeit, new.ort, new.notiz, new.erinnert_am, new.google_event_id)
       is distinct from (old.art, old.dozent, old.woche, old.tage, old.zeit, old.ort, old.notiz, old.erinnert_am, old.google_event_id) then
      raise exception 'Nur der Vorstand ändert die Einplanung (Woche, Tage, Zeit, Ort, Notiz).';
    end if;
  end if;
  -- Veröffentlichen: immer den gespeicherten Text übernehmen, nicht das, was der Browser schickt
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

drop trigger if exists keepup_before_write on public.keepup_termine;
create trigger keepup_before_write before insert or update on public.keepup_termine
  for each row execute function public.keepup_before_write();

alter table public.keepup_termine enable row level security;

drop policy if exists "KEEP UP lesen" on public.keepup_termine;
drop policy if exists "Vorstand plant KEEP UP" on public.keepup_termine;
drop policy if exists "KEEP UP bearbeiten" on public.keepup_termine;
drop policy if exists "Vorstand löscht KEEP UP" on public.keepup_termine;
create policy "KEEP UP lesen"
  on public.keepup_termine for select to authenticated
  using (public.is_vorstand() or dozent = public.keepup_ich());
create policy "Vorstand plant KEEP UP"
  on public.keepup_termine for insert to authenticated
  with check (public.is_vorstand());
create policy "KEEP UP bearbeiten"
  on public.keepup_termine for update to authenticated
  using (public.is_vorstand() or dozent = public.keepup_ich())
  with check (public.is_vorstand() or dozent = public.keepup_ich());
create policy "Vorstand löscht KEEP UP"
  on public.keepup_termine for delete to authenticated
  using (public.is_vorstand());

grant select, insert, update, delete on public.keepup_termine to authenticated;

-- Erinnern (nur Vorstand): E-Mail-Adressen der Dozent:innen mit Konto, für eine Mail aus dem eigenen Mailprogramm
create or replace function public.keepup_kontakte()
returns table (dozent text, name text, email text)
language sql stable security definer set search_path = public
as $$
  select p.slug, p.display_name, u.email::text
  from public.profiles p join auth.users u on u.id = p.id
  where public.is_vorstand() and p.verified and p.slug in (select distinct k.dozent from public.keepup_termine k);
$$;
revoke all on function public.keepup_kontakte() from anon, public;
grant execute on function public.keepup_kontakte() to authenticated;

-- Öffentlich (Build der Website): Planung und veröffentlichter Text, keine Notizen und Entwürfe
drop view if exists public.public_keepup;
create view public.public_keepup
with (security_invoker = false) as
  select id, art, dozent, woche, tage, zeit, ort, veroeffentlicht, updated_at
  from public.keepup_termine;
grant select on public.public_keepup to anon, authenticated;

-- Bilder zu den Beschreibungen: öffentlich lesbar, schreiben nur die Dozent:in (eigener Ordner) und der Vorstand
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('keepup', 'keepup', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "KEEP UP-Bild hochladen" on storage.objects;
drop policy if exists "KEEP UP-Bild ersetzen" on storage.objects;
drop policy if exists "KEEP UP-Bild löschen" on storage.objects;
create policy "KEEP UP-Bild hochladen"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'keepup' and (public.is_vorstand() or (storage.foldername(name))[1] = public.keepup_ich()));
create policy "KEEP UP-Bild ersetzen"
  on storage.objects for update to authenticated
  using (bucket_id = 'keepup' and (public.is_vorstand() or (storage.foldername(name))[1] = public.keepup_ich()));
create policy "KEEP UP-Bild löschen"
  on storage.objects for delete to authenticated
  using (bucket_id = 'keepup' and (public.is_vorstand() or (storage.foldername(name))[1] = public.keepup_ich()));
