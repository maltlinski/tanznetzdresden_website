-- =====================================================================
-- Zugriffsregeln prüfen (Row Level Security, Fotos im Speicher)
--
-- Wozu: Die Tests der Website arbeiten mit einer nachgebauten Datenbank. Ob die echten Regeln stimmen, zeigt
-- nur dieser Lauf. Bitte nach jeder neuen Migration ausführen.
-- So geht's: Supabase-Dashboard → SQL Editor → diesen Inhalt einfügen → Run (Rolle oben rechts: postgres).
-- Ergebnis: eine Tabelle mit einer Zeile je Prüfung; in der Spalte „ergebnis“ muss überall „ok“ stehen.
-- Nichts bleibt zurück: Der Lauf legt zwei Testpersonen mit Foto, Mitgliedschaft und Antrag an, spielt ein
-- normales Mitglied, ein zweites Mitglied und einen Besuch ohne Anmeldung durch und nimmt danach alles
-- zurück. Die Prüffunktion liegt nur in dieser Sitzung (pg_temp) und verschwindet von selbst.
-- =====================================================================

create or replace function pg_temp.pruefen()
returns table (nr int, pruefung text, ergebnis text)
language plpgsql
as $$
declare
  a constant uuid := '00000000-0000-4000-8000-0000000000a1';   -- normales Mitglied
  b constant uuid := '00000000-0000-4000-8000-0000000000b2';   -- Mitglied mit freigegebenem Profil und Foto
  liste text[] := '{}';
  ergebnisse text[] := '{}';
  n int;
  ok boolean;
  wert text;

begin
  begin
    -- Testdaten -----------------------------------------------------------
    insert into auth.users (id, email, raw_user_meta_data) values
      (a, 'pruefung-a@example.invalid', '{"display_name": "Prüfung A"}'),
      (b, 'pruefung-b@example.invalid', '{"display_name": "Prüfung B"}');
    insert into public.profiles (id, display_name) values (a, 'Prüfung A'), (b, 'Prüfung B') on conflict (id) do nothing;
    update public.profiles set role = 'mitglied' where id in (a, b);
    update public.profiles set slug = 'pruefung-b-tndd', verified = true, public_listing = true, show_phone = false,
      photo_path = b || '/portraet.jpg',
      gallery = jsonb_build_array(jsonb_build_object('path', b || '/galerie-frei.jpg', 'frei', true))
      where id = b;
    insert into public.profil_privat (person, phone) values (b, '0351 000000');
    insert into storage.objects (bucket_id, name, owner) values
      ('profilbilder', b || '/portraet.jpg', b),
      ('profilbilder', b || '/galerie-frei.jpg', b),
      ('profilbilder', b || '/neu-verworfen.jpg', b);
    insert into public.mitgliedschaften (person, nummer, bezahlt_bis) values (b, 'PRUEFUNG-B', extract(year from current_date)::int);
    perform public.mitgliedsantrag_stellen('Prüfung Antrag', 'pruefung-antrag@example.invalid');

    -- als Mitglied A ------------------------------------------------------
    perform set_config('request.jwt.claim.sub', a::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);

    select count(*) into n from public.profil_privat where person <> a;
    liste := liste || text 'Fremde Telefonnummern sind nicht lesbar';
    ergebnisse := ergebnisse || case when n = 0 then 'ok' else 'FEHLER: ' || n || ' fremde Nummern lesbar' end;

    select count(*) into n from public.profiles where phone is not null;
    liste := liste || text 'In der Profiltabelle (für alle lesbar) steht keine Telefonnummer';
    ergebnisse := ergebnisse || case when n = 0 then 'ok' else 'FEHLER: ' || n || ' Nummern in profiles' end;

    select d.phone into wert from public.member_directory() d where d.id = b;
    liste := liste || text 'Mitgliederliste: Telefon ohne Häkchen verborgen';
    ergebnisse := ergebnisse || case when wert is null then 'ok' else 'FEHLER: Nummer sichtbar ohne Häkchen' end;

    ok := false;
    begin
      update public.profiles set role = 'vorstand' where id = a;
    exception when others then ok := true;
    end;
    liste := liste || text 'Eigene Rolle lässt sich nicht ändern';
    ergebnisse := ergebnisse || case when ok then 'ok' else 'FEHLER: Mitglied hat sich selbst zum Vorstand gemacht' end;

    ok := false;
    begin
      update public.profiles set verified = true where id = a;
    exception when others then ok := true;
    end;
    liste := liste || text 'Eigenes Profil lässt sich nicht selbst freigeben';
    ergebnisse := ergebnisse || case when ok then 'ok' else 'FEHLER: Mitglied hat sich selbst freigegeben' end;

    update public.profiles set display_name = 'geändert' where id = b;
    get diagnostics n = row_count;
    liste := liste || text 'Fremdes Profil lässt sich nicht ändern';
    ergebnisse := ergebnisse || case when n = 0 then 'ok' else 'FEHLER: fremdes Profil geändert' end;

    delete from storage.objects where bucket_id = 'profilbilder' and name = b || '/neu-verworfen.jpg';
    get diagnostics n = row_count;
    liste := liste || text 'Fremde Fotos lassen sich nicht löschen';
    ergebnisse := ergebnisse || case when n = 0 then 'ok' else 'FEHLER: fremdes Foto gelöscht' end;

    select count(*) into n from public.mitgliedschaften where person <> a;
    liste := liste || text 'Fremde Mitgliedschaften sind nicht lesbar';
    ergebnisse := ergebnisse || case when n = 0 then 'ok' else 'FEHLER: ' || n || ' fremde Mitgliedschaften lesbar' end;

    select count(*) into n from public.mitgliedsantraege;
    liste := liste || text 'Mitgliedsanträge sieht nur der Vorstand';
    ergebnisse := ergebnisse || case when n = 0 then 'ok' else 'FEHLER: ' || n || ' Anträge lesbar' end;

    select count(*) into n from public.news_posts;
    liste := liste || text 'Beiträge im internen Bereich sieht nur die Redaktion';
    ergebnisse := ergebnisse || case when n = 0 then 'ok' else 'FEHLER: ' || n || ' Beiträge lesbar' end;

    select count(*) into n from public.kalender_termine;
    liste := liste || text 'Termine im internen Bereich sieht nur die Redaktion';
    ergebnisse := ergebnisse || case when n = 0 then 'ok' else 'FEHLER: ' || n || ' Termine lesbar' end;

    -- als Mitglied B (freigegebenes Foto) -----------------------------------
    perform set_config('role', 'postgres', true);
    perform set_config('request.jwt.claim.sub', b::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);

    update storage.objects set name = name where bucket_id = 'profilbilder' and name = b || '/portraet.jpg';
    get diagnostics n = row_count;
    liste := liste || text 'Freigegebenes Porträt lässt sich nicht überschreiben';
    ergebnisse := ergebnisse || case when n = 0 then 'ok' else 'FEHLER: Porträt ohne Freigabe austauschbar' end;

    delete from storage.objects where bucket_id = 'profilbilder' and name in (b || '/portraet.jpg', b || '/galerie-frei.jpg');
    get diagnostics n = row_count;
    liste := liste || text 'Freigegebene Fotos lassen sich nicht löschen und neu hochladen';
    ergebnisse := ergebnisse || case when n = 0 then 'ok' else 'FEHLER: ' || n || ' freigegebene Fotos gelöscht' end;

    delete from storage.objects where bucket_id = 'profilbilder' and name = b || '/neu-verworfen.jpg';
    get diagnostics n = row_count;
    liste := liste || text 'Eigenes, nicht freigegebenes Foto lässt sich löschen („Foto verwerfen“)';
    ergebnisse := ergebnisse || case when n = 1 then 'ok' else 'FEHLER: eigenes Foto bleibt liegen' end;

    select count(*) into n from public.profil_privat where person = b;
    liste := liste || text 'Eigene Telefonnummer ist lesbar';
    ergebnisse := ergebnisse || case when n = 1 then 'ok' else 'FEHLER: eigene Nummer nicht lesbar' end;

    -- Mitgliederliste mit Häkchen
    perform set_config('role', 'postgres', true);
    update public.profiles set show_phone = true where id = b;
    perform set_config('request.jwt.claim.sub', a::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);
    select d.phone into wert from public.member_directory() d where d.id = b;
    liste := liste || text 'Mitgliederliste: Telefon mit Häkchen sichtbar';
    ergebnisse := ergebnisse || case when wert = '0351 000000' then 'ok' else 'FEHLER: Nummer fehlt trotz Häkchen' end;

    -- ohne Anmeldung --------------------------------------------------------
    perform set_config('role', 'postgres', true);
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    perform set_config('role', 'anon', true);

    begin
      select count(*) into n from public.profiles;
    exception when insufficient_privilege then n := 0;
    end;
    liste := liste || text 'Ohne Anmeldung: keine Profile lesbar';
    ergebnisse := ergebnisse || case when n = 0 then 'ok' else 'FEHLER: ' || n || ' Profile lesbar' end;

    begin
      select count(*) into n from public.profil_privat;
    exception when insufficient_privilege then n := 0;
    end;
    liste := liste || text 'Ohne Anmeldung: keine Telefonnummern lesbar';
    ergebnisse := ergebnisse || case when n = 0 then 'ok' else 'FEHLER: ' || n || ' Nummern lesbar' end;

    begin
      select count(*) into n from public.mitgliedsantraege;
    exception when insufficient_privilege then n := 0;
    end;
    liste := liste || text 'Ohne Anmeldung: keine Mitgliedsanträge lesbar';
    ergebnisse := ergebnisse || case when n = 0 then 'ok' else 'FEHLER: ' || n || ' Anträge lesbar' end;

    -- KEEP UP-Uhrzeit (Migration 20261123000000) ------------------------------
    perform set_config('role', 'postgres', true);
    ok := false;
    begin
      insert into public.keepup_termine (dozent, woche, tage, zeit)
        values ('pruefung-b-tndd', date_trunc('week', current_date)::date, '{1}', '18 Uhr');
    exception when others then ok := true;
    end;
    liste := liste || text 'KEEP UP: Uhrzeit nur als „von–bis“';
    ergebnisse := ergebnisse || case when ok then 'ok' else 'FEHLER: „18 Uhr“ gespeichert' end;

    -- alles zurücknehmen
    raise exception using errcode = 'P0099';
  exception when sqlstate 'P0099' then
    null;
  end;
  perform set_config('role', 'postgres', true);
  return query select i::int, liste[i], ergebnisse[i] from generate_subscripts(liste, 1) i;
end;
$$;

select * from pg_temp.pruefen();
